import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BigIDAuth } from '../auth/BigIDAuth';
import { ErrorHandler } from '../utils/ErrorHandler';
import { 
  ActivityHighlightsSnapshotsResponse,
  ActivityHighlightsResponse,
  ActivityHighlightsParams
} from '../types/activityHighlightsTypes';

export class ActivityHighlightsClient {
  private client: AxiosInstance;
  private auth: BigIDAuth;
  private baseUrl: string;

  constructor(auth: BigIDAuth, domain: string) {
    this.auth = auth;
    this.baseUrl = `https://${domain}/api/v1/activity-highlights`;
    
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
        return Promise.reject(ErrorHandler.handleApiError(error, 'ActivityHighlightsClient'));
      }
    );
  }

  /**
   * Get activity highlights snapshots
   */
  async getSnapshots(): Promise<ActivityHighlightsSnapshotsResponse> {
    try {
      const response: AxiosResponse<ActivityHighlightsSnapshotsResponse> = await this.client.get('/activity-highlights-snapshots');
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get activity highlights snapshots');
    }
  }

  /**
   * Get current activity highlights
   */
  async getCurrentHighlights(params: ActivityHighlightsParams = {}): Promise<ActivityHighlightsResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.skipThirdPartyCalculation !== undefined) {
        queryParams.append('skipThirdPartyCalculation', params.skipThirdPartyCalculation.toString());
      }

      const response: AxiosResponse<ActivityHighlightsResponse> = await this.client.get(`?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get current activity highlights');
    }
  }
} 