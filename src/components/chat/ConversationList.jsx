import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Avatar from '../ui/Avatar';
import { Search, X } from 'lucide-react';

/**
 * ConversationList
 * - Barra superior: búsqueda de personas (aunque no se sigan) para iniciar chat.
 * - Debajo: historial de conversaciones existentes, ordenado por actividad reciente.
 *
 * IMPORTANTE:
 * - No usamos joins user1:user1_id(...) porque dependen de FKs/relaciones en Supabase.
 * - Traemos conversaciones (user1_id/user2_id) y luego perfiles por separado.
 */
const ConversationList = ({ currentUser, onSelectChat, onStartChatWithUser, activeChatId }) => {
  const [conversations, setConversations] = useState([]);

  // Search people (profiles)
  const [peopleQuery, setPeopleQuery] = useState('');
  const [peopleResults, setPeopleResults] = useState([]);
  const [isSearchingPeople, setIsSearchingPeople] = useState(false);
  const [peopleError, setPeopleError] = useState(null);

  const debounceRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.id) return;

    const fetchConversations = async () => {
      try {
        // 1) Traer conversaciones sin joins (robusto)
        const { data: convs, error: convErr } = await supabase
          .from('conversations')
          .select('id, updated_at, user1_id, user2_id')
          .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
          .order('updated_at', { ascending: false });

        if (convErr) throw convErr;

        const convList = convs || [];
        if (convList.length === 0) {
          setConversations([]);
          return;
        }

        // 2) Obtener IDs de los "otros usuarios"
        const otherIds = Array.from(
          new Set(
            convList
              .map((c) => (c.user1_id === currentUser.id ? c.user2_id : c.user1_id))
              .filter(Boolean)
          )
        );

        // 3) Traer perfiles de esos IDs
        let profilesById = {};
        if (otherIds.length > 0) {
          const { data: profiles, error: profErr } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', otherIds);

          if (profErr) throw profErr;

          profilesById = (profiles || []).reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }

        // 4) Armar lista final
        const mapped = convList.map((c) => {
          const otherUserId = c.user1_id === currentUser.id ? c.user2_id : c.user1_id;
          return {
            id: c.id,
            updated_at: c.updated_at,
            user1_id: c.user1_id,
            user2_id: c.user2_id,
            otherUser: profilesById[otherUserId] || { id: otherUserId, full_name: 'Usuario', avatar_url: null },
          };
        });

        setConversations(mapped);
      } catch (err) {
        console.error('Error fetching conversations (robusto):', err);
        setConversations([]);
      }
    };

    fetchConversations();

    // Realtime: si se crea/actualiza una conversación, refrescar (reordenar tipo Facebook)
    const channel = supabase
      .channel('global_conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  // Debounce search people
  useEffect(() => {
    setPeopleError(null);

    if (!peopleQuery.trim()) {
      setPeopleResults([]);
      setIsSearchingPeople(false);
      return;
    }

    if (!currentUser?.id) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsSearchingPeople(true);
      try {
        const q = peopleQuery.trim();

        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .ilike('full_name', `%${q}%`)
          .neq('id', currentUser.id)
          .limit(10);

        if (error) throw error;
        setPeopleResults(data || []);
      } catch (err) {
        console.error('People search error:', err);
        setPeopleError('No se pudo buscar usuarios. Intenta de nuevo.');
        setPeopleResults([]);
      } finally {
        setIsSearchingPeople(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [peopleQuery, currentUser?.id]);

  const hasPeopleDropdown = peopleQuery.trim().length > 0;

  const handlePickPerson = (person) => {
    if (!person || !onStartChatWithUser) return;
    onStartChatWithUser(person);
    setPeopleQuery('');
    setPeopleResults([]);
  };

  const handleClearSearch = () => {
    setPeopleQuery('');
    setPeopleResults([]);
    setPeopleError(null);
  };

  const renderTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

    return sameDay
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { day: '2-digit', month: 'short' });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-r dark:border-slate-700 w-full md:w-80">
      <div className="p-4 border-b dark:border-slate-700">
        <h2 className="text-xl font-bold text-emerald-deep dark:text-white mb-3">Chats</h2>

        {/* Buscador tipo Facebook: busca personas para iniciar conversación */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar personas para iniciar un chat..."
            value={peopleQuery}
            onChange={(e) => setPeopleQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-gray-100 dark:bg-slate-700 rounded-lg text-sm border-none outline-none focus:ring-1 focus:ring-emerald-deep"
          />
          {peopleQuery.trim() && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2 top-2 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Limpiar búsqueda"
            >
              <X size={14} className="text-gray-500" />
            </button>
          )}

          {/* Dropdown resultados */}
          {hasPeopleDropdown && (
            <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
              <div className="px-3 py-2 text-xs text-gray-500 dark:text-slate-300 border-b dark:border-slate-700">
                {isSearchingPeople ? 'Buscando...' : 'Personas'}
              </div>

              {peopleError && <div className="p-3 text-xs text-red-500">{peopleError}</div>}

              {!isSearchingPeople && !peopleError && peopleResults.length === 0 && (
                <div className="p-3 text-xs text-gray-400">Sin resultados.</div>
              )}

              {!peopleError &&
                peopleResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handlePickPerson(u)}
                    className="w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Avatar src={u.avatar_url} initials={u.full_name?.substring(0, 2)} />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {u.full_name}
                      </div>
                      <div className="text-[11px] text-gray-400">Iniciar conversación</div>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Historial de conversaciones */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="text-center text-gray-400 p-4 text-xs">No hay conversaciones recientes.</p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelectChat(conv)}
              className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                activeChatId === conv.id ? 'bg-blue-50 dark:bg-slate-700 border-r-4 border-gold-premium' : ''
              }`}
            >
              <Avatar
                src={conv.otherUser?.avatar_url}
                initials={conv.otherUser?.full_name?.substring(0, 2)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline gap-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                    {conv.otherUser?.full_name || 'Usuario'}
                  </h4>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    {renderTime(conv.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
