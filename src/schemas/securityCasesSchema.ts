import { StructuredFilterSchema } from '../types/filterTypes';

export const securityCasesSchema = {
  name: 'get_security_cases',
  description: 'Get security cases and incidents for risk and compliance analysis',
  inputSchema: {
    type: 'object',
    properties: {
      caseStatus: { 
        type: 'string', 
        enum: ['open', 'closed', 'ignored'],
        description: 'Filter by case status'
      },
      severity: { 
        type: 'string', 
        enum: ['critical', 'high', 'medium', 'low'],
        description: 'Filter by severity level'
      },
      skip: { 
        type: 'number', 
        description: 'Number of cases to skip for pagination'
      },
      limit: { 
        type: 'number', 
        description: 'Maximum number of cases to return'
      },
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
          data: {
            type: 'object',
            properties: {
              cases: {
                type: 'array',
                description: 'Security cases and violations',
                items: {
                  type: 'object',
                  properties: {
                    caseId: {
                      type: 'string',
                      description: 'Unique case identifier'
                    },
                    severityLevel: {
                      type: 'string',
                      description: 'Risk level: critical, high, medium, low'
                    },
                    numberOfAffectedObjects: {
                      type: 'number',
                      description: 'Objects impacted by violation'
                    },
                    policyName: {
                      type: 'string',
                      description: 'Name of violated policy'
                    },
                    caseStatus: {
                      type: 'string',
                      description: 'Status: open, remediated'
                    },
                    dataSourceName: {
                      type: 'string',
                      description: 'Affected data source'
                    },
                    policyDescription: {
                      type: 'string',
                      description: 'Policy violation details'
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}; 