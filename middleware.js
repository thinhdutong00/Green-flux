import { next } from '@vercel/functions';
import { maintenanceEnabled, maintenancePage } from './maintenance.mjs';

// Keep the maintenance page's logo, fonts and favicon available.
// All other paths, including existing pages and APIs, go through this gate.
export const config = { matcher: '/((?!assets/).*)' };

export default function middleware(request) {
  if (!maintenanceEnabled) return next();

  const headers = {
    'Cache-Control': 'no-store, max-age=0',
    'Retry-After': '3600',
  };
  const isApi = new URL(request.url).pathname.startsWith('/api/');
  headers['Content-Type'] = isApi ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8';
  const body = isApi
    ? JSON.stringify({ message: 'Il sito è temporaneamente in manutenzione. Contattaci via telefono, email o WhatsApp.' })
    : maintenancePage;

  return new Response(request.method === 'HEAD' ? null : body, { status: 503, headers });
}
