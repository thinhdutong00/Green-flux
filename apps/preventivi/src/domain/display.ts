import type { Customer, QuoteStatus } from './types';
export const statusLabels:Record<QuoteStatus,string> = {draft:'Bozza',generated:'Generato',sent:'Inviato',accepted:'Accettato',rejected:'Rifiutato'};
export const customerName = (c:Customer) => c.company.trim() || [c.firstName,c.lastName].filter(Boolean).join(' ') || 'Cliente da completare';
export function formatDate(value:string) { return value ? new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value.slice(0,10)+'T12:00:00')) : '—'; }
export function today() { return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(new Date()); }
