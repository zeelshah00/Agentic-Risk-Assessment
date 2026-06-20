import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BigIDAuth } from '../auth/BigIDAuth';
import { ErrorHandler } from '../utils/ErrorHandler';
import {
  QuickSearchRequest,
  QuickSearchResponse,
  DEFAULT_QUICK_SEARCH_CONFIG,
} from '../types/quickSearchTypes';

/**
 * Client for BigID Quick Search API
 * Provides quick search functionality across multiple entity types
 */
export class QuickSearchClient {
  private client: AxiosInstance;
  private auth: BigIDAuth;
  private baseUrl: string;

  constructor(auth: BigIDAuth, domain: string) {
    this.auth = auth;
    this.baseUrl = `https://${domain}/api/v1`;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(async (config) => {
      const authHeader = await this.auth.getAuthHeader();
      if (authHeader) {
        config.headers.Authorization = authHeader;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        return Promise.reject(ErrorHandler.handleApiError(error, 'QuickSearchClient'));
      }
    );
  }

  /**
   * Perform a quick search across multiple entity types
   * @param params Search parameters including entity types, search text, and filters
   * @returns Search results grouped by entity type
   */
  async quickSearch(params: QuickSearchRequest): Promise<QuickSearchResponse> {
    try {
      // Validate search text length
      if (params.searchText.length < DEFAULT_QUICK_SEARCH_CONFIG.minSearchTextLength) {
        throw new Error(`Search text must be at least ${DEFAULT_QUICK_SEARCH_CONFIG.minSearchTextLength} characters long`);
      }

      // Set default values if not provided
      const requestParams: QuickSearchRequest = {
        entityTypes: params.entityTypes || [...DEFAULT_QUICK_SEARCH_CONFIG.entityTypes],
        topHits: params.topHits || DEFAULT_QUICK_SEARCH_CONFIG.topHits,
        searchText: params.searchText,
        fieldsToProject: params.fieldsToProject || [...DEFAULT_QUICK_SEARCH_CONFIG.fieldsToProject],
        filter: params.filter,
      };

      const response: AxiosResponse<QuickSearchResponse> = await this.client.post(
        '/data-explorer/objects/quick',
        requestParams
      );

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to perform quick search');
    }
  }

  /**
   * Perform a quick search with default entity types
   * @param searchText Text to search for
   * @param options Additional search options
   * @returns Search results grouped by entity type
   */
  async quickSearchSimple(
    searchText: string,
    options: {
      topHits?: number;
      fieldsToProject?: string[];
      filter?: string;
    } = {}
  ): Promise<QuickSearchResponse> {
    return this.quickSearch({
      searchText,
      entityTypes: [...DEFAULT_QUICK_SEARCH_CONFIG.entityTypes],
      topHits: options.topHits,
      fieldsToProject: options.fieldsToProject,
      filter: options.filter,
    });
  }

  /**
   * Search for specific entity types only
   * @param searchText Text to search for
   * @param entityTypes Specific entity types to search
   * @param options Additional search options
   * @returns Search results grouped by entity type
   */
  async quickSearchByEntityTypes(
    searchText: string,
    entityTypes: string[],
    options: {
      topHits?: number;
      fieldsToProject?: string[];
      filter?: string;
    } = {}
  ): Promise<QuickSearchResponse> {
    return this.quickSearch({
      searchText,
      entityTypes,
      topHits: options.topHits,
      fieldsToProject: options.fieldsToProject,
      filter: options.filter,
    });
  }
} 