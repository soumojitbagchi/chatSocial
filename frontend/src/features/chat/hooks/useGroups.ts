import { useState, useEffect, useCallback } from 'react';
import { GroupItem } from '../UI/GroupsSection';
import { chatApi, ApiRoom } from '../api/chatApi';
import { socketService } from '../api/socketService';
import { chatStorage, generateValidObjectId } from '../api/chatStorage';

export interface UseGroupsReturn {
  groups: GroupItem[];
  selectedGroup: GroupItem | null;
  setSelectedGroup: (group: GroupItem | null) => void;
  createGroup: (newGroup: Omit<GroupItem, 'id'>) => Promise<GroupItem>;
  fetchBackendRooms: () => Promise<void>;
}

export function useGroups(): UseGroupsReturn {
  const [groups, setGroups] = useState<GroupItem[]>(() => chatStorage.getGroups());
  const [selectedGroup, setSelectedGroup] = useState<GroupItem | null>(() => {
    const cached = chatStorage.getGroups();
    return cached.length > 0 ? cached[0] : null;
  });

  const fetchBackendRooms = useCallback(async () => {
    try {
      const backendRooms = await chatApi.getRooms();
      if (backendRooms && Array.isArray(backendRooms) && backendRooms.length > 0) {
        const mappedGroups: GroupItem[] = backendRooms.map((r: ApiRoom, index: number) => ({
          id: r._id,
          name: r.roomname,
          initials: r.roomname.slice(0, 2).toUpperCase(),
          avatarBg: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'][index % 5],
          membersCount: 1,
          description: r.description || 'Public collaboration room',
          lastActive: new Date(r.updatedAt || r.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: 0,
          chatId: r._id,
          isAdmin: false,
          members: [
            {
              name: 'Room Admin',
              role: 'Admin',
              avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
            }
          ]
        }));
        setGroups(mappedGroups);
        chatStorage.saveGroups(mappedGroups);
        setSelectedGroup((prev) => prev || mappedGroups[0] || null);
      }
    } catch {
      // Use local storage
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    chatApi.getRooms().then((backendRooms) => {
      if (!isSubscribed || !backendRooms || backendRooms.length === 0) return;
      const mappedGroups: GroupItem[] = backendRooms.map((r: ApiRoom, index: number) => ({
        id: r._id,
        name: r.roomname,
        initials: r.roomname.slice(0, 2).toUpperCase(),
        avatarBg: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'][index % 5],
        membersCount: 1,
        description: r.description || 'Public collaboration room',
        lastActive: new Date(r.updatedAt || r.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unread: 0,
        chatId: r._id,
        isAdmin: false,
        members: [
          {
            name: 'Room Admin',
            role: 'Admin',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
          }
        ]
      }));
      setGroups(mappedGroups);
      chatStorage.saveGroups(mappedGroups);
      setSelectedGroup((prev) => prev || mappedGroups[0] || null);
    }).catch(() => {});

    const unbindCreated = socketService.on('room:created', (data: unknown) => {
      if (data && typeof data === 'object' && 'roomId' in data && 'roomname' in data) {
        const roomId = String(data.roomId);
        const roomname = String(data.roomname);
        const description = 'description' in data && typeof data.description === 'string' ? data.description : '';

        const newRoomItem: GroupItem = {
          id: roomId,
          name: roomname,
          initials: roomname.slice(0, 2).toUpperCase(),
          avatarBg: '#8b5cf6',
          membersCount: 1,
          description: description || 'New real-time room',
          lastActive: 'Just now',
          unread: 0,
          chatId: roomId,
          isAdmin: true,
          members: [
            {
              name: 'You',
              role: 'Admin',
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
            }
          ]
        };

        setGroups((prev) => {
          if (prev.some((g) => g.id === roomId)) return prev;
          const updated = [newRoomItem, ...prev];
          chatStorage.saveGroups(updated);
          return updated;
        });
      }
    });

    const handleFocus = () => {
      fetchBackendRooms();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      isSubscribed = false;
      unbindCreated();
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchBackendRooms]);

  const createGroup = useCallback(async (newGroup: Omit<GroupItem, 'id'>) => {
    const validId = generateValidObjectId();
    try {
      const created = await chatApi.createRoom({ roomname: newGroup.name, description: newGroup.description });
      const fullGroup: GroupItem = {
        ...newGroup,
        id: created._id || validId,
        chatId: created._id || validId
      };
      setGroups((prev) => {
        const updated = [fullGroup, ...prev];
        chatStorage.saveGroups(updated);
        return updated;
      });
      setSelectedGroup(fullGroup);
      socketService.createRoom(newGroup.name, newGroup.description);
      await fetchBackendRooms();
      return fullGroup;
    } catch {
      const fullGroup: GroupItem = {
        ...newGroup,
        id: validId,
        chatId: validId
      };
      setGroups((prev) => {
        const updated = [fullGroup, ...prev];
        chatStorage.saveGroups(updated);
        return updated;
      });
      setSelectedGroup(fullGroup);
      socketService.createRoom(newGroup.name, newGroup.description);
      return fullGroup;
    }
  }, [fetchBackendRooms]);

  return {
    groups,
    selectedGroup,
    setSelectedGroup,
    createGroup,
    fetchBackendRooms,
  };
}

export default useGroups;
