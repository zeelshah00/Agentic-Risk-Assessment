import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BigIDAuth } from '../auth/BigIDAuth';
import { ErrorHandler } from '../utils/ErrorHandler';
import {
  PolicyDTO,
  CreatePolicyDTO,
  UpdatePolicyDTO,
  TestPolicyDTO,
  TestPolicyResponseDTO,
  PolicyCreateResponseDTO,
  PolicyUpdateResponseDTO,
  PoliciesApiResponse
} from '../types/policiesTypes';

export class PoliciesClient {
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
        return Promise.reject(ErrorHandler.handleApiError(error, 'PoliciesClient'));
      }
    );
  }

  /**
   * Get all compliance policies
   */
  async getPolicies(): Promise<PolicyDTO[]> {
    try {
      const response: AxiosResponse<PolicyDTO[]> = await this.client.get('/compliance-rules');
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get policies');
    }
  }


} 