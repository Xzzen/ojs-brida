<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SubmissionController;
use App\Http\Controllers\ForumController;
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
