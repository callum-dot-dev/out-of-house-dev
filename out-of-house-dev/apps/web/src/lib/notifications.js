// Notifications, backed by the platform API.
import { api } from './api';

export const fetchNotifications = async (_userId, { limit = 20, unreadOnly = false } = {}) => {
  try {
    const { notifications } = await api.get('/notifications');
    let list = notifications ?? [];
    if (unreadOnly) list = list.filter((n) => !n.read_at);
    return list.slice(0, limit);
  } catch {
    return [];
  }
};

export const countUnread = async () => {
  try {
    const { notifications } = await api.get('/notifications');
    return (notifications ?? []).filter((n) => !n.read_at).length;
  } catch {
    return 0;
  }
};

export const markRead = (id) => api.post(`/notifications/${id}/read`, {});
export const markAllRead = () => api.post('/notifications/read-all', {});

// Notifications are created server-side now (notify() service); kept for callers.
export const notify = async () => null;
