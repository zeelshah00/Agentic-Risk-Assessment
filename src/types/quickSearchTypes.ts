/**
 * Type definitions for BigID Quick Search API
 * Based on quick-search-openapi-source.yaml
 */

/**
 * Request for quick search across multiple entity types
 */
export interface QuickSearchRequest {
  /** List of entity types to search for */
  entityTypes: string[];
  /** Number of top results to return for each entity type */
  topHits?: number;
  /** Text to search for (minimum 3 characters) */
  searchText: string;
  /** Fields to project in the response */
  fieldsToProject?: string[];
  /** BigID query language filter expression */
  filter?: string;
}

/**
 * Highlight position within a field value
 */
export interface HighlightPosition {
  /** Start position of the highlight */
  start: number;
  /** Length of the highlighted text */
  length: number;
}

/**
 * Highlighted value with position information
 */
export interface HighlightedValue {
  /** The actual value */
  value: string;
  /** Positions of highlights within the value */
  highlights: HighlightPosition[];
}

/**
 * Field with highlighting information
 */
export interface HighlightedField {
  /** Name of the highlighted field */
  name: string;
  /** Values of the highlighted field */
  values: HighlightedValue[];
}

/**
 * Catalog entity with search results
 */
export interface CatalogEntity {
  /** Unique identifier of the catalog entity */
  id: string;
  /** Name of the catalog entity */
  name: string;
  /** Highlighted fields of the catalog entity */
  highlightedFields?: HighlightedField[];
  /** Additional fields of the catalog entity */
  fields?: Record<string, any>;
}

/**
 * Search response for a specific entity type
 */
export interface EntitySearchResponse {
  /** Number of entities found */
  count: number;
  /** List of entities matching the search */
  results: CatalogEntity[];
}

/**
 * Complete quick search response
 */
export interface QuickSearchResponse {
  /** The search results grouped by entity type */
  data: {
    [entityType: string]: EntitySearchResponse;
  };
}

/**
 * Default values for quick search
 */
export const DEFAULT_QUICK_SEARCH_CONFIG = {
  entityTypes: ['catalog', 'datasource', 'policy'],
  topHits: 3,
  fieldsToProject: ['container', 'attributes', 'tags', 'name'],
  minSearchTextLength: 3,
} as const; 