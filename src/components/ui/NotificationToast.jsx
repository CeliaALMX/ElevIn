import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, MessageSquare, Briefcase, Bell, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import Avatar from './Avatar';

const NotificationToast = ({ onNavigate }) => {
  const { notifications, markAsRead } = useNotifications();
  const [toast, setToast] = useState(null);
  const [lastNotifId, setLastNotifId] = useState(null);
  const timerRef = useRef(null);

  // Observamos si llega una notificación nueva a la lista
  useEffect(() => {
    if (notifications.length > 0) {
      const newest = notifications[0]; // Agarramos la más reciente
      
      // Si la más reciente es diferente a la última que vimos, ¡es nueva!
      if (lastNotifId !== null && newest.id !== lastNotifId && !newest.read && !newest.is_read) {
        
        setToast(newest); // Mostramos la ventana
        
        // Iniciamos el reloj de 10 segundos para ocultarla
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setToast(null);
        }, 10000);
      }
      
      // Actualizamos nuestra memoria
      setLastNotifId(newest.id);
    }
  }, [notifications, lastNotifId]);

  // Limpieza al desmontar para no dejar relojes corriendo
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Si no hay notificación flotante que mostrar, no dibujamos absolutamente nada
  if (!toast) return null;

  // Elegir ícono
  const getIcon = (type) => {
    switch (type) {
      case 'like': return <Heart size={14} className="text-red-500 fill-red-500" />;
      case 'comment': return <MessageCircle size={14} className="text-blue-500 fill-blue-100 dark:fill-blue-900" />;
      case 'postulación': return <Briefcase size={14} className="text-gold-premium" />;
      case 'message': return <MessageSquare size={14} className="text-emerald-500" />;
      default: return <Bell size={14} className="text-gray-500" />;
    }
  };

  return (
    <div 
      onClick={() => {
        markAsRead(toast.id); // Marcamos como leída
        if (onNavigate) onNavigate(toast); // Le decimos al policía de tránsito a dónde ir
        setToast(null); // Lo cerramos al hacer clic
      }}
      className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[100] w-80 bg-white dark:bg-slate-800 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-slate-700 p-4 animate-in slide-in-from-bottom-8 fade-in duration-300 cursor-pointer hover:scale-[1.02] transition-transform"
    >
      <div className="flex gap-3 items-start">
        <div className="relative shrink-0 mt-1">
          <Avatar initials={toast.actor?.avatar_initials || '?'} src={toast.actor?.avatar_url} size="md" />
          <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm border border-gray-100 dark:border-slate-700">
            {getIcon(toast.type)}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-blue-500 mb-0.5 uppercase tracking-wider">Nueva Notificación</h4>
          <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
            <span className="font-bold">{toast.actor?.full_name || 'Alguien'}</span>{' '}
            <span className="text-gray-600 dark:text-gray-400">{toast.content || 'interactuó contigo.'}</span>
          </p>
        </div>

        {/* Botón X para cerrarlo manualmente si no quieres esperar los 10 segundos */}
        <button 
          onClick={(e) => {
            e.stopPropagation(); 
            setToast(null);
          }} 
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 p-1.5 rounded-full transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;