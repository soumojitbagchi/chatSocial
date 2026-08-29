import { useState, useEffect, useCallback } from 'react';
import { GroupItem } from '../UI/GroupsSection';
import { chatApi, ApiRoom } from '../api/chatApi';
import { socketService } from '../api/socketService';
import { chatStorage, generateValidObjectId } from '../api/chatStorage';
import { useAuthContext } from '../../auth/hooks/useAuthContext';

export interface UseGroupsReturn {
  groups: GroupItem[];
  selectedGroup: GroupItem | null;
  setSelectedGroup: (group: GroupItem | null) => void;
  createGroup: (newGroup: Omit<GroupItem, 'id'>) => Promise<GroupItem>;
  fetchBackendRooms: () => Promise<void>;
}
export function useGroups(): UseGroupsReturn {
  const { user } = useAuthContext();
  const userId = user?.id || user?._id || '';
  const [groups, setGroups] = useState<GroupItem[]>(() => chatStorage.getGroups());
  const [selectedGroup, setSelectedGroup] = useState<GroupItem | null>(() => {
    const cached = chatStorage.getGroups();
    return cached.length > 0 ? cached[0] : null;
  });
  const fetchBackendRooms = useCallback(async () => {
    try {
      const backendRooms = await chatApi.getRooms();
      if (backendRooms && Array.isArray(backendRooms) && backendRooms.length > 0) {
        const mappedGroups: GroupItem[] = backendRooms.map((r: ApiRoom) => ({
          id: r._id,
          name: r.roomname,
          initials: r.roomname.slice(0, 2).toUpperCase(),
          avatarBg: '#6f7771',
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
    if (!userId) return;
    let isSubscribed = true;

    void (async () => {
      try {
        const backendRooms = await chatApi.getRooms();
        if (isSubscribed) {
          const mappedGroups: GroupItem[] = Array.isArray(backendRooms)
            ? backendRooms.map((r: ApiRoom) => ({
                id: r._id,
                name: r.roomname,
                initials: r.roomname.slice(0, 2).toUpperCase(),
                avatarBg: '#6366f1',
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
              }))
            : [];
          setGroups(mappedGroups);
          chatStorage.saveGroups(mappedGroups);
          setSelectedGroup((prev) => (mappedGroups.some((g) => g.id === prev?.id) ? prev : mappedGroups[0] || null));
        }
      } catch {
        // Empty fallback
      }
    })();

    const unbindCreated = socketService.on('room:created', (data: unknown) => {
      if (!isSubscribed) return;
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

    return () => {
      isSubscribed = false;
      unbindCreated();
    };
  }, [userId]);

  const createGroup = useCallback(async (newGroup: Omit<GroupItem, 'id'>) => {
    const validId = generateValidObjectId();
    try {
      const created = await chatApi.createRoom({ roomname: newGroup.name, description: newGroup.description });
      const roomId = created?._id || validId;
      const fullGroup: GroupItem = {
        ...newGroup,
        id: roomId,
        chatId: roomId
      };
      setGroups((prev) => {
        const updated = [fullGroup, ...prev.filter((g) => g.id !== roomId)];
        chatStorage.saveGroups(updated);
        return updated;
      });
      setSelectedGroup(fullGroup);
      socketService.joinRoom(roomId);
      await fetchBackendRooms();
      return fullGroup;
    } catch {
      // Fallback: If REST fails, attempt via socket/local
      socketService.createRoom(newGroup.name, newGroup.description || '');
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
