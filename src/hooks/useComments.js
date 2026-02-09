import { useState } from 'react';
import { supabase, validateSession } from '../lib/supabase'; // IMPORTAR
import { useNotifications } from '../context/NotificationContext';

export const useComments = (setPosts, user) => {
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
  const [commentsData, setCommentsData] = useState({});
  const [loadingComments, setLoadingComments] = useState(false);
  const { notify } = useNotifications();

  const sortComments = (comments) => {
    return [...comments].sort((a, b) => {
      const scoreA = (a.likes_count || 0) - (a.dislikes_count || 0);
      const scoreB = (b.likes_count || 0) - (b.dislikes_count || 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(a.created_at) - new Date(b.created_at);
    });
  };

  const refreshPostCommentsCount = async (postId) => {
    try {
      const { count } = await supabase
        .from('post_comments')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId);

      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments_count: count || 0 } : p)));
    } catch (e) {
      // Si falla, no bloqueamos UI.
      console.warn('refreshPostCommentsCount error:', e);
    }
  };

  const fetchComments = async (postId) => {
    setLoadingComments(true);
    try {
      // Guardia suave: si expira el token en background, lo renueva.
      await validateSession().catch(() => {});

      const { data: comments, error } = await supabase
        .from('post_comments')
        .select(`*, profiles (full_name, avatar_initials, avatar_url)`)
        .eq('post_id', postId);

      if (error) throw error;
      await refreshPostCommentsCount(postId);

      const commentIds = (comments || []).map((c) => c.id);
      let voteMap = {};
      if (commentIds.length > 0) {
        const { data: votes } = await supabase
          .from('comment_votes')
          .select('comment_id, vote_type')
          .eq('user_id', user.id)
          .in('comment_id', commentIds);

        votes?.forEach((v) => (voteMap[v.comment_id] = v.vote_type));
      }

      const processed = (comments || []).map((c) => ({
        ...c,
        user_vote: voteMap[c.id] || null,
        likes_count: c.likes_count || 0,
        dislikes_count: c.dislikes_count || 0,
      }));

      setCommentsData((prev) => ({ ...prev, [postId]: sortComments(processed) }));
    } catch (e) {
      console.warn('fetchComments error:', e);
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleComments = (postId) => {
    if (activeCommentsPostId === postId) { setActiveCommentsPostId(null); return; }
    setActiveCommentsPostId(postId);
    fetchComments(postId);
  };

  const addComment = async (postId, content, postOwnerId) => {
    if (!content?.trim()) return;

    try {
        // --- GUARDIA DE SESIÓN ---
        await validateSession();
        // -------------------------

        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p));
        
        const { error } = await supabase.from('post_comments').insert({ post_id: postId, user_id: user.id, content });
        if (error) throw error;

        if (postOwnerId) await notify({ recipientId: postOwnerId, type: 'comment', entityId: postId });
        
        await fetchComments(postId);
        await refreshPostCommentsCount(postId);

    } catch (error) {
        console.error('Error adding comment:', error);
        alert('No se pudo enviar el comentario. Intenta de nuevo.');
        await refreshPostCommentsCount(postId); // Revertir conteo si falla
    }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm('¿Eliminar comentario?')) return;
    try {
        await validateSession(); // Guardia

        let postId = Object.keys(commentsData).find(pid => commentsData[pid]?.some(c => c.id === commentId));
        if (postId) {
            setPosts(prev => prev.map(p => String(p.id) === String(postId) ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) } : p));
        }

        const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
        if (error) throw error;

        setCommentsData(prev => {
            const next = { ...prev };
            for (const pid in next) next[pid] = next[pid].filter(c => c.id !== commentId);
            return next;
        });
        if (postId) await refreshPostCommentsCount(postId);

    } catch (e) {
        alert("Error eliminando comentario.");
    }
  };

  const editComment = async (commentId, content) => {
    try {
        await validateSession();
        const { error } = await supabase.from('post_comments').update({ content }).eq('id', commentId);
        if (error) throw error;
        setCommentsData(prev => {
            const next = { ...prev };
            for (const pid in next) next[pid] = next[pid].map(c => (c.id === commentId ? { ...c, content } : c));
            return next;
        });
    } catch (e) { alert("Error editando."); }
  };

  const voteComment = async (commentId, type) => {
    let targetPostId = null;
    let targetCommentIndex = -1;
    let oldComment = null;
    for (const pid in commentsData) {
      const idx = commentsData[pid].findIndex(c => c.id === commentId);
      if (idx !== -1) { targetPostId = pid; targetCommentIndex = idx; oldComment = commentsData[pid][idx]; break; }
    }
    if (!oldComment) return;

    const previousVote = oldComment.user_vote;
    let newVote = type;
    if (previousVote === type) newVote = null;

    const updatedComment = { ...oldComment, user_vote: newVote };
    if (previousVote === 'like') updatedComment.likes_count--;
    if (previousVote === 'dislike') updatedComment.dislikes_count--;
    if (newVote === 'like') updatedComment.likes_count++;
    if (newVote === 'dislike') updatedComment.dislikes_count++;

    setCommentsData(prev => {
      const list = [...prev[targetPostId]];
      list[targetCommentIndex] = updatedComment;
      return { ...prev, [targetPostId]: sortComments(list) };
    });

    try {
      await validateSession().catch(() => {});
      if (newVote === null) await supabase.from('comment_votes').delete().match({ user_id: user.id, comment_id: commentId });
      else await supabase.from('comment_votes').upsert({ user_id: user.id, comment_id: commentId, vote_type: newVote }, { onConflict: 'user_id,comment_id' });
    } catch (err) { console.error(err); if (targetPostId) await fetchComments(targetPostId); }
  };

  return {
    activeCommentsPostId, commentsData, loadingComments, toggleComments, fetchComments,
    commentActions: { add: addComment, delete: deleteComment, edit: editComment, vote: voteComment },
  };
};
