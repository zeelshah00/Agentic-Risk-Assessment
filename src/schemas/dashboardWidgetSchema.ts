export const dashboardWidgetSchema = {
  name: 'get_dashboard_widget',
  description: 'Get pre-built compliance dashboard data for executive reporting and compliance overview',
  inputSchema: {
    type: 'object',
    properties: {
      widgetType: {
        type: 'string',
        enum: ['group_by_framework', 'group_by_control', 'group_by_policy', 'group_by_data_source_type'],
        description: 'Type of dashboard widget to retrieve'
      },
      paging: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Number of results to return' },
          skip: { type: 'number', description: 'Number of results to skip' }
        }
      }
    },
    required: ['widgetType']
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
              dashboardData: {
                type: 'object',
                description: 'Pre-aggregated compliance metrics'
              }
            }
          }
        }
      }
    }
  }
}; 