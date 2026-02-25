import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Minus, Loader2 } from 'lucide-react';
import { supabase, validateSession } from '../../lib/supabase';
import { useChat } from '../../hooks/useChat';
import { useNotifications } from '../../context/NotificationContext';
import Avatar from '../ui/Avatar';

const ChatWindow = ({ activeChat, currentUser, onClose, onMinimize, isWidget = false }) => {
  const { updateActiveConversationId } = useChat();
  const { notify } = useNotifications(); 
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMutual, setIsMutual] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(false);

  const conversationId = activeChat?.conversationId;
  const otherUser = activeChat.otherUser;
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
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

    const channel = supabase.channel(`room:${conversationId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `conversation_id=eq.${conversationId}` 
      }, (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          scrollToBottom();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;

    const contentToSend = newMessage;
    setNewMessage('');

    const tempId = Date.now().toString();
    const optimisticMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: currentUser.id,
      content: contentToSend,
      created_at: new Date().toISOString(),
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom();

    try {
      // MODIFICACIÓN: No bloqueamos el envío si la sesión tarda en validar
      await validateSession().catch(err => console.warn("Validación de sesión lenta:", err));

      let currentConvId = conversationId;

      if (!currentConvId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert([{ user1_id: currentUser.id, user2_id: otherUser.id }])
          .select().single();
        
        if (convError) throw convError;
        currentConvId = newConv.id;
        updateActiveConversationId(currentConvId);
      }

      const { data: insertedRows, error: msgError } = await supabase
        .from('messages')
        .insert([{ 
          conversation_id: currentConvId, 
          sender_id: currentUser.id, 
          content: contentToSend 
        }])
        .select('*');

      if (msgError) throw msgError;
      const inserted = insertedRows?.[0];

      if (inserted) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? inserted : m)));

        // NOTIFICACIÓN: Disparar y no bloquear si falla
        notify({ 
          recipientId: otherUser.id, 
          type: 'message', 
          content: 'te envió un mensaje privado',
          entityId: String(currentConvId)
        }).catch(nErr => console.error("Error al activar campana:", nErr));
        
        console.log("✅ Mensaje procesado");
      }

      await supabase.from('conversations').update({ updated_at: new Date() }).eq('id', currentConvId);
      
    } catch (err) {
      console.error('Error detallado de envío:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(contentToSend);
    }
  };

  const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="flex flex-col bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-xl overflow-hidden h-full rounded-xl">
      <div className="bg-emerald-deep p-3 flex justify-between items-center text-white shrink-0">
        <div className="flex items-center gap-2">
          <Avatar src={otherUser.avatar_url} initials={otherUser.avatar_initials} size="sm" className="border border-white" />
          <span className="font-bold text-sm">{otherUser.full_name || otherUser.name}</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-red-500/80 rounded"><X size={14} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-slate-900 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-2 text-sm rounded-2xl ${
              msg.sender_id === currentUser.id 
              ? 'bg-emerald-deep text-white rounded-br-none' 
              : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-white border shadow-sm rounded-bl-none'
            }`}>
              {msg.content}
              <div className="mt-1 text-[9px] opacity-70 text-right">{formatTime(msg.created_at)}</div>
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
          className="flex-1 bg-gray-100 dark:bg-slate-900 border-none rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-emerald-deep outline-none dark:text-white" 
        />
        <button 
          type="submit" 
          disabled={!newMessage.trim()} 
          className="p-2 bg-gold-premium text-white rounded-full hover:scale-105 transition-transform"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;