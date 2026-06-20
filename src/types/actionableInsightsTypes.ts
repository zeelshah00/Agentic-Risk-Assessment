export interface ActionableInsightsCase {
  _id: string;
  policyName: string;
  policyLastTriggered: string;
  caseCount: number;
  caseStatus: string;
  severity?: string;
  description?: string;
}

export interface ActionableInsightsCasesResponse {
  status: string;
  statusCode: number;
  data: {
    policies: ActionableInsightsCase[];
    totalCount?: number;
  };
  message: string | null;
}

export interface ActionableInsightsParams {
  skip?: number;
  limit?: number;
  requireTotalCount?: boolean;
  filter?: string;
} 