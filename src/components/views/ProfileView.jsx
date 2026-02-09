import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Briefcase, Mail, Phone, Edit2, X, Save, Plus, Trash2, CheckCircle, ArrowUpCircle, Loader2, MessageSquare, MessageCircle } from 'lucide-react';
import { supabase, validateSession } from '../../lib/supabase'; // IMPORTAR
import { uploadFileToSupabase } from '../../helpers/fileUpload';
import { useComments } from '../../hooks/useComments';
import { useChat } from '../../hooks/useChat';
import { useNotifications } from '../../context/NotificationContext';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import PostItem from '../feed/PostItem';

const ProfileView = ({ user, currentUser, onProfileUpdate, onViewProfile }) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  
  const [editingExpId, setEditingExpId] = useState(null);
  const [tempExp, setTempExp] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);

  const queryClient = useQueryClient();
  const { openChatWithUser } = useChat();
  const { notify } = useNotifications();

  const isOwner = currentUser?.id && user?.id && user.id === currentUser.id;
  const isCompanyProfile = user?.role === 'Empresa';
  const [displayUser, setDisplayUser] = useState(user || {});

  const [formData, setFormData] = useState({
    full_name: '', role: '', company: '', location: '', bio: '',
    phone: '', email: '', certifications: '', projects: '', experience: [] 
  });

  useEffect(() => {
    if(user) setDisplayUser(user);
    if (!editing && user) {
        setFormData({
            full_name: user.name || user.full_name || '', role: user.role || '', company: user.company || '',
            location: user.location || '', bio: user.bio || '', phone: user.phone || '', email: user.email || '',
            experience: Array.isArray(user.experience) ? user.experience : []
        });
    }
  }, [user, editing]);

  const fetchUserPostsData = async () => {
    // Optional check
    await validateSession().catch(() => {});
    const { data: postsData } = await supabase.from('posts').select(`*, profiles (full_name, role, avatar_initials, avatar_url, company)`).eq('user_id', user.id).order('created_at', { ascending: false });
    const { data: userVotes } = await supabase.from('post_votes').select('post_id, vote_type').eq('user_id', currentUser.id);
    const voteMap = {}; userVotes?.forEach(v => (voteMap[v.post_id] = v.vote_type));
    
    const ids = (postsData || []).map(p => p.id);
    const counts = await Promise.all(ids.map(async id => {
       const { count } = await supabase.from('post_comments').select('id', { count: 'exact', head: true }).eq('post_id', id);
       return count || 0;
    }));
    const countMap = {}; ids.forEach((id, idx) => (countMap[id] = counts[idx] || 0));

    return (postsData || []).map(p => ({ ...p, likes_count: p.likes_count || 0, dislikes_count: p.dislikes_count || 0, comments_count: countMap[p.id] ?? 0, user_vote: voteMap[p.id] || null }));
  };

  const { data: userPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['user_posts', user?.id], queryFn: fetchUserPostsData, enabled: !!user?.id, staleTime: 1000 * 60 * 5
  });

  const setUserPosts = (updater) => queryClient.setQueryData(['user_posts', user?.id], (old) => typeof updater === 'function' ? updater(old || []) : updater);

  const { activeCommentsPostId, commentsData, toggleComments, commentActions } = useComments(setUserPosts, currentUser || {});

  const { data: isFollowing = false } = useQuery({
    queryKey: ['follow_status', currentUser?.id, user?.id],
    queryFn: async () => { if (isOwner) return false; const { data } = await supabase.from('follows').select('*').eq('follower_id', currentUser.id).eq('following_id', user.id).single(); return !!data; },
    enabled: !!currentUser?.id && !!user?.id && !isOwner
  });

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file || !isOwner) return;
    const isAvatar = type === 'avatar';
    const setLoadingState = isAvatar ? setUploadingAvatar : setUploadingCover;
    const dbField = isAvatar ? 'avatar_url' : 'cover_url';

    setLoadingState(true);
    try {
      await validateSession(); // Guardia
      const publicUrl = await uploadFileToSupabase(file, user.id);
      if (publicUrl) {
        const { error } = await supabase.from('profiles').update({ [dbField]: publicUrl }).eq('id', user.id);
        if (error) throw error;
        setDisplayUser(prev => ({ ...prev, [dbField]: publicUrl }));
        queryClient.invalidateQueries({ queryKey: ['feed'] });
        queryClient.invalidateQueries({ queryKey: ['user_posts', user.id] });
        if (onProfileUpdate) onProfileUpdate();
      }
    } catch (error) { console.error(`Error actualizando ${type}:`, error); } finally { setLoadingState(false); }
  };

  const handleVote = async (postId, type) => {
    // Logica idéntica al Feed (optimista)
    if (!currentUser?.id) return;
    const post = userPosts.find(p => p.id === postId); if (!post) return;
    const currentVote = post.user_vote; const newVote = currentVote === type ? null : type;
    setUserPosts(prev => prev.map(p => { if (p.id !== postId) return p; let l = p.likes_count, d = p.dislikes_count; if (currentVote === 'like') l--; if (currentVote === 'dislike') d--; if (newVote === 'like') l++; if (newVote === 'dislike') d++; return { ...p, user_vote: newVote, likes_count: l, dislikes_count: d }; }));
    try {
      if (currentVote) await supabase.from('post_votes').delete().match({ user_id: currentUser.id, post_id: postId });
      if (newVote) { await supabase.from('post_votes').upsert({ user_id: currentUser.id, post_id: postId, vote_type: newVote }); await notify({ recipientId: post.user_id, type: newVote, entityId: postId }); }
      const rpcName = newVote === 'like' ? 'increment_likes' : (newVote === 'dislike' ? 'increment_dislikes' : (currentVote === 'like' ? 'decrement_likes' : 'decrement_dislikes'));
      await supabase.rpc(rpcName, { post_id: postId });
    } catch (e) { queryClient.invalidateQueries(['user_posts', user.id]); }
  };

  const handleDeletePost = async (postId) => {
    setUserPosts(prev => prev.filter(p => p.id !== postId));
    try {
        await validateSession();
        const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', currentUser.id);
        if(error) throw error;
    } catch { queryClient.invalidateQueries(['user_posts', user.id]); }
  };

  const handleUpdatePost = async (postId, newContent, newMedia) => {
    const updates = { content: newContent };
    if (Array.isArray(newMedia)) updates.media = newMedia;
    setUserPosts(prev => prev.map(p => p.id === postId ? { ...p, content: newContent, media: Array.isArray(newMedia) ? newMedia : p.media } : p));
    try { await validateSession(); await supabase.from('posts').update(updates).eq('id', postId).eq('user_id', currentUser.id); } catch { queryClient.invalidateQueries(['user_posts', user.id]); }
  };

  const toggleFollow = async () => {
    if (!currentUser?.id || followLoading) return;
    setFollowLoading(true);
    queryClient.setQueryData(['follow_status', currentUser.id, user.id], !isFollowing);
    try {
      if (isFollowing) await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', user.id);
      else { await supabase.from('follows').insert([{ follower_id: currentUser.id, following_id: user.id }]); await notify({ recipientId: user.id, type: 'follow' }); }
      queryClient.invalidateQueries(['feed']);
    } catch (e) { queryClient.invalidateQueries(['follow_status']); } finally { setFollowLoading(false); }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handleSave = async () => {
    if (!isOwner || !formData.full_name.trim()) return;
    setLoading(true);
    try {
      await validateSession(); // Guardia crítico
      const updates = { ...formData, experience: formData.experience.sort((a,b) => new Date(b.start_date) - new Date(a.start_date)) };
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
      setDisplayUser({ ...displayUser, ...updates, name: updates.full_name });
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['user_posts'] });
      if (onProfileUpdate) onProfileUpdate();
    } catch(err) { alert("Error al guardar: Sesión expirada o red inestable."); } finally { setLoading(false); }
  };

  const renderExperienceSection = () => {
    if (isCompanyProfile) return null;
    const listToRender = editing ? formData.experience : (displayUser.experience || []);
    return (
        <Card className="p-6 mb-6 border-t-4 border-t-gold-premium shadow-lg overflow-hidden">
            <div className="flex items-center justify-between mb-5 pb-2 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3"><div className="p-2 bg-emerald-deep/10 dark:bg-emerald-deep/40 rounded-lg text-gold-premium"><Briefcase size={22} /></div><h3 className="text-lg font-bold text-gray-900 dark:text-white">Trayectoria Laboral</h3></div>
                {editing && !editingExpId && (<Button variant="ghost" onClick={() => { setTempExp({ id: Date.now(), company_name: '', position: '', is_current: false, start_date: '', end_date: '', boss: '', salary: '', work_email: '', description: '' }); setEditingExpId('NEW'); }} className="text-blue-600 text-sm"><Plus size={16} className="mr-1"/> Agregar</Button>)}
            </div>
            {editingExpId && tempExp && (
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5 border border-blue-200 mb-6 shadow-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 flex items-center gap-2 p-2 bg-white dark:bg-slate-700 rounded border"><input type="checkbox" checked={tempExp.is_current} onChange={(e) => setTempExp({ ...tempExp, is_current: e.target.checked, end_date: e.target.checked ? '' : tempExp.end_date })} /><label className="text-sm font-bold">Puesto actual</label></div>
                        <input type="text" placeholder="Empresa" value={tempExp.company_name} onChange={(e) => setTempExp({...tempExp, company_name: e.target.value})} className="p-2 text-sm border rounded dark:bg-slate-700" />
                        <input type="text" placeholder="Puesto" value={tempExp.position} onChange={(e) => setTempExp({...tempExp, position: e.target.value})} className="p-2 text-sm border rounded dark:bg-slate-700" />
                        <input type="date" value={tempExp.start_date} onChange={(e) => setTempExp({...tempExp, start_date: e.target.value})} className="p-2 text-sm border rounded dark:bg-slate-700" />
                        <input type="date" value={tempExp.end_date} onChange={(e) => setTempExp({...tempExp, end_date: e.target.value})} disabled={tempExp.is_current} className="p-2 text-sm border rounded dark:bg-slate-700 disabled:opacity-50" />
                        <textarea placeholder="Descripción" value={tempExp.description} onChange={(e) => setTempExp({...tempExp, description: e.target.value})} className="md:col-span-2 p-2 text-sm border rounded dark:bg-slate-700" rows={3} />
                    </div>
                    <div className="flex justify-end gap-3 mt-4"><Button variant="ghost" size="sm" onClick={() => { setEditingExpId(null); setTempExp(null); }}>Cancelar</Button><Button variant="primary" size="sm" onClick={() => { if (!tempExp.company_name || !tempExp.position || !tempExp.start_date) return alert("Faltan datos."); setFormData(prev => ({ ...prev, experience: editingExpId === 'NEW' ? [...prev.experience, tempExp] : prev.experience.map(e => e.id === editingExpId ? tempExp : e) })); setEditingExpId(null); setTempExp(null); }}>Guardar</Button></div>
                </div>
            )}
            <div className="space-y-8 relative ml-2 border-l-2 border-gray-200 dark:border-slate-700 pl-4">
                {listToRender.map((exp) => (
                    <div key={exp.id} className="relative group">
                        <div className={`absolute -left-[25px] top-1.5 w-4 h-4 rounded-full ring-4 ring-white dark:ring-slate-900 ${exp.is_current ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <div className="flex justify-between items-start">
                            <div><h4 className="font-bold text-gray-900 dark:text-white">{exp.position}</h4><p className="text-sm text-gray-600 dark:text-gray-300">{exp.company_name}</p><p className="text-xs text-gray-500">{exp.start_date} — {exp.is_current ? 'Actualidad' : exp.end_date}</p></div>
                            {editing && !editingExpId && (<div className="flex gap-1"><button onClick={() => { setTempExp({ ...exp, is_current: true, end_date: '', id: Date.now() }); setEditingExpId('NEW'); }} className="p-1.5 hover:bg-blue-50 rounded text-blue-600"><ArrowUpCircle size={16} /></button><button onClick={() => { setTempExp({ ...exp }); setEditingExpId(exp.id); }} className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><Edit2 size={16} /></button><button onClick={() => setFormData(prev => ({ ...prev, experience: prev.experience.filter(e => e.id !== exp.id) }))} className="p-1.5 hover:bg-red-50 rounded text-red-500"><Trash2 size={16} /></button></div>)}
                        </div>
                        {exp.description && <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg">{exp.description}</p>}
                    </div>
                ))}
            </div>
        </Card>
    );
  };
  const publicRoleLabel = (displayUser?.role === 'Admin') ? 'Técnico' : (displayUser?.role || 'Sin puesto definido');

  if (!user?.id) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></div>;

  return (
    <div className="pb-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 animate-in fade-in">
      <div className="bg-white dark:bg-emerald-medium rounded-2xl shadow-xl border border-softgray dark:border-emerald-dark overflow-hidden mb-6">
          <div className="h-40 md:h-56 bg-emerald-dark relative group">
                {displayUser.cover_url ? <img src={displayUser.cover_url} alt="cover" className="w-full h-full object-cover opacity-100"/> : <div className="w-full h-full bg-gradient-to-r from-emerald-deep via-emerald-medium to-emerald-dark" />}
                {isOwner && (<label className="absolute top-4 right-4 p-2 bg-black/40 text-white rounded-full cursor-pointer hover:bg-black/60">{uploadingCover ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}<input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} /></label>)}
          </div>
          <div className="px-6 pb-6 relative flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6">
             <div className="relative -mt-12 md:-mt-16 z-10 group">
                <Avatar initials={displayUser.avatar} src={displayUser.avatar_url} size="xl" className="w-24 h-24 md:w-32 md:h-32 border-4 border-white dark:border-slate-800" />
                {isOwner && (<label className="absolute bottom-1 right-1 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg cursor-pointer border border-gray-200 dark:border-slate-700 hover:bg-gray-50 transition-colors">{uploadingAvatar ? <Loader2 size={16} className="animate-spin text-blue-600"/> : <Camera size={16} className="text-gray-700 dark:text-gray-200"/>}<input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} /></label>)}
             </div>
             <div className="flex-1 w-full mt-2 md:mt-0 md:mb-2">
                {editing ? (<div className="space-y-2 max-w-lg"><input name="full_name" value={formData.full_name} onChange={handleChange} className="w-full p-2 text-xl font-bold border rounded dark:bg-slate-700" placeholder="Nombre" /><input name="role" value={formData.role} onChange={handleChange} className="w-full p-2 text-blue-600 border rounded dark:bg-slate-700" placeholder="Puesto" /></div>) : (<div><h1 className="text-2xl md:text-3xl font-extrabold text-emerald-deep dark:text-ivory flex items-center gap-2">{displayUser.name || displayUser.full_name}{isCompanyProfile && <span className="text-xs bg-gray-100 text-gold-premium px-2 py-0.5 rounded-full">Empresa</span>}</h1><p className="text-lg text-gold-premium font-medium">{publicRoleLabel}</p></div>)}
             </div>
             <div className="absolute top-4 right-4 md:static md:mb-4 flex gap-2">
                {!isOwner && (<><Button onClick={toggleFollow} variant={isFollowing ? "outline" : "primary"} disabled={followLoading} className="gap-2">{followLoading ? <Loader2 className="animate-spin" size={16}/> : (isFollowing ? <><CheckCircle size={16}/> Siguiendo</> : <><Plus size={16}/> Seguir</>)}</Button><Button onClick={() => openChatWithUser(displayUser)} variant="secondary" className="gap-2"><MessageCircle size={16} /> <span className="hidden sm:inline">Mensaje</span></Button></>)}
                {isOwner && (editing ? (<div className="flex gap-2"><Button variant="outline" onClick={() => setEditing(false)}><X size={18} /></Button><Button onClick={handleSave} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}</Button></div>) : (<Button variant="outline" onClick={() => setEditing(true)} className="gap-2"><Edit2 size={16} /> <span className="hidden sm:inline">Editar</span></Button>))}
             </div>
          </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
            <Card className="p-5"><h3 className="text-sm font-bold text-gold-champagne uppercase tracking-wider mb-3">Sobre mí</h3>{editing ? <textarea name="bio" value={formData.bio} onChange={handleChange} rows={4} className="w-full p-2 border rounded text-sm dark:bg-slate-700" placeholder="Bio..." /> : <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line">{displayUser.bio || 'Sin biografía.'}</p>}</Card>
            <Card className="p-5"><h3 className="text-sm font-bold text-gold-champagne uppercase tracking-wider mb-4">Contacto</h3><div className="space-y-3"><div className="flex items-center gap-3 text-sm"><Mail size={16} className="text-gray-400" />{editing ? <input name="email" value={formData.email} onChange={handleChange} className="border-b w-full bg-transparent" /> : <span>{displayUser.email || 'No visible'}</span>}</div><div className="flex items-center gap-3 text-sm"><Phone size={16} className="text-gray-400" />{editing ? <input name="phone" value={formData.phone} onChange={handleChange} className="border-b w-full bg-transparent" /> : <span>{displayUser.phone || 'No visible'}</span>}</div></div></Card>
            {!isCompanyProfile && renderExperienceSection()}
        </div>
        <div className="lg:col-span-2"><div className="mt-0"><h3 className="text-lg font-bold mb-4 flex items-center gap-2"><MessageSquare className="text-gold-premium" size={20} /> Publicaciones</h3>{(isCompanyProfile || isOwner || isFollowing) ? (<div className="space-y-4">{postsLoading ? <Loader2 className="animate-spin mx-auto text-gold-premium" /> : userPosts.length > 0 ? userPosts.map(post => (<PostItem key={post.id} post={post} user={currentUser} onVote={handleVote} onDelete={handleDeletePost} onUpdate={handleUpdatePost} onToggleComments={() => toggleComments(post.id)} showComments={activeCommentsPostId === post.id} comments={commentsData[post.id]} onCommentAction={commentActions} onViewProfile={onViewProfile} onOpenDetail={() => {}} />)) : <p className="text-gray-400 italic text-center py-8">No hay publicaciones recientes.</p>}</div>) : (<Card className="p-10 text-center italic text-gold-premium border-dashed border-2">Sigue a este usuario para ver sus publicaciones.</Card>)}</div></div>
      </div>
    </div>
  );
};
export default ProfileView;