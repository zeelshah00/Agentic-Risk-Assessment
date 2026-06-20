export interface WidgetRequestDTO {
  group: string;
  type: string;
  subType: string;
  additionalProperties: {
    widgets: Array<{
      widgetAggregationName: string;
      paging?: {
        limit: number;
        skip: number;
      };
    }>;
  };
}

export interface WidgetResponseDTO {
  status: string;
  statusCode: number;
  data: {
    dashboardData: any;
  };
  message: string | null;
}

// Specific widget types
export interface ComplianceByFrameworkRequestDTO {
  paging?: {
    limit: number;
    skip: number;
  };
}

export interface ComplianceByControlRequestDTO {
  paging?: {
    limit: number;
    skip: number;
  };
}

export interface ComplianceByPolicyRequestDTO {
  paging?: {
    limit: number;
    skip: number;
  };
}

export interface ComplianceByDataSourceTypeRequestDTO {
  paging?: {
    limit: number;
    skip: number;
  };
}

// Response types for specific widgets
export interface FrameworkDTO {
  frameworkName: string;
  totalControls: number;
  failedControlsCount: number;
  controls?: ControlDTO[];
}

export interface ControlDTO {
  controlName: string;
  description: string;
  frameworkName?: string;
  failedControlsCount?: number;
  failedPoliciesCount?: number;
  policies?: PolicyDTO[];
}

export interface PolicyDTO {
  policyName: string;
  policySeverityLevel: string;
  description?: string;
} 