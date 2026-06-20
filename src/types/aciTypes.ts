import { StructuredFilter } from './filterTypes';

export interface ACIDataManagerItem {
  _id: string;
  dataSource: string;
  name: string;
  path: string;
  type: string;
  size?: number;
  lastModified?: string;
  permissions?: ACIPermission[];
}

export interface ACIPermission {
  _id: string;
  name: string;
  type: string;
  principal: string;
  access: string[];
  inherited?: boolean;
}

export interface ACIDataManagerResponse {
  status: string;
  statusCode: number;
  data: ACIDataManagerItem[];
  message: string | null;
}

export interface ACIGroup {
  _id: string;
  dataSource: string;
  name: string;
  description?: string;
  membersCount?: number;
  type?: string;
  created?: string;
  lastModified?: string;
}

export interface ACIGroupsResponse {
  status: string;
  statusCode: number;
  data: {
    groups: ACIGroup[];
    totalCount?: number;
  };
  message: string | null;
}

export interface ACIUser {
  _id: string;
  dataSource: string;
  name: string;
  email?: string;
  displayName?: string;
  sharedObjectsCount?: number;
  lastLogin?: string;
  status?: string;
  groups?: string[];
}

export interface ACIUsersResponse {
  status: string;
  statusCode: number;
  data: {
    users: ACIUser[];
    totalCount?: number;
  };
  message: string | null;
}

export interface ACIDataManagerParams {
  requireTotalCount?: boolean;
  limit?: number;
  sort?: string;
  grouping?: string;
  app_id?: string;
  skip?: number;
  filter?: StructuredFilter;
}

export interface ACIGroupsParams {
  skip?: number;
  limit?: number;
  requireTotalCount?: boolean;
  sort?: string;
}

export interface ACIUsersParams {
  skip?: number;
  limit?: number;
  requireTotalCount?: boolean;
  sort?: string;
} 