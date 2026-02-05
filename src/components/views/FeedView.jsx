import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Video, Image, Briefcase, MapPin, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useComments } from '../../hooks/useComments';
import { uploadFileToSupabase } from '../../helpers/fileUpload';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import PostItem from '../feed/PostItem';
import PostDetailModal from '../modals/PostDetailModal';
import { JOBS_DATA } from '../../data/mockData';
import { useNotifications } from '../../context/NotificationContext'; // <--- Importar Contexto

const FeedView = ({ user, onViewProfile }) => {
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedType, setFeedType] = useState('for_you');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]); // [{ url, type }]
  const [isUploading, setIsUploading] = useState(false);
  const [fullScreenPost, setFullScreenPost] = useState(null);

  const { notify } = useNotifications(); // <--- Hook

  const fileInputRef = useRef(null);

  const {
    activeCommentsPostId,
    commentsData,
    toggleComments,
    fetchComments,
    commentActions,
  } = useComments(setPosts, user);

  const getCommentsCount = async (postId) => {
    const { count, error } = await supabase
      .from('post_comments')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId);
    return error ? 0 : count || 0;
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let postsQuery = supabase
        .from('posts')
        .select(`*, profiles (full_name, role, avatar_initials, avatar_url, company)`);

      // ✅ REGLA DE PRIVACIDAD: Solo aplica si NO es Empresa
      if (user.role !== 'Empresa') {
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        const followingIds = followingData?.map(f => f.following_id) || [];
        const allowedIds = [user.id, ...followingIds];
        postsQuery = postsQuery.in('user_id', allowedIds);
      }

      const { data: postsData, error } = await postsQuery.order('created_at', { ascending: false });
      if (error) throw error;

      // Cargar interacciones (votos y comentarios)
      const { data: userVotes } = await supabase
        .from('post_votes')
        .select('post_id, vote_type')
        .eq('user_id', user.id);

      const voteMap = {};
      userVotes?.forEach(v => (voteMap[v.post_id] = v.vote_type));

      const ids = (postsData || []).map(p => p.id);
      const counts = await Promise.all(ids.map(id => getCommentsCount(id)));
      const countMap = {};
      ids.forEach((id, idx) => (countMap[id] = counts[idx] || 0));

      let finalPosts = (postsData || []).map(p => ({
        ...p,
        likes_count: p.likes_count || 0,
        dislikes_count: p.dislikes_count || 0,
        comments_count: countMap[p.id] ?? 0,
        user_vote: voteMap[p.id] || null,
      }));

      // Ordenar por relevancia si es "Para ti"
      if (feedType === 'for_you') {
        finalPosts.sort((a, b) => {
          const aRelevant = a.profiles?.role === user.role ? 1 : 0;
          const bRelevant = b.profiles?.role === user.role ? 1 : 0;
          return bRelevant - aRelevant || new Date(b.created_at) - new Date(a.created_at);
        });
      }

      setPosts(finalPosts);
    } catch (err) {
      console.error('Error cargando feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [feedType]);

  // ✅ Cleanup: revocar object URLs al desmontar o cuando cambien
  useEffect(() => {
    return () => {
      previews.forEach(p => {
        try { URL.revokeObjectURL(p.url); } catch (_) {}
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removePreviewAt = (index) => {
    setPreviews((prev) => {
      const item = prev[index];
      if (item?.url) {
        try { URL.revokeObjectURL(item.url); } catch (_) {}
      }
      return prev.filter((_, i) => i !== index);
    });

    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));

    // Si ya no hay nada, limpia el input para que puedas volver a subir el mismo archivo
    setTimeout(() => {
      if (fileInputRef.current && (selectedFiles.length - 1) <= 0) {
        fileInputRef.current.value = '';
      }
    }, 0);
  };

  const handleSelectFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles(prev => [...prev, ...files]);

    const newPreviews = files.map(f => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith('image/') ? 'image' : 'video'
    }));

    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const clearComposer = () => {
    // revocar URLs
    previews.forEach(p => {
      try { URL.revokeObjectURL(p.url); } catch (_) {}
    });
    setText('');
    setSelectedFiles([]);
    setPreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const publish = async () => {
    if (!text.trim() && selectedFiles.length === 0) return;
    setIsUploading(true);
    try {
      const uploadedMedia = [];
      for (const file of selectedFiles) {
        const url = await uploadFileToSupabase(file, user.id);
        if (url) uploadedMedia.push({ type: file.type.startsWith('image/') ? 'image' : 'video', url });
      }

      const { error } = await supabase
        .from('posts')
        .insert([{ user_id: user.id, content: text, media: uploadedMedia }]);

      if (error) throw error;

      clearComposer();
      fetchPosts();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleVote = async (postId, type) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const currentVote = post.user_vote;
    const newVote = currentVote === type ? null : type;

    setPosts(posts.map(p => {
      if (p.id !== postId) return p;
      let l = p.likes_count, d = p.dislikes_count;
      if (currentVote === 'like') l--;
      if (currentVote === 'dislike') d--;
      if (newVote === 'like') l++;
      if (newVote === 'dislike') d++;
      return { ...p, user_vote: newVote, likes_count: l, dislikes_count: d };
    }));

    if (currentVote) await supabase.from('post_votes').delete().match({ user_id: user.id, post_id: postId });
    if (newVote) {
        await supabase.from('post_votes').upsert({ user_id: user.id, post_id: postId, vote_type: newVote });

        // --- TRIGGER NOTIFICATION ---
        await notify({ recipientId: post.user_id, type: newVote, entityId: postId });
        // ----------------------------
    } 

    const rpc = newVote === 'like'
      ? 'increment_likes'
      : (newVote === 'dislike'
        ? 'increment_dislikes'
        : (currentVote === 'like'
          ? 'decrement_likes'
          : 'decrement_dislikes'));

    await supabase.rpc(rpc, { post_id: postId });
  };

  const handleDeletePost = async (postId) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id);
    if (!error) setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleUpdatePost = async (postId, newContent, newMedia) => {
    const updates = { content: newContent };
  
    // Si viene media (aunque sea []), la guardamos para mantener/eliminar
    if (Array.isArray(newMedia)) updates.media = newMedia;
  
    const { error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', postId)
      .eq('user_id', user.id);
  
    if (!error) {
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, content: newContent, media: Array.isArray(newMedia) ? newMedia : p.media }
            : p
        )
      );
    }
  };
  

  return (
    <div className="pt-6 px-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
      <PostDetailModal
        post={fullScreenPost}
        onClose={() => setFullScreenPost(null)}
        user={user}
        commentsData={commentsData}
        commentActions={commentActions}
        fetchComments={fetchComments}
      />

      <aside className="hidden lg:block lg:col-span-1 space-y-4">
      <Card className="sticky top-24 overflow-hidden border-none shadow-xl">
        <div className="relative h-28 bg-emerald-dark">
            {user.cover_url
              ? <img src={user.cover_url} alt="Portada" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-r from-emerald-deep to-emerald-medium" />
            }
            <div className="absolute -bottom-10 left-4">
              <div className="p-1 bg-white dark:bg-emerald-medium rounded-full ring-4 ring-ivory dark:ring-emerald-deep">
                <Avatar initials={user.avatar} src={user.avatar_url} size="lg" />
              </div>
            </div>
          </div>
          <div className="px-4 pb-4 pt-14">
            <h2 className="text-xl font-bold text-emerald-deep dark:text-ivory">{user.name}</h2>
            <p className="text-sm text-gold-premium font-medium mb-4">{user.role}</p>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2 text-gold-champagne"><Briefcase size={16} /><span>{user.company}</span></div>
              <div className="flex items-center gap-2 text-gold-champagne"><MapPin size={16} /><span>{user.location || 'México'}</span></div>
            </div>
          </div>
        </Card>
      </aside>

      <div className="col-span-1 lg:col-span-2 space-y-4 max-w-2xl mx-auto w-full">
        <Card>
          <div className="flex gap-3">
            <Avatar initials={user.avatar} src={user.avatar_url} />
            <div className="flex-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`¿Qué hay de nuevo, ${user.name.split(' ')[0]}?`}
                className="w-full p-2 bg-gray-50 dark:bg-slate-900 rounded border-none dark:text-white text-sm"
                rows={3}
              />

              {/* PREVIEW DE IMAGENES EN EL POST */}
              {previews.length > 0 && (
                <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {previews.map((p, idx) => (
                    <div key={`${p.url}-${idx}`} className="relative rounded-lg overflow-hidden bg-black/90">
                      <button
                        type="button"
                        onClick={() => removePreviewAt(idx)}
                        className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 z-10"
                        title="Quitar"
                      >
                        <X size={16} />
                      </button>

                      {p.type === 'video' ? (
                        <video src={p.url} controls className="w-full h-16 object-cover" />
                      ) : (
                        <img src={p.url} alt="Preview" className="w-full h-16 object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center mt-2">
                <label className="cursor-pointer p-2 hover:bg-blue-50 rounded-full">
                  <Image size={20} className="text-blue-600" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleSelectFiles}
                  />
                </label>

                <Button
                  onClick={publish}
                  disabled={isUploading || (!text && selectedFiles.length === 0)}
                  className="text-sm px-6 rounded-full"
                >
                  {isUploading ? <Loader2 className="animate-spin" size={18} /> : 'Publicar'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-4">
            {posts.length > 0 ? posts.map(post => (
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
                onViewProfile={onViewProfile}
              />
            )) : (
              <Card className="p-8 text-center text-gray-500 italic">
                {user.role === 'Empresa'
                  ? 'No hay publicaciones disponibles en la red.'
                  : 'Sigue a otros técnicos para ver sus publicaciones aquí.'}
              </Card>
            )}
          </div>
        )}
      </div>

      <aside className="hidden lg:block lg:col-span-1">
        <Card className="p-4">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Briefcase size={18} className="text-gold-champagne" /> Empleos
          </h3>
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