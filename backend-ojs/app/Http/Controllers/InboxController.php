<?php

namespace App\Http\Controllers;

use App\Models\InboxMessage;
use App\Models\Review;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

class InboxController extends Controller
{
    /**
     * Pastikan tabel inbox_messages tersedia (aman untuk Vercel Serverless / TiDB)
     * dan sinkronkan pesan historis sekali saat tabel baru kosong.
     */
    public static function ensureInboxReady(): void
    {
        if (!Schema::hasTable('inbox_messages')) {
            Schema::create('inbox_messages', function (Blueprint $table) {
                $table->id();
                $table->foreignId('sender_id')->nullable()->constrained('users')->onDelete('set null');
                $table->foreignId('recipient_id')->constrained('users')->onDelete('cascade');
                $table->foreignId('submission_id')->nullable()->constrained('submissions')->onDelete('set null');
                $table->string('category', 40)->default('direct');
                $table->string('subject');
                $table->text('body');
                $table->boolean('is_read')->default(false);
                $table->timestamp('read_at')->nullable();
                $table->timestamps();

                $table->index(['recipient_id', 'is_read']);
                $table->index(['sender_id', 'created_at']);
            });
        }

        // Seed otomatis pesan historis dari naskah & undangan review yang sudah ada (hanya jika inbox masih kosong)
        if (InboxMessage::count() === 0 && Submission::count() > 0) {
            self::bootstrapInitialMessages();
        }
    }

    /**
     * Helper terpusat untuk mengirim pesan otomatis ke 1 atau banyak penerima dari workflow OJS.
     */
    public static function notify(
        int|array $recipientIds,
        string $subject,
        string $body,
        string $category = 'direct',
        ?int $senderId = null,
        ?int $submissionId = null
    ): void {
        try {
            self::ensureInboxReady();
            $ids = is_array($recipientIds) ? $recipientIds : [$recipientIds];
            $uniqueIds = array_values(array_unique(array_filter(array_map('intval', $ids))));

            foreach ($uniqueIds as $recId) {
                if ($senderId && $recId === $senderId) {
                    continue;
                }
                InboxMessage::create([
                    'sender_id' => $senderId,
                    'recipient_id' => $recId,
                    'submission_id' => $submissionId,
                    'category' => $category,
                    'subject' => mb_substr($subject, 0, 240),
                    'body' => $body,
                    'is_read' => false,
                ]);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Gagal membuat pesan Kotak Masuk: ' . $e->getMessage());
        }
    }

    /**
     * Helper mengambil seluruh ID Admin & Editor aktif.
     */
    public static function editorialStaffIds(): array
    {
        return User::whereIn('role', ['admin', 'editor'])->pluck('id')->all();
    }

    /**
     * Membuat pesan awal dari status naskah & review yang sudah ada di DB agar Kotak Masuk langsung bermakna.
     */
    private static function bootstrapInitialMessages(): void
    {
        $editorUser = User::where('role', 'editor')->first() ?? User::where('role', 'admin')->first();
        $editorId = $editorUser?->id;
        $staffIds = self::editorialStaffIds();

        $submissions = Submission::with(['journal', 'author', 'reviews.reviewer'])
            ->orderBy('id', 'desc')
            ->limit(25)
            ->get();

        foreach ($submissions as $sub) {
            $journalAbbr = $sub->journal?->abbreviation ?: 'OJS BRIDA';

            if ($sub->status === 'rejected' && $sub->author_id) {
                $reason = $sub->editor_notes ?: 'Naskah dinyatakan belum memenuhi kriteria atau kesesuaian ruang lingkup jurnal tujuan.';
                InboxMessage::create([
                    'sender_id' => $editorId,
                    'recipient_id' => $sub->author_id,
                    'submission_id' => $sub->id,
                    'category' => 'decision',
                    'subject' => "[{$journalAbbr}] Keputusan Redaksi: Naskah Ditolak — {$sub->title}",
                    'body' => "Yth. {$sub->author?->name},\n\nTerima kasih telah mengirimkan naskah \"{$sub->title}\" ke {$journalAbbr}.\n\nSetelah melalui evaluasi Dewan Redaksi, naskah Anda dinyatakan DITOLAK dengan alasan:\n\"{$reason}\"\n\nAnda dapat memperbaiki naskah atau menyesuaikan topik jurnal lalu mengirimkannya kembali melalui menu Unggah Naskah Baru.",
                    'is_read' => false,
                ]);
            } elseif ($sub->status === 'revision_required' && $sub->author_id) {
                $latestRevComment = $sub->reviews->where('status', 'completed')->pluck('comments')->filter()->implode("\n- ");
                $notes = $sub->editor_notes ?: ($latestRevComment ? "Catatan Reviewer:\n- {$latestRevComment}" : 'Mohon perbaiki naskah sesuai masukan penelaahan sejawat.');
                InboxMessage::create([
                    'sender_id' => $editorId,
                    'recipient_id' => $sub->author_id,
                    'submission_id' => $sub->id,
                    'category' => 'revision',
                    'subject' => "[{$journalAbbr}] Permintaan Revisi Naskah — {$sub->title}",
                    'body' => "Yth. {$sub->author?->name},\n\nNaskah Anda \"{$sub->title}\" memerlukan revisi sebelum dapat dipertimbangkan untuk diterbitkan.\n\n{$notes}\n\nSilakan unggah berkas perbaikan melalui Dasbor Naskah Saya → Detail Naskah.",
                    'is_read' => false,
                ]);
            } elseif ($sub->status === 'published' && $sub->author_id) {
                InboxMessage::create([
                    'sender_id' => $editorId,
                    'recipient_id' => $sub->author_id,
                    'submission_id' => $sub->id,
                    'category' => 'published',
                    'subject' => "[{$journalAbbr}] Selamat! Artikel Resmi Terbit — {$sub->title}",
                    'body' => "Yth. {$sub->author?->name},\n\nSelamat! Artikel ilmiah Anda berjudul \"{$sub->title}\" telah resmi diterbitkan pada {$journalAbbr} dengan Nomor DOI: " . ($sub->doi ?: '-') . ".\n\nArtikel kini dapat diakses terbuka oleh publik melalui Portal Publik Jurnal BRIDA Kota Makassar.",
                    'is_read' => true,
                    'read_at' => now(),
                ]);
            } elseif ($sub->status === 'pending') {
                foreach ($staffIds as $sid) {
                    InboxMessage::create([
                        'sender_id' => $sub->author_id,
                        'recipient_id' => $sid,
                        'submission_id' => $sub->id,
                        'category' => 'submission',
                        'subject' => "[{$journalAbbr}] Naskah Baru Menunggu Penugasan — {$sub->title}",
                        'body' => "Naskah baru berjudul \"{$sub->title}\" dari {$sub->author?->name} telah lolos validasi SINTA/OJS dan menunggu skrining Editor atau penugasan Reviewer di Meja Evaluasi.",
                        'is_read' => false,
                    ]);
                }
            }

            // Sinkronisasi undangan & penolakan reviewer
            foreach ($sub->reviews as $rev) {
                if ($rev->status === 'assigned' && $rev->reviewer_id) {
                    InboxMessage::create([
                        'sender_id' => $editorId,
                        'recipient_id' => $rev->reviewer_id,
                        'submission_id' => $sub->id,
                        'category' => 'invitation',
                        'subject' => "[{$journalAbbr}] Undangan Review — {$sub->title}",
                        'body' => "Yth. {$rev->reviewer?->name},\n\nDewan Redaksi {$journalAbbr} mengundang Anda sebagai Reviewer untuk menelaah naskah:\n\"{$sub->title}\"\n\n" . ($sub->editor_notes ? "Catatan Editor: \"{$sub->editor_notes}\"\n\n" : '') . "Silakan buka menu Meja Evaluasi Review untuk menerima atau menolak undangan ini.",
                        'is_read' => false,
                    ]);
                } elseif ($rev->status === 'declined') {
                    foreach ($staffIds as $sid) {
                        InboxMessage::create([
                            'sender_id' => $rev->reviewer_id,
                            'recipient_id' => $sid,
                            'submission_id' => $sub->id,
                            'category' => 'decline_notice',
                            'subject' => "[{$journalAbbr}] Reviewer Menolak Undangan Review — {$sub->title}",
                            'body' => "{$rev->reviewer?->name} menolak undangan penelaahan pada naskah \"{$sub->title}\".\n\nAlasan: \"" . ($rev->comments ?: 'Tidak mencantumkan alasan.') . "\"\n\nSilakan tunjuk Reviewer pengganti pada Meja Evaluasi & Editorial.",
                            'is_read' => false,
                        ]);
                    }
                }
            }
        }
    }

    /**
     * GET /api/inbox?user_id=...&box=inbox|sent|all&category=...&q=...
     */
    public function index(Request $request)
    {
        self::ensureInboxReady();

        $userId = (int) $request->input('user_id');
        if (!$userId) {
            return response()->json([
                'status' => 'error',
                'message' => 'Parameter user_id wajib diisi.',
            ], 422);
        }

        $viewer = User::find($userId);
        if (!$viewer) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pengguna tidak ditemukan.',
            ], 404);
        }

        $box = $request->input('box', 'inbox'); // inbox | sent | all
        $category = $request->input('category', 'all');
        $q = trim((string) $request->input('q', ''));

        $query = InboxMessage::with([
            'sender:id,name,email,role,affiliation',
            'recipient:id,name,email,role,affiliation',
            'submission:id,journal_id,title,status,doi,editor_notes',
            'submission.journal:id,abbreviation,title',
        ]);

        if ($box === 'sent') {
            $query->where('sender_id', $userId);
        } elseif ($box === 'all') {
            $query->where(function ($sub) use ($userId) {
                $sub->where('recipient_id', $userId)->orWhere('sender_id', $userId);
            });
        } else {
            $query->where('recipient_id', $userId);
        }

        if ($category && $category !== 'all') {
            if ($category === 'unread') {
                $query->where('recipient_id', $userId)->where('is_read', false);
            } else {
                $query->where('category', $category);
            }
        }

        if ($q !== '') {
            $query->where(function ($sub) use ($q) {
                $sub->where('subject', 'like', "%{$q}%")
                    ->orWhere('body', 'like', "%{$q}%");
            });
        }

        $messages = $query->orderBy('created_at', 'desc')->limit(100)->get();

        // Daftar calon penerima sesuai etika Double-Blind OJS:
        // - Author hanya bisa mengirim pesan langsung ke Admin & Editor (tidak bisa lihat/hubungi Reviewer langsung)
        // - Reviewer hanya bisa mengirim pesan langsung ke Admin & Editor (menjaga double-blind)
        // - Admin & Editor bisa mengirim pesan ke semua pengguna aktif
        $recipientsQuery = User::select('id', 'name', 'email', 'role', 'affiliation')
            ->where('id', '!=', $userId)
            ->orderBy('role')
            ->orderBy('name');

        if (in_array($viewer->role, ['author', 'reviewer'], true)) {
            $recipientsQuery->whereIn('role', ['admin', 'editor']);
        }

        $unreadCount = InboxMessage::where('recipient_id', $userId)
            ->where('is_read', false)
            ->count();

        $totalInbox = InboxMessage::where('recipient_id', $userId)->count();
        $totalSent = InboxMessage::where('sender_id', $userId)->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'messages' => $messages,
                'recipients' => $recipientsQuery->get(),
                'counts' => [
                    'unread' => $unreadCount,
                    'inbox' => $totalInbox,
                    'sent' => $totalSent,
                ],
            ],
        ]);
    }

    /**
     * POST /api/inbox — Kirim pesan baru atau balasan antar-role yang terhubung
     */
    public function store(Request $request)
    {
        self::ensureInboxReady();

        $request->validate([
            'sender_id' => 'required|exists:users,id',
            'recipient_id' => 'required|exists:users,id',
            'submission_id' => 'nullable|exists:submissions,id',
            'category' => 'nullable|string|max:40',
            'subject' => 'required|string|max:240',
            'body' => 'required|string|max:5000',
        ]);

        $sender = User::findOrFail($request->sender_id);
        $recipient = User::findOrFail($request->recipient_id);

        if ((int) $sender->id === (int) $recipient->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak dapat mengirim pesan ke akun sendiri.',
            ], 422);
        }

        // Proteksi etika Double-Blind Peer Review: Author & Reviewer tidak boleh berkirim pesan langsung satu sama lain
        if (
            ($sender->role === 'author' && $recipient->role === 'reviewer') ||
            ($sender->role === 'reviewer' && $recipient->role === 'author')
        ) {
            return response()->json([
                'status' => 'error',
                'message' => 'Demi menjaga kerahasiaan Double-Blind Peer Review, komunikasi antara Penulis dan Reviewer wajib melalui Editor / Dewan Redaksi.',
            ], 403);
        }

        $msg = InboxMessage::create([
            'sender_id' => $sender->id,
            'recipient_id' => $recipient->id,
            'submission_id' => $request->submission_id ?: null,
            'category' => $request->input('category', 'direct'),
            'subject' => trim($request->subject),
            'body' => trim($request->body),
            'is_read' => false,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Pesan berhasil dikirim ke Kotak Masuk {$recipient->name}!",
            'data' => $msg->load([
                'sender:id,name,email,role,affiliation',
                'recipient:id,name,email,role,affiliation',
                'submission:id,journal_id,title,status,doi,editor_notes',
                'submission.journal:id,abbreviation,title',
            ]),
        ], 201);
    }

    /**
     * POST /api/inbox/{id}/read — Tandai 1 pesan telah dibaca
     */
    public function markRead(Request $request, $id)
    {
        self::ensureInboxReady();

        $msg = InboxMessage::findOrFail($id);
        $userId = (int) $request->input('user_id');
        if ($userId && (int) $msg->recipient_id !== $userId) {
            return response()->json(['status' => 'success', 'data' => $msg]);
        }

        if (!$msg->is_read) {
            $msg->is_read = true;
            $msg->read_at = now();
            $msg->save();
        }

        return response()->json([
            'status' => 'success',
            'data' => $msg,
        ]);
    }

    /**
     * POST /api/inbox/read-all — Tandai seluruh pesan masuk sebagai sudah dibaca
     */
    public function markAllRead(Request $request)
    {
        self::ensureInboxReady();

        $request->validate(['user_id' => 'required|exists:users,id']);
        InboxMessage::where('recipient_id', $request->user_id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Seluruh pesan di Kotak Masuk telah ditandai dibaca.',
        ]);
    }

    /**
     * DELETE /api/inbox/{id}
     */
    public function destroy(Request $request, $id)
    {
        self::ensureInboxReady();

        $msg = InboxMessage::findOrFail($id);
        $userId = (int) $request->input('user_id');
        if ($userId && (int) $msg->recipient_id !== $userId && (int) $msg->sender_id !== $userId) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak berhak menghapus pesan ini.',
            ], 403);
        }

        $msg->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Pesan berhasil dihapus dari Kotak Masuk.',
        ]);
    }
}
