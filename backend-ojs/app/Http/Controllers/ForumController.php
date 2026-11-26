<?php

namespace App\Http\Controllers;

use App\Models\ForumLike;
use App\Models\ForumPost;
use App\Models\Submission;
use App\Models\SubmissionComment;
use App\Models\SubmissionLike;
use App\Models\User;
use Illuminate\Http\Request;

class ForumController extends Controller
{
    public function index(Request $request)
    {
        $viewerId = $request->query('user_id');
        $sort = $request->query('sort', 'trending');
        $category = $request->query('category');
        $journalId = $request->query('journal_id');
        $tag = trim((string) $request->query('tag', ''));
        $search = trim((string) $request->query('search', ''));

        $query = ForumPost::whereNull('parent_id')
            ->with([
                'user:id,name,email,role,affiliation,specialty',
                'journal:id,code,title,abbreviation,accent_color',
                'replies' => function ($q) {
                    $q->with('user:id,name,email,role,affiliation,specialty')
                        ->orderBy('created_at', 'asc');
                },
            ])
            ->withCount('replies');

        if ($category && $category !== 'all') {
            $query->where('category', $category);
        }

        if ($journalId && $journalId !== 'all') {
            $query->where('journal_id', $journalId);
        }

        if ($tag !== '') {
            $normalizedTag = '#' . ltrim($tag, '#');
            $query->where(function ($q) use ($normalizedTag, $tag) {
                $q->where('topic_tag', 'LIKE', $normalizedTag)
                    ->orWhere('content', 'LIKE', '%' . $normalizedTag . '%')
                    ->orWhere('topic_tag', 'LIKE', '%' . ltrim($tag, '#') . '%');
            });
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('content', 'LIKE', '%' . $search . '%')
                    ->orWhere('topic_tag', 'LIKE', '%' . $search . '%')
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'LIKE', '%' . $search . '%');
                    });
            });
        }

        if ($sort === 'latest') {
            $query->orderByDesc('is_pinned')->orderByDesc('created_at');
        } else {
            // Trending: pinned first, then highest engagement (likes + replies*2), then newest
            $query->orderByDesc('is_pinned')
                ->orderByRaw('(likes_count * 2 + (SELECT COUNT(*) FROM forum_posts AS r WHERE r.parent_id = forum_posts.id) * 3) DESC')
                ->orderByDesc('created_at');
        }

        $posts = $query->limit(60)->get();

        // Collect all post IDs (parents + replies) to mark liked_by_me cleanly
        $likedPostIds = [];
        if ($viewerId) {
            $allPostIds = $posts->pluck('id')->all();
            foreach ($posts as $p) {
                foreach ($p->replies as $r) {
                    $allPostIds[] = $r->id;
                }
            }
            if (!empty($allPostIds)) {
                $likedPostIds = ForumLike::where('user_id', $viewerId)
                    ->whereIn('post_id', $allPostIds)
                    ->pluck('post_id')
                    ->flip()
                    ->all();
            }
        }

        $formattedPosts = $posts->map(function ($post) use ($likedPostIds) {
            $arr = $post->toArray();
            $arr['liked_by_me'] = isset($likedPostIds[$post->id]);
            $arr['replies'] = $post->replies->map(function ($reply) use ($likedPostIds) {
                $rArr = $reply->toArray();
                $rArr['liked_by_me'] = isset($likedPostIds[$reply->id]);
                return $rArr;
            })->values()->all();
            return $arr;
        })->values();

        // Aggregate Trending Topics from all top-level posts
        $allThreads = ForumPost::whereNull('parent_id')
            ->withCount('replies')
            ->get(['id', 'topic_tag', 'category', 'content', 'likes_count', 'created_at']);

        $topicBuckets = [];
        foreach ($allThreads as $thread) {
            $tagsFound = [];
            if (!empty($thread->topic_tag)) {
                $tagsFound[] = '#' . ltrim(trim($thread->topic_tag), '#');
            }
            if (preg_match_all('/#([A-Za-z0-9_]{2,40})/u', $thread->content, $matches)) {
                foreach ($matches[1] as $m) {
                    $tagsFound[] = '#' . $m;
                }
            }
            $uniqueTags = [];
            foreach ($tagsFound as $t) {
                $key = strtolower($t);
                if (!isset($uniqueTags[$key])) {
                    $uniqueTags[$key] = $t;
                }
            }

            $engagement = 3 + ($thread->likes_count * 2) + ($thread->replies_count * 3);
            foreach ($uniqueTags as $key => $displayTag) {
                if (!isset($topicBuckets[$key])) {
                    $topicBuckets[$key] = [
                        'tag' => $displayTag,
                        'category' => $thread->category,
                        'posts_count' => 0,
                        'likes_count' => 0,
                        'replies_count' => 0,
                        'score' => 0,
                    ];
                }
                $topicBuckets[$key]['posts_count'] += 1;
                $topicBuckets[$key]['likes_count'] += (int) $thread->likes_count;
                $topicBuckets[$key]['replies_count'] += (int) $thread->replies_count;
                $topicBuckets[$key]['score'] += $engagement;
            }
        }

        usort($topicBuckets, function ($a, $b) {
            if ($b['score'] !== $a['score']) {
                return $b['score'] <=> $a['score'];
            }
            return $b['posts_count'] <=> $a['posts_count'];
        });
        $trendingTopics = array_slice(array_values($topicBuckets), 0, 8);

        // Load all published submissions once for smart topic-to-journal matching, social comments/likes, & keywords
        $allPublished = Submission::where('status', 'published')
            ->with([
                'journal:id,code,title,abbreviation,focus_scope,accent_color',
                'author:id,name,affiliation',
                'issue:id,volume,number,year,title',
                'reviews',
                'articleComments' => function ($q) {
                    $q->with('user:id,name,email,role,affiliation,specialty')
                        ->orderBy('created_at', 'asc');
                },
            ])
            ->withCount(['articleLikes', 'articleComments'])
            ->orderByDesc('published_at')
            ->orderByDesc('updated_at')
            ->get();

        // Mark liked_by_me for published articles
        $likedSubIds = [];
        if ($viewerId && $allPublished->count() > 0) {
            $likedSubIds = SubmissionLike::where('user_id', $viewerId)
                ->whereIn('submission_id', $allPublished->pluck('id')->all())
                ->pluck('submission_id')
                ->flip()
                ->all();
        }

        $formatArticle = function ($sub) use ($likedSubIds) {
            $arr = is_array($sub) ? $sub : $sub->toArray();
            $id = $arr['id'];
            $arr['likes_count'] = (int) ($arr['article_likes_count'] ?? 0);
            $arr['comments_count'] = (int) ($arr['article_comments_count'] ?? count($arr['article_comments'] ?? []));
            $arr['liked_by_me'] = isset($likedSubIds[$id]);
            return $arr;
        };

        // Enrich trending topics with real count of matching published articles
        $trendingTopics = array_map(function ($item) use ($allPublished) {
            $matched = $this->findRelatedPublishedArticles($allPublished, $item['tag']);
            $item['related_articles_count'] = count($matched);
            return $item;
        }, $trendingTopics);

        // Published articles list (filtered by active topic/search, or all published articles filtered by journal)
        $activeTopicQuery = $tag !== '' ? $tag : ($search !== '' ? $search : '');
        if ($activeTopicQuery !== '') {
            $matchedRaw = $this->findRelatedPublishedArticles($allPublished, $activeTopicQuery);
            if ($journalId && $journalId !== 'all') {
                $matchedRaw = array_values(array_filter($matchedRaw, fn($a) => (string) $a['journal_id'] === (string) $journalId));
            }
            $publishedArticles = array_map($formatArticle, array_slice($matchedRaw, 0, 20));
        } else {
            $filteredSubs = $journalId && $journalId !== 'all'
                ? $allPublished->filter(fn($s) => (string) $s->journal_id === (string) $journalId)->values()
                : $allPublished;
            $mapped = $filteredSubs->map($formatArticle)->all();
            if ($sort === 'trending') {
                usort($mapped, function ($a, $b) {
                    $scoreA = ($a['likes_count'] * 2) + ($a['comments_count'] * 3) + (int) ($a['views_count'] ?? 0);
                    $scoreB = ($b['likes_count'] * 2) + ($b['comments_count'] * 3) + (int) ($b['views_count'] ?? 0);
                    return $scoreB <=> $scoreA;
                });
            }
            $publishedArticles = array_slice($mapped, 0, 20);
        }

        // Hot keywords from published submissions
        $publishedKeywords = [];
        foreach ($allPublished as $ps) {
            if (!$ps->keywords) {
                continue;
            }
            $parts = preg_split('/[,;]+/', $ps->keywords);
            foreach ($parts as $kw) {
                $clean = trim($kw);
                if (mb_strlen($clean) >= 3) {
                    $k = mb_strtolower($clean);
                    if (!isset($publishedKeywords[$k])) {
                        $publishedKeywords[$k] = ['keyword' => $clean, 'count' => 0];
                    }
                    $publishedKeywords[$k]['count'] += 1;
                }
            }
        }
        usort($publishedKeywords, fn($a, $b) => $b['count'] <=> $a['count']);

        $totalThreads = ForumPost::whereNull('parent_id')->count();
        $totalReplies = ForumPost::whereNotNull('parent_id')->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'posts' => $formattedPosts,
                'trending_topics' => $trendingTopics,
                'published_articles' => $publishedArticles,
                'related_articles' => $activeTopicQuery !== '' ? $publishedArticles : [],
                'active_topic_query' => $activeTopicQuery,
                'journal_keywords' => array_slice(array_values($publishedKeywords), 0, 10),
                'stats' => [
                    'total_threads' => $totalThreads,
                    'total_replies' => $totalReplies,
                    'active_topics' => count($topicBuckets),
                    'published_articles_count' => $allPublished->count(),
                ],
            ],
        ]);
    }

    /**
     * Pecah #Tagar / frase topik menjadi kata-kata kunci yang relevan untuk mencocokkan artikel jurnal terbit.
     */
    private function extractTopicTokens(string $topic): array
    {
        $clean = ltrim(trim($topic), '#');
        if ($clean === '') {
            return [];
        }

        // Split CamelCase (e.g. SmartCityMakassar -> Smart City Makassar, UMKMDigital -> UMKM Digital)
        $spaced = preg_replace('/([a-z])([A-Z])/u', '$1 $2', $clean);
        $spaced = preg_replace('/([A-Z]+)([A-Z][a-z])/u', '$1 $2', $spaced);
        $spaced = str_replace(['_', '-', '/'], ' ', $spaced);

        $stopWords = ['dan', 'atau', 'yang', 'dari', 'untuk', 'pada', 'dengan', 'kota', 'daerah', 'riset', 'topik', 'the', 'and', 'for'];
        $rawTokens = preg_split('/\s+/u', mb_strtolower($spaced), -1, PREG_SPLIT_NO_EMPTY);

        $tokens = [];
        $fullPhrase = mb_strtolower(trim($spaced));
        if (mb_strlen($fullPhrase) >= 3) {
            $tokens[] = $fullPhrase;
        }
        foreach ($rawTokens as $tok) {
            if (mb_strlen($tok) >= 3 && !in_array($tok, $stopWords, true)) {
                $tokens[] = $tok;
            }
        }

        // Semantic expansion for common BRIDA hashtags so topic clicks always find closely related published papers
        $key = mb_strtolower(preg_replace('/\s+/', '', $clean));
        $synonyms = [
            'smartcitymakassar' => ['smart city', 'digital', 'spbe', 'layanan publik', 'makassar', 'inovasi'],
            'tatakeloladigital' => ['tata kelola', 'digital', 'spbe', 'pemerintahan', 'e-government'],
            'kliniksinta' => ['sinta', 'jurnal', 'publikasi', 'inovasi', 'kebijakan'],
            'publikasibrida' => ['brida', 'publikasi', 'riset', 'inovasi'],
            'banjirdandrainase' => ['banjir', 'drainase', 'air', 'iot', 'sensor', 'infrastruktur', 'lingkungan'],
            'umkmdigital' => ['umkm', 'ekonomi', 'qris', 'digital', 'kreatif', 'bisnis', 'pemasaran'],
            'ekonomikreatif' => ['ekonomi', 'kreatif', 'umkm', 'wisata', 'kuliner'],
            'kesehatanpesisir' => ['kesehatan', 'pesisir', 'sanitasi', 'stunting', 'gizi', 'masyarakat'],
            'kolaborasiriset' => ['kolaborasi', 'inovasi', 'penelitian', 'masyarakat'],
        ];
        if (isset($synonyms[$key])) {
            foreach ($synonyms[$key] as $syn) {
                $tokens[] = $syn;
            }
        }

        return array_values(array_unique($tokens));
    }

    /**
     * Cari artikel jurnal yang SUDAH TERBIT (status = published) berdasarkan kecocokan topik/tagar.
     */
    private function findRelatedPublishedArticles($allPublished, string $topicQuery): array
    {
        $tokens = $this->extractTopicTokens($topicQuery);
        if (empty($tokens)) {
            return [];
        }

        $scored = [];
        foreach ($allPublished as $sub) {
            $title = mb_strtolower((string) $sub->title);
            $keywords = mb_strtolower((string) $sub->keywords);
            $abstract = mb_strtolower((string) $sub->abstract);
            $journalScope = mb_strtolower((string) ($sub->journal->focus_scope ?? ''));
            $journalTitle = mb_strtolower((string) ($sub->journal->title ?? ''));

            $score = 0;
            $matchedTerms = [];
            foreach ($tokens as $tok) {
                if ($tok === '') continue;
                $hit = false;
                if (mb_strpos($keywords, $tok) !== false) {
                    $score += 6;
                    $hit = true;
                }
                if (mb_strpos($title, $tok) !== false) {
                    $score += 5;
                    $hit = true;
                }
                if (mb_strpos($abstract, $tok) !== false) {
                    $score += 2;
                    $hit = true;
                }
                if (mb_strpos($journalScope, $tok) !== false || mb_strpos($journalTitle, $tok) !== false) {
                    $score += 1;
                    $hit = true;
                }
                if ($hit) {
                    $matchedTerms[] = $tok;
                }
            }

            if ($score >= 2) {
                $arr = $sub->toArray();
                $arr['relevance_score'] = $score;
                $arr['matched_terms'] = array_values(array_unique($matchedTerms));
                $scored[] = $arr;
            }
        }

        usort($scored, fn($a, $b) => $b['relevance_score'] <=> $a['relevance_score']);
        return $scored;
    }

    public function store(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'content' => 'required|string|min:3|max:1000',
            'parent_id' => 'nullable|exists:forum_posts,id',
            'journal_id' => 'nullable|exists:journals,id',
            'category' => 'nullable|string|in:permasalahan,trending_jurnal,kolaborasi,tips_publikasi',
            'topic_tag' => 'nullable|string|max:60',
        ]);

        $parent = null;
        if ($request->filled('parent_id')) {
            $parent = ForumPost::findOrFail($request->parent_id);
        }

        $content = trim($request->content);
        $rawTag = trim((string) $request->input('topic_tag', ''));

        if ($parent) {
            $topicTag = $parent->topic_tag;
            $category = $parent->category;
            $journalId = $parent->journal_id;
        } else {
            $category = $request->input('category', 'permasalahan');
            $journalId = $request->filled('journal_id') ? $request->journal_id : null;

            if ($rawTag === '' && preg_match('/#([A-Za-z0-9_]{2,40})/u', $content, $m)) {
                $rawTag = '#' . $m[1];
            }
            $topicTag = $rawTag !== '' ? '#' . preg_replace('/\s+/', '', ltrim($rawTag, '#')) : null;
        }

        $post = ForumPost::create([
            'user_id' => $request->user_id,
            'parent_id' => $parent ? $parent->id : null,
            'journal_id' => $journalId,
            'category' => $category,
            'topic_tag' => $topicTag,
            'content' => $content,
        ]);

        $post->load([
            'user:id,name,email,role,affiliation,specialty',
            'journal:id,code,title,abbreviation,accent_color',
            'replies.user:id,name,email,role,affiliation,specialty',
        ]);

        $arr = $post->toArray();
        $arr['liked_by_me'] = false;
        $arr['replies_count'] = 0;

        return response()->json([
            'status' => 'success',
            'message' => $parent ? 'Balasan Anda berhasil dikirim!' : 'Utas diskusi berhasil dipublikasikan!',
            'data' => $arr,
        ], 201);
    }

    public function toggleLike(Request $request, $id)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $post = ForumPost::findOrFail($id);
        $existing = ForumLike::where('post_id', $post->id)
            ->where('user_id', $request->user_id)
            ->first();

        if ($existing) {
            $existing->delete();
            $liked = false;
        } else {
            ForumLike::create([
                'post_id' => $post->id,
                'user_id' => $request->user_id,
            ]);
            $liked = true;
        }

        $post->likes_count = ForumLike::where('post_id', $post->id)->count();
        $post->save();

        return response()->json([
            'status' => 'success',
            'data' => [
                'post_id' => $post->id,
                'liked' => $liked,
                'likes_count' => $post->likes_count,
            ],
        ]);
    }

    public function togglePin(Request $request, $id)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $actor = User::findOrFail($request->user_id);
        if (!in_array($actor->role, ['admin', 'editor'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya Admin atau Editor yang dapat menyematkan utas.',
            ], 403);
        }

        $post = ForumPost::whereNull('parent_id')->findOrFail($id);
        $post->is_pinned = !$post->is_pinned;
        $post->save();

        return response()->json([
            'status' => 'success',
            'message' => $post->is_pinned ? 'Utas disematkan di paling atas!' : 'Sematkan utas dilepas.',
            'data' => $post,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $post = ForumPost::findOrFail($id);
        $userId = $request->query('user_id') ?? $request->input('user_id');

        if ($userId) {
            $actor = User::find($userId);
            $isOwner = $actor && (int) $actor->id === (int) $post->user_id;
            $isStaff = $actor && in_array($actor->role, ['admin', 'editor'], true);
            if (!$isOwner && !$isStaff) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Anda tidak memiliki izin untuk menghapus utas ini.',
                ], 403);
            }
        }

        $post->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Utas berhasil dihapus.',
        ]);
    }

    /**
     * Toggle Like pada Artikel Jurnal Terbit (Published Submission)
     */
    public function toggleArticleLike(Request $request, $id)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $sub = Submission::findOrFail($id);
        $existing = SubmissionLike::where('submission_id', $sub->id)
            ->where('user_id', $request->user_id)
            ->first();

        if ($existing) {
            $existing->delete();
            $liked = false;
        } else {
            SubmissionLike::create([
                'submission_id' => $sub->id,
                'user_id' => $request->user_id,
            ]);
            $liked = true;
        }

        $count = SubmissionLike::where('submission_id', $sub->id)->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'submission_id' => $sub->id,
                'liked' => $liked,
                'likes_count' => $count,
            ],
        ]);
    }

    /**
     * Tambah Komentar pada Artikel Jurnal Terbit
     */
    public function storeArticleComment(Request $request, $id)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'content' => 'required|string|min:2|max:1000',
        ]);

        $sub = Submission::findOrFail($id);
        $comment = SubmissionComment::create([
            'submission_id' => $sub->id,
            'user_id' => $request->user_id,
            'content' => trim($request->content),
        ]);

        $comment->load('user:id,name,email,role,affiliation,specialty');

        return response()->json([
            'status' => 'success',
            'message' => 'Komentar Anda pada jurnal ini berhasil dikirim!',
            'data' => $comment,
        ], 201);
    }

    /**
     * Hapus Komentar pada Artikel Jurnal Terbit (Pemilik atau Admin/Editor)
     */
    public function destroyArticleComment(Request $request, $id, $commentId)
    {
        $comment = SubmissionComment::where('submission_id', $id)->findOrFail($commentId);
        $userId = $request->query('user_id') ?? $request->input('user_id');

        if ($userId) {
            $actor = User::find($userId);
            $isOwner = $actor && (int) $actor->id === (int) $comment->user_id;
            $isStaff = $actor && in_array($actor->role, ['admin', 'editor'], true);
            if (!$isOwner && !$isStaff) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Anda tidak memiliki izin untuk menghapus komentar ini.',
                ], 403);
            }
        }

        $comment->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Komentar berhasil dihapus.',
        ]);
    }
}
