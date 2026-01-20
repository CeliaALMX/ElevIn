import React, { useState, useEffect } from 'react';
import { Loader2, Video, Image, X, Layers } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useComments } from '../../hooks/useComments';
import { uploadFileToSupabase } from '../../helpers/fileUpload';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import PostItem from '../feed/PostItem';
import PostDetailModal from '../modals/PostDetailModal';

const FeedView = ({ user }) => {
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Estado para múltiples archivos
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

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setSelectedFiles(prev => [...prev, ...files]);

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

  const publish = async () => {
    if (!text.trim() && selectedFiles.length === 0) return;
    setIsUploading(true);
    console.log("Iniciando publicación..."); 

    try {
      const uploadedMedia = [];
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const url = await uploadFileToSupabase(file, user.id);
          if (url) {
            uploadedMedia.push({
              type: file.type.startsWith('image/') ? 'image' : 'video',
              url: url
            });
          }
        }
      }

      const { error } = await supabase.from('posts').insert([{ 
        user_id: user.id, 
        content: text, 
        media: uploadedMedia 
      }]);

      if (error) throw error;

      setText(''); 
      setSelectedFiles([]); 
      setPreviews([]);
      fetchPosts(); 
    } catch (err) {
      console.error("ERROR EN PUBLISH:", err);
      alert(`Error al publicar: ${err.message || 'Ver consola'}.`);
    } finally {
      setIsUploading(false);
    }
  };

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

export default FeedView;