import React, { useMemo } from 'react';
import RecommendationsWidget from '../widgets/RecommendationsWidget';
import { Users, Loader2 } from 'lucide-react';

const NetworkingView = ({ user, onNavigate }) => {
  const currentUser = useMemo(() => {
    if (user?.id) return user;
    try {
      const saved = localStorage.getItem('elevin_profile');
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed?.id ? parsed : null;
    } catch (_) {
      return null;
    }
  }, [user]);

  const handleMessage = (targetUser) => {
    if (onNavigate) {
      // En App.jsx, la vista de chat es 'chat'
      onNavigate('chat');
      console.log('Navegar al chat con:', targetUser);
    }
  };

  // Si el usuario no ha cargado, mostramos loader centrado y salimos.
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64 w-full">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 max-w-2xl mx-auto space-y-6 px-4">
      {/* Header Visual */}
      <div className="bg-gradient-to-r from-emerald-dark to-emerald-medium p-6 rounded-xl text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="text-gold-champagne" />
            Tu Red Profesional
          </h2>
          <p className="text-sm text-blue-100 opacity-90 mt-1">
            Amplía tus oportunidades conectando con colegas del sector de elevadores.
          </p>
        </div>
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Users size={120} />
        </div>
      </div>

      {/* Lista de Sugerencias */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 pl-3 border-l-4 border-emerald-500">
          Sugerencias para ti
        </h3>

        <RecommendationsWidget
          user={currentUser}
          limit={20}
          compact={false}
          onMessage={handleMessage}
        />
      </div>
    </div>
  );
};

export default NetworkingView;
