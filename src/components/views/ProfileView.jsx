import React, { useState, useRef } from 'react';
import { 
  MapPin, 
  Briefcase, 
  Award, 
  Calendar, 
  Edit3, 
  Camera, 
  Save, 
  X,
  ShieldCheck, 
  Loader2
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { supabase } from '../../lib/supabase';

const ProfileView = ({ user, onProfileUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Estado local para el formulario
  const [formData, setFormData] = useState({
    full_name: user.name || '',
    role: user.role || '',
    bio: user.bio || '',
    location: user.location || '',
    company: user.company || ''
  });

  // Referencias para los inputs de archivos ocultos
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // --- MANEJO DE IMÁGENES ---
  const handleImageUpload = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${type}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Subir al Bucket 'profiles'
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // 3. Actualizar base de datos
      const updateData = type === 'avatar' ? { avatar_url: publicUrl } : { cover_url: publicUrl };
      
      const { error: dbError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (dbError) throw dbError;

      // 4. Refrescar datos en App
      if (onProfileUpdate) onProfileUpdate();
      alert('Imagen actualizada correctamente');

    } catch (error) {
      console.error('Error subiendo imagen:', error);
      alert('Error al subir la imagen.');
    } finally {
      setLoading(false);
    }
  };

  // --- MANEJO DE DATOS DE TEXTO ---
  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          role: formData.role,
          bio: formData.bio,
          location: formData.location,
          company: formData.company
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setIsEditing(false);
      if (onProfileUpdate) onProfileUpdate();
      
    } catch (error) {
      alert('Error guardando perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 pt-4 max-w-2xl mx-auto space-y-4 px-4">
      
      {/* --- TARJETA PRINCIPAL --- */}
      <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow border border-gray-100 dark:border-slate-700 relative group">
        
        {/* INPUTS OCULTOS DE ARCHIVO */}
        <input 
          type="file" 
          ref={coverInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => handleImageUpload(e, 'cover')} 
        />
        <input 
          type="file" 
          ref={avatarInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => handleImageUpload(e, 'avatar')} 
        />

        {/* PORTADA */}
        <div className="h-24 bg-gray-200 relative">
          {user.cover_url ? (
             <img src={user.cover_url} alt="Portada" className="w-full h-full object-cover" />
          ) : (
             <div className="w-full h-full bg-gradient-to-r from-blue-900 to-blue-700"></div>
          )}
          
          {/* Botón editar portada */}
          <div className="absolute top-4 right-4">
             <button 
               onClick={() => coverInputRef.current.click()}
               className="p-2 bg-black/30 hover:bg-black/50 rounded-full text-white backdrop-blur-sm transition"
               title="Cambiar portada"
             >
               {loading ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
             </button>
          </div>
        </div>

        {/* INFO USUARIO */}
        <div className="px-5 pb-6 relative">
          
          {/* AVATAR */}
          <div className="absolute -top-10 left-5">
             <div className="relative inline-block">
               <Avatar 
                 initials={user.avatar || 'YO'} 
                 src={user.avatar_url} 
                 size="xl" 
                 className="border-4 border-white dark:border-slate-800 shadow-md"
               />
               <button 
                  onClick={() => avatarInputRef.current.click()}
                  className="absolute bottom-1 right-1 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow border-2 border-white dark:border-slate-800 transition"
                  title="Cambiar foto de perfil"
               >
                 <Camera size={14} />
               </button>
             </div>
          </div>
          
          {/* BARRA DE ACCIONES (EDITAR / GUARDAR) */}
          <div className="flex justify-end pt-2 min-h-[40px]">
            {isEditing ? (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setIsEditing(false)} className="text-red-500 text-xs px-3">
                  <X size={16} /> Cancelar
                </Button>
                <Button onClick={handleSave} disabled={loading} className="text-xs px-3">
                  {loading ? <Loader2 className="animate-spin" size={16}/> : <><Save size={16} /> Guardar</>}
                </Button>
              </div>
            ) : (
              <Button variant="ghost" onClick={() => setIsEditing(true)} className="border border-gray-200 dark:border-slate-600 text-xs px-3">
                <Edit3 size={16} /> <span className="hidden sm:inline ml-1">Editar</span>
              </Button>
            )}
          </div>

          {/* CAMPOS DE TEXTO - AQUÍ ESTÁ EL ARREGLO (mt-16) */}
          <div className="mt-16"> 
            {isEditing ? (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="text-xs font-bold text-gray-500">Nombre Completo</label>
                  <input 
                    value={formData.full_name} 
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div>
                      <label className="text-xs font-bold text-gray-500">Rol / Puesto</label>
                      <input 
                        value={formData.role} 
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-gray-500">Empresa</label>
                      <input 
                        value={formData.company} 
                        onChange={(e) => setFormData({...formData, company: e.target.value})}
                        className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      />
                   </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">Ubicación</label>
                  <input 
                    value={formData.location} 
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  />
                </div>
                <div>
                   <label className="text-xs font-bold text-gray-500">Biografía</label>
                   <textarea 
                      value={formData.bio} 
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      className="w-full p-2 border rounded h-24 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                   />
                </div>
              </div>
            ) : (
              // MODO VISUALIZACIÓN
              <>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {user.name} 
                  <ShieldCheck size={20} className="text-blue-600 fill-blue-100"/>
                </h2>
                <p className="text-blue-600 dark:text-yellow-400 font-medium text-lg">{user.role}</p>
                
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-2 mb-4">
                  <span className="flex items-center gap-1"><MapPin size={14}/> {user.location || 'Ubicación no definida'}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Briefcase size={14}/> {user.company || 'Freelance'}</span>
                </div>

                <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic">
                    "{user.bio || 'Sin biografía...'}"
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-3 border-t border-gray-100 dark:border-slate-700 divide-x divide-gray-100 dark:divide-slate-700 bg-gray-50/50 dark:bg-slate-800">
          <div className="py-3 text-center">
             <Briefcase size={18} className="mx-auto text-gray-400 mb-1" />
             <span className="block font-bold text-lg text-blue-900 dark:text-white">142</span>
             <span className="text-[10px] text-gray-500 uppercase tracking-wide">Proyectos</span>
          </div>
          <div className="py-3 text-center">
             <Award size={18} className="mx-auto text-gray-400 mb-1" />
             <span className="block font-bold text-lg text-blue-900 dark:text-white">8</span>
             <span className="text-[10px] text-gray-500 uppercase tracking-wide">Certif.</span>
          </div>
          <div className="py-3 text-center">
             <Calendar size={18} className="mx-auto text-gray-400 mb-1" />
             <span className="block font-bold text-lg text-blue-900 dark:text-white">12</span>
             <span className="text-[10px] text-gray-500 uppercase tracking-wide">Años Exp.</span>
          </div>
        </div>
      </div>

      {/* --- SECCIONES EXTRA --- */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Award className="text-yellow-500" /> Certificaciones
          </h3>
        </div>
        <div className="text-center py-4 text-gray-500 text-sm">
           Funcionalidad de agregar certificaciones próximamente.
        </div>
      </Card>
    </div>
  );
};

export default ProfileView;