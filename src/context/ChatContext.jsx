import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Exportamos el contexto para que el hook lo pueda consumir
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

  // Guardar activeChat en localStorage
  useEffect(() => {
    if (activeChat) {
      localStorage.setItem('elevin_active_chat', JSON.stringify(activeChat));
    } else {
      localStorage.removeItem('elevin_active_chat');
    }
  }, [activeChat]);

  // Actualizar ID de conversación (sincronización real-time)
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
      minimizeChat 
    }}>
      {children}
    </ChatContext.Provider>
  );
};