import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useNotifications = (userId?: string) => {
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotificationCount = async () => {
      if (!userId) {
        setNotificationCount(0);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: notificationError } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('is_read', false);

        if (notificationError) throw notificationError;

        setNotificationCount(data?.length || 0);
      } catch (err) {
        console.error('Error fetching notification count:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
        // Fallback to 0 if there's an error
        setNotificationCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchNotificationCount();

    // Set up real-time subscription for notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          // Refetch notification count when there's a change
          fetchNotificationCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { notificationCount, loading, error };
};