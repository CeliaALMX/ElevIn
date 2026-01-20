import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical, Edit2, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react';
import Avatar from '../ui/Avatar';

const CommentItem = ({ comment, user, onDelete, onEdit, onVote }) => {
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
    <div className="flex gap-2 group relative items-start">
      <Avatar 
        initials={comment.profiles?.avatar_initials || 'User'} 
        src={comment.profiles?.avatar_url}
        size="sm" 
      />
      <div className="flex-1 min-w-0">
        {/* Burbuja del comentario */}
        <div className="bg-gray-50 dark:bg-slate-700/50 p-2.5 rounded-2xl rounded-tl-none relative">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              {comment.profiles?.full_name}
            </span>
            
            {isOwner && !isEditing && (
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded transition-opacity"
                >
                  <MoreVertical size={14} />
                </button>
                
                {showMenu && (
                  <div className="absolute right-0 top-5 w-28 bg-white dark:bg-slate-800 shadow-xl rounded-md border border-gray-100 dark:border-slate-600 z-50 overflow-hidden text-xs">
                    <button 
                      onClick={() => { setIsEditing(true); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-blue-600"
                    >
                      <Edit2 size={12} /> Editar
                    </button>
                    <button 
                      onClick={() => onDelete(comment.id)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600"
                    >
                      <Trash2 size={12} /> Eliminar
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
                <button onClick={() => setIsEditing(false)} className="text-xs text-gray-500 hover:underline">Cancelar</button>
                <button onClick={handleUpdate} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Guardar</button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
              {comment.content}
            </p>
          )}
        </div>

        {/* Barra de Acciones (Like, Dislike, Fecha) */}
        <div className="flex items-center gap-3 mt-1 ml-1">
           <span className="text-[10px] text-gray-400">
             {new Date(comment.created_at).toLocaleDateString()}
           </span>
           
           <div className="flex items-center gap-2">
             <button 
               onClick={() => onVote(comment.id, 'like')}
               className={`flex items-center gap-1 text-[10px] transition-colors ${comment.user_vote === 'like' ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-blue-600'}`}
             >
                <ThumbsUp size={12} className={comment.user_vote === 'like' ? 'fill-blue-600' : ''} />
                {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
             </button>
             
             <button 
               onClick={() => onVote(comment.id, 'dislike')}
               className={`flex items-center gap-1 text-[10px] transition-colors ${comment.user_vote === 'dislike' ? 'text-red-500 font-bold' : 'text-gray-500 hover:text-red-500'}`}
             >
                <ThumbsDown size={12} className={comment.user_vote === 'dislike' ? 'fill-red-500' : ''} />
                {comment.dislikes_count > 0 && <span>{comment.dislikes_count}</span>}
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CommentItem;