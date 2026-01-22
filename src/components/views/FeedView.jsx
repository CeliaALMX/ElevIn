import React, { useState, useEffect } from 'react';
import { Loader2, Video, Image, X, Sparkles, Users, Briefcase, UserPlus, MapPin, Camera, Mail, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useComments } from '../../hooks/useComments';
import { uploadFileToSupabase } from '../../helpers/fileUpload';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import PostItem from '../feed/PostItem';
import PostDetailModal from '../modals/PostDetailModal';
import { JOBS_DATA } from '../../data/mockData';

// CAMBIO 1: Recibimos onViewProfile aquí
const FeedView = ({ user, onViewProfile }) => {
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedType, setFeedType] = useState('for_you'); 
  
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [suggestedPeople, setSuggestedPeople] = useState([]);
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [fullScreenPost, setFullScreenPost] = useState(null);

  const { activeCommentsPostId, commentsData, toggleComments, fetchComments, commentActions } = useComments(setPosts, user);

  const fetchPosts = async () => {
    setLoading(true);
    let query = supabase.from('posts').select(`*, profiles (full_name, role, avatar_initials, avatar_url, company)`).order('created_at', { ascending: false });
    const { data: postsData, error } = await query;
    if (error) { setLoading(false); return; }

    const { data: userVotes } = await supabase.from('post_votes').select('post_id, vote_type').eq('user_id', user.id);
    const voteMap = {};
    if (userVotes) userVotes.forEach(v => voteMap[v.post_id] = v.vote_type);

    let finalPosts = postsData.map(p => ({
      ...p,
      likes_count: p.likes_count || 0,
      dislikes_count: p.dislikes_count || 0,
      user_vote: voteMap[p.id] || null 
    }));

    if (feedType === 'for_you') {
        finalPosts.sort((a, b) => {
           const aRelevant = a.profiles?.role === user.role ? 1 : 0;
           const bRelevant = b.profiles?.role === user.role ? 1 : 0;
           return bRelevant - aRelevant || new Date(b.created_at) - new Date(a.created_at);
        });
    }
    setPosts(finalPosts);
    setLoading(false);
  };

  const fetchSuggestions = async () => {
    const { data } = await supabase.from('profiles').select('*').neq('id', user.id).limit(3);
    if (data) setSuggestedPeople(data);
  };

  useEffect(() => { fetchPosts(); fetchSuggestions(); }, [feedType]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProfileUpdating(true);
    try {
        const publicUrl = await uploadFileToSupabase(file, user.id, 'avatars');
        if (publicUrl) {
            await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
            window.location.reload(); 
        }
    } catch (error) { console.error(error); } finally { setIsProfileUpdating(false); }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setSelectedFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(file => ({ url: URL.createObjectURL(file), type: file.type.startsWith('image/') ? 'image' : 'video', name: file.name }));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const publish = async () => {
    if (!text.trim() && selectedFiles.length === 0) return;
    setIsUploading(true);
    try {
      const uploadedMedia = [];
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const url = await uploadFileToSupabase(file, user.id);
          if (url) uploadedMedia.push({ type: file.type.startsWith('image/') ? 'image' : 'video', url: url });
        }
      }
      const { error } = await supabase.from('posts').insert([{ user_id: user.id, content: text, media: uploadedMedia }]);
      if (error) throw error;
      setText(''); setSelectedFiles([]); setPreviews([]); fetchPosts(); 
    } catch (err) { alert(`Error al publicar: ${err.message}.`); } finally { setIsUploading(false); }
  };

  const handleVote = async (postId, type) => {
      const post = posts.find(p => p.id === postId);
      if (!post) return;
      
      const currentVote = post.user_vote;
      let newVote = type;
      if (currentVote === type) newVote = null; 

      setPosts(posts.map(p => {
          if (p.id !== postId) return p;
          let likes = p.likes_count;
          let dislikes = p.dislikes_count;
          
          if (currentVote === 'like') likes--;
          if (currentVote === 'dislike') dislikes--;
          
          if (newVote === 'like') likes++;
          if (newVote === 'dislike') dislikes++;
          
          return { ...p, user_vote: newVote, likes_count: likes, dislikes_count: dislikes };
      }));

      if (currentVote) await supabase.from('post_votes').delete().eq('user_id', user.id).eq('post_id', postId);
      if (newVote) await supabase.from('post_votes').insert({ user_id: user.id, post_id: postId, vote_type: newVote });
      
      const rpcName = newVote === 'like' ? 'increment_likes' : (newVote === 'dislike' ? 'increment_dislikes' : (currentVote === 'like' ? 'decrement_likes' : 'decrement_dislikes'));
      await supabase.rpc(rpcName, { post_id: postId });
  };

  const handleDeletePost = async (postId) => {
    try {
        const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id);
        if (error) throw error;
        setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (error) {
        console.error('Error deleting:', error);
        alert('No se pudo eliminar la publicación.');
    }
  };

  const handleUpdatePost = async (postId, newContent) => {
      try {
          const { error } = await supabase.from('posts').update({ content: newContent }).eq('id', postId).eq('user_id', user.id);
          if (error) throw error;
          setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: newContent } : p));
      } catch (error) {
          console.error('Error updating:', error);
          alert('No se pudo actualizar.');
      }
  };

  return (
    <div className="pt-6 px-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
      <PostDetailModal post={fullScreenPost} onClose={() => setFullScreenPost(null)} user={user} commentsData={commentsData} commentActions={commentActions} fetchComments={fetchComments} />

      {/* --- COLUMNA IZQUIERDA: PERFIL --- */}
      <aside className="hidden lg:block lg:col-span-1 space-y-4">
        <Card className="sticky top-24 overflow-hidden">
            <div className="relative h-28 bg-gray-200 dark:bg-slate-700">
                {user.cover_url ? ( <img src={user.cover_url} alt="Portada" className="w-full h-full object-cover" /> ) : ( <div className="w-full h-full bg-gradient-to-r from-blue-800 to-blue-600"></div> )}
                <div className="absolute -bottom-10 left-4 group">
                    <div className="p-1 bg-white dark:bg-slate-800 rounded-full ring-4 ring-white dark:ring-slate-900">
                        <Avatar initials={user.avatar} src={user.avatar_url} size="lg" />
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                        {isProfileUpdating ? <Loader2 className="animate-spin" size={20}/> : <Camera size={20} />}
                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={isProfileUpdating} />
                    </label>
                </div>
            </div>

            <div className="px-4 pb-4 pt-14">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{user.name}</h2>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-4">{user.role}</p>
                    
                    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                            <Briefcase size={16} className="text-gray-400" />
                            <span className="truncate">{user.company}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-gray-400" />
                            <span className="truncate">{user.location || 'Ubicación no definida'}</span>
                        </div>
                        <div className="pt-2 mt-2 border-t border-gray-100 dark:border-slate-700 space-y-2">
                             <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400" title="Correo de Contacto">
                                <Mail size={14} />
                                <span className="truncate text-xs">{user.email || 'Sin correo'}</span>
                             </div>
                             <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400" title="Teléfono">
                                <Phone size={14} />
                                <span className="truncate text-xs">{user.phone || 'Sin teléfono'}</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
      </aside>

      {/* --- COLUMNA CENTRAL: FEED --- */}
      <div className="col-span-1 lg:col-span-2 space-y-4 max-w-2xl mx-auto w-full">
        <Card>
          <div className="flex gap-3">
            <Avatar initials={user.avatar || 'YO'} src={user.avatar_url} />
            <div className="flex-1 min-w-0">
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`¿Qué hay de nuevo en los elevadores, ${user.name.split(' ')[0]}?`} className="w-full p-2 bg-gray-50 dark:bg-slate-900 rounded border-none focus:ring-1 focus:ring-blue-500 resize-none dark:text-white text-sm" rows={3} />
              
              {previews.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {previews.map((file, idx) => (
                    <div key={idx} className="relative shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 group">
                      <button onClick={() => removeFile(idx)} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-red-600 z-10 transition-colors"><X size={12} /></button>
                      {file.type === 'image' ? ( <img src={file.url} alt="Preview" className="w-full h-full object-cover" /> ) : ( <video src={file.url} className="w-full h-full bg-black object-cover" /> )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-1 text-blue-600">
                  <label className="cursor-pointer p-2 hover:bg-blue-50 rounded-full transition-colors relative">
                     <div className="absolute -top-1 -right-1"> {previews.length > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">{previews.length}</span>} </div>
                     <Image size={20} />
                     <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleFileSelect}/>
                  </label>
                </div>
                <Button onClick={publish} disabled={isUploading || (!text && previews.length === 0)} className="text-sm px-6 rounded-full"> {isUploading ? <Loader2 className="animate-spin" size={18}/> : 'Publicar'} </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex border-b border-gray-200 dark:border-slate-700">
             <button onClick={() => setFeedType('for_you')} className={`flex-1 pb-3 text-sm font-semibold flex items-center justify-center gap-2 ${feedType === 'for_you' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}> <Sparkles size={16} /> Para Ti (Sugerencias) </button>
             <button onClick={() => setFeedType('following')} className={`flex-1 pb-3 text-sm font-semibold flex items-center justify-center gap-2 ${feedType === 'following' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}> <Users size={16} /> Siguiendo </button>
        </div>

        {loading ? ( <div className="flex justify-center p-4"><Loader2 className="animate-spin text-blue-600"/></div> ) : ( 
            <div className="space-y-4"> 
            {posts.length === 0 ? ( 
                <div className="text-center py-10 text-gray-500"> <p>No hay publicaciones para mostrar aquí.</p> </div> 
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
                    // CAMBIO 2: Pasamos la función al componente PostItem
                    onViewProfile={onViewProfile}
                /> 
            ))} 
            </div> 
        )}
      </div>

      {/* --- COLUMNA DERECHA: WIDGETS --- */}
      <aside className="hidden lg:block lg:col-span-1 space-y-6">
        <Card className="p-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"> <Briefcase size={18} className="text-blue-500"/> Empleos Sugeridos </h3>
            <div className="space-y-4">
                {JOBS_DATA.slice(0, 2).map(job => ( <div key={job.id} className="border-b border-gray-100 dark:border-slate-700 pb-3 last:border-0 last:pb-0"> <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">{job.title}</h4> <p className="text-xs text-gray-500">{job.company}</p> <p className="text-xs text-green-600 font-medium mt-1">{job.salary}</p> </div> ))}
            </div>
            <button className="w-full mt-4 text-xs text-blue-600 font-medium hover:underline">Ver todos los empleos</button>
        </Card>
      </aside>
    </div>
  );
};

export default FeedView;