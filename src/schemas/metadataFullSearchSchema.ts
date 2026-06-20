import { errorSchema } from './sharedSchemas';

export const metadataFullSearchSchema = {
  name: 'metadata_full_search',
  description: 'USE FOR ADVANCED SEARCH - Advanced metadata search with comprehensive filtering, sorting, and pagination. Supports 40+ field filters, 16 sortable fields, and wildcard text search. Returns complete object metadata. Best for complex queries and detailed analysis.',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Search text to find across metadata fields. Use wildcards like \'customer*\' or \'*password*\' for partial matching. Use \'*\' to return all results when only filtering is desired.'
      },
      filter: {
        type: 'array',
        description: 'Array of filter conditions to narrow search results. Combine multiple filters for complex queries (AND logic).',
        items: {
          type: 'object',
          required: ['field', 'operator', 'value', 'fieldType'],
          properties: {
            field: {
              type: 'string',
              description: 'Field name to filter on. Must use exact BigID field names.',
              enum: [
                '_es_entityType',
                'source',
                '_es_dataSource',
                'containerName',
                'objectName',
                '_es_name',
                'fullyQualifiedName',
                'scanner_type_group',
                '_es_datasourceType',
                'total_pii_count',
                'sizeInBytes',
                'totalRows',
                'max_pii_count',
                'num_identities',
                '_es_scanDate',
                '_es_created_date',
                '_es_modifiedDate',
                'updated_at',
                'scanStatus',
                'correlation_status',
                '_es_sensitivity',
                'category',
                'attribute',
                '_es_attributes',
                'tags',
                '_es_formattedTags',
                '_es_owners',
                'owner',
                'isEncrypted',
                'hasPiiFindings',
                'archive',
                'isArchive',
                'metadataOnly',
                'isMetadataOnly',
                '_es_datasourceLocation',
                'fileExtension',
                'mimeType',
                'language',
                'is_view',
                'detailedObjectType',
                'hierarchyType'
              ]
            },
            operator: {
              type: 'string',
              description: 'Comparison operator for the filter condition',
              enum: [
                'equal',
                'notEqual',
                'contains',
                'notContains',
                'greaterThan',
                'greaterThanOrEqual',
                'lessThan',
                'lessThanOrEqual',
                'in',
                'exact',
                'notExact'
              ]
            },
            value: {
              description: 'Value to compare against. Type should match the field type.',
              oneOf: [
                { type: 'string' },
                { type: 'number' },
                { type: 'boolean' },
                { type: 'array', items: { type: 'string' } }
              ]
            },
            fieldType: {
              type: 'string',
              description: 'Data type of the field being filtered. Must match actual BigID field type.',
              enum: [
                'STRING',
                'NUMBER',
                'DATE',
                'BOOLEAN',
                'HASH_STRING',
                'OBJECT',
                'USER',
                'ENTITY_TYPE',
                'TAGS'
              ]
            }
          }
        }
      },
      sort: {
        type: 'array',
        description: 'Array of sort criteria to order results. Applied in sequence.',
        items: {
          type: 'object',
          required: ['field', 'order'],
          properties: {
            field: {
              type: 'string',
              description: 'Field name to sort by. Must be a sortable field.',
              enum: [
                'total_pii_count',
                'sizeInBytes',
                'totalRows',
                'max_pii_count',
                'num_identities',
                '_es_scanDate',
                '_es_created_date',
                '_es_modifiedDate',
                'updated_at',
                'objectName',
                '_es_name',
                'source',
                '_es_dataSource',
                'containerName',
                '_es_indexTimestamp_catalog',
                'scannedSize',
                'totalFindings'
              ]
            },
            order: {
              type: 'string',
              description: 'Sort direction',
              enum: ['asc', 'desc']
            }
          }
        }
      },
      paging: {
        type: 'object',
        description: 'Pagination controls for large result sets',
        properties: {
          skip: {
            type: 'integer',
            minimum: 0,
            description: 'Number of results to skip (offset)'
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 200,
            description: 'Maximum number of results to return per page'
          }
        }
      }
    },
    required: ['text'],
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
            description: 'Complete search results with full metadata',
            items: {
              type: 'object',
              properties: {
                primary: {
                  type: 'array',
                  description: 'Core object properties',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', description: 'Object identifier' },
                      entityId: { type: 'string', description: 'Entity identifier' },
                      name: { type: 'string', description: 'Object name' },
                      updateDate: { type: 'string', description: 'Last update timestamp' },
                      owner: { type: 'array', description: 'Object owners' },
                      tags: { type: 'array', description: 'Classification tags' },
                      attributes: { type: 'array', description: 'Data attributes' },
                      source: { type: 'string', description: 'Data source' },
                      category: { type: 'array', description: 'Data categories' }
                    }
                  }
                },
                assets: { 
                  type: 'array',
                  description: 'Complete metadata and technical properties',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Asset name' },
                      value: { description: 'Asset value' }
                    },
                    additionalProperties: true
                  }
                },
                type: {
                  type: 'string',
                  enum: ['file', 'rdb', 'policy', 'actionable_insights_cases'],
                  description: 'Entity type'
                },
                id: { type: 'string', description: 'Unique identifier' }
              }
            }
          }
        }
      },
      error: errorSchema
    }
  },
}; 