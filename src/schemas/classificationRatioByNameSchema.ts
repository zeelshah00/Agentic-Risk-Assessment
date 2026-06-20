export const classificationRatioByNameSchema = {
  name: 'get_classification_ratio_by_name',
  description: 'Get classification ratios for specific sensitivity group by name',
  inputSchema: {
    type: 'object',
    properties: {
      name: { 
        type: 'string', 
        description: 'Name of the sensitivity classification group'
      },
    },
    required: ['name'],
  }
}; 