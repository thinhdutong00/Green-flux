import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DataRepository } from '../domain/types';
import { LocalRepository } from './local-repository';
import { SupabaseRepository } from './supabase-repository';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const mode = import.meta.env.VITE_DATA_MODE?.trim();
const isPrivilegedKey = (value: string): boolean => {
  if (value.startsWith('sb_secret_')) return true;
  try {
    const payload = value.split('.')[1];
    return payload ? JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role === 'service_role' : false;
  } catch { return false; }
};
export let supabase: SupabaseClient | null = null;
export let configurationError: string | null = null;
export let repository: DataRepository | null = null;
export let isDemo = false;

if (mode && mode !== 'local' && mode !== 'supabase') {
  configurationError = 'VITE_DATA_MODE deve essere local oppure supabase.';
} else if (import.meta.env.DEV && (mode === 'local' || (!mode && !url && !key))) {
  isDemo = true;
  repository = new LocalRepository();
} else if (mode === 'local') {
  configurationError = 'La modalità demo è disponibile solo con il server di sviluppo locale.';
} else if (!url || !key) {
  configurationError = 'Configura VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY per collegare l’archivio aziendale.';
} else if (isPrivilegedKey(key)) {
  configurationError = 'Usa esclusivamente la chiave publishable di Supabase. Le chiavi segrete non sono ammesse nel frontend.';
} else {
  try {
    supabase = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    repository = new SupabaseRepository(supabase);
  } catch {
    configurationError = 'Configurazione Supabase non valida. Controlla URL e chiave publishable.';
  }
}

export { LocalRepository, SupabaseRepository };
