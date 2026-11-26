<?php

namespace App\Http\Controllers;

use App\Models\Journal;
use App\Models\Issue;
use App\Models\Submission;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;

class SubmissionController extends Controller
{
    private function ensureSeeded()
    {
        if (Journal::count() === 0) {
            Artisan::call('db:seed', ['--force' => true]);
        }
    }

    private function ensureAdminActor(Request $request)
    {
        $actorId = $request->input('actor_id') ?? $request->header('X-Actor-Id');
        $actorRole = strtolower((string) ($request->input('actor_role') ?? $request->header('X-Actor-Role') ?? ''));

        if ($actorId) {
            $actor = User::find($actorId);
            if (!$actor || $actor->role !== 'admin') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Akses ditolak: Tindakan ini hanya diizinkan untuk Administrator (Admin) Portal.'
                ], 403);
            }
            return null;
        }

        if ($actorRole !== '' && $actorRole !== 'admin') {
            return response()->json([
                'status' => 'error',
                'message' => 'Akses ditolak: Tindakan ini hanya diizinkan untuk Administrator (Admin) Portal.'
            ], 403);
        }

        return null;
    }

    private function formatUserPayload(User $user): array
    {
        $roleLabels = [
            'admin' => 'Chief Editor / Admin Portal',
            'editor' => 'Editor Jurnal',
            'reviewer' => 'Reviewer (Mitra Bestari)',
            'author' => 'Author (Penulis / Peneliti)',
        ];

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'label' => $roleLabels[$user->role] ?? ucfirst($user->role),
            'affiliation' => $user->affiliation ?: 'Portal OJS BRIDA Kota Makassar',
            'specialty' => $user->specialty,
            'orcid_id' => $user->orcid_id,
        ];
    }

    public function login(Request $request)
    {
        $this->ensureSeeded();

        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', strtolower(trim($request->email)))->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Email atau kata sandi salah. Untuk akun demo, gunakan kata sandi: password',
            ], 401);
        }

        return response()->json([
            'status' => 'success',
            'message' => "Selamat datang kembali, {$user->name}!",
            'data' => $this->formatUserPayload($user),
        ]);
    }

    public function register(Request $request)
    {
        $this->ensureSeeded();

        $request->merge([
            'email' => strtolower(trim((string) $request->email)),
        ]);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'nullable|in:author,reviewer',
            'affiliation' => 'nullable|string|max:255',
            'specialty' => 'nullable|string|max:255',
        ], [
            'email.unique' => 'Email tersebut sudah terdaftar. Silakan masuk atau gunakan email lain.',
            'password.min' => 'Kata sandi minimal terdiri dari 6 karakter.',
        ]);

        $user = User::create([
            'name' => trim($request->name),
            'email' => $request->email,
            'role' => $request->input('role', 'author'),
            'affiliation' => $request->input('affiliation') ?: 'Peneliti Independen / Mitra BRIDA',
            'specialty' => $request->input('specialty') ?: 'Riset & Inovasi Daerah',
            'password' => bcrypt($request->password),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Pendaftaran berhasil! Akun {$user->name} telah aktif.",
            'data' => $this->formatUserPayload($user),
        ], 201);
    }

    public function journals()
    {
        $this->ensureSeeded();

        $journals = Journal::with(['issues' => function ($q) {
            $q->orderBy('year', 'desc')->orderBy('id', 'desc');
        }])
        ->withCount([
            'submissions',
            'submissions as published_count' => function ($q) {
                $q->where('status', 'published');
            },
            'submissions as active_review_count' => function ($q) {
                $q->whereIn('status', ['pending', 'under_review', 'revision_required']);
            }
        ])
        ->get();

        return response()->json([
            'status' => 'success',
            'data' => $journals
        ]);
    }

    public function storeJournal(Request $request)
    {
        if ($denied = $this->ensureAdminActor($request)) {
            return $denied;
        }

        $request->merge([
            'code' => strtolower(preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $request->code)),
        ]);

        $request->validate([
            'code' => 'required|string|max:50|unique:journals,code',
            'title' => 'required|string|max:255',
            'abbreviation' => 'required|string|max:50',
            'issn_print' => 'nullable|string|max:30',
            'issn_online' => 'nullable|string|max:30',
            'description' => 'nullable|string',
            'focus_scope' => 'nullable|string',
            'chief_editor' => 'nullable|string|max:150',
            'frequency' => 'nullable|string|max:100',
            'accreditation' => 'nullable|string|max:50',
            'accent_color' => 'nullable|string|max:30',
        ], [
            'code.unique' => 'Kode unik URL jurnal sudah digunakan. Gunakan kode lain.',
        ]);

        $journal = Journal::create([
            'code' => $request->code,
            'title' => $request->title,
            'abbreviation' => strtoupper($request->abbreviation),
            'issn_print' => $request->issn_print ?: '2899-001X',
            'issn_online' => $request->issn_online ?: '2899-0028',
            'description' => $request->description ?: 'Jurnal ilmiah resmi yang diterbitkan pada portal OJS Multi-Journal BRIDA Kota Makassar.',
            'focus_scope' => $request->focus_scope ?: 'Riset Terapan, Kebijakan Publik, dan Inovasi Daerah',
            'publisher' => 'BRIDA Kota Makassar',
            'chief_editor' => $request->chief_editor ?: 'Dr. Ir. H. Andi Syahrul, M.Si.',
            'frequency' => $request->frequency ?: '2 Kali Setahun',
            'accreditation' => $request->accreditation ?: 'SINTA 3',
            'accent_color' => $request->accent_color ?: 'blue',
            'is_active' => true,
        ]);

        Issue::create([
            'journal_id' => $journal->id,
            'volume' => 'Vol. 1',
            'number' => 'No. 1',
            'year' => (int) date('Y'),
            'title' => 'Edisi Perdana ' . $journal->abbreviation,
            'is_current' => true,
            'published_at' => now()->toDateString(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Jurnal baru berhasil ditambahkan ke Portal Multi-Journal OJS BRIDA!',
            'data' => $journal->load('issues')
        ]);
    }

    public function updateJournal(Request $request, $id)
    {
        $journal = Journal::findOrFail($id);
        if ($request->filled('title')) {
            $journal->title = $request->title;
        }
        if ($request->filled('description')) {
            $journal->description = $request->description;
        }
        if ($request->filled('focus_scope')) {
            $journal->focus_scope = $request->focus_scope;
        }
        if ($request->filled('chief_editor')) {
            $journal->chief_editor = $request->chief_editor;
        }
        $journal->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Identitas dan tampilan jurnal berhasil disimpan!',
            'data' => $journal->load('issues')
        ]);
    }

    public function deleteJournal(Request $request, $id)
    {
        if ($denied = $this->ensureAdminActor($request)) {
            return $denied;
        }

        $journal = Journal::findOrFail($id);

        if (Journal::count() <= 1) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak dapat menghapus jurnal terakhir di portal BRIDA!'
            ], 422);
        }

        $journalTitle = $journal->title;
        $journal->delete();

        return response()->json([
            'status' => 'success',
            'message' => "Jurnal '{$journalTitle}' berhasil dihapus dari portal OJS BRIDA beserta arsipnya!"
        ]);
    }

    public function storeIssue(Request $request)
    {
        $request->validate([
            'journal_id' => 'required|exists:journals,id',
            'volume' => 'required|string|max:50',
            'number' => 'required|string|max:50',
            'year' => 'required|integer',
            'title' => 'nullable|string|max:255',
            'submission_ids' => 'nullable|array',
        ]);

        Issue::where('journal_id', $request->journal_id)->update(['is_current' => false]);

        $vol = str_starts_with(strtolower($request->volume), 'vol') ? $request->volume : 'Vol. ' . $request->volume;
        $num = str_starts_with(strtolower($request->number), 'no') ? $request->number : 'No. ' . $request->number;

        $issue = Issue::create([
            'journal_id' => $request->journal_id,
            'volume' => $vol,
            'number' => $num,
            'year' => (int) $request->year,
            'title' => $request->title ?: "Terbitan {$vol} {$num} ({$request->year})",
            'is_current' => true,
            'published_at' => now()->toDateString(),
        ]);

        if (is_array($request->submission_ids) && count($request->submission_ids) > 0) {
            $journal = Journal::find($request->journal_id);
            $code = strtolower($journal->code ?? 'jurnal');
            foreach ($request->submission_ids as $subId) {
                $sub = Submission::find($subId);
                if ($sub) {
                    $sub->issue_id = $issue->id;
                    $sub->status = 'published';
                    $sub->doi = $sub->doi ?: sprintf('10.31290/%s.v%si%s.%d', $code, preg_replace('/\D/', '', $vol) ?: '1', preg_replace('/\D/', '', $num) ?: '1', 100 + $sub->id);
                    $sub->pages = $sub->pages ?: '1-15';
                    $sub->published_at = now();
                    $sub->save();
                }
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Terbitan baru berhasil dipublikasikan!',
            'data' => $issue
        ]);
    }

    public function index(Request $request)
    {
        $this->ensureSeeded();

        $query = Submission::with(['journal', 'issue', 'author', 'reviews.reviewer'])
            ->orderBy('id', 'desc');

        if ($request->filled('journal_id') && $request->journal_id !== 'all') {
            $query->where('journal_id', $request->journal_id);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                  ->orWhere('abstract', 'like', "%{$s}%")
                  ->orWhere('keywords', 'like', "%{$s}%")
                  ->orWhere('co_authors', 'like', "%{$s}%")
                  ->orWhere('doi', 'like', "%{$s}%")
                  ->orWhereHas('author', function ($aq) use ($s) {
                      $aq->where('name', 'like', "%{$s}%");
                  });
            });
        }

        return response()->json([
            'status' => 'success',
            'data' => $query->get()
        ]);
    }

    /**
     * Ekstraksi teks & verifikasi integritas biner (Magic Bytes) berkas naskah (PDF / DOCX / DOC)
     */
    private function inspectUploadedDocument(\Illuminate\Http\UploadedFile $file): array
    {
        $ext = strtolower($file->getClientOriginalExtension());
        $path = $file->getRealPath();
        $raw = @file_get_contents($path);

        if ($raw === false || strlen($raw) < 100) {
            return [
                'valid_signature' => false,
                'signature_error' => 'Berkas dokumen kosong atau terlalu kecil (< 100 byte). Harap unggah dokumen naskah ilmiah asli.',
                'text' => '',
                'ext' => $ext,
            ];
        }

        $header4 = substr($raw, 0, 4);
        $header5 = substr($raw, 0, 5);

        if ($ext === 'pdf') {
            if ($header5 !== '%PDF-') {
                return [
                    'valid_signature' => false,
                    'signature_error' => 'Berkas .pdf tidak valid (header biner %PDF- tidak ditemukan). Jangan hanya mengganti ekstensi file lain menjadi .pdf.',
                    'text' => '',
                    'ext' => $ext,
                ];
            }

            // Ekstrak teks aman khusus dari blok teks PDF (BT ... ET) agar tidak salah membaca biner font/gambar
            $extracted = '';
            $streams = [];
            if (@preg_match_all('/stream\r?\n(.*?)\r?\nendstream/s', $raw, $m)) {
                $streamCount = 0;
                foreach ($m[1] as $chunk) {
                    if ($streamCount >= 80 || strlen($extracted) > 65000) {
                        break;
                    }
                    if (strlen($chunk) > 350000) {
                        continue; // Lewati stream gambar/bitmap raksasa
                    }
                    $decoded = @gzuncompress($chunk);
                    if ($decoded === false) {
                        $decoded = @gzinflate($chunk);
                    }
                    $candidate = $decoded !== false ? $decoded : $chunk;
                    // Hanya proses stream yang benar-benar mengandung operator teks PDF (BT ... ET)
                    if (strlen($candidate) <= 400000 && str_contains($candidate, 'BT') && str_contains($candidate, 'ET')) {
                        $streams[] = $candidate;
                        $streamCount++;
                    }
                }
            }
            if (empty($streams) && strlen($raw) <= 300000 && str_contains($raw, 'BT') && str_contains($raw, 'ET')) {
                $streams[] = $raw;
            }

            foreach ($streams as $st) {
                if (strlen($extracted) > 65000) {
                    break;
                }
                // Ambil hanya blok BT ... ET
                if (@preg_match_all('/\bBT\b(.*?)\bET\b/s', $st, $btMatches)) {
                    foreach ($btMatches[1] as $btBlock) {
                        // 1. Rekonstruksi array kerning PDF: [(P) -10 (E) 5 (N)...] TJ
                        if (@preg_match_all('/\[(.*?)\]\s*TJ/s', $btBlock, $tjArrays)) {
                            foreach ($tjArrays[1] as $arrContent) {
                                if (@preg_match_all('/\(([^()]*)\)/', $arrContent, $parts)) {
                                    $joined = implode('', $parts[1]);
                                    $joined = str_replace(['\\(', '\\)', '\\\\'], ['(', ')', '\\'], $joined);
                                    $joined = preg_replace('/[^\x20-\x7E]/', ' ', $joined) ?? '';
                                    if (preg_match('/[a-zA-Z]{2,}/', $joined)) {
                                        $extracted .= ' ' . $joined;
                                    }
                                }
                            }
                        }
                        // 2. String teks tunggal: (Teks...) Tj
                        if (@preg_match_all('/\(([^()]{2,200})\)\s*Tj/', $btBlock, $tjSingle)) {
                            foreach ($tjSingle[1] as $seg) {
                                $clean = str_replace(['\\(', '\\)', '\\\\'], ['(', ')', '\\'], $seg);
                                $clean = preg_replace('/[^\x20-\x7E]/', ' ', $clean) ?? '';
                                if (preg_match('/[a-zA-Z]{2,}/', $clean)) {
                                    $extracted .= ' ' . $clean;
                                }
                            }
                        }
                    }
                }
            }

            $cleanText = trim((string) preg_replace('/\s+/', ' ', $extracted));
            if (function_exists('mb_convert_encoding')) {
                $cleanText = mb_convert_encoding($cleanText, 'UTF-8', 'UTF-8');
            }

            // Pastikan teks PDF benar-benar prosa terbaca (bukan encoding CIDFont/ToUnicode glyph)
            $proseStopwords = preg_match_all(
                '/\b(yang|dan|dengan|untuk|pada|dari|dalam|adalah|penelitian|hasil|metode|the|and|of|in|to|for|with|this|that)\b/i',
                $cleanText
            );
            $readableProse = ($proseStopwords !== false && $proseStopwords >= 5);

            return [
                'valid_signature' => true,
                'signature_error' => null,
                'text' => $cleanText,
                'readable_prose' => $readableProse,
                'ext' => $ext,
            ];
        }

        if ($ext === 'docx') {
            if (substr($raw, 0, 2) !== 'PK') {
                return [
                    'valid_signature' => false,
                    'signature_error' => 'Berkas .docx tidak valid (bukan arsip Office Open XML yang sah).',
                    'text' => '',
                    'ext' => $ext,
                ];
            }

            $zip = new \ZipArchive();
            if ($zip->open($path) !== true) {
                return [
                    'valid_signature' => false,
                    'signature_error' => 'Berkas .docx korup atau tidak dapat dibuka.',
                    'text' => '',
                    'ext' => $ext,
                ];
            }

            $xml = $zip->getFromName('word/document.xml');
            $zip->close();

            if ($xml === false) {
                return [
                    'valid_signature' => false,
                    'signature_error' => 'Berkas .docx tidak memiliki struktur dokumen Word (word/document.xml tidak ditemukan).',
                    'text' => '',
                    'ext' => $ext,
                ];
            }

            $text = preg_replace('/<\/w:p>|<w:br[^>]*\/>/', "\n", $xml);
            $text = html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_XML1, 'UTF-8');
            $text = trim(preg_replace('/[ \t]+/', ' ', $text));

            return [
                'valid_signature' => true,
                'signature_error' => null,
                'text' => $text,
                'ext' => $ext,
            ];
        }

        if ($ext === 'doc') {
            $isOle = $header4 === "\xD0\xCF\x11\xE0";
            $isRtf = substr($raw, 0, 5) === '{\\rtf';
            if (!$isOle && !$isRtf) {
                return [
                    'valid_signature' => false,
                    'signature_error' => 'Berkas .doc tidak valid (signature Microsoft Word / RTF tidak cocok).',
                    'text' => '',
                    'ext' => $ext,
                ];
            }
            $ascii = preg_replace('/[^\x20-\x7E\r\n]/', ' ', $raw);
            return [
                'valid_signature' => true,
                'signature_error' => null,
                'text' => trim(preg_replace('/\s+/', ' ', $ascii)),
                'ext' => $ext,
            ];
        }

        return [
            'valid_signature' => false,
            'signature_error' => 'Format file harus .pdf, .doc, atau .docx.',
            'text' => '',
            'ext' => $ext,
        ];
    }

    /**
     * Gatekeeper Standarisasi Jurnal Ilmiah (SINTA / ARJUNA & PKP OJS)
     * Mengembalikan daftar pelanggaran standar jika naskah belum memenuhi kriteria.
     */
    private function validateManuscriptStandards(Request $request, bool $isRevision = false, ?int $ignoreSubmissionId = null): array
    {
        $violations = [];

        if (!$isRevision) {
            // 1. Standar Judul (5 - 20 kata, tidak ALL CAPS, tidak duplikat di jurnal yang sama)
            $title = trim((string) $request->input('title', ''));
            $titleWords = preg_split('/\s+/u', $title, -1, PREG_SPLIT_NO_EMPTY) ?: [];
            $titleWordCount = count($titleWords);

            if ($titleWordCount < 5 || $titleWordCount > 20) {
                $violations[] = "Judul naskah harus terdiri dari 5 hingga 20 kata sesuai standar SINTA/ARJUNA (saat ini: {$titleWordCount} kata).";
            }
            if ($title !== '' && preg_match('/[A-Z]/', $title) && mb_strtoupper($title, 'UTF-8') === $title) {
                $violations[] = 'Judul naskah tidak boleh ditulis seluruhnya dengan HURUF KAPITAL (ALL CAPS). Gunakan kapitalisasi judul ilmiah (Title Case).';
            }
            if ($request->filled('journal_id') && $title !== '') {
                $dupQuery = Submission::where('journal_id', $request->journal_id)
                    ->whereRaw('LOWER(title) = ?', [mb_strtolower($title, 'UTF-8')]);
                if ($ignoreSubmissionId) {
                    $dupQuery->where('id', '!=', $ignoreSubmissionId);
                }
                if ($dupQuery->exists()) {
                    $violations[] = 'Judul naskah yang sama persis sudah terdaftar di jurnal tujuan (deteksi duplikasi naskah).';
                }
            }

            // 2. Standar Abstrak (150 - 250 kata, 1 paragraf utuh, tanpa sitasi pustaka)
            $abstract = trim((string) $request->input('abstract', ''));
            $abstractWords = preg_split('/\s+/u', $abstract, -1, PREG_SPLIT_NO_EMPTY) ?: [];
            $abstractWordCount = count($abstractWords);

            if ($abstractWordCount < 150 || $abstractWordCount > 250) {
                $violations[] = "Abstrak wajib terdiri dari 150 hingga 250 kata sesuai standar SINTA/ARJUNA (saat ini: {$abstractWordCount} kata).";
            }
            if (preg_match('/\r?\n\s*\r?\n/', $abstract)) {
                $violations[] = 'Abstrak harus ditulis dalam 1 (satu) paragraf utuh tanpa pemisahan baris kosong antar paragraf.';
            }
            if (preg_match('/\[\d+\]|\([A-Z][a-zA-Z\s\.\-&]+,\s*(19|20)\d{2}\)|\bet\s+al\./i', $abstract)) {
                $violations[] = 'Abstrak tidak diperbolehkan mencantumkan sitasi/kutipan pustaka (seperti [1], (Penulis, 2023), atau et al.) sesuai pedoman OJS & SINTA.';
            }

            // 3. Standar Kata Kunci (3 - 6 kata/frasa kunci, dipisahkan koma/titik koma, tanpa duplikat)
            $keywordsRaw = trim((string) $request->input('keywords', ''));
            $kwParts = array_values(array_filter(array_map('trim', preg_split('/[,;]+/', $keywordsRaw))));
            $kwUnique = array_unique(array_map(fn($k) => mb_strtolower($k, 'UTF-8'), $kwParts));

            if (count($kwParts) < 3 || count($kwParts) > 6) {
                $violations[] = 'Kata kunci (Keywords) wajib berisi 3 hingga 6 kata/frasa ilmiah yang dipisahkan tanda koma (saat ini: ' . count($kwParts) . ' kata kunci).';
            } elseif (count($kwUnique) !== count($kwParts)) {
                $violations[] = 'Kata kunci mengandung istilah yang duplikat/sama. Harap gunakan istilah yang unik.';
            }

            // 4. Checklist Persiapan OJS (wajib disetujui saat submit baru)
            if ($ignoreSubmissionId === null) {
                $agreed = $request->input('checklist_agreed');
                if (!in_array($agreed, [true, 1, '1', 'true', 'on'], true)) {
                    $violations[] = 'Anda wajib menyetujui seluruh 4 poin Checklist Persiapan Naskah OJS (Orisinalitas, Plagiarisme < 20%, Struktur IMRAD, dan Double-Blind Anonymization).';
                }
            }
        }

        // 5. Validasi Berkas & Struktur IMRAD pada Isi Dokumen
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $docCheck = $this->inspectUploadedDocument($file);

            if (!$docCheck['valid_signature']) {
                $violations[] = $docCheck['signature_error'];
            } else {
                $text = (string) ($docCheck['text'] ?? '');
                if (function_exists('mb_convert_encoding')) {
                    $text = mb_convert_encoding($text, 'UTF-8', 'UTF-8');
                }
                $ext = $docCheck['ext'];
                $wordsList = @preg_split('/\s+/u', $text, -1, PREG_SPLIT_NO_EMPTY);
                if (!is_array($wordsList)) {
                    $wordsList = preg_split('/\s+/', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [];
                }
                $textWordCount = count($wordsList);

                // Untuk DOCX selalu wajib teks terbaca & struktur IMRAD lengkap;
                // Untuk PDF/DOC, cek IMRAD hanya bila teks benar-benar prosa terbaca (bukan PDF CIDFont/ToUnicode)
                $isReadableProse = (bool) ($docCheck['readable_prose'] ?? ($textWordCount >= 40));
                $shouldCheckImrad = ($ext === 'docx') || ($isReadableProse && $textWordCount >= 40);

                if ($ext === 'docx' && $textWordCount < 50) {
                    $violations[] = "Isi dokumen .docx terlalu singkat ({$textWordCount} kata). Naskah ilmiah minimal harus berisi komponen struktur artikel yang lengkap.";
                } elseif ($shouldCheckImrad) {
                    $imradChecks = [
                        'Pendahuluan / Introduction' => '/\b(pendahuluan|latar\s+belakang|introduction)\b/i',
                        'Metode Penelitian / Methods' => '/\b(metode|metodologi|bahan\s+dan\s+metode|methods?|methodology)\b/i',
                        'Hasil & Pembahasan / Results & Discussion' => '/\b(hasil|pembahasan|results?|discussion|temuan)\b/i',
                        'Kesimpulan / Conclusion' => '/\b(kesimpulan|simpulan|penutup|conclusions?)\b/i',
                        'Daftar Pustaka / References' => '/\b(daftar\s+pustaka|referensi|references?|bibliography)\b/i',
                    ];

                    $missingSections = [];
                    foreach ($imradChecks as $label => $pattern) {
                        if (!preg_match($pattern, $text)) {
                            $missingSections[] = $label;
                        }
                    }

                    if (count($missingSections) > 0) {
                        $violations[] = 'Struktur IMRAD di dalam isi berkas belum lengkap! Bagian wajib yang tidak ditemukan: '
                            . implode(', ', $missingSections)
                            . '. Harap susun naskah menggunakan Template Resmi OJS BRIDA.';
                    }
                }
            }
        }

        return $violations;
    }

    /**
     * Unduh Template Resmi Naskah Ilmiah Standar SINTA/IMRAD (.docx valid)
     */
    public function downloadTemplate()
    {
        $tmpPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'Template_Naskah_OJS_BRIDA_SINTA.docx';
        $zip = new \ZipArchive();
        if ($zip->open($tmpPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            return response()->json(['status' => 'error', 'message' => 'Gagal membuat file template.'], 500);
        }

        $contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            . '<Default Extension="xml" ContentType="application/xml"/>'
            . '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            . '</Types>';

        $rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
            . '</Relationships>';

        $paragraphs = [
            ['JUDUL ARTIKEL ILMIAH (5 - 20 KATA, TITLE CASE, TIDAK HURUF KAPITAL SEMUA)', true],
            ['[Nama Penulis Dihapus Saat Unggah Awal untuk Menjaga Double-Blind Peer Review]', false],
            ['', false],
            ['ABSTRAK', true],
            ['Tuliskan abstrak dalam satu paragraf utuh sepanjang 150 hingga 250 kata yang memuat latar belakang singkat, tujuan penelitian, metode yang digunakan, hasil utama penelitian, serta kesimpulan. Hindari mencantumkan sitasi pustaka, singkatan tidak baku, atau tabel di dalam abstrak.', false],
            ['Kata Kunci: Kata Kunci 1, Kata Kunci 2, Kata Kunci 3, Kata Kunci 4 (3 - 6 kata/frasa kunci)', true],
            ['', false],
            ['1. PENDAHULUAN', true],
            ['Uraikan latar belakang permasalahan riset, urgensi kajian daerah/nasional, kajian literatur mutakhir (state of the art), kesenjangan penelitian (research gap), serta tujuan penelitian secara jelas dan terukur.', false],
            ['', false],
            ['2. METODE PENELITIAN', true],
            ['Jelaskan desain penelitian, lokasi dan waktu pelaksanaan, populasi/sampel, instrumen pengumpulan data, serta teknik analisis data kuantitatif atau kualitatif secara rinci sehingga penelitian dapat direplikasi.', false],
            ['', false],
            ['3. HASIL DAN PEMBAHASAN', true],
            ['Sajikan temuan penelitian secara objektif (dapat dilengkapi tabel dan gambar beresolusi tinggi minimal 300 DPI), diikuti pembahasan analitis yang membandingkan hasil dengan teori serta penelitian terdahulu.', false],
            ['', false],
            ['4. KESIMPULAN', true],
            ['Sampaikan simpulan yang menjawab secara langsung tujuan penelitian, implikasi kebijakan/praktis bagi BRIDA dan masyarakat, serta saran singkat untuk penelitian lanjutan.', false],
            ['', false],
            ['DAFTAR PUSTAKA', true],
            ['Gunakan gaya sitasi APA 7th Edition / IEEE dengan minimal 70-80% referensi berasal dari artikel jurnal ilmiah 5-10 tahun terakhir menggunakan Mendeley atau Zotero.', false],
            ['Contoh: Syahrul, A., & Alghifari, A. (2025). Transformasi Tata Kelola Inovasi Daerah Berbasis Digital di Kota Makassar. Jurnal Inovasi dan Riset Daerah (J-SINTESA), 4(1), 12-25. https://doi.org/10.31290/sintesa.v4i1.101', false],
        ];

        $bodyXml = '';
        foreach ($paragraphs as [$txt, $bold]) {
            $safe = htmlspecialchars($txt, ENT_XML1 | ENT_QUOTES, 'UTF-8');
            $rPr = $bold ? '<w:rPr><w:b/><w:sz w:val="24"/></w:rPr>' : '<w:rPr><w:sz w:val="22"/></w:rPr>';
            $bodyXml .= "<w:p><w:r>{$rPr}<w:t xml:space=\"preserve\">{$safe}</w:t></w:r></w:p>";
        }

        $documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            . '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            . '<w:body>' . $bodyXml . '<w:sectPr/></w:body></w:document>';

        $zip->addFromString('[Content_Types].xml', $contentTypes);
        $zip->addFromString('_rels/.rels', $rels);
        $zip->addFromString('word/document.xml', $documentXml);
        $zip->close();

        return response()->download($tmpPath, 'Template_Naskah_OJS_BRIDA_Standar_SINTA.docx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'journal_id' => 'required|exists:journals,id',
            'author_id' => 'nullable|exists:users,id',
            'title' => 'required|string|max:255',
            'abstract' => 'required|string',
            'keywords' => 'required|string|max:255',
            'co_authors' => 'nullable|string|max:255',
            'section' => 'nullable|string|max:100',
            'file' => 'required|file|max:20480'
        ]);

        // Etika Publikasi OJS (Anti Conflict-of-Interest): Hanya akun Penulis (Author) yang boleh mengunggah naskah baru
        if ($request->filled('author_id')) {
            $submitter = User::find($request->author_id);
            if ($submitter && $submitter->role !== 'author') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Pengunggahan naskah baru hanya diizinkan untuk akun Penulis (Author) guna menjaga independensi editorial.'
                ], 403);
            }
        }

        // Gatekeeper Standarisasi Jurnal Ilmiah (SINTA / ARJUNA & PKP OJS)
        $violations = $this->validateManuscriptStandards($request, false);
        if (count($violations) > 0) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengunggahan dicegat! Naskah belum memenuhi Standarisasi Jurnal Ilmiah (SINTA/OJS).',
                'violations' => $violations,
            ], 422);
        }

        try {
            $user = User::where('role', 'author')->first() ?? User::firstOrCreate(
                ['email' => 'author@brida.com'],
                ['name' => 'Andi Rahman', 'role' => 'author', 'password' => bcrypt('password')]
            );

            $filePath = null;
            if ($request->hasFile('file')) {
                $filePath = \App\Services\CloudStorageService::uploadUploadedFile($request->file('file'), 'submissions');
            }

            $authorId = $request->filled('author_id') ? (int) $request->author_id : $user->id;

            $submission = Submission::create([
                'journal_id' => $request->journal_id,
                'author_id' => $authorId,
                'co_authors' => $request->co_authors,
                'title' => trim($request->title),
                'abstract' => trim($request->abstract),
                'keywords' => trim($request->keywords),
                'section' => $request->section ?: 'Original Research',
                'file_path' => $filePath,
                'status' => 'pending',
                'views_count' => 1,
                'downloads_count' => 0,
            ]);

            $submission->load(['journal', 'issue', 'author', 'reviews.reviewer']);
            $jAbbr = $submission->journal?->abbreviation ?: 'OJS BRIDA';

            InboxController::notify(
                InboxController::editorialStaffIds(),
                "[{$jAbbr}] Naskah Baru Masuk: {$submission->title}",
                "Penulis {$submission->author?->name} ({$submission->author?->email}) telah mengunggah naskah baru berjudul:\n\"{$submission->title}\"\n\nNaskah lolos validasi SINTA/OJS dan kini menunggu skrining Dewan Redaksi atau penugasan Mitra Bestari pada menu Evaluasi & Editorial.",
                'submission',
                $authorId,
                $submission->id
            );
            InboxController::notify(
                $authorId,
                "[{$jAbbr}] Tanda Terima Naskah Berhasil Diunggah — {$submission->title}",
                "Yth. {$submission->author?->name},\n\nNaskah Anda berjudul \"{$submission->title}\" telah berhasil diterima oleh sistem {$jAbbr} (Status: Menunggu Editor).\n\nAnda akan menerima pemberitahuan berikutnya di Kotak Masuk ini setelah Editor memproses naskah Anda.",
                'submission',
                null,
                $submission->id
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Naskah lolos validasi standar SINTA/OJS dan berhasil diunggah ke jurnal tujuan!',
                'data' => $submission
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Gagal menyimpan naskah baru', [
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'status' => 'error',
                'message' => 'Terjadi kendala saat menyimpan berkas naskah: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function reuploadRevision(Request $request, $id)
    {
        $request->validate([
            'file' => 'required|file|max:20480'
        ]);

        $violations = $this->validateManuscriptStandards($request, true);
        if (count($violations) > 0) {
            return response()->json([
                'status' => 'error',
                'message' => 'Berkas revisi dicegat! Dokumen belum memenuhi standarisasi berkas/IMRAD.',
                'violations' => $violations,
            ], 422);
        }

        $submission = Submission::findOrFail($id);
        $oldFilePath = $submission->file_path;
        $filePath = \App\Services\CloudStorageService::uploadUploadedFile($request->file('file'), 'submissions');
        $submission->file_path = $filePath;
        $submission->status = 'under_review';
        $submission->save();

        if ($oldFilePath && $oldFilePath !== $filePath) {
            \App\Services\CloudStorageService::deleteFile($oldFilePath);
        }

        // Reset status review para Mitra Bestari aktif (tidak termasuk yang menolak) agar bisa menelaah ulang berkas revisi
        $activeReviewerIds = Review::where('submission_id', $submission->id)
            ->where('status', '!=', 'declined')
            ->pluck('reviewer_id')
            ->all();

        Review::where('submission_id', $submission->id)
            ->where('status', '!=', 'declined')
            ->update([
                'status' => 'in_progress',
                'decision' => null,
            ]);

        $submission->load(['journal', 'author']);
        $jAbbr = $submission->journal?->abbreviation ?: 'OJS BRIDA';
        $notifyTargets = array_merge(InboxController::editorialStaffIds(), $activeReviewerIds);
        InboxController::notify(
            $notifyTargets,
            "[{$jAbbr}] Berkas Revisi Diunggah Penulis — {$submission->title}",
            "Penulis telah mengunggah berkas perbaikan (revisi) untuk naskah:\n\"{$submission->title}\"\n\nStatus naskah kini kembali ke Under Review. Silakan periksa dokumen revisi terbaru melalui Meja Evaluasi Review.",
            'revision',
            $submission->author_id,
            $submission->id
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Berkas naskah revisi lolos validasi standar dan berhasil diunggah! Status kembali menjadi Sedang Direview.',
            'data' => $submission->load(['journal', 'issue', 'author', 'reviews.reviewer'])
        ]);
    }

    public function updateSubmission(Request $request, $id)
    {
        $submission = Submission::findOrFail($id);

        $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'co_authors' => 'nullable|string|max:255',
            'abstract' => 'sometimes|required|string',
            'keywords' => 'nullable|string|max:255',
            'section' => 'nullable|string|max:100',
        ]);

        if ($request->filled('title')) {
            $submission->title = $request->title;
        }
        if ($request->has('co_authors')) {
            $submission->co_authors = $request->co_authors;
        }
        if ($request->filled('abstract')) {
            $submission->abstract = $request->abstract;
        }
        if ($request->has('keywords')) {
            $submission->keywords = $request->keywords;
        }
        if ($request->filled('section')) {
            $submission->section = $request->section;
        }

        $submission->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Metadata naskah (judul, penulis, dan abstrak) berhasil diperbarui!',
            'data' => $submission->load(['journal', 'issue', 'author', 'reviews.reviewer'])
        ]);
    }

    public function deleteSubmission($id)
    {
        $submission = Submission::findOrFail($id);

        if ($submission->file_path) {
            \App\Services\CloudStorageService::deleteFile($submission->file_path);
        }

        $title = $submission->title;
        $submission->delete();

        return response()->json([
            'status' => 'success',
            'message' => "Naskah '{$title}' berhasil dihapus dari sistem OJS BRIDA!"
        ]);
    }

    public function assignReviewer(Request $request, $id)
    {
        $request->validate([
            'reviewer_id' => 'nullable|exists:users,id',
            'reviewer_ids' => 'nullable|array',
            'reviewer_ids.*' => 'exists:users,id',
            'editor_notes' => 'nullable|string'
        ]);

        $reviewerIds = [];
        if (is_array($request->reviewer_ids) && count($request->reviewer_ids) > 0) {
            $reviewerIds = array_unique(array_map('intval', $request->reviewer_ids));
        } elseif ($request->filled('reviewer_id')) {
            $reviewerIds = [(int) $request->reviewer_id];
        }

        if (count($reviewerIds) === 0) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pilih minimal 1 Mitra Bestari (Reviewer) untuk ditugaskan.',
            ], 422);
        }

        $submission = Submission::findOrFail($id);
        if (in_array($submission->status, ['published', 'rejected'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Naskah yang sudah terbit atau ditolak tidak dapat ditugaskan ulang ke Reviewer.',
            ], 422);
        }

        // Cegah penugasan ulang Mitra Bestari yang sudah menolak pada naskah yang sama
        $declinedExisting = Review::with('reviewer')
            ->where('submission_id', $submission->id)
            ->whereIn('reviewer_id', $reviewerIds)
            ->where('status', 'declined')
            ->first();

        if ($declinedExisting) {
            $revName = $declinedExisting->reviewer?->name ?? 'Mitra Bestari tersebut';
            return response()->json([
                'status' => 'error',
                'message' => "{$revName} telah menolak pada naskah ini dan tidak dapat ditugaskan ulang pada naskah yang sama.",
            ], 422);
        }

        $submission->status = 'under_review';
        if ($request->filled('editor_notes')) {
            $submission->editor_notes = $request->editor_notes;
        }
        $submission->save();

        $addedCount = 0;
        $newlyAssignedIds = [];
        foreach ($reviewerIds as $revId) {
            $existing = Review::where('submission_id', $submission->id)
                ->where('reviewer_id', $revId)
                ->first();
            if (!$existing) {
                Review::create([
                    'submission_id' => $submission->id,
                    'reviewer_id' => $revId,
                    'status' => 'assigned',
                ]);
                $addedCount++;
                $newlyAssignedIds[] = $revId;
            }
        }

        if (count($newlyAssignedIds) > 0) {
            $submission->load(['journal', 'author']);
            $jAbbr = $submission->journal?->abbreviation ?: 'OJS BRIDA';
            $senderEditorId = User::where('role', 'editor')->value('id') ?? User::where('role', 'admin')->value('id');
            $noteLine = $submission->editor_notes ? "\nCatatan Pengantar Editor: \"{$submission->editor_notes}\"\n" : '';

            InboxController::notify(
                $newlyAssignedIds,
                "[{$jAbbr}] Undangan Penelaahan (Peer-Review) — {$submission->title}",
                "Yth. Mitra Bestari,\n\nDewan Redaksi {$jAbbr} mengundang Anda untuk menelaah naskah ilmiah berjudul:\n\"{$submission->title}\"{$noteLine}\nSilakan buka menu Meja Evaluasi Review untuk menyatakan Kesediaan (Terima) atau Menolak undangan beserta alasannya.",
                'invitation',
                $senderEditorId,
                $submission->id
            );

            if ($submission->author_id) {
                InboxController::notify(
                    $submission->author_id,
                    "[{$jAbbr}] Naskah Memasuki Tahap Peer-Review — {$submission->title}",
                    "Yth. {$submission->author?->name},\n\nNaskah Anda berjudul \"{$submission->title}\" telah diteruskan oleh Dewan Redaksi kepada Mitra Bestari independen untuk proses Double-Blind Peer Review.\n\nKami akan mengabarkan hasil penelaahan di Kotak Masuk ini setelah evaluasi selesai.",
                    'submission',
                    $senderEditorId,
                    $submission->id
                );
            }
        }

        $totalActive = Review::where('submission_id', $submission->id)
            ->where('status', '!=', 'declined')
            ->count();

        return response()->json([
            'status' => 'success',
            'message' => $addedCount > 0
                ? "Undangan penelaahan berhasil dikirim ke {$addedCount} Mitra Bestari (Total {$totalActive} Reviewer aktif)!"
                : "Reviewer tersebut sudah ditugaskan sebelumnya (Total {$totalActive} Reviewer aktif).",
            'data' => $submission->load(['journal', 'issue', 'author', 'reviews.reviewer'])
        ]);
    }

    /**
     * Hak Reviewer untuk Menerima (Accept) atau Menolak (Decline) Undangan Penelaahan
     */
    public function respondReviewInvitation(Request $request, $id)
    {
        $request->validate([
            'reviewer_id' => 'required|exists:users,id',
            'action' => 'required|in:accept,decline',
            'reason' => 'nullable|string|max:1000',
        ]);

        $submission = Submission::findOrFail($id);
        $review = Review::where('submission_id', $submission->id)
            ->where('reviewer_id', $request->reviewer_id)
            ->firstOrFail();

        if ($review->status === 'completed') {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda sudah menyelesaikan evaluasi untuk naskah ini.',
            ], 422);
        }

        $submission->load('journal');
        $jAbbr = $submission->journal?->abbreviation ?: 'OJS BRIDA';
        $reviewerUser = User::find($request->reviewer_id);
        $revName = $reviewerUser?->name ?: 'Mitra Bestari';

        if ($request->action === 'accept') {
            $review->status = 'in_progress';
            $review->save();
            $msg = 'Undangan penelaahan diterima! Silakan unduh naskah dan isi lembar evaluasi sejawat.';

            InboxController::notify(
                InboxController::editorialStaffIds(),
                "[{$jAbbr}] Mitra Bestari Menerima Undangan Review — {$submission->title}",
                "{$revName} menyatakan BERSEDIA menelaah naskah berjudul:\n\"{$submission->title}\"\n\nProses penelaahan sejawat kini sedang berjalan.",
                'invitation',
                $reviewerUser?->id,
                $submission->id
            );
        } else {
            $reason = trim((string) $request->input('reason', ''));
            if ($reason === '') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Harap tuliskan atau pilih alasan penolakan undangan review.',
                ], 422);
            }
            $review->status = 'declined';
            $review->comments = $reason;
            $review->decision = null;
            $review->save();
            $msg = 'Anda telah menolak undangan penelaahan. Alasan penolakan telah diteruskan ke Dewan Redaksi untuk penunjukan reviewer pengganti.';

            InboxController::notify(
                InboxController::editorialStaffIds(),
                "[{$jAbbr}] ⚠️ Mitra Bestari Menolak Undangan Review — {$submission->title}",
                "{$revName} menolak undangan penelaahan pada naskah:\n\"{$submission->title}\"\n\nAlasan penolakan:\n\"{$reason}\"\n\nSilakan buka menu Evaluasi & Editorial untuk menunjuk Mitra Bestari pengganti.",
                'decline_notice',
                $reviewerUser?->id,
                $submission->id
            );
        }

        return response()->json([
            'status' => 'success',
            'message' => $msg,
            'data' => $submission->load(['journal', 'issue', 'author', 'reviews.reviewer'])
        ]);
    }

    public function removeReviewer($id, $reviewerId)
    {
        $submission = Submission::findOrFail($id);
        $review = Review::where('submission_id', $submission->id)
            ->where('reviewer_id', $reviewerId)
            ->first();

        if ($review && $review->status === 'declined') {
            return response()->json([
                'status' => 'error',
                'message' => 'Riwayat penolakan reviewer pada naskah ini disimpan permanen agar reviewer tidak ditugaskan ulang secara tidak sengaja.',
            ], 422);
        }

        if ($review) {
            $review->delete();
        }

        $remainingActive = Review::where('submission_id', $submission->id)
            ->where('status', '!=', 'declined')
            ->count();
        if ($remainingActive === 0 && $submission->status === 'under_review') {
            $submission->status = 'pending';
            $submission->save();
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Penugasan Reviewer berhasil dihapus.',
            'data' => $submission->load(['journal', 'issue', 'author', 'reviews.reviewer'])
        ]);
    }

    public function editorDecision(Request $request, $id)
    {
        $request->validate([
            'decision' => 'required|in:accept,revise,reject',
            'editor_notes' => 'nullable|string',
        ]);

        $submission = Submission::findOrFail($id);
        if ($submission->status === 'published') {
            return response()->json([
                'status' => 'error',
                'message' => 'Naskah sudah resmi terbit (Published).',
            ], 422);
        }

        if ($request->filled('editor_notes')) {
            $submission->editor_notes = $request->editor_notes;
        }

        if ($request->decision === 'accept') {
            $submission->status = 'accepted';
        } elseif ($request->decision === 'revise') {
            $submission->status = 'revision_required';
        } else {
            $submission->status = 'rejected';
        }
        $submission->save();

        if ($submission->author_id) {
            $submission->load(['journal', 'author']);
            $jAbbr = $submission->journal?->abbreviation ?: 'OJS BRIDA';
            $senderEditorId = User::where('role', 'editor')->value('id') ?? User::where('role', 'admin')->value('id');
            $authorName = $submission->author?->name ?: 'Penulis';
            $reason = $submission->editor_notes ?: 'Tidak ada catatan tambahan dari Dewan Redaksi.';

            if ($request->decision === 'reject') {
                InboxController::notify(
                    $submission->author_id,
                    "[{$jAbbr}] Keputusan Redaksi: Naskah Ditolak — {$submission->title}",
                    "Yth. {$authorName},\n\nTerima kasih telah mengirimkan naskah \"{$submission->title}\" ke {$jAbbr}.\n\nSetelah melalui pemeriksaan Dewan Redaksi, naskah Anda dinyatakan DITOLAK dengan alasan:\n\"{$reason}\"\n\nAnda dapat menyesuaikan topik atau memperbaiki naskah lalu mengirimkannya kembali melalui menu Unggah Naskah Baru.",
                    'decision',
                    $senderEditorId,
                    $submission->id
                );
            } elseif ($request->decision === 'revise') {
                InboxController::notify(
                    $submission->author_id,
                    "[{$jAbbr}] Permintaan Revisi Naskah — {$submission->title}",
                    "Yth. {$authorName},\n\nDewan Redaksi {$jAbbr} meminta perbaikan (revisi) untuk naskah Anda:\n\"{$submission->title}\"\n\nCatatan Redaksi:\n\"{$reason}\"\n\nSilakan unggah berkas naskah revisi Anda melalui menu Dasbor Naskah Saya → Detail Naskah.",
                    'revision',
                    $senderEditorId,
                    $submission->id
                );
            } else {
                InboxController::notify(
                    $submission->author_id,
                    "[{$jAbbr}] Naskah Disetujui (Accepted) — {$submission->title}",
                    "Yth. {$authorName},\n\nSelamat! Naskah Anda berjudul \"{$submission->title}\" telah DISETUJUI (Accepted) oleh Dewan Redaksi {$jAbbr} dan kini menunggu tahap penerbitan resmi serta penerbitan nomor DOI.",
                    'decision',
                    $senderEditorId,
                    $submission->id
                );
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Keputusan akhir Dewan Redaksi (Chief Editor) berhasil disimpan!',
            'data' => $submission->load(['journal', 'issue', 'author', 'reviews.reviewer'])
        ]);
    }

    public function submitReview(Request $request, $id)
    {
        $request->validate([
            'reviewer_id' => 'required|exists:users,id',
            'score_originality' => 'required|integer|min:1|max:100',
            'score_methodology' => 'required|integer|min:1|max:100',
            'score_relevance' => 'required|integer|min:1|max:100',
            'comments' => 'required|string',
            'decision' => 'required|in:accept,revise,reject',
        ]);

        $submission = Submission::findOrFail($id);

        if ($submission->status === 'published') {
            return response()->json([
                'status' => 'error',
                'message' => 'Naskah yang sudah resmi terbit (Published) tidak dapat dinilai ulang.',
            ], 422);
        }

        $reviewer = User::findOrFail($request->reviewer_id);

        $existingReview = Review::where('submission_id', $submission->id)
            ->where('reviewer_id', $reviewer->id)
            ->first();

        if ($existingReview && $existingReview->status === 'declined') {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda telah menolak undangan penelaahan untuk naskah ini sehingga tidak dapat mengirim penilaian.',
            ], 422);
        }

        Review::updateOrCreate(
            [
                'submission_id' => $submission->id,
                'reviewer_id' => $reviewer->id,
            ],
            [
                'score_originality' => $request->score_originality,
                'score_methodology' => $request->score_methodology,
                'score_relevance' => $request->score_relevance,
                'comments' => $request->comments,
                'decision' => $request->decision,
                'status' => 'completed',
            ]
        );

        // Evaluasi agregasi Multi-Reviewer (hanya menghitung Reviewer aktif, mengabaikan yang declined)
        $activeReviews = Review::where('submission_id', $submission->id)
            ->where('status', '!=', 'declined')
            ->get();
        $pendingCount = $activeReviews->whereIn('status', ['assigned', 'in_progress'])->count();
        $hasDeclined = Review::where('submission_id', $submission->id)->where('status', 'declined')->exists();

        if ($pendingCount > 0) {
            $submission->status = 'under_review';
            $submission->save();
            $msg = "Evaluasi Anda berhasil disimpan! Menunggu {$pendingCount} Mitra Bestari lainnya menyelesaikan penilaian.";
        } elseif ($hasDeclined && $activeReviews->count() < 2) {
            // Jika ada reviewer lain yang menolak sehingga hanya 1 reviewer aktif yang selesai, tahan di under_review agar Editor bisa tunjuk pengganti atau putuskan langsung
            $submission->status = 'under_review';
            $submission->save();
            $msg = 'Evaluasi Anda berhasil disimpan! Menunggu tinjauan Dewan Redaksi (terdapat Mitra Bestari lain yang menolak undangan).';
        } else {
            $decisions = $activeReviews->pluck('decision')->filter()->values();
            $allAccept = $decisions->every(fn($d) => $d === 'accept');
            $allReject = $decisions->every(fn($d) => $d === 'reject');
            $hasRevise = $decisions->contains('revise');
            $hasReject = $decisions->contains('reject');

            if ($allAccept) {
                $submission->status = 'accepted';
                $msg = 'Seluruh Mitra Bestari menyetujui naskah! Status berubah menjadi DISETUJUI (ACCEPTED) dan siap diterbitkan Editor.';
            } elseif ($allReject) {
                $submission->status = 'rejected';
                $msg = 'Seluruh Mitra Bestari menolak naskah. Status berubah menjadi DITOLAK.';
            } elseif ($hasRevise && !$hasReject) {
                $submission->status = 'revision_required';
                $msg = 'Hasil evaluasi lengkap dengan catatan perbaikan. Status berubah menjadi PERLU REVISI untuk Penulis.';
            } else {
                $submission->status = 'under_review';
                $msg = 'Seluruh Mitra Bestari telah menilai dengan rekomendasi berbeda (Split Decision). Menunggu keputusan akhir Chief Editor!';
            }
            $submission->save();
        }

        // Kirim notifikasi hasil evaluasi ke Dewan Redaksi (Admin & Editor)
        $submission->load(['journal', 'author']);
        $jAbbr = $submission->journal?->abbreviation ?: 'OJS BRIDA';
        $decLabel = $request->decision === 'accept' ? 'DITERIMA (Accept)' : ($request->decision === 'revise' ? 'PERLU REVISI (Revise)' : 'DITOLAK (Reject)');

        InboxController::notify(
            InboxController::editorialStaffIds(),
            "[{$jAbbr}] Hasil Penelaahan Mitra Bestari ({$decLabel}) — {$submission->title}",
            "Mitra Bestari {$reviewer->name} telah menyelesaikan evaluasi naskah:\n\"{$submission->title}\"\n\nRekomendasi: {$decLabel}\nSkor: Orisinalitas {$request->score_originality} | Metodologi {$request->score_methodology} | Relevansi {$request->score_relevance}\nCatatan Reviewer: \"{$request->comments}\"\n\nStatus naskah saat ini: " . strtoupper($submission->status),
            'decision',
            $reviewer->id,
            $submission->id
        );

        if ($submission->author_id && in_array($submission->status, ['revision_required', 'accepted', 'rejected'], true)) {
            $senderEditorId = User::where('role', 'editor')->value('id') ?? User::where('role', 'admin')->value('id');
            $authorName = $submission->author?->name ?: 'Penulis';
            $allComments = $activeReviews->where('status', 'completed')->pluck('comments')->filter()->values();
            $formattedNotes = $allComments->map(fn($c, $i) => 'Mitra Bestari #' . ($i + 1) . ': "' . $c . '"')->implode("\n");

            if ($submission->status === 'revision_required') {
                InboxController::notify(
                    $submission->author_id,
                    "[{$jAbbr}] Permintaan Revisi Hasil Peer-Review — {$submission->title}",
                    "Yth. {$authorName},\n\nProses Double-Blind Peer Review untuk naskah \"{$submission->title}\" telah selesai dengan rekomendasi PERLU REVISI.\n\nMasukan Mitra Bestari:\n{$formattedNotes}\n\nSilakan perbaiki dokumen Anda lalu unggah berkas revisi melalui Dasbor Naskah Saya → Detail Naskah.",
                    'revision',
                    $senderEditorId,
                    $submission->id
                );
            } elseif ($submission->status === 'accepted') {
                InboxController::notify(
                    $submission->author_id,
                    "[{$jAbbr}] Selamat! Naskah Lolos Peer-Review (Accepted) — {$submission->title}",
                    "Yth. {$authorName},\n\nSeluruh Mitra Bestari telah menyetujui naskah Anda berjudul \"{$submission->title}\".\n\nMasukan Penelaahan:\n{$formattedNotes}\n\nNaskah Anda kini siap diterbitkan ke edisi aktif beserta nomor DOI resmi.",
                    'decision',
                    $senderEditorId,
                    $submission->id
                );
            } elseif ($submission->status === 'rejected') {
                InboxController::notify(
                    $submission->author_id,
                    "[{$jAbbr}] Keputusan Peer-Review: Naskah Ditolak — {$submission->title}",
                    "Yth. {$authorName},\n\nBerdasarkan hasil Double-Blind Peer Review, naskah \"{$submission->title}\" dinyatakan DITOLAK.\n\nCatatan Evaluasi:\n{$formattedNotes}\n\nTerima kasih atas partisipasi Anda di {$jAbbr}.",
                    'decision',
                    $senderEditorId,
                    $submission->id
                );
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => $msg,
            'data' => $submission->load(['journal', 'issue', 'author', 'reviews.reviewer'])
        ]);
    }

    public function publishSubmission(Request $request, $id)
    {
        $submission = Submission::with('journal')->findOrFail($id);

        if ($submission->status === 'published') {
            return response()->json([
                'status' => 'error',
                'message' => 'Naskah ini sudah diterbitkan sebelumnya.',
            ], 422);
        }

        $issue = Issue::where('journal_id', $submission->journal_id)
            ->where('is_current', true)
            ->first();

        if (!$issue) {
            $issue = Issue::create([
                'journal_id' => $submission->journal_id,
                'volume' => 'Vol. 1',
                'number' => 'No. 1',
                'year' => (int) date('Y'),
                'title' => 'Edisi Reguler ' . $submission->journal->abbreviation,
                'is_current' => true,
                'published_at' => now()->toDateString(),
            ]);
        }

        $code = strtolower($submission->journal->code ?? 'jurnal');
        $volNum = preg_replace('/\D/', '', $issue->volume) ?: '1';
        $noNum = preg_replace('/\D/', '', $issue->number) ?: '1';

        $submission->issue_id = $request->input('issue_id', $issue->id);
        $submission->status = 'published';
        $submission->doi = $request->input('doi') ?: sprintf('10.31290/%s.v%si%s.%d', $code, $volNum, $noNum, 100 + $submission->id);
        $submission->pages = $request->input('pages') ?: '41-54';
        $submission->published_at = now();
        $submission->save();

        if ($submission->author_id) {
            $submission->load(['journal', 'author']);
            $jAbbr = $submission->journal?->abbreviation ?: 'OJS BRIDA';
            $senderEditorId = User::where('role', 'editor')->value('id') ?? User::where('role', 'admin')->value('id');
            InboxController::notify(
                $submission->author_id,
                "[{$jAbbr}] 🎉 Artikel Resmi Terbit & Ber-DOI — {$submission->title}",
                "Yth. {$submission->author?->name},\n\nSelamat! Artikel ilmiah Anda berjudul:\n\"{$submission->title}\"\n\ntelah RESMI TERBIT pada {$jAbbr} ({$issue->volume} {$issue->number}, {$issue->year}) dengan Nomor DOI: {$submission->doi}.\n\nArtikel Anda kini telah terindeks terbuka di Portal Publik Jurnal BRIDA Kota Makassar.",
                'published',
                $senderEditorId,
                $submission->id
            );
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Naskah resmi diterbitkan (Published) lengkap dengan nomor DOI!',
            'data' => $submission->load(['journal', 'issue', 'author', 'reviews.reviewer'])
        ]);
    }

    public function stats(Request $request)
    {
        $this->ensureSeeded();

        $journalId = $request->query('journal_id');
        $baseQuery = Submission::query();
        if ($journalId && $journalId !== 'all') {
            $baseQuery->where('journal_id', $journalId);
        }

        $total = (clone $baseQuery)->count();
        $pending = (clone $baseQuery)->where('status', 'pending')->count();
        $underReview = (clone $baseQuery)->where('status', 'under_review')->count();
        $revision = (clone $baseQuery)->where('status', 'revision_required')->count();
        $accepted = (clone $baseQuery)->where('status', 'accepted')->count();
        $published = (clone $baseQuery)->where('status', 'published')->count();
        $rejected = (clone $baseQuery)->where('status', 'rejected')->count();

        $reviewers = User::where('role', 'reviewer')->get();
        $users = User::all();

        $journalStats = Journal::withCount([
            'submissions as total',
            'submissions as published' => fn($q) => $q->where('status', 'published'),
            'submissions as in_process' => fn($q) => $q->whereIn('status', ['pending', 'under_review', 'revision_required', 'accepted']),
        ])->get();

        return response()->json([
            'journals_count' => Journal::count(),
            'total' => $total,
            'pending' => $pending,
            'under_review' => $underReview,
            'revision_required' => $revision,
            'accepted' => $accepted,
            'published' => $published,
            'rejected' => $rejected,
            'reviewers' => $reviewers,
            'users' => $users,
            'by_journal' => $journalStats,
        ]);
    }

    public function users()
    {
        $this->ensureSeeded();
        return response()->json([
            'status' => 'success',
            'data' => User::orderBy('id', 'desc')->get()
        ]);
    }

    public function storeUser(Request $request)
    {
        if ($denied = $this->ensureAdminActor($request)) {
            return $denied;
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'role' => 'required|in:admin,editor,reviewer,author',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'role' => $request->role,
            'affiliation' => $request->input('affiliation'),
            'specialty' => $request->input('specialty'),
            'password' => bcrypt($request->input('password', 'password')),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Pengguna baru berhasil ditambahkan ke dalam sistem!',
            'data' => $user
        ]);
    }

    public function updateUser(Request $request, $id)
    {
        if ($denied = $this->ensureAdminActor($request)) {
            return $denied;
        }

        $user = User::findOrFail($id);
        if ($request->filled('name')) {
            $user->name = $request->name;
        }
        if ($request->filled('email')) {
            $user->email = $request->email;
        }
        if ($request->filled('role') && in_array($request->role, ['admin', 'editor', 'reviewer', 'author'])) {
            $user->role = $request->role;
        }
        $user->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Data pengguna berhasil diperbarui!',
            'data' => $user
        ]);
    }

    public function deleteUser(Request $request, $id)
    {
        if ($denied = $this->ensureAdminActor($request)) {
            return $denied;
        }

        $user = User::findOrFail($id);

        if ($user->role === 'admin' && User::where('role', 'admin')->count() <= 1) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak dapat menghapus akun Administrator terakhir di sistem.'
            ], 422);
        }

        $user->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Pengguna berhasil dihapus dari sistem!'
        ]);
    }
}
