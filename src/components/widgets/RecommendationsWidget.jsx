import React, { useEffect, useRef, useState } from 'react';
import { UserPlus, UserCheck, MessageCircle, Users, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Avatar from '../ui/Avatar';

const RecommendationsWidget = ({ user, limit = 3, compact = false, onMessage }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState({});
  const [error, setError] = useState(null);

  // Evita que una respuesta vieja (de una ejecución anterior) pise el estado actual.
  const fetchSeqRef = useRef(0);

  useEffect(() => {
    let active = true;
    const seq = ++fetchSeqRef.current;

    const fetchSuggestions = async () => {
      // Si aún no hay usuario, reseteamos estados de forma segura (sin dejar loadings colgados)
      if (!user?.id) {
        if (!active) return;
        setSuggestions([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1) Obtener a quién sigo yo (para excluirlos de sugerencias y calcular "en común")
        const { data: myFollows, error: followsError } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        if (followsError) throw followsError;

        const myFollowingIds = (myFollows || [])
          .map(f => f.following_id)
          .filter(Boolean);

        // Excluirse + excluir a los que ya sigues (únicos)
        const excludeIds = Array.from(new Set([user.id, ...myFollowingIds]));
        const excludeString = `(${excludeIds.join(',')})`;

        // 2) Obtener candidatos (Perfiles que NO están en la lista de excluidos)
        const { data: candidates, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, role, company, avatar_url, avatar_initials')
          .filter('id', 'not.in', excludeString)
          .limit(20);

        if (profilesError) throw profilesError;

        if (!active || seq !== fetchSeqRef.current) return;

        if (!candidates || candidates.length === 0) {
          setSuggestions([]);
          return;
        }

        // 3) Calcular "Conexiones en común"
        // Lógica: coincidencias en follows donde:
        // - follower_id es alguien que YO sigo (myFollowingIds)
        // - following_id es uno de los candidatos
        let mutualCounts = {};

        if (myFollowingIds.length > 0) {
          const candidateIds = candidates.map(c => c.id).filter(Boolean);

          const { data: mutuals, error: mutualsError } = await supabase
            .from('follows')
            .select('following_id')
            .in('follower_id', myFollowingIds)
            .in('following_id', candidateIds);

          if (mutualsError) {
            // No bloqueamos toda la UI por un error en esta parte; solo log.
            console.error('Error calculando conexiones en común:', mutualsError);
          } else if (mutuals) {
            mutuals.forEach(m => {
              mutualCounts[m.following_id] = (mutualCounts[m.following_id] || 0) + 1;
            });
          }
        }

        const finalSuggestions = candidates
          .map(c => ({
            ...c,
            mutual_connections: mutualCounts[c.id] || 0,
          }))
          .sort((a, b) => b.mutual_connections - a.mutual_connections)
          .slice(0, limit);

        if (active && seq === fetchSeqRef.current) {
          setSuggestions(finalSuggestions);
        }
      } catch (e) {
        console.error('Error en RecommendationsWidget:', e);
        if (active && seq === fetchSeqRef.current) {
          setError(e);
          setSuggestions([]);
        }
      } finally {
        if (active && seq === fetchSeqRef.current) {
          setLoading(false);
        }
      }
    };

    fetchSuggestions();

    return () => {
      active = false;
    };
  }, [user?.id, limit]);

  const handleFollow = async (targetId) => {
    if (!user?.id || !targetId) return;

    // Optimistic UI Update
    setFollowingMap(prev => ({ ...prev, [targetId]: true }));

    try {
      const { error: insertError } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: targetId });

      if (insertError) throw insertError;
    } catch (e) {
      console.error('Error al seguir:', e);
      // Revertir en caso de error
      setFollowingMap(prev => ({ ...prev, [targetId]: false }));
    }
  };

  // RENDERIZADO

  if (loading) {
    return (
      <div className="p-8 flex justify-center text-emerald-600">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  if (error) {
    return compact ? null : (
      <div className="p-8 text-center bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
        <p className="text-gray-500 text-sm">
          Ocurrió un error al cargar sugerencias. Intenta de nuevo más tarde.
        </p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return compact ? null : (
      <div className="p-8 text-center bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
        <p className="text-gray-500 text-sm">No hay nuevas sugerencias por el momento.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${compact ? '' : 'mt-2'}`}>
      {suggestions.map((u) => {
        const isFollowing = followingMap[u.id];
        return (
          <div
            key={u.id}
            className={`${compact ? 'border-b pb-3 last:border-0 last:pb-0 dark:border-slate-700' : 'bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700'} flex items-center gap-3 transition-all hover:shadow-md`}
          >
            <Avatar initials={u.avatar_initials} src={u.avatar_url} size={compact ? 'md' : 'lg'} />

            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 dark:text-white truncate text-sm">{u.full_name || 'Usuario'}</h4>
              <p className="text-xs text-gold-premium dark:gold-champagne font-medium truncate">{u.role || 'Sin rol'}</p>

              {!compact && (
                <div className="text-xs text-gray-500 truncate mt-0.5">{u.company}</div>
              )}

              {u.mutual_connections > 0 && (
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                  <Users size={12} />
                  <span>{u.mutual_connections} en común</span>
                </div>
              )}
            </div>

            <div className={`flex ${compact ? 'flex-col' : 'flex-row'} gap-2`}>
              <button
                onClick={() => handleFollow(u.id)}
                disabled={isFollowing}
                className={`p-2 rounded-full transition-colors flex items-center justify-center ${
                  isFollowing
                    ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300 cursor-default'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-slate-700 dark:text-blue-300'
                }`}
                title={isFollowing ? 'Siguiendo' : 'Seguir'}
              >
                {isFollowing ? <UserCheck size={18} /> : <UserPlus size={18} />}
              </button>

              {!compact && onMessage && (
                <button
                  onClick={() => onMessage(u)}
                  className="p-2 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 dark:bg-slate-700 dark:text-gray-300 transition-colors"
                  title="Enviar mensaje"
                >
                  <MessageCircle size={18} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RecommendationsWidget;
