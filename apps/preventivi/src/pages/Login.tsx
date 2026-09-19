import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, HousePlug, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApp, messageOf } from '../components/AppProvider';
import { BrandLogo, Field, Loading } from '../components/ui';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Inserisci la tua email.').pipe(z.email({ error: 'Inserisci un indirizzo email valido.' })),
  password: z.string().min(1, 'Inserisci la password.'),
});
type LoginValues = z.infer<typeof loginSchema>;

export default function Login() {
  const app=useApp();const [error,setError]=useState('');
  const {register,handleSubmit,formState:{errors,isSubmitting}}=useForm<LoginValues>({resolver:zodResolver(loginSchema),defaultValues:{email:'',password:''}});
  if(!app.ready)return <Loading/>;if(app.user)return <Navigate to="/" replace/>;
  async function submit(values:LoginValues){setError('');try{await app.login(values.email,values.password);}catch(err){setError(messageOf(err));}}
  return <main className="login-page"><section className="login-main"><BrandLogo/><div className="login-form"><div className="eyebrow"><span className="tiny-dot"/> SPAZIO RISERVATO GREEN FLUX</div><h1>Area Preventivi</h1><p className="login-intro">Accedi per creare e gestire le proposte commerciali Green Flux.</p>{app.configurationError ? <div className="error-banner">{app.configurationError}</div> : app.isDemo ? <><div className="demo-login-note"><span className="badge">DEMO LOCALE</span><p>Esplora tutte le funzioni con dati di esempio. Le modifiche restano salvate in questo browser.</p></div><button className="btn btn-primary btn-block" onClick={app.enterDemo}>Accedi alla demo locale <ArrowRight size={18}/></button></> : <form noValidate onSubmit={handleSubmit(submit,()=>setError(''))} aria-busy={isSubmitting}><Field label="Email"><input type="email" autoComplete="username" placeholder="nome@green-flux.com" required disabled={isSubmitting} aria-invalid={!!errors.email} aria-describedby={errors.email?'login-email-error':undefined} {...register('email')}/>{errors.email&&<small id="login-email-error" className="field-error" role="alert">{errors.email.message}</small>}</Field><Field label="Password"><input type="password" autoComplete="current-password" required disabled={isSubmitting} aria-invalid={!!errors.password} aria-describedby={errors.password?'login-password-error':undefined} {...register('password')}/>{errors.password&&<small id="login-password-error" className="field-error" role="alert">{errors.password.message}</small>}</Field>{error&&<p role="alert" className="error-banner">{error}</p>}<button className="btn btn-primary btn-block" disabled={isSubmitting}>{isSubmitting?'Accesso in corso…':'Accedi'}<ArrowRight size={18}/></button></form>}<div className="login-security"><LockKeyhole size={14}/><span>Accesso riservato al team Green Flux</span></div></div><p className="login-footer">© {new Date().getFullYear()} GREEN FLUX srls</p></section><aside className="login-aside"><div className="login-art"><HousePlug strokeWidth={0.7}/></div><div className="login-aside-content"><span className="eyebrow">DAL PROGETTO ALLA PROPOSTA</span><h2>Più spazio ai tuoi progetti.</h2><p>Listino, clienti e proposte commerciali.<br/>Tutto quello che serve, in un unico posto.</p><div className="login-benefits"><span><Check size={17}/> Il tuo listino, sempre aggiornato</span><span><Check size={17}/> PowerPoint pronti da condividere</span></div></div><div className="login-aside-footer">ENERGIA · COMFORT · IMPIANTI INTEGRATI</div></aside></main>;
}
