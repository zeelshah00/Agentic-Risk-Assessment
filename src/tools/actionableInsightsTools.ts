import { ActionableInsightsClient } from '../client/ActionableInsightsClient';
import { CacheManager } from '../cache/CacheManager';
import { ErrorHandler } from '../utils/ErrorHandler';

export class ActionableInsightsTools {
  private actionableInsightsClient: ActionableInsightsClient;
  private cache: CacheManager;

  constructor(actionableInsightsClient: ActionableInsightsClient, cache: CacheManager) {
    this.actionableInsightsClient = actionableInsightsClient;
    this.cache = cache;
  }
} 