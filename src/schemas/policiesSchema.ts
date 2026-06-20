export const policiesSchema = {
  name: 'get_policies',
  description: 'Get all compliance policies and their status for policy management',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean'
      },
      data: {
        type: 'array',
        description: 'Compliance policies',
        items: {
          type: 'object',
          properties: {
            ruleId: {
              type: 'string',
              description: 'Policy rule ID'
            },
            name: {
              type: 'string',
              description: 'Policy name'
            },
            description: {
              type: 'string',
              description: 'Policy description'
            },
            type: {
              type: 'string',
              description: 'Policy type'
            },
            enabled: {
              type: 'boolean',
              description: 'Whether policy is enabled'
            },
            conditions: {
              type: 'array',
              description: 'Policy conditions',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  operator: { type: 'string' },
                  value: { description: 'Condition value' },
                  fieldType: { type: 'string' }
                }
              }
            },
            actions: {
              type: 'array',
              description: 'Policy actions',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  parameters: { type: 'object' }
                }
              }
            },
            created_at: {
              type: 'string',
              description: 'Creation timestamp'
            },
            updated_at: {
              type: 'string',
              description: 'Last update timestamp'
            }
          }
        }
      }
    }
  }
}; 