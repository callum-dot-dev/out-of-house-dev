import { supabase } from './supabase';

export const fetchNotifications = async (userId, { limit = 20, unreadOnly = false } = {}) => {
  if (!userId) return [];
  let q = supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  if (unreadOnly) q = q.is('read_at', null);
  const { data, error } = await q;
  if (error) return [];
  return data ?? [];
};

export const countUnread = async (userId) => {
  if (!userId) return 0;
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  return count ?? 0;
};

export const markRead = async (id) => {
  return supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
};

export const markAllRead = async (userId) => {
  if (!userId) return;
  return supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null);
};

export const notify = async ({ userId, kind, title, body, link, payload = {} }) => {
  if (!userId) return null;
  const { data, error } = await supabase.from('notifications').insert([{
    user_id: userId, kind, title, body, link, payload,
  }]).select().maybeSingle();
  if (error) return null;
  return data;
};
