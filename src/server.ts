// MCP server entry point: registers 28+ BigID tools and starts a stdio transport for use with any MCP-compatible AI client.
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ListPromptsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ConfigManager } from './config/ConfigManager';
import { BigIDAuth } from './auth/BigIDAuth';
import { BigIDClient } from './client/BigIDClient';
import { DataCatalogClient } from './client/DataCatalogClient';
import { DSPMClient } from './client/DSPMClient';

import { DataCategoriesClient } from './client/DataCategoriesClient';
import { SensitivityClassificationClient } from './client/SensitivityClassificationClient';
import { PoliciesClient } from './client/PoliciesClient';
import { InventoryClient } from './client/InventoryClient';
import { WidgetClient } from './client/WidgetClient';
import { ACIClient } from './client/ACIClient';
import { LocationClient } from './client/LocationClient';

import { InventoryTools } from './tools/inventoryTools';
import { CatalogTools } from './tools/catalogTools';
import { DSPMTools } from './tools/dspmTools';
import { DataCategoriesTools } from './tools/dataCategoriesTools';
import { SensitivityClassificationTools } from './tools/sensitivityClassificationTools';
import { PoliciesTools } from './tools/policiesTools';
import { WidgetTools } from './tools/widgetTools';
import { ACITools } from './tools/aciTools';
import { LocationTools } from './tools/locationTools';
import { CacheManager } from './cache/CacheManager';
import * as winston from 'winston';
import { LineageTools } from './tools/lineageTools';
import { LineageClient } from './client/LineageClient';

import { MetadataSearchClient } from './client/MetadataSearchClient';
import { MetadataSearchTools } from './tools/metadataSearchTools';
import { FilterConverter } from './utils/FilterConverter';
import { allSchemas } from './schemas';
import { SERVER_INSTRUCTIONS } from './config/serverInstructions';

// Configure logging - only log to stderr to avoid interfering with MCP protocol stdout
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'error' : 'info', // Only errors in production
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'bigid-mcp-server' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
      stderrLevels: ['error', 'warn', 'info', 'debug'], // All logs go to stderr
    }),
  ],
});

class BigIDMCPServer {
  private server: Server;
  private configManager: ConfigManager;
  private auth: BigIDAuth;
  private client: BigIDClient;
  private catalogClient: DataCatalogClient;
  private dspmClient: DSPMClient;

  private dataCategoriesClient: DataCategoriesClient;
  private sensitivityClassificationClient: SensitivityClassificationClient;
  private policiesClient: PoliciesClient;
  private inventoryClient: InventoryClient;
  private widgetClient: WidgetClient;
  private aciClient: ACIClient;
  private locationClient: LocationClient;
  private lineageClient: LineageClient;
  private metadataSearchClient: MetadataSearchClient;

  private inventoryTools: InventoryTools;

  private catalogTools: CatalogTools;
  private dspmTools: DSPMTools;
  private widgetTools: WidgetTools;
  private metadataSearchTools: MetadataSearchTools;

  private dataCategoriesTools: DataCategoriesTools;
  private sensitivityClassificationTools: SensitivityClassificationTools;
  private policiesTools: PoliciesTools;
  private aciTools: ACITools;
  private locationTools: LocationTools;
  private cacheManager: CacheManager;
  private lineageTools: LineageTools;

  constructor() {
    this.configManager = new ConfigManager();
    const config = this.configManager.getConfig();
    
    // Initialize components
    this.auth = new BigIDAuth(config.bigid);
    this.client = new BigIDClient(this.auth, config.bigid);
    this.catalogClient = new DataCatalogClient(this.auth, config.bigid.domain);
    this.dspmClient = new DSPMClient(this.auth, config.bigid.domain);
    this.metadataSearchClient = new MetadataSearchClient(this.auth, config.bigid.domain);

    this.dataCategoriesClient = new DataCategoriesClient(this.auth, config.bigid.domain);
    this.sensitivityClassificationClient = new SensitivityClassificationClient(this.auth, config.bigid.domain);
    this.policiesClient = new PoliciesClient(this.auth, config.bigid.domain);
    this.inventoryClient = new InventoryClient(this.auth, config.bigid.domain);
    this.widgetClient = new WidgetClient(this.auth, config.bigid.domain);
    this.aciClient = new ACIClient(this.auth, config.bigid.domain);
    this.locationClient = new LocationClient(this.auth, config.bigid.domain);
    this.lineageClient = new LineageClient(this.auth, config.bigid.domain);

    this.cacheManager = new CacheManager();
    this.catalogTools = new CatalogTools(this.catalogClient, this.cacheManager);
    this.dspmTools = new DSPMTools(this.dspmClient, this.cacheManager);
    this.widgetTools = new WidgetTools(this.widgetClient, this.cacheManager);
    this.metadataSearchTools = new MetadataSearchTools(this.metadataSearchClient, this.cacheManager);

    this.dataCategoriesTools = new DataCategoriesTools(this.dataCategoriesClient, this.cacheManager);
    this.sensitivityClassificationTools = new SensitivityClassificationTools(this.sensitivityClassificationClient, this.cacheManager);
    this.policiesTools = new PoliciesTools(this.policiesClient, this.cacheManager);
    this.inventoryTools = new InventoryTools(this.inventoryClient, this.cacheManager);
    this.aciTools = new ACITools(this.aciClient, this.cacheManager);
    this.locationTools = new LocationTools(this.locationClient, this.cacheManager);
    this.lineageTools = new LineageTools(this.lineageClient, this.cacheManager);

    // Create MCP server
    this.server = new Server(
      {
        name: 'bigid-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
        instructions: SERVER_INSTRUCTIONS,
      }
    );

    this.setupTools();
  }

  // Method for direct testing without transport
  async initialize(testingMode = false) {
    logger.info('Initializing BigID MCP Server for testing...');
    
    // Validate configuration
    if (!this.configManager.validateAuthConfig()) {
      throw new Error('Invalid authentication configuration. Please check your BigID credentials.');
    }

    logger.info(`BigID Domain: ${this.configManager.getBigIDConfig().domain}`);

    // Test authentication
    try {
      await this.auth.getToken();
      logger.info('Authentication successful');
    } catch (authError) {
      logger.error('Failed to authenticate with BigID:', authError);
      throw new Error(`Authentication failed: ${authError instanceof Error ? authError.message : 'Unknown error'}`);
    }

    // Only start the transport if not in testing mode
    if (!testingMode) {
      await this.startTransport();
    }
  }

  private async startTransport() {
    try {
      logger.info('Starting BigID MCP Server...');
      
      // Start MCP server with stdio transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      logger.info('BigID MCP Server started successfully with stdio transport');

      // Keep the process alive and handle graceful shutdown
      logger.info('Server is now running and ready to receive MCP requests');
      
      // Handle graceful shutdown
      process.on('SIGTERM', () => {
        logger.info('Received SIGTERM, shutting down gracefully');
        this.cleanup();
        process.exit(0);
      });

      process.on('SIGINT', () => {
        logger.info('Received SIGINT, shutting down gracefully');
        this.cleanup();
        process.exit(0);
      });

      // Handle uncaught exceptions to prevent crashes
      process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception:', error);
        // Don't exit immediately, let the transport handle it
      });

      process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled rejection at:', promise, 'reason:', reason);
        // Don't exit immediately, let the transport handle it
      });

    } catch (error) {
      logger.error('Failed to start BigID MCP Server:', error);
      process.exit(1);
    }
  }

  // Method for direct tool call testing
  async handleToolCall(params: { name: string; arguments: any }) {
    const { name, arguments: args } = params;
    
    try {
      const result = await this.executeTool(name, args);
      return {
        result: {
          content: JSON.stringify(result, null, 2)
        }
      };
    } catch (error) {
      logger.error(`Tool call failed for ${name}:`, error);
      return {
        error: {
          code: -1,
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      };
    }
  }

  // Consolidated tool execution logic
  private async executeTool(name: string, args: any): Promise<any> {
    switch (name) {
      // Metadata Search Tools
      case 'metadata_quick_search':
        return await this.metadataSearchTools.quickSearch(args as any);
      case 'metadata_full_search':
        return await this.metadataSearchTools.fullSearch(args as any);
      case 'metadata_objects_search':
        return await this.metadataSearchTools.objectsSearch(args as any);
      case 'metadata_objects_count':
        return await this.metadataSearchTools.objectsCount(args as any);

      // Data Catalog Tools
      case 'get_inventory_aggregation':
        return await this.inventoryTools.getInventoryAggregation(args as any);

      case 'get_health_check':
        return await this.getHealthCheck();
      
      // Data Catalog Tools
      case 'get_catalog_objects':
        // Convert structured filter to BigID query language
        const catalogArgs = { ...args };
        if (catalogArgs.structuredFilter) {
          catalogArgs.filter = FilterConverter.convertToBigIDQuery(catalogArgs.structuredFilter);
          delete catalogArgs.structuredFilter;
        }
        return await this.catalogTools.getCatalogObjectsPost(catalogArgs as any);
      case 'get_object_details':
        return await this.catalogTools.getObjectDetails(args as any);
      case 'get_catalog_tags':
        return await this.catalogTools.getTags({});
      case 'get_catalog_rules':
        return await this.catalogTools.getRules({});
      case 'get_catalog_count':
        // Convert structured filter to BigID query language
        const countArgs = { ...args };
        if (countArgs.structuredFilter) {
          countArgs.filter = FilterConverter.convertToBigIDQuery(countArgs.structuredFilter);
          delete countArgs.structuredFilter;
        }
        return await this.catalogTools.getCatalogCount(countArgs as any);

      case 'get_lineage_tree':
        return await this.lineageTools.getLineageTree(args as any);

      
      // DSPM Tools
      case 'get_security_cases':
        // Convert structured filter to BigID query language
        const securityArgs = { ...args };
        if (securityArgs.structuredFilter) {
          securityArgs.filter = FilterConverter.convertToBigIDQuery(securityArgs.structuredFilter);
          delete securityArgs.structuredFilter;
        }
        return await this.dspmTools.getSecurityCases(securityArgs as any);
      case 'get_security_trends':
        return await this.dspmTools.getSecurityTrends(args as any);
      case 'get_cases_group_by_policy':
        return await this.dspmTools.getCasesGroupByPolicy(args as any);

      
      // Data Categories Tools
      case 'get_data_categories':
        return await this.dataCategoriesTools.getDataCategories({});
      case 'get_sensitivity_configs':
        return await this.sensitivityClassificationTools.getScConfigs(args as any);
      case 'get_sensitivity_config_by_id':
        return await this.sensitivityClassificationTools.getScConfigById(args as any);
      case 'get_total_classification_ratios':
        return await this.sensitivityClassificationTools.getTotalClassificationRatios();
      case 'get_classification_ratio_by_name':
        return await this.sensitivityClassificationTools.getClassificationRatioByName(args as any);
      case 'get_classification_ratio_by_id':
        return await this.sensitivityClassificationTools.getClassificationRatioById(args as any);

      // Policies Tools
      case 'get_policies':
        return await this.policiesTools.getPolicies({});

      // Widget Tools
      case 'get_dashboard_widget':
        return await this.widgetTools.getDashboardWidget(args as any);

      // ACI Tools
      case 'get_aci_data_manager':
        return await this.aciTools.getDataManager(args as any);
      case 'get_aci_data_manager_permissions':
        return await this.aciTools.getDataManagerPermissions(args as any);
      case 'get_aci_users':
        return await this.aciTools.getUsers(args as any);
      case 'get_aci_groups':
        return await this.aciTools.getGroups(args as any);

      // Location Tools
      case 'get_locations':
        return await this.locationTools.getLocations(args as any);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private tools: any[] = [];

  private setupTools() {
    // Use imported schemas from the schemas directory
    this.tools = allSchemas;

    // Register tools with the server using proper MCP SDK schemas
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: this.tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        const result = await this.executeTool(name, args);
        return { 
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result 
        };
      } catch (error) {
        logger.error(`Tool execution failed for ${name}:`, error);
        const errorResult = {
          success: false, 
          error: error instanceof Error ? error.message : 'Tool execution failed' 
        };
        return { 
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }],
          structuredContent: errorResult
        };
      }
    });

    logger.info('All 28 tools are now properly registered with MCP SDK');
    logger.info('Tools available: get_inventory_aggregation, get_health_check, get_catalog_objects, get_object_details, get_catalog_tags, get_catalog_rules, get_catalog_count, get_lineage_tree, get_security_cases, get_security_trends, get_cases_group_by_policy, get_data_categories, get_sensitivity_configs, get_sensitivity_config_by_id, get_total_classification_ratios, get_classification_ratio_by_name, get_classification_ratio_by_id, get_policies, get_dashboard_widget, get_aci_data_manager, get_aci_data_manager_permissions, get_aci_groups, get_aci_users, get_locations, metadata_quick_search, metadata_full_search, metadata_objects_search, metadata_objects_count');

    // Register resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'bigid://filter-spec',
            name: 'BigID Filter Specification',
            description: 'BigID Filter Query Language specification and examples',
            mimeType: 'text/yaml'
          }
        ]
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      try {
                let content: string = '';
        let mimeType: string = 'text/plain';
        
        const fs = await import('fs/promises');
        const path = await import('path');
        
        switch (uri) {
          case 'bigid://filter-spec':
            try {
              // Load the actual filter specification file
              const fs = await import('fs/promises');
              const path = await import('path');
              // Try multiple possible paths for the filter spec file
              const possiblePaths = [
                path.join(process.cwd(), 'bigid-filter-spec.yml'),
                path.join(process.cwd(), '..', 'bigid-filter-spec.yml'),
                path.join(__dirname, '..', '..', 'bigid-filter-spec.yml'),
                path.join(__dirname, '..', 'bigid-filter-spec.yml')
              ];
              
              let fileFound = false;
              for (const filterSpecPath of possiblePaths) {
                try {
                  content = await fs.readFile(filterSpecPath, 'utf-8');
                  fileFound = true;
                  logger.info(`Successfully loaded filter spec from: ${filterSpecPath}`);
                  break;
                } catch (pathError) {
                  // Try next path
                  continue;
                }
              }
              
              if (!fileFound) {
                throw new Error('Could not find bigid-filter-spec.yml in any of the expected locations');
              }
              
              mimeType = 'text/yaml';
            } catch (fileError) {
              logger.error('Failed to load bigid-filter-spec.yml:', fileError);
              // Fallback to placeholder content
              content = `# BigID Filter Specification
# This is a placeholder for the filter specification
# The actual specification should be loaded from bigid-filter-spec.yml

title: "BigID Filter Specification"
version: "1.0"
description: "BigID Filter Query Language specification and examples"

# Note: This is a placeholder. The actual specification file should be available at bigid-filter-spec.yml
`;
              mimeType = 'text/yaml';
            }
            break;
            
          default:
            throw new Error(`Unknown resource: ${uri}`);
        }
        
        return {
          contents: [
            {
              uri,
              mimeType,
              text: content
            }
          ]
        };
      } catch (error) {
        logger.error(`Resource read failed for ${uri}:`, error);
        throw new Error(`Failed to read resource ${uri}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    logger.info('Resource handlers registered for filter-spec');

    // Register prompts handler (optional MCP method)
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: []
      };
    });

    logger.info('Prompts handler registered');
  }

  private async getHealthCheck() {
    try {
      const response = await this.client.getHealthCheck();
      return {
        success: true,
        data: response,
        summary: {
          status: response.status,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async start() {
    // Initialize without testing mode (will start transport)
    await this.initialize(false);
  }

  async cleanup() {
    try {
      logger.info('Cleaning up BigID MCP Server...');
      
      // Close any open connections
      if (this.server) {
        await this.server.close();
      }
      
      // Clear any cached data
      if (this.cacheManager) {
        this.cacheManager.flush();
      }
      
      logger.info('BigID MCP Server cleanup completed');
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }
}

// Export the class for testing
export { BigIDMCPServer };

// Start the server only if this is the main module (not imported for testing)
if (require.main === module) {
  const server = new BigIDMCPServer();
  server.start().catch((error) => {
    logger.error('Server startup failed:', error);
    process.exit(1);
  });
}
