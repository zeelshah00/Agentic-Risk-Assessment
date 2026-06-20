export const healthCheckSchema = {
  name: 'get_health_check',
  description: 'Check BigID system connectivity and status',
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
          response: {
            type: 'string',
            description: 'Health status - typically "OK" when healthy'
          }
        }
      }
    }
  }
}; 