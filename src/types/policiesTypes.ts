// Policies API Types
// Based on policies-openapi-source.yaml

export interface PolicyDTO {
  ruleId?: string;
  name: string;
  description?: string;
  type: string;
  enabled?: boolean;
  conditions?: PolicyConditionDTO[];
  actions?: PolicyActionDTO[];
  created_at?: string;
  updated_at?: string;
}

export interface PolicyConditionDTO {
  field: string;
  operator: string;
  value: any;
  fieldType?: string;
}

export interface PolicyActionDTO {
  type: string;
  parameters: Record<string, any>;
}

export interface CreatePolicyDTO {
  name: string;
  description?: string;
  type: string;
  enabled?: boolean;
  conditions?: PolicyConditionDTO[];
  actions?: PolicyActionDTO[];
}

export interface UpdatePolicyDTO {
  name?: string;
  description?: string;
  type?: string;
  enabled?: boolean;
  conditions?: PolicyConditionDTO[];
  actions?: PolicyActionDTO[];
}

export interface TestPolicyDTO {
  bigidQuery: string;
  maxFindings?: string;
  type: string;
}

export interface TestPolicyResponseDTO {
  calcDate: string;
  findingsAmt: number;
  violated: boolean;
}

export interface PolicyCreateResponseDTO {
  ruleId: string;
  status: string;
}

export interface PolicyUpdateResponseDTO {
  isModified: boolean;
  ruleId: string;
  status: string;
}

export interface PoliciesApiResponse {
  success: boolean;
  data?: PolicyDTO[] | PolicyDTO;
  error?: string;
  message?: string;
} 