import { useState, useCallback } from 'react';
import { StatusItem } from '../UI/StatusSection';

export interface UseStatusReturn {
  statusUpdates: StatusItem[];
  activeStory: StatusItem | null;
  viewStory: (story: StatusItem) => void;
  closeStory: () => void;
  addStory: (caption?: string, storyImage?: string) => void;
}

export function useStatus(userAvatar?: string): UseStatusReturn {
  const [statusUpdates, setStatusUpdates] = useState<StatusItem[]>([]);
  const [activeStory, setActiveStory] = useState<StatusItem | null>(null);

  const viewStory = useCallback((story: StatusItem) => {
    setActiveStory(story);
  }, []);

  const closeStory = useCallback(() => {
    setActiveStory(null);
  }, []);

  const addStory = useCallback((caption?: string, storyImage?: string) => {
    const newStatus: StatusItem = {
      id: `st-${Date.now()}`,
      userName: 'You',
      time: 'Just now',
      avatar: userAvatar || '',
      isMe: true,
      hasStory: true,
      caption: caption || 'Live status update',
      storyImage: storyImage || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    };
    setStatusUpdates((prev) => [newStatus, ...prev.filter((s) => !s.isMe)]);
    setActiveStory(newStatus);
  }, [userAvatar]);

  return {
    statusUpdates,
    activeStory,
    viewStory,
    closeStory,
    addStory,
  };
}

export default useStatus;
