export interface SunoTrack {
  id: string; // Suno clip/song id
}

export interface SyncRequest {
  playlistId: string;
  tracks: SunoTrack[];
}

export interface SunoCreditResponse {
  credits_left?: number;
  period?: string;
  monthly_limit?: number;
  monthly_usage?: number;
  [key: string]: any;
}
