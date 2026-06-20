import { errorSchema, messageSchema, statusSchema, statusCodeSchema } from './sharedSchemas';

export const catalogTagsSchema = {
  name: 'get_catalog_tags',
  description: 'Get tag hierarchy and structure for understanding available tags for filtering',
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
          data: {
            type: 'array',
            description: 'List of catalog tags',
            items: {
              type: 'object',
              properties: {
                _id: { type: 'string', description: 'Tag ID' },
                name: { type: 'string', description: 'Tag name' },
                type: { type: 'string', description: 'Tag type' },
                description: { type: 'string', description: 'Tag description' },
                parent_id: { 
                  oneOf: [
                    { type: 'string' },
                    { type: 'null' }
                  ],
                  description: 'Parent tag ID'
                },
                is_mutually_exclusive: { 
                  oneOf: [
                    { type: 'boolean' },
                    { type: 'null' }
                  ],
                  description: 'Whether tag is mutually exclusive'
                },
                properties: { type: 'object', description: 'Tag properties' },
                created_at: { type: 'string', description: 'Creation timestamp' },
                updated_at: { type: 'string', description: 'Last update timestamp' },
              },
              additionalProperties: true,
            },
          },
          message: messageSchema,
          status: statusSchema,
          statusCode: statusCodeSchema,
        },
      },
      error: errorSchema
    }
  }
}; 