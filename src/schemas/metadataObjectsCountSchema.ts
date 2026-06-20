import { errorSchema } from './sharedSchemas';

export const metadataObjectsCountSchema = {
  name: 'metadata_objects_count',
  description: 'Count objects in the data explorer',
  inputSchema: {
    type: 'object',
    properties: {
      entityType: { type: 'string', description: 'The type of entity to count' },
      searchText: { type: 'string', description: 'The text to search for. WARNING: Queries that are too broad may cause the API to return an error.' },
    },
    required: ['searchText'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: {
        type: 'object',
        properties: {
          count: { 
            type: 'integer', 
            description: 'Total number of objects matching the search criteria' 
          }
        }
      },
      error: errorSchema
    }
  },
}; 