// Konfigurasi URL Backend & Cloud Storage Dinamis (Lokal & Cloud Production)
// - Di Cloud (Vercel / Netlify): set VITE_API_BASE (dan opsional VITE_STORAGE_BASE) pada Environment Variables.
// - Di Lokal (XAMPP): otomatis fallback ke http://<hostname>:8000/api dan /storage/

const FALLBACK_HOST = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';

const rawApiBase = (import.meta.env.VITE_API_BASE || `http://${FALLBACK_HOST}:8000/api`).trim();
export const API_BASE = rawApiBase.replace(/\/+$/, '');

const derivedStorageBase = `${API_BASE.replace(/\/api$/, '')}/storage/`;
const rawStorageBase = (import.meta.env.VITE_STORAGE_BASE || derivedStorageBase).trim();
export const STORAGE_BASE = rawStorageBase.endsWith('/') ? rawStorageBase : `${rawStorageBase}/`;

/**
 * Mengubah file_path dari database menjadi URL unduhan yang valid:
 * - Jika sudah berupa URL Cloud lengkap (Supabase Storage / Cloudflare R2 / GCS), langsung kembalikan.
 * - Jika berupa path relatif lokal (mis. "submissions/abc.pdf"), gabungkan dengan STORAGE_BASE.
 */
export function resolveFileUrl(filePath) {
  if (!filePath) return '';
  if (/^https?:\/\//i.test(filePath)) {
    return filePath;
  }
  return `${STORAGE_BASE}${String(filePath).replace(/^\/+/, '')}`;
}
