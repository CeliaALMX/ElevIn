import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export class RequestTimeoutError extends Error {
  constructor(message = 'La operación tardó demasiado. Intenta de nuevo.') {
    super(message);
    this.name = 'RequestTimeoutError';
    this.code = 'TIMEOUT';
  }
}

const nativeFetch = (...args) => fetch(...args);

const pickTimeoutMs = (input) => {
  const url = typeof input === 'string' ? input : input?.url || '';
  if (url.includes('/storage/v1/')) return 90_000;
  if (url.includes('/auth/v1/')) return 20_000;
  return 25_000;
};

const attachAbort = (parentSignal, controller) => {
  if (!parentSignal) return;
  if (parentSignal.aborted) {
    controller.abort();
    return;
  }
  parentSignal.addEventListener('abort', () => controller.abort(), { once: true });
};

const timeoutFetch = async (input, init = {}) => {
  const timeoutMs = pickTimeoutMs(input);
  const controller = new AbortController();
  attachAbort(init.signal, controller);
  const timeoutId = setTimeout(() => { try { controller.abort(); } catch (_) {} }, timeoutMs);

  try {
    return await nativeFetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError') throw new RequestTimeoutError();
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

// 👇 AQUÍ ESTÁ EL FIX: PRENDEMOS EL PILOTO AUTOMÁTICO 👇
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true, // <--- CAMBIADO A TRUE
    detectSessionInUrl: true,
  },
  global: {
    fetch: timeoutFetch,
  },
});

const withTimeout = async (promise, ms, timeoutMessage) => {
  let t;
  const timeoutPromise = new Promise((_, reject) => {
    t = setTimeout(() => reject(new RequestTimeoutError(timeoutMessage)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(t);
  }
};

// 👇 SIMPLIFICAMOS ESTO PORQUE SUPABASE YA LO HACE SOLO 👇
export const validateSession = async () => {
  const { data, error } = await withTimeout(
    supabase.auth.getSession(),
    5_000,
    'No se pudo validar sesión (timeout).'
  );
  
  if (error || !data?.session) {
    const e = new Error('NO_SESSION');
    e.code = 'NO_SESSION';
    throw e;
  }

  return data.session;
};

export const recoverSupabase = async (userId) => {
  const session = await validateSession();
  try { supabase.realtime?.disconnect?.(); } catch (_) {}
  try { supabase.realtime?.connect?.(); } catch (_) {}
  try {
    await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
  } catch (e) {
    if (e?.code === 'TIMEOUT' || e?.name === 'RequestTimeoutError') throw e;
  }
  return session;
};