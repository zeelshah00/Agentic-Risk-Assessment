export interface ApplicationLocation {
  _id: string;
  name: string;
  applications_count: number;
  target_data_sources: string[];
  region?: string;
  country?: string;
  compliance_frameworks?: string[];
}

export interface ApplicationLocationsResponse {
  applications_locations: ApplicationLocation[];
}

export interface IdentityLocation {
  _id: string;
  name: string;
  identities_count: number;
  data_sources: string[];
  region?: string;
  country?: string;
  compliance_frameworks?: string[];
}

export interface IdentityLocationsResponse {
  identity_locations: IdentityLocation[];
}

export interface SystemLocation {
  _id: string;
  name: string;
  systems_count: number;
  data_sources: string[];
  region?: string;
  country?: string;
  compliance_frameworks?: string[];
}

export interface SystemLocationsResponse {
  system_locations: SystemLocation[];
} 