export const objectDetailsSchema = {
  name: 'get_object_details',
  description: 'Get detailed metadata for specific objects - deep dive into single object properties',
  inputSchema: {
    type: 'object',
    properties: {
      fullyQualifiedName: { type: 'string', description: 'Fully qualified name of the object' },
    },
    required: ['fullyQualifiedName'],
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
          data: {
            type: 'object',
            properties: {
              fullyQualifiedName: {
                type: 'string',
                description: 'Object identifier'
              },
              attribute: {
                type: 'array',
                description: 'Detected data types/classifiers',
                items: {
                  type: 'string'
                }
              },
              num_identities: {
                type: 'number',
                description: 'Number of unique individuals identifiable'
              },
              totalFindings: {
                type: 'number',
                description: 'Total sensitive data findings'
              },
              acl: {
                type: 'object',
                description: 'Access control information',
                properties: {
                  accessRights: {
                    type: 'string',
                    description: 'Access level (e.g., "OPEN ACCESS")'
                  }
                }
              },
              tags: {
                type: 'array',
                description: 'Applied tags with classification info',
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
              }
            }
          }
        }
      }
    }
  }
}; 