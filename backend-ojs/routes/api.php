<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SubmissionController;
use App\Http\Controllers\ForumController;
use App\Http\Controllers\InboxController;
use App\Services\CloudStorageService;

// Health Check Endpoint untuk Cloud (Render / Uptime Monitor)
Route::get('/health', function () {
    $dbOk = true;
    $dbError = null;
    try {
        DB::connection()->getPdo();
    } catch (\Throwable $e) {
        $dbOk = false;
        $dbError = $e->getMessage();
    }

    return response()->json([
        'status' => $dbOk ? 'ok' : 'degraded',
        'app' => config('app.name', 'OJS BRIDA'),
        'database' => $dbOk ? 'connected' : 'error',
        'database_error' => $dbOk ? null : $dbError,
        'storage_driver' => CloudStorageService::activeDriverName(),
        'timestamp' => now()->toIso8601String(),
    ], $dbOk ? 200 : 503);
});

// Inisialisasi Migrasi & Seeder Aman untuk Serverless Cloud (Vercel) — Idempotent (tidak menimpa data)
Route::get('/setup-db', function () {
    try {
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        $migrateOutput = trim(\Illuminate\Support\Facades\Artisan::output());

        \Illuminate\Support\Facades\Artisan::call('db:seed', [
            '--class' => 'CloudBootstrapSeeder',
            '--force' => true,
        ]);
        $seedOutput = trim(\Illuminate\Support\Facades\Artisan::output());

        return response()->json([
            'status' => 'success',
            'message' => 'Database cloud berhasil dimigrasi dan diinisialisasi!',
            'migrate' => $migrateOutput,
            'seed' => $seedOutput,
            'storage_driver' => CloudStorageService::activeDriverName(),
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
        ], 500);
    }
});

// Bootstrap Gabungan (1 HTTP Call + 1 Koneksi DB untuk memuat Portal/Dasbor 4x lebih cepat)
Route::get('/bootstrap', function (Request $request) {
    $subCtrl = app(SubmissionController::class);
    $forumCtrl = app(ForumController::class);

    $journalsData = $subCtrl->journals()->getData(true);
    $subsData = $subCtrl->index($request)->getData(true);
    $statsData = $subCtrl->stats($request)->getData(true);
    $forumData = $forumCtrl->index($request)->getData(true);

    $inboxUnread = 0;
    if ($request->filled('user_id')) {
        try {
            InboxController::ensureInboxReady();
            $inboxUnread = \App\Models\InboxMessage::where('recipient_id', (int) $request->query('user_id'))
                ->where('is_read', false)
                ->count();
        } catch (\Throwable $e) {
            $inboxUnread = 0;
        }
    }

    return response()->json([
        'status' => 'success',
        'journals' => $journalsData['data'] ?? [],
        'submissions' => $subsData['data'] ?? [],
        'stats' => $statsData,
        'forum' => $forumData['data'] ?? null,
        'inbox_unread' => $inboxUnread,
    ]);
});

Route::post('/login', [SubmissionController::class, 'login']);
Route::post('/register', [SubmissionController::class, 'register']);

Route::get('/template-naskah', [SubmissionController::class, 'downloadTemplate']);
Route::get('/journals', [SubmissionController::class, 'journals']);
Route::post('/journals', [SubmissionController::class, 'storeJournal']);
Route::put('/journals/{id}', [SubmissionController::class, 'updateJournal']);
Route::delete('/journals/{id}', [SubmissionController::class, 'deleteJournal']);
Route::post('/issues', [SubmissionController::class, 'storeIssue']);

Route::get('/submissions', [SubmissionController::class, 'index']);
Route::post('/submissions', [SubmissionController::class, 'store']);
Route::put('/submissions/{id}', [SubmissionController::class, 'updateSubmission']);
Route::delete('/submissions/{id}', [SubmissionController::class, 'deleteSubmission']);
Route::post('/submissions/{id}/reupload', [SubmissionController::class, 'reuploadRevision']);
Route::post('/submissions/{id}/assign-reviewer', [SubmissionController::class, 'assignReviewer']);
Route::post('/submissions/{id}/review-response', [SubmissionController::class, 'respondReviewInvitation']);
Route::delete('/submissions/{id}/reviewers/{reviewerId}', [SubmissionController::class, 'removeReviewer']);
Route::post('/submissions/{id}/editor-decision', [SubmissionController::class, 'editorDecision']);
Route::post('/submissions/{id}/review', [SubmissionController::class, 'submitReview']);
Route::post('/submissions/{id}/publish', [SubmissionController::class, 'publishSubmission']);

Route::get('/stats', [SubmissionController::class, 'stats']);
Route::get('/users', [SubmissionController::class, 'users']);
Route::post('/users', [SubmissionController::class, 'storeUser']);
Route::put('/users/{id}', [SubmissionController::class, 'updateUser']);
Route::delete('/users/{id}', [SubmissionController::class, 'deleteUser']);

// Forum Riset & Trending Topik (Ala Threads / X — Terbuka dibaca semua pengunjung & role)
Route::get('/forum/posts', [ForumController::class, 'index']);
Route::post('/forum/posts', [ForumController::class, 'store']);
Route::post('/forum/posts/{id}/like', [ForumController::class, 'toggleLike']);
Route::post('/forum/posts/{id}/pin', [ForumController::class, 'togglePin']);
Route::delete('/forum/posts/{id}', [ForumController::class, 'destroy']);

// Interaksi Sosial Artikel Jurnal Terbit (Like, Komen, Hapus Komen)
Route::post('/submissions/{id}/like', [ForumController::class, 'toggleArticleLike']);
Route::post('/submissions/{id}/comments', [ForumController::class, 'storeArticleComment']);
Route::delete('/submissions/{id}/comments/{commentId}', [ForumController::class, 'destroyArticleComment']);

// Kotak Masuk Terpadu Antar-Role (Email/Pesan Sistem & Komunikasi 2 Arah)
Route::get('/inbox', [InboxController::class, 'index']);
Route::post('/inbox', [InboxController::class, 'store']);
Route::post('/inbox/read-all', [InboxController::class, 'markAllRead']);
Route::post('/inbox/{id}/read', [InboxController::class, 'markRead']);
Route::delete('/inbox/{id}', [InboxController::class, 'destroy']);
