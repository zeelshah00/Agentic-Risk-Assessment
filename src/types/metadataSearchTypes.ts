export interface SearchFilter {
  field: string;
  operator: 'equal' | 'notEqual' | 'contains' | 'notContains' | 'greaterThan' | 'greaterThanOrEqual' | 'lessThan' | 'lessThanOrEqual' | 'in' | 'exact' | 'notExact';
  value: any;
  fieldType?: 'NUMBER' | 'DATE' | 'STRING' | 'HASH_STRING' | 'BOOLEAN' | 'OBJECT' | 'USER' | 'ENTITY_TYPE' | 'TAGS';
}

export interface Sort {
  field: string;
  order: 'asc' | 'desc';
}

export interface Paging {
  skip: number;
  limit: number;
}

export interface QuickSearchRequest {
  text: string;
  filter?: SearchFilter[];
  top?: number;
}

export interface FullSearchRequest {
  text: string;
  filter?: SearchFilter[];
  sort?: Sort[];
  paging?: Paging;
}

export interface DataExplorerRequest {
  searchText: string;
  paging?: Paging;
  sort?: Sort[];
  isHighlight?: boolean;
  fieldsToProject?: string[];
  offset?: any;
  needToHighlight?: boolean;
}

export interface DataExplorerObjectsBaseRequest {
  searchText: string;
} 