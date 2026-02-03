import React, { useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ConversationList from '../chat/ConversationList';
import ChatWindow from '../chat/ChatWindow';
import { useChat } from '../../hooks/useChat';

/**
 * ConversationsView
 * - Layout tipo Facebook:
 *   - Columna izquierda: buscador + historial de conversaciones (ordenadas por actividad).
 *   - Panel derecho: chat activo.
 *
 * Reusa la lógica existente:
 *   - ChatWindow crea conversación al enviar el primer mensaje (si no existe).
 *   - Realtime/persistencia se mantienen via componentes actuales.
 */
const ConversationsView = ({ currentUser }) => {
  const { activeChat, setActiveChat } = useChat();

  const openChatFromConversation = useCallback(
    (conv) => {
      if (!conv) return;
      setActiveChat({
        conversationId: conv.id,
        otherUser: conv.otherUser,
        isNew: false,
      });
    },
    [setActiveChat]
  );

  const openChatWithUser = useCallback(
    async (otherUser) => {
      if (!currentUser || !otherUser) return;

      // Buscar si ya existe conversación (misma lógica que ChatContext, pero sin abrir widget)
      const { data: convs, error } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(user1_id.eq.${currentUser.id},user2_id.eq.${otherUser.id}),and(user1_id.eq.${otherUser.id},user2_id.eq.${currentUser.id})`
        )
        .limit(1);

      if (error) {
        console.error('Error buscando conversación existente:', error);
      }

      const conversationId = convs?.[0]?.id || null;

      setActiveChat({
        conversationId,
        otherUser,
        isNew: !conversationId,
      });
    },
    [currentUser, setActiveChat]
  );

  return (
    <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] max-w-7xl mx-auto p-0 md:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 md:rounded-2xl shadow-xl overflow-hidden flex h-full border-x border-gray-200 dark:border-slate-700 md:border">
        {/* Sidebar */}
        <div className={`w-full md:w-80 border-r dark:border-slate-700 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
          <ConversationList
            currentUser={currentUser}
            onSelectChat={openChatFromConversation}
            onStartChatWithUser={openChatWithUser}
            activeChatId={activeChat?.conversationId}
          />
        </div>

        {/* Main Chat Panel */}
        <div className={`flex-1 flex flex-col ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
          {activeChat ? (
            <ChatWindow
              activeChat={activeChat}
              currentUser={currentUser}
              onClose={() => setActiveChat(null)}
              isWidget={false}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-slate-900/50">
              <MessageSquare size={48} className="text-emerald-deep opacity-50 mb-4" />
              <p className="font-medium">Selecciona una conversación</p>
              <p className="text-sm">o busca un usuario para empezar a chatear</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationsView;
