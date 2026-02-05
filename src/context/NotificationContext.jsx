import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children, currentUser }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUser?.id) return;

    // 1. Cargar notificaciones iniciales
    fetchNotifications();

    // 2. Suscripción Realtime
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${currentUser.id}`,
        },
        async (payload) => {
          // Fetch para obtener datos del actor (avatar, nombre)
          const { data } = await supabase
            .from('notifications')
            .select('*, actor:actor_id(full_name, avatar_url, avatar_initials)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setNotifications((prev) => [data, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*, actor:actor_id(full_name, avatar_url, avatar_initials)')
      .eq('recipient_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    }
  };

  const markAsRead = async () => {
    if (unreadCount === 0) return;

    // Optimistic UI
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', currentUser.id)
      .eq('read', false);
  };

  // Función helper para generar notificaciones desde cualquier componente
  const notify = async ({ recipientId, type, entityId }) => {
    if (!currentUser || recipientId === currentUser.id) return; // No auto-notificarse

    try {
      await supabase.from('notifications').insert({
        recipient_id: recipientId,
        actor_id: currentUser.id,
        type,
        entity_id: entityId ? String(entityId) : null,
      });
    } catch (err) {
      console.error('Error enviando notificación:', err);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, notify }}>
      {children}
    </NotificationContext.Provider>
  );
};