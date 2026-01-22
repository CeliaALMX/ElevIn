import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Briefcase, Mail, Phone, Edit2, X, Save, Award, FolderOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadFileToSupabase } from '../../helpers/fileUpload';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';

// AHORA RECIBIMOS 'currentUser' TAMBIÉN PARA COMPARAR
const ProfileView = ({ user, currentUser, onProfileUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // VERIFICAMOS SI SOY EL DUEÑO DEL PERFIL
  const isOwner = currentUser && user.id === currentUser.id;

  const [formData, setFormData] = useState({
    full_name: user.name,
    role: user.role || '',
    company: user.company || '',
    location: user.location || '',
    bio: user.bio || '',
    phone: user.phone || '',
    email: user.email || '',
    certifications: user.certifications || '',
    projects: user.projects || ''
  });

  // Actualizar formulario si cambiamos de usuario
  useEffect(() => {
    setFormData({
        full_name: user.name,
        role: user.role || '',
        company: user.company || '',
        location: user.location || '',
        bio: user.bio || '',
        phone: user.phone || '',
        email: user.email || '',
        certifications: user.certifications || '',
        projects: user.projects || ''
    });
    setEditing(false); // Resetear edición si cambia perfil
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!isOwner) return; // Seguridad extra
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          role: formData.role,
          company: formData.company,
          location: formData.location,
          bio: formData.bio,
          phone: formData.phone,
          email: formData.email,
          certifications: formData.certifications,
          projects: formData.projects
        })
        .eq('id', user.id);

      if (error) throw error;
      onProfileUpdate(); 
      setEditing(false);
    } catch (error) {
      alert('Error al guardar perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e, type) => {
    if (!isOwner) return;
    const file = e.target.files[0];
    if (!file) return;

    try {
        const publicUrl = await uploadFileToSupabase(file, user.id, type === 'cover' ? 'covers' : 'avatars');
        if (publicUrl) {
            const field = type === 'cover' ? 'cover_url' : 'avatar_url';
            await supabase.from('profiles').update({ [field]: publicUrl }).eq('id', user.id);
            onProfileUpdate();
        }
    } catch (error) {
        console.error("Error upload", error);
    }
  };

  return (
    <div className="pb-24 pt-4 space-y-6 max-w-3xl mx-auto px-4">
      
      {/* TARJETA PRINCIPAL */}
      <Card className="overflow-hidden relative">
        <div className="h-32 md:h-48 bg-gray-300 dark:bg-slate-700 relative group">
            {user.cover_url ? ( <img src={user.cover_url} alt="Cover" className="w-full h-full object-cover" /> ) : ( <div className="w-full h-full bg-gradient-to-r from-blue-800 to-blue-500"></div> )}
            
            {/* Solo mostrar botón de cámara si es el dueño */}
            {isOwner && (
                <label className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70">
                    <Camera size={20} />
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} />
                </label>
            )}
        </div>

        <div className="px-6 pb-6 relative">
             <div className="relative -mt-16 mb-4 inline-block group">
                <div className="p-1.5 bg-white dark:bg-slate-800 rounded-full ring-4 ring-white dark:ring-slate-900">
                    <Avatar initials={user.avatar} src={user.avatar_url} size="xl" />
                </div>
                
                {/* Solo permitir cambiar avatar si es el dueño */}
                {isOwner && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-xs font-bold">
                        CAMBIAR
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />
                    </label>
                )}
             </div>

             <div className="absolute top-4 right-4">
                {/* BOTÓN EDITAR: SOLO SI ES DUEÑO */}
                {isOwner && (
                    editing ? (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setEditing(false)} className="border-red-500 text-red-500 hover:bg-red-50"><X size={18} /></Button>
                            <Button onClick={handleSave} disabled={loading}>{loading ? '...' : <Save size={18} />}</Button>
                        </div>
                    ) : (
                        <Button variant="outline" onClick={() => setEditing(true)} className="flex items-center gap-2">
                            <Edit2 size={16} /> <span className="hidden sm:inline">Editar Perfil</span>
                        </Button>
                    )
                )}
             </div>

             <div className="space-y-2">
                {editing ? (
                    <div className="space-y-4 max-w-md">
                        <input name="full_name" value={formData.full_name} onChange={handleChange} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-600 font-bold text-xl" placeholder="Nombre completo" />
                        <input name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-600 text-blue-600" placeholder="Puesto / Título" />
                    </div>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {user.name}
                            {/* Si es un mock (empresa demo), mostramos un badge */}
                            {user.id && user.id.toString().startsWith('mock') && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">Empresa Verificada</span>
                            )}
                        </h1>
                        <p className="text-lg text-blue-600 font-medium">{user.role || 'Sin puesto definido'}</p>
                    </>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300 mt-2">
                    <div className="flex items-center gap-1">
                        <Briefcase size={16} className="text-gray-400"/>
                        {editing ? <input name="company" value={formData.company} onChange={handleChange} className="p-1 border rounded dark:bg-slate-800" placeholder="Empresa"/> : <span>{user.company}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                        <MapPin size={16} className="text-gray-400"/>
                        {editing ? <input name="location" value={formData.location} onChange={handleChange} className="p-1 border rounded dark:bg-slate-800" placeholder="Ubicación"/> : <span>{user.location || 'Sin ubicación'}</span>}
                    </div>
                </div>

                <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sobre mí</h3>
                    {editing ? (
                        <textarea name="bio" value={formData.bio} onChange={handleChange} rows={3} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-600" />
                    ) : (
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                            {user.bio || 'Sin biografía disponible.'}
                        </p>
                    )}
                </div>
             </div>
        </div>
      </Card>

      {/* TARJETA CONTACTO */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Mail size={20} className="text-yellow-500" /> Información de Contacto
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Correo Electrónico</label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded border border-gray-100 dark:border-slate-700">
                    <Mail size={18} className="text-gray-400 shrink-0" />
                    {editing ? ( <input name="email" value={formData.email} onChange={handleChange} className="bg-transparent w-full outline-none text-gray-800 dark:text-white" /> ) : ( <span className="text-gray-800 dark:text-white truncate">{user.email || 'No visible'}</span> )}
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Teléfono / Móvil</label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded border border-gray-100 dark:border-slate-700">
                    <Phone size={18} className="text-gray-400 shrink-0" />
                    {editing ? ( <input name="phone" value={formData.phone} onChange={handleChange} className="bg-transparent w-full outline-none text-gray-800 dark:text-white" /> ) : ( <span className="text-gray-800 dark:text-white truncate">{user.phone || 'No agregado'}</span> )}
                </div>
            </div>
        </div>
      </Card>

      {/* TARJETA PROYECTOS */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FolderOpen size={20} className="text-blue-500" /> Proyectos Destacados
        </h3>
        {editing ? (
            <textarea name="projects" value={formData.projects} onChange={handleChange} rows={5} className="w-full p-3 border rounded dark:bg-slate-800 dark:border-slate-600" placeholder="Describe tus proyectos..." />
        ) : (
            <div className="prose dark:prose-invert text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {user.projects ? user.projects : <p className="text-gray-400 italic">No hay proyectos registrados.</p>}
            </div>
        )}
      </Card>

      {/* TARJETA CERTIFICACIONES */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Award size={20} className="text-green-500" /> Certificaciones y Licencias
        </h3>
        {editing ? (
            <textarea name="certifications" value={formData.certifications} onChange={handleChange} rows={5} className="w-full p-3 border rounded dark:bg-slate-800 dark:border-slate-600" placeholder="Lista tus certificaciones..." />
        ) : (
            <div className="prose dark:prose-invert text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {user.certifications ? user.certifications : <p className="text-gray-400 italic">No hay certificaciones registradas.</p>}
            </div>
        )}
      </Card>

    </div>
  );
};

export default ProfileView;