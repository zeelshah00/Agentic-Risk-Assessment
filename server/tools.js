const fs = require('fs');
const path = require('path');
const { discoverTools, callMcpTool } = require('./mcp');
const { TPA_STORAGE_KEYS } = require('./tpaStorageKeys');
const ReportGenerator = require('./reportGenerator');

// Initialize report generator
const reportGenerator = new ReportGenerator();


// Removed inputs from the getReportPrompts function
function getReportPrompts() {
    const prompts = {
        data_risk: `Generate a comprehensive Data Risk Assessment Report using BigID's data.

Required Sections:
1. Executive Summary - Total objects, sources, PII records, critical findings
2. Risk Analysis by Priority:
   - CRITICAL (immediate): High-volume PII exposure, breach data, employee records
   - HIGH (30 days): Financial systems, network shares, CRM exposure
   - MEDIUM (90 days): Cloud storage gaps, medical data
3. Technical Analysis:
   - Encryption status (counts and percentages by source)
   - Scan status (completed, failed, in-progress with hotspots)
   - Data volume (total, average, largest objects)
   - Access controls (open access configs, user counts)
4. Compliance Impact - GDPR, CCPA, HIPAA, PCI DSS, SOX risks
5. Remediation Plan - Immediate (0-30d), short-term (30-90d), long-term (90d+) actions
6. KPIs & Metrics - Encryption rate, failed scans, PII exposure, monitoring metrics

Use clear headings, bullet points, and specific numbers from BigID data.`,
        
    };

    return prompts;
}

// Get all server configurations
async function getAllServerConfigs(getTpaStorage, bigidBaseUrl, bigidToken) {
    const customMcpServers = await getTpaStorage(TPA_STORAGE_KEYS.MCP_SERVERS) || [];
    const bigidDomain = bigidBaseUrl ? new URL(bigidBaseUrl).hostname : null;
    
    // Helper function to check if hostname matches pattern (supports wildcards)
    const isHostnameAllowed = (hostname, safeHostnames) => {
        return safeHostnames.some(pattern => {
            if (pattern.includes('*')) {
                // Convert wildcard pattern to regex
                const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
                const regex = new RegExp(`^${regexPattern}$`, 'i');
                return regex.test(hostname);
            } else {
                // Exact match or ends with pattern (for backward compatibility)
                return hostname === pattern || hostname.endsWith('.' + pattern);
            }
        });
    };
    
    // Filter out stdio MCP servers if BigID hostname is not in safe hostnames list
    const safeHostnames = process.env.STDIO_SAFE_HOSTNAMES ? process.env.STDIO_SAFE_HOSTNAMES.split(',').map(hostname => hostname.trim()) : [];
    const allowStdio = bigidDomain && isHostnameAllowed(bigidDomain, safeHostnames);
    const filteredCustomMcpServers = customMcpServers.filter(server => {
        if (server.transport === 'stdio' && !allowStdio) {
            console.warn(`Skipping stdio MCP server '${server.name}' because BigID hostname '${bigidDomain}' is not in the safe hostnames list: [${safeHostnames.join(', ')}]`);
            return false;
        }
        return true;
    });
    
    const allServerConfigs = [...filteredCustomMcpServers];

    if (bigidToken && bigidDomain) {
        allServerConfigs.push({
            id: 'bigid-mcp-local',
            name: 'BigID Local MCP',
            transport: 'stdio',
            command: 'node',
            args: [path.join(__dirname, '..', 'bigid-mcp-server', 'dist', 'server.js')],
            env: {
                BIGID_USER_TOKEN: bigidToken,
                BIGID_DOMAIN: bigidDomain,
                BIGID_AUTH_TYPE: 'user_token',
                BIGID_TIMEOUT: '30000',
                BIGID_RETRY_ATTEMPTS: '3',
                NODE_ENV: 'production',
                BIGID_MCP_LOG_LEVEL: 'info',
            }
        });
    }
    return allServerConfigs;
}

// Discover all tools including custom tools
async function discoverAllTools(allServerConfigs, storageHelpers, ws = null) {
    const allTools = [];
    for (let i = 0; i < allServerConfigs.length; i++) {
        const serverConfig = allServerConfigs[i];
        try {
            if (ws) {
                ws.send(JSON.stringify({ 
                    type: 'init_progress', 
                    message: `Discovering tools from '${serverConfig.name}' (${i + 1}/${allServerConfigs.length})...` 
                }));
            }
            const discoveredTools = await discoverTools(serverConfig, storageHelpers);
            allTools.push(...discoveredTools.map(tool => ({ ...tool, serverId: serverConfig.id })));
        } catch (error) {
            console.error(`Failed to discover tools from server '${serverConfig.name}':`, error.message);
            if (ws) {
                ws.send(JSON.stringify({ 
                    type: 'init_progress', 
                    message: `Warning: Failed to discover tools from '${serverConfig.name}': ${error.message}` 
                }));
            }
        }
    }
    
    // // Add custom tools
    // allTools.push({
    //     name: 'schedule_agent',
    //     description: 'Schedules a new agent to perform a task to be executed on a recurring interval.',
    //     inputSchema: {
    //         type: 'object',
    //         properties: {
    //             name: { type: 'string', description: 'The name of the task.' },
    //             prompt: { type: 'string', description: 'The prompt for the task.' },
    //             schedule: { type: 'string', description: 'The schedule for the task (e.g., hourly, daily, weekly, manual).' },
    //         },
    //         required: ['name', 'prompt', 'schedule'],
    //     },
    // });
    
    // Add report generation tool
    allTools.push({
        name: 'generate_report',
        description: 'Generates a SINGLE comprehensive PDF or HTML report with BigID branding. IMPORTANT: Call this tool ONLY ONCE with ALL sections included in the sections array. Do NOT call this tool multiple times - gather ALL necessary data from BigID tools first, then combine everything into ONE report with multiple sections. For risk reports: include Executive Summary, Risk Analysis, Technical Analysis, Compliance, and Remediation sections all in the same report. For inventory reports: include Overview, Distribution, Classifications, and Sources sections together. Each section should be an object in the sections array.',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Report title (e.g., "Data Risk Assessment Report", "Inventory Summary")' },
                description: { type: 'string', description: 'Brief description shown on cover page' },
                data: { 
                    type: 'object', 
                    description: 'Structured data from BigID tools. Can include inventory aggregations, catalog data, scan results, etc.' 
                },
                sections: {
                    type: 'array',
                    description: `Report sections with title, content, and type. Available types:
- table: Array of objects → formatted table
- list: Array of strings → bullet list with auto severity detection
- metrics: Object with key-value pairs → colored stat cards
- text: String with bullet points (•) → auto-converts to formatted lists
- html: Custom HTML for creative layouts
- json: Raw JSON display in code format

HTML Type CSS Classes Available:
- .data-grid: Grid layout for cards (repeat(auto-fit, minmax(220px, 1fr)))
- .stat-item: Blue gradient stat card (use .stat-number and .stat-label inside)
- .list-container ul/li: Styled bullet lists
- Severity classes: .critical (red), .high (orange), .medium (amber), .low (green)
- .section-content: Standard content wrapper with proper spacing

Example HTML section: { title: "Overview", type: "html", content: "<div class='data-grid'><div class='stat-item'><span class='stat-number'>42</span><span class='stat-label'>Critical Issues</span></div></div>" }`,
                    items: {
                        type: 'object',
                        properties: {
                            title: { type: 'string', description: 'Section heading' },
                            content: { description: 'Section data - type determines how it renders' },
                            type: { 
                                type: 'string', 
                                enum: ['table', 'list', 'metrics', 'json', 'text', 'html'],
                                description: 'Determines rendering: table, list, metrics (stat cards), text (with bullet detection), html (custom markup), or json'
                            }
                        }
                    }
                },
                format: { 
                    type: 'string', 
                    enum: ['pdf', 'html'], 
                    description: 'Output format - pdf (default) or html' 
                },
                includeTimestamp: { type: 'boolean', description: 'Include generation timestamp on cover page (default: true)' }
            },
            required: ['title'],
        },
    });
    
    return allTools;
}

// Process tool calls with centralized logic
async function processToolCall(call, allTools, allServerConfigs, storageHelpers, ws = null) {
    const toolDefinition = allTools.find(t => t.name === call.name);
    const serverConfig = allServerConfigs.find(s => s.id === toolDefinition?.serverId);

    let toolResultContent;
    // Adjusted logic to handle tools without a server configuration
    if (call.name === 'schedule_agent') {
        // const { name, prompt, schedule } = call.args;
        // const newAgent = { id: `agent_${Date.now()}`, name, prompt, schedule, status: 'pending', lastRun: null };
        // const agents = await storageHelpers.getTpaStorage(TPA_STORAGE_KEYS.AGENTS) || [];
        // await storageHelpers.setTpaStorage(TPA_STORAGE_KEYS.AGENTS, [...agents, newAgent]);
        // toolResultContent = { success: true, message: `Task '${name}' scheduled successfully.` };
    } else if (call.name === 'get_report_prompts') {
        // toolResultContent = getReportPrompts();
    } else if (call.name === 'generate_report') {
        const { title, description, data, sections, format = 'pdf', includeTimestamp = true } = call.args;
        const reportResult = await reportGenerator.generateReport({
            title,
            description,
            data,
            sections,
            format,
            includeTimestamp
        });
        
        if (reportResult.success) {
            if (format === 'pdf') {
                // For PDF: Send as download to user (only if WebSocket is available)
                if (ws) {
                    try {
                        // Ensure we have a proper Buffer object
                        if (!reportResult.pdfBuffer || !Buffer.isBuffer(reportResult.pdfBuffer)) {
                            throw new Error('Invalid PDF buffer received from report generator');
                        }
                        
                        const base64Data = reportResult.pdfBuffer.toString('base64');
                        const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${reportResult.reportId}.pdf`;
                        
                        // Validate base64 encoding
                        if (!base64Data || base64Data.length === 0) {
                            throw new Error('Failed to convert PDF buffer to base64');
                        }
                        
                        
                        // Send file download message through WebSocket
                        ws.send(JSON.stringify({
                            type: 'file_download',
                            fileName: fileName,
                            fileData: base64Data,
                            fileSize: reportResult.fileSize,
                            mimeType: 'application/pdf',
                            reportId: reportResult.reportId
                        }));
                        
                        toolResultContent = {
                            success: true,
                            message: `PDF report "${title}" has been generated and delivered to the user for download.`,
                            reportId: reportResult.reportId,
                            fileName: fileName,
                            fileSize: reportResult.fileSize,
                            format: 'pdf'
                        };
                    } catch (fileError) {
                        toolResultContent = {
                            success: false,
                            error: `Report generated but failed to deliver PDF file: ${fileError.message}`
                        };
                    }
                } else {
                    // No WebSocket available (like in core.js), return buffer info
                    toolResultContent = {
                        success: true,
                        message: `PDF report "${title}" has been generated.`,
                        reportId: reportResult.reportId,
                        bufferSize: reportResult.fileSize,
                        format: 'pdf'
                    };
                }
            } else if (format === 'html') {
                // For HTML: Return content to agent for use in emails, etc.
                try {
                    const htmlContent = fs.readFileSync(reportResult.filePath, 'utf8');
                    
                    // Clean up the file
                    fs.unlinkSync(reportResult.filePath);
                    
                    toolResultContent = {
                        success: true,
                        message: `HTML report "${title}" has been generated and is available for use in emails or other contexts.`,
                        reportId: reportResult.reportId,
                        format: 'html',
                        htmlContent: htmlContent,
                        fileSize: htmlContent.length,
                        usage: 'This HTML content can be embedded in emails, web pages, or other HTML contexts.'
                    };
                } catch (fileError) {
                    toolResultContent = {
                        success: false,
                        error: `HTML report generated but failed to read content: ${fileError.message}`
                    };
                }
            }
        } else {
            toolResultContent = reportResult;
        }
    } else if (serverConfig) {
        toolResultContent = await callMcpTool(serverConfig, { toolName: call.name, toolArgs: call.args }, storageHelpers);
    } else {
        toolResultContent = { error: `Tool '${call.name}' not found on any configured server.` };
    }

    return {
        functionResponse: {
            name: call.name,
            response: toolResultContent,
        },
    };
}

module.exports = {
    getReportPrompts,
    getAllServerConfigs,
    discoverAllTools,
    processToolCall
};
