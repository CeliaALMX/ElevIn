import React, { useState, useEffect } from 'react';
import { Loader2, Video, Image, X, Sparkles, Users, Briefcase, MapPin, Camera, Mail, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useComments } from '../../hooks/useComments';
import { uploadFileToSupabase } from '../../helpers/fileUpload';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import PostItem from '../feed/PostItem';
import PostDetailModal from '../modals/PostDetailModal';
import { JOBS_DATA } from '../../data/mockData';

const FeedView = ({ user, onViewProfile }) => {
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedType, setFeedType] = useState('for_you'); 
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [fullScreenPost, setFullScreenPost] = useState(null);

  const { activeCommentsPostId, commentsData, toggleComments, fetchComments, commentActions } = useComments(setPosts, user);

  const fetchPosts = async () => {
    setLoading(true);
    // Agregamos explícitamente el conteo de comentarios si tu tabla lo tiene, 
    // o nos aseguramos de que el alias sea correcto.
    let query = supabase
      .from('posts')
      .select(`
        *, 
        profiles (full_name, role, avatar_initials, avatar_url, company)
      `)
      .order('created_at', { ascending: false });

    const { data: postsData, error } = await query;
    if (error) { setLoading(false); return; }

    const { data: userVotes } = await supabase.from('post_votes').select('post_id, vote_type').eq('user_id', user.id);
    const voteMap = {};
    if (userVotes) userVotes.forEach(v => voteMap[v.post_id] = v.vote_type);

    let finalPosts = postsData.map(p => ({
      ...p,
      likes_count: p.likes_count || 0,
      dislikes_count: p.dislikes_count || 0,
      comments_count: p.comments_count || 0, // Aseguramos que se cargue el número de comentarios
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

  useEffect(() => { fetchPosts(); }, [feedType]);

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
    } catch (err) { alert(`Error: ${err.message}`); } finally { setIsUploading(false); }
  };

  const handleVote = async (postId, type) => {
      const post = posts.find(p => p.id === postId);
      if (!post) return;
      const currentVote = post.user_vote;
      let newVote = currentVote === type ? null : type;

      setPosts(posts.map(p => {
          if (p.id !== postId) return p;
          let l = p.likes_count, d = p.dislikes_count;
          if (currentVote === 'like') l--;
          if (currentVote === 'dislike') d--;
          if (newVote === 'like') l++;
          if (newVote === 'dislike') d++;
          return { ...p, user_vote: newVote, likes_count: l, dislikes_count: d };
      }));

      if (currentVote) await supabase.from('post_votes').delete().match({user_id: user.id, post_id: postId});
      if (newVote) await supabase.from('post_votes').upsert({ user_id: user.id, post_id: postId, vote_type: newVote });
      
      const rpc = newVote === 'like' ? 'increment_likes' : (newVote === 'dislike' ? 'increment_dislikes' : (currentVote === 'like' ? 'decrement_likes' : 'decrement_dislikes'));
      await supabase.rpc(rpc, { post_id: postId });
  };

  const handleDeletePost = async (postId) => {
    // IMPORTANTE: Asegurar el borrado en Supabase antes de actualizar estado
    const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id);
    if (!error) {
        setPosts(prev => prev.filter(p => p.id !== postId));
    } else {
        alert('Error al borrar de la base de datos');
    }
  };

  const handleUpdatePost = async (postId, newContent) => {
      const { error } = await supabase.from('posts').update({ content: newContent }).eq('id', postId).eq('user_id', user.id);
      if (!error) {
          setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: newContent } : p));
      } else {
          alert('No se pudo guardar el cambio');
      }
  };

  // ... Resto del Render igual al original (Columnas, Sidebar, etc.)
  return (
    <div className="pt-6 px-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
      <PostDetailModal post={fullScreenPost} onClose={() => setFullScreenPost(null)} user={user} commentsData={commentsData} commentActions={commentActions} fetchComments={fetchComments} />
      <aside className="hidden lg:block lg:col-span-1 space-y-4">
        <Card className="sticky top-24 overflow-hidden">
            <div className="relative h-28 bg-gray-200 dark:bg-slate-700">
                {user.cover_url ? ( <img src={user.cover_url} alt="Portada" className="w-full h-full object-cover" /> ) : ( <div className="w-full h-full bg-gradient-to-r from-blue-800 to-blue-600"></div> )}
                <div className="absolute -bottom-10 left-4 group">
                    <div className="p-1 bg-white dark:bg-slate-800 rounded-full ring-4 ring-white dark:ring-slate-900">
                        <Avatar initials={user.avatar} src={user.avatar_url} size="lg" />
                    </div>
                </div>
            </div>
            <div className="px-4 pb-4 pt-14">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
                <p className="text-sm text-blue-600 font-medium mb-4">{user.role}</p>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2"><Briefcase size={16}/><span>{user.company}</span></div>
                    <div className="flex items-center gap-2"><MapPin size={16}/><span>{user.location || 'México'}</span></div>
                </div>
            </div>
        </Card>
      </aside>

      <div className="col-span-1 lg:col-span-2 space-y-4 max-w-2xl mx-auto w-full">
        <Card>
          <div className="flex gap-3">
            <Avatar initials={user.avatar} src={user.avatar_url} />
            <div className="flex-1">
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`¿Qué hay de nuevo, ${user.name.split(' ')[0]}?`} className="w-full p-2 bg-gray-50 dark:bg-slate-900 rounded border-none dark:text-white text-sm" rows={3} />
              <div className="flex justify-between items-center mt-2">
                <label className="cursor-pointer p-2 hover:bg-blue-50 rounded-full"><Image size={20} className="text-blue-600"/><input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setSelectedFiles(prev => [...prev, ...files]);
                    setPreviews(prev => [...prev, ...files.map(f => ({ url: URL.createObjectURL(f), type: f.type.startsWith('image/') ? 'image' : 'video' }))]);
                }}/></label>
                <Button onClick={publish} disabled={isUploading || (!text && selectedFiles.length === 0)} className="text-sm px-6 rounded-full">{isUploading ? <Loader2 className="animate-spin" size={18}/> : 'Publicar'}</Button>
              </div>
            </div>
          </div>
        </Card>

        {loading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin text-blue-600"/></div> : (
            <div className="space-y-4">
                {posts.map(post => (
                    <PostItem key={post.id} post={post} user={user} onVote={handleVote} onDelete={handleDeletePost} onUpdate={handleUpdatePost} onToggleComments={() => toggleComments(post.id)} showComments={activeCommentsPostId === post.id} comments={commentsData[post.id]} onCommentAction={commentActions} onOpenDetail={setFullScreenPost} onViewProfile={onViewProfile} />
                ))}
            </div>
        )}
      </div>
      <aside className="hidden lg:block lg:col-span-1">
        <Card className="p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Briefcase size={18} className="text-blue-500"/> Empleos</h3>
            {JOBS_DATA.slice(0, 2).map(job => (
                <div key={job.id} className="border-b dark:border-slate-700 pb-2 mb-2 last:border-0">
                    <h4 className="font-semibold text-sm">{job.title}</h4>
                    <p className="text-xs text-gray-500">{job.company}</p>
                </div>
            ))}
        </Card>
      </aside>
    </div>
  );
};

export default FeedView;