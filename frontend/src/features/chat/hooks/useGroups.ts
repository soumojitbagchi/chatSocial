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
  createGroup: (newGroup: Omit<GroupItem, 'id'> & { memberIds?: string[] }) => Promise<GroupItem>;
  addMember: (groupId: string, targetUserId: string) => Promise<void>;
  removeMember: (groupId: string, targetUserId: string) => Promise<void>;
  updateGroupInfo: (groupId: string, data: { name?: string; description?: string; avatar?: string }) => Promise<void>;
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
      if (backendRooms && Array.isArray(backendRooms)) {
        const groupRoomsOnly = backendRooms.filter((r: ApiRoom & { isDirect?: boolean }) => !r.isDirect && !r.roomname.startsWith('direct_'));
        const mappedGroups: GroupItem[] = groupRoomsOnly.map((r: ApiRoom & { admins?: string[]; members?: Array<{ name?: string; role?: string; avatar?: string } | string>; avatar?: string }) => {
          const adminIds = Array.isArray(r.admins) ? r.admins.map((a) => (typeof a === 'object' && a !== null && '_id' in a ? String((a as { _id: string })._id) : String(a))) : [];
          const isUserAdmin = Boolean(userId && (r.createdBy?.toString() === userId.toString() || adminIds.includes(userId.toString())));

          return {
            id: r._id,
            name: r.roomname,
            initials: r.roomname.slice(0, 2).toUpperCase(),
            avatar: r.avatar || '',
            avatarBg: '#6f7771',
            membersCount: Array.isArray(r.members) ? r.members.length : 1,
            description: r.description || 'Group channel',
            lastActive: new Date(r.updatedAt || r.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: 0,
            chatId: r._id,
            isAdmin: isUserAdmin,
            members: Array.isArray(r.members) && r.members.length > 0
              ? r.members.map((m) => {
                  if (typeof m === 'object' && m !== null) {
                    const mId = '_id' in m ? String((m as { _id: string })._id) : (('id' in m) ? String((m as { id: string }).id) : '');
                    const isMemAdmin = Boolean(mId && (mId === String(r.createdBy) || adminIds.includes(mId)));
                    return {
                      id: mId,
                      name: ('name' in m && typeof m.name === 'string') ? m.name : ('username' in m && typeof m.username === 'string' ? m.username : 'Member'),
                      username: ('username' in m && typeof m.username === 'string') ? m.username : '',
                      role: isMemAdmin ? 'Admin' : 'Member',
                      avatar: ('avatar' in m && typeof m.avatar === 'string') ? m.avatar : '',
                      about: ('about' in m && typeof m.about === 'string') ? m.about : '',
                      phone: ('phone' in m && typeof m.phone === 'string') ? m.phone : (('profile' in m && typeof m.profile === 'object' && m.profile !== null && 'phone' in m.profile) ? String(m.profile.phone) : ''),
                    };
                  }
                  const strId = String(m);
                  const isMemAdmin = Boolean(strId === String(r.createdBy) || adminIds.includes(strId));
                  return {
                    id: strId,
                    name: isMemAdmin ? 'Admin' : 'Member',
                    role: isMemAdmin ? 'Admin' : 'Member',
                    avatar: '',
                    about: '',
                  };
                })
              : [
                  {
                    id: String(userId),
                    name: isUserAdmin ? 'You' : 'Admin',
                    role: 'Admin',
                    avatar: '',
                    about: '',
                  },
                ],
          };
        });
        setGroups(mappedGroups);
        chatStorage.saveGroups(mappedGroups);
        setSelectedGroup((prev) => prev || mappedGroups[0] || null);
      }
    } catch {
      // Use local storage
    }
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    let isSubscribed = true;

    void (async () => {
      try {
        const backendRooms = await chatApi.getRooms();
        if (isSubscribed && Array.isArray(backendRooms)) {
          const groupRoomsOnly = backendRooms.filter((r: ApiRoom & { isDirect?: boolean }) => !r.isDirect && !r.roomname.startsWith('direct_'));
          const mappedGroups: GroupItem[] = groupRoomsOnly.map((r: ApiRoom & { admins?: string[]; members?: Array<{ name?: string; role?: string; avatar?: string } | string>; avatar?: string }) => {
            const adminIds = Array.isArray(r.admins) ? r.admins.map((a) => (typeof a === 'object' && a !== null && '_id' in a ? String((a as { _id: string })._id) : String(a))) : [];
            const isUserAdmin = Boolean(userId && (r.createdBy?.toString() === userId.toString() || adminIds.includes(userId.toString())));

            return {
              id: r._id,
              name: r.roomname,
              initials: r.roomname.slice(0, 2).toUpperCase(),
              avatar: r.avatar || '',
              avatarBg: '#6366f1',
              membersCount: Array.isArray(r.members) ? r.members.length : 1,
              description: r.description || 'Group channel',
              lastActive: new Date(r.updatedAt || r.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              unread: 0,
              chatId: r._id,
              isAdmin: isUserAdmin,
              members: Array.isArray(r.members) && r.members.length > 0
                ? r.members.map((m) => {
                    if (typeof m === 'object' && m !== null) {
                      const mId = '_id' in m ? String((m as { _id: string })._id) : (('id' in m) ? String((m as { id: string }).id) : '');
                      const isMemAdmin = Boolean(mId && (mId === String(r.createdBy) || adminIds.includes(mId)));
                      return {
                        id: mId,
                        name: ('name' in m && typeof m.name === 'string') ? m.name : ('username' in m && typeof m.username === 'string' ? m.username : 'Member'),
                        username: ('username' in m && typeof m.username === 'string') ? m.username : '',
                        role: isMemAdmin ? 'Admin' : 'Member',
                        avatar: ('avatar' in m && typeof m.avatar === 'string') ? m.avatar : '',
                        about: ('about' in m && typeof m.about === 'string') ? m.about : '',
                        phone: ('phone' in m && typeof m.phone === 'string') ? m.phone : (('profile' in m && typeof m.profile === 'object' && m.profile !== null && 'phone' in m.profile) ? String(m.profile.phone) : ''),
                      };
                    }
                    const strId = String(m);
                    const isMemAdmin = Boolean(strId === String(r.createdBy) || adminIds.includes(strId));
                    return {
                      id: strId,
                      name: isMemAdmin ? 'Admin' : 'Member',
                      role: isMemAdmin ? 'Admin' : 'Member',
                      avatar: '',
                      about: '',
                    };
                  })
                : [
                    {
                      id: String(userId),
                      name: isUserAdmin ? 'You' : 'Admin',
                      role: 'Admin',
                      avatar: '',
                      about: '',
                    },
                  ],
            };
          });
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

  const createGroup = useCallback(async (newGroup: Omit<GroupItem, 'id'> & { memberIds?: string[] }) => {
    const validId = generateValidObjectId();
    try {
      const created = await chatApi.createRoom({
        roomname: newGroup.name,
        description: newGroup.description,
        isPrivate: true,
        members: newGroup.memberIds || [],
      });
      const roomId = created?._id || validId;
      const fullGroup: GroupItem = {
        ...newGroup,
        id: roomId,
        chatId: roomId,
        isAdmin: true,
      };
      setGroups((prev) => {
        const updated = [fullGroup, ...prev.filter((g) => g.id !== roomId)];
        chatStorage.saveGroups(updated);
        return updated;
      });
      setSelectedGroup(fullGroup);
      socketService.joinRoom(roomId);
      socketService.emit('room:created', { roomId, roomname: newGroup.name, description: newGroup.description });
      await fetchBackendRooms();
      return fullGroup;
    } catch {
      socketService.createRoom(newGroup.name, newGroup.description || '');
      const fullGroup: GroupItem = {
        ...newGroup,
        id: validId,
        chatId: validId,
        isAdmin: true,
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

  const addMember = useCallback(async (groupId: string, targetUserId: string) => {
    try {
      await chatApi.addRoomMember(groupId, targetUserId);
      await fetchBackendRooms();
    } catch (err) {
      throw err;
    }
  }, [fetchBackendRooms]);

  const removeMember = useCallback(async (groupId: string, targetUserId: string) => {
    try {
      await chatApi.removeRoomMember(groupId, targetUserId);
      await fetchBackendRooms();
    } catch (err) {
      throw err;
    }
  }, [fetchBackendRooms]);

  const updateGroupInfo = useCallback(async (groupId: string, data: { name?: string; description?: string; avatar?: string }) => {
    try {
      await chatApi.updateRoom(groupId, {
        roomname: data.name,
        description: data.description,
        avatar: data.avatar,
      });
      await fetchBackendRooms();
    } catch (err) {
      throw err;
    }
  }, [fetchBackendRooms]);

  return {
    groups,
    selectedGroup,
    setSelectedGroup,
    createGroup,
    addMember,
    removeMember,
    updateGroupInfo,
    fetchBackendRooms,
  };
}

export default useGroups;
