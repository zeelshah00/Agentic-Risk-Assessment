// DSPM API Types
// Based on dspm-openapi-source.yaml

export interface CaseSeverityRequestDTO {
  caseStatus?: 'open' | 'closed' | 'ignored';
  isIgnored?: boolean;
}

export interface CaseSeverityResponseDTO {
  severityCounts: SeverityCountDTO[];
  totalCases: number;
  ignoredCases: number;
}

export interface SeverityCountDTO {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  count: number;
  percentage: number;
}

export interface AllCasesRequestDTO {
  skip?: number;
  limit?: number;
  filter?: string;
  fields?: string[];
  sort?: string;
}

export interface AllCasesResponseDTO {
  cases: SecurityCaseDTO[];
  totalCount: number;
  hasMore: boolean;
}

export interface SecurityCaseDTO {
  id: string;
  title: string;
  description?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'open' | 'closed' | 'ignored';
  policyName: string;
  policyId: string;
  dataSource: string;
  objectName?: string;
  objectType?: string;
  findings: FindingDTO[];
  assignedTo?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface FindingDTO {
  id: string;
  type: string;
  description: string;
  location?: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface CasesGroupRequestDTO {
  groupBy: 'policy' | 'severity' | 'status' | 'dataSource';
  filter?: string;
  limit?: number;
}

export interface CasesGroupResponseDTO {
  groups: CaseGroupDTO[];
  totalGroups: number;
}

export interface CaseGroupDTO {
  groupKey: string;
  groupName: string;
  caseCount: number;
  cases: SecurityCaseDTO[];
}

export interface CasesMetadataRequestDTO {
  caseIds: string[];
  includeFindings?: boolean;
  includeMetadata?: boolean;
}

export interface CasesMetadataResponseDTO {
  cases: SecurityCaseMetadataDTO[];
}

export interface SecurityCaseMetadataDTO {
  id: string;
  metadata: Record<string, any>;
  findings?: FindingDTO[];
  riskScore?: number;
  complianceStatus?: string;
}

export interface CriticalCaseDTO {
  id: string;
  title: string;
  severity: 'HIGH' | 'CRITICAL';
  status: 'open';
  policyName: string;
  dataSource: string;
  riskScore: number;
  daysOpen: number;
  assignedTo?: string;
}

export interface SecurityTrendDTO {
  date: string;
  newCases: number;
  resolvedCases: number;
  totalOpenCases: number;
  averageResolutionTime?: number;
  severityBreakdown: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
}

export interface CaseStatusUpdateDTO {
  status: 'open' | 'closed' | 'ignored';
  reason?: string;
  assignedTo?: string;
  dueDate?: string;
}

export interface CaseMetadataUpdateDTO {
  title?: string;
  description?: string;
  assignedTo?: string;
  dueDate?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface PublishPolicyRequestDTO {
  policyIds: string[];
  dataSourceIds: string[];
  evaluationType: 'manual' | 'automatic';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface PublishPolicyResponseDTO {
  publishedPolicies: number;
  createdCases: number;
  errors?: string[];
}

export interface CaseActionRequestDTO {
  actionType: 'approve' | 'reject' | 'escalate' | 'assign';
  parameters?: Record<string, any>;
}

export interface CaseActionResponseDTO {
  success: boolean;
  updatedCases: number;
  message?: string;
}

export interface BulkCaseActionRequestDTO {
  caseIds: string[];
  actionType: 'approve' | 'reject' | 'escalate' | 'assign' | 'close' | 'ignore';
  parameters?: Record<string, any>;
}

export interface BulkCaseActionResponseDTO {
  success: boolean;
  updatedCases: number;
  errors?: string[];
}

export interface SecurityPostureSummaryDTO {
  totalCases: number;
  openCases: number;
  criticalCases: number;
  averageResolutionTime: number;
  complianceScore: number;
  riskScore: number;
  trends: SecurityTrendDTO[];
}

// Request/Response wrapper types
export interface DSPMApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DSPMApiRequest<T> {
  data: T;
  options?: {
    timeout?: number;
    retries?: number;
  };
} 