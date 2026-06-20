// Data Categories API Types
// Based on data-categories-openapi-source.yaml

export interface DataCategoryDTO {
  color?: string;
  dc?: DataCategoryEntryDTO[];
  description?: string;
  display_name?: string;
  glossary_id?: string;
  name?: string;
  type?: string;
}

export interface DataCategoryEntryDTO {
  color?: string;
  description?: string;
  display_name?: string;
  unique_name?: string;
}

export interface CreateDataCategoryDTO {
  unique_name: string;
  description?: string;
  display_name?: string;
  color?: string;
}

export interface CreateDataCategoryResponseDTO {
  success: boolean;
  glossary_id: string;
}

export interface DataCategoriesApiResponse {
  success: boolean;
  data?: DataCategoryDTO[];
  error?: string;
  message?: string;
} 