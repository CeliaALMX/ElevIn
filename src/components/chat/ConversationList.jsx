import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Avatar from '../ui/Avatar';
import { Search } from 'lucide-react';

const ConversationList = ({ currentUser, onSelectChat, activeChatId }) => {
  const [conversations, setConversations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!currentUser) return;

    const fetchConversations = async () => {
      const { data } = await supabase
        .from('conversations')
        .select(`
          id, 
          updated_at,
          user1:user1_id(id, full_name, avatar_url),
          user2:user2_id(id, full_name, avatar_url)
        `)
        .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
        .order('updated_at', { ascending: false });

      if (data) {
        setConversations(data.map(c => ({
            ...c, 
            otherUser: c.user1.id === currentUser.id ? c.user2 : c.user1
        })));
      }
    };

    fetchConversations();
    
    // Suscripción Global a Conversaciones: Detecta nuevos chats y actualizaciones de hora/orden
    const channel = supabase
        .channel('global_conversations')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'conversations' }, 
            () => {
                // Al detectar cualquier cambio (INSERT o UPDATE de timestamp), recargamos
                fetchConversations();
            }
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentUser]);

  const filtered = conversations.filter(c => 
    c.otherUser?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-r dark:border-slate-700 w-full md:w-80">
      <div className="p-4 border-b dark:border-slate-700">
        <h2 className="text-xl font-bold text-emerald-deep dark:text-white mb-4">Chats</h2>
        <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input 
                type="text" 
                placeholder="Buscar..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-slate-700 rounded-lg text-sm border-none outline-none focus:ring-1 focus:ring-emerald-deep" 
            />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
             <p className="text-center text-gray-400 p-4 text-xs">No hay conversaciones recientes.</p>
        ) : (
            filtered.map(conv => (
                <div 
                    key={conv.id} 
                    onClick={() => onSelectChat(conv)} 
                    className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${activeChatId === conv.id ? 'bg-blue-50 dark:bg-slate-700 border-r-4 border-gold-premium' : ''}`}
                >
                    <Avatar src={conv.otherUser.avatar_url} initials={conv.otherUser.full_name?.substring(0,2)} />
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                            <h4 className="font-semibold text-gray-900 dark:text-white truncate text-sm">{conv.otherUser.full_name}</h4>
                            <span className="text-[10px] text-gray-400">
                                {new Date(conv.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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