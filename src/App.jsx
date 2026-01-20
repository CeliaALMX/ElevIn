import React, { useState, useEffect, useRef } from 'react';
import {
  Briefcase, Home, User, LogOut, Bell, ArrowUp, Users, LifeBuoy,
  MapPin, ThumbsUp, ThumbsDown, MessageSquare, Share2, Settings,
  Moon, Sun, Loader2, Image, Video, X, Send, MoreHorizontal,
  Edit2, Trash2, ChevronLeft, ChevronRight, Layers
} from 'lucide-react';
import { supabase } from './lib/supabase';

// --- IMPORTACIONES UI ---
import LoginScreen from './components/LoginScreen';
import Avatar from './components/ui/Avatar';
import Button from './components/ui/Button';
import Card from './components/ui/Card';

// --- IMPORTACIONES DE COMENTARIOS ---
import CommentItem from './components/feed/CommentItem';
import { useComments } from './hooks/useComments';

// --- DATOS MOCK ---
import { JOBS_DATA } from './data/mockData';

// --- IMPORTACIONES DE VISTAS ---
import JobsView from './components/views/JobsView';
import SupportView from './components/views/SupportView';
import NetworkingView from './components/views/NetworkingView';
import ProfileView from './components/views/ProfileView';

// --- HELPER: SUBIR ARCHIVOS ---
const uploadFileToSupabase = async (file, userId) => {
  if (!file) return null;
  try {
    const fileExt = file.name.split('.').pop();
    // Generamos un nombre único para evitar colisiones
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    
    // Subir
    const { error } = await supabase.storage.from('posts-files').upload(fileName, file);
    if (error) throw error;
    
    // Obtener URL pública
    const { data } = supabase.storage.from('posts-files').getPublicUrl(fileName);
    return data.publicUrl;
  } catch (error) {
    console.error("Error subiendo archivo:", error);
    return null;
  }
};

// --- COMPONENTE POST DETAIL MODAL (LIGHTBOX + COMENTARIOS) ---
const PostDetailModal = ({ post, onClose, user, commentsData, commentActions, fetchComments }) => {
  const [newComment, setNewComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const scrollRef = useRef(null);

  // Normalizar media: Usar la nueva columna 'media' o las legacy 'image_url'/'video_url'
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
      
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-gray-800/50 text-white rounded-full hover:bg-red-600 transition-colors z-[60]"
      >
        <X size={24} />
      </button>

      <div 
        className="relative w-full max-w-6xl h-full md:h-[85vh] bg-white dark:bg-slate-900 rounded-none md:rounded-xl overflow-hidden flex flex-col md:grid md:grid-cols-[1fr_350px] shadow-2xl" 
        onClick={e => e.stopPropagation()}
      >
        
        {/* LADO IZQUIERDO: MEDIA (CARRUSEL) */}
        <div className="flex items-center justify-center bg-black h-[40vh] md:h-full relative group">
           {currentMedia ? (
             currentMedia.type === 'video' ? (
               <video src={currentMedia.url} controls autoPlay className="max-h-full max-w-full outline-none" />
             ) : (
               <img src={currentMedia.url} alt="Post detail" className="max-h-full max-w-full object-contain" />
             )
           ) : (
             <div className="text-gray-500">Contenido no disponible</div>
           )}

           {/* Flechas de navegación si hay más de 1 archivo */}
           {mediaList.length > 1 && (
             <>
               <button onClick={handlePrev} className="absolute left-4 p-2 bg-black/50 text-white rounded-full hover:bg-white/20 transition-colors z-10">
                 <ChevronLeft size={24} />
               </button>
               <button onClick={handleNext} className="absolute right-4 p-2 bg-black/50 text-white rounded-full hover:bg-white/20 transition-colors z-10">
                 <ChevronRight size={24} />
               </button>
               <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-xs text-white">
                 {currentMediaIndex + 1} / {mediaList.length}
               </div>
             </>
           )}
        </div>

        {/* LADO DERECHO: INFO Y COMENTARIOS */}
        <div className="flex flex-col h-full border-l dark:border-slate-700 relative">
          
          <div className="p-4 border-b dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
             <div className="flex items-center gap-2">
                <Avatar initials={post.profiles?.avatar_initials} src={post.profiles?.avatar_url} size="sm"/>
                <div>
                   <h4 className="font-bold text-sm text-gray-900 dark:text-white">{post.profiles?.full_name}</h4>
                   <p className="text-xs text-gray-500">{post.profiles?.role}</p>
                </div>
             </div>
             {post.content && (
               <div className="mt-2 text-xs text-gray-700 dark:text-gray-300 max-h-20 overflow-y-auto whitespace-pre-wrap">
                 {post.content}
               </div>
             )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-800/50" ref={scrollRef}>
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

          <div className="p-3 bg-white dark:bg-slate-900 border-t dark:border-slate-700 shrink-0">
             <div className="flex gap-2 items-center">
                <Avatar initials={user.avatar} src={user.avatar_url} size="sm" className="hidden sm:block" />
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escribe un comentario..."
                    disabled={isSending}
                    className="w-full text-sm py-2 pl-3 pr-10 rounded-full bg-gray-100 dark:bg-slate-800 border-none focus:ring-1 focus:ring-blue-500 dark:text-white"
                    onKeyDown={(e) => e.key === 'Enter' && !isSending && handleSend()}
                  />
                  <button 
                    onClick={handleSend}
                    disabled={!newComment.trim() || isSending}
                    className="absolute right-1 top-1 p-1.5 text-blue-600 hover:bg-blue-100 rounded-full disabled:opacity-50"
                  >
                    {isSending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}
                  </button>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE POST ITEM ---
const PostItem = ({ 
  post, 
  user, 
  onVote, 
  onDelete, 
  onUpdate, 
  onToggleComments, 
  showComments, 
  comments, 
  onCommentAction,
  onOpenDetail 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const [showMenu, setShowMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Normalizar media para visualización
  const mediaList = post.media?.length > 0 
    ? post.media 
    : (post.image_url ? [{ type: 'image', url: post.image_url }] : (post.video_url ? [{ type: 'video', url: post.video_url }] : []));

  const [newCommentText, setNewCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) { setShowMenu(false); }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdate(post.id, editText, null, null); 
    setIsSaving(false);
    setIsEditing(false);
  };

  const submitComment = async () => {
    if (!newCommentText.trim()) return;
    setSendingComment(true);
    await onCommentAction.add(post.id, newCommentText);
    setNewCommentText('');
    setSendingComment(false);
  };

  const isOwner = user.id === post.user_id;

  // Renderizador de Grilla de Media
  const renderMediaGrid = () => {
    if (mediaList.length === 0) return null;

    const count = mediaList.length;
    let gridClass = "grid-cols-1";
    if (count === 2) gridClass = "grid-cols-2";
    if (count >= 3) gridClass = "grid-cols-2";

    return (
      <div className={`grid ${gridClass} gap-1 rounded-lg overflow-hidden mb-3 border border-gray-100 dark:border-slate-700 cursor-pointer`} onClick={() => onOpenDetail(post)}>
        {mediaList.slice(0, 4).map((media, idx) => (
          <div key={idx} className={`relative ${count === 3 && idx === 0 ? 'row-span-2' : ''} h-64 bg-black`}>
            {media.type === 'video' ? (
              <>
                 <video src={media.url} className="w-full h-full object-cover" />
                 <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Video className="text-white drop-shadow-md" size={32}/></div>
              </>
            ) : (
              <img src={media.url} alt={`Media ${idx}`} className="w-full h-full object-cover" />
            )}
            
            {/* Overlay para "+X" si hay más de 4 */}
            {idx === 3 && count > 4 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xl">
                +{count - 4}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex gap-3 mb-2 items-start">
        <Avatar initials={post.profiles?.avatar_initials || '??'} src={post.profiles?.avatar_url} />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="truncate pr-2">
               <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{post.profiles?.full_name || 'Usuario'}</h4>
               <span className="text-[10px] text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900 px-2 py-0.5 rounded-full inline-block mt-0.5">
                 {post.profiles?.role || 'Miembro'}
               </span>
            </div>
            
            {isOwner && !isEditing && (
              <div className="relative" ref={menuRef}>
                <button onClick={() => setShowMenu(!showMenu)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 shrink-0">
                  <MoreHorizontal size={18} />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-6 w-32 bg-white dark:bg-slate-800 shadow-xl rounded-md border border-gray-100 dark:border-slate-600 z-50 overflow-hidden text-xs">
                    <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="w-full text-left px-3 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-blue-600"><Edit2 size={14} /> Editar</button>
                    <button onClick={() => { if(window.confirm('¿Eliminar publicación?')) onDelete(post.id); }} className="w-full text-left px-3 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600"><Trash2 size={14} /> Eliminar</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isEditing ? (
        <div className="mb-3">
          <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full p-2 text-sm bg-gray-50 dark:bg-slate-900 border border-blue-200 rounded resize-none dark:text-white mb-2" rows={4} />
          <div className="flex justify-end gap-2">
              <button onClick={() => { setIsEditing(false); setEditText(post.content); }} className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
              <Button onClick={handleSave} disabled={isSaving} className="text-xs px-4 py-1.5 rounded h-auto">{isSaving ? <Loader2 className="animate-spin" size={14}/> : 'Guardar'}</Button>
          </div>
        </div>
      ) : (
        <>
          {post.content && <p className="text-gray-800 dark:text-gray-200 text-sm mb-3 whitespace-pre-wrap">{post.content}</p>}
          {renderMediaGrid()}
        </>
      )}

      <div className="flex justify-between border-t dark:border-slate-700 pt-3 mt-1 px-1">
        <div className="flex gap-4">
          <button onClick={() => onVote(post.id, 'like')} className={`flex items-center gap-1.5 text-sm ${post.user_vote === 'like' ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
            <ThumbsUp size={18} className={post.user_vote === 'like' ? 'fill-blue-100' : ''} /> <span>{post.likes_count || 0}</span>
          </button>
          <button onClick={() => onVote(post.id, 'dislike')} className={`flex items-center gap-1.5 text-sm ${post.user_vote === 'dislike' ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
            <ThumbsDown size={18} className={post.user_vote === 'dislike' ? 'fill-red-100' : ''} /> <span>{post.dislikes_count || 0}</span>
          </button>
        </div>
        <div className="flex gap-4">
          <button onClick={onToggleComments} className={`flex items-center gap-1.5 text-sm ${showComments ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
            <MessageSquare size={18} /> <span>{post.comments_count || 0}</span>
          </button>
          <button className="text-gray-500 hover:text-blue-600"><Share2 size={18} /></button>
        </div>
      </div>

      {showComments && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 animate-in slide-in-from-top-2">
          <div className="space-y-3 mb-4 pr-1">
              {comments?.length > 0 ? (
                comments.map(comment => (
                  <CommentItem key={comment.id} comment={comment} user={user} onDelete={onCommentAction.delete} onEdit={onCommentAction.edit} onVote={onCommentAction.vote} />
                ))
              ) : <p className="text-center text-xs text-gray-400 italic py-2">Sé el primero en comentar.</p>}
          </div>
          <div className="flex gap-2 items-center">
            <Avatar initials={user.avatar} src={user.avatar_url} size="sm" className="hidden sm:flex" />
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={newCommentText} 
                onChange={(e) => setNewCommentText(e.target.value)} 
                placeholder="Escribe un comentario..." 
                disabled={sendingComment}
                className="w-full text-sm py-2 pl-3 pr-10 rounded-full bg-gray-100 dark:bg-slate-900 border-none focus:ring-1 focus:ring-blue-500 dark:text-white" 
                onKeyDown={(e) => e.key === 'Enter' && !sendingComment && submitComment()} 
              />
              <button onClick={submitComment} disabled={!newCommentText.trim() || sendingComment} className="absolute right-1 top-1 p-1.5 text-blue-600 hover:bg-blue-100 rounded-full disabled:opacity-50">
                {sendingComment ? <Loader2 size={14} className="animate-spin"/> : <Send size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

// --- VISTA FEED PRINCIPAL ---
const FeedView = ({ user }) => {
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  
  // NUEVO: Estado para múltiples archivos
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [fullScreenPost, setFullScreenPost] = useState(null);

  const { 
    activeCommentsPostId, 
    commentsData, 
    toggleComments, 
    fetchComments,
    commentActions 
  } = useComments(setPosts, user);

  const fetchPosts = async () => {
    // Seleccionamos la columna 'media' también
    const { data: postsData, error } = await supabase
      .from('posts')
      .select(`*, profiles (full_name, role, avatar_initials, avatar_url)`)
      .order('created_at', { ascending: false });

    if (error) { setLoading(false); return; }

    const { data: userVotes } = await supabase.from('post_votes').select('post_id, vote_type').eq('user_id', user.id);
    const voteMap = {};
    if (userVotes) userVotes.forEach(v => voteMap[v.post_id] = v.vote_type);

    const postsWithCounts = postsData.map(p => ({
      ...p,
      likes_count: p.likes_count || 0,
      dislikes_count: p.dislikes_count || 0,
      user_vote: voteMap[p.id] || null 
    }));

    setPosts(postsWithCounts);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
    const channel = supabase.channel('public:posts').on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchPosts()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Manejador de selección múltiple
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Agregar a la lista existente
    setSelectedFiles(prev => [...prev, ...files]);

    // Generar previews
    const newPreviews = files.map(file => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' : 'video',
      name: file.name
    }));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // --- FUNCIÓN PUBLISH ROBUSTA CON LOGS ---
  const publish = async () => {
    if (!text.trim() && selectedFiles.length === 0) return;
    setIsUploading(true);
    console.log("Iniciando publicación..."); 

    try {
      const uploadedMedia = [];
      
      // 1. Intentar subir archivos
      if (selectedFiles.length > 0) {
        console.log(`Subiendo ${selectedFiles.length} archivos...`);
        for (const file of selectedFiles) {
          const url = await uploadFileToSupabase(file, user.id);
          if (url) {
            uploadedMedia.push({
              type: file.type.startsWith('image/') ? 'image' : 'video',
              url: url
            });
          } else {
            console.error("Falló la subida de un archivo. Verifica permisos de Bucket.");
          }
        }
      }

      // 2. Intentar guardar en DB
      console.log("Guardando post...", { content: text, media: uploadedMedia });
      const { error } = await supabase.from('posts').insert([{ 
        user_id: user.id, 
        content: text, 
        media: uploadedMedia 
      }]);

      if (error) {
        console.error("Error Supabase:", error);
        throw error;
      }

      // 3. Éxito
      setText(''); 
      setSelectedFiles([]); 
      setPreviews([]);
      fetchPosts(); 
      console.log("Publicado con éxito");

    } catch (err) {
      console.error("ERROR EN PUBLISH:", err);
      alert(`Error al publicar: ${err.message || 'Ver consola'}. Posible falta de columna 'media' en DB.`);
    } finally {
      setIsUploading(false);
    }
  };

  // Funciones de voto y eliminado
  const handleVote = async (postId, type) => {
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;
    const currentPost = posts[postIndex];
    const previousVote = currentPost.user_vote;
    let newVote = type;
    if (previousVote === type) newVote = null;

    const newPosts = [...posts];
    const p = { ...newPosts[postIndex] };
    if (previousVote === 'like') p.likes_count = Math.max(0, p.likes_count - 1);
    if (previousVote === 'dislike') p.dislikes_count = Math.max(0, p.dislikes_count - 1);
    if (newVote === 'like') p.likes_count += 1;
    if (newVote === 'dislike') p.dislikes_count += 1;
    p.user_vote = newVote;
    newPosts[postIndex] = p;
    setPosts(newPosts);

    try {
      if (newVote === null) await supabase.from('post_votes').delete().match({ user_id: user.id, post_id: postId });
      else await supabase.from('post_votes').upsert({ user_id: user.id, post_id: postId, vote_type: newVote }, { onConflict: 'user_id, post_id' });
    } catch (err) { console.error(err); fetchPosts(); }
  };

  const handleDeletePost = async (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    await supabase.from('posts').delete().eq('id', postId);
  };

  const handleUpdatePost = async (postId, content) => {
     setPosts(prev => prev.map(p => p.id === postId ? { ...p, content } : p));
     await supabase.from('posts').update({ content }).eq('id', postId);
  };

  return (
    <div className="pb-24 pt-4 max-w-2xl mx-auto space-y-4 px-4">
      <PostDetailModal 
        post={fullScreenPost} 
        onClose={() => setFullScreenPost(null)}
        user={user}
        commentsData={commentsData}
        commentActions={commentActions}
        fetchComments={fetchComments}
      />

      <Card>
        <div className="flex gap-3">
          <Avatar initials={user.avatar || 'YO'} src={user.avatar_url} />
          <div className="flex-1 min-w-0">
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`¿Qué cuentas, ${user.name.split(' ')[0]}?`} className="w-full p-2 bg-gray-50 dark:bg-slate-900 rounded border-none focus:ring-1 focus:ring-blue-500 resize-none dark:text-white text-sm" rows={3} />
            
            {/* AREA DE PREVISUALIZACIÓN DE ARCHIVOS (GRID) */}
            {previews.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {previews.map((file, idx) => (
                  <div key={idx} className="relative shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 group">
                    <button onClick={() => removeFile(idx)} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-red-600 z-10 transition-colors"><X size={12} /></button>
                    {file.type === 'image' ? (
                      <img src={file.url} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <video src={file.url} className="w-full h-full bg-black object-cover" />
                    )}
                    <div className="absolute bottom-1 right-1 p-1 bg-black/40 rounded text-white">
                      {file.type === 'video' ? <Video size={10} /> : <Image size={10}/>}
                    </div>
                  </div>
                ))}
                {/* Botón para añadir más rápido */}
                 <label className="cursor-pointer shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors">
                    <Layers size={20} />
                    <span className="text-[10px] mt-1">Añadir</span>
                    <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileSelect}/>
                 </label>
              </div>
            )}

            <div className="flex justify-between items-center mt-2">
              <div className="flex gap-1 text-blue-600">
                <label className="cursor-pointer p-2 hover:bg-blue-50 rounded-full transition-colors relative" title="Fotos y Videos">
                   <div className="absolute -top-1 -right-1">
                      {previews.length > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">{previews.length}</span>}
                   </div>
                   <Image size={20} />
                   <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileSelect}/>
                </label>
              </div>
              <Button onClick={publish} disabled={isUploading || (!text && previews.length === 0)} className="text-sm px-6 rounded-full">
                {isUploading ? <Loader2 className="animate-spin" size={18}/> : 'Publicar'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      {loading ? (
        <div className="flex justify-center p-4"><Loader2 className="animate-spin text-blue-600"/></div>
      ) : posts.map((post) => (
        <PostItem 
          key={post.id}
          post={post}
          user={user}
          onVote={handleVote}
          onDelete={handleDeletePost}
          onUpdate={handleUpdatePost}
          onToggleComments={() => toggleComments(post.id)}
          showComments={activeCommentsPostId === post.id}
          comments={commentsData[post.id]}
          onCommentAction={commentActions}
          onOpenDetail={setFullScreenPost} 
        />
      ))}
    </div>
  );
};

// --- CONFIGURACIÓN ---
const SettingsView = ({ isDarkMode, toggleTheme }) => (
  <div className="pb-24 pt-4 max-w-2xl mx-auto px-4">
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Configuración</h2>
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between shadow border border-gray-100 dark:border-slate-700">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isDarkMode ? 'bg-blue-900 text-yellow-400' : 'bg-yellow-100 text-orange-500'}`}>{isDarkMode ? <Moon size={20} /> : <Sun size={20} />}</div>
        <div><h4 className="font-bold text-gray-900 dark:text-white">Modo Oscuro</h4><p className="text-xs text-gray-500">Ajusta el tema visual</p></div>
      </div>
      <button onClick={toggleTheme} className={`w-12 h-6 rounded-full p-1 transition-colors relative ${isDarkMode ? 'bg-blue-600' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
    </div>
  </div>
);

const DesktopNavLink = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center h-full px-4 border-b-4 transition-colors ${active ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-blue-200 hover:text-white hover:bg-blue-800'}`}>
    <Icon size={22} strokeWidth={active ? 3 : 2} /> <span className="text-xs mt-1">{label}</span>
  </button>
);

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('feed');
  const [sessionLoading, setSessionLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data) setUser({ id: data.id, name: data.full_name, role: data.role, avatar: data.avatar_initials, avatar_url: data.avatar_url, cover_url: data.cover_url, bio: data.bio, company: data.company || 'Independiente', location: data.location });
    } catch (error) { console.error(error); } finally { setSessionLoading(false); }
  };

  useEffect(() => {
    const init = async () => { const { data: { session } } = await supabase.auth.getSession(); if (session) await fetchProfile(session.user.id); else setSessionLoading(false); };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => { if (session) await fetchProfile(session.user.id); else { setUser(null); setSessionLoading(false); } });
    return () => subscription.unsubscribe();
  }, []);

  const handleProfileRefresh = () => { if (user?.id) fetchProfile(user.id); };
  useEffect(() => { if (isDarkMode) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark'); }, [isDarkMode]);
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); };

  if (sessionLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900"><Loader2 className="animate-spin text-blue-600 w-10 h-10"/></div>;
  if (!user) return <LoginScreen />;

  return (
    <div className="bg-gray-100 dark:bg-slate-900 text-gray-900 dark:text-gray-100 font-sans min-h-screen transition-colors duration-300">
      
      {/* Navbar Superior */}
      <nav className="sticky top-0 z-30 bg-blue-900 text-white shadow-md border-b-4 border-yellow-500">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg text-yellow-400 shrink-0">
            <ArrowUp className="bg-yellow-400 text-blue-900 p-0.5 rounded" size={28} />
            <span className="hidden xs:inline">ElevatorConnect</span>
            <span className="xs:hidden">ElevIn</span>
          </div>

          <div className="hidden md:flex h-full items-center gap-1">
             <DesktopNavLink icon={Home} label="Inicio" active={view === 'feed'} onClick={() => setView('feed')} />
             <DesktopNavLink icon={Briefcase} label="Empleos" active={view === 'jobs'} onClick={() => setView('jobs')} />
             <DesktopNavLink icon={Users} label="Red" active={view === 'networking'} onClick={() => setView('networking')} />
             <DesktopNavLink icon={LifeBuoy} label="Soporte" active={view === 'support'} onClick={() => setView('support')} />
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
             <button onClick={() => setView('profile')} className={`hidden md:flex items-center gap-2 p-1 pr-3 rounded-full transition-colors group ${view === 'profile' ? 'bg-blue-800' : 'hover:bg-blue-800'}`}>
               <div className="w-8 h-8 rounded-full bg-blue-700 border border-blue-400 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                  <Avatar initials={user.avatar} src={user.avatar_url} size="sm" className="border-none" />
               </div>
               <span className="text-xs text-blue-200 font-bold group-hover:text-white">{user.name}</span>
             </button>
             <div className="hidden md:block h-6 w-px bg-blue-700 mx-1"></div>
             <button onClick={() => setView('settings')} className={`hidden md:block p-1.5 rounded-full ${view === 'settings' ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800'}`}>
               <Settings size={20} />
             </button>
             <Bell size={20} className="text-blue-200 cursor-pointer hover:text-white" />
             <button onClick={handleLogout} className="text-blue-200 hover:text-red-300 transition-colors p-1"><LogOut size={20} /></button>
          </div>
        </div>
      </nav>

      {/* Área Principal */}
      <main className="max-w-4xl mx-auto min-h-[calc(100vh-4rem)]">
        {view === 'feed' && <FeedView user={user} />}
        {view === 'jobs' && <JobsView jobs={JOBS_DATA} onApply={(t) => alert(`Postulado a: ${t}`)} />}
        {view === 'networking' && <NetworkingView />}
        {view === 'support' && <SupportView />}
        {view === 'profile' && <ProfileView user={user} onProfileUpdate={handleProfileRefresh} />}
        {view === 'settings' && <SettingsView isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />}
      </main>

      {/* Navbar Móvil */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t dark:border-slate-700 flex justify-around p-2 pb-safe z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <NavButton icon={Home} label="Inicio" active={view === 'feed'} onClick={() => setView('feed')} />
        <NavButton icon={Briefcase} label="Empleos" active={view === 'jobs'} onClick={() => setView('jobs')} />
        <NavButton icon={Users} label="Red" active={view === 'networking'} onClick={() => setView('networking')} />
        <NavButton icon={Settings} label="Ajustes" active={view === 'settings'} onClick={() => setView('settings')} />
        <NavButton icon={User} label="Perfil" active={view === 'profile'} onClick={() => setView('profile')} />
      </div>
    </div>
  );
}

const NavButton = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 w-full p-1 rounded-lg ${active ? 'text-blue-900 dark:text-yellow-400 bg-blue-50 dark:bg-white/5' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default App;