import React, { useState, useRef, useEffect } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, Mail, Circle } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import Avatar from './Avatar';

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const toggleMenu = () => {
    if (!isOpen) {
      markAsRead();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'like': return <Heart size={14} className="text-red-500 fill-red-100" />;
      case 'dislike': return <Heart size={14} className="text-gray-400 rotate-180" />;
      case 'comment': return <MessageCircle size={14} className="text-blue-500" />;
      case 'follow': return <UserPlus size={14} className="text-emerald-600" />;
      case 'message': return <Mail size={14} className="text-gold-premium" />;
      default: return <Bell size={14} />;
    }
  };

  const getText = (n) => {
    const name = n.actor?.full_name || 'Alguien';
    switch (n.type) {
      case 'like': return <span><b>{name}</b> indicó que le gusta tu publicación.</span>;
      case 'dislike': return <span><b>{name}</b> dio no me gusta a tu publicación.</span>;
      case 'comment': return <span><b>{name}</b> comentó en tu publicación.</span>;
      case 'follow': return <span><b>{name}</b> comenzó a seguirte.</span>;
      case 'message': return <span><b>{name}</b> te envió un mensaje.</span>;
      default: return <span>Notificación de <b>{name}</b>.</span>;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={toggleMenu} 
        className="p-2 text-gold-champagne hover:text-white hover:bg-white/10 rounded-full transition-colors relative"
        title="Notificaciones"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-800 shadow-2xl rounded-xl border border-gray-100 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-3 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex justify-between items-center">
            <h3 className="font-bold text-sm text-gray-800 dark:text-white">Notificaciones</h3>
            <span className="text-[10px] text-gray-500">{notifications.length} recientes</span>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm italic">
                No tienes notificaciones nuevas.
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`p-3 border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 flex gap-3 transition-colors ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                  <div className="relative shrink-0">
                    <Avatar src={n.actor?.avatar_url} initials={n.actor?.avatar_initials} size="sm" />
                    <div className="absolute -bottom-1 -right-1 p-0.5 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                        {getIcon(n.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 dark:text-gray-200 line-clamp-2">
                      {getText(n)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!n.read && <Circle size={8} className="fill-blue-500 text-blue-500 mt-2 shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;