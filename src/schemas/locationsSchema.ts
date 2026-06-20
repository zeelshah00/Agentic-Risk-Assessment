export const locationsSchema = {
  name: 'get_locations',
  description: 'Get geographic distribution of apps/systems/users for data residency compliance',
  inputSchema: {
    type: 'object',
    properties: {
      locationType: {
        type: 'string',
        enum: ['application', 'identity', 'system'],
        description: 'Type of location data to retrieve'
      }
    },
    required: ['locationType']
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
          applications_locations: {
            type: 'array',
            description: 'Geographic distribution of applications',
            items: {
              type: 'object',
              properties: {
                _id: {
                  anyOf: [
                    { type: 'string' },
                    { type: 'null' }
                  ],
                  description: 'Location identifier'
                },
                name: {
                  anyOf: [
                    { type: 'string' },
                    { type: 'null' }
                  ],
                  description: 'Country/region name'
                },
                applications_count: {
                  type: 'number',
                  description: 'Number of applications in location'
                },
                target_data_sources: {
                  type: 'array',
                  description: 'Data sources in this location',
                  items: {
                    type: 'string'
                  }
                },
                count: {
                  type: 'number',
                  description: 'Count value'
                }
              }
            }
          },
          identity_locations: {
            type: 'array',
            description: 'Geographic distribution of identities',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Location identifier'
                },
                name: {
                  type: 'string',
                  description: 'Country/region name'
                },
                count: {
                  type: 'number',
                  description: 'Number of identities in location'
                },
                avg: {
                  type: 'number',
                  description: 'Average value'
                }
              }
            }
          },
          system_locations: {
            type: 'array',
            description: 'Geographic distribution of data systems',
            items: {
              type: 'object',
              properties: {
                id: {
                  anyOf: [
                    { type: 'string' },
                    { type: 'null' }
                  ],
                  description: 'Location identifier'
                },
                name: {
                  anyOf: [
                    { type: 'string' },
                    { type: 'null' }
                  ],
                  description: 'Country/region name'
                },
                count: {
                  type: 'number',
                  description: 'Number of systems in location'
                },
                avg: {
                  type: 'number',
                  description: 'Average value'
                },
                systems: {
                  type: 'array',
                  description: 'Systems in this location',
                  items: {
                    type: 'string'
                  }
                }
              }
            }
          }
        }
      },
      locationType: {
        type: 'string',
        description: 'The location type that was requested'
      }
    }
  }
}; 