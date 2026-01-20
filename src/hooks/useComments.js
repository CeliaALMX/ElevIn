import { useState } from 'react';
import { supabase } from '../lib/supabase';

export const useComments = (setPosts, user) => {
  const [activeCommentsPostId, setActiveCommentsPostId] = useState(null);
  const [commentsData, setCommentsData] = useState({});
  const [loadingComments, setLoadingComments] = useState(false);

  // Función auxiliar para ordenar: Más likes arriba, luego por fecha
  const sortComments = (comments) => {
    return comments.sort((a, b) => {
      const scoreA = (a.likes_count || 0) - (a.dislikes_count || 0);
      const scoreB = (b.likes_count || 0) - (b.dislikes_count || 0);
      if (scoreB !== scoreA) return scoreB - scoreA; // Mayor puntaje primero
      return new Date(a.created_at) - new Date(b.created_at); // Más antiguos primero (estilo chat)
    });
  };

  const fetchComments = async (postId) => {
    setLoadingComments(true);
    
    // 1. Traer comentarios
    const { data: comments, error } = await supabase
      .from('post_comments')
      .select(`*, profiles (full_name, avatar_initials, avatar_url)`)
      .eq('post_id', postId);

    if (error) {
      console.error("Error comentarios:", error);
      setLoadingComments(false);
      return;
    }

    // 2. Traer votos del usuario actual para estos comentarios (para pintar el botón azul/rojo)
    // NOTA: Asumimos que existe una tabla 'comment_votes' (id, user_id, comment_id, vote_type)
    // Si no tienes la tabla, esta parte fallará silenciosamente o retornará vacío.
    const commentIds = comments.map(c => c.id);
    let voteMap = {};
    
    if (commentIds.length > 0) {
      const { data: votes } = await supabase
        .from('comment_votes')
        .select('comment_id, vote_type')
        .eq('user_id', user.id)
        .in('comment_id', commentIds);
        
      if (votes) {
        votes.forEach(v => voteMap[v.comment_id] = v.vote_type);
      }
    }

    // 3. Traer contadores totales (Simulado via RPC o calculado manualmente)
    // Para simplificar sin crear funciones SQL complejas, asumiremos que
    // el trigger de base de datos actualiza likes_count/dislikes_count en la tabla post_comments.
    // Si no tienes triggers, estos valores vendrán en 0.
    
    const processedComments = comments.map(c => ({
      ...c,
      user_vote: voteMap[c.id] || null,
      likes_count: c.likes_count || 0,
      dislikes_count: c.dislikes_count || 0
    }));

    setCommentsData(prev => ({ 
      ...prev, 
      [postId]: sortComments(processedComments) 
    }));
    setLoadingComments(false);
  };

  const toggleComments = (postId) => {
    if (activeCommentsPostId === postId) {
      setActiveCommentsPostId(null);
    } else {
      setActiveCommentsPostId(postId);
      // Siempre refrescar para ver nuevos votos/orden
      fetchComments(postId);
    }
  };

  const addComment = async (postId, content) => {
    const { error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, user_id: user.id, content });

    if (!error) {
      await fetchComments(postId);
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p
      ));
    }
  };

  const deleteComment = async (commentId) => {
    if(!window.confirm("¿Eliminar comentario?")) return;
    const { error } = await supabase.from('post_comments').delete().eq('id', commentId);

    if (!error) {
      setCommentsData(prev => {
        const newState = { ...prev };
        for(const pid in newState) {
           if(newState[pid].find(c => c.id === commentId)) {
              newState[pid] = newState[pid].filter(c => c.id !== commentId);
              setPosts(curr => curr.map(p => 
                String(p.id) === String(pid) ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) } : p
              ));
           }
        }
        return newState;
      });
    }
  };

  const editComment = async (commentId, content) => {
    const { error } = await supabase.from('post_comments').update({ content }).eq('id', commentId);
    if (!error) {
      setCommentsData(prev => {
         const newState = { ...prev };
         for(const pid in newState) {
           newState[pid] = newState[pid].map(c => c.id === commentId ? { ...c, content } : c);
         }
         return newState;
      });
    }
  };

  const voteComment = async (commentId, type) => {
    // Encontrar el comentario en el estado local para actualización optimista
    let targetPostId = null;
    let targetCommentIndex = -1;
    let oldComment = null;

    // Buscar en qué post está este comentario
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

    // Lógica de cambio de voto
    const previousVote = oldComment.user_vote;
    let newVote = type;
    if (previousVote === type) newVote = null; // Toggle off

    // Copia para modificar
    let updatedComment = { ...oldComment, user_vote: newVote };

    // Actualizar contadores
    if (previousVote === 'like') updatedComment.likes_count = Math.max(0, updatedComment.likes_count - 1);
    if (previousVote === 'dislike') updatedComment.dislikes_count = Math.max(0, updatedComment.dislikes_count - 1);
    
    if (newVote === 'like') updatedComment.likes_count += 1;
    if (newVote === 'dislike') updatedComment.dislikes_count += 1;

    // Actualizar Estado Optimista
    setCommentsData(prev => {
      const newList = [...prev[targetPostId]];
      newList[targetCommentIndex] = updatedComment;
      return { ...prev, [targetPostId]: sortComments(newList) }; // Reordenar al instante
    });

    // Llamada a DB
    try {
      if (newVote === null) {
        await supabase.from('comment_votes').delete().match({ user_id: user.id, comment_id: commentId });
      } else {
        await supabase.from('comment_votes').upsert(
          { user_id: user.id, comment_id: commentId, vote_type: newVote },
          { onConflict: 'user_id, comment_id' }
        );
      }
      // Opcional: Refetch para asegurar consistencia
      // fetchComments(targetPostId); 
    } catch (err) {
      console.error("Error votando comentario:", err);
      // Revertir en caso de error (opcional)
    }
  };

  return {
    activeCommentsPostId,
    commentsData,
    loadingComments,
    toggleComments,
    // Exponemos una función específica para cargar si hace falta (usado en el Modal)
    fetchComments, 
    commentActions: {
      add: addComment,
      delete: deleteComment,
      edit: editComment,
      vote: voteComment
    }
  };
};