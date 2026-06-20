export const lineageTreeSchema = {
  name: 'get_lineage_tree',
  description: 'Get data relationships and lineage between datasets for impact analysis and GDPR mapping',
  inputSchema: {
    type: 'object',
    properties: {
      anchorCollections: { 
        type: 'array', 
        description: 'Array of collection identifiers to establish relationships between. Format: DataSource.Schema.Table. Examples: ["Directory.public.identities", "Human Resources.public.employment"]',
        items: { type: 'string' },
        minItems: 1
      },
      anchorAttributeType: { 
        type: 'string', 
        description: 'Type of attributes to analyze for relationships. Examples: "idsor_attributes", "pii_attributes", "business_attributes"'
      },
    },
    required: ['anchorCollections'],
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
          lineageTree: {
            type: 'array',
            description: 'Data flow relationships',
            items: {
              type: 'object',
              properties: {
                _id: {
                  type: 'string',
                  description: 'Source dataset identifier'
                },
                childs: {
                  type: 'array',
                  description: 'Downstream datasets',
                  items: {
                    type: 'string'
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}; 