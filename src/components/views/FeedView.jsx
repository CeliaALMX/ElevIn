import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Image, Briefcase, MapPin, X, UserPlus, Hash } from 'lucide-react';
import { supabase, validateSession } from '../../lib/supabase';
import { useComments } from '../../hooks/useComments';
import { uploadFileToSupabase } from '../../helpers/fileUpload';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import PostItem from '../feed/PostItem';
import PostDetailModal from '../modals/PostDetailModal';
import RecommendationsWidget from '../widgets/RecommendationsWidget';
import { useNotifications } from '../../context/NotificationContext';

const PAGE_SIZE = 6;

const FeedView = ({ user, onViewProfile, targetPostId, onClearTarget }) => {
  const [text, setText] = useState('');
  const [feedType, setFeedType] = useState('for_you');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fullScreenPost, setFullScreenPost] = useState(null);
  
  const [hashtagFilter, setHashtagFilter] = useState(null); 

  // 👇 Estados nuevos solo para el scroll 👇
  const [displayPosts, setDisplayPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const queryClient = useQueryClient();
  const { notify } = useNotifications();
  const fileInputRef = useRef(null);

  // Reiniciar el feed si cambian de usuario o usan un filtro
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    setDisplayPosts([]);
  }, [hashtagFilter, user.id]);

  const fetchFeedData = async (pageNumber) => {
    await validateSession().catch(() => {}); 
    
    const from = pageNumber * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let postsQuery = supabase
      .from('posts')
      .select(`*, profiles (full_name, role, avatar_initials, avatar_url, company)`);

    if (user.role !== 'Empresa') {
      const { data: followingData } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
      const followingIds = followingData?.map(f => f.following_id) || [];
      postsQuery = postsQuery.in('user_id', [user.id, ...followingIds]);
    }

    if (hashtagFilter) {
      postsQuery = postsQuery.ilike('content', `%${hashtagFilter}%`);
    }

    // Pedimos solo el rango de 6 publicaciones
    const { data: postsData, error } = await postsQuery.order('created_at', { ascending: false }).range(from, to);

    if (error) throw error;
    if (!postsData || postsData.length < PAGE_SIZE) setHasMore(false);
    if (!postsData || postsData.length === 0) return [];

    const postIds = postsData.map(p => p.id);
    
    // 👇 AQUÍ ESTÁ EL TURBO (PROMISE.ALL) 👇
    // Pedimos los comentarios y los likes AL MISMO TIEMPO
    const [commentsResponse, votesResponse] = await Promise.all([
      supabase.from('post_comments').select('post_id').in('post_id', postIds),
      supabase.from('post_votes').select('post_id, vote_type').eq('user_id', user.id).in('post_id', postIds)
    ]);

    const allComments = commentsResponse.data;
    const userVotes = votesResponse.data;
    // 👆 FIN DEL TURBO 👆

    const countMap = {};
    allComments?.forEach(c => { countMap[c.post_id] = (countMap[c.post_id] || 0) + 1; });

    const voteMap = {}; 
    userVotes?.forEach(v => (voteMap[v.post_id] = v.vote_type));

    return postsData.map(p => ({
      ...p, likes_count: p.likes_count || 0, dislikes_count: p.dislikes_count || 0, comments_count: countMap[p.id] || 0, user_vote: voteMap[p.id] || null,
    }));
  };

  const { data: initialData, isLoading: loading } = useQuery({
    queryKey: ['feed', feedType, user.id, hashtagFilter, page], 
    queryFn: () => fetchFeedData(page),
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  // Acumular los posts nuevos con los que ya teníamos (ARREGLADO PARA EL PARPADEO)
  useEffect(() => {
    if (initialData) {
      setDisplayPosts(prev => {
        // Si acabamos de publicar (página 0), reemplazamos la lista entera de forma invisible
        if (page === 0) return initialData;
        
        // Si estamos bajando (scroll), los sumamos sin duplicar
        const existingIds = new Set(prev.map(p => p.id));
        const newPosts = initialData.filter(p => !existingIds.has(p.id));
        return [...prev, ...newPosts];
      });
      setIsFetchingMore(false);
    }
  }, [initialData, page]);

  // Sensor para saber cuándo llegamos abajo
  useEffect(() => {
    const handleScroll = () => {
      if (loading || isFetchingMore || !hasMore) return;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100) {
        setIsFetchingMore(true);
        setPage(prev => prev + 1);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, isFetchingMore, hasMore]);

  useEffect(() => {
    if (targetPostId && displayPosts.length > 0) {
      const postToOpen = displayPosts.find(p => String(p.id) === String(targetPostId));
      if (postToOpen) {
        setFullScreenPost(postToOpen);
        if (onClearTarget) onClearTarget();
      }
    }
  }, [targetPostId, displayPosts, onClearTarget]);

  // Modificamos setPosts para que actualice la lista visible sin tocar la BD principal
  const setPosts = (updater) => {
    setDisplayPosts(prev => typeof updater === 'function' ? updater(prev) : updater);
  };

  const { activeCommentsPostId, commentsData, toggleComments, fetchComments, commentActions } = useComments(setPosts, user);

  const handleVote = async (postId, type) => {
    const post = displayPosts.find(p => p.id === postId);
    if (!post) return;
    
    const currentVote = post.user_vote;
    const newVote = currentVote === type ? null : type;

    setPosts(old => old.map(p => {
        if (p.id !== postId) return p;
        let l = p.likes_count, d = p.dislikes_count;
        if (currentVote === 'like') l = Math.max(0, l - 1);
        if (currentVote === 'dislike') d = Math.max(0, d - 1);
        if (newVote === 'like') l++;
        if (newVote === 'dislike') d++;
        return { ...p, user_vote: newVote, likes_count: l, dislikes_count: d };
    }));

    try {
        await validateSession();
        if (currentVote) {
          await supabase.from('post_votes').delete().match({ user_id: user.id, post_id: postId });
          try { await supabase.rpc(currentVote === 'like' ? 'decrement_likes' : 'decrement_dislikes', { post_id: postId }); } catch (e) {}
        }
        if (newVote) {
            const { error: voteError } = await supabase.from('post_votes').upsert({ user_id: user.id, post_id: postId, vote_type: newVote }, { onConflict: 'user_id, post_id' });
            if (voteError) throw voteError;
            try { await supabase.rpc(newVote === 'like' ? 'increment_likes' : 'increment_dislikes', { post_id: postId }); } catch (e) {}

            if (newVote === 'like' && post.user_id !== user.id) {
                notify({ recipientId: post.user_id, type: 'like', entityId: String(postId), message: 'le dio me gusta a tu publicación' }).catch(e => console.warn("Error enviando notificación:", e));
            }
        } 
    } catch (err) { console.error(err); }
  };

  const handleDeletePost = async (postId) => {
    try {
      await validateSession();
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      setPosts(old => old.filter(p => p.id !== postId));
    } catch (err) {
      console.error("Error al borrar:", err.message);
      alert("No se pudo borrar la publicación.");
    }
  };

  const publish = async () => {
    if (!text.trim() && selectedFiles.length === 0) return;
    setIsUploading(true);
    try {
      await validateSession();
      const uploadedMedia = [];
      for (const file of selectedFiles) {
        const url = await uploadFileToSupabase(file, user.id);
        if (url) uploadedMedia.push({ type: file.type.startsWith('image/') ? 'image' : 'video', url });
      }
      const { error } = await supabase.from('posts').insert([{ user_id: user.id, content: text, media: uploadedMedia }]);
      if (error) throw error;
      setText(''); setSelectedFiles([]); setPreviews([]);
      
      // Reiniciamos a la página 0 para ver los nuevos datos
      setPage(0);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      
      // Hacemos scroll suave hacia arriba para que el usuario vea su post
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } catch (err) { alert(`Error: ${err.message}`); } finally { setIsUploading(false); }
  };

  const handleSelectFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSelectedFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(f => ({ url: URL.createObjectURL(f), type: f.type.startsWith('image/') ? 'image' : 'video' }));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removePreviewAt = (index) => { setPreviews(prev => prev.filter((_, i) => i !== index)); setSelectedFiles(prev => prev.filter((_, i) => i !== index)); };

  return (
    <div className="pt-6 px-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
      <PostDetailModal post={fullScreenPost} onClose={() => setFullScreenPost(null)} user={user} commentsData={commentsData} commentActions={commentActions} fetchComments={fetchComments} />
      
      <aside className="hidden lg:block lg:col-span-1 space-y-4">
        <Card className="sticky top-24 overflow-hidden border-none shadow-xl text-center p-0 cursor-pointer hover:shadow-2xl transition-shadow duration-300" onClick={() => onViewProfile(user.id)}>
            <div className="h-20 bg-emerald-dark relative w-full">{user.cover_url ? (<img src={user.cover_url} alt="Portada" className="w-full h-full object-cover"/>) : (<div className="w-full h-full bg-gradient-to-r from-emerald-deep via-emerald-medium to-emerald-dark" />)}</div>
            <div className="relative -mt-10 mb-3 flex justify-center"><Avatar initials={user.avatar} src={user.avatar_url} size="xl" className="ring-4 ring-white dark:ring-slate-800 shadow-sm" /></div>
            <div className="px-6 pb-6">
                <h2 className="text-xl font-bold text-emerald-deep dark:text-ivory">{user.name}</h2>
                <p className="text-sm text-gold-premium font-medium">{user.role}</p>
                <div className="mt-4 pt-4 border-t dark:border-slate-700 text-left space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500"><MapPin size={14}/> {user.location || 'México'}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500"><Briefcase size={14}/> {user.company}</div>
                </div>
            </div>
        </Card>
      </aside>

      <div className="col-span-1 lg:col-span-2 space-y-4 max-w-2xl mx-auto w-full">
        <Card className="p-4 shadow-md">
          <div className="flex gap-3">
            <Avatar initials={user.avatar} src={user.avatar_url} />
            <div className="flex-1">
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`¿Qué tienes en mente, ${user.name.split(' ')[0]}?`} className="w-full p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border-none dark:text-white text-sm focus:ring-1 focus:ring-emerald-500 transition-all" rows={3} />
              {previews.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                  {previews.map((p, i) => (<div key={i} className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden group"><img src={p.url} className="w-full h-full object-cover" /><button onClick={() => removePreviewAt(i)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button></div>))}
                </div>
              )}
              <div className="flex justify-between items-center mt-3 pt-3 border-t dark:border-slate-700">
                <label className="cursor-pointer flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors">
                  <Image size={20} /> <span className="text-xs font-medium">Multimedia</span> <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={handleSelectFiles} />
                </label>
                <Button onClick={publish} disabled={isUploading || (!text && selectedFiles.length === 0)} className="px-6 rounded-full font-bold">{isUploading ? <Loader2 className="animate-spin" size={18} /> : 'Publicar'}</Button>
              </div>
            </div>
          </div>
        </Card>

        {hashtagFilter && (
          <div className="bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-600 p-4 rounded-xl flex justify-between items-center animate-in slide-in-from-top-2 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-slate-700 rounded-full text-blue-600 dark:text-blue-400">
                <Hash size={20} />
              </div>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Explorando tendencia</p>
                <p className="text-lg font-extrabold text-blue-900 dark:text-blue-100">{hashtagFilter}</p>
              </div>
            </div>
            <Button variant="ghost" onClick={() => setHashtagFilter(null)} className="text-gray-500 hover:text-red-500 hover:bg-red-200">
              <X size={18} className="mr-1"/> Quitar filtro
            </Button>
          </div>
        )}

        {loading && page === 0 ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>
        ) : (
          <div className="space-y-4 pb-20">
            {displayPosts.map(post => (
              <PostItem 
                key={post.id} 
                post={post} 
                user={user} 
                onVote={handleVote} 
                onDelete={handleDeletePost} 
                onToggleComments={() => toggleComments(post.id)} 
                showComments={activeCommentsPostId === post.id} 
                comments={commentsData[post.id]} 
                onCommentAction={commentActions}
                onOpenDetail={setFullScreenPost} 
                onViewProfile={onViewProfile} 
                onHashtagClick={setHashtagFilter}
              />
            ))}
            {displayPosts.length === 0 && !loading && <Card className="p-10 text-center text-gray-400 italic">No encontramos publicaciones con este hashtag.</Card>}
          </div>
        )}
      </div>

      <aside className="hidden lg:block lg:col-span-1">
        <Card className="p-4 sticky top-24 shadow-md">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-emerald-deep dark:text-ivory"><UserPlus size={18} className="text-gold-champagne" /> Personas sugeridas</h3>
          <RecommendationsWidget user={user} limit={5} compact={true} />
        </Card>
      </aside>
    </div>
  );
};

export default FeedView;