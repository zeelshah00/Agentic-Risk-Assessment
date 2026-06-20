import { StructuredFilterSchema } from '../types/filterTypes';

export const catalogCountSchema = {
  name: 'get_catalog_count',
  description: 'USE FOR METRICS - Quick counts, dashboard metrics, query scoping. Returns count only, no object details. Best for: quick counts, dashboard metrics, query scoping. Use before large get_catalog_objects queries to scope results.',
  inputSchema: {
    type: 'object',
    properties: {
      structuredFilter: StructuredFilterSchema,
    },
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
          count: {
            type: 'number',
            description: 'Total objects matching filter criteria'
          }
        }
      }
    }
  }
}; 