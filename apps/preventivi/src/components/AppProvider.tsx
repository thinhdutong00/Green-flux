import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import type { AppData, DataRepository } from '../domain/types';
import { repository, supabase, configurationError, isDemo } from '../data';
interface AppContextValue { data: AppData; repo: DataRepository; refresh: () => Promise<void>; notify: (message: string, kind?: 'success' | 'error') => void; user: string | null; ready: boolean; loading: boolean; error: string | null; configurationError: string | null; isDemo: boolean; login: (email:string,password:string)=>Promise<void>; enterDemo:()=>void; logout:()=>Promise<void> }
const Context = createContext<AppContextValue | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null); const [user, setUser] = useState<string|null>(null);
  const [ready, setReady] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState<string|null>(null);
  const [toast, setToast] = useState<{message:string;kind:'success'|'error'}|null>(null); const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string, kind: 'success'|'error' = 'success') => { if(toastTimer.current) clearTimeout(toastTimer.current); setToast({message,kind}); toastTimer.current=setTimeout(()=>setToast(null),kind==='error'?10000:4500); }, []);
  const refresh = useCallback(async () => { if (!repository) throw new Error('Configurazione mancante.'); const loaded = await repository.load(); setData(loaded); setError(null); }, []);
  useEffect(() => {
    if (isDemo) { setUser(sessionStorage.getItem('greenflux-demo-session') ? 'Operatore demo' : null); setReady(true); return; }
    if (!supabase) { setReady(true); return; }
    let active = true;
    supabase.auth.getSession().then(({data:session,error:err}) => { if(active){setUser(session.session?.user.email ?? null);if(err)setError(err.message);setReady(true);} });
    const {data:listener} = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user.email ?? null);setReady(true); });
    return () => { active=false; listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => { const repo=repository;if(!user || !repo){ setData(null); return; } let active=true;setLoading(true);setError(null); repo.initialize().then(()=>repo.load()).then(result=>{if(active)setData(result);}).catch(err=>{if(active)setError(messageOf(err));}).finally(()=>{if(active)setLoading(false);}); return()=>{active=false;}; }, [user]);
  const login = async (email:string,password:string) => { if(!supabase)throw new Error('Supabase non configurato.'); const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw new Error('Accesso non riuscito. Controlla email e password.'); };
  const enterDemo = () => { sessionStorage.setItem('greenflux-demo-session','active');setUser('Operatore demo'); };
  const logout = async () => { if(supabase){const {error}=await supabase.auth.signOut();if(error)throw error;}sessionStorage.removeItem('greenflux-demo-session');setUser(null);setData(null); };
  return <Context.Provider value={{data:data as AppData,repo:repository as DataRepository,refresh,notify,user,ready,loading,error,configurationError,isDemo,login,enterDemo,logout}}>{children}{toast && <div className={`toast toast-${toast.kind}`} role={toast.kind==='error'?'alert':'status'}>{toast.kind==='success'?<CheckCircle2 size={20}/>:<CircleAlert size={20}/>}<span>{toast.message}</span><button onClick={()=>setToast(null)} aria-label="Chiudi notifica"><X size={16}/></button></div>}</Context.Provider>;
}
export function useApp() { const value=useContext(Context);if(!value)throw new Error('AppProvider mancante');return value; }
export function messageOf(error:unknown) { return error instanceof Error ? error.message : 'Operazione non riuscita. Riprova.'; }
