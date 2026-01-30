import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Minus, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useChat } from '../../hooks/useChat';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';

const ChatWindow = ({ activeChat, currentUser, onClose, onMinimize, isWidget = false }) => {
  const { updateActiveConversationId } = useChat();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMutual, setIsMutual] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  const conversationId = activeChat?.conversationId;
  const otherUser = activeChat.otherUser;
  
  const messagesEndRef = useRef(null);

  // 1. Verificar seguimiento mutuo
  useEffect(() => {
    const checkMutualFollow = async () => {
      setCheckingAuth(true);
      if (!currentUser || !otherUser) return;

      const { data: myFollow } = await supabase.from('follows').select('*').match({ follower_id: currentUser.id, following_id: otherUser.id }).single();
      const { data: theirFollow } = await supabase.from('follows').select('*').match({ follower_id: otherUser.id, following_id: currentUser.id }).single();

      setIsMutual(!!(myFollow && theirFollow));
      setCheckingAuth(false);
    };
    checkMutualFollow();
  }, [currentUser, otherUser]);

  // 2. Carga inicial y Suscripción Realtime
  useEffect(() => {
    if (!conversationId) {
        setMessages([]); 
        return;
    }

    // Cargar historial
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      setMessages(data || []);
      scrollToBottom();
    };
    fetchMessages();

    // Suscripción a NUEVOS mensajes
    const channel = supabase.channel(`room:${conversationId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, 
        (payload) => {
          setMessages(prev => {
            const incoming = payload.new;
            
            // Lógica interna de Deduplicación:
            // Si ya existe el mensaje optimista, lo reemplazamos silenciosamente por el real.
            const existsOptimistic = prev.findIndex(m => m.isOptimistic && m.content === incoming.content && m.sender_id === incoming.sender_id);
            
            if (existsOptimistic !== -1) {
                const newArr = [...prev];
                newArr[existsOptimistic] = incoming; // Reemplazo silencioso
                return newArr;
            }

            // Si ya existe por ID real (duplicado de evento), lo ignoramos
            if (prev.some(m => m.id === incoming.id)) return prev;

            // Si es nuevo y no estaba en local, lo agregamos
            return [...prev, incoming];
          });
          scrollToBottom();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  const scrollToBottom = () => { 
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100); 
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !isMutual) return;

    const contentToSend = newMessage;
    setNewMessage(''); // Limpiar input inmediatamente

    // A. UI OPTIMISTA: Agregar mensaje visualmente de inmediato (ID temporal)
    // Se mantiene la lógica para la inmediatez, pero sin indicador visual
    const tempId = Date.now().toString(); 
    const optimisticMessage = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: currentUser.id,
        content: contentToSend,
        created_at: new Date().toISOString(),
        isOptimistic: true // Flag interno, no se muestra en UI
    };

    setMessages(prev => [...prev, optimisticMessage]);
    scrollToBottom();

    try {
      let currentConvId = conversationId;

      // B. Si es chat nuevo, crear conversación en DB
      if (!currentConvId) {
        const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert([{ user1_id: currentUser.id, user2_id: otherUser.id }])
            .select()
            .single();
        
        if (convError) throw convError;
        currentConvId = newConv.id;
        
        updateActiveConversationId(currentConvId);
      }

      // C. Insertar mensaje en DB
      const { error: msgError } = await supabase
        .from('messages')
        .insert([{ 
            conversation_id: currentConvId, 
            sender_id: currentUser.id, 
            content: contentToSend 
        }]);

      if (msgError) throw msgError;
      
      // D. Actualizar timestamp
      await supabase.from('conversations').update({ updated_at: new Date() }).eq('id', currentConvId);
      
    } catch (err) { 
        console.error("Error envío:", err);
        // Rollback silencioso si falla
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setNewMessage(contentToSend);
    }
  };

  const handleReject = async () => {
    if (conversationId) await supabase.from('conversations').delete().eq('id', conversationId);
    onClose();
  };

  return (
    <div className={`flex flex-col bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-xl overflow-hidden ${isWidget ? 'w-full h-full rounded-t-xl' : 'h-full w-full rounded-xl'}`}>
      <div className="bg-emerald-deep p-3 flex justify-between items-center text-white shrink-0">
        <div className="flex items-center gap-2">
          {!isWidget && <button onClick={onClose} className="md:hidden p-1 mr-1"><Minus className="rotate-90" size={18}/></button>}
          <Avatar src={otherUser.avatar_url} initials={otherUser.avatar_initials} size="sm" className="border border-white" />
          <div className="flex flex-col"><span className="font-bold text-sm">{otherUser.full_name || otherUser.name}</span></div>
        </div>
        <div className="flex gap-1">
          {isWidget && <button onClick={onMinimize} className="p-1 hover:bg-white/20 rounded"><Minus size={14}/></button>}
          <button onClick={onClose} className="p-1 hover:bg-red-500/80 rounded"><X size={14}/></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-slate-900 space-y-3 relative">
        {checkingAuth ? <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 z-10"><Loader2 className="animate-spin text-emerald-deep" /></div> : !isMutual && (
          <div className="absolute inset-0 z-20 bg-white/95 dark:bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center">
             <AlertTriangle size={32} className="text-orange-500 mb-2" />
             <h3 className="font-bold mb-2 text-gray-800 dark:text-white">¿Deseas continuar?</h3>
             <p className="text-sm text-gray-600 mb-4">No se siguen mutuamente.</p>
             <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1" onClick={handleReject}>No</Button>
                <Button variant="primary" className="flex-1" onClick={() => setIsMutual(true)}>Sí</Button>
             </div>
          </div>
        )}
        
        {messages.length === 0 && isMutual && <div className="text-center text-gray-400 text-xs mt-4">Inicia la conversación...</div>}

        {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'} animate-in fade-in zoom-in duration-200`}>
              <div className={`max-w-[80%] px-4 py-2 text-sm rounded-2xl ${
                  msg.sender_id === currentUser.id 
                  ? 'bg-emerald-deep text-white rounded-br-none' // Se eliminó condición de color "Enviando"
                  : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-white border dark:border-slate-600 rounded-bl-none shadow-sm'
              }`}>
                {msg.content}
                {/* Se eliminó el span de "Enviando..." */}
              </div>
            </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-2 bg-white dark:bg-slate-800 border-t flex gap-2 shrink-0">
        <input 
            type="text" 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            placeholder="Escribe un mensaje..." 
            disabled={!isMutual} 
            className="flex-1 bg-gray-100 dark:bg-slate-900 border-none rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-emerald-deep outline-none transition-all" 
        />
        <button type="submit" disabled={!newMessage.trim() || !isMutual} className="p-2 bg-gold-premium text-white rounded-full hover:scale-105 transition-transform"><Send size={18} /></button>
      </form>
    </div>
  );
};

export default ChatWindow;