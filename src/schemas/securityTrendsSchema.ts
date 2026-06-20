export const securityTrendsSchema = {
  name: 'get_security_trends',
  description: 'Get security trends and statistics for risk monitoring',
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
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              open: {
                type: 'array',
                description: 'Trend of open security cases over time',
                items: {
                  type: 'object',
                  properties: {
                    date: {
                      type: 'string'
                    },
                    value: {
                      type: 'number'
                    }
                  }
                }
              },
              closed: {
                type: 'array',
                description: 'Trend of resolved cases over time',
                items: {
                  type: 'object',
                  properties: {
                    date: {
                      type: 'string'
                    },
                    value: {
                      type: 'number'
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