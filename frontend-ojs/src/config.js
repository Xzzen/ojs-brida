// Konfigurasi URL Backend & Cloud Storage Dinamis (Lokal & Cloud Production)
// - Default otomatis mengarah ke Cloud Backend (Vercel) agar developer/rekan tim yang habis `git pull`
//   langsung bisa login & melihat data/diagram tanpa perlu setup XAMPP/MySQL lokal.
// - Jika ingin memakai backend Laravel lokal, buat file `frontend-ojs/.env.local` berisi:
//   VITE_API_BASE=http://127.0.0.1:8000/api

const DEFAULT_CLOUD_API = 'https://ojs-brida-backend.vercel.app/api';

const rawApiBase = (import.meta.env.VITE_API_BASE || DEFAULT_CLOUD_API).trim();
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
