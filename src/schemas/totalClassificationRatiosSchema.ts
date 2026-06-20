import { errorSchema, messageSchema } from './sharedSchemas';

export const totalClassificationRatiosSchema = {
  name: 'get_total_classification_ratios',
  description: 'Get overall classified vs unclassified data ratios for data discovery KPIs',
  inputSchema: {
    type: 'object',
    properties: {},
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          statusCode: { type: 'number' },
          data: {
            type: 'object',
            properties: {
              classifiedItemsAmount: { type: 'number', description: 'Number of classified items' },
              unclassifiedItemsAmount: { type: 'number', description: 'Number of unclassified items' },
            },
          },
          message: messageSchema,
        },
      },
      error: errorSchema
    }
  }
}; 