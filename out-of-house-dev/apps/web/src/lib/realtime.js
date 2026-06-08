import { useEffect, useRef } from 'react';
import { supabase } from './supabase';

/**
 * Subscribe to a Supabase Postgres-changes channel.
 *
 *   useRealtimeTable({
 *     channel: 'board',
 *     table:   'feature_requests',
 *     event:   '*',   // 'INSERT' | 'UPDATE' | 'DELETE' | '*'
 *     filter:  'project_id=eq.' + projectId,
 *     onChange: (payload) => { ... },
 *   });
 */
export const useRealtimeTable = ({ channel, table, event = '*', filter, schema = 'public', onChange }) => {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    if (!channel || !table) return undefined;
    const ch = supabase.channel(channel)
      .on('postgres_changes',
        { event, schema, table, ...(filter ? { filter } : {}) },
        (payload) => cbRef.current?.(payload))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channel, table, event, filter, schema]);
};

/**
 * Subscribe to changes on a list of tables under a shared channel name.
 */
export const useRealtimeMulti = ({ channel, subscriptions = [] }) => {
  const cbRef = useRef(subscriptions);
  cbRef.current = subscriptions;

  useEffect(() => {
    if (!channel) return undefined;
    let ch = supabase.channel(channel);
    cbRef.current.forEach(({ table, event = '*', filter, schema = 'public', onChange }) => {
      ch = ch.on('postgres_changes',
        { event, schema, table, ...(filter ? { filter } : {}) },
        (payload) => onChange?.(payload));
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);
};
