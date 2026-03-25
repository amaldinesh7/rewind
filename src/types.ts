export interface Item {
  id: string;
  created_at: string;
  updated_at: string;
  source_type: "url" | "text" | "image" | "voice";
  source_platform: string;
  raw_url: string | null;
  raw_text: string | null;
  raw_image_path: string | null;
  raw_voice_path: string | null;
  note: string | null;
  status: "inbox" | "processing" | "processed" | "acted" | "archived" | "deleted";
  title: string | null;
  summary: string | null;
  thumbnail_url: string | null;
  content_type: string | null;
  ai_tags: string[] | null;
  ai_category: string | null;
  estimated_mins: number | null;
}

export interface CaptureRequestURL {
  type: "url";
  url: string;
  source_platform?: string;
  note?: string;
}

export interface CaptureRequestText {
  type: "text";
  content: string;
  source_platform?: string;
  note?: string;
}

export interface CaptureRequestImage {
  type: "image";
  image_base64: string;
  source_platform?: string;
}

export interface CaptureRequestVoice {
  type: "voice";
  audio_base64: string;
  source_platform?: string;
}

export type CaptureRequest =
  | CaptureRequestURL
  | CaptureRequestText
  | CaptureRequestImage
  | CaptureRequestVoice;

export interface CaptureResponse {
  id: string;
  status: string;
  created_at: string;
  message: string;
}

export interface ItemsListResponse {
  items: Item[];
  total: number;
  limit: number;
  offset: number;
}

export interface ItemUpdateRequest {
  status?: string;
  note?: string;
  title?: string;
}
