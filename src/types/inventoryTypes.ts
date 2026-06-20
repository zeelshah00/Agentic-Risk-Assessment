export interface InventoryAggregationRequestDTO {
  aggregations: Array<{
    aggName: string;
    sorting?: Array<{
      field: string;
      order: 'ASC' | 'DESC';
    }>;
    paging?: {
      limit: number;
      skip: number;
    };
  }>;
}

export interface InventoryAggregationItemDTO {
  docCount: number;
  findings: number;
  aggItemName: string;
  aggItemGroup?: string;
  groupDocCount?: number;
}

export interface InventoryAggregationDTO {
  aggName: string;
  aggTotal: number;
  aggData: InventoryAggregationItemDTO[];
}

export interface InventoryResponseDTO {
  aggregations: InventoryAggregationDTO[];
}

// Specific aggregation types
export interface TagsAggregationRequestDTO {
  sorting?: Array<{
    field: string;
    order: 'ASC' | 'DESC';
  }>;
  paging?: {
    limit: number;
    skip: number;
  };
}

export interface SensitivityFilterAggregationRequestDTO {
  sorting?: Array<{
    field: string;
    order: 'ASC' | 'DESC';
  }>;
  paging?: {
    limit: number;
    skip: number;
  };
}

export interface SourceAggregationRequestDTO {
  sorting?: Array<{
    field: string;
    order: 'ASC' | 'DESC';
  }>;
  paging?: {
    limit: number;
    skip: number;
  };
}

export interface SourceTypeAggregationRequestDTO {
  sorting?: Array<{
    field: string;
    order: 'ASC' | 'DESC';
  }>;
  paging?: {
    limit: number;
    skip: number;
  };
}

export interface AttributeAggregationRequestDTO {
  sorting?: Array<{
    field: string;
    order: 'ASC' | 'DESC';
  }>;
  paging?: {
    limit: number;
    skip: number;
  };
}

export interface CategoryExtendedAggregationRequestDTO {
  sorting?: Array<{
    field: string;
    order: 'ASC' | 'DESC';
  }>;
  paging?: {
    limit: number;
    skip: number;
  };
}

export interface DataFormatAggregationRequestDTO {
  sorting?: Array<{
    field: string;
    order: 'ASC' | 'DESC';
  }>;
  paging?: {
    limit: number;
    skip: number;
  };
}

export interface DuplicateFilesAggregationRequestDTO {
  sorting?: Array<{
    field: string;
    order: 'ASC' | 'DESC';
  }>;
  paging?: {
    limit: number;
    skip: number;
  };
}

export interface ObjectStatusAggregationRequestDTO {
  sorting?: Array<{
    field: string;
    order: 'ASC' | 'DESC';
  }>;
  paging?: {
    limit: number;
    skip: number;
  };
} 