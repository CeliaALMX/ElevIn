import React, { useState, useRef } from 'react';
import { Image, Video, X, Send, Loader2 } from 'lucide-react';
import Card from '../ui/Card'; //
import Button from '../ui/Button'; //
import Avatar from '../ui/Avatar'; //
import { supabase } from '../../lib/supabase'; //

const CreatePostWidget = ({ user, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image' | 'video'
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const type = file.type.startsWith('video/') ? 'video' : 'image';
    setMediaFile(file);
    setMediaType(type);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaType(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validación: Debe haber al menos texto O un archivo
    if (!content.trim() && !mediaFile) return;

    setIsSubmitting(true);

    try {
      let publicUrl = null;

      // 1. Lógica de Subida a Storage (Solo si hay archivo)
      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop();
        // Usamos timestamp para nombre único
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        // IMPORTANTE: Requiere crear bucket 'posts' en Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('posts') 
          .upload(fileName, mediaFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('posts').getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      // 2. Construir objeto de inserción dinámicamente
      // Esto evita el error si es solo texto y las columnas no existen (o evita enviar nulls innecesarios)
      const postPayload = {
        user_id: user.id,
        content: content // Puede ser string vacío si es solo video/imagen
      };

      // SOLO agregamos campos de media si existen
      if (publicUrl && mediaType) {
        postPayload.media_url = publicUrl;
        postPayload.media_type = mediaType;
      }

      // 3. Insertar en base de datos
      const { error } = await supabase.from('posts').insert([postPayload]);

      if (error) throw error;

      // 4. Limpiar y notificar éxito
      setContent('');
      clearMedia();
      if (onPostCreated) onPostCreated();

    } catch (error) {
      console.error('Error publicando:', error);
      alert('Error al publicar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-4">
      <div className="flex gap-3">
        <div className="hidden sm:block">
           <Avatar initials={user.avatar} src={user.avatar_url} size="md" /> 
        </div>
        
        <div className="flex-1">
          <form onSubmit={handleSubmit}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`¿Qué hay de nuevo, ${user.name.split(' ')[0]}?`}
              className="w-full bg-gray-50 dark:bg-slate-900 border-none rounded-lg p-3 focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none dark:text-white"
            />

            {/* Previsualización de Media */}
            {previewUrl && (
              <div className="relative mt-3 rounded-lg overflow-hidden bg-black max-h-64 flex justify-center group">
                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 z-10"
                >
                  <X size={16} />
                </button>
                
                {mediaType === 'video' ? (
                  <video src={previewUrl} controls className="max-h-64 w-auto" />
                ) : (
                  <img src={previewUrl} alt="Preview" className="max-h-64 object-contain" />
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-slate-700">
              <div className="flex gap-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                />
                
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-full transition-colors flex items-center gap-2"
                  title="Subir foto"
                >
                  <Image size={20} />
                  <span className="text-xs font-medium hidden sm:inline">Foto</span>
                </button>

                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-slate-800 rounded-full transition-colors flex items-center gap-2"
                  title="Subir video"
                >
                  <Video size={20} />
                  <span className="text-xs font-medium hidden sm:inline">Video</span>
                </button>
              </div>

              <Button 
                type="submit" 
                // Botón habilitado si hay texto O hay archivo
                disabled={(!content.trim() && !mediaFile) || isSubmitting}
                className={`px-6 rounded-full ${isSubmitting ? 'opacity-70' : ''}`}
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Publicar'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Card>
  );
};

export default CreatePostWidget;