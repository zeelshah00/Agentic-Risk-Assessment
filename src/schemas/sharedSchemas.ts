// Shared schema definitions to avoid duplication across tool schemas

export const errorSchema = {
  oneOf: [
    { type: 'string' },
    { type: 'null' },
    {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        retryable: { type: 'boolean' }
      },
      additionalProperties: true
    }
  ],
  description: 'Error message if any, null if successful, or error object'
};

export const messageSchema = {
  oneOf: [
    { type: 'string' },
    { type: 'null' }
  ],
  description: 'Response message'
};

export const statusSchema = {
  type: 'string',
  description: 'Response status'
};

export const statusCodeSchema = {
  type: 'number',
  description: 'Response status code'
};

// Common response wrapper schema
export const successResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: { 
      oneOf: [
        { type: 'object' },
        { type: 'null' }
      ]
    },
    error: errorSchema
  }
}; 
