export interface AnnouncementSocialState {
  isRead: boolean;
  isPinned: boolean;
  hasReacted: boolean;
  isSaved: boolean;
  comments: string[];
}

export type AnnouncementSocialSnapshot = Record<string, AnnouncementSocialState>;

const STORAGE_KEY = 'srh-announcement-social-v1';

export function readAnnouncementSocialSnapshot(): AnnouncementSocialSnapshot {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnnouncementSocialSnapshot) : {};
  } catch {
    return {};
  }
}

export function persistAnnouncementSocialSnapshot(snapshot: AnnouncementSocialSnapshot): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage may be unavailable in private browsing; UI interactions still work for this session.
  }
}

export function emptyAnnouncementSocialState(): AnnouncementSocialState {
  return { isRead: false, isPinned: false, hasReacted: false, isSaved: false, comments: [] };
}
