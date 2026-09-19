import { useState } from 'react';
import type { Quote } from '../domain/types';
import { useApp, messageOf } from './AppProvider';
import { validateQuote } from '../domain/validation';
export function useGenerateQuote() {
  const {repo,refresh,notify}=useApp();const [generating,setGenerating]=useState(false);
  async function generate(quote:Quote) {
    if(generating)return;setGenerating(true);
    try { validateQuote(quote,true); const {generateQuotePptx,quoteFilename}=await import('../pptx'); const blob=await generateQuotePptx(quote);const filename=quoteFilename(quote);
      const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
      let updated:Quote;
      try { updated=await repo.markGenerated(quote.id,quote.version,filename); }
      catch(err){notify(`PowerPoint scaricato, ma lo stato non è stato aggiornato: ${messageOf(err)}`,'error');return quote;}
      try { await refresh();notify('PowerPoint generato. Il download è pronto.'); }
      catch(err){notify(`PowerPoint generato e registrato. Non è stato possibile aggiornare l’archivio a schermo: ${messageOf(err)}`,'error');}
      return updated;
    } catch(err){notify(messageOf(err),'error');return null;}finally{setGenerating(false);}
  }
  return {generate,generating};
}
