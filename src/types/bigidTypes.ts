// BigID API Types based on OpenAPI specification

export interface QuickSearchRequest {
  text: string;
  filter: SearchFilter[];
  top: number;
}

export interface FullSearchRequest {
  text: string;
  filter: SearchFilter[];
  sort: Sort[];
  paging: Paging;
}

export interface SearchFilter {
  field: string;
  operator: 'equal' | 'notEqual' | 'contains' | 'notContains' | 'greaterThan' | 'greaterThanOrEqual' | 'lessThan' | 'lessThanOrEqual' | 'in' | 'exact' | 'notExact';
  value: any;
  fieldType: 'NUMBER' | 'DATE' | 'STRING' | 'HASH_STRING' | 'BOOLEAN' | 'OBJECT' | 'USER' | 'ENTITY_TYPE' | 'TAGS';
}

export interface Sort {
  field: string;
  order: 'asc' | 'desc';
}

export interface Paging {
  skip: number;
  limit: number;
}

export interface SearchDocumentResponse {
  typeResults: AggsDoc[];
}

export interface SearchFullDocumentResponse {
  results: SearchResultEntity[];
}

export interface AggsDoc {
  type: string;
  count: number;
  results: SearchResultEntity[];
}

export interface SearchResultEntity {
  primary: Primary[];
  assets: Asset[];
  type: string;
  id: string;
  templateUrl: string;
}

export interface Primary {
  name: string;
  value: any;
  highlightedValue?: string;
  originalField: string;
}

export interface Asset {
  name: string;
  value: any;
}

// Entity Types
export interface SyncControl {
  id: string;
  appId: string;
  friendlyName: string;
  friendlyNamePlural: string;
  dataSource?: DataSource;
  permissions: string[];
  syncStrategy?: SyncStrategy;
  syncStatus?: SyncStatus;
  defaultTypeMapping?: IndexTypeMapping;
  subTypeMappings?: IndexTypeMapping[];
  configuration?: IndexConfiguration;
  primaryFields?: PrimaryFields[];
  enabled: boolean;
  entityTypeId: string;
}

export interface DataSource {
  type: 'MONGO_COLLECTION' | 'FILE' | 'URL';
  properties: Record<string, any>;
  detailsUrlTemplate: string;
}

export interface SyncStrategy {
  type: 'PERIODIC' | 'EVENTS' | 'ON_DEMAND' | 'INCREMENTAL';
  properties: Record<string, any>;
  ilmStrategy?: ILMStrategy;
}

export interface ILMStrategy {
  policyName: string;
  enabled: boolean;
}

export interface SyncStatus {
  startedIndexingAt?: string;
  finishedIndexingAt?: string;
  lastBulkIndexedAt?: string;
  inProgressUploadVersion?: number;
  lastFinishedUploadVersion?: number;
  lastUpdateAt?: string;
  bulkNumberSuccess?: number;
  bulkNumberFail?: number;
  progress?: number;
  malformed?: Malformed;
  nextIndexingAt?: string;
  status: 'INDEXING' | 'UPDATED' | 'FAILED' | 'CANCELLED' | 'PAUSE';
}

export interface Malformed {
  malformedPct: number;
  malformedFields: string[];
  overThreshold: boolean;
}

export interface IndexTypeMapping {
  get_id: string;
  entityType: string;
  targetIndex: string;
  secondaryTargetIndex?: SecondaryTargetIndex;
  filterFields?: FilterField[];
  preprocessedFields?: PreprocessedFields[];
  fieldPermissions?: FieldPermissions[];
}

export interface SecondaryTargetIndex {
  name: string;
  fieldName: string;
  featureFlag?: string;
  primaryFields: string[];
  subFieldsToUpdate: SubFieldToUpdate[];
  fieldsToKeep: string[];
}

export interface SubFieldToUpdate {
  originalName: string;
  newName: string;
}

export interface IndexConfiguration {
  numberOfShards: number;
  numberOfReplicas: number;
  refreshInterval: string;
  fieldLimit: number;
  wildcardFields: string[];
}

export interface PrimaryFields {
  name: 'CONTAINER' | 'ENTITY_ID' | 'NAME' | 'UPDATE_DATE' | 'OWNER' | 'TAGS' | 'ATTRIBUTES' | 'FQN' | 'SOURCE' | 'SOURCE_TYPE' | 'CATEGORY' | 'DESCRIPTION';
  originalName: string;
  nameInElastic?: string;
  isSearchable: boolean;
}

export interface FilterField {
  fieldName: string;
  fieldType: 'NUMBER' | 'DATE' | 'STRING' | 'HASH_STRING' | 'BOOLEAN' | 'OBJECT' | 'USER' | 'ENTITY_TYPE' | 'TAGS';
  displayName?: string;
  specialValueFieldName?: string;
  filterFieldNameForQL?: string;
  totalValues?: number;
  fieldValues?: FilterFieldValue[];
  fieldSpecialValues?: FilterFieldValue[];
  multiple?: boolean;
}

export interface FilterFieldValue {
  displayValue: string;
  value: string;
  count: number;
}

export interface PreprocessedFields {
  targetPath?: string;
  fieldPaths: string[];
  preprocessor: 'OBJECT_NAME' | 'OBJECT_NAME_WILDCARD' | 'FIELD_FILTER' | 'CATALOG_ID_FIELD' | 'CATALOG_TAGS_FIELD' | 'ATTRIBUTES' | 'ATTRIBUTES_CATEGORIES' | 'OBJECTS_OWNERS' | 'DATA_SOURCE_OWNER' | 'DATE_TIME' | 'DATA_SOURCE' | 'DATA_SOURCE_APPLICATION' | 'DATA_SOURCE_TYPE' | 'DATA_SOURCE_LOCATION' | 'FIELD_CONCAT' | 'PERCENTILE' | 'EXISTENCE';
}

export interface FieldPermissions {
  fieldPaths: string[];
  permissions: string[];
}

// Inventory Types
export interface InventoryRequestAggDTO {
  originFilterExpression?: string;
  filterExpression?: InventoryFilterExpressionDTO;
  aggregations: InventoryRequestAggItemDTO[];
  searchText?: string;
}

export interface InventoryRequestAggItemDTO {
  aggName: string;
  paging: InventoryPageDTO;
  sorting: InventorySortItemDTO[];
  totalRequired: boolean;
  grid: boolean;
}

export interface InventoryPageDTO {
  limit: number;
  skip: number;
}

export interface InventorySortItemDTO {
  field: string;
  order: 'ASC' | 'DESC';
}

export interface InventoryFilterExpressionDTO {
  operator?: 'AND' | 'ELEMENTMATCH' | 'OR';
  leftOperand?: InventoryFilterExpressionDTO;
  rightOperand?: InventoryFilterExpressionDTO;
  unaliased?: InventoryFilterUnitDTO;
  expanded?: InventoryFilterUnitDTO;
  elementMatch?: InventoryFilterExpressionDTO;
  original?: InventoryFilterUnitDTO;
}

export interface InventoryFilterUnitDTO {
  name: string;
  value: string[];
  type: 'STRING' | 'NUMBER' | 'DATE' | 'BOOL' | 'OBJECT_ARRAY' | 'PII' | 'ATTRIBUTE_PATTERN_ARRAY';
  arrayFieldName?: string;
  operation: 'EXISTS' | 'IN' | 'GREATER_THAN' | 'GREATER_THAN_EQUALS' | 'LESS_THAN' | 'LESS_THAN_EQUALS' | 'EQUALS';
  negativeOperation?: boolean;
  tagsNegativeOperation?: boolean;
}

export interface InventoryResponseDTO {
  aggregations: InventoryResponseAggDTO[];
}

export interface InventoryResponseAggDTO {
  aggName: string;
  aggTotal: number;
  aggData: InventoryResponseAggItemDTO[];
}

export interface InventoryResponseAggItemDTO {
  docCount: number;
  findings: number;
  aggItemName: string;
  aggItemGroup: string;
  groupDocCount: number;
}

// Data Explorer Types
export interface DataExplorerRequestDTO {
  originFilterExpression?: string;
  searchText?: string;
  paging: InventoryPageDTO;
  sort: InventorySortItemDTO[];
  isHighlight: boolean;
  fieldsToProject: string[];
  offset?: Offset;
  needToHighlight: boolean;
}

export interface DataExplorerRequestWithOffsetDTO extends DataExplorerRequestDTO {
  limit: number;
}

export interface Offset {
  offsetKey: string[];
  jobId: string;
  keepAlive: string;
}

export interface DataExplorerObjectsResponse {
  results: DataExplorerObjectsResult[];
  offset?: Offset;
}

export interface DataExplorerObjectsResponseWithOffset {
  offset?: Offset;
  objectList: DataExplorerObjectsResponse;
}

export interface DataExplorerObjectsResult {
  entityType: string;
  highlightedValue: DataExplorerHighlights[];
  data: Record<string, any>;
}

export interface DataExplorerHighlights {
  fieldName: string;
  highlightedValue: string[];
  value: any;
}

export interface DataExplorerQuickRequestDTO {
  originFilterExpression?: string;
  searchText?: string;
  topHits: number;
  entityTypes: string[];
  fieldsToProject: string[];
}

export interface DataExplorerQuickSearchResponse {
  data: Record<string, DataExplorerQuickSearchDetails>;
}

export interface DataExplorerQuickSearchDetails {
  count: number;
  results: DataExplorerQuickSearchResult[];
}

export interface DataExplorerQuickSearchResult {
  id: string;
  name: string;
  highlightedFields: DataExplorerQuickSearchFields[];
  fields: Record<string, any>;
}

export interface DataExplorerQuickSearchFields {
  name: string;
  values: DataExplorerQuickSearchValue[];
}

export interface DataExplorerQuickSearchValue {
  value: any;
  highlights: DataExplorerQuickSearchHighlights[];
}

export interface DataExplorerQuickSearchHighlights {
  start: number;
  length: number;
}

export interface DataExplorerObjectsBaseRequestDTO {
  originFilterExpression?: string;
  searchText?: string;
}

export interface DataExplorerCountObjectsResponseDTO {
  count: number;
}

// Index Task Types
export interface IndexTaskBodyDTO {
  forceFullReindex: boolean;
  forceIndexingFromOnceUponATime: boolean;
}

// Update and Refresh Types
export interface UpdateAndRefreshRequestBodyDTO {
  fullyQualifiedName: string;
  option: 'refresh' | 'indexOnly';
}

export interface UpdateByFqnResponseDTO {
  success: boolean;
}

// Partial Index Types
export interface PartialIndexRequestBodyDTO {
  mongoFilterExpression?: string;
  filter: string;
}

// Filter Types
export interface FilteredSearchRequest {
  text?: string;
  filter: SearchFilter[];
  selectedField?: string;
  top?: number;
  selectedFieldValue?: string;
}

export interface TypeFilterResponse {
  filterFields: FilterField[];
}

export interface SuggestionResponse {
  suggestions: FilterFieldValue[];
  totalValues: number;
}

// Export Types
export interface InventoryExportRequestDTO {
  filter?: string;
  originFilterExpression?: string;
}

// Index Status Types
export interface IndexStatusResponse {
  lastIndexed?: string;
  nextIndexing?: string;
  statusPerType: EntityTypeIndexStatus[];
}

export interface EntityTypeIndexStatus {
  startedIndexingAt?: string;
  finishedIndexingAt?: string;
  lastBulkIndexedAt?: string;
  inProgressUploadVersion?: number;
  lastFinishedUploadVersion?: number;
  lastUpdateAt?: string;
  bulkNumberSuccess?: number;
  bulkNumberFail?: number;
  progress?: number;
  malformed?: Malformed;
  nextIndexingAt?: string;
  status: 'INDEXING' | 'UPDATED' | 'FAILED' | 'CANCELLED' | 'PAUSE';
  syncStrategy?: SyncStrategy;
  entityName: string;
} 