import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * ERRORES
 */
export class RequestTimeoutError extends Error {
  constructor(message = 'La operación tardó demasiado. Intenta de nuevo.') {
    super(message);
    this.name = 'RequestTimeoutError';
    this.code = 'TIMEOUT';
  }
}

/**
 * FETCH GLOBAL con timeout + AbortController.
 *
 * Causa raíz del "loading infinito":
 * cuando el navegador suspende/redesconecta conexiones por inactividad,
 * algunas peticiones pueden quedarse en estado pendiente sin resolver.
 * Supabase-js usa fetch y, si no hay timeout, tu UI se queda esperando.
 */
const nativeFetch = (...args) => fetch(...args);

const pickTimeoutMs = (input) => {
  const url = typeof input === 'string' ? input : input?.url || '';
  // Storage (uploads) puede tardar más.
  if (url.includes('/storage/v1/')) return 90_000;
  // Auth suele ser rápido, pero damos margen.
  if (url.includes('/auth/v1/')) return 20_000;
  // PostgREST / funciones / etc.
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

  // Si ya venía una señal (ej. AbortController externo), la respetamos.
  attachAbort(init.signal, controller);

  const timeoutId = setTimeout(() => {
    try {
      controller.abort();
    } catch (_) {
      // noop
    }
  }, timeoutMs);

  try {
    return await nativeFetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    // Normalizar timeout
    if (err?.name === 'AbortError') {
      throw new RequestTimeoutError();
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: timeoutFetch,
  },
});

/**
 * validateSession
 * - Dedupe de refresh concurrente (evita varios refresh al mismo tiempo)
 * - Manejo claro de expiración
 */
let refreshInFlight = null;

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

/**
 * Verifica y recupera la sesión activa.
 * Si el token ya expiró o expira pronto, fuerza refresh.
 */
export const validateSession = async () => {
  // getSession es local, pero puede atascarse si Auth quedó en un estado raro;
  // le ponemos timeout defensivo.
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

  const session = data.session;
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at;

  // Si no hay expires_at (raro), tratamos como expirado para evitar 401 silenciosos.
  const needsRefresh = !expiresAt || expiresAt <= now + 60;
  if (!needsRefresh) return session;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const { data: refreshed, error: refreshError } = await withTimeout(
        supabase.auth.refreshSession(),
        12_000,
        'No se pudo renovar sesión (timeout).'
      );

      if (refreshError || !refreshed?.session) {
        const e = new Error('SESSION_EXPIRED');
        e.code = 'SESSION_EXPIRED';
        throw e;
      }
      return refreshed.session;
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  return await refreshInFlight;
};

/**
 * recoverSupabase
 * Se usa cuando la app vuelve de inactividad:
 * - Revalida/renueva sesión
 * - "Despierta" la conexión HTTP
 * - Reintenta reconectar Realtime
 */
export const recoverSupabase = async (userId) => {
  const session = await validateSession();

  // Realtime: en algunos navegadores, el socket puede cerrarse en background.
  // Reconectar es seguro aunque ya esté conectado.
  try {
    supabase.realtime?.disconnect?.();
  } catch (_) {
    // noop
  }
  try {
    supabase.realtime?.connect?.();
  } catch (_) {
    // noop
  }

  // Warm-up: una petición ligera que fuerza reconexión limpia.
  // maybeSingle evita error si por RLS no devuelve nada.
  try {
    await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
  } catch (e) {
    // Si falla el warm-up, no bloqueamos: el usuario puede volver a intentar.
    // Pero sí propagamos timeouts (para cortar loadings infinitos aguas arriba).
    if (e?.code === 'TIMEOUT' || e?.name === 'RequestTimeoutError') throw e;
  }

  return session;
};
