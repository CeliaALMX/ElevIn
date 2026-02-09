import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase, validateSession } from '../lib/supabase';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children, currentUser }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef(null);
  const retryRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.id) return;

    // 1. Cargar notificaciones iniciales
    fetchNotifications();

    const clearRetry = () => {
      if (retryRef.current) {
        clearTimeout(retryRef.current);
        retryRef.current = null;
      }
    };

    const teardown = () => {
      clearRetry();
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (_) {
          // noop
        }
        channelRef.current = null;
      }
    };

    const subscribe = () => {
      teardown();

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
            try {
              // Verificar sesión antes de leer el detalle (evita 401 tras inactividad)
              await validateSession().catch(() => {});

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
            } catch (e) {
              console.warn('Notif realtime payload error:', e);
            }
          }
        )
        .subscribe((status) => {
          // Si el socket se cae (muy común tras inactividad), re-suscribimos.
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            clearRetry();
            retryRef.current = setTimeout(() => {
              // Re-cargar para no perder eventos
              fetchNotifications();
              subscribe();
            }, 1000);
          }
        });

      channelRef.current = channel;
    };

    // 2. Suscripción Realtime (con auto-reconnect)
    subscribe();

    return () => {
      teardown();
    };
  }, [currentUser?.id]);

  const fetchNotifications = async () => {
    try {
      await validateSession().catch(() => {});
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
    } catch (e) {
      console.warn('fetchNotifications error:', e);
    }
  };

  const markAsRead = async () => {
    if (unreadCount === 0) return;

    // Optimistic UI
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await validateSession().catch(() => {});
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_id', currentUser.id)
        .eq('read', false);
    } catch (e) {
      console.warn('markAsRead error:', e);
    }
  };

  // Función helper para generar notificaciones desde cualquier componente
  const notify = async ({ recipientId, type, entityId }) => {
    if (!currentUser || recipientId === currentUser.id) return; // No auto-notificarse

    try {
      await validateSession().catch(() => {});
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
