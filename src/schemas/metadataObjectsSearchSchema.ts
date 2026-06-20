import { errorSchema } from './sharedSchemas';

export const metadataObjectsSearchSchema = {
  name: 'metadata_objects_search',
  description: 'Search for objects in the data explorer',
  inputSchema: {
    type: 'object',
    properties: {
      entityType: { type: 'string', description: 'The type of entity to search for' },
      searchText: { type: 'string', description: 'The text to search for. WARNING: Queries that are too broad may cause the API to return an error.' },
      paging: { type: 'object', description: 'A paging object' },
      sort: { type: 'array', items: { type: 'object' }, description: 'An array of sort objects' },
      isHighlight: { type: 'boolean', description: 'Whether to highlight results' },
      fieldsToProject: { type: 'array', items: { type: 'string' }, description: 'The fields to project' },
      offset: { type: 'object', description: 'An offset object' },
      needToHighlight: { type: 'boolean', description: 'Whether to highlight results' },
    },
    required: ['searchText'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            description: 'Data explorer objects with rich metadata',
            items: {
              type: 'object',
              properties: {
                entityType: {
                  type: 'string',
                  enum: ['catalog', 'actionable_insights_cases', 'rdb'],
                  description: 'Entity type - catalog (data objects), actionable_insights_cases (security cases), rdb (database objects)'
                },
                data: {
                  type: 'object',
                  description: 'Object data varies by entity type but includes core identification fields',
                  additionalProperties: true,
                  properties: {
                    severityLevel: { type: 'number', description: 'Severity level for actionable insights cases' },
                    dataSourceName: { type: 'string', description: 'Data source display name' },
                    dataSourceType: { type: 'string', description: 'Data source type' },
                    policyName: { type: 'string', description: 'Policy name' },
                    policyFqdn: { type: 'string', description: 'Policy fully qualified domain name' },
                    updated_at: { type: 'object', description: 'Last update timestamp object' },
                    controlFqdn: { type: 'string', description: 'Control fully qualified domain name' },
                    controlName: { type: 'string', description: 'Control name' },
                    categoryName: { type: 'string', description: 'Category name' },
                    description: { type: 'string', description: 'Description' },
                    frameworkName: { type: 'string', description: 'Framework name' },
                    // Legacy fields that may still be present
                    fullyQualifiedName: { type: 'string', description: 'Unique object path identifier' },
                    fileName: { type: 'string', description: 'File or object name' },
                    source: { type: 'string', description: 'Data source system' },
                    tags: { type: 'array', description: 'Classification and metadata tags' },
                    category: { type: 'array', description: 'Data categories and classifications' },
                    sizeInBytes: { 
                      oneOf: [
                        { type: 'number' },
                        { type: 'string' }
                      ],
                      description: 'Object size in bytes (can be number or string from API)' 
                    },
                    scanDate: { type: 'string', description: 'Last scan timestamp' }
                  }
                }
              }
            }
          },
          offset: {
            type: 'object',
            description: 'Pagination continuation token',
            properties: {
              offsetKey: { 
                type: 'array',
                description: 'Key for retrieving next page of results'
              }
            }
          },
          error: errorSchema
        }
      },
      error: errorSchema
    }
  },
}; 