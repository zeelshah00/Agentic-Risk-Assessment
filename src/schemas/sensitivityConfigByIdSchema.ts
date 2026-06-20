export const sensitivityConfigByIdSchema = {
  name: 'get_sensitivity_config_by_id',
  description: 'Get specific sensitivity group configuration by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: { 
        type: 'string', 
        description: 'ID of the sensitivity configuration to retrieve'
      },
    },
    required: ['id'],
  }
}; 