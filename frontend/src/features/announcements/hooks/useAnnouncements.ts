import * as React from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAnnouncements } from '@/api/announcements.api';
import {
  emptyAnnouncementSocialState,
  persistAnnouncementSocialSnapshot,
  readAnnouncementSocialSnapshot,
  type AnnouncementSocialState,
  type AnnouncementSocialSnapshot,
} from '@/features/announcements/services/announcementSocialStore';

export function useAnnouncements() {
  const queryClient = useQueryClient();
  const [social, setSocial] = React.useState<AnnouncementSocialSnapshot>(() =>
    readAnnouncementSocialSnapshot(),
  );
  const query = useInfiniteQuery({
    queryKey: ['announcements', 'dashboard'],
    queryFn: ({ pageParam }) => fetchAnnouncements(pageParam, 8),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => (page.hasMore ? page.nextCursor : undefined),
  });

  const updateSocial = (
    announcementId: string,
    update: (current: AnnouncementSocialState) => AnnouncementSocialState,
  ): void => {
    setSocial((current) => {
      const next = {
        ...current,
        [announcementId]: update(current[announcementId] ?? emptyAnnouncementSocialState()),
      };
      persistAnnouncementSocialSnapshot(next);
      return next;
    });
  };

  const markAsRead = (announcementId: string): void => {
    updateSocial(announcementId, (current) => ({ ...current, isRead: true }));
  };
  const togglePinned = (announcementId: string): void => {
    updateSocial(announcementId, (current) => ({ ...current, isPinned: !current.isPinned }));
  };
  const toggleReaction = (announcementId: string): void => {
    updateSocial(announcementId, (current) => ({ ...current, hasReacted: !current.hasReacted }));
  };
  const toggleSaved = (announcementId: string): void => {
    updateSocial(announcementId, (current) => ({ ...current, isSaved: !current.isSaved }));
  };
  const addComment = (announcementId: string, comment: string): void => {
    const normalized = comment.trim();
    if (!normalized) return;
    updateSocial(announcementId, (current) => ({
      ...current,
      comments: [...current.comments, normalized],
    }));
  };
  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['announcements', 'dashboard'] });
  };

  return {
    announcements: query.data?.pages.flatMap((page) => page.items) ?? [],
    social,
    isLoading: query.isLoading,
    isLoadingMore: query.isFetchingNextPage,
    isError: query.isError,
    hasMore: query.hasNextPage,
    loadMore: async (): Promise<void> => {
      if (query.hasNextPage && !query.isFetchingNextPage) await query.fetchNextPage();
    },
    refresh,
    markAsRead,
    togglePinned,
    toggleReaction,
    toggleSaved,
    addComment,
  };
}
