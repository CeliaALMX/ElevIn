import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { supabase, validateSession } from '../lib/supabase';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

// Ya no dependemos de que App.js nos pase el currentUser
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null); // NUEVO: Se administra a sí mismo
  const channelRef = useRef(null);
  const retryRef = useRef(null);

  // 1. Efecto maestro: Obtener y vigilar la sesión del usuario al instante
  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);
    };
    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => authListener?.subscription.unsubscribe();
  }, []);

  // 2. Efecto de la Antena: Solo arranca cuando sabe quién es el usuario
  useEffect(() => {
    if (!currentUser?.id) return;

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
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };

    const subscribe = () => {
      teardown();

      // Nombre de canal único
      const uniqueChannelName = `realtime-notif-${currentUser.id}-${Math.random().toString(36).substring(7)}`;
      
      const channel = supabase
        .channel(uniqueChannelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${currentUser.id}`, 
          },
          async (payload) => {
            console.log("%c🔔 NUEVA NOTIFICACIÓN EN TIEMPO REAL:", "color: yellow; background: black; font-size: 16px;", payload);

            if (payload.new.actor_id === currentUser.id) return;

            fetchNotifications();

            // Sonido
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
            audio.play().catch(() => {});
          }
        )
        .subscribe((status) => {
          console.log(`📡 Estado de la Antena del Contexto: %c${status}`, status === 'SUBSCRIBED' ? 'color: green; font-weight: bold;' : 'color: red;');
          
          if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
            clearRetry();
            retryRef.current = setTimeout(() => subscribe(), 3000);
          }
        });

      channelRef.current = channel;
    };

    subscribe();

    return () => teardown();
  }, [currentUser?.id]);

  const fetchNotifications = async () => {
    try {
      await validateSession().catch(() => {});
      const { data, error } = await supabase
        .from('notifications')
        .select('*, actor:actor_id(full_name, avatar_url, avatar_initials)')
        .eq('recipient_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data) {
        setNotifications(data);
        const unread = data.filter((n) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (e) {
      console.warn('fetchNotifications error:', e);
    }
  };

  const markAsRead = async (notificationId = null) => {
    try {
      await validateSession().catch(() => {});
      if (notificationId) {
        setNotifications((prev) => prev.map((n) => n.id === notificationId ? { ...n, read: true } : n));
        setUnreadCount((prev) => Math.max(0, prev - 1));
        await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
        await supabase.from('notifications').update({ read: true }).eq('recipient_id', currentUser?.id).eq('read', false);
      }
    } catch (e) {
      console.warn('markAsRead error:', e);
    }
  };

  // 3. El Cartero Mejorado: Acepta 'content' y verifica bien los datos
  const notify = async ({ recipientId, type, entityId, message = '', content = '' }) => {
    const activeUserId = currentUser?.id;

    if (!activeUserId || !recipientId || recipientId === activeUserId) {
      console.warn("🚫 Notificación cancelada: Faltan IDs o el usuario se envía a sí mismo.", {activeUserId, recipientId});
      return;
    }

    // Acepta cualquiera de las dos palabras que envíe el chat
    const finalContent = content || message;

    try {
      await validateSession().catch(() => {});
      const { error } = await supabase
        .from('notifications')
        .insert([{
          recipient_id: recipientId,
          actor_id: activeUserId,
          type: type,
          entity_id: entityId ? String(entityId) : null,
          content: finalContent,
          read: false
        }]);

      if (error) {
        console.error('❌ Error Supabase al enviar notificación:', error.message);
      } else {
        // ESTE ES EL MENSAJE CLAVE
        console.log(`✅ ¡Notificación GUARDADA en la base de datos para: ${recipientId}!`);
      }
    } catch (err) {
      console.error('❌ Error crítico en función notify:', err);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, notify }}>
      {children}
    </NotificationContext.Provider>
  );
};