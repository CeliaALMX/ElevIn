import { supabase, validateSession } from '../lib/supabase';

export const uploadFileToSupabase = async (file, userId) => {
  if (!file) return null;

  try {
    // PASO 1: Validar sesión estrictamente antes de intentar subir
    await validateSession();

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    
    // PASO 2: Subida con Timeout de seguridad (30s)
    const uploadPromise = supabase.storage.from('posts-files').upload(fileName, file);
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("La subida tardó demasiado. Revisa tu conexión.")), 30000)
    );

    const { error } = await Promise.race([uploadPromise, timeoutPromise]);
    
    if (error) throw error;
    
    const { data } = supabase.storage.from('posts-files').getPublicUrl(fileName);
    return data.publicUrl;

  } catch (error) {
    console.error("Error subiendo archivo:", error);
    throw error; // Esto permite que el componente apague el estado "loading"
  }
};