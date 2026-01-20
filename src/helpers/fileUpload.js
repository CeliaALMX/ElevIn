import { supabase } from '../lib/supabase';

export const uploadFileToSupabase = async (file, userId) => {
  if (!file) return null;
  try {
    const fileExt = file.name.split('.').pop();
    // Generamos un nombre único para evitar colisiones
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    
    // Subir
    const { error } = await supabase.storage.from('posts-files').upload(fileName, file);
    if (error) throw error;
    
    // Obtener URL pública
    const { data } = supabase.storage.from('posts-files').getPublicUrl(fileName);
    return data.publicUrl;
  } catch (error) {
    console.error("Error subiendo archivo:", error);
    return null;
  }
};