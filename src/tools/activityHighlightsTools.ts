import { ActivityHighlightsClient } from '../client/ActivityHighlightsClient';
import { CacheManager } from '../cache/CacheManager';
import { ErrorHandler } from '../utils/ErrorHandler';

export class ActivityHighlightsTools {
  private activityHighlightsClient: ActivityHighlightsClient;
  private cache: CacheManager;

  constructor(activityHighlightsClient: ActivityHighlightsClient, cache: CacheManager) {
    this.activityHighlightsClient = activityHighlightsClient;
    this.cache = cache;
  }


} 