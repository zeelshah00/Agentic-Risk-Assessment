export const classificationRatioByIdSchema = {
  name: 'get_classification_ratio_by_id',
  description: 'Get classification ratios for specific sensitivity group by ID',
  inputSchema: {
    type: 'object',
    properties: {
      id: { 
        type: 'string', 
        description: 'ID of the sensitivity classification group'
      },
    },
    required: ['id'],
  }
}; 