import React from 'react';
import ConversationList from '../chat/ConversationList';
import ChatWindow from '../chat/ChatWindow';
import { useChat } from '../../hooks/useChat'; // RUTA ACTUALIZADA
import { MessageSquare } from 'lucide-react';

const ConversationsView = ({ currentUser }) => {
  const { activeChat, setActiveChat } = useChat();

  return (
    <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] max-w-7xl mx-auto p-0 md:p-4 animate-in fade-in">
        <div className="bg-white dark:bg-slate-800 md:rounded-2xl shadow-xl overflow-hidden flex h-full border-x border-gray-200 dark:border-slate-700 md:border">
            
            <div className={`w-full md:w-80 border-r dark:border-slate-700 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                <ConversationList 
                    currentUser={currentUser} 
                    onSelectChat={(c) => setActiveChat({ conversationId: c.id, otherUser: c.otherUser })} 
                    activeChatId={activeChat?.conversationId} 
                />
            </div>

            <div className={`flex-1 flex flex-col ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
                {activeChat ? (
                    <ChatWindow activeChat={activeChat} currentUser={currentUser} onClose={() => setActiveChat(null)} isWidget={false} />
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