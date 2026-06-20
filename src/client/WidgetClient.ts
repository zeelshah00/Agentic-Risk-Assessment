import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BigIDAuth } from '../auth/BigIDAuth';
import { ErrorHandler } from '../utils/ErrorHandler';
import { PagingHelper } from '../utils/PagingHelper';
import {
  WidgetRequestDTO,
  WidgetResponseDTO,
  ComplianceByFrameworkRequestDTO,
  ComplianceByControlRequestDTO,
  ComplianceByPolicyRequestDTO,
  ComplianceByDataSourceTypeRequestDTO
} from '../types/widgetTypes';

export class WidgetClient {
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
        return Promise.reject(ErrorHandler.handleApiError(error, 'WidgetClient'));
      }
    );
  }

  /**
   * Get widget data with custom parameters
   */
  async getWidget(request: WidgetRequestDTO): Promise<WidgetResponseDTO> {
    try {
      const response: AxiosResponse<WidgetResponseDTO> = await this.client.post('/executive-dashboard/widget', request);
      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, 'Failed to get widget data');
    }
  }

  /**
   * Get dashboard widget data with specified widget type and parameters
   */
  async getDashboardWidget(params: {
    widgetType: 'group_by_framework' | 'group_by_control' | 'group_by_policy' | 'group_by_data_source_type';
    paging?: {
      limit: number;
      skip: number;
    };
  }): Promise<WidgetResponseDTO> {
    try {
      // Map widget types to their corresponding subTypes
      const widgetTypeMap = {
        'group_by_framework': 'GROUP_BY_FRAMEWORK',
        'group_by_control': 'GROUP_BY_CONTROL',
        'group_by_policy': 'GROUP_BY_POLICY',
        'group_by_data_source_type': 'GROUP_BY_DATA_SOURCE_TYPE'
      };

      const paging = PagingHelper.createPagingOptional(params, 0, 5);
      const request: WidgetRequestDTO = {
        group: 'DSPM',
        type: 'COMPLIANCE',
        subType: widgetTypeMap[params.widgetType],
        additionalProperties: {
          widgets: [{
            widgetAggregationName: params.widgetType,
            ...(paging && { paging })
          }]
        }
      };
      return await this.getWidget(request);
    } catch (error) {
      throw ErrorHandler.handleApiError(error as Error, `Failed to get dashboard widget: ${params.widgetType}`);
    }
  }
} 