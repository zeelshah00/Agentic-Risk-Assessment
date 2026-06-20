import { errorSchema, messageSchema, statusSchema, statusCodeSchema } from './sharedSchemas';

export const aciGroupsSchema = {
  name: 'get_aci_groups',
  description: 'Get user groups and memberships for group-based access analysis and role management',
  inputSchema: {
    type: 'object',
    properties: {
      skip: { 
        type: 'number', 
        description: 'Number of groups to skip for pagination',
        default: 0,
        minimum: 0
      },
      limit: { 
        type: 'number', 
        description: 'Number of groups to return (max 100)',
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
          'name',
          '[{"field":"name","order":"asc"}]',
          '[{"field":"name","order":"asc"}]'
        ]
      }
    }
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        description: 'Whether the request was successful'
      },
      data: {
        type: 'object',
        properties: {
          status: statusSchema,
          statusCode: statusCodeSchema,
          data: {
            type: 'object',
            properties: {
              groups: {
                type: 'array',
                description: 'Array of group objects',
                items: {
                  type: 'object',
                  properties: {
                    _id: { 
                      type: 'string',
                      description: 'Unique group identifier'
                    },
                    dataSource: { 
                      type: 'string',
                      description: 'Source system name'
                    },
                    email: { 
                      type: 'string',
                      description: 'Group email or identifier'
                    },
                    name: { 
                      type: 'string',
                      description: 'Display name'
                    },
                    createdAt: { 
                      type: 'string',
                      description: 'Creation date'
                    },
                    external: { 
                      type: 'boolean',
                      description: 'Whether group is external to organization'
                    },
                    modifiedAt: { 
                      type: 'string',
                      description: 'Last modification date'
                    },
                    type: { 
                      type: 'string',
                      description: 'Group classification (GLOBAL, EMAIL, PROJECT, ORGANIZATION)'
                    },
                    updated_at: { 
                      type: 'string',
                      description: 'Last update timestamp'
                    },
                    lastAggregatedDate: { 
                      type: 'string',
                      description: 'Last aggregation date'
                    },
                    sharedObjectsCount: { 
                      type: 'number',
                      description: 'Number of objects shared with this group'
                    }
                  }
                }
              },
              offset: { 
                type: 'number',
                description: 'Pagination offset'
              },
              totalCount: { 
                type: 'number',
                description: 'Total number of groups'
              }
            }
          },
          message: messageSchema
        }
      },
      error: errorSchema
    }
  }
}; 