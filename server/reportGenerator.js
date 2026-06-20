const puppeteer = require('puppeteer');
const path = require('path');

class ReportGenerator {

    /**
     * Generate a PDF report from structured data
     */
    async generateReport(params) {
        try {
            const {
                title = 'BigID Report',
                description = '',
                sections = [],
                data = {},
                format = 'pdf',
                includeTimestamp = true
            } = params;

            const reportId = `report_${Date.now()}`;
            const timestamp = new Date().toLocaleString();
            
            // Generate HTML content
            const htmlContent = this.generateHTMLReport({
                title,
                description,
                sections,
                data,
                reportId,
                timestamp: includeTimestamp ? timestamp : null
            });

            if (format === 'html') {
                const htmlPath = path.join(this.reportsDir, `${reportId}.html`);
                
                return {
                    success: true,
                    reportId,
                    filePath: htmlPath,
                    format: 'html',
                    timestamp,
                    message: 'HTML report generated successfully'
                };
            }

            // Generate PDF as buffer (never save to disk)
            const pdfBuffer = await this.generatePDF(htmlContent, reportId);
            
            // Validate the buffer
            if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
                throw new Error('Invalid PDF buffer generated');
            }
            
            return {
                success: true,
                reportId,
                pdfBuffer: pdfBuffer,
                format: 'pdf',
                fileSize: pdfBuffer.length,
                timestamp,
                message: 'PDF report generated successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to generate report'
            };
        }
    }

    /**
     * Generate HTML content for the report
     */
    generateHTMLReport({ title, description, sections, data, reportId, timestamp }) {
        let sectionsHTML = '';
        
        // Generate sections from provided sections array
        if (sections && sections.length > 0) {
            sectionsHTML = sections.map(section => this.generateSectionHTML(section)).join('');
        } else if (data && Object.keys(data).length > 0) {
            // Auto-generate sections from data object
            sectionsHTML = this.generateSectionsFromData(data);
        }

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        @page {
            size: A4;
            margin: 40px 60px;
        }
        
        @page :first {
            margin: 0;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background-color: #ffffff;
            font-size: 11pt;
        }
        
        .report-container {
            max-width: 100%;
        }
        
        /* Cover Page Styling - matching BigID whitebook */
        .cover-page {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            text-align: left;
            page-break-after: always;
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 80px 60px 60px 60px;
        }
        
        .cover-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .cover-title {
            font-size: 3.5em;
            font-weight: 300;
            margin: 0 0 30px 0;
            line-height: 1.15;
            letter-spacing: -0.02em;
        }
        
        .cover-subtitle {
            font-size: 1.2em;
            font-weight: 300;
            margin: 0;
            opacity: 0.95;
            max-width: 650px;
            line-height: 1.5;
        }
        
        .cover-footer {
            font-size: 0.95em;
            opacity: 0.9;
            line-height: 1.8;
        }
        
        .cover-footer p {
            margin: 5px 0;
        }
        
        .cover-tagline {
            font-weight: 500;
            margin-top: 15px;
            letter-spacing: 0.5px;
        }
        
        /* Page Numbers */
        .page-number {
            position: fixed;
            bottom: 10mm;
            left: 50%;
            transform: translateX(-50%);
            font-size: 9pt;
            color: #666;
            font-weight: 400;
        }
        
        /* Section Styling - matching BigID whitebook */
        .section {
            margin-bottom: 50px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 1.6em;
            color: #1e40af;
            margin-bottom: 25px;
            padding-bottom: 12px;
            border-bottom: 1px solid #cbd5e1;
            font-weight: 400;
            letter-spacing: -0.01em;
        }
        
        .section-content {
            font-size: 1em;
            line-height: 1.8;
            color: #334155;
        }
        
        .section-content p {
            margin: 18px 0;
            text-align: justify;
        }
        
        .subsection-title {
            font-size: 1.2em;
            color: #475569;
            margin: 30px 0 18px 0;
            font-weight: 500;
            text-transform: uppercase;
            font-size: 0.95em;
            letter-spacing: 0.05em;
        }
        
        /* Data Cards and Grids */
        .data-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
            margin: 25px 0;
        }
        
        .data-card {
            background: transparent;
            padding: 20px;
            border-radius: 0;
            border-left: 3px solid #3b82f6;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .data-card h4 {
            margin: 0 0 12px 0;
            color: #334155;
            font-size: 1em;
            font-weight: 500;
            text-transform: uppercase;
            font-size: 0.85em;
            letter-spacing: 0.05em;
        }
        
        .data-value {
            font-size: 2em;
            font-weight: 600;
            color: #1e40af;
            margin: 8px 0;
            line-height: 1.2;
        }
        
        .data-label {
            color: #64748b;
            font-size: 0.9em;
            margin-top: 4px;
        }
        
        /* Tables - matching BigID whitebook style */
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
            background: transparent;
            font-size: 0.95em;
        }
        
        th, td {
            padding: 14px 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        
        th {
            background-color: #f1f5f9;
            font-weight: 600;
            color: #1e293b;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        tr:hover {
            background-color: #f8fafc;
        }
        
        tbody tr:last-child td {
            border-bottom: none;
        }
        
        /* Lists */
        .list-container ul {
            list-style: none;
            padding: 0;
            margin: 20px 0;
        }
        
        .list-container li {
            background: transparent;
            margin: 8px 0;
            padding: 8px 0 8px 30px;
            border-radius: 0;
            border-left: none;
            line-height: 1.7;
            position: relative;
        }
        
        .list-container li::before {
            content: "•";
            color: #3b82f6;
            font-weight: bold;
            font-size: 1.3em;
            position: absolute;
            left: 10px;
            top: 6px;
        }
        
        /* Severity-specific list styling */
        .list-container li.critical::before {
            color: #dc2626;
        }
        
        .list-container li.high::before {
            color: #ea580c;
        }
        
        .list-container li.medium::before {
            color: #d97706;
        }
        
        .list-container li.low::before {
            color: #059669;
        }
        
        /* JSON Container */
        .json-container {
            background: #1e293b;
            color: #e2e8f0;
            padding: 24px;
            border-radius: 6px;
            overflow-x: auto;
            font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
            font-size: 0.85em;
            line-height: 1.6;
            margin: 20px 0;
        }
        
        /* Stats Summary */
        .stats-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 18px;
            margin: 25px 0;
        }
        
        .stat-item {
            text-align: center;
            padding: 24px 20px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border-radius: 6px;
        }
        
        .stat-number {
            font-size: 2.2em;
            font-weight: 600;
            display: block;
            line-height: 1.2;
        }
        
        .stat-label {
            font-size: 0.9em;
            opacity: 0.95;
            margin-top: 8px;
            display: block;
            font-weight: 400;
        }
        
        /* Text Content */
        .text-content {
            line-height: 1.8;
            color: #334155;
        }
        
        .text-content p {
            margin: 18px 0;
            text-align: justify;
        }
        
        /* Severity Badges and Colors */
        .severity-critical,
        .text-content strong:contains("CRITICAL"),
        .list-container li:contains("CRITICAL") {
            color: #dc2626;
            font-weight: 600;
        }
        
        .severity-high {
            color: #ea580c;
            font-weight: 600;
        }
        
        .severity-medium {
            color: #d97706;
            font-weight: 500;
        }
        
        .severity-low {
            color: #059669;
            font-weight: 500;
        }
        
        .severity-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-right: 8px;
        }
        
        .severity-badge.critical {
            background-color: #fee2e2;
            color: #991b1b;
            border: 1px solid #fca5a5;
        }
        
        .severity-badge.high {
            background-color: #ffedd5;
            color: #9a3412;
            border: 1px solid #fdba74;
        }
        
        .severity-badge.medium {
            background-color: #fef3c7;
            color: #92400e;
            border: 1px solid #fcd34d;
        }
        
        .severity-badge.low {
            background-color: #d1fae5;
            color: #065f46;
            border: 1px solid #6ee7b7;
        }
        
        /* Footer */
        .footer {
            margin-top: 60px;
            padding: 40px 0 20px 0;
            border-top: 2px solid #e2e8f0;
        }
        
        .footer-about {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .footer-about h3 {
            color: #1e40af;
            margin-bottom: 15px;
            font-size: 1.4em;
            font-weight: 500;
        }
        
        .footer-about p {
            max-width: 750px;
            margin: 0 auto;
            color: #475569;
            line-height: 1.8;
            text-align: center;
        }
        
        .footer-branding {
            text-align: center;
            padding: 25px;
            background: linear-gradient(to bottom, #f8fafc, #f1f5f9);
            border-radius: 8px;
            margin-top: 25px;
        }
        
        .footer-branding .tagline {
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 8px;
            font-size: 1.05em;
        }
        
        .footer-branding .services {
            font-size: 0.95em;
            color: #64748b;
            margin-bottom: 12px;
        }
        
        .footer-branding .report-id {
            font-size: 0.85em;
            color: #94a3b8;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #cbd5e1;
        }
        
        /* Print Optimizations */
        @media print {
            body { 
                background: white;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .report-container { padding: 0; }
            .section { page-break-inside: avoid; }
            .cover-page { page-break-after: always; }
        }
    </style>
</head>
<body>
    <!-- Cover Page -->
    <div class="cover-page">
        <div class="cover-content">
            <h1 class="cover-title">${title}</h1>
            ${description ? `<p class="cover-subtitle">${description}</p>` : ''}
        </div>
        <div class="cover-footer">
            ${timestamp ? `<p>Generated: ${timestamp}</p>` : ''}
            <p class="cover-tagline">Connect the Dots Across Data & AI<br>Security • Compliance • Privacy • AI Data Management</p>
        </div>
    </div>
    
    <!-- Report Content -->
    <div class="report-container">
        <div class="report-content">
            ${sectionsHTML}
        </div>
        
        <!-- Footer with BigID Branding -->
        <div class="footer">
            <div class="footer-about">
                <h3>About BigID</h3>
                <p>BigID helps organizations connect the dots across data & AI: for security, privacy, compliance, 
                and AI data management. BigID enables customers to find, understand, manage, protect, and 
                take action on high risk & high value data, wherever it lives.</p>
            </div>
            <div class="footer-branding">
                <p class="tagline">Connect the Dots Across Data & AI</p>
                <p class="services">Security • Compliance • Privacy • AI Data Management</p>
                <p class="report-id">Report ID: ${reportId}</p>
            </div>
        </div>
    </div>
</body>
</html>`;
        return html;
    }

    /**
     * Generate sections from raw data object
     */
    generateSectionsFromData(data) {
        let sectionsHTML = '';
        
        for (const [key, value] of Object.entries(data)) {
            const sectionTitle = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            const content = this.formatDataForDisplay(value, key);
            sectionsHTML += `
                <div class="section">
                    <h2 class="section-title">${sectionTitle}</h2>
                    ${content}
                </div>
            `;
        }
        
        return sectionsHTML;
    }

    /**
     * Generate HTML for a specific section
     */
    generateSectionHTML(section) {
        const { title, content, type = 'auto' } = section;
        let sectionContent = '';

        switch (type) {
            case 'table':
                sectionContent = this.generateTableHTML(content);
                break;
            case 'list':
                sectionContent = this.generateListHTML(content);
                break;
            case 'metrics':
                sectionContent = this.generateMetricsHTML(content);
                break;
            case 'json':
                sectionContent = this.generateJSONHTML(content);
                break;
            case 'text':
                sectionContent = this.formatTextContent(content);
                break;
            case 'html':
                sectionContent = `<div class="section-content">${content}</div>`;
                break;
            default:
                sectionContent = this.formatDataForDisplay(content, title);
        }

        return `
            <div class="section">
                <h2 class="section-title">${title}</h2>
                ${sectionContent}
            </div>
        `;
    }

    /**
     * Smart formatting for different data types
     */
    formatDataForDisplay(data, context = '') {
        if (data === null || data === undefined) {
            return '<p><em>No data available</em></p>';
        }

        if (Array.isArray(data)) {
            if (data.length === 0) {
                return '<p><em>No items to display</em></p>';
            }
            
            // If array contains objects, show as table
            if (typeof data[0] === 'object' && data[0] !== null) {
                return this.generateTableHTML(data);
            }
            
            // Otherwise show as list
            return this.generateListHTML(data);
        }

        if (typeof data === 'object') {
            // Check if it looks like metrics/stats
            const keys = Object.keys(data);
            const hasNumericValues = keys.some(key => typeof data[key] === 'number');
            
            if (hasNumericValues && keys.length <= 10) {
                return this.generateMetricsHTML(data);
            }
            
            // Check if it has items property (common API response pattern)
            if (data.items && Array.isArray(data.items)) {
                let html = '';
                if (data.totalCount || data.total) {
                    html += `<p><strong>Total items:</strong> ${data.totalCount || data.total}</p>`;
                }
                html += this.formatDataForDisplay(data.items);
                return html;
            }
            
            return this.generateJSONHTML(data);
        }

        // Simple text or number
        return `<div class="data-value">${data}</div>`;
    }

    /**
     * Generate table HTML from array of objects
     */
    generateTableHTML(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return '<p><em>No data available</em></p>';
        }

        const items = data.slice(0, 100); // Limit to first 100 items
        const firstItem = items[0];
        const headers = Object.keys(firstItem);

        const headerRow = headers.map(header => 
            `<th>${header.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</th>`
        ).join('');

        const dataRows = items.map(item => {
            const cells = headers.map(header => {
                let value = item[header];
                if (value === null || value === undefined) {
                    value = '';
                } else if (typeof value === 'object') {
                    value = JSON.stringify(value);
                } else if (typeof value === 'string' && value.length > 100) {
                    value = value.substring(0, 100) + '...';
                }
                return `<td>${value}</td>`;
            }).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        let tableHTML = `
            <table>
                <thead><tr>${headerRow}</tr></thead>
                <tbody>${dataRows}</tbody>
            </table>
        `;

        if (data.length > 100) {
            tableHTML += `<p><em>Showing first 100 of ${data.length} items</em></p>`;
        }

        return tableHTML;
    }

    /**
     * Generate list HTML with severity detection
     */
    generateListHTML(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return '<p><em>No items available</em></p>';
        }

        const items = data.slice(0, 50); // Limit to first 50 items
        const listItems = items.map(item => {
            let displayText;
            if (typeof item === 'string') {
                displayText = item;
            } else if (typeof item === 'object' && item !== null) {
                displayText = item.name || item.title || item.id || JSON.stringify(item);
            } else {
                displayText = String(item);
            }
            
            // Detect severity level and apply class
            const upperText = displayText.toUpperCase();
            let severityClass = '';
            
            if (upperText.includes('URGENT') || upperText.includes('CRITICAL')) {
                severityClass = ' class="critical"';
                // Wrap URGENT/CRITICAL keywords in span for color
                displayText = displayText.replace(/(URGENT|CRITICAL)/gi, '<strong style="color: #dc2626;">$1</strong>');
            } else if (upperText.includes('HIGH')) {
                severityClass = ' class="high"';
                displayText = displayText.replace(/(HIGH)/gi, '<strong style="color: #ea580c;">$1</strong>');
            } else if (upperText.includes('MEDIUM')) {
                severityClass = ' class="medium"';
                displayText = displayText.replace(/(MEDIUM)/gi, '<strong style="color: #d97706;">$1</strong>');
            } else if (upperText.includes('LOW') || upperText.includes('ONGOING')) {
                severityClass = ' class="low"';
                displayText = displayText.replace(/(LOW|ONGOING)/gi, '<strong style="color: #059669;">$1</strong>');
            }
            
            return `<li${severityClass}>${displayText}</li>`;
        }).join('');

        let listHTML = `<div class="list-container"><ul>${listItems}</ul></div>`;

        if (data.length > 50) {
            listHTML += `<p><em>Showing first 50 of ${data.length} items</em></p>`;
        }

        return listHTML;
    }

    /**
     * Generate metrics/stats HTML
     */
    generateMetricsHTML(data) {
        if (!data || typeof data !== 'object') {
            return '<p><em>No metrics available</em></p>';
        }

        const metrics = Object.entries(data)
            .filter(([key, value]) => typeof value === 'number' || typeof value === 'string')
            .map(([key, value]) => {
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                return `
                    <div class="stat-item">
                        <span class="stat-number">${value}</span>
                        <span class="stat-label">${label}</span>
                    </div>
                `;
            }).join('');

        return `<div class="stats-summary">${metrics}</div>`;
    }

    /**
     * Format text content - detect and convert bullet points to lists
     */
    formatTextContent(content) {
        if (!content) return '<p><em>No content available</em></p>';
        
        // Check if content contains bullet points (•) which should be converted to a list
        if (content.includes('•')) {
            // Split by bullet points
            const parts = content.split('•').map(s => s.trim()).filter(s => s.length > 0);
            
            if (parts.length > 1) {
                // First part is usually intro text before the list
                const introText = parts[0];
                const listItems = parts.slice(1);
                
                // Generate list HTML with severity detection
                const listHTML = listItems.map(item => {
                    const upperText = item.toUpperCase();
                    let severityClass = '';
                    let displayText = item;
                    
                    if (upperText.includes('URGENT') || upperText.includes('CRITICAL')) {
                        severityClass = ' class="critical"';
                        displayText = item.replace(/(URGENT|CRITICAL)/gi, '<strong style="color: #dc2626;">$1</strong>');
                    } else if (upperText.includes('HIGH')) {
                        severityClass = ' class="high"';
                        displayText = item.replace(/(HIGH)/gi, '<strong style="color: #ea580c;">$1</strong>');
                    } else if (upperText.includes('MEDIUM')) {
                        severityClass = ' class="medium"';
                        displayText = item.replace(/(MEDIUM)/gi, '<strong style="color: #d97706;">$1</strong>');
                    } else if (upperText.includes('LOW') || upperText.includes('ONGOING')) {
                        severityClass = ' class="low"';
                        displayText = item.replace(/(LOW|ONGOING)/gi, '<strong style="color: #059669;">$1</strong>');
                    }
                    
                    return `<li${severityClass}>${displayText}</li>`;
                }).join('');
                
                return `
                    <div class="text-content">
                        <p>${introText}</p>
                        <div class="list-container">
                            <ul>${listHTML}</ul>
                        </div>
                    </div>
                `;
            }
        }
        
        // No bullets found, return as regular text with paragraph breaks
        const paragraphs = content.split('\n').filter(p => p.trim().length > 0);
        const paragraphHTML = paragraphs.map(p => `<p>${p}</p>`).join('');
        return `<div class="text-content">${paragraphHTML}</div>`;
    }

    /**
     * Generate JSON HTML
     */
    generateJSONHTML(data) {
        const jsonString = JSON.stringify(data, null, 2);
        return `<div class="json-container">${jsonString}</div>`;
    }

    /**
     * Generate PDF from HTML content as buffer (never saves to disk)
     */
    async generatePDF(htmlContent, reportId) {
        const browser = await puppeteer.launch({
            headless: 'new',
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection'
            ],
        });

        try {
            const page = await browser.newPage();
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

            // Always return PDF as buffer without saving to disk
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0
                }
            });
            
            // Ensure we return a proper Buffer object
            if (!Buffer.isBuffer(pdfBuffer)) {
                return Buffer.from(pdfBuffer);
            }
            return pdfBuffer;
        } finally {
            await browser.close();
        }
    }
}

module.exports = ReportGenerator;
