export const inventoryAggregationSchema = {
  name: 'get_inventory_aggregation',
  description: 'Aggregate data by source, tags, sensitivity, etc. for creating dashboards and understanding data distribution',
  inputSchema: {
    type: 'object',
    properties: {
      aggregationType: { 
        type: 'string', 
        enum: ['tags', 'sensitivityFilter', 'source', 'source.type', 'attribute', 'categoryExtended', 'dataFormat', 'duplicateFiles', 'objectStatus'],
        description: 'Type of aggregation to perform. Options: tags (data asset tagging patterns), sensitivityFilter (data sensitivity patterns), source (data source distribution), source.type (data source type distribution), attribute (data attributes), categoryExtended (data categories), dataFormat (data formats), duplicateFiles (duplicate files), objectStatus (object status)'
      },
      sorting: { 
        type: 'array', 
        description: 'Sorting criteria. Examples: [{"field": "docCount", "order": "DESC"}]',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string', description: 'Field to sort by (e.g., "docCount", "aggItemName")' },
            order: { type: 'string', enum: ['ASC', 'DESC'], description: 'Sort order' }
          }
        }
      },
      paging: { 
        type: 'object', 
        properties: {
          limit: { type: 'number', description: 'Number of results to return' },
          skip: { type: 'number', description: 'Number of results to skip' }
        }
      }
    },
    required: ['aggregationType'],
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
          aggregations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                aggName: {
                  type: 'string'
                },
                aggTotal: {
                  type: 'number'
                },
                aggData: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      docCount: {
                        type: 'number'
                      },
                      findings: {
                        type: 'number'
                      },
                      aggItemName: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            }
          },
          aggregationType: {
            type: 'string',
            enum: ['tags', 'sensitivityFilter', 'source', 'source.type', 'attribute', 'categoryExtended', 'dataFormat', 'duplicateFiles', 'objectStatus']
          }
        }
      }
    }
  }
}; 