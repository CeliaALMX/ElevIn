import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
// IMPORTAMOS EL HOOK DE NOTIFICACIONES
import { useNotifications } from './NotificationContext';

export const ChatContext = createContext();

export const ChatProvider = ({ children, currentUser }) => {
  // Inicializar estado desde localStorage si existe
  const [activeChat, setActiveChat] = useState(() => {
    try {
      const saved = localStorage.getItem('elevin_active_chat');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // EXTRAEMOS LA FUNCIÓN NOTIFY
  const { notify } = useNotifications();

  // Guardar activeChat en localStorage
  useEffect(() => {
    if (activeChat) {
      localStorage.setItem('elevin_active_chat', JSON.stringify(activeChat));
    } else {
      localStorage.removeItem('elevin_active_chat');
    }
  }, [activeChat]);

  const updateActiveConversationId = (newId) => {
    setActiveChat(prev => {
      if (!prev) return null;
      return { ...prev, conversationId: newId, isNew: false };
    });
  };

  const openChatWithUser = async (otherUser) => {
    if (!currentUser) return;

    // Buscar si ya existe conversación
    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${otherUser.id}),and(user1_id.eq.${otherUser.id},user2_id.eq.${currentUser.id})`);

    let conversationId = null;
    if (convs && convs.length > 0) {
      conversationId = convs[0].id;
    }

    setActiveChat({
      conversationId,
      otherUser,
      isNew: !conversationId
    });
    setIsWidgetOpen(true);
    setIsMinimized(false);
  };

  const closeChat = () => {
    setIsWidgetOpen(false);
    setActiveChat(null);
  };

  const minimizeChat = () => {
    setIsMinimized(!isMinimized);
  };

  // --- FUNCIÓN PARA ENVIAR NOTIFICACIÓN DE MENSAJE NUEVO ---
  // Esta función la consumirán tus componentes de chat (como ChatWidget)
  const sendChatNotification = async (recipientId) => {
    if (!notify) return;
    await notify({
      recipientId: recipientId,
      type: 'message',
      message: 'te envió un mensaje'
    });
  };

  return (
    <ChatContext.Provider value={{ 
      activeChat, 
      setActiveChat,
      updateActiveConversationId,
      isWidgetOpen, 
      setIsWidgetOpen,
      isMinimized, 
      openChatWithUser, 
      closeChat, 
      minimizeChat,
      sendChatNotification // Exportamos esta función para usarla en el envío
    }}>
      {children}
    </ChatContext.Provider>
  );
};