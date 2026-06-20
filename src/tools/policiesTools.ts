import { PoliciesClient } from '../client/PoliciesClient';
import { CacheManager } from '../cache/CacheManager';
import { ErrorHandler } from '../utils/ErrorHandler';

// Simple interfaces for tool arguments
interface GetPoliciesArgs {
  // No arguments needed
}



export class PoliciesTools {
  private policiesClient: PoliciesClient;
  private cache: CacheManager;

  constructor(policiesClient: PoliciesClient, cache: CacheManager) {
    this.policiesClient = policiesClient;
    this.cache = cache;
  }

  /**
   * Get all compliance policies
   */
  async getPolicies(args: GetPoliciesArgs): Promise<any> {
    try {
      const cacheKey = 'policies';
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.policiesClient.getPolicies();
      
      await this.cache.set(cacheKey, result, 1800); // Cache for 30 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_policies');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }


} 