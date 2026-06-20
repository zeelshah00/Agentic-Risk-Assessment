import { errorSchema } from './sharedSchemas';

export const catalogRulesSchema = {
  name: 'get_catalog_rules',
  description: 'Get data validation and business rules for understanding data quality rules',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: {
        type: 'object',
        properties: {
          rules: {
            type: 'array',
            description: 'List of catalog rules',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Rule ID' },
                name: { type: 'string', description: 'Rule name' },
                type: { type: 'string', description: 'Rule type' },
                description: { type: 'string', description: 'Rule description' },
                isEnabled: { type: 'boolean', description: 'Whether rule is enabled' },
                isPredefined: { type: 'boolean', description: 'Whether rule is predefined' },
                action: { type: 'object', description: 'Rule action' },
                bigidQuery: { type: 'string', description: 'BigID query string' },
                bigidQueryObject: { type: 'object', description: 'BigID query object' },
                createdAt: { type: 'string', description: 'Creation timestamp' },
                updatedAt: { type: 'string', description: 'Last update timestamp' },
                attributeFriendlyName: { type: 'string', description: 'Friendly name for attribute' },
              },
              additionalProperties: true,
            },
          },
          total: { type: 'number', description: 'Total number of rules' },
        },
      },
      error: errorSchema
    }
  }
}; 