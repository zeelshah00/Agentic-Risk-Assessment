import { errorSchema, messageSchema, statusSchema, statusCodeSchema } from './sharedSchemas';

export const aciUsersSchema = {
  name: 'get_aci_users',
  description: 'Get user accounts and their shared object counts for user access analysis',
  inputSchema: {
    type: 'object',
    properties: {
      skip: { 
        type: 'number', 
        description: 'Number of users to skip for pagination',
        default: 0,
        minimum: 0
      },
      limit: { 
        type: 'number', 
        description: 'Number of users to return (max 100)',
        default: 10,
        minimum: 1,
        maximum: 100
      },
      requireTotalCount: { 
        type: 'boolean', 
        description: 'Whether to include total count in response',
        default: true
      },
      sort: { 
        type: 'string', 
        description: 'Sort criteria. Supports multiple formats: simple field name, JSON array, or URL-encoded JSON',
        examples: [
          'sharedObjectsCount',
          '[{"field":"sharedObjectsCount","order":"desc"}]',
          '[{"field":"sharedObjectsCount","order":"desc"}]'
        ]
      }
    }
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
          status: statusSchema,
          statusCode: statusCodeSchema,
          data: {
            type: 'object',
            properties: {
              users: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string' },
                    email: { type: 'string' },
                    username: { type: 'string' },
                    name: { type: 'string' },
                    dataSource: { type: 'string' },
                    external: { type: 'boolean' },
                    headless: { type: 'boolean' },
                    sharedObjectsCount: { type: 'number' },
                    createdAt: { type: 'string' },
                    modifiedAt: { type: 'string' }
                  }
                }
              },
              totalCount: { type: 'number' },
              offset: { type: 'number' }
            }
          },
          message: messageSchema
        }
      },
      error: errorSchema
    }
  }
}; 