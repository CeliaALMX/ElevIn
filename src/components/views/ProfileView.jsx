import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, Briefcase, Mail, Phone, Edit2, X, Save, Award, FolderOpen, Building, Calendar, User, Plus, Trash2, CheckCircle, ArrowUpCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadFileToSupabase } from '../../helpers/fileUpload';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';

const PUBLIC_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'live.com', 'icloud.com'];

const ProfileView = ({ user, currentUser, onProfileUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Estados de carga específicos
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Control de edición de experiencias
  const [editingExpId, setEditingExpId] = useState(null);
  const [tempExp, setTempExp] = useState(null);

  // SEMÁFORO: Evita parpadeos
  const justSavedRef = useRef(false);

  // Estado local
  const [displayUser, setDisplayUser] = useState(user || {});
  const isOwner = currentUser && user?.id === currentUser?.id;
  const isCompanyProfile = user?.role === 'Empresa';

  const [formData, setFormData] = useState({
    full_name: '', role: '', company: '', location: '', bio: '',
    phone: '', email: '', certifications: '', projects: '', experience: [] 
  });

  // --- SINCRONIZACIÓN ---
  useEffect(() => {
    if (!user) return;
    if (justSavedRef.current) return;

    setDisplayUser(user);

    if (!editing) {
        let safeExperience = [];
        if (Array.isArray(user.experience)) {
            safeExperience = user.experience;
        } else if (typeof user.experience === 'object' && user.experience) {
            safeExperience = [{ ...user.experience, id: Date.now() }];
        }

        setFormData({
            full_name: user.name || '',
            role: user.role || '',
            company: user.company || '',
            location: user.location || '',
            bio: user.bio || '',
            phone: user.phone || '',
            email: user.email || '',
            certifications: user.certifications || '',
            projects: user.projects || '',
            experience: safeExperience
        });
    }
  }, [user, editing]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isCorporateEmail = (email) => {
    if (!email) return false;
    const domain = email.split('@')[1];
    return domain && !PUBLIC_DOMAINS.includes(domain.toLowerCase());
  };

  // --- FUNCIÓN DE GUARDADO BLINDADA (FIX DE CONGELAMIENTO) ---
  const handleSave = async () => {
    if (!isOwner) return;
    
    // 1. Verificación preliminar
    if (!formData.full_name.trim()) return alert("El nombre es obligatorio.");

    setLoading(true);
    justSavedRef.current = true;
    
    try {
      // 2. CHECK DE SESIÓN: Si tardaste mucho, esto revive tu token antes de guardar
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
          throw new Error("La sesión expiró. Por favor recarga la página.");
      }

      // 3. Preparación de datos (Igual que antes)
      let finalExperienceList = [...formData.experience];
      if (editingExpId && tempExp) {
        if (tempExp.company_name && tempExp.position) {
             if (tempExp.is_current && !isCorporateEmail(tempExp.work_email)) {
                 setLoading(false);
                 justSavedRef.current = false;
                 return alert("El empleo actual requiere correo corporativo.");
             }
             if (editingExpId === 'NEW') {
                 finalExperienceList.push({ ...tempExp, id: Date.now() });
             } else {
                 finalExperienceList = finalExperienceList.map(e => e.id === editingExpId ? tempExp : e);
             }
        }
      }

      const cleanedExperience = finalExperienceList
        .map(exp => ({
          id: exp.id || Date.now(),
          company_name: String(exp.company_name || ''),
          position: String(exp.position || ''),
          is_current: Boolean(exp.is_current),
          start_date: String(exp.start_date || ''),
          end_date: String(exp.end_date || ''),
          boss: String(exp.boss || ''),
          salary: String(exp.salary || ''),
          work_email: String(exp.work_email || ''),
          description: String(exp.description || '')
        }))
        .sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0));

      const updates = {
          full_name: formData.full_name,
          role: formData.role,
          company: formData.company,
          location: formData.location,
          bio: formData.bio,
          phone: formData.phone,
          email: formData.email,
          certifications: formData.certifications,
          projects: formData.projects,
          experience: cleanedExperience
      };

      // 4. TIMEOUT DE SEGURIDAD (El anti-congelamiento)
      // Si la base de datos no responde en 10 segundos, forzamos un error para liberar la UI
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("La conexión es lenta. Intenta guardar de nuevo.")), 10000)
      );

      const dbPromise = supabase.from('profiles').update(updates).eq('id', user.id);

      // "Carrera": Gana quien termine primero (el guardado o el timeout)
      const { error } = await Promise.race([dbPromise, timeoutPromise]);

      if (error) throw error;
      
      // 5. Éxito y Actualización Optimista
      const freshUser = { ...displayUser, ...updates, name: updates.full_name };
      
      setDisplayUser(freshUser);
      setFormData(prev => ({ ...prev, experience: cleanedExperience }));
      
      setEditingExpId(null);
      setTempExp(null);
      setEditing(false);
      
      // Lanzamos la actualización en background sin bloquear la UI
      if (onProfileUpdate) onProfileUpdate();

      // Liberamos el semáforo
      setTimeout(() => { justSavedRef.current = false; }, 2000);

    } catch (error) {
      console.error("Error guardando:", error);
      alert(error.message || 'Ocurrió un error al guardar.');
      justSavedRef.current = false;
    } finally {
      // 6. GARANTÍA FINAL: Esto asegura que el spinner SIEMPRE se quite
      setLoading(false); 
    }
  };

  const handleImageUpload = async (e, type) => {
    if (!isOwner) return;
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'cover') setUploadingCover(true);
    else setUploadingAvatar(true);

    try {
        const publicUrl = await uploadFileToSupabase(file, user.id, type === 'cover' ? 'covers' : 'avatars');
        if (publicUrl) {
            const field = type === 'cover' ? 'cover_url' : 'avatar_url';
            setDisplayUser(prev => ({ ...prev, [field]: publicUrl }));
            await supabase.from('profiles').update({ [field]: publicUrl }).eq('id', user.id);
            if (onProfileUpdate) onProfileUpdate();
        }
    } catch (error) {
        console.error("Error upload", error);
        alert("Error al subir imagen");
    } finally {
        setUploadingCover(false);
        setUploadingAvatar(false);
    }
  };

  // --- GESTIÓN DE EXPERIENCIAS ---
  const initNewExperience = () => {
    setTempExp({
        id: Date.now(), company_name: '', position: '', is_current: false, 
        start_date: '', end_date: '', boss: '', salary: '', work_email: '', description: ''
    });
    setEditingExpId('NEW');
  };

  const confirmLocalExperience = () => {
    if (!tempExp.company_name || !tempExp.position || !tempExp.start_date) {
        return alert("Completa Empresa, Puesto y Fecha de Inicio.");
    }
    if (tempExp.is_current && !isCorporateEmail(tempExp.work_email)) {
        return alert("Requiere correo corporativo válido.");
    }

    setFormData(prev => {
        let newExpList = [...prev.experience];
        if (editingExpId === 'NEW') {
            newExpList.push(tempExp);
        } else {
            newExpList = newExpList.map(e => e.id === editingExpId ? tempExp : e);
        }
        newExpList.sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0));
        return { ...prev, experience: newExpList };
    });

    setEditingExpId(null);
    setTempExp(null);
  };

  const renderExperienceSection = () => {
    if (isCompanyProfile) return null;

    const listToRender = editing ? formData.experience : (displayUser.experience || []);

    return (
        <Card className="p-6 mb-6 overflow-hidden border-t-4 border-t-blue-500 shadow-sm">
            <div className="flex items-center justify-between mb-5 pb-2 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                        <Briefcase size={22} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Trayectoria Laboral</h3>
                </div>
                {editing && !editingExpId && (
                    <Button variant="ghost" onClick={initNewExperience} className="text-blue-600 hover:bg-blue-50 text-sm">
                        <Plus size={16} className="mr-1"/> Agregar
                    </Button>
                )}
            </div>
            
            {editingExpId && tempExp && (
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-5 border border-blue-200 dark:border-blue-900/50 mb-6 animate-in fade-in zoom-in-95 shadow-lg">
                    <h4 className="text-sm font-bold text-blue-600 mb-4 uppercase flex items-center gap-2">
                        {editingExpId === 'NEW' ? <Plus size={16}/> : <Edit2 size={16}/>}
                        {editingExpId === 'NEW' ? 'Nuevo Registro' : 'Editar Registro'}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 flex items-center gap-2 mb-2 p-2 bg-white dark:bg-slate-700 rounded border border-gray-200 dark:border-slate-600">
                             <input type="checkbox" id="isCurrent" checked={tempExp.is_current || false} 
                                onChange={(e) => setTempExp({ ...tempExp, is_current: e.target.checked, end_date: e.target.checked ? '' : tempExp.end_date })} 
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" />
                             <label htmlFor="isCurrent" className="text-sm font-bold text-gray-700 dark:text-gray-200 cursor-pointer select-none">
                                Actualmente tengo este puesto
                             </label>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Empresa *</label>
                            <input type="text" value={tempExp.company_name || ''} onChange={(e) => setTempExp({...tempExp, company_name: e.target.value})} 
                                className="w-full p-2 text-sm border rounded dark:bg-slate-700 dark:border-slate-600" placeholder="Nombre Empresa" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Puesto *</label>
                            <input type="text" value={tempExp.position || ''} onChange={(e) => setTempExp({...tempExp, position: e.target.value})} 
                                className="w-full p-2 text-sm border rounded dark:bg-slate-700 dark:border-slate-600" placeholder="Ej. Técnico de Ruta" />
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Fecha Inicio *</label>
                            <input type="date" value={tempExp.start_date || ''} onChange={(e) => setTempExp({...tempExp, start_date: e.target.value})} 
                                className="w-full p-2 text-sm border rounded dark:bg-slate-700 text-gray-500" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Fecha Fin</label>
                            <input type="date" value={tempExp.end_date || ''} onChange={(e) => setTempExp({...tempExp, end_date: e.target.value})} disabled={tempExp.is_current}
                                className="w-full p-2 text-sm border rounded dark:bg-slate-700 text-gray-500 disabled:opacity-50 disabled:bg-gray-100" />
                        </div>

                        {tempExp.is_current && (
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200 dark:border-blue-800 relative">
                                <div className="md:col-span-2 text-xs text-blue-700 dark:text-blue-300 font-bold mb-1 flex items-center gap-1">
                                    <CheckCircle size={14} /> DATOS DE VERIFICACIÓN (Privado)
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Correo Corporativo *</label>
                                    <input type="email" value={tempExp.work_email || ''} onChange={(e) => setTempExp({...tempExp, work_email: e.target.value})} 
                                        className="w-full p-2 text-sm border border-blue-300 rounded dark:bg-slate-700" placeholder="tu@empresa.com" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Jefe Directo *</label>
                                    <input type="text" value={tempExp.boss || ''} onChange={(e) => setTempExp({...tempExp, boss: e.target.value})} 
                                        className="w-full p-2 text-sm border border-blue-300 rounded dark:bg-slate-700" placeholder="Nombre completo" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Salario Mensual</label>
                                    <input type="text" value={tempExp.salary || ''} onChange={(e) => setTempExp({...tempExp, salary: e.target.value})} 
                                        className="w-full p-2 text-sm border border-blue-300 rounded dark:bg-slate-700" placeholder="$0.00" />
                                </div>
                            </div>
                        )}

                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Logros / Descripción</label>
                            <textarea rows={3} value={tempExp.description || ''} onChange={(e) => setTempExp({...tempExp, description: e.target.value})} 
                                className="w-full p-2 text-sm border rounded dark:bg-slate-700 dark:border-slate-600" placeholder="Describe tus responsabilidades..." />
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingExpId(null); setTempExp(null); }}>Cancelar</Button>
                        <Button variant="primary" size="sm" onClick={confirmLocalExperience}>Guardar</Button>
                    </div>
                </div>
            )}

            <div className="space-y-8 relative pl-2 ml-2 border-l-2 border-gray-200 dark:border-slate-700">
                {listToRender.length > 0 ? (
                    listToRender.map((exp) => (
                        <div key={exp.id} className="relative pl-6 group">
                            <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full ring-4 ring-white dark:ring-slate-900 transition-colors ${exp.is_current ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'}`}></div>
                            
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{exp.position}</h4>
                                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 font-medium mt-0.5">
                                        <Building size={14} className="text-gray-400"/>
                                        {exp.company_name}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <Calendar size={12}/> 
                                        {exp.start_date} — {exp.is_current ? <span className="text-green-600 font-bold bg-green-50 px-1.5 rounded">Actualidad</span> : (exp.end_date || '...')}
                                    </p>
                                </div>
                                
                                {editing && !editingExpId && (
                                    <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 shadow-sm rounded-lg p-1 border border-gray-100 dark:border-slate-700">
                                        <button onClick={() => {
                                            setTempExp({ ...exp, is_current: true, end_date: '', id: Date.now() }); 
                                            setEditingExpId('NEW');
                                        }} title="Ascender aquí" className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded text-blue-600 transition-colors">
                                            <ArrowUpCircle size={16} />
                                        </button>
                                        <button onClick={() => { setTempExp({ ...exp }); setEditingExpId(exp.id); }} title="Editar" className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-600 transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => {
                                            if (confirm("¿Eliminar este registro permanentemente?")) {
                                                setFormData(prev => ({ ...prev, experience: prev.experience.filter(e => e.id !== exp.id) }));
                                            }
                                        }} title="Eliminar" className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            {(exp.description || (exp.is_current && exp.boss)) && (
                                <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-slate-700/50">
                                    {exp.is_current && (
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-xs font-medium text-gray-500 border-b border-gray-200 dark:border-slate-700 pb-2">
                                            {exp.boss && <span className="flex items-center gap-1 text-blue-600"><User size={12}/> Jefe: {exp.boss}</span>}
                                            {exp.work_email && <span className="flex items-center gap-1"><Mail size={12}/> {exp.work_email}</span>}
                                        </div>
                                    )}
                                    <p className="whitespace-pre-line leading-relaxed">{exp.description}</p>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="py-8 text-center bg-gray-50 dark:bg-slate-800/50 rounded-lg ml-4 border border-dashed border-gray-200 dark:border-slate-700">
                        <p className="text-gray-400 italic text-sm mb-2">No tienes experiencia registrada.</p>
                        {editing && (
                            <Button variant="outline" size="sm" onClick={initNewExperience}>
                                Agregar mi primer empleo
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
  };

  return (
    <div className="pb-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 animate-in fade-in duration-500">
      
      {/* HEADER / PORTADA */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden mb-6">
          <div className="h-40 md:h-56 bg-gray-300 dark:bg-slate-700 relative group">
                {displayUser.cover_url ? ( 
                    <img src={displayUser.cover_url} alt="cover" className="w-full h-full object-cover transition-opacity duration-300"/> 
                ) : ( 
                    <div className="w-full h-full bg-gradient-to-r from-blue-900 via-blue-700 to-blue-500"></div> 
                )}
                
                {uploadingCover && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20 backdrop-blur-sm">
                        <Loader2 className="animate-spin text-white" size={32} />
                    </div>
                )}

                {isOwner && !uploadingCover && (
                    <label className="absolute top-4 right-4 p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-full cursor-pointer transition-all backdrop-blur-sm z-10">
                        <Camera size={18} />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} />
                    </label>
                )}
          </div>

          <div className="px-6 pb-6 relative flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6">
             <div className="relative -mt-12 md:-mt-16 group z-10">
                <div className="p-1.5 bg-white dark:bg-slate-800 rounded-full ring-4 ring-white dark:ring-slate-800 shadow-lg relative">
                    <Avatar initials={displayUser.avatar} src={displayUser.avatar_url} size="xl" className="w-24 h-24 md:w-32 md:h-32 text-2xl" />
                    
                    {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center z-20 backdrop-blur-sm">
                            <Loader2 className="animate-spin text-white" size={24} />
                        </div>
                    )}
                </div>
                
                {isOwner && !uploadingAvatar && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-all text-xs font-bold backdrop-blur-[2px]">
                        CAMBIAR
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />
                    </label>
                )}
             </div>

             <div className="flex-1 w-full md:w-auto mt-2 md:mt-0 md:mb-2">
                {editing && !editingExpId ? (
                    <div className="space-y-3 max-w-lg animate-in fade-in slide-in-from-left-4">
                        <input name="full_name" value={formData.full_name} onChange={handleChange} className="w-full p-2 text-xl font-bold border rounded dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Tu Nombre" />
                        <input name="role" value={formData.role} onChange={handleChange} className="w-full p-2 text-blue-600 font-medium border rounded dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Puesto Principal" />
                    </div>
                ) : (
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                            {displayUser.name}
                            {displayUser.role === 'Empresa' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 align-middle">Empresa</span>}
                        </h1>
                        <p className="text-lg text-blue-600 font-medium">{displayUser.role || 'Sin puesto definido'}</p>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                             <span className="flex items-center gap-1">
                                <Building size={14}/> {editing && !editingExpId ? '...' : (displayUser.company || 'Sin empresa')}
                             </span>
                             <span className="flex items-center gap-1">
                                <MapPin size={14}/> {editing && !editingExpId ? '...' : (displayUser.location || 'Ubicación no especificada')}
                             </span>
                        </div>
                    </div>
                )}
             </div>

             <div className="absolute top-4 right-4 md:static md:mb-4">
                {isOwner && !editingExpId && (
                    editing ? (
                        <div className="flex gap-2 animate-in zoom-in-90">
                            <Button variant="outline" onClick={() => setEditing(false)} className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"><X size={18} /></Button>
                            <Button onClick={handleSave} disabled={loading} className="gap-2 shadow-lg shadow-blue-500/30">
                                {loading ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Guardar Perfil</>}
                            </Button>
                        </div>
                    ) : (
                        <Button variant="outline" onClick={() => setEditing(true)} className="flex items-center gap-2 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 transition-all hover:shadow-md">
                            <Edit2 size={16} /> <span className="hidden sm:inline">Editar Perfil</span>
                        </Button>
                    )
                )}
             </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
            <Card className="p-5">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Sobre mí</h3>
                {editing && !editingExpId ? (
                    <div className="space-y-3 animate-in fade-in">
                        <textarea name="bio" value={formData.bio} onChange={handleChange} rows={4} className="w-full p-2 border rounded text-sm dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Escribe algo sobre ti..." />
                        <div className="grid grid-cols-1 gap-2">
                            <input name="location" value={formData.location} onChange={handleChange} className="w-full p-2 text-sm border rounded dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ciudad, País" />
                            <input name="company" value={formData.company} onChange={handleChange} className="w-full p-2 text-sm border rounded dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Empresa Actual (Resumen)" />
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                        {displayUser.bio || 'Este usuario no ha añadido una biografía aún.'}
                    </p>
                )}
            </Card>

            <Card className="p-5">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Contacto</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-yellow-600"><Mail size={16} /></div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs text-gray-400 font-semibold">Correo</p>
                            {editing && !editingExpId ? (
                                <input name="email" value={formData.email} onChange={handleChange} className="w-full bg-transparent border-b border-gray-200 text-sm outline-none focus:border-yellow-500 transition-colors" />
                            ) : (
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={displayUser.email}>{displayUser.email || 'No visible'}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-green-600"><Phone size={16} /></div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs text-gray-400 font-semibold">Teléfono</p>
                            {editing && !editingExpId ? (
                                <input name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-transparent border-b border-gray-200 text-sm outline-none focus:border-green-500 transition-colors" />
                            ) : (
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{displayUser.phone || 'No agregado'}</p>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="p-5">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Award size={16} /> Licencias y Certs.
                </h3>
                {editing && !editingExpId ? (
                    <textarea name="certifications" value={formData.certifications} onChange={handleChange} rows={4} className="w-full p-2 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej: DC-3 Alturas, Osha..." />
                ) : (
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                        {displayUser.certifications ? displayUser.certifications : <span className="text-gray-400 italic">Sin certificaciones.</span>}
                    </div>
                )}
            </Card>
        </div>

        <div className="lg:col-span-2">
            {renderExperienceSection()}
            <Card className="p-6">
                <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-100 dark:border-slate-700">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600">
                        <FolderOpen size={22} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Proyectos Destacados</h3>
                </div>
                {editing && !editingExpId ? (
                    <textarea name="projects" value={formData.projects} onChange={handleChange} rows={6} className="w-full p-3 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Describe los proyectos más importantes..." />
                ) : (
                    <div className="prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                        {displayUser.projects ? displayUser.projects : <p className="text-gray-400 italic py-4">No se han registrado proyectos.</p>}
                    </div>
                )}
            </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;