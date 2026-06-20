// Data Catalog API Types
// Based on data-catalog-openapi-source.yaml

export interface CatalogRequestDTO {
  skip?: number;
  limit?: number;
  filter?: string;
  searchText?: string;
  sort?: string;
  offsetKey?: string;
  ignoreLimit?: boolean;
  sample?: number;
  requireTotalCount?: string;
  format?: string;
}

export interface CatalogResponseDTO {
  results: CatalogObjectDTO[];
  totalCount?: number;
  offset?: OffsetDTO;
}

export interface CatalogObjectDTO {
  fullyQualifiedName: string;
  name: string;
  type: string;
  source: string;
  location?: string;
  size?: number;
  lastModified?: string;
  tags?: TagAssignmentDTO[];
  metadata?: Record<string, any>;
}

export interface ObjectDetailsDTO {
  fullyQualifiedName: string;
  name: string;
  type: string;
  source: string;
  location?: string;
  size?: number;
  lastModified?: string;
  columns?: ColumnDTO[];
  tags?: TagAssignmentDTO[];
  metadata?: Record<string, any>;
  relations?: RelationDTO[];
  risk?: RiskDTO;
}

export interface ColumnDTO {
  name: string;
  type: string;
  nullable?: boolean;
  description?: string;
  businessAttribute?: string;
  friendlyName?: string;
  tags?: TagAssignmentDTO[];
  metadata?: Record<string, any>;
}

export interface TagDTO {
  id: string;
  name: string;
  description?: string;
  color?: string;
  category?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTagDTO {
  name: string;
  description?: string;
  color?: string;
  category?: string;
}

export interface UpdateTagDTO {
  name?: string;
  description?: string;
  color?: string;
  category?: string;
}

export interface TagAssignmentDTO {
  tagId: string;
  tagName: string;
  assignedBy?: string;
  assignedAt?: string;
  confidence?: number;
}

export interface RuleDTO {
  id: string;
  name: string;
  description?: string;
  type: string;
  conditions: RuleConditionDTO[];
  actions: RuleActionDTO[];
  enabled: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRuleDTO {
  name: string;
  description?: string;
  type: string;
  conditions: RuleConditionDTO[];
  actions: RuleActionDTO[];
  enabled?: boolean;
}

export interface UpdateRuleDTO {
  name?: string;
  description?: string;
  type?: string;
  conditions?: RuleConditionDTO[];
  actions?: RuleActionDTO[];
  enabled?: boolean;
}

export interface RuleConditionDTO {
  field: string;
  operator: string;
  value: any;
}

export interface RuleActionDTO {
  type: string;
  parameters: Record<string, any>;
}

export interface RelationDTO {
  id: string;
  sourceFqn: string;
  targetFqn: string;
  type: string;
  strength?: number;
  metadata?: Record<string, any>;
}

export interface RiskDTO {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number;
  factors: RiskFactorDTO[];
  lastAssessed?: string;
}

export interface RiskFactorDTO {
  type: string;
  description: string;
  score: number;
}

export interface OffsetDTO {
  offsetKey: string[];
  jobId?: string;
  keepAlive?: string;
}

export interface CatalogExportRequestDTO {
  format: 'CSV' | 'JSON' | 'ZIP';
  filter?: string;
  fields?: string[];
  includeMetadata?: boolean;
}

export interface CatalogCountRequestDTO {
  filter?: string;
  searchText?: string;
}

export interface CatalogCountResponseDTO {
  count: number;
  breakdown?: Record<string, number>;
}

export interface DistinctValuesRequestDTO {
  fieldName: string;
  filter?: string;
  limit?: number;
}

export interface DistinctValuesResponseDTO {
  fieldName: string;
  values: DistinctValueDTO[];
  totalCount: number;
}

export interface DistinctValueDTO {
  value: any;
  count: number;
  percentage: number;
}

export interface ObjectSummaryDTO {
  totalObjects: number;
  totalSize: number;
  byType: Record<string, number>;
  bySource: Record<string, number>;
  byRiskLevel: Record<string, number>;
  lastUpdated: string;
}

export interface CatalogHealthDTO {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  message?: string;
  timestamp: string;
  version: string;
}

// Request/Response wrapper types
export interface CatalogApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CatalogApiRequest<T> {
  data: T;
  options?: {
    timeout?: number;
    retries?: number;
  };
} 