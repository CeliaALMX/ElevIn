import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Minus, AlertTriangle, Loader2, Pencil, Trash2, Check, Ban } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useChat } from '../../hooks/useChat';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';

const EDIT_WINDOW_MINUTES = 30;

const ChatWindow = ({ activeChat, currentUser, onClose, onMinimize, isWidget = false }) => {
  const { updateActiveConversationId } = useChat();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMutual, setIsMutual] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const conversationId = activeChat?.conversationId;
  const otherUser = activeChat.otherUser;

  const messagesEndRef = useRef(null);

  // 1. Verificar seguimiento mutuo
  useEffect(() => {
    const checkMutualFollow = async () => {
      setCheckingAuth(true);
      if (!currentUser || !otherUser) return;

      const { data: myFollow } = await supabase
        .from('follows')
        .select('*')
        .match({ follower_id: currentUser.id, following_id: otherUser.id })
        .single();

      const { data: theirFollow } = await supabase
        .from('follows')
        .select('*')
        .match({ follower_id: otherUser.id, following_id: currentUser.id })
        .single();

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

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) console.error('Error fetchMessages:', error);

      setMessages(data || []);
      scrollToBottom();
    };
    fetchMessages();

    const channel = supabase
      .channel(`room:${conversationId}`)
      // INSERT
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => {
            const incoming = payload.new;

            const existsOptimistic = prev.findIndex(
              (m) => m.isOptimistic && m.content === incoming.content && m.sender_id === incoming.sender_id
            );

            if (existsOptimistic !== -1) {
              const newArr = [...prev];
              newArr[existsOptimistic] = incoming;
              return newArr;
            }

            if (prev.some((m) => m.id === incoming.id)) return prev;

            return [...prev, incoming];
          });
          scrollToBottom();
        }
      )
      // UPDATE (edición)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const updated = payload.new;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
      )
      // DELETE (eliminación)
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const deleted = payload.old;
          setMessages((prev) => prev.filter((m) => m.id !== deleted.id));
          setEditingId((curr) => (curr === deleted.id ? null : curr));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const canEditMessage = (msg) => {
    if (!msg) return false;
    if (msg.isOptimistic) return false;
    if (msg.sender_id !== currentUser?.id) return false;
    if (!msg.created_at) return false;

    const created = new Date(msg.created_at).getTime();
    const now = Date.now();
    const diffMin = (now - created) / (1000 * 60);
    return diffMin <= EDIT_WINDOW_MINUTES;
  };

  const canDeleteMessage = (msg) => {
    if (!msg) return false;
    if (msg.isOptimistic) return false;
    return msg.sender_id === currentUser?.id;
  };

  const startEdit = (msg) => {
    if (!canEditMessage(msg)) return;
    setEditingId(msg.id);
    setEditingValue(msg.content || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const saveEdit = async (msg) => {
    if (!msg || !editingValue.trim()) return;
    if (!canEditMessage(msg)) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ content: editingValue.trim() })
        .eq('id', msg.id)
        .eq('sender_id', currentUser.id);

      if (error) throw error;

      setEditingId(null);
      setEditingValue('');
    } catch (err) {
      console.error('Error edit message:', err);
    }
  };

  const deleteMessage = async (msg) => {
    if (!msg || !canDeleteMessage(msg)) return;

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', msg.id)
        .eq('sender_id', currentUser.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error delete message:', err);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !isMutual) return;

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
      let currentConvId = conversationId;

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

      const { error: msgError } = await supabase.from('messages').insert([
        {
          conversation_id: currentConvId,
          sender_id: currentUser.id,
          content: contentToSend,
        },
      ]);

      if (msgError) throw msgError;

      await supabase.from('conversations').update({ updated_at: new Date() }).eq('id', currentConvId);
    } catch (err) {
      console.error('Error envío:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(contentToSend);
    }
  };

  const handleReject = async () => {
    if (conversationId) await supabase.from('conversations').delete().eq('id', conversationId);
    onClose();
  };

  return (
    <div
      className={`flex flex-col bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-xl overflow-hidden ${
        isWidget ? 'w-full h-full rounded-t-xl' : 'h-full w-full rounded-xl'
      }`}
    >
      <div className="bg-emerald-deep p-3 flex justify-between items-center text-white shrink-0">
        <div className="flex items-center gap-2">
          {!isWidget && (
            <button onClick={onClose} className="md:hidden p-1 mr-1">
              <Minus className="rotate-90" size={18} />
            </button>
          )}
          <Avatar src={otherUser.avatar_url} initials={otherUser.avatar_initials} size="sm" className="border border-white" />
          <div className="flex flex-col">
            <span className="font-bold text-sm">{otherUser.full_name || otherUser.name}</span>
          </div>
        </div>
        <div className="flex gap-1">
          {isWidget && (
            <button onClick={onMinimize} className="p-1 hover:bg-white/20 rounded">
              <Minus size={14} />
            </button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-red-500/80 rounded">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-slate-900 space-y-3 relative">
        {checkingAuth ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 z-10">
            <Loader2 className="animate-spin text-emerald-deep" />
          </div>
        ) : (
          !isMutual && (
            <div className="absolute inset-0 z-20 bg-white/95 dark:bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center">
              <AlertTriangle size={32} className="text-orange-500 mb-2" />
              <h3 className="font-bold mb-2 text-gray-800 dark:text-white">¿Deseas continuar?</h3>
              <p className="text-sm text-gray-600 mb-4">No se siguen mutuamente.</p>
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1" onClick={handleReject}>
                  No
                </Button>
                <Button variant="primary" className="flex-1" onClick={() => setIsMutual(true)}>
                  Sí
                </Button>
              </div>
            </div>
          )
        )}

        {messages.length === 0 && isMutual && (
          <div className="text-center text-gray-400 text-xs mt-4">Inicia la conversación...</div>
        )}

        {messages.map((msg) => {
          const mine = msg.sender_id === currentUser.id;
          const isEditing = editingId === msg.id;

          return (
            <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-in fade-in zoom-in duration-200`}>
              <div className="max-w-[85%] group">
                <div
                  className={`px-4 py-2 text-sm rounded-2xl relative ${
                    mine
                      ? 'bg-emerald-deep text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-white border dark:border-slate-600 rounded-bl-none shadow-sm'
                  }`}
                >
                  {!isEditing ? (
                    <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        rows={3}
                        className={`w-full text-sm rounded-lg p-2 outline-none resize-none ${
                          mine ? 'bg-white/10 text-white placeholder-white/70' : 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white'
                        }`}
                        placeholder="Edita tu mensaje..."
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-black/10 hover:bg-black/20"
                          title="Cancelar"
                        >
                          <Ban size={14} />
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(msg)}
                          disabled={!editingValue.trim()}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-black/10 hover:bg-black/20 disabled:opacity-50"
                          title="Guardar"
                        >
                          <Check size={14} />
                          Guardar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Acciones (solo mensajes propios) */}
                  {mine && !isEditing && !msg.isOptimistic && (
                    <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      {canEditMessage(msg) && (
                        <button
                          type="button"
                          onClick={() => startEdit(msg)}
                          className="p-1 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow hover:scale-105 transition-transform"
                          title="Editar (30 min)"
                        >
                          <Pencil size={14} className="text-gray-700 dark:text-white" />
                        </button>
                      )}
                      {canDeleteMessage(msg) && (
                        <button
                          type="button"
                          onClick={() => deleteMessage(msg)}
                          className="p-1 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow hover:scale-105 transition-transform"
                          title="Eliminar"
                        >
                          <Trash2 size={14} className="text-red-600" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className={`mt-1 text-[10px] text-gray-400 ${mine ? 'text-right pr-1' : 'text-left pl-1'}`}>
                  {formatTime(msg.created_at)}
                </div>
              </div>
            </div>
          );
        })}

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
        <button
          type="submit"
          disabled={!newMessage.trim() || !isMutual}
          className="p-2 bg-gold-premium text-white rounded-full hover:scale-105 transition-transform"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
