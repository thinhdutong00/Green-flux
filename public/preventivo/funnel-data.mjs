import { services } from './data.mjs';
export const propertyTypes=['Abitazione singola','Azienda o negozio','Condominio','Struttura agricola o produttiva','Altro immobile'];
export const annualConsumptions=['Meno di 3.000 kWh/anno','3.000 - 6.000 kWh/anno','6.000 - 12.000 kWh/anno','Oltre 12.000 kWh/anno','Non li ho sotto mano'];
export const installationSpaces=['Tetto a falda','Tetto piano','Terreno o area libera','Copertura aziendale','Ambienti interni','Locale tecnico','Esterno dell’immobile','Impianto esistente','Da verificare con sopralluogo'];
export const timelines=['Il prima possibile','Entro 1 mese','Entro 2-3 mesi','Sto valutando con calma'];
export const aliases={'fotovoltaico-residenziale':'fotovoltaico','fotovoltaico-aziendale':'fotovoltaico','pompe-calore':'pompe-di-calore','climatizzazione':'condizionatori','consulenza-energetica':'consulenza','efficientamento-energetico':'consulenza','edilizia':'consulenza','batterie-accumulo':'consulenza','manutenzione':'consulenza'};
export function serviceId(value){const id=aliases[value]||value;return services.some(s=>s.id===id)?id:null;}
export function validateFunnel(data){
 const errors=[];
 if(!Array.isArray(data.services)||!data.services.length||data.services.some(id=>!services.some(s=>s.id===id)))errors.push({step:0,message:'Seleziona almeno un servizio per continuare.'});
 for(const [key,options,step,message] of [['propertyType',propertyTypes,1,'Seleziona una tipologia di immobile.'],['annualConsumption',annualConsumptions,2,'Indica una fascia di consumo o scegli l’opzione non so.'],['installationSpace',installationSpaces,3,'Seleziona lo spazio disponibile.'],['timeline',timelines,4,'Seleziona una tempistica indicativa.']])if(!options.includes(data[key]))errors.push({step,message});
 if(typeof data.name!=='string'||data.name.trim().length<2||data.name.length>120)errors.push({step:5,message:'Inserisci nome e cognome (da 2 a 120 caratteri).'});
 if(typeof data.city!=='string'||data.city.trim().length<2||data.city.length>120)errors.push({step:5,message:'Inserisci il comune dell’intervento.'});
 const email=typeof data.email==='string'?data.email.trim():'';const phone=typeof data.phone==='string'?data.phone.trim():'';
 if(!email&&!phone)errors.push({step:5,message:'Inserisci almeno un recapito tra email e telefono.'});
 if(email&&(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))errors.push({step:5,message:'Inserisci un indirizzo email valido.'});
 if(phone&&(!/^\+?[\d\s().-]+$/.test(phone)||phone.replace(/\D/g,'').length<7||phone.replace(/\D/g,'').length>15))errors.push({step:5,message:'Inserisci un numero di telefono valido.'});
 if(typeof data.notes!=='string'||data.notes.length>2000)errors.push({step:5,message:'Il messaggio può contenere al massimo 2.000 caratteri.'});
 if(data.privacy!==true)errors.push({step:5,message:'Leggi l’informativa privacy e autorizza il ricontatto.'});
 return errors;
}
export function readFunnel(formData){return {funnel:'reference',services:formData.getAll('servizio'),propertyType:formData.get('immobile')||'',annualConsumption:formData.get('consumi')||'',installationSpace:formData.get('spazi')||'',timeline:formData.get('tempistiche')||'',name:String(formData.get('nome')||'').trim(),email:String(formData.get('email')||'').trim(),phone:String(formData.get('telefono')||'').trim(),city:String(formData.get('comune')||'').trim(),notes:String(formData.get('messaggio')||'').trim(),privacy:formData.get('privacy')==='on'};}
