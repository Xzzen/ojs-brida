<?php

namespace App\Http\Controllers;

use App\Models\Journal;
use App\Models\Issue;
use App\Models\Submission;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

class SubmissionController extends Controller
{
    private function ensureSeeded()
    {
        if (Journal::count() === 0) {
            Artisan::call('db:seed', ['--force' => true]);
        }
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
        $request->validate([
            'code' => 'required|string|max:50|unique:journals,code',
            'title' => 'required|string|max:255',
            'abbreviation' => 'required|string|max:50',
            'issn_print' => 'nullable|string|max:30',
            'issn_online' => 'nullable|string|max:30',
            'description' => 'required|string',
            'focus_scope' => 'nullable|string',
            'chief_editor' => 'nullable|string|max:150',
            'frequency' => 'nullable|string|max:100',
            'accreditation' => 'nullable|string|max:50',
            'accent_color' => 'nullable|string|max:30',
        ]);

        $journal = Journal::create([
            'code' => strtolower(preg_replace('/[^a-zA-Z0-9_-]/', '', $request->code)),
            'title' => $request->title,
            'abbreviation' => strtoupper($request->abbreviation),
            'issn_print' => $request->issn_print ?: '2899-001X',
            'issn_online' => $request->issn_online ?: '2899-0028',
            'description' => $request->description,
            'focus_scope' => $request->focus_scope ?: 'Riset Terapan, Kebijakan Publik, dan Inovasi Daerah',
            'publisher' => 'BRIDA Kota Makassar',
            'chief_editor' => $request->chief_editor ?: 'Dr. Ir. H. Andi Syahrul, M.Si.',
            'frequency' => $request->frequency ?: '2 Kali Setahun',
            'accreditation' => $request->accreditation ?: 'SINTA 3',
            'accent_color' => $request->accent_color ?: 'red',
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
                  ->orWhere('doi', 'like', "%{$s}%");
            });
        }

        return response()->json([
            'status' => 'success',
            'data' => $query->get()
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'journal_id' => 'required|exists:journals,id',
            'title' => 'required|string|max:255',
            'abstract' => 'required|string',
            'keywords' => 'nullable|string|max:255',
            'co_authors' => 'nullable|string|max:255',
            'section' => 'nullable|string|max:100',
            'file' => 'required|file|mimes:pdf,doc,docx|max:10240'
        ]);

        $user = User::where('role', 'author')->first() ?? User::firstOrCreate(
            ['email' => 'author@brida.com'],
            ['name' => 'Balanza Aryandi Datu Hari Putra', 'role' => 'author', 'password' => bcrypt('password')]
        );

        $filePath = null;
        if ($request->hasFile('file')) {
            $filePath = $request->file('file')->store('submissions', 'public');
        }

        $submission = Submission::create([
            'journal_id' => $request->journal_id,
            'author_id' => $request->input('author_id', $user->id),
            'co_authors' => $request->co_authors,
            'title' => $request->title,
            'abstract' => $request->abstract,
            'keywords' => $request->keywords ?: 'Inovasi Daerah, Riset BRIDA, Makassar',
            'section' => $request->section ?: 'Original Research',
            'file_path' => $filePath,
            'status' => 'pending',
            'views_count' => 1,
            'downloads_count' => 0,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Naskah beserta Dokumen File berhasil diunggah ke jurnal tujuan!',
            'data' => $submission->load(['journal', 'issue', 'author', 'reviews.reviewer'])
        ]);
    }

    public function assignReviewer(Request $request, $id)
    {
        $request->validate([
            'reviewer_id' => 'required|exists:users,id',
            'editor_notes' => 'nullable|string'
        ]);

        $submission = Submission::findOrFail($id);
        $submission->status = 'under_review';
        if ($request->filled('editor_notes')) {
            $submission->editor_notes = $request->editor_notes;
        }
        $submission->save();

        Review::updateOrCreate(
            [
                'submission_id' => $submission->id,
                'reviewer_id' => $request->reviewer_id,
            ],
            [
                'status' => 'in_progress',
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Reviewer berhasil ditugaskan dan status naskah berubah menjadi Under Review!',
            'data' => $submission->load(['journal', 'issue', 'author', 'reviews.reviewer'])
        ]);
    }

    public function submitReview(Request $request, $id)
    {
        $request->validate([
            'reviewer_id' => 'nullable|exists:users,id',
            'score_originality' => 'required|integer|min:1|max:100',
            'score_methodology' => 'required|integer|min:1|max:100',
            'score_relevance' => 'required|integer|min:1|max:100',
            'comments' => 'required|string',
            'decision' => 'required|in:accept,revise,reject',
        ]);

        $submission = Submission::findOrFail($id);
        $reviewer = $request->filled('reviewer_id')
            ? User::find($request->reviewer_id)
            : User::where('role', 'reviewer')->first();

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

        if ($request->decision === 'accept') {
            $submission->status = 'accepted';
        } elseif ($request->decision === 'revise') {
            $submission->status = 'revision_required';
        } else {
            $submission->status = 'rejected';
        }
        $submission->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Hasil evaluasi Peer-Review berhasil disimpan!',
            'data' => $submission->load(['journal', 'issue', 'author', 'reviews.reviewer'])
        ]);
    }

    public function publishSubmission(Request $request, $id)
    {
        $submission = Submission::with('journal')->findOrFail($id);

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
        $submission->issue_id = $request->input('issue_id', $issue->id);
        $submission->status = 'published';
        $submission->doi = $request->input('doi') ?: sprintf('10.31290/%s.v4i2.%d', $code, 100 + $submission->id);
        $submission->pages = $request->input('pages') ?: '41-54';
        $submission->published_at = now();
        $submission->save();

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
}
