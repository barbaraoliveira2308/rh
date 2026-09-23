export type AnnouncementAssetType = 'image' | 'video' | 'document' | 'link';

export interface AnnouncementAsset {
  id: string;
  assetType: AnnouncementAssetType;
  url: string;
  fileName: string | null;
  contentType: string | null;
  sizeBytes: number | null;
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
}

export interface AnnouncementFeed {
  items: Announcement[];
  nextCursor: string | null;
  hasMore: boolean;
}
