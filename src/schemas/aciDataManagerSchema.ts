import { StructuredFilterSchema } from '../types/filterTypes';

import { errorSchema, messageSchema, statusSchema, statusCodeSchema } from './sharedSchemas';

export const aciDataManagerSchema = {
  name: 'get_aci_data_manager',
  description: 'Get access control data across data sources for cross-system access analysis',
  inputSchema: {
    type: 'object',
    properties: {
      requireTotalCount: { 
        type: 'boolean', 
        description: 'Whether to include total count in response',
        default: true
      },
      limit: { 
        type: 'number', 
        description: 'Number of items to return (max 100)',
        default: 10,
        minimum: 1,
        maximum: 100
      },
      skip: { 
        type: 'number', 
        description: 'Number of items to skip for pagination',
        default: 0,
        minimum: 0
      },
      filter: {
        ...StructuredFilterSchema,
        description: 'Structured filter to apply to the query. Supports complex filtering by source, type, size, dates, and more.'
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
            type: 'array',
            description: 'Array of data manager items',
            items: {
              type: 'object',
              properties: {
                _id: { 
                  type: 'string',
                  description: 'Unique identifier'
                },
                fullyQualifiedName: { 
                  type: 'string',
                  description: 'Complete path/name of the object'
                },
                source: { 
                  type: 'string',
                  description: 'Data source name'
                },
                objectType: { 
                  type: 'string',
                  description: 'Type of object (folder, file, etc.)'
                },
                shortenedFQN: { 
                  type: 'string',
                  description: 'Shortened display name'
                },
                annotations: {
                  type: 'object',
                  properties: {
                    hierarchyType: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Object type in hierarchy (SUB_CONTAINER, LEAF_DATA_OBJECT)'
                    },
                    sharedWithGroup: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Groups with access to this object'
                    },
                    openAccess: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Access level indicators'
                    }
                  }
                },
                objectDetails: {
                  type: 'object',
                  description: 'Detailed information for data objects (files)',
                  properties: {
                    scanId: { type: 'string' },
                    attribute: { 
                      type: 'array',
                      items: { type: 'string' }
                    },
                    total_pii_count: { type: 'number' },
                    containerName: { type: 'string' },
                    created_date: { type: 'string' },
                    detailedObjectType: { type: 'string' },
                    modified_date: { type: 'string' },
                    objectName: { type: 'string' },
                    scannerType: { type: 'string' },
                    sizeInBytes: { 
                      oneOf: [
                        { type: 'number' },
                        { type: 'string' }
                      ]
                    },
                    type: { type: 'string' },
                    scan_status: { type: 'string' },
                    scannerTypeGroup: { type: 'string' }
                  }
                }
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