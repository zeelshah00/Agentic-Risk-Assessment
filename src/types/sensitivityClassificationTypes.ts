// Sensitivity Classification API Types
// Based on sensitivity-classification-openapi-source.yaml

export interface ScConfigEntryDto {
  // Based on the schema, this appears to be an empty object
  [key: string]: any;
}

export interface BasicScConfigDto {
  id?: string;
  name: string;
  description?: string;
  levels: ScLevelDto[];
  enabled?: boolean;
}

export interface ScLevelDto {
  id?: string;
  name: string;
  description?: string;
  color?: string;
  priority: number;
  enabled?: boolean;
}

export interface ScConfigCreateResultDto {
  id: string;
  name: string;
  description?: string;
  levels: ScLevelDto[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScConfigsGetResponseDto {
  scConfigs: ScConfigCreateResultDto[];
  offset: number;
  totalCount: number;
}

export interface ClassificationTotalRatioResponse {
  classified: number;
  unclassified: number;
  total: number;
}

export interface ClassificationRatioResponse {
  groupId: string;
  groupName: string;
  levels: ScLevelRatioDto[];
  total: number;
}

export interface ScLevelRatioDto {
  levelId: string;
  levelName: string;
  levelColor?: string;
  levelPriority: number;
  count: number;
  percentage: number;
}

export interface SensitivityClassificationApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
} 