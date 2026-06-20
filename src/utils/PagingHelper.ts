/**
 * Utility class to handle paging parameters consistently across all tools
 * Ensures both skip and limit are present when paging is specified
 */
export class PagingHelper {
  /**
   * Normalize paging parameters to ensure both skip and limit are present
   * @param params - The parameters object that may contain paging information
   * @param defaultSkip - Default skip value (default: 0)
   * @param defaultLimit - Default limit value (default: 20)
   * @returns Normalized paging object or undefined if no paging specified
   */
  static normalizePaging(
    params: any, 
    defaultSkip: number = 0, 
    defaultLimit: number = 20
  ): { skip: number; limit: number } | undefined {
    // If user provides paging object, ensure both skip and limit are present
    if (params.paging) {
      return {
        skip: params.paging.skip ?? defaultSkip,
        limit: params.paging.limit ?? defaultLimit
      };
    }
    
    // If user provides skip or limit directly, create paging object
    if (params.skip !== undefined || params.limit !== undefined) {
      return {
        skip: params.skip ?? defaultSkip,
        limit: params.limit ?? defaultLimit
      };
    }
    
    // No paging specified, return undefined (let the API use its defaults)
    return undefined;
  }

  /**
   * Create paging object with defaults if not provided
   * @param params - The parameters object that may contain paging information
   * @param defaultSkip - Default skip value (default: 0)
   * @param defaultLimit - Default limit value (default: 20)
   * @returns Paging object with defaults applied
   */
  static createPaging(
    params: any, 
    defaultSkip: number = 0, 
    defaultLimit: number = 20
  ): { skip: number; limit: number } {
    const normalized = this.normalizePaging(params, defaultSkip, defaultLimit);
    return normalized || { skip: defaultSkip, limit: defaultLimit };
  }

  /**
   * Create paging object only when paging is specified, otherwise return undefined
   * This matches the original behavior where paging was only included when provided
   * @param params - The parameters object that may contain paging information
   * @param defaultSkip - Default skip value (default: 0)
   * @param defaultLimit - Default limit value (default: 20)
   * @returns Paging object or undefined if no paging specified
   */
  static createPagingOptional(
    params: any, 
    defaultSkip: number = 0, 
    defaultLimit: number = 20
  ): { skip: number; limit: number } | undefined {
    return this.normalizePaging(params, defaultSkip, defaultLimit);
  }
} 