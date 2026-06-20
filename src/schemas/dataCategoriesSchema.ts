export const dataCategoriesSchema = {
  name: 'get_data_categories',
  description: 'Get data classification categories for understanding data types and sensitivity',
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
        description: 'Data classification categories',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Category name'
            },
            display_name: {
              type: 'string',
              description: 'User-friendly category name'
            },
            color: {
              type: 'string',
              description: 'UI color code for dashboards'
            }
          }
        }
      }
    }
  }
}; 