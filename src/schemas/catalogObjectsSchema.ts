import { StructuredFilterSchema } from '../types/filterTypes';

export const catalogObjectsSchema = {
  name: 'get_catalog_objects',
  description: 'USE FOR ANALYSIS - Detailed filtering and compliance audits. Returns full metadata with advanced filtering capabilities. Best for: data inventory, compliance audits, detailed analysis. Use structuredFilter for complex criteria (PII, sensitivity, dates, etc.). Start broad and progressively narrow results.',
  inputSchema: {
    type: 'object',
    properties: {
      structuredFilter: StructuredFilterSchema,
      skip: { 
        type: 'number', 
        description: 'Number of objects to skip (for pagination)'
      },
      limit: { 
        type: 'number', 
        description: 'Number of objects to return (max 200)',
        maximum: 200
      },
      offset: { 
        type: 'number', 
        description: 'Alternative pagination offset'
      },
      sort: { 
        type: 'string', 
        description: 'Sorting criteria as JSON array. Examples: [{"field": "name", "order": "asc"}], [{"field": "updated_at", "order": "desc"}]'
      },
      offsetKey: { 
        type: 'string', 
        description: 'Offset key for pagination (returned in previous response)' 
      },
      ignoreLimit: { 
        type: 'boolean', 
        description: 'Whether to ignore the limit parameter'
      },
      sample: { 
        type: 'number', 
        description: 'Number of files to randomly sample (useful for large datasets)' 
      },
      requireTotalCount: { 
        type: 'boolean', 
        description: 'Whether to include total count in response'
      },
      respectHiddenTags: { 
        type: 'string', 
        description: 'Whether to include hidden tags in response'
      },
      getColumnOrFieldOccurrencesCounterFlag: { 
        type: 'boolean', 
        description: 'Whether to include column/field occurrence counts'
      },
      getNumIdentitiesFlag: { 
        type: 'boolean', 
        description: 'Whether to include the number of identities'
      },
    },
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean'
      },
      data: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            description: 'Discovered data objects',
            items: {
              type: 'object',
              properties: {
                fullyQualifiedName: {
                  type: 'string',
                  description: 'Unique object identifier across environment'
                },
                total_pii_count: {
                  type: 'number',
                  description: 'PII findings count - high values indicate privacy risk'
                },
                scanner_type_group: {
                  type: 'string',
                  description: 'Data type: structured, unstructured, email'
                },
                source: {
                  type: 'string',
                  description: 'Data source system name'
                },
                tags: {
                  type: 'array',
                  description: 'Classification tags with sensitivity and compliance info',
                  items: {
                    type: 'object',
                    properties: {
                      tagName: {
                        type: 'string'
                      },
                      tagValue: {
                        type: 'string'
                      }
                    }
                  }
                },
                open_access: {
                  type: 'string',
                  description: 'Access level - "Yes" means publicly accessible (critical security risk)'
                },
                sizeInBytes: {
                  oneOf: [
                    { type: 'number' },
                    { type: 'string' }
                  ],
                  description: 'Object size in bytes (can be number or string from API)'
                },
                scanStatus: {
                  type: 'string',
                  description: 'Scan status: Completed, Failed, InProgress'
                },
                objectType: {
                  type: 'string',
                  description: 'Object type: file, database, kafka, etc.'
                },
                attribute: {
                  type: 'array',
                  description: 'Detected data types (e.g., email, street_address)',
                  items: {
                    type: 'string'
                  }
                }
              }
            }
          },
          totalRowsCounter: {
            type: 'number',
            description: 'Total results returned'
          }
        }
      }
    }
  }
}; 