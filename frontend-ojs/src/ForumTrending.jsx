import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { resolveFileUrl } from './config';
import {
  Flame,
  Heart,
  MessageCircle,
  Send,
  Pin,
  Trash2,
  Search,
  Hash,
  Share2,
  Clock,
  Sparkles,
  LogIn,
  BookOpen,
  X,
  RefreshCw,
  ArrowRight,
  FileText,
  Eye
} from 'lucide-react';

const CATEGORY_META = {
  permasalahan: {
    label: 'Permasalahan Riset & Kota',
    short: '🔥 Permasalahan',
    badge: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  trending_jurnal: {
    label: 'Topik Jurnal',
    short: '📘 Topik Jurnal',
    badge: 'bg-blue-50 text-[#7A2222] border-blue-200'
  },
  kolaborasi: {
    label: 'Cari Kolaborator',
    short: '🤝 Kolaborasi',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  tips_publikasi: {
    label: 'Tips & Klinik SINTA',
    short: '💡 Tips SINTA',
    badge: 'bg-amber-50 text-amber-800 border-amber-200'
  }
};

const ROLE_META = {
  admin: { label: 'Admin Redaksi', badge: 'bg-purple-100 text-purple-800 border-purple-200', avatar: 'from-purple-600 to-indigo-700' },
  editor: { label: 'Chief Editor', badge: 'bg-blue-100 text-[#7A2222] border-blue-200', avatar: 'from-[#7A2222] to-blue-700' },
  reviewer: { label: 'Mitra Bestari', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', avatar: 'from-emerald-600 to-teal-700' },
  author: { label: 'Peneliti / Penulis', badge: 'bg-amber-100 text-amber-800 border-amber-200', avatar: 'from-amber-500 to-orange-600' }
};

function formatRelativeTime(isoDate) {
  if (!isoDate) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000));
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} jam lalu`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return new Date(isoDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getHandle(user) {
  if (!user) return '@pengguna';
  if (user.email) {
    return '@' + user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '');
  }
  return '@' + (user.name || 'peneliti').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14);
}

// Render teks utas dengan auto-highlight #Hashtag yang bisa diklik
function renderRichText(text, onTagClick) {
  if (!text) return null;
  const parts = text.split(/(#[A-Za-z0-9_]{2,40})/g);
  return parts.map((part, idx) => {
    if (/^#[A-Za-z0-9_]{2,40}$/.test(part)) {
      return (
        <button
          key={idx}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTagClick && onTagClick(part);
          }}
          className="text-[#7A2222] font-extrabold hover:underline cursor-pointer"
        >
          {part}
        </button>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

// =========================================================================
// WIDGET MINI UNTUK PORTAL PUBLIK (AGAR PENGUNJUNG LANGSUNG MELIHAT TRENDING)
// =========================================================================
export function TrendingPortalWidget({ apiBase, onOpenForum }) {
  const [data, setData] = useState({ posts: [], trending_topics: [], stats: { total_threads: 0, total_replies: 0 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    axios
      .get(`${apiBase}/forum/posts`, { params: { sort: 'trending' } })
      .then((res) => {
        if (mounted && res.data?.data) {
          setData(res.data.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [apiBase]);

  if (loading) return null;

  const topPosts = (data.posts || []).slice(0, 3);
  const topTags = (data.trending_topics || []).slice(0, 6);

  return (
    <section className="card-luxury rounded-[28px] overflow-hidden">
      <div className="bg-gradient-to-r from-[#4A1313] via-[#7A2222] to-[#661B1B] px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
            <Flame size={18} className="text-amber-300" />
          </div>
          <div>
            <h3 className="font-serif-editorial text-base sm:text-lg font-bold tracking-tight flex items-center gap-2.5 flex-wrap">
              Trending Topik Riset &amp; Diskusi Hangat
              <span className="font-sans text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-300/30">
                FORUM AKTIF
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Ruang interaksi peneliti, editor, reviewer &amp; pengunjung publik tentang isu kota dan topik jurnal BRIDA Makassar.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenForum && onOpenForum('')}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white text-[#7A2222] hover:bg-slate-100 font-bold text-xs shadow-sm transition cursor-pointer"
        >
          Buka Forum &amp; Diskusi <ArrowRight size={14} />
        </button>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Deretan Hashtag Trending Klik Langsung */}
        {topTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 mr-1 flex items-center gap-1">
              <Flame size={13} className="text-amber-500" /> Sedang Tren
            </span>
            {topTags.map((t, idx) => (
              <button
                key={t.tag}
                type="button"
                onClick={() => onOpenForum && onOpenForum(t.tag)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-slate-50 hover:bg-[#7A2222] text-slate-700 hover:text-white border border-slate-200/90 hover:border-[#7A2222] transition cursor-pointer"
              >
                <span className="text-[10px] opacity-60">#{idx + 1}</span>
                <span>{t.tag}</span>
                <span className="text-[10px] opacity-65">({t.posts_count})</span>
              </button>
            ))}
          </div>
        )}

        {/* 3 Utas Terhangat */}
        {topPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topPosts.map((post) => {
              const roleInfo = ROLE_META[post.user?.role] || ROLE_META.author;
              const catInfo = CATEGORY_META[post.category] || CATEGORY_META.permasalahan;
              return (
                <div
                  key={post.id}
                  onClick={() => onOpenForum && onOpenForum(post.topic_tag || '')}
                  className="bg-slate-50/70 hover:bg-[#FDF7F7]/70 rounded-2xl border border-slate-200/80 hover:border-blue-300 p-4 flex flex-col justify-between gap-3 transition cursor-pointer"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleInfo.avatar} text-white font-extrabold text-[11px] flex items-center justify-center shrink-0`}>
                          {getInitials(post.user?.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-slate-800 truncate">{post.user?.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {roleInfo.label} • {formatRelativeTime(post.created_at)}
                          </div>
                        </div>
                      </div>
                      {post.is_pinned && (
                        <span className="text-[10px] font-bold text-[#7A2222] bg-blue-100 px-2 py-0.5 rounded-full shrink-0">
                          📌 Pin
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed line-clamp-3 whitespace-pre-line">
                      {post.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-[11px] text-slate-500">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catInfo.badge}`}>
                      {catInfo.short}
                    </span>
                    <div className="flex items-center gap-3 font-bold">
                      <span className="flex items-center gap-1">
                        <Heart size={12} className="text-rose-500" /> {post.likes_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle size={12} className="text-blue-600" /> {post.replies_count ?? (post.replies?.length || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-slate-500 text-center py-4">
            Belum ada diskusi. Jadilah yang pertama memulai utas topik riset!
          </div>
        )}
      </div>
    </section>
  );
}

// =========================================================================
// HALAMAN PENUH FORUM & TRENDING TOPIK ALA THREADS / X
// =========================================================================
export default function ForumTrending({
  apiBase,
  storageBase,
  currentUser,
  isGuest,
  isAdminOrEditor,
  journals,
  selectedJournalId,
  initialTag,
  onClearInitialTag,
  onRequireLogin,
  onThreadCountChange,
  onOpenArticleDetail,
  onGoToSubmit
}) {
  const [posts, setPosts] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const [publishedArticles, setPublishedArticles] = useState([]);
  const [activeTopicQuery, setActiveTopicQuery] = useState('');
  const [journalKeywords, setJournalKeywords] = useState([]);
  const [forumStats, setForumStats] = useState({ total_threads: 0, total_replies: 0, active_topics: 0, published_articles_count: 0 });
  const [loading, setLoading] = useState(true);
  const [shareMenuPostId, setShareMenuPostId] = useState(null);
  const [shareMenuArticleId, setShareMenuArticleId] = useState(null);

  // Mode tampilan utama kolom kiri: 'journals' (Jurnal Terbit + Like/Komen/Share) vs 'threads' (Utas Komunitas)
  const [feedView, setFeedView] = useState('journals');

  // State Komentar per Artikel Jurnal Terbit (Default tertutup — baru muncul saat klik tombol Komen!)
  const [openArticleComments, setOpenArticleComments] = useState({});
  const [articleCommentDrafts, setArticleCommentDrafts] = useState({});
  const [articleCommentSubmittingId, setArticleCommentSubmittingId] = useState(null);

  // Filter & Sort state
  const [sortMode, setSortMode] = useState('trending');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTag, setActiveTag] = useState(initialTag || '');
  const [searchTerm, setSearchTerm] = useState('');

  // Composer state
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('permasalahan');
  const [newJournalId, setNewJournalId] = useState(selectedJournalId && selectedJournalId !== 'all' ? String(selectedJournalId) : '');
  const [newTopicTag, setNewTopicTag] = useState('');
  const [posting, setPosting] = useState(false);

  // Reply state per thread
  const [expandedThreads, setExpandedThreads] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replySubmittingId, setReplySubmittingId] = useState(null);

  useEffect(() => {
    if (initialTag) {
      setActiveTag(initialTag);
      onClearInitialTag && onClearInitialTag();
    }
  }, [initialTag, onClearInitialTag]);

  useEffect(() => {
    if (selectedJournalId && selectedJournalId !== 'all') {
      setNewJournalId(String(selectedJournalId));
    }
  }, [selectedJournalId]);

  const fetchForum = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const params = {
          sort: sortMode,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          journal_id: selectedJournalId && selectedJournalId !== 'all' ? selectedJournalId : undefined,
          tag: activeTag || undefined,
          search: searchTerm.trim() || undefined,
          user_id: currentUser?.id || undefined
        };
        const res = await axios.get(`${apiBase}/forum/posts`, { params });
        const payload = res.data?.data || {};
        setPosts(payload.posts || []);
        setTrendingTopics(payload.trending_topics || []);
        setPublishedArticles(payload.published_articles || []);
        setActiveTopicQuery(payload.active_topic_query || '');
        setJournalKeywords(payload.journal_keywords || []);
        if (payload.stats) {
          setForumStats(payload.stats);
          onThreadCountChange && onThreadCountChange(payload.stats.total_threads || 0);
        }
      } catch (err) {
        toast.error('Gagal memuat feed Trending & Forum.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [apiBase, sortMode, categoryFilter, selectedJournalId, activeTag, searchTerm, currentUser?.id, onThreadCountChange]
  );

  useEffect(() => {
    fetchForum();
  }, [fetchForum]);

  // Create new thread
  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (isGuest || !currentUser?.id) {
      toast('Silakan masuk atau daftar akun untuk memposting utas.', { icon: '🔐' });
      onRequireLogin && onRequireLogin();
      return;
    }
    if (newContent.trim().length < 3) {
      toast.error('Isi utas minimal 3 karakter.');
      return;
    }
    setPosting(true);
    try {
      const res = await axios.post(`${apiBase}/forum/posts`, {
        user_id: currentUser.id,
        content: newContent.trim(),
        category: newCategory,
        journal_id: newJournalId || null,
        topic_tag: newTopicTag.trim() || null
      });
      toast.success(res.data?.message || 'Utas berhasil dipublikasikan!');
      setNewContent('');
      setNewTopicTag('');
      fetchForum(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengirim utas.');
    } finally {
      setPosting(false);
    }
  };

  // Send reply to a thread
  const handleSendReply = async (parentId) => {
    if (isGuest || !currentUser?.id) {
      toast('Silakan masuk terlebih dahulu untuk membalas utas.', { icon: '🔐' });
      onRequireLogin && onRequireLogin();
      return;
    }
    const text = (replyDrafts[parentId] || '').trim();
    if (text.length < 3) {
      toast.error('Balasan minimal 3 karakter.');
      return;
    }
    setReplySubmittingId(parentId);
    try {
      await axios.post(`${apiBase}/forum/posts`, {
        user_id: currentUser.id,
        parent_id: parentId,
        content: text
      });
      setReplyDrafts((prev) => ({ ...prev, [parentId]: '' }));
      setExpandedThreads((prev) => ({ ...prev, [parentId]: true }));
      toast.success('Balasan terkirim!');
      fetchForum(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengirim balasan.');
    } finally {
      setReplySubmittingId(null);
    }
  };

  // Toggle Like
  const handleToggleLike = async (postId) => {
    if (isGuest || !currentUser?.id) {
      toast('Masuk akun terlebih dahulu untuk menyukai utas!', { icon: '❤️' });
      onRequireLogin && onRequireLogin();
      return;
    }
    try {
      const res = await axios.post(`${apiBase}/forum/posts/${postId}/like`, {
        user_id: currentUser.id
      });
      const { liked, likes_count } = res.data?.data || {};
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return { ...p, liked_by_me: liked, likes_count };
          }
          if (p.replies?.some((r) => r.id === postId)) {
            return {
              ...p,
              replies: p.replies.map((r) =>
                r.id === postId ? { ...r, liked_by_me: liked, likes_count } : r
              )
            };
          }
          return p;
        })
      );
    } catch {
      toast.error('Gagal memproses suka.');
    }
  };

  // Toggle Pin (Admin/Editor)
  const handleTogglePin = async (postId) => {
    if (!isAdminOrEditor || !currentUser?.id) return;
    try {
      const res = await axios.post(`${apiBase}/forum/posts/${postId}/pin`, {
        user_id: currentUser.id
      });
      toast.success(res.data?.message || 'Status sematkan diperbarui.');
      fetchForum(true);
    } catch {
      toast.error('Gagal menyematkan utas.');
    }
  };

  // Delete post/reply
  const handleDeletePost = async (postId, isReply = false) => {
    if (!currentUser?.id) return;
    if (!window.confirm(isReply ? 'Hapus balasan ini?' : 'Hapus utas diskusi ini beserta seluruh balasannya?')) return;
    try {
      await axios.delete(`${apiBase}/forum/posts/${postId}`, {
        params: { user_id: currentUser.id }
      });
      toast.success(isReply ? 'Balasan dihapus.' : 'Utas dihapus.');
      fetchForum(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus utas.');
    }
  };

  const handleSelectTrendingTopic = (tag) => {
    const isSame = activeTag.toLowerCase() === tag.toLowerCase();
    setActiveTag(isSame ? '' : tag);
    setSearchTerm('');
    setFeedView('journals');
    if (!isSame) {
      setTimeout(() => {
        const el = document.getElementById('published-journals-feed');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
    }
  };

  // Toggle Like pada Artikel Jurnal Terbit
  const handleToggleArticleLike = async (articleId) => {
    if (isGuest || !currentUser?.id) {
      toast('Silakan masuk atau daftar akun terlebih dahulu untuk menyukai jurnal ini!', { icon: '❤️' });
      onRequireLogin && onRequireLogin();
      return;
    }
    try {
      const res = await axios.post(`${apiBase}/submissions/${articleId}/like`, {
        user_id: currentUser.id
      });
      const { liked, likes_count } = res.data?.data || {};
      setPublishedArticles((prev) =>
        prev.map((a) => (a.id === articleId ? { ...a, liked_by_me: liked, likes_count } : a))
      );
    } catch {
      toast.error('Gagal memproses suka pada artikel.');
    }
  };

  // Kirim Komentar pada Artikel Jurnal Terbit
  const handleSendArticleComment = async (articleId) => {
    if (isGuest || !currentUser?.id) {
      toast('Silakan masuk akun terlebih dahulu untuk berkomentar pada jurnal ini.', { icon: '💬' });
      onRequireLogin && onRequireLogin();
      return;
    }
    const text = (articleCommentDrafts[articleId] || '').trim();
    if (text.length < 2) {
      toast.error('Komentar minimal 2 karakter.');
      return;
    }
    setArticleCommentSubmittingId(articleId);
    try {
      const res = await axios.post(`${apiBase}/submissions/${articleId}/comments`, {
        user_id: currentUser.id,
        content: text
      });
      const newComment = res.data?.data;
      setArticleCommentDrafts((prev) => ({ ...prev, [articleId]: '' }));
      setOpenArticleComments((prev) => ({ ...prev, [articleId]: true }));
      if (newComment) {
        setPublishedArticles((prev) =>
          prev.map((a) =>
            a.id === articleId
              ? {
                  ...a,
                  comments_count: (a.comments_count || 0) + 1,
                  article_comments: [...(a.article_comments || []), newComment]
                }
              : a
          )
        );
      } else {
        fetchForum(true);
      }
      toast.success('Komentar Anda berhasil dikirim!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengirim komentar.');
    } finally {
      setArticleCommentSubmittingId(null);
    }
  };

  // Hapus Komentar pada Artikel Jurnal Terbit
  const handleDeleteArticleComment = async (articleId, commentId) => {
    if (!currentUser?.id) return;
    if (!window.confirm('Hapus komentar ini?')) return;
    try {
      await axios.delete(`${apiBase}/submissions/${articleId}/comments/${commentId}`, {
        params: { user_id: currentUser.id }
      });
      setPublishedArticles((prev) =>
        prev.map((a) =>
          a.id === articleId
            ? {
                ...a,
                comments_count: Math.max(0, (a.comments_count || 1) - 1),
                article_comments: (a.article_comments || []).filter((c) => c.id !== commentId)
              }
            : a
        )
      );
      toast.success('Komentar dihapus.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus komentar.');
    }
  };

  // Share Artikel Jurnal Terbit (Salin Sitasi APA + Link, WhatsApp, X)
  const handleShareArticle = (art, platform = 'copy') => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const year = art.issue?.year || new Date(art.published_at || art.created_at || Date.now()).getFullYear();
    const authorLine = `${art.author?.name || 'Penulis'}${art.co_authors ? `, ${art.co_authors}` : ''}`;
    const apaCitation = `${authorLine} (${year}). ${art.title}. ${art.journal?.title || 'Jurnal BRIDA Makassar'}.${art.doi ? ` https://doi.org/${art.doi}` : ''}`;
    const shareText = `📚 ${art.title}\nOleh: ${authorLine}\nJurnal: ${art.journal?.title || 'OJS BRIDA Makassar'}${art.doi ? `\nDOI: ${art.doi}` : ''}${url ? `\n${url}` : ''}`;
    setShareMenuArticleId(null);

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (platform === 'x') {
      const tweet = `📚 "${art.title.slice(0, 170)}${art.title.length > 170 ? '...' : ''}" — ${art.journal?.abbreviation || 'OJS BRIDA'} #OJSBRIDA`;
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (platform === 'citation') {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(apaCitation).then(() => {
          toast.success('Sitasi format APA berhasil disalin!');
        });
      }
      return;
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareText).then(() => {
        toast.success('Info & tautan artikel jurnal disalin ke clipboard!');
      });
    }
  };

  const handleShareThread = (post, platform = 'copy') => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const snippet = `${post.user?.name} di Forum OJS BRIDA Makassar:\n"${post.content}"${post.topic_tag ? `\n${post.topic_tag}` : ''}${url ? `\n${url}` : ''}`;
    setShareMenuPostId(null);

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(snippet)}`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (platform === 'x') {
      const tweet = `${post.content.slice(0, 200)}${post.content.length > 200 ? '...' : ''} ${post.topic_tag || '#OJSBRIDA'}`;
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
      return;
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(snippet).then(() => {
        toast.success('Kutipan & tautan utas disalin ke clipboard!');
      });
    } else {
      toast.success('Topik siap dibagikan!');
    }
  };

  const handleSelectQuickTopic = (tag) => {
    handleSelectTrendingTopic(tag);
  };

  const currentRoleMeta = ROLE_META[currentUser?.role] || ROLE_META.author;

  return (
    <div className="p-5 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Header Banner — Obsidian Editorial */}
      <div className="bg-gradient-to-r from-[#4A1313] via-[#7A2222] to-[#661B1B] rounded-[28px] p-6 sm:p-7 text-white shadow-[0_18px_40px_-16px_rgba(7,20,38,0.45)] flex flex-wrap items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] bg-white/10 border border-white/15 px-3.5 py-1 rounded-full text-amber-200">
            <Flame size={12} className="text-amber-300" />
            Komunitas Riset &amp; Trending Topik OJS BRIDA
          </div>
          <h3 className="font-serif-editorial text-2xl sm:text-3xl font-bold tracking-tight">
            Trending Topik Jurnal &amp; Diskusi Permasalahan
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Ruang interaksi bagi pengunjung publik, peneliti, mitra bestari, dan editor untuk membahas isu strategis daerah, topik jurnal hangat, serta kolaborasi riset.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-white/[0.08] border border-white/[0.12] rounded-2xl px-4 py-2.5 text-center min-w-[74px]">
            <div className="text-lg font-extrabold tabular-nums">{forumStats.total_threads}</div>
            <div className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">Utas</div>
          </div>
          <div className="bg-white/[0.08] border border-white/[0.12] rounded-2xl px-4 py-2.5 text-center min-w-[74px]">
            <div className="text-lg font-extrabold tabular-nums">{forumStats.total_replies}</div>
            <div className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">Balasan</div>
          </div>
          <div className="bg-white/[0.08] border border-white/[0.12] rounded-2xl px-4 py-2.5 text-center min-w-[74px]">
            <div className="text-lg font-extrabold tabular-nums">{forumStats.active_topics}</div>
            <div className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">Tagar</div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KOLOM KIRI (FEED UTAMA - 8 COLS) */}
        <div className="lg:col-span-8 space-y-4">
          {/* TAB SWITCHER UTAMA + SORTIR & PENCARIAN */}
          <div className="card-luxury rounded-[24px] p-4 space-y-3">
            {/* Switcher Jurnal Terbit vs Utas Komunitas */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100/90 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setFeedView('journals')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  feedView === 'journals'
                    ? 'bg-[#7A2222] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen size={15} />
                <span>Jurnal Terbit</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full tabular-nums ${
                  feedView === 'journals' ? 'bg-white/20 text-white' : 'bg-white text-[#7A2222]'
                }`}>
                  {publishedArticles.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFeedView('threads')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  feedView === 'threads'
                    ? 'bg-[#7A2222] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageCircle size={15} />
                <span>Utas Komunitas</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full tabular-nums ${
                  feedView === 'threads' ? 'bg-white/20 text-white' : 'bg-white text-[#7A2222]'
                }`}>
                  {posts.length}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Toggle Trending vs Terbaru Ala X */}
              <div className="inline-flex bg-slate-100 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setSortMode('trending')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    sortMode === 'trending'
                      ? 'bg-white text-[#7A2222] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Flame size={14} className={sortMode === 'trending' ? 'text-orange-500' : ''} />
                  Terpopuler
                </button>
                <button
                  type="button"
                  onClick={() => setSortMode('latest')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    sortMode === 'latest'
                      ? 'bg-white text-[#7A2222] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Clock size={14} />
                  Terbaru
                </button>
              </div>

              {/* Search Input + Refresh */}
              <div className="flex items-center gap-2 flex-1 sm:max-w-xs">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={feedView === 'journals' ? 'Cari jurnal terbit atau kata kunci...' : 'Cari utas atau #tagar...'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-full pl-8 pr-3 py-1.5 text-xs outline-none focus:border-[#7A2222]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fetchForum()}
                  title="Muat ulang feed"
                  className="p-2 rounded-full border border-slate-200 text-slate-500 hover:text-[#7A2222] hover:bg-slate-50 cursor-pointer"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Active Topic / Search Banner Pill */}
            {(activeTag || searchTerm.trim()) && (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FEF2F2] border border-blue-200 rounded-2xl px-3.5 py-2 text-xs">
                <span className="font-bold text-[#7A2222]">
                  🎯 Menampilkan topik: <strong className="underline">{activeTopicQuery || activeTag || searchTerm}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTag('');
                    setSearchTerm('');
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-700 hover:underline cursor-pointer"
                >
                  <X size={12} /> Tampilkan Semua
                </button>
              </div>
            )}
          </div>

          {/* =================================================================
              VIEW A: FEED JURNAL TERBIT (DENGAN LIKE, KOMEN KLIK-BUKA, & SHARE)
             ================================================================= */}
          {feedView === 'journals' && (
            <section id="published-journals-feed" className="space-y-4">
              {loading ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-xs text-slate-400">
                  Memuat daftar jurnal terbit...
                </div>
              ) : publishedArticles.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-blue-200 p-10 text-center space-y-3">
                  <BookOpen size={38} className="mx-auto text-blue-300" />
                  <div className="text-sm font-extrabold text-slate-800">
                    {activeTag || searchTerm.trim()
                      ? `Belum ada jurnal terbit untuk topik "${activeTopicQuery || activeTag || searchTerm}"`
                      : 'Belum ada artikel jurnal resmi terbit'}
                  </div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    {activeTag || searchTerm.trim()
                      ? 'Topik ini masih terbuka luas untuk diteliti! Anda bisa berdiskusi di tab Utas Komunitas atau mengajukan naskah penelitian baru.'
                      : 'Setelah Admin/Editor menerbitkan naskah (Published), seluruh artikel jurnal akan tampil di sini lengkap dengan fitur Like, Komen, dan Share.'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {(activeTag || searchTerm.trim()) && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTag('');
                          setSearchTerm('');
                        }}
                        className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                      >
                        Lihat Semua Jurnal Terbit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setFeedView('threads')}
                      className="px-4 py-2 rounded-full bg-[#FEF2F2] hover:bg-blue-100 text-[#7A2222] font-bold text-xs border border-blue-200 cursor-pointer"
                    >
                      💬 Lihat Utas Diskusi Topik Ini
                    </button>
                    {!isGuest && (isAdminOrEditor || currentUser?.role === 'author') && onGoToSubmit && (
                      <button
                        type="button"
                        onClick={() => onGoToSubmit()}
                        className="px-4 py-2 rounded-full bg-[#7A2222] hover:bg-[#661B1B] text-white font-bold text-xs cursor-pointer"
                      >
                        + Unggah Naskah Baru
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                publishedArticles.map((art) => {
                  const comments = art.article_comments || [];
                  const isCommentsOpen = !!openArticleComments[art.id];
                  const commentsCount = art.comments_count ?? comments.length;
                  const likesCount = art.likes_count || 0;

                  return (
                    <article
                      key={art.id}
                      className="card-luxury card-luxury-hover rounded-[24px] overflow-hidden"
                    >
                      {/* Body Kartu Jurnal */}
                      <div className="p-5 space-y-3">
                        {/* Header Metadata Jurnal */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#7A2222] text-white">
                              📘 {art.journal?.abbreviation || 'JURNAL BRIDA'}
                            </span>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                              ✅ RESMI TERBIT
                            </span>
                            {art.doi && (
                              <span className="text-[10px] font-mono font-bold text-[#7A2222] bg-[#FEF2F2] px-2 py-0.5 rounded-full">
                                DOI: {art.doi}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-semibold">
                            {art.issue
                              ? `${art.issue.volume} ${art.issue.number} (${art.issue.year})`
                              : formatRelativeTime(art.published_at || art.created_at)}
                          </span>
                        </div>

                        {/* Judul & Penulis */}
                        <div className="space-y-1">
                          <h4
                            onClick={() => onOpenArticleDetail && onOpenArticleDetail(art)}
                            className="text-base sm:text-lg font-extrabold text-slate-900 hover:text-[#7A2222] leading-snug cursor-pointer transition"
                          >
                            {art.title}
                          </h4>
                          <div className="text-xs text-slate-500">
                            Penulis: <strong className="text-slate-800">{art.author?.name}</strong>
                            {art.co_authors ? `, ${art.co_authors}` : ''}
                            {art.author?.affiliation ? ` • ${art.author.affiliation}` : ''}
                          </div>
                        </div>

                        {/* Abstrak Singkat */}
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                          {art.abstract}
                        </p>

                        {/* Kata Kunci + Tombol Baca PDF / Detail */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <div className="flex flex-wrap gap-1.5">
                            {art.keywords &&
                              art.keywords
                                .split(/[,;]+/)
                                .map((k) => k.trim())
                                .filter(Boolean)
                                .slice(0, 5)
                                .map((kw) => (
                                  <button
                                    key={kw}
                                    type="button"
                                    onClick={() => {
                                      setActiveTag('');
                                      setSearchTerm(kw);
                                    }}
                                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-[#FEF2F2] text-slate-600 hover:text-[#7A2222] transition cursor-pointer"
                                  >
                                    #{kw.replace(/\s+/g, '')}
                                  </button>
                                ))}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {art.file_path && (
                              <a
                                href={resolveFileUrl(art.file_path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#7A2222] hover:bg-[#661B1B] text-white font-bold text-xs shadow-2xs transition"
                              >
                                <FileText size={13} /> Baca PDF
                              </a>
                            )}
                            {onOpenArticleDetail && (
                              <button
                                type="button"
                                onClick={() => onOpenArticleDetail(art)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
                              >
                                <Eye size={13} /> Detail
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* BAR INTERAKSI ALA THREADS / X DI BAWAH JURNAL: LIKE • KOMEN • SHARE */}
                      <div className="px-5 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-5 text-slate-500">
                          {/* Tombol LIKE */}
                          <button
                            type="button"
                            onClick={() => handleToggleArticleLike(art.id)}
                            className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-full transition cursor-pointer ${
                              art.liked_by_me
                                ? 'text-rose-600 bg-rose-50 border border-rose-200'
                                : 'hover:text-rose-600 hover:bg-rose-50/80'
                            }`}
                          >
                            <Heart size={16} className={art.liked_by_me ? 'fill-rose-600 text-rose-600' : ''} />
                            <span>{likesCount}</span>
                            <span className="hidden sm:inline font-bold">Suka</span>
                          </button>

                          {/* Tombol KOMEN (Klik untuk memunculkan daftar komentar & kolom balas!) */}
                          <button
                            type="button"
                            onClick={() =>
                              setOpenArticleComments((prev) => ({ ...prev, [art.id]: !prev[art.id] }))
                            }
                            className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-full transition cursor-pointer ${
                              isCommentsOpen
                                ? 'text-[#7A2222] bg-[#FEF2F2] border border-blue-200'
                                : 'hover:text-[#7A2222] hover:bg-blue-50/80'
                            }`}
                          >
                            <MessageCircle size={16} />
                            <span>{commentsCount}</span>
                            <span className="hidden sm:inline font-bold">Komen</span>
                          </button>

                          {/* Tombol SHARE */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setShareMenuArticleId((prev) => (prev === art.id ? null : art.id))
                              }
                              className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-full hover:text-emerald-700 hover:bg-emerald-50/80 transition cursor-pointer"
                            >
                              <Share2 size={15} />
                              <span className="hidden sm:inline font-bold">Share</span>
                            </button>
                            {shareMenuArticleId === art.id && (
                              <div className="absolute left-0 bottom-10 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs font-bold">
                                <button
                                  type="button"
                                  onClick={() => handleShareArticle(art, 'copy')}
                                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 cursor-pointer"
                                >
                                  📋 Salin Info &amp; Link Jurnal
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleShareArticle(art, 'citation')}
                                  className="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-[#7A2222] cursor-pointer"
                                >
                                  🎓 Salin Sitasi (APA)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleShareArticle(art, 'whatsapp')}
                                  className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-emerald-700 cursor-pointer"
                                >
                                  💬 Bagikan ke WhatsApp
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleShareArticle(art, 'x')}
                                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 text-slate-900 cursor-pointer"
                                >
                                  𝕏 Bagikan ke X
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setOpenArticleComments((prev) => ({ ...prev, [art.id]: !prev[art.id] }))
                          }
                          className="text-[11px] font-bold text-slate-400 hover:text-[#7A2222] cursor-pointer"
                        >
                          {isCommentsOpen ? 'Tutup komentar ▲' : commentsCount > 0 ? `Lihat ${commentsCount} komentar ▼` : 'Tulis komentar ▼'}
                        </button>
                      </div>

                      {/* DRAWER KOMENTAR ARTIKEL (BARU MUNCUL SETELAH LOGO KOMEN DIKLIK!) */}
                      {isCommentsOpen && (
                        <div className="px-5 py-4 bg-[#FDF7F7] border-t border-[#7A2222]/15 space-y-3.5">
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#7A2222] flex items-center gap-1.5">
                            <MessageCircle size={13} />
                            Komentar &amp; Tanggapan Pembaca ({commentsCount})
                          </div>

                          {comments.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-1">
                              Belum ada komentar untuk jurnal ini. Jadilah yang pertama memberikan tanggapan atau pertanyaan ilmiah!
                            </p>
                          ) : (
                            <div className="space-y-2.5">
                              {comments.map((cm) => {
                                const cRole = ROLE_META[cm.user?.role] || ROLE_META.author;
                                const canDel =
                                  !isGuest &&
                                  currentUser &&
                                  (isAdminOrEditor || String(currentUser.id) === String(cm.user_id));

                                return (
                                  <div key={cm.id} className="flex gap-2.5 items-start">
                                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${cRole.avatar} text-white font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5`}>
                                      {getInitials(cm.user?.name)}
                                    </div>
                                    <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200/80 px-3.5 py-2.5 space-y-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                          <strong className="text-slate-900">{cm.user?.name}</strong>
                                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${cRole.badge}`}>
                                            {cRole.label}
                                          </span>
                                          <span className="text-[10px] text-slate-400">
                                            • {formatRelativeTime(cm.created_at)}
                                          </span>
                                        </div>
                                        {canDel && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteArticleComment(art.id, cm.id)}
                                            className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                                            title="Hapus komentar"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        )}
                                      </div>
                                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                        {cm.content}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Form Input Komentar Baru */}
                          {!isGuest ? (
                            <div className="flex items-center gap-2 pt-1">
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${currentRoleMeta.avatar} text-white font-extrabold text-[10px] flex items-center justify-center shrink-0`}>
                                {getInitials(currentUser?.name)}
                              </div>
                              <input
                                type="text"
                                value={articleCommentDrafts[art.id] || ''}
                                onChange={(e) =>
                                  setArticleCommentDrafts((prev) => ({ ...prev, [art.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendArticleComment(art.id);
                                  }
                                }}
                                placeholder="Tulis komentar atau pertanyaan tentang jurnal ini..."
                                className="flex-1 bg-white border border-slate-300 focus:border-[#7A2222] rounded-full px-4 py-2 text-xs outline-none"
                              />
                              <button
                                type="button"
                                disabled={articleCommentSubmittingId === art.id}
                                onClick={() => handleSendArticleComment(art.id)}
                                className="px-4 py-2 rounded-full bg-[#7A2222] hover:bg-[#661B1B] disabled:opacity-50 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1 shrink-0"
                              >
                                <Send size={12} /> Kirim
                              </button>
                            </div>
                          ) : (
                            <div className="pt-1 flex items-center justify-between gap-2 bg-white rounded-2xl border border-blue-200 px-3.5 py-2.5 text-xs">
                              <span className="text-slate-600">
                                Ingin ikut berkomentar pada jurnal ini?
                              </span>
                              <button
                                type="button"
                                onClick={onRequireLogin}
                                className="px-3.5 py-1.5 rounded-full bg-[#7A2222] hover:bg-[#661B1B] text-white font-bold text-[11px] cursor-pointer shrink-0"
                              >
                                🔐 Masuk / Daftar
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </section>
          )}

          {/* =================================================================
              VIEW B: UTAS KOMUNITAS & PERMASALAHAN BEBAS (ALA THREADS / X)
             ================================================================= */}
          {feedView === 'threads' && (
          <>
          {/* KOTAK TULIS UTAS (COMPOSER ALA THREADS / X) */}
          {!isGuest ? (
            <form
              onSubmit={handleCreateThread}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${currentRoleMeta.avatar} text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs`}>
                  {getInitials(currentUser?.name)}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900">{currentUser?.name}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${currentRoleMeta.badge}`}>
                      {currentRoleMeta.label}
                    </span>
                  </div>

                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    placeholder="Ada isu permasalahan kota, topik jurnal menarik, atau pertanyaan SINTA yang ingin dibahas? Tulis utas Anda dan sertakan #Tagar..."
                    className="w-full bg-slate-50/70 focus:bg-white border border-slate-200 focus:border-[#7A2222] rounded-2xl p-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none resize-none transition"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="permasalahan">🔥 Permasalahan Riset &amp; Kota</option>
                      <option value="trending_jurnal">📘 Topik Jurnal</option>
                      <option value="kolaborasi">🤝 Cari Kolaborator</option>
                      <option value="tips_publikasi">💡 Tips &amp; Klinik SINTA</option>
                    </select>

                    <select
                      value={newJournalId}
                      onChange={(e) => setNewJournalId(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="">🌐 Umum (Semua Jurnal)</option>
                      {(journals || []).map((j) => (
                        <option key={j.id} value={j.id}>
                          📘 {j.abbreviation}
                        </option>
                      ))}
                    </select>

                    <div className="relative flex-1 min-w-[140px]">
                      <Hash size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={newTopicTag}
                        onChange={(e) => setNewTopicTag(e.target.value)}
                        placeholder="Tagar topik (opsional)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#7A2222]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className={`text-[11px] font-bold ${newContent.length > 900 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {newContent.length} / 1000 karakter
                </span>
                <button
                  type="submit"
                  disabled={posting || newContent.trim().length < 3}
                  className="inline-flex items-center gap-2 bg-[#7A2222] hover:bg-[#661B1B] disabled:opacity-50 text-white font-extrabold text-xs px-5 py-2.5 rounded-full shadow-xs transition cursor-pointer"
                >
                  <Send size={14} />
                  {posting ? 'Memposting...' : 'Posting Utas'}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-3xl border border-blue-200 shadow-xs p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 max-w-xl">
                <div className="w-11 h-11 rounded-2xl bg-[#FEF2F2] text-[#7A2222] flex items-center justify-center shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Ingin ikut berdiskusi atau melempar topik riset baru?
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Anda sedang menjelajah sebagai <strong>Pengunjung Publik</strong>. Semua diskusi terbuka untuk dibaca, dan Anda bisa masuk atau mendaftar akun gratis untuk menulis utas, membalas, &amp; menyukai!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRequireLogin}
                className="inline-flex items-center gap-2 bg-[#7A2222] hover:bg-[#661B1B] text-white font-extrabold text-xs px-5 py-2.5 rounded-full shadow-xs transition cursor-pointer"
              >
                <LogIn size={14} /> Masuk / Daftar untuk Diskusi
              </button>
            </div>
          )}

          {/* Filter Kategori Khusus Utas Komunitas */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: 'all', label: '🌐 Semua Topik' },
              { key: 'permasalahan', label: '🔥 Permasalahan' },
              { key: 'trending_jurnal', label: '📘 Topik Jurnal' },
              { key: 'kolaborasi', label: '🤝 Kolaborasi' },
              { key: 'tips_publikasi', label: '💡 Tips SINTA' }
            ].map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategoryFilter(cat.key)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                  categoryFilter === cat.key
                    ? 'bg-[#7A2222] text-white border-[#7A2222]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* FEED DAFTAR UTAS ALA THREADS / X */}
          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-xs text-slate-400">
              Memuat utas diskusi terkini...
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2">
              <MessageCircle size={36} className="mx-auto text-slate-300" />
              <div className="text-sm font-extrabold text-slate-700">
                Belum ada utas pada filter ini
              </div>
              <p className="text-xs text-slate-400">
                Coba hapus filter tagar/kategori atau jadilah yang pertama memulai diskusi baru!
              </p>
              {(activeTag || categoryFilter !== 'all' || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTag('');
                    setCategoryFilter('all');
                    setSearchTerm('');
                  }}
                  className="mt-2 px-4 py-1.5 rounded-full bg-[#FEF2F2] text-[#7A2222] font-bold text-xs cursor-pointer"
                >
                  Reset Semua Filter
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => {
                const roleInfo = ROLE_META[post.user?.role] || ROLE_META.author;
                const catInfo = CATEGORY_META[post.category] || CATEGORY_META.permasalahan;
                const replies = post.replies || [];
                const isExpanded = !!expandedThreads[post.id];
                const visibleReplies = isExpanded ? replies : replies.slice(0, 2);
                const canDeletePost =
                  !isGuest &&
                  currentUser &&
                  (isAdminOrEditor || String(currentUser.id) === String(post.user_id));

                return (
                  <article
                    key={post.id}
                    className={`bg-white rounded-3xl border transition p-5 ${
                      post.is_pinned
                        ? 'border-blue-300 ring-1 ring-blue-100 shadow-xs'
                        : 'border-slate-200/85 hover:border-slate-300'
                    }`}
                  >
                    {post.is_pinned && (
                      <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#7A2222] mb-3 pl-14">
                        <Pin size={12} /> Disematkan oleh Dewan Redaksi
                      </div>
                    )}

                    {/* Parent Thread Row with Signature Threads Vertical Line */}
                    <div className="flex gap-3.5">
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${roleInfo.avatar} text-white font-extrabold text-xs flex items-center justify-center shadow-xs`}>
                          {getInitials(post.user?.name)}
                        </div>
                        {(replies.length > 0 || isExpanded) && (
                          <div className="w-0.5 flex-1 bg-slate-200 rounded-full mt-2 min-h-[24px]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-2.5">
                        {/* Author Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-extrabold text-slate-900">
                                {post.user?.name}
                              </span>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${roleInfo.badge}`}>
                                {roleInfo.label}
                              </span>
                              <span className="text-xs text-slate-400">
                                {getHandle(post.user)} • {formatRelativeTime(post.created_at)}
                              </span>
                            </div>
                            {post.user?.affiliation && (
                              <div className="text-[11px] text-slate-400 truncate">
                                {post.user.affiliation}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isAdminOrEditor && (
                              <button
                                type="button"
                                onClick={() => handleTogglePin(post.id)}
                                title={post.is_pinned ? 'Lepas sematan' : 'Sematkan utas'}
                                className={`p-1.5 rounded-full transition cursor-pointer ${
                                  post.is_pinned
                                    ? 'bg-blue-100 text-[#7A2222]'
                                    : 'text-slate-400 hover:bg-slate-100 hover:text-[#7A2222]'
                                }`}
                              >
                                <Pin size={14} />
                              </button>
                            )}
                            {canDeletePost && (
                              <button
                                type="button"
                                onClick={() => handleDeletePost(post.id, false)}
                                title="Hapus utas"
                                className="p-1.5 rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Metadata Pills */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${catInfo.badge}`}>
                            {catInfo.short}
                          </span>
                          {post.journal && (
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
                              <BookOpen size={10} /> {post.journal.abbreviation}
                            </span>
                          )}
                          {post.topic_tag && (
                            <button
                              type="button"
                              onClick={() => handleSelectTrendingTopic(post.topic_tag)}
                              className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#7A2222] border border-blue-200 hover:bg-[#7A2222] hover:text-white transition cursor-pointer"
                            >
                              {post.topic_tag}
                            </button>
                          )}
                        </div>

                        {/* Thread Text Content */}
                        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line break-words">
                          {renderRichText(post.content, (tag) => handleSelectTrendingTopic(tag))}
                        </p>

                        {/* Action Bar Ala Threads / X */}
                        <div className="flex items-center gap-5 pt-1 text-slate-500">
                          <button
                            type="button"
                            onClick={() => handleToggleLike(post.id)}
                            className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 -ml-2.5 rounded-full transition cursor-pointer ${
                              post.liked_by_me
                                ? 'text-rose-600 bg-rose-50'
                                : 'hover:text-rose-600 hover:bg-rose-50/70'
                            }`}
                          >
                            <Heart size={16} className={post.liked_by_me ? 'fill-rose-600 text-rose-600' : ''} />
                            <span>{post.likes_count || 0}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedThreads((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                            }
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full hover:text-[#7A2222] hover:bg-blue-50/70 transition cursor-pointer"
                          >
                            <MessageCircle size={16} />
                            <span>{replies.length} Balasan</span>
                          </button>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setShareMenuPostId((prev) => (prev === post.id ? null : post.id))
                              }
                              className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full hover:text-emerald-700 hover:bg-emerald-50/70 transition cursor-pointer"
                            >
                              <Share2 size={15} />
                              <span className="hidden sm:inline">Bagikan</span>
                            </button>
                            {shareMenuPostId === post.id && (
                              <div className="absolute left-0 mt-1.5 w-44 bg-white rounded-2xl shadow-lg border border-slate-200 py-1.5 z-20 text-xs font-bold">
                                <button
                                  type="button"
                                  onClick={() => handleShareThread(post, 'copy')}
                                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 cursor-pointer"
                                >
                                  📋 Salin Teks &amp; Link
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleShareThread(post, 'whatsapp')}
                                  className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 text-emerald-700 cursor-pointer"
                                >
                                  💬 Bagikan ke WhatsApp
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleShareThread(post, 'x')}
                                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 text-slate-900 cursor-pointer"
                                >
                                  𝕏 Bagikan ke X
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* THREADED REPLIES ALA THREADS */}
                    {visibleReplies.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {visibleReplies.map((reply, rIdx) => {
                          const rRole = ROLE_META[reply.user?.role] || ROLE_META.author;
                          const isLastVisible = rIdx === visibleReplies.length - 1 && !isExpanded;
                          const canDeleteReply =
                            !isGuest &&
                            currentUser &&
                            (isAdminOrEditor || String(currentUser.id) === String(reply.user_id));

                          return (
                            <div key={reply.id} className="flex gap-3.5 pl-1.5">
                              <div className="flex flex-col items-center shrink-0 w-9">
                                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${rRole.avatar} text-white font-extrabold text-[10px] flex items-center justify-center`}>
                                  {getInitials(reply.user?.name)}
                                </div>
                                {!isLastVisible && (
                                  <div className="w-0.5 flex-1 bg-slate-200 rounded-full mt-1.5 min-h-[12px]" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0 bg-slate-50/80 rounded-2xl border border-slate-200/70 px-3.5 py-2.5 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    <strong className="text-slate-800">{reply.user?.name}</strong>
                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${rRole.badge}`}>
                                      {rRole.label}
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                      • {formatRelativeTime(reply.created_at)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleLike(reply.id)}
                                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full cursor-pointer ${
                                        reply.liked_by_me ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-rose-600'
                                      }`}
                                    >
                                      <Heart size={12} className={reply.liked_by_me ? 'fill-rose-600 text-rose-600' : ''} />
                                      {reply.likes_count > 0 && <span>{reply.likes_count}</span>}
                                    </button>
                                    {canDeleteReply && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePost(reply.id, true)}
                                        className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                                        title="Hapus balasan"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                  {renderRichText(reply.content, (tag) => setActiveTag(tag))}
                                </p>
                              </div>
                            </div>
                          );
                        })}

                        {!isExpanded && replies.length > 2 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedThreads((prev) => ({ ...prev, [post.id]: true }))
                            }
                            className="pl-14 text-xs font-extrabold text-[#7A2222] hover:underline cursor-pointer"
                          >
                            Lihat semua {replies.length} balasan →
                          </button>
                        )}
                      </div>
                    )}

                    {/* INLINE REPLY INPUT (SAAT DIBUKA) */}
                    {isExpanded && (
                      <div className="mt-3 pl-14">
                        {!isGuest ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={replyDrafts[post.id] || ''}
                              onChange={(e) =>
                                setReplyDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendReply(post.id);
                                }
                              }}
                              placeholder={`Balas utas ${post.user?.name}...`}
                              className="flex-1 bg-slate-50 border border-slate-200 focus:border-[#7A2222] focus:bg-white rounded-full px-4 py-2 text-xs outline-none"
                            />
                            <button
                              type="button"
                              disabled={replySubmittingId === post.id}
                              onClick={() => handleSendReply(post.id)}
                              className="px-4 py-2 rounded-full bg-[#7A2222] hover:bg-[#661B1B] disabled:opacity-50 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                            >
                              <Send size={12} /> Balas
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={onRequireLogin}
                            className="text-xs font-bold text-[#7A2222] bg-[#FEF2F2] hover:bg-blue-100 px-3.5 py-1.5 rounded-full border border-blue-200 cursor-pointer"
                          >
                            🔐 Masuk untuk ikut membalas utas ini
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          </>
          )}
        </div>

        {/* KOLOM KANAN (SIDEBAR TRENDING - 4 COLS) */}
        <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
          {/* Card 1: Sedang Tren di BRIDA */}
          <div className="card-luxury rounded-[24px] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 space-y-0.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Flame size={16} className="text-orange-500" />
                  Sedang Tren Untuk Anda
                </h4>
                <span className="text-[10px] font-extrabold text-[#7A2222] bg-[#FEF2F2] px-2 py-0.5 rounded-full">
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Klik topik untuk melihat jurnal terbit &amp; diskusi terkait.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {trendingTopics.length === 0 ? (
                <div className="p-5 text-xs text-slate-400 text-center">
                  Belum ada tagar trending. Mulai gunakan #Tagar pada utas Anda!
                </div>
              ) : (
                trendingTopics.map((item, index) => {
                  const catInfo = CATEGORY_META[item.category] || CATEGORY_META.permasalahan;
                  const isActive = activeTag.toLowerCase() === item.tag.toLowerCase();
                  return (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => handleSelectTrendingTopic(item.tag)}
                      className={`w-full text-left px-5 py-3.5 transition cursor-pointer flex items-start justify-between gap-2 ${
                        isActive ? 'bg-[#FEF2F2] border-l-4 border-l-[#7A2222]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                          <span>{index + 1} • Sedang tren</span>
                          <span>•</span>
                          <span>{catInfo.label}</span>
                        </div>
                        <div className="text-sm font-extrabold text-[#7A2222] truncate mt-0.5">
                          {item.tag}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.posts_count} utas • {item.likes_count} suka • {item.replies_count} balasan
                        </div>
                        <div className="mt-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                            (item.related_articles_count || 0) > 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            <BookOpen size={10} />
                            {(item.related_articles_count || 0) > 0
                              ? `${item.related_articles_count} Artikel Terbit Tersedia`
                              : 'Lihat Jurnal Terkait →'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 shrink-0">
                        🔥 #{index + 1}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 2: Topik Cepat / Ide Diskusi */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Sparkles size={15} className="text-[#7A2222]" />
              Jelajahi Topik &amp; Jurnal Terbit
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {[
                '#SmartCityMakassar',
                '#KlinikSINTA',
                '#BanjirDanDrainase',
                '#UMKMDigital',
                '#KesehatanPesisir',
                '#TataKelolaDigital',
                '#KolaborasiRiset'
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleSelectQuickTopic(tag)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                    activeTag.toLowerCase() === tag.toLowerCase()
                      ? 'bg-[#7A2222] text-white border-[#7A2222]'
                      : 'bg-[#FDF7F7] hover:bg-[#7A2222] text-[#7A2222] hover:text-white border-blue-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Card 3: Kata Kunci Jurnal Terbit Aktual */}
          {journalKeywords.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <BookOpen size={15} className="text-[#7A2222]" />
                Kata Kunci Jurnal Terbit BRIDA
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {journalKeywords.map((kw) => (
                  <button
                    key={kw.keyword}
                    type="button"
                    onClick={() => {
                      setActiveTag('');
                      setSearchTerm(kw.keyword);
                      setFeedView('journals');
                      setTimeout(() => {
                        const el = document.getElementById('published-journals-feed');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }, 150);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition cursor-pointer ${
                      searchTerm.toLowerCase() === kw.keyword.toLowerCase()
                        ? 'bg-[#7A2222] text-white border-[#7A2222]'
                        : 'bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#7A2222] border-slate-200'
                    }`}
                  >
                    {kw.keyword}{' '}
                    <span className="text-[10px] opacity-70">({kw.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
