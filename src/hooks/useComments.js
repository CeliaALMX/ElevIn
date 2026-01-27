import { useState } from 'react';
import { supabase } from '../lib/supabase';

export const useComments = (setPosts, user) => {
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
  const [commentsData, setCommentsData] = useState({});
  const [loadingComments, setLoadingComments] = useState(false);

  const sortComments = (comments) => {
    return [...comments].sort((a, b) => {
      const scoreA = (a.likes_count || 0) - (a.dislikes_count || 0);
      const scoreB = (b.likes_count || 0) - (b.dislikes_count || 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(a.created_at) - new Date(b.created_at);
    });
  };

  // ✅ Fuente única de verdad del contador (igual idea que likes/dislikes, pero basado en total real)
  const refreshPostCommentsCount = async (postId) => {
    const { count, error } = await supabase
      .from('post_comments')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) {
      console.error('Error contando comentarios:', error);
      return;
    }

    const realCount = count || 0;
    setPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, comments_count: realCount } : p))
    );
  };

  const fetchComments = async (postId) => {
    setLoadingComments(true);

    const { data: comments, error } = await supabase
      .from('post_comments')
      .select(`*, profiles (full_name, avatar_initials, avatar_url)`)
      .eq('post_id', postId);

    if (error) {
      console.error('Error comentarios:', error);
      setLoadingComments(false);
      return;
    }

    // IMPORTANTÍSIMO: aunque no abras comentarios, el contador del feed debe ser real.
    // Aquí también lo actualizamos por si entra por modal o por toggle.
    await refreshPostCommentsCount(postId);

    // Votos del usuario por comentario (para UI)
    const commentIds = (comments || []).map(c => c.id);
    let voteMap = {};

    if (commentIds.length > 0) {
      const { data: votes, error: votesError } = await supabase
        .from('comment_votes')
        .select('comment_id, vote_type')
        .eq('user_id', user.id)
        .in('comment_id', commentIds);

      if (votesError) {
        console.warn('No se pudieron cargar comment_votes:', votesError);
      } else if (votes) {
        votes.forEach(v => (voteMap[v.comment_id] = v.vote_type));
      }
    }

    const processedComments = (comments || []).map(c => ({
      ...c,
      user_vote: voteMap[c.id] || null,
      likes_count: c.likes_count || 0,
      dislikes_count: c.dislikes_count || 0,
    }));

    setCommentsData(prev => ({
      ...prev,
      [postId]: sortComments(processedComments),
    }));

    setLoadingComments(false);
  };

  const toggleComments = (postId) => {
    if (activeCommentsPostId === postId) {
      setActiveCommentsPostId(null);
      return;
    }
    setActiveCommentsPostId(postId);
    fetchComments(postId);
  };

  const addComment = async (postId, content) => {
    if (!content?.trim()) return;

    // ✅ Optimista como likes/dislikes
    setPosts(prev =>
      prev.map(p =>
        p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p
      )
    );

    const { error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, user_id: user.id, content });

    if (error) {
      console.error('Error insert comment:', error);
      // Revertir optimista con el conteo real
      await refreshPostCommentsCount(postId);
      alert('No se pudo comentar. Revisa permisos (RLS) o conexión.');
      return;
    }

    // Refrescar lista y corregir contador al total real
    await fetchComments(postId);
    await refreshPostCommentsCount(postId);
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm('¿Eliminar comentario?')) return;

    // Encontrar el postId dueño del comentario para actualizar contador
    let postId = null;
    for (const pid in commentsData) {
      if (commentsData[pid]?.some(c => c.id === commentId)) {
        postId = pid;
        break;
      }
    }

    // Optimista
    if (postId) {
      setPosts(prev =>
        prev.map(p =>
          String(p.id) === String(postId)
            ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) }
            : p
        )
      );
    }

    const { error } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error delete comment:', error);
      if (postId) await refreshPostCommentsCount(postId);
      alert('No se pudo eliminar el comentario. Revisa permisos (RLS).');
      return;
    }

    // Quitar del estado local
    setCommentsData(prev => {
      const next = { ...prev };
      for (const pid in next) {
        next[pid] = next[pid].filter(c => c.id !== commentId);
      }
      return next;
    });

    if (postId) await refreshPostCommentsCount(postId);
  };

  const editComment = async (commentId, content) => {
    const { error } = await supabase
      .from('post_comments')
      .update({ content })
      .eq('id', commentId);

    if (error) {
      console.error('Error edit comment:', error);
      alert('No se pudo editar el comentario.');
      return;
    }

    setCommentsData(prev => {
      const next = { ...prev };
      for (const pid in next) {
        next[pid] = next[pid].map(c => (c.id === commentId ? { ...c, content } : c));
      }
      return next;
    });
  };

  // (tus reacciones a comentarios las dejamos tal cual por ahora; ahorita estamos enfocando feed counter)
  const voteComment = async (commentId, type) => {
    let targetPostId = null;
    let targetCommentIndex = -1;
    let oldComment = null;

    for (const pid in commentsData) {
      const idx = commentsData[pid].findIndex(c => c.id === commentId);
      if (idx !== -1) {
        targetPostId = pid;
        targetCommentIndex = idx;
        oldComment = commentsData[pid][idx];
        break;
      }
    }

    if (!oldComment) return;

    const previousVote = oldComment.user_vote;
    let newVote = type;
    if (previousVote === type) newVote = null;

    const updatedComment = { ...oldComment, user_vote: newVote };

    if (previousVote === 'like') updatedComment.likes_count = Math.max(0, (updatedComment.likes_count || 0) - 1);
    if (previousVote === 'dislike') updatedComment.dislikes_count = Math.max(0, (updatedComment.dislikes_count || 0) - 1);
    if (newVote === 'like') updatedComment.likes_count = (updatedComment.likes_count || 0) + 1;
    if (newVote === 'dislike') updatedComment.dislikes_count = (updatedComment.dislikes_count || 0) + 1;

    setCommentsData(prev => {
      const list = [...prev[targetPostId]];
      list[targetCommentIndex] = updatedComment;
      return { ...prev, [targetPostId]: sortComments(list) };
    });

    try {
      if (newVote === null) {
        const { error } = await supabase
          .from('comment_votes')
          .delete()
          .match({ user_id: user.id, comment_id: commentId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('comment_votes')
          .upsert(
            { user_id: user.id, comment_id: commentId, vote_type: newVote },
            { onConflict: 'user_id,comment_id' }
          );
        if (error) throw error;
      }
    } catch (err) {
      console.error('Error votando comentario:', err);
      if (targetPostId) await fetchComments(targetPostId);
    }
  };

  return {
    activeCommentsPostId,
    commentsData,
    loadingComments,
    toggleComments,
    fetchComments,
    commentActions: {
      add: addComment,
      delete: deleteComment,
      edit: editComment,
      vote: voteComment,
    },
  };
};