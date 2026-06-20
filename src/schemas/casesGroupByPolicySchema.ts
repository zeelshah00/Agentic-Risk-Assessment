import { errorSchema } from './sharedSchemas';

export const casesGroupByPolicySchema = {
  name: 'get_cases_group_by_policy',
  description: 'Get grouped security cases by policy for compliance reporting',
  inputSchema: {
    type: 'object',
    properties: {
      groupBy: {
        type: 'string',
        enum: ['policy', 'severity', 'status', 'dataSource'],
        description: 'How to group the cases'
      },
      filter: { 
        type: 'string', 
        description: 'Filter criteria for cases'
      },
      limit: { 
        type: 'number', 
        description: 'Number of cases to return'
      },
      skip: { 
        type: 'number', 
        description: 'Number of cases to skip'
      },
      requireTotalCount: { 
        type: 'boolean', 
        description: 'Whether to include total count in response'
      }
    }
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: {
        type: 'object',
        properties: {
          groupedCases: {
            type: 'array',
            description: 'List of grouped cases',
            items: {
              type: 'object',
              properties: {
                policyName: { type: 'string', description: 'Policy name' },
                caseCount: { type: 'number', description: 'Number of cases in this group' },
                cases: {
                  type: 'array',
                  description: 'List of cases in this group',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', description: 'Case ID' },
                      name: { type: 'string', description: 'Case name' },
                      severity: { type: 'string', description: 'Case severity' },
                      status: { type: 'string', description: 'Case status' },
                    },
                    additionalProperties: true,
                  },
                },
              },
              additionalProperties: true,
            },
          },
          total: { type: 'number', description: 'Total number of cases' },
        },
      },
      error: errorSchema
    }
  }
}; 