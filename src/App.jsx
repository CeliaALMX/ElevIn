import React, { useState, useEffect, useRef } from 'react';
import {
  Briefcase, Home, User, LogOut, Bell, ArrowUp, Users, LifeBuoy,         
  MapPin, Wrench, ThumbsUp, ThumbsDown, MessageSquare, Share2, Settings,
  Moon, Sun, Loader2, Image, Video, X, Send, MoreHorizontal,
  Edit2, Trash2, MoreVertical
} from 'lucide-react';
import { supabase } from './lib/supabase';

// --- IMPORTACIONES UI ---
import LoginScreen from './components/LoginScreen';
import Avatar from './components/ui/Avatar';
import Button from './components/ui/Button';
import Card from './components/ui/Card';

// --- DATOS MOCK ---
import { JOBS_DATA } from './data/mockData';

// --- IMPORTACIONES DE VISTAS ---
import JobsView from './components/views/JobsView';
import SupportView from './components/views/SupportView';
import NetworkingView from './components/views/NetworkingView';
import ProfileView from './components/views/ProfileView';

// --- COMPONENTE LIGHTBOX (PANTALLA COMPLETA) ---
const MediaModal = ({ media, onClose }) => {
  if (!media) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-gray-800/50 text-white rounded-full hover:bg-red-600 transition-colors z-50"
      >
        <X size={24} />
      </button>
      
      <div className="relative max-w-7xl max-h-screen w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
        {media.type === 'video' ? (
          <video 
            src={media.url} 
            controls 
            autoPlay 
            className="max-h-[85vh] max-w-full rounded shadow-2xl outline-none"
          />
        ) : (
          <img 
            src={media.url} 
            alt="Full view" 
            className="max-h-[85vh] max-w-full object-contain rounded shadow-2xl" 
          />
        )}
      </div>
    </div>
  );
};

// --- COMPONENTE DE COMENTARIO INDIVIDUAL ---
const CommentItem = ({ comment, user, onDelete, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUpdate = () => {
    if (editContent.trim() !== comment.content) {
      onEdit(comment.id, editContent);
    }
    setIsEditing(false);
    setShowMenu(false);
  };

  const isOwner = user.id === comment.user_id;

  return (
    <div className="flex gap-2 group relative">
      <Avatar 
        initials={comment.profiles?.avatar_initials || 'User'} 
        src={comment.profiles?.avatar_url}
        size="sm" 
      />
      <div className="flex-1 min-w-0">
        <div className="bg-gray-50 dark:bg-slate-700/50 p-2 rounded-lg rounded-tl-none relative">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-gray-900 dark:text-white mr-2">
              {comment.profiles?.full_name}
            </span>
            
            {isOwner && !isEditing && (
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded transition-opacity"
                >
                  <MoreVertical size={14} />
                </button>
                
                {showMenu && (
                  <div className="absolute right-0 top-6 w-32 bg-white dark:bg-slate-800 shadow-xl rounded-md border border-gray-100 dark:border-slate-600 z-50 overflow-hidden text-xs">
                    <button 
                      onClick={() => { setIsEditing(true); setShowMenu(false); }}
                      className="w-full text-left px-3 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-blue-600 active:bg-blue-50"
                    >
                      <Edit2 size={14} /> Editar
                    </button>
                    <button 
                      onClick={() => onDelete(comment.id)}
                      className="w-full text-left px-3 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600 active:bg-red-50"
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="mt-1">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-blue-300 rounded focus:outline-none resize-none dark:text-white"
                rows={2}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="text-xs text-gray-500 hover:underline px-2 py-1"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleUpdate} 
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
              {comment.content}
            </p>
          )}
        </div>
        <div className="text-[10px] text-gray-400 ml-1 mt-0.5">
          {new Date(comment.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};


// --- VISTA FEED PRINCIPAL ---
const FeedView = ({ user }) => {
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [fullScreenMedia, setFullScreenMedia] = useState(null);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
  const [commentsData, setCommentsData] = useState({}); 
  const [newCommentText, setNewCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false); // Estado para loading del comentario

  const fetchPosts = async () => {
    const { data: postsData, error } = await supabase
      .from('posts')
      .select(`*, profiles (full_name, role, avatar_initials, avatar_url)`)
      .order('created_at', { ascending: false });

    if (error) { 
      console.error("Error cargando posts:", error);
      setLoading(false); 
      return; 
    }

    const { data: userVotes } = await supabase
      .from('post_votes')
      .select('post_id, vote_type')
      .eq('user_id', user.id);

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
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchPosts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      alert("El archivo es demasiado grande (máx 50MB)");
      return;
    }
    setMediaType(type);
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    const imgInput = document.getElementById('image-upload');
    const vidInput = document.getElementById('video-upload');
    if (imgInput) imgInput.value = '';
    if (vidInput) vidInput.value = '';
  };

  const uploadMedia = async () => {
    if (!mediaFile) return null;
    try {
      const fileExt = mediaFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      const { error } = await supabase.storage.from('posts-files').upload(filePath, mediaFile);
      if (error) throw error;
      const { data } = supabase.storage.from('posts-files').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error("Error subiendo:", error);
      return null;
    }
  };

  const publish = async () => {
    if (!text.trim() && !mediaFile) return;
    setIsUploading(true);
    let imageUrl = null;
    let videoUrl = null;

    if (mediaFile) {
      const url = await uploadMedia();
      if (url) {
        if (mediaType === 'image') imageUrl = url;
        if (mediaType === 'video') videoUrl = url;
      } else {
        setIsUploading(false);
        return;
      }
    }

    const { error } = await supabase.from('posts').insert([{ 
      user_id: user.id, 
      content: text,
      image_url: imageUrl,
      video_url: videoUrl
    }]);
    
    setIsUploading(false);
    if (!error) { 
      setText(''); 
      clearMedia();
      fetchPosts(); 
    } else {
      alert("Error al publicar. Intenta de nuevo.");
    }
  };

  const handleVote = async (postId, type) => {
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;
    const currentPost = posts[postIndex];
    const currentVote = currentPost.user_vote;
    let newVote = type;
    if (currentVote === type) newVote = null;

    const newPosts = [...posts];
    const p = { ...newPosts[postIndex] };

    if (currentVote === 'like') p.likes_count = Math.max(0, p.likes_count - 1);
    if (currentVote === 'dislike') p.dislikes_count = Math.max(0, p.dislikes_count - 1);
    if (newVote === 'like') p.likes_count += 1;
    if (newVote === 'dislike') p.dislikes_count += 1;

    p.user_vote = newVote;
    newPosts[postIndex] = p;
    setPosts(newPosts);

    try {
      if (newVote === null) {
        await supabase.from('post_votes').delete().match({ user_id: user.id, post_id: postId });
      } else {
        await supabase.from('post_votes').upsert({ user_id: user.id, post_id: postId, vote_type: newVote }, { onConflict: 'user_id, post_id' });
      }
    } catch (err) { fetchPosts(); }
  };

  const toggleComments = (postId) => {
    setNewCommentText(''); // Limpiar el input al cambiar de post
    if (activeCommentsPostId === postId) setActiveCommentsPostId(null);
    else {
      setActiveCommentsPostId(postId);
      if (!commentsData[postId]) fetchComments(postId);
    }
  };

  const fetchComments = async (postId) => {
    setLoadingComments(true);
    const { data, error } = await supabase
      .from('post_comments')
      .select(`*, profiles (full_name, avatar_initials, avatar_url)`)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) console.error("Error trayendo comentarios:", error);
    if (data) setCommentsData(prev => ({ ...prev, [postId]: data }));
    setLoadingComments(false);
  };

  const submitComment = async (postId) => {
    if (!newCommentText.trim()) return;
    setSendingComment(true);

    const { error } = await supabase.from('post_comments').insert({ 
      post_id: postId, 
      user_id: user.id, 
      content: newCommentText 
    });

    setSendingComment(false);

    if (!error) {
      setNewCommentText('');
      fetchComments(postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p));
    } else {
      console.error(error);
      alert(`No se pudo enviar el comentario. Detalles: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleDeleteComment = async (commentId, postId) => {
    if(!window.confirm("¿Eliminar comentario?")) return;
    const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
    if (!error) {
      setCommentsData(prev => ({ ...prev, [postId]: prev[postId].filter(c => c.id !== commentId) }));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) } : p));
    } else {
      alert("No se pudo eliminar.");
    }
  };

  const handleEditComment = async (commentId, postId, newContent) => {
    const { error } = await supabase.from('post_comments').update({ content: newContent }).eq('id', commentId);
    if (!error) {
      setCommentsData(prev => ({ ...prev, [postId]: prev[postId].map(c => c.id === commentId ? { ...c, content: newContent } : c) }));
    } else {
      alert("No se pudo editar.");
    }
  };

  return (
    <div className="pb-24 pt-4 max-w-2xl mx-auto space-y-4 px-4">
      <MediaModal media={fullScreenMedia} onClose={() => setFullScreenMedia(null)} />

      <Card>
        <div className="flex gap-3">
          <Avatar initials={user.avatar || 'YO'} src={user.avatar_url} />
          <div className="flex-1 min-w-0">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`¿Qué cuentas, ${user.name.split(' ')[0]}?`}
              className="w-full p-2 bg-gray-50 dark:bg-slate-900 rounded border-none focus:ring-1 focus:ring-blue-500 resize-none dark:text-white text-sm"
              rows={3}
            />
            {mediaPreview && (
              <div className="relative mt-2 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 group">
                <button onClick={clearMedia} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 z-10"><X size={16} /></button>
                {mediaType === 'image' ? (
                  <img src={mediaPreview} alt="Preview" className="w-full h-48 object-cover" />
                ) : (
                  <video src={mediaPreview} controls className="w-full h-48 bg-black" />
                )}
              </div>
            )}
            {/* BARRA DE HERRAMIENTAS RESPONSIVA */}
            <div className="flex flex-wrap justify-between items-center mt-2 gap-y-2">
              <div className="flex gap-1 text-blue-600">
                <input type="file" id="image-upload" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'image')}/>
                <input type="file" id="video-upload" accept="video/*" className="hidden" onChange={(e) => handleFileSelect(e, 'video')}/>
                
                <label htmlFor="image-upload" className="cursor-pointer hover:bg-blue-50 p-2 rounded-full transition-colors"><Image size={20} /></label>
                <label htmlFor="video-upload" className="cursor-pointer hover:bg-blue-50 p-2 rounded-full transition-colors"><Video size={20} /></label>
                <div className="w-px h-6 bg-gray-200 mx-1 self-center"></div>
                <div className="p-2 text-gray-400"><MapPin size={20} /></div>
              </div>
              <Button onClick={publish} disabled={isUploading} className="text-sm px-6 rounded-full w-full sm:w-auto">
                {isUploading ? <Loader2 className="animate-spin" size={18}/> : 'Publicar'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      {loading ? (
        <div className="flex justify-center p-4"><Loader2 className="animate-spin text-blue-600"/></div>
      ) : posts.map((post) => (
        <Card key={post.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
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
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 shrink-0">
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>
          </div>
          
          {post.content && (
            <p className="text-gray-800 dark:text-gray-200 text-sm mb-3 whitespace-pre-wrap leading-relaxed break-words">{post.content}</p>
          )}
          
          {post.image_url && (
            <div className="cursor-pointer overflow-hidden rounded-lg border border-gray-100 dark:border-slate-700 mb-3" onClick={() => setFullScreenMedia({ url: post.image_url, type: 'image' })}>
              <img src={post.image_url} alt="Post content" className="w-full object-cover max-h-96 hover:scale-[1.01] transition-transform duration-300" />
            </div>
          )}
          {post.video_url && (
            <div className="relative mb-3 group" onClick={() => setFullScreenMedia({ url: post.video_url, type: 'video' })}>
               <video src={post.video_url} className="w-full rounded-lg bg-black max-h-96 border border-gray-100 dark:border-slate-700" />
               <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors cursor-pointer"><div className="bg-white/90 p-3 rounded-full shadow-lg"><Video size={24} className="text-blue-900 ml-1" /></div></div>
            </div>
          )}

          <div className="flex justify-between border-t dark:border-slate-700 pt-3 mt-1 px-1">
            <div className="flex gap-4 sm:gap-6">
              <button onClick={() => handleVote(post.id, 'like')} className={`flex items-center gap-1.5 text-sm transition-colors ${post.user_vote === 'like' ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                <ThumbsUp size={18} className={post.user_vote === 'like' ? 'fill-blue-100' : ''} /> <span>{post.likes_count || 0}</span>
              </button>
              <button onClick={() => handleVote(post.id, 'dislike')} className={`flex items-center gap-1.5 text-sm transition-colors ${post.user_vote === 'dislike' ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                <ThumbsDown size={18} className={post.user_vote === 'dislike' ? 'fill-red-100' : ''} /> <span>{post.dislikes_count || 0}</span>
              </button>
            </div>
            <div className="flex gap-4 sm:gap-6">
              <button onClick={() => toggleComments(post.id)} className={`flex items-center gap-1.5 text-sm transition-colors ${activeCommentsPostId === post.id ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                <MessageSquare size={18} /> <span>{post.comments_count || 0}</span>
              </button>
              <button className="text-gray-500 hover:text-blue-600"><Share2 size={18} /></button>
            </div>
          </div>

          {activeCommentsPostId === post.id && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 animate-in slide-in-from-top-2">
              <div className="space-y-3 mb-4 pr-1">
                {loadingComments && !commentsData[post.id] ? (
                  <div className="text-center py-2 text-gray-400 text-xs">Cargando...</div>
                ) : (
                  commentsData[post.id]?.length > 0 ? (
                    commentsData[post.id].map(comment => (
                      <CommentItem key={comment.id} comment={comment} user={user} onDelete={(id) => handleDeleteComment(id, post.id)} onEdit={(id, content) => handleEditComment(id, post.id, content)} />
                    ))
                  ) : <p className="text-center text-xs text-gray-400 italic py-2">Sé el primero en comentar.</p>
                )}
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
                    className="w-full text-sm py-2 pl-3 pr-10 rounded-full bg-gray-100 dark:bg-slate-900 border-none focus:ring-1 focus:ring-blue-500 dark:text-white disabled:opacity-50" 
                    onKeyDown={(e) => e.key === 'Enter' && !sendingComment && submitComment(post.id)} 
                  />
                  <button 
                    onClick={() => submitComment(post.id)} 
                    disabled={!newCommentText.trim() || sendingComment} 
                    className="absolute right-1 top-1 p-1.5 text-blue-600 hover:bg-blue-100 rounded-full disabled:opacity-50"
                  >
                    {sendingComment ? <Loader2 size={14} className="animate-spin"/> : <Send size={14} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
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
      
      {/* Navbar Superior (RESPONSIVE FIX) */}
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

      {/* Navbar Móvil (Fixed Bottom) */}
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