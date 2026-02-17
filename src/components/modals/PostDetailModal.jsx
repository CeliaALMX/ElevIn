import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, MessageSquare, Send, Loader2 } from 'lucide-react';
import Avatar from '../ui/Avatar';
import CommentItem from '../feed/CommentItem';

const PostDetailModal = ({ post, onClose, user, commentsData, commentActions, fetchComments }) => {
  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const scrollRef = useRef(null);

  // Normalizar media
  const mediaList = post?.media?.length > 0 
    ? post.media 
    : (post?.image_url ? [{ type: 'image', url: post.image_url }] : (post?.video_url ? [{ type: 'video', url: post.video_url }] : []));

  useEffect(() => {
    if (post && fetchComments) {
      fetchComments(post.id);
    }
  }, [post]);

  useEffect(() => {
    if (scrollRef.current) {
       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [commentsData]);

  if (!post) return null;

  const handleSend = async () => {
    if (!newComment.trim()) return;
    setIsSending(true);
    await commentActions.add(post.id, newComment);
    setNewComment('');
    setIsSending(false);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    if (mediaList.length > 0) {
      setCurrentMediaIndex((prev) => (prev + 1) % mediaList.length);
    }
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    if (mediaList.length > 0) {
      setCurrentMediaIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
    }
  };

  const currentMedia = mediaList[currentMediaIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-0 md:p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      
      {/* Botón de cerrar flotante mejor posicionado */}
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 md:top-4 md:right-4 p-2 bg-black/50 text-white rounded-full hover:bg-red-600 transition-colors z-[70] backdrop-blur-md"
      >
        <X size={24} />
      </button>

      <div 
        className="relative w-full max-w-7xl bg-white dark:bg-slate-900 md:rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[100dvh] md:h-[90vh] max-h-screen" 
        onClick={e => e.stopPropagation()}
      >
        
        {/* LADO IZQUIERDO: MEDIA (CARRUSEL) */}
        {/* En móvil ocupa 35-40% de la altura, en desktop ocupa el resto del ancho disponible */}
        <div className="relative bg-black h-[35vh] md:h-full md:flex-1 flex items-center justify-center overflow-hidden shrink-0 group">
           {currentMedia ? (
             currentMedia.type === 'video' ? (
               <video src={currentMedia.url} controls autoPlay className="w-full h-full object-contain" />
             ) : (
               <img src={currentMedia.url} alt="Post detail" className="w-full h-full object-contain" />
             )
           ) : (
             <div className="text-gray-500">Contenido no disponible</div>
           )}

           {mediaList.length > 1 && (
             <>
               <button onClick={handlePrev} className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-white/20 transition-colors z-10">
                 <ChevronLeft size={24} />
               </button>
               <button onClick={handleNext} className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-white/20 transition-colors z-10">
                 <ChevronRight size={24} />
               </button>
               <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-xs text-white backdrop-blur-sm">
                 {currentMediaIndex + 1} / {mediaList.length}
               </div>
             </>
           )}
        </div>

        {/* LADO DERECHO: INFO Y COMENTARIOS */}
        {/* En móvil ocupa el resto de la altura, en desktop tiene un ancho fijo de 400px (o 350px) */}
        <div className="flex flex-col h-full w-full md:w-[400px] border-l dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          
          {/* HEADER DEL POST (Autor y Contenido) */}
          <div className="p-4 border-b dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0 z-10">
             <div className="flex items-center gap-2">
                <Avatar initials={post.profiles?.avatar_initials} src={post.profiles?.avatar_url} size="sm"/>
                <div>
                   <h4 className="font-bold text-sm text-gray-900 dark:text-white">{post.profiles?.full_name}</h4>
                   <p className="text-xs text-gray-500">{post.profiles?.role}</p>
                </div>
             </div>
             {post.content && (
               <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 max-h-24 overflow-y-auto whitespace-pre-wrap scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                 {post.content}
               </div>
             )}
          </div>

          {/* LISTA DE COMENTARIOS (Área flexible) */}
          {/* min-h-0 es CRUCIAL para que el flex container anidado haga scroll correctamente */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-800/50 min-h-0" ref={scrollRef}>
             {commentsData[post.id]?.length > 0 ? (
                commentsData[post.id].map(comment => (
                  <CommentItem 
                    key={comment.id} 
                    comment={comment} 
                    user={user} 
                    onDelete={commentActions.delete} 
                    onEdit={commentActions.edit}
                    onVote={commentActions.vote}
                  />
                ))
             ) : (
               <div className="text-center text-gray-400 text-xs mt-10">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-50"/>
                  <p>Aún no hay comentarios.</p>
               </div>
             )}
          </div>

          {/* INPUT AREA (Siempre visible abajo) */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t dark:border-slate-700 shrink-0 z-20 pb-safe">
             <div className="flex gap-2 items-center">
                <Avatar initials={user.avatar} src={user.avatar_url} size="sm" className="hidden sm:block" />
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escribe un comentario..."
                    disabled={isSending}
                    className="w-full text-sm py-2.5 pl-3 pr-10 rounded-full bg-gray-100 dark:bg-slate-800 border-none focus:ring-1 focus:ring-blue-500 dark:text-white"
                    onKeyDown={(e) => e.key === 'Enter' && !isSending && handleSend()}
                  />
                  <button 
                    onClick={handleSend}
                    disabled={!newComment.trim() || isSending}
                    className="absolute right-1 top-1 p-1.5 text-blue-600 hover:bg-blue-100 rounded-full disabled:opacity-50 transition-colors"
                  >
                    {isSending ? <Loader2 size={18} className="animate-spin"/> : <Send size={18} />}
                  </button>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PostDetailModal;