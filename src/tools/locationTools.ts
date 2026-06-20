import { LocationClient } from '../client/LocationClient';
import { CacheManager } from '../cache/CacheManager';
import { ErrorHandler } from '../utils/ErrorHandler';

export class LocationTools {
  private locationClient: LocationClient;
  private cache: CacheManager;

  constructor(locationClient: LocationClient, cache: CacheManager) {
    this.locationClient = locationClient;
    this.cache = cache;
  }

  /**
   * Get location data for specified location type
   */
  async getLocations(args: {
    locationType: 'application' | 'identity' | 'system';
  }) {
    const cacheKey = `locations_${args.locationType}`;
    
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const result = await this.locationClient.getLocations({
        locationType: args.locationType
      });
      
      await this.cache.set(cacheKey, result, 600); // Cache for 10 minutes
      return { 
        success: true, 
        data: result,
        locationType: args.locationType
      };
    } catch (error) {
      const errorInfo = ErrorHandler.handleApiError(error as Error, `get_locations_${args.locationType}`);
      return { success: false, error: ErrorHandler.createUserFriendlyMessage(errorInfo) };
    }
  }
} 