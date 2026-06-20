import { DSPMClient } from '../client/DSPMClient';
import { CacheManager } from '../cache/CacheManager';
import { ErrorHandler } from '../utils/ErrorHandler';

// Simple interfaces for tool arguments
interface GetSecurityCasesArgs {
  caseStatus?: 'open' | 'closed' | 'ignored';
  severity?: string; // Allow any case
  skip?: number;
  limit?: number;
  filter?: string;
}

interface GetSecurityTrendsArgs {
  // No arguments needed
}

export class DSPMTools {
  private dspmClient: DSPMClient;
  private cache: CacheManager;

  constructor(dspmClient: DSPMClient, cache: CacheManager) {
    this.dspmClient = dspmClient;
    this.cache = cache;
  }

  /**
   * Get security posture cases
   */
  async getSecurityCases(args: GetSecurityCasesArgs): Promise<any> {
    try {
      const cacheKey = `security_cases_${JSON.stringify(args)}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      let result;
      
      // Build filter conditions based on provided parameters
      const filterConditions = [];
      
      if (args.severity) {
        // Always send severity as uppercase to the API (API expects HIGH, MEDIUM, LOW, CRITICAL)
        const normalizedSeverity = args.severity.toUpperCase();
        filterConditions.push({ field: 'severity', value: normalizedSeverity, operator: 'equal' });
      }
      
      if (args.caseStatus) {
        filterConditions.push({ field: 'caseStatus', value: args.caseStatus, operator: 'equal' });
      }
      
      // Handle filter parameter - prioritize custom filter over built-in conditions
      let finalFilter = args.filter;
      if (!args.filter && filterConditions.length > 0) {
        // Only use built-in conditions if no custom filter is provided
        finalFilter = JSON.stringify(filterConditions);
      }
      
      result = await this.dspmClient.getSecurityCases({
        skip: args.skip || 0,
        limit: args.limit || 20,
        filter: finalFilter,
        requireTotalCount: true
      });

      await this.cache.set(cacheKey, result, 300); // Cache for 5 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_security_cases');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Get security trends for the last 30 days
   */
  async getSecurityTrends(args: GetSecurityTrendsArgs): Promise<any> {
    try {
      const cacheKey = 'security_trends';
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.dspmClient.getTrends();
      
      await this.cache.set(cacheKey, result, 1800); // Cache for 30 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_security_trends');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }

  /**
   * Get cases grouped by policy
   */
  async getCasesGroupByPolicy(args: {
    groupBy?: 'policy' | 'severity' | 'status' | 'dataSource';
    filter?: string;
    limit?: number;
    skip?: number;
    requireTotalCount?: boolean;
  }): Promise<any> {
    try {
      const cacheKey = `cases_group_by_policy_${JSON.stringify(args)}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.dspmClient.getCasesGroupByPolicy(args);
      await this.cache.set(cacheKey, result, 300); // Cache for 5 minutes
      return { success: true, data: result };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, 'get_cases_group_by_policy');
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }
} 