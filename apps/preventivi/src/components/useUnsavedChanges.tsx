import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { Modal } from './ui';
export function useUnsavedChanges(dirty: boolean) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => { const handler = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler); }, [dirty]);
  if (blocker.state !== 'blocked') return null;
  return <Modal title="Modifiche non salvate" onClose={() => blocker.reset()}><p className="dialog-message">Hai modifiche non salvate. Se esci da questa pagina, andranno perse.</p><div className="dialog-actions"><button className="btn btn-secondary" onClick={() => blocker.reset()}>Resta qui</button><button className="btn btn-danger" onClick={() => blocker.proceed()}>Esci senza salvare</button></div></Modal>;
}
