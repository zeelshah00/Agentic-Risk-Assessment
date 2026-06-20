import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BigIDAuth } from '../auth/BigIDAuth';
import { ErrorHandler } from '../utils/ErrorHandler';
import { 
  ApplicationLocationsResponse,
  IdentityLocationsResponse,
  SystemLocationsResponse
} from '../types/locationTypes';

export class LocationClient {
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
        return Promise.reject(ErrorHandler.handleApiError(error, 'LocationClient'));
      }
    );
  }

  /**
   * Get location data for specified location type
   */
  async getLocations(params: {
    locationType: 'application' | 'identity' | 'system';
  }): Promise<ApplicationLocationsResponse | IdentityLocationsResponse | SystemLocationsResponse> {
    try {
      // Map location types to their corresponding endpoints
      const endpointMap = {
        'application': '/applicationLocations',
        'identity': '/identityLocations',
        'system': '/systemLocations'
      };

      const endpoint = endpointMap[params.locationType];
      const response: AxiosResponse = await this.client.get(endpoint);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, `Failed to get ${params.locationType} locations`);
    }
  }
} 