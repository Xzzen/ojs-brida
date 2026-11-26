<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CloudStorageService
{
    /**
     * Cek apakah integrasi Supabase Cloud Storage aktif di environment (.env).
     */
    public static function isSupabaseEnabled(): bool
    {
        return !empty(env('SUPABASE_URL')) && !empty(env('SUPABASE_SERVICE_KEY'));
    }

    public static function activeDriverName(): string
    {
        return self::isSupabaseEnabled() ? 'supabase' : 'local';
    }

    /**
     * Upload file hasil unggahan user (PDF/DOCX) ke Supabase Storage (jika aktif)
     * atau ke disk lokal 'public' (fallback otomatis saat berjalan di XAMPP lokal).
     *
     * Return:
     * - Cloud Mode: full public HTTPS URL (https://xxx.supabase.co/storage/v1/object/public/...)
     * - Local Mode: relative path (submissions/namafile.pdf)
     */
    public static function uploadUploadedFile(UploadedFile $file, string $folder = 'submissions'): string
    {
        if (!self::isSupabaseEnabled()) {
            return $file->store($folder, 'public');
        }

        $ext = strtolower($file->getClientOriginalExtension() ?: 'pdf');
        $safeName = Str::random(36) . '.' . $ext;
        $objectPath = trim($folder, '/') . '/' . $safeName;
        $bytes = file_get_contents($file->getRealPath());
        $mimeMap = [
            'pdf' => 'application/pdf',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc' => 'application/msword',
        ];
        $mime = $mimeMap[$ext] ?? ($file->getClientMimeType() ?: 'application/octet-stream');

        return self::uploadRawContent($objectPath, $bytes, $mime);
    }

    /**
     * Upload raw binary bytes (mis. PDF hasil generate seeder) ke Supabase Storage atau disk lokal.
     */
    public static function uploadRawContent(string $objectPath, string $bytes, string $mime = 'application/pdf'): string
    {
        $cleanPath = ltrim($objectPath, '/');

        if (!self::isSupabaseEnabled()) {
            Storage::disk('public')->put($cleanPath, $bytes);
            return $cleanPath;
        }

        $baseUrl = rtrim((string) env('SUPABASE_URL'), '/');
        $serviceKey = (string) env('SUPABASE_SERVICE_KEY');
        $bucket = trim((string) env('SUPABASE_BUCKET', 'manuscripts'), '/');

        $uploadEndpoint = "{$baseUrl}/storage/v1/object/{$bucket}/{$cleanPath}";

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $serviceKey,
            'apikey' => $serviceKey,
            'x-upsert' => 'true',
        ])
            ->timeout(45)
            ->withBody($bytes, $mime)
            ->post($uploadEndpoint);

        if (!$response->successful()) {
            Log::error('Supabase Storage upload gagal', [
                'status' => $response->status(),
                'body' => $response->body(),
                'path' => $cleanPath,
            ]);
            throw new \RuntimeException('Gagal mengunggah berkas ke Cloud Storage (HTTP ' . $response->status() . '). Pastikan bucket "' . $bucket . '" sudah dibuat (Public) dan SUPABASE_SERVICE_KEY valid.');
        }

        return "{$baseUrl}/storage/v1/object/public/{$bucket}/{$cleanPath}";
    }

    /**
     * Hapus berkas dari Supabase Storage (jika URL cloud) atau dari disk lokal 'public'.
     */
    public static function deleteFile(?string $filePath): void
    {
        if (!$filePath) {
            return;
        }

        // Jika berupa URL Supabase Storage publik
        if (str_starts_with($filePath, 'http://') || str_starts_with($filePath, 'https://')) {
            if (!self::isSupabaseEnabled()) {
                return;
            }
            $baseUrl = rtrim((string) env('SUPABASE_URL'), '/');
            $serviceKey = (string) env('SUPABASE_SERVICE_KEY');
            $bucket = trim((string) env('SUPABASE_BUCKET', 'manuscripts'), '/');
            $publicPrefix = "{$baseUrl}/storage/v1/object/public/{$bucket}/";

            if (str_starts_with($filePath, $publicPrefix)) {
                $objectPath = substr($filePath, strlen($publicPrefix));
                try {
                    Http::withHeaders([
                        'Authorization' => 'Bearer ' . $serviceKey,
                        'apikey' => $serviceKey,
                    ])
                        ->timeout(20)
                        ->delete("{$baseUrl}/storage/v1/object/{$bucket}/{$objectPath}");
                } catch (\Throwable $e) {
                    Log::warning('Gagal menghapus berkas lama di Supabase Storage: ' . $e->getMessage());
                }
            }
            return;
        }

        // Fallback lokal
        if (Storage::disk('public')->exists($filePath)) {
            Storage::disk('public')->delete($filePath);
        }
    }
}
