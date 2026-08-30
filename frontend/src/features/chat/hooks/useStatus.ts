import { useState, useEffect, useCallback, useMemo } from 'react';
import { chatApi, ApiStoryItem, ApiUserStatusGroup, StatusFeedResponse } from '../api/chatApi';

export interface UseStatusReturn {
  myStatus: ApiUserStatusGroup | null;
  recentUpdates: ApiUserStatusGroup[];
  viewedUpdates: ApiUserStatusGroup[];
  allDecks: ApiUserStatusGroup[];
  activeUserDeck: ApiUserStatusGroup | null;
  activeSlideIndex: number;
  activeStoryItem: ApiStoryItem | null;
  isLoading: boolean;
  isUploading: boolean;
  openStoryDeck: (group: ApiUserStatusGroup, initialIndex?: number) => void;
  closeStoryDeck: () => void;
  nextSlide: () => void;
  prevSlide: () => void;
  nextUserDeck: () => void;
  prevUserDeck: () => void;
  goToSlide: (index: number) => void;
  createStory: (data: { file?: File | Blob | null; caption?: string; mediaType?: string; backgroundColor?: string; fontStyle?: string }) => Promise<ApiStoryItem | null>;
  deleteStory: (statusId: string) => Promise<void>;
  replyToStory: (statusId: string, replyText: string) => Promise<{ roomId: string } | null>;
  fetchStatuses: () => Promise<void>;
}

export function useStatus(_userAvatar?: string): UseStatusReturn {
  const [feed, setFeed] = useState<StatusFeedResponse>({
    myStatus: null,
    recentUpdates: [],
    viewedUpdates: [],
    totalActive: 0,
  });

  const [activeUserDeck, setActiveUserDeck] = useState<ApiUserStatusGroup | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const allDecks = useMemo(() => {
    const list: ApiUserStatusGroup[] = [];
    if (feed.myStatus && feed.myStatus.stories.length > 0) {
      list.push(feed.myStatus);
    }
    list.push(...feed.recentUpdates);
    list.push(...feed.viewedUpdates);
    return list;
  }, [feed]);

  const activeStoryItem = useMemo(() => {
    if (!activeUserDeck || !activeUserDeck.stories || activeUserDeck.stories.length === 0) {
      return null;
    }
    const idx = Math.max(0, Math.min(activeSlideIndex, activeUserDeck.stories.length - 1));
    return activeUserDeck.stories[idx] || null;
  }, [activeUserDeck, activeSlideIndex]);

  const fetchStatuses = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await chatApi.getStatuses();
      setFeed(data);

      setActiveUserDeck((currentDeck) => {
        if (!currentDeck) return null;
        if (currentDeck.isMe && data.myStatus) {
          return data.myStatus;
        }
        const found = [...data.recentUpdates, ...data.viewedUpdates].find((u) => u.userId === currentDeck.userId);
        return found || currentDeck;
      });
    } catch (err) {
      console.warn('Failed to fetch status updates feed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    const initialTimer = setTimeout(() => {
      if (isSubscribed) {
        void fetchStatuses();
      }
    }, 0);

    const interval = setInterval(() => {
      if (isSubscribed && document.visibilityState === 'visible') {
        void fetchStatuses();
      }
    }, 20000);

    const handleVisibilityChange = () => {
      if (isSubscribed && document.visibilityState === 'visible') {
        void fetchStatuses();
      }
    };

    const handleOnline = () => {
      if (isSubscribed) {
        void fetchStatuses();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      isSubscribed = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchStatuses]);
  const openStoryDeck = useCallback((group: ApiUserStatusGroup, initialIndex: number = 0) => {
    if (!group || !group.stories || group.stories.length === 0) return;
    const safeIndex = Math.max(0, Math.min(initialIndex, group.stories.length - 1));
    setActiveUserDeck(group);
    setActiveSlideIndex(safeIndex);

    const currentSlide = group.stories[safeIndex];
    if (currentSlide && !group.isMe) {
      chatApi.viewStatus(currentSlide.id);
    }
  }, []);

  const closeStoryDeck = useCallback(() => {
    setActiveUserDeck(null);
    setActiveSlideIndex(0);
    void fetchStatuses();
  }, [fetchStatuses]);

  const goToSlide = useCallback((index: number) => {
    if (!activeUserDeck || !activeUserDeck.stories) return;
    if (index >= 0 && index < activeUserDeck.stories.length) {
      setActiveSlideIndex(index);
      const targetSlide = activeUserDeck.stories[index];
      if (targetSlide && !activeUserDeck.isMe) {
        chatApi.viewStatus(targetSlide.id);
      }
    }
  }, [activeUserDeck]);

  const nextUserDeck = useCallback(() => {
    if (!activeUserDeck) return;
    const currentDeckIdx = allDecks.findIndex((d) => d.userId === activeUserDeck.userId);
    if (currentDeckIdx > -1 && currentDeckIdx + 1 < allDecks.length) {
      const nextDeck = allDecks[currentDeckIdx + 1];
      openStoryDeck(nextDeck, 0);
    } else {
      closeStoryDeck();
    }
  }, [activeUserDeck, allDecks, openStoryDeck, closeStoryDeck]);

  const prevUserDeck = useCallback(() => {
    if (!activeUserDeck) return;
    const currentDeckIdx = allDecks.findIndex((d) => d.userId === activeUserDeck.userId);
    if (currentDeckIdx > 0) {
      const prevDeck = allDecks[currentDeckIdx - 1];
      const lastIndex = Math.max(0, prevDeck.stories.length - 1);
      openStoryDeck(prevDeck, lastIndex);
    }
  }, [activeUserDeck, allDecks, openStoryDeck]);

  const nextSlide = useCallback(() => {
    if (!activeUserDeck || !activeUserDeck.stories) return;
    if (activeSlideIndex + 1 < activeUserDeck.stories.length) {
      const nextIdx = activeSlideIndex + 1;
      setActiveSlideIndex(nextIdx);
      const slide = activeUserDeck.stories[nextIdx];
      if (slide && !activeUserDeck.isMe) {
        chatApi.viewStatus(slide.id);
      }
    } else {
      nextUserDeck();
    }
  }, [activeUserDeck, activeSlideIndex, nextUserDeck]);

  const prevSlide = useCallback(() => {
    if (!activeUserDeck || !activeUserDeck.stories) return;
    if (activeSlideIndex > 0) {
      setActiveSlideIndex((prev) => prev - 1);
    } else {
      prevUserDeck();
    }
  }, [activeUserDeck, activeSlideIndex, prevUserDeck]);

  const createStory = useCallback(async (data: {
    file?: File | Blob | null;
    caption?: string;
    mediaType?: string;
    backgroundColor?: string;
    fontStyle?: string;
  }): Promise<ApiStoryItem | null> => {
    setIsUploading(true);
    try {
      const newStory = await chatApi.createStatus(data);
      await fetchStatuses();
      return newStory;
    } catch (err) {
      console.error('Failed to create status update:', err);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, [fetchStatuses]);

  const deleteStory = useCallback(async (statusId: string) => {
    if (!statusId) return;
    try {
      await chatApi.deleteStatus(statusId);

      if (activeUserDeck && activeUserDeck.isMe) {
        const remainingStories = activeUserDeck.stories.filter((s) => s.id !== statusId);
        if (remainingStories.length === 0) {
          closeStoryDeck();
        } else {
          setActiveUserDeck({
            ...activeUserDeck,
            stories: remainingStories,
          });
          setActiveSlideIndex((prev) => Math.max(0, Math.min(prev, remainingStories.length - 1)));
        }
      }

      await fetchStatuses();
    } catch (err) {
      console.error('Failed to delete status:', err);
      throw err;
    }
  }, [activeUserDeck, closeStoryDeck, fetchStatuses]);

  const replyToStory = useCallback(async (statusId: string, replyText: string): Promise<{ roomId: string } | null> => {
    if (!statusId || !replyText.trim()) return null;
    try {
      const res = await chatApi.replyToStatus(statusId, replyText.trim());
      return { roomId: res.roomId };
    } catch (err) {
      console.error('Failed to reply to status story:', err);
      throw err;
    }
  }, []);

  return {
    myStatus: feed.myStatus,
    recentUpdates: feed.recentUpdates,
    viewedUpdates: feed.viewedUpdates,
    allDecks,
    activeUserDeck,
    activeSlideIndex,
    activeStoryItem,
    isLoading,
    isUploading,
    openStoryDeck,
    closeStoryDeck,
    nextSlide,
    prevSlide,
    nextUserDeck,
    prevUserDeck,
    goToSlide,
    createStory,
    deleteStory,
    replyToStory,
    fetchStatuses,
  };
}

export default useStatus;
