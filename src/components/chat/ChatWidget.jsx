import React from 'react';
import { useChat } from '../../hooks/useChat'; // RUTA ACTUALIZADA
import ChatWindow from './ChatWindow';
import Avatar from '../ui/Avatar';

const ChatWidget = ({ currentUser }) => {
  const { isWidgetOpen, isMinimized, activeChat, closeChat, minimizeChat } = useChat();
  if (!isWidgetOpen || !activeChat) return null;

  if (isMinimized) {
    return (
      <div onClick={minimizeChat} className="fixed bottom-20 md:bottom-4 right-4 z-50 bg-white dark:bg-slate-800 shadow-xl rounded-full p-1 pr-4 flex items-center gap-3 cursor-pointer border-2 border-emerald-deep hover:scale-105 transition-transform">
        <div className="relative"><Avatar src={activeChat.otherUser.avatar_url} size="sm" /><span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span></div>
        <p className="text-xs font-bold text-gray-900 dark:text-white max-w-[150px] truncate">{activeChat.otherUser.full_name}</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-16 md:bottom-0 right-0 md:right-10 z-50 w-full md:w-96 h-[calc(100vh-140px)] md:h-[500px] shadow-2xl animate-in slide-in-from-bottom-10 px-2 md:px-0">
      <ChatWindow activeChat={activeChat} currentUser={currentUser} onClose={closeChat} onMinimize={minimizeChat} isWidget={true} />
    </div>
  );
};

export default ChatWidget;