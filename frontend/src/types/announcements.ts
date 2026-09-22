export type AnnouncementAssetType = 'image' | 'video' | 'document' | 'link';

export interface AnnouncementAsset {
  id: string;
  assetType: AnnouncementAssetType;
  url: string;
  fileName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
}

export interface AnnouncementFormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'select' | 'checkbox' | 'textarea';
  required?: boolean;
  options?: string[];
}

export interface AnnouncementForm {
  id: string;
  title: string;
  fields: AnnouncementFormField[];
}

export interface Announcement {
  id: string;
  title: string;
  body: string | null;
  bodyBlocks: Record<string, unknown>[];
  status: 'draft' | 'published' | 'archived';
  publishedAt: string | null;
  createdAt: string;
  author: { firstName: string; lastName: string };
  assets: AnnouncementAsset[];
  forms: AnnouncementForm[];
}

export interface AnnouncementFeed {
  items: Announcement[];
  nextCursor: string | null;
  hasMore: boolean;
}
