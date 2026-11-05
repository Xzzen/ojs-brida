<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\SubmissionController;

Route::get('/journals', [SubmissionController::class, 'journals']);
Route::post('/journals', [SubmissionController::class, 'storeJournal']);

Route::get('/submissions', [SubmissionController::class, 'index']);
Route::post('/submissions', [SubmissionController::class, 'store']);
Route::post('/submissions/{id}/assign-reviewer', [SubmissionController::class, 'assignReviewer']);
Route::post('/submissions/{id}/review', [SubmissionController::class, 'submitReview']);
Route::post('/submissions/{id}/publish', [SubmissionController::class, 'publishSubmission']);

Route::get('/stats', [SubmissionController::class, 'stats']);
