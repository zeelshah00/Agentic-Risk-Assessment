export interface ActivityHighlightsSnapshot {
  _id: string;
  snapshot: {
    overview: {
      totalObjects?: number;
      totalUsers?: number;
      totalGroups?: number;
      totalPolicies?: number;
    };
    activities?: ActivityHighlight[];
    timestamp: string;
  };
}

export interface ActivityHighlight {
  _id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  severity?: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface ActivityHighlightsSnapshotsResponse {
  status: string;
  statusCode: number;
  data: ActivityHighlightsSnapshot[];
  message: string | null;
}

export interface ActivityHighlightsResponse {
  status: string;
  statusCode: number;
  data: ActivityHighlight[];
  message: string | null;
}

export interface ActivityHighlightsParams {
  skipThirdPartyCalculation?: boolean;
} 