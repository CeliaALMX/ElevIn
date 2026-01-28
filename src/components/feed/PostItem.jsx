import React, { useState, useRef, useEffect } from 'react';
import {
  ThumbsUp, ThumbsDown, MessageSquare, Share2, MoreHorizontal,
  Edit2, Trash2, Loader2, Video, Send, X
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import Card from '../ui/Card';
import Button from '../ui/Button';
import CommentItem from './CommentItem';

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
  onOpenDetail,
  onViewProfile // <--- NUEVA PROP RECIBIDA
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const [showMenu, setShowMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const mediaList = post.media?.length > 0
    ? post.media
    : (post.image_url ? [{ type: 'image', url: post.image_url }] : (post.video_url ? [{ type: 'video', url: post.video_url }] : []));

  const [editMedia, setEditMedia] = useState(mediaList);

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

  // Verifica si el usuario actual es el propietario del post
  const isOwner = user.id === post.user_id;

  // Mantener texto y media en sync cuando cambie el post (ej. refresh del feed)
  useEffect(() => {
    setEditText(post.content || '');
    setEditMedia(mediaList);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  const removeMediaAt = (index) => {
    setEditMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdate(post.id, editText, editMedia);
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

  const renderMediaGrid = (list, editable = false) => {
    if (!list || list.length === 0) return null;

    const count = list.length;
    let gridClass = "grid-cols-1";
    if (count === 2) gridClass = "grid-cols-2";
    if (count >= 3) gridClass = "grid-cols-2";

    return (
      <div
        className={`grid ${gridClass} gap-1 rounded-lg overflow-hidden mb-3 border border-gray-100 dark:border-slate-700 ${!editable ? 'cursor-pointer' : ''}`}
        onClick={() => !editable && onOpenDetail(post)}
      >
        {list.slice(0, 4).map((media, idx) => (
          <div key={idx} className={`relative ${count === 3 && idx === 0 ? 'row-span-2' : ''} h-64 bg-black`}>
            {media.type === 'video' ? (
              <>
                <video src={media.url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Video className="text-white drop-shadow-md" size={32} />
                </div>
              </>
            ) : (
              <img src={media.url} alt={`Media ${idx}`} className="w-full h-full object-cover" />
            )}

            {idx === 3 && count > 4 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xl">
                +{count - 4}
              </div>
            )}

            {editable && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeMediaAt(idx);
                }}
                className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80"
                title="Quitar"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex gap-3 mb-2 items-start">
        {/* --- NUEVO: WRAPPER CON ONCLICK --- */}
        <div
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer group"
          onClick={() => onViewProfile && onViewProfile(post.user_id)}
        >
          <Avatar initials={post.profiles?.avatar_initials || '??'} src={post.profiles?.avatar_url} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-col">
              <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                {post.profiles?.full_name || 'Usuario'}
              </h4>
              <span className="text-[10px] text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900 px-2 py-0.5 rounded-full inline-block mt-0.5 w-fit">
                {post.profiles?.role || 'Miembro'}
              </span>
            </div>
          </div>
        </div>

        {/* Menú de opciones: Solo visible para el propietario (isOwner) */}
        {isOwner && !isEditing && (
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(!showMenu)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 shrink-0">
              <MoreHorizontal size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-6 w-32 bg-white dark:bg-slate-800 shadow-xl rounded-md border border-gray-100 dark:border-slate-600 z-50 overflow-hidden text-xs">
                <button
                  onClick={() => { setIsEditing(true); setEditText(post.content || ''); setEditMedia(mediaList); setShowMenu(false); }}
                  className="w-full text-left px-3 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-blue-600"
                >
                  <Edit2 size={14} /> Editar
                </button>
                <button
                  onClick={() => { if (window.confirm('¿Eliminar publicación?')) onDelete(post.id); }}
                  className="w-full text-left px-3 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600"
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="mb-3">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full p-2 text-sm bg-gray-50 dark:bg-slate-900 border border-blue-200 rounded resize-none dark:text-white mb-2"
            rows={4}
          />

          {/* ✅ MEDIA VISIBLE EN EDICIÓN + BOTÓN QUITAR */}
          {renderMediaGrid(editMedia, true)}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setIsEditing(false); setEditText(post.content); setEditMedia(mediaList); }}
              className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded"
            >
              Cancelar
            </button>
            <Button onClick={handleSave} disabled={isSaving} className="text-xs px-4 py-1.5 rounded h-auto">
              {isSaving ? <Loader2 className="animate-spin" size={14} /> : 'Guardar'}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {post.content && <p className="text-gray-800 dark:text-gray-200 text-sm mb-3 whitespace-pre-wrap">{post.content}</p>}
          {renderMediaGrid(mediaList)}
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
                {sendingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default PostItem;
