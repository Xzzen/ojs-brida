import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import toast, { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard, FileUp, LogOut, CheckCircle2, Clock, FileText,
  BookOpen, Layers, Award, Search, PlusCircle, UserCheck, Eye,
  Download, CheckSquare, Building2, ShieldCheck,
  Send, X, RefreshCw, ChevronRight, Globe, Lock, ArrowRight, ExternalLink,
  Trash2, Edit3, Users, UserPlus, Flame, Menu
} from 'lucide-react';
import ForumTrending, { TrendingPortalWidget } from './ForumTrending';
import { API_BASE, STORAGE_BASE, resolveFileUrl } from './config';

const STATUS_BADGE = {
  pending: { label: 'MENUNGGU EDITOR', bg: 'bg-amber-50/90 text-amber-800 border-amber-200/80' },
  under_review: { label: 'SEDANG DIREVIEW', bg: 'bg-sky-50/90 text-sky-800 border-sky-200/80' },
  revision_required: { label: 'PERLU REVISI', bg: 'bg-orange-50/90 text-orange-800 border-orange-200/80' },
  accepted: { label: 'DISETUJUI', bg: 'bg-emerald-50/90 text-emerald-800 border-emerald-200/80' },
  published: { label: 'RESMI TERBIT', bg: 'bg-indigo-50/90 text-indigo-800 border-indigo-200/80' },
  rejected: { label: 'DITOLAK', bg: 'bg-rose-50/90 text-rose-800 border-rose-200/80' }
};

const SOLID_MAROON_THEME = {
  border: 'border-[#7A2222]',
  bgHeader: 'bg-[#7A2222]',
  badge: 'bg-[#FEF2F2] text-[#7A2222] border-[#7A2222]/20',
  btn: 'bg-[#7A2222] hover:bg-[#661B1B] text-white'
};

const JOURNAL_THEME = {
  blue: SOLID_MAROON_THEME,
  red: SOLID_MAROON_THEME,
  emerald: SOLID_MAROON_THEME,
  amber: SOLID_MAROON_THEME
};

export default function Dashboard({ currentUser, initialTab = 'portal', onLogout }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [navTab, setNavTab] = useState(initialTab);
  const [isTabFading, setIsTabFading] = useState(false);
  const tabSwapTimerRef = useRef(null);
  const tabRaf1Ref = useRef(null);
  const tabRaf2Ref = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const switchTab = (nextTab) => {
    setMobileMenuOpen(false);
    if (nextTab === navTab && !isTabFading) return;

    if (tabSwapTimerRef.current) clearTimeout(tabSwapTimerRef.current);
    if (tabRaf1Ref.current) cancelAnimationFrame(tabRaf1Ref.current);
    if (tabRaf2Ref.current) cancelAnimationFrame(tabRaf2Ref.current);

    // Highlight sidebar pill seketika & fade-out lembut konten lama di tempat (0px gerak)
    setNavTab(nextTab);
    setIsTabFading(true);

    tabSwapTimerRef.current = setTimeout(() => {
      setActiveTab(nextTab);
      window.scrollTo(0, 0);
      // Tunggu 2 frame paint selesai baru fade-in lembut pada 60fps penuh
      tabRaf1Ref.current = requestAnimationFrame(() => {
        tabRaf2Ref.current = requestAnimationFrame(() => {
          setIsTabFading(false);
        });
      });
    }, 165);
  };

  useEffect(() => {
    setNavTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (tabSwapTimerRef.current) clearTimeout(tabSwapTimerRef.current);
      if (tabRaf1Ref.current) cancelAnimationFrame(tabRaf1Ref.current);
      if (tabRaf2Ref.current) cancelAnimationFrame(tabRaf2Ref.current);
    };
  }, []);
  const [journals, setJournals] = useState([]);
  const [selectedJournalId, setSelectedJournalId] = useState('all');
  const [portalSelectedJournal, setPortalSelectedJournal] = useState(null);

  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState({
    journals_count: 0,
    total: 0,
    pending: 0,
    under_review: 0,
    revision_required: 0,
    accepted: 0,
    published: 0,
    rejected: 0,
    reviewers: [],
    by_journal: []
  });
  const [loading, setLoading] = useState(false);

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Landing Page Info Card Tabs
  const [activeInfoTab, setActiveInfoTab] = useState('fokus');

  // State Forum & Trending Topik
  const [forumThreadCount, setForumThreadCount] = useState(0);
  const [forumPreview, setForumPreview] = useState(null);
  const [forumInitialTag, setForumInitialTag] = useState('');

  const handleOpenForum = (tag = '') => {
    setForumInitialTag(tag || '');
    switchTab('trending');
  };

  // Form Unggah Naskah Baru (Multi-Journal + Gatekeeper Standarisasi SINTA/OJS)
  const [formJournalId, setFormJournalId] = useState('');
  const [section, setSection] = useState('Original Research');
  const [title, setTitle] = useState('');
  const [coAuthors, setCoAuthors] = useState('');
  const [keywords, setKeywords] = useState('');
  const [abstract, setAbstract] = useState('');
  const [file, setFile] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitStep, setSubmitStep] = useState(1);
  const [ojsChecklist, setOjsChecklist] = useState({
    original: false,
    similarity: false,
    imrad: false,
    blind: false
  });
  const [submitViolations, setSubmitViolations] = useState([]);

  // Modal Detail Naskah
  const [detailSubmission, setDetailSubmission] = useState(null);

  // Modal Tambah Jurnal Baru
  const [showAddJournalModal, setShowAddJournalModal] = useState(false);
  const [newJournal, setNewJournal] = useState({
    code: '',
    title: '',
    abbreviation: '',
    issn_print: '',
    issn_online: '',
    accreditation: 'SINTA 3',
    chief_editor: '',
    frequency: '2 Kali Setahun (Juni & Desember)',
    accent_color: 'blue',
    description: '',
    focus_scope: ''
  });

  // State Form Evaluasi / Editorial (Support Multi-Reviewer)
  const [selectedSubForAction, setSelectedSubForAction] = useState(null);
  const [assignReviewerId, setAssignReviewerId] = useState('');
  const [selectedReviewerIds, setSelectedReviewerIds] = useState([]);
  const [extraReviewerId, setExtraReviewerId] = useState('');
  const [editorNotes, setEditorNotes] = useState('');
  const [reviewScores, setReviewScores] = useState({
    score_originality: 88,
    score_methodology: 85,
    score_relevance: 90,
    comments: '',
    decision: 'accept'
  });
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  // State Manajemen Pengguna (Khusus Admin)
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'reviewer',
    affiliation: '',
    specialty: ''
  });

  // State Unggah Revisi Penulis
  const [revisionFile, setRevisionFile] = useState(null);
  const [uploadingRevision, setUploadingRevision] = useState(false);

  const handleUploadRevision = async (subId) => {
    if (!revisionFile) {
      toast.error('Pilih berkas PDF/DOCX revisi terlebih dahulu!');
      return;
    }
    setUploadingRevision(true);
    const fd = new FormData();
    fd.append('file', revisionFile);
    try {
      const res = await axios.post(`${API_BASE}/submissions/${subId}/reupload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data?.message || 'Berkas naskah revisi berhasil dikirim kembali ke Redaksi & Reviewer!');
      setRevisionFile(null);
      setDetailSubmission(res.data?.data || null);
      fetchAllData(selectedJournalId);
    } catch (e) {
      const vList = e?.response?.data?.violations;
      if (Array.isArray(vList) && vList.length > 0) {
        toast.error(`Revisi dicegat: ${vList[0]}`, { duration: 6000 });
      } else {
        toast.error(e?.response?.data?.message || 'Gagal mengunggah berkas revisi.');
      }
    } finally {
      setUploadingRevision(false);
    }
  };

  const isAdminOrEditor = currentUser?.role === 'admin' || currentUser?.role === 'editor';
  const isReviewer = currentUser?.role === 'reviewer';
  const isAuthor = currentUser?.role === 'author';
  const isGuest = currentUser?.role === 'guest';

  // State & Handler Edit Metadata Naskah (Judul, Penulis, Abstrak)
  const [editSubmissionModal, setEditSubmissionModal] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    co_authors: '',
    abstract: '',
    keywords: '',
    section: 'Original Research'
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const handleOpenEditModal = (sub) => {
    setEditSubmissionModal(sub);
    setEditForm({
      title: sub.title || '',
      co_authors: sub.co_authors || '',
      abstract: sub.abstract || '',
      keywords: sub.keywords || '',
      section: sub.section || 'Original Research'
    });
  };

  const handleSaveEditSubmission = async (e) => {
    e.preventDefault();
    if (!editSubmissionModal) return;
    setSavingEdit(true);
    try {
      const res = await axios.put(`${API_BASE}/submissions/${editSubmissionModal.id}`, editForm);
      toast.success('Data naskah (judul, penulis, dan abstrak) berhasil diperbarui!');
      setEditSubmissionModal(null);
      if (detailSubmission && detailSubmission.id === editSubmissionModal.id) {
        setDetailSubmission(res.data?.data || null);
      }
      fetchAllData(selectedJournalId);
    } catch (err) {
      toast.error('Gagal memperbarui data naskah.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handler Hapus Naskah
  const handleDeleteSubmission = async (sub) => {
    const confirmMsg = `Apakah Anda yakin ingin menghapus / menarik naskah:\n"${sub.title}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await axios.delete(`${API_BASE}/submissions/${sub.id}`);
      toast.success(res.data?.message || 'Naskah berhasil dihapus dari sistem!');
      if (detailSubmission && detailSubmission.id === sub.id) {
        setDetailSubmission(null);
      }
      if (selectedSubForAction && selectedSubForAction.id === sub.id) {
        setSelectedSubForAction(null);
      }
      fetchAllData(selectedJournalId);
    } catch (err) {
      toast.error('Gagal menghapus naskah.');
    }
  };

  // Handler Hapus Jurnal
  const handleDeleteJournal = async (journal) => {
    const confirmMsg = `PERINGATAN: Apakah Anda yakin ingin menghapus jurnal:\n"${journal.title}" (${journal.abbreviation})?\nSeluruh data terbitan dan naskah di dalam jurnal ini juga akan terhapus.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await axios.delete(`${API_BASE}/journals/${journal.id}`);
      toast.success(res.data?.message || 'Jurnal berhasil dihapus!');
      if (String(selectedJournalId) === String(journal.id)) {
        setSelectedJournalId('all');
      }
      if (portalSelectedJournal && portalSelectedJournal.id === journal.id) {
        setPortalSelectedJournal(null);
      }
      if (String(formJournalId) === String(journal.id)) {
        setFormJournalId('');
      }
      fetchAllData('all');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Gagal menghapus jurnal.';
      toast.error(errMsg);
    }
  };

  const fetchAllData = async (jId = selectedJournalId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/bootstrap`, {
        params: { journal_id: jId, sort: 'trending' }
      });
      const payload = res.data || {};

      const jList = payload.journals || [];
      setJournals(jList);
      if (!formJournalId && jList.length > 0) {
        setFormJournalId(String(jList[0].id));
      }

      setSubmissions(payload.submissions || []);

      if (payload.stats) {
        setStats(payload.stats);
        if (!assignReviewerId && payload.stats.reviewers?.length > 0) {
          setAssignReviewerId(String(payload.stats.reviewers[0].id));
        }
      }

      if (payload.forum) {
        setForumPreview(payload.forum);
        setForumThreadCount(payload.forum.stats?.total_threads || 0);
      }
    } catch (err) {
      console.error('Gagal mengambil data API:', err);
      toast.error('Gagal terhubung ke server API backend. Pastikan server aktif.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData(selectedJournalId);
  }, [selectedJournalId]);

  // Isolasi Data Asli Berdasarkan Akun & Peran (Real RBAC, tanpa simulasi)
  const roleScopedSubmissions = submissions.filter((sub) => {
    if (isAdminOrEditor) return true;
    if (isAuthor) return String(sub.author_id) === String(currentUser?.id);
    if (isReviewer) {
      return (sub.reviews || []).some((r) => String(r.reviewer_id) === String(currentUser?.id));
    }
    return sub.status === 'published';
  });

  // Statistik terisolasi sesuai role aktif
  const scopedStats = isAdminOrEditor
    ? stats
    : {
        ...stats,
        total: roleScopedSubmissions.length,
        pending: roleScopedSubmissions.filter((s) => s.status === 'pending').length,
        under_review: roleScopedSubmissions.filter((s) => s.status === 'under_review').length,
        revision_required: roleScopedSubmissions.filter((s) => s.status === 'revision_required').length,
        accepted: roleScopedSubmissions.filter((s) => s.status === 'accepted').length,
        published: roleScopedSubmissions.filter((s) => s.status === 'published').length,
        rejected: roleScopedSubmissions.filter((s) => s.status === 'rejected').length
      };

  // Hitungan badge antrean evaluasi (khusus tugas aktif — menunggu konfirmasi atau sedang menelaah)
  const reviewQueueBadgeCount = isReviewer
    ? roleScopedSubmissions.filter((s) => {
        const myRev = (s.reviews || []).find((r) => String(r.reviewer_id) === String(currentUser?.id));
        return s.status === 'under_review' && myRev && (myRev.status === 'assigned' || myRev.status === 'in_progress');
      }).length
    : stats.pending + stats.under_review;

  // Helper Progress Tracker Terpadu untuk Semua Peran (Admin, Penulis, Reviewer)
  const getSubmissionProgressMeta = (sub) => {
    const reviews = sub?.reviews || [];
    const activeRevs = reviews.filter((r) => r.status !== 'declined');
    const declinedRevs = reviews.filter((r) => r.status === 'declined');
    const completedRevs = activeRevs.filter((r) => r.status === 'completed');
    const awaitingConfirmRevs = activeRevs.filter((r) => r.status === 'assigned');

    if (sub.status === 'pending') {
      return {
        percent: 20,
        step: 1,
        barColor: 'bg-amber-500',
        summary: 'Naskah diterima sistem — Menunggu skrining & penugasan Mitra Bestari oleh Editor.',
        activeRevs,
        declinedRevs,
        completedRevs,
        awaitingConfirmRevs
      };
    }
    if (sub.status === 'under_review') {
      if (activeRevs.length === 0 && declinedRevs.length > 0) {
        return {
          percent: 30,
          step: 2,
          barColor: 'bg-rose-500',
          summary: `Seluruh Mitra Bestari (${declinedRevs.length}) menolak undangan — Menunggu Editor menunjuk Reviewer pengganti.`,
          activeRevs,
          declinedRevs,
          completedRevs,
          awaitingConfirmRevs
        };
      }
      if (activeRevs.length > 0 && completedRevs.length === activeRevs.length) {
        return {
          percent: 65,
          step: 3,
          barColor: 'bg-amber-600',
          summary: `Penelaahan selesai (${completedRevs.length}/${activeRevs.length} Reviewer) — Menunggu keputusan akhir Chief Editor.`,
          activeRevs,
          declinedRevs,
          completedRevs,
          awaitingConfirmRevs
        };
      }
      const reviewRatio = activeRevs.length > 0 ? completedRevs.length / activeRevs.length : 0;
      const pct = Math.round(40 + reviewRatio * 20);
      const waitMsg =
        awaitingConfirmRevs.length === activeRevs.length
          ? `Undangan terkirim ke ${activeRevs.length} Reviewer — Menunggu konfirmasi kesediaan.`
          : `Sedang ditelaah (${completedRevs.length}/${activeRevs.length} Reviewer selesai${
              awaitingConfirmRevs.length > 0 ? `, ${awaitingConfirmRevs.length} menunggu konfirmasi` : ''
            }).`;
      return {
        percent: pct,
        step: 3,
        barColor: 'bg-blue-600',
        summary: waitMsg,
        activeRevs,
        declinedRevs,
        completedRevs,
        awaitingConfirmRevs
      };
    }
    if (sub.status === 'revision_required') {
      return {
        percent: 70,
        step: 4,
        barColor: 'bg-orange-500',
        summary: 'Menunggu Penulis memperbaiki dokumen dan mengunggah berkas revisi sesuai masukan Reviewer.',
        activeRevs,
        declinedRevs,
        completedRevs,
        awaitingConfirmRevs
      };
    }
    if (sub.status === 'accepted') {
      return {
        percent: 85,
        step: 4,
        barColor: 'bg-emerald-600',
        summary: 'Naskah disetujui untuk terbit (Accepted) — Menunggu penerbitan & pembuatan nomor DOI oleh Editor.',
        activeRevs,
        declinedRevs,
        completedRevs,
        awaitingConfirmRevs
      };
    }
    if (sub.status === 'published') {
      return {
        percent: 100,
        step: 5,
        barColor: 'bg-purple-600',
        summary: `Artikel resmi terbit (Published) dan terindeks di Portal Publik dengan DOI: ${sub.doi || '-'}.`,
        activeRevs,
        declinedRevs,
        completedRevs,
        awaitingConfirmRevs
      };
    }
    return {
      percent: 100,
      step: 5,
      barColor: 'bg-rose-600',
      summary: 'Naskah ditolak berdasarkan hasil evaluasi Peer-Review / keputusan Dewan Redaksi.',
      activeRevs,
      declinedRevs,
      completedRevs,
      awaitingConfirmRevs
    };
  };

  // Komponen Visual Progress Bar 5-Tahap (Untuk Admin, Penulis, dan Modal Detail)
  const renderWorkflowProgressBar = (sub) => {
    const meta = getSubmissionProgressMeta(sub);
    const isRejected = sub.status === 'rejected';
    const stages = [
      { id: 1, label: 'Terkirim' },
      { id: 2, label: 'Penugasan' },
      { id: 3, label: 'Peer-Review' },
      { id: 4, label: sub.status === 'revision_required' ? 'Revisi' : 'Keputusan' },
      { id: 5, label: isRejected ? 'Ditolak' : 'Terbit + DOI' }
    ];

    return (
      <div className="bg-[#FDF7F7] p-4 rounded-2xl border border-[#7A2222]/15 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-extrabold text-[#7A2222] uppercase tracking-wider text-[11px]">
            Progres Alur Publikasi OJS
          </span>
          <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
            isRejected
              ? 'bg-rose-100 text-rose-800'
              : meta.percent === 100
              ? 'bg-purple-100 text-purple-800'
              : 'bg-blue-100 text-[#7A2222]'
          }`}>
            {isRejected ? 'Ditolak' : `${meta.percent}% Selesai`}
          </span>
        </div>

        {/* Continuous Progress Track */}
        <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-[#7A2222]/15">
          <div
            className={`h-full transition-all duration-500 rounded-full ${meta.barColor}`}
            style={{ width: `${meta.percent}%` }}
          />
        </div>

        {/* 5 Milestone Nodes */}
        <div className="grid grid-cols-5 gap-1 text-center text-[10px] font-bold">
          {stages.map((st) => {
            const done = meta.step > st.id || (meta.step === 5 && st.id === 5);
            const active = meta.step === st.id && meta.step < 5;
            return (
              <div key={st.id} className="flex flex-col items-center">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mb-1 ${
                    isRejected && st.id === 5
                      ? 'bg-rose-600 text-white'
                      : done
                      ? 'bg-[#7A2222] text-white'
                      : active
                      ? sub.status === 'revision_required'
                        ? 'bg-orange-500 text-white animate-pulse'
                        : 'bg-blue-600 text-white ring-2 ring-blue-200'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isRejected && st.id === 5 ? '✕' : done ? '✓' : st.id}
                </span>
                <span className={done || active ? 'text-slate-800' : 'text-slate-400'}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-600 bg-white/90 px-3 py-2 rounded-xl border border-[#7A2222]/15 leading-relaxed">
          <strong>Status Saat Ini:</strong> {meta.summary}
        </p>
      </div>
    );
  };

  // Filter daftar naskah secara reaktif
  const filteredSubmissions = roleScopedSubmissions.filter((sub) => {
    const matchStatus = statusFilter === 'all' || sub.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      sub.title?.toLowerCase().includes(q) ||
      sub.abstract?.toLowerCase().includes(q) ||
      sub.keywords?.toLowerCase().includes(q) ||
      sub.author?.name?.toLowerCase().includes(q) ||
      sub.co_authors?.toLowerCase().includes(q) ||
      sub.doi?.toLowerCase().includes(q) ||
      sub.journal?.abbreviation?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // Perhitungan Live Standarisasi Naskah Ilmiah (SINTA / ARJUNA & PKP OJS)
  const titleWords = title.trim() ? title.trim().split(/\s+/).filter(Boolean) : [];
  const titleWordCount = titleWords.length;
  const titleIsAllCaps = title.trim().length > 0 && /[A-Z]/.test(title) && title.trim() === title.trim().toUpperCase();
  const isTitleStandardOk = titleWordCount >= 5 && titleWordCount <= 20 && !titleIsAllCaps;

  const abstractWords = abstract.trim() ? abstract.trim().split(/\s+/).filter(Boolean) : [];
  const abstractWordCount = abstractWords.length;
  const abstractMultiPara = /\r?\n\s*\r?\n/.test(abstract.trim());
  const abstractHasCitation = /\[\d+\]|\([A-Z][a-zA-Z\s.\-&]+,\s*(19|20)\d{2}\)|\bet\s+al\./i.test(abstract);
  const isAbstractStandardOk =
    abstractWordCount >= 150 && abstractWordCount <= 250 && !abstractMultiPara && !abstractHasCitation;

  const keywordItems = keywords
    .split(/[,;]+/)
    .map((k) => k.trim())
    .filter(Boolean);
  const keywordUniqueCount = new Set(keywordItems.map((k) => k.toLowerCase())).size;
  const keywordsHaveDup = keywordUniqueCount !== keywordItems.length;
  const isKeywordsStandardOk = keywordItems.length >= 3 && keywordItems.length <= 6 && !keywordsHaveDup;

  const fileExt = file ? file.name.split('.').pop()?.toLowerCase() : '';
  const isFileStandardOk =
    Boolean(file) && ['pdf', 'doc', 'docx'].includes(fileExt || '') && file.size >= 100 && file.size <= 20 * 1024 * 1024;

  const checklistCheckedCount = Object.values(ojsChecklist).filter(Boolean).length;
  const isChecklistStandardOk = checklistCheckedCount === 4;

  const standardScoreCount = [
    Boolean(formJournalId),
    isTitleStandardOk,
    isAbstractStandardOk,
    isKeywordsStandardOk,
    isFileStandardOk,
    isChecklistStandardOk
  ].filter(Boolean).length;

  // Handler Unggah Naskah Baru ke Jurnal Tujuan (Dengan Gatekeeper Standarisasi SINTA/OJS)
  const handleSubmitManuscript = async (e) => {
    e.preventDefault();
    const localViolations = [];

    if (!formJournalId) {
      localViolations.push('Pilih Jurnal Tujuan terlebih dahulu.');
    }
    if (titleWordCount < 5 || titleWordCount > 20) {
      localViolations.push(`Judul naskah wajib 5 hingga 20 kata sesuai standar SINTA/ARJUNA (saat ini: ${titleWordCount} kata).`);
    }
    if (titleIsAllCaps) {
      localViolations.push('Judul naskah tidak boleh ditulis HURUF KAPITAL SEMUA (ALL CAPS). Gunakan kapitalisasi judul ilmiah.');
    }
    if (abstractWordCount < 150 || abstractWordCount > 250) {
      localViolations.push(`Abstrak wajib 150 hingga 250 kata sesuai standar SINTA/ARJUNA (saat ini: ${abstractWordCount} kata).`);
    }
    if (abstractMultiPara) {
      localViolations.push('Abstrak wajib ditulis dalam 1 paragraf utuh (tanpa baris kosong pemisah paragraf).');
    }
    if (abstractHasCitation) {
      localViolations.push('Abstrak tidak diperbolehkan mengandung sitasi pustaka seperti [1], (Penulis, 2023), atau et al.');
    }
    if (keywordItems.length < 3 || keywordItems.length > 6) {
      localViolations.push(`Kata kunci wajib 3 hingga 6 kata/frasa ilmiah dipisahkan koma (saat ini: ${keywordItems.length} kata kunci).`);
    } else if (keywordsHaveDup) {
      localViolations.push('Kata kunci mengandung istilah yang duplikat.');
    }
    if (!file) {
      localViolations.push('Berkas naskah (.docx / .pdf / .doc) wajib diunggah.');
    } else if (!['pdf', 'doc', 'docx'].includes(fileExt || '')) {
      localViolations.push('Format file tidak didukung. Hanya menerima .docx, .doc, atau .pdf.');
    } else if (file.size < 100) {
      localViolations.push('Ukuran berkas terlalu kecil/kosong (< 100 byte).');
    } else if (file.size > 20 * 1024 * 1024) {
      localViolations.push('Ukuran file melebihi batas maksimal 20MB.');
    }
    if (!isChecklistStandardOk) {
      localViolations.push(`Checklist Persiapan OJS wajib dicentang seluruhnya (${checklistCheckedCount}/4 tercentang).`);
    }

    if (localViolations.length > 0) {
      setSubmitViolations(localViolations);
      toast.error(`Pengunggahan dicegat! ${localViolations.length} kriteria standarisasi belum terpenuhi.`);
      return;
    }

    setSubmitViolations([]);
    setSubmitLoading(true);
    const formData = new FormData();
    formData.append('journal_id', formJournalId);
    if (currentUser?.id) {
      formData.append('author_id', String(currentUser.id));
    }
    formData.append('section', section);
    formData.append('title', title.trim());
    formData.append('co_authors', coAuthors.trim());
    formData.append('keywords', keywords.trim());
    formData.append('abstract', abstract.trim());
    formData.append('checklist_agreed', '1');
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_BASE}/submissions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data?.message || 'Naskah lolos validasi standar SINTA/OJS dan berhasil dikirim!');
      setTitle('');
      setCoAuthors('');
      setKeywords('');
      setAbstract('');
      setFile(null);
      setOjsChecklist({ original: false, similarity: false, imrad: false, blind: false });
      setSubmitViolations([]);
      setSubmitStep(1);
      setActiveTab('dashboard');
      fetchAllData(selectedJournalId);
    } catch (err) {
      const serverViolations = err?.response?.data?.violations;
      if (Array.isArray(serverViolations) && serverViolations.length > 0) {
        setSubmitViolations(serverViolations);
        toast.error('Pengunggahan dicegat server! Periksa kotak detail pelanggaran standarisasi di atas.');
      } else {
        const msg = err?.response?.data?.message || 'Gagal mengunggah naskah. Periksa kelengkapan dokumen.';
        setSubmitViolations([msg]);
        toast.error(msg);
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handler Tambah Jurnal Baru (Multi-Journal Proof)
  const handleCreateJournal = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/journals`, newJournal);
      toast.success(`Jurnal "${newJournal.abbreviation}" berhasil ditambahkan ke Portal Multi-Journal!`);
      setShowAddJournalModal(false);
      setNewJournal({
        code: '',
        title: '',
        abbreviation: '',
        issn_print: '',
        issn_online: '',
        accreditation: 'SINTA 3',
        chief_editor: '',
        frequency: '2 Kali Setahun (Juni & Desember)',
        accent_color: 'blue',
        description: '',
        focus_scope: ''
      });
      fetchAllData(selectedJournalId);
    } catch (err) {
      toast.error('Gagal menambah jurnal. Pastikan kode unik belum digunakan.');
    }
  };

  // Toggle Checkbox Multi-Reviewer saat Penugasan
  const toggleReviewerSelection = (revId) => {
    const idStr = String(revId);
    setSelectedReviewerIds((prev) =>
      prev.includes(idStr) ? prev.filter((x) => x !== idStr) : [...prev, idStr]
    );
  };

  // Handler Assign Multi-Reviewer (Oleh Editor/Admin)
  const handleAssignReviewer = async (submissionId) => {
    const idsToAssign =
      selectedReviewerIds.length > 0
        ? selectedReviewerIds
        : assignReviewerId
        ? [assignReviewerId]
        : [];
    if (idsToAssign.length === 0) {
      toast.error('Pilih minimal 1 Mitra Bestari (Reviewer) terlebih dahulu!');
      return;
    }
    try {
      const res = await axios.post(`${API_BASE}/submissions/${submissionId}/assign-reviewer`, {
        reviewer_ids: idsToAssign.map(Number),
        editor_notes: editorNotes
      });
      toast.success(res.data?.message || 'Reviewer berhasil ditugaskan!');
      setEditorNotes('');
      setSelectedReviewerIds([]);
      setSelectedSubForAction(res.data?.data || null);
      fetchAllData(selectedJournalId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menugaskan reviewer.');
    }
  };

  // Handler Tambah Reviewer Tambahan saat Naskah Sudah Under Review
  const handleAddExtraReviewer = async (submissionId) => {
    if (!extraReviewerId) {
      toast.error('Pilih Reviewer tambahan terlebih dahulu!');
      return;
    }
    try {
      const res = await axios.post(`${API_BASE}/submissions/${submissionId}/assign-reviewer`, {
        reviewer_ids: [Number(extraReviewerId)],
        editor_notes: editorNotes || undefined
      });
      toast.success(res.data?.message || 'Reviewer tambahan berhasil ditugaskan!');
      setExtraReviewerId('');
      setSelectedSubForAction(res.data?.data || null);
      fetchAllData(selectedJournalId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan reviewer.');
    }
  };

  // Handler Batalkan Penugasan Satu Reviewer
  const handleRemoveReviewer = async (submissionId, reviewerId, reviewerName) => {
    if (!window.confirm(`Batalkan penugasan Reviewer "${reviewerName}" dari naskah ini?`)) return;
    try {
      const res = await axios.delete(`${API_BASE}/submissions/${submissionId}/reviewers/${reviewerId}`);
      toast.success(res.data?.message || 'Penugasan Reviewer dibatalkan.');
      setSelectedSubForAction(res.data?.data || null);
      fetchAllData(selectedJournalId);
    } catch (err) {
      toast.error('Gagal membatalkan penugasan reviewer.');
    }
  };

  // Handler Keputusan Akhir Chief Editor (mis. saat Split Decision antar Reviewer)
  const handleEditorDecision = async (submissionId, decision) => {
    const labelMap = {
      accept: 'MENYETUJUI (Accept)',
      revise: 'MEMINTA REVISI',
      reject: 'MENOLAK (Reject)'
    };
    if (!window.confirm(`Konfirmasi keputusan akhir Dewan Redaksi: ${labelMap[decision]} naskah ini?`)) return;
    try {
      const res = await axios.post(`${API_BASE}/submissions/${submissionId}/editor-decision`, {
        decision,
        editor_notes: editorNotes || undefined
      });
      toast.success(res.data?.message || 'Keputusan akhir Chief Editor berhasil disimpan!');
      setSelectedSubForAction(res.data?.data || null);
      fetchAllData(selectedJournalId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan keputusan akhir editor.');
    }
  };

  // Handler Reviewer Menerima atau Menolak Undangan Review
  const handleRespondReviewInvitation = async (submissionId, action) => {
    if (!currentUser?.id) {
      toast.error('Sesi akun Reviewer tidak valid.');
      return;
    }
    if (action === 'decline' && !declineReason.trim()) {
      toast.error('Harap pilih atau tuliskan alasan penolakan undangan review.');
      return;
    }
    try {
      const res = await axios.post(`${API_BASE}/submissions/${submissionId}/review-response`, {
        reviewer_id: currentUser.id,
        action,
        reason: action === 'decline' ? declineReason.trim() : undefined
      });
      toast.success(res.data?.message || 'Konfirmasi undangan review berhasil disimpan!');
      setShowDeclineForm(false);
      setDeclineReason('');
      setSelectedSubForAction(res.data?.data || null);
      fetchAllData(selectedJournalId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memproses respons undangan review.');
    }
  };

  // Handler Submit Evaluasi Peer-Review (Oleh Reviewer — murni atas nama akun Reviewer yang login)
  const handleSubmitPeerReview = async (submissionId) => {
    if (!currentUser?.id) {
      toast.error('Sesi akun Reviewer tidak valid. Silakan login ulang.');
      return;
    }
    const scores = [
      reviewScores.score_originality,
      reviewScores.score_methodology,
      reviewScores.score_relevance
    ];
    if (scores.some((s) => !Number.isFinite(s) || s < 1 || s > 100)) {
      toast.error('Semua nilai skor penilaian (Orisinalitas, Metodologi, Relevansi) harus antara 1 sampai 100.');
      return;
    }
    if (!reviewScores.comments.trim()) {
      toast.error('Mohon isi catatan evaluasi peer-review terlebih dahulu.');
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/submissions/${submissionId}/review`, {
        ...reviewScores,
        reviewer_id: currentUser.id,
        score_originality: Math.round(reviewScores.score_originality),
        score_methodology: Math.round(reviewScores.score_methodology),
        score_relevance: Math.round(reviewScores.score_relevance),
        comments: reviewScores.comments.trim()
      });
      toast.success(res.data?.message || 'Keputusan & Skor Peer-Review berhasil disimpan!');
      setReviewScores({
        score_originality: 88,
        score_methodology: 85,
        score_relevance: 90,
        comments: '',
        decision: 'accept'
      });
      setSelectedSubForAction(res.data?.data || null);
      fetchAllData(selectedJournalId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan evaluasi review.');
    }
  };

  // Handler Tambah Pengguna Baru (Khusus Admin)
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserForm.name.trim() || !newUserForm.email.trim() || newUserForm.password.length < 6) {
      toast.error('Nama, email, dan kata sandi (minimal 6 karakter) wajib diisi.');
      return;
    }
    try {
      const res = await axios.post(`${API_BASE}/users`, {
        name: newUserForm.name.trim(),
        email: newUserForm.email.trim(),
        password: newUserForm.password,
        role: newUserForm.role,
        affiliation: newUserForm.affiliation.trim(),
        specialty: newUserForm.specialty.trim()
      });
      toast.success(res.data?.message || 'Pengguna baru berhasil ditambahkan!');
      setShowAddUserModal(false);
      setNewUserForm({ name: '', email: '', password: '', role: 'reviewer', affiliation: '', specialty: '' });
      fetchAllData(selectedJournalId);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors ? Object.values(err.response.data.errors).flat()[0] : null) ||
        'Gagal menambah pengguna.';
      toast.error(msg);
    }
  };

  // Handler Hapus Pengguna (Khusus Admin)
  const handleDeleteUser = async (u) => {
    if (String(u.id) === String(currentUser?.id)) {
      toast.error('Anda tidak dapat menghapus akun yang sedang Anda gunakan sendiri.');
      return;
    }
    if (!window.confirm(`Hapus akun pengguna "${u.name}" (${u.email})?`)) return;
    try {
      await axios.delete(`${API_BASE}/users/${u.id}`);
      toast.success(`Akun "${u.name}" berhasil dihapus.`);
      fetchAllData(selectedJournalId);
    } catch (err) {
      toast.error('Gagal menghapus pengguna.');
    }
  };

  // Handler Publish Naskah & Generate DOI (Oleh Editor/Admin)
  const handlePublishArticle = async (submissionId) => {
    try {
      const res = await axios.post(`${API_BASE}/submissions/${submissionId}/publish`);
      toast.success('Artikel resmi diterbitkan ke edisi jurnal beserta Nomor DOI!');
      setSelectedSubForAction(res.data?.data || null);
      fetchAllData(selectedJournalId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menerbitkan artikel.');
    }
  };

  // Data Grafik Pie Status (warna menempel di tiap item agar tidak bergeser saat ada status 0)
  const pieData = [
    { name: 'Pending', value: scopedStats.pending, color: '#f59e0b' },
    { name: 'Under Review', value: scopedStats.under_review, color: '#2563eb' },
    { name: 'Perlu Revisi', value: scopedStats.revision_required, color: '#f97316' },
    { name: 'Accepted', value: scopedStats.accepted, color: '#10b981' },
    { name: 'Published', value: scopedStats.published, color: '#8b5cf6' },
    { name: 'Ditolak', value: scopedStats.rejected, color: '#e11d48' }
  ].filter((d) => d.value > 0);

  // Data Grafik Bar Perbandingan Multi-Jurnal
  const barData = (stats.by_journal || []).map((j) => ({
    name: j.abbreviation,
    Terbit: j.published || 0,
    Proses: j.in_process || 0,
    Total: j.total || 0
  }));

  const activeJournalObj =
    selectedJournalId === 'all'
      ? null
      : journals.find((j) => String(j.id) === String(selectedJournalId));

  const publishedSubmissions = submissions.filter((s) => {
    if (s.status !== 'published') return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.title?.toLowerCase().includes(q) ||
      s.abstract?.toLowerCase().includes(q) ||
      s.keywords?.toLowerCase().includes(q) ||
      s.author?.name?.toLowerCase().includes(q) ||
      s.co_authors?.toLowerCase().includes(q) ||
      s.doi?.toLowerCase().includes(q) ||
      s.journal?.abbreviation?.toLowerCase().includes(q) ||
      s.journal?.title?.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="min-h-screen flex font-sans text-slate-900 relative"
      style={{
        background: 'linear-gradient(145deg, #F9FAFB 0%, #FDF7F7 50%, #F3E9E9 100%)'
      }}
    >
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '999px',
            background: '#4A1313',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 600,
            padding: '10px 18px',
            boxShadow: '0 18px 44px -12px rgba(74, 19, 19, 0.45)'
          }
        }}
      />

      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-[#1a0909]/55 backdrop-blur-sm lg:hidden animate-backdrop-fade"
        />
      )}

      {/* =====================================================================
          SIDEBAR NAVIGASI OJS MULTI-JOURNAL — KEMBARAN KARTU TIRAI LOGIN BRIDA
          ===================================================================== */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[276px] bg-gradient-to-b from-[#7A2222] via-[#661B1B] to-[#4A1313] text-white flex flex-col border-r border-white/[0.1] shadow-[14px_0_48px_-14px_rgba(74,19,19,0.42)] shrink-0 select-none overflow-hidden transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Ambient Rings & Warm Gold Glow (Identik dengan Kartu Gelap Login) */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-[280px] h-[280px] rounded-full border border-white/[0.08]" />
        <div className="pointer-events-none absolute top-[45%] -right-28 w-[320px] h-[320px] rounded-full border border-white/[0.06]" />
        <div
          className="pointer-events-none absolute top-[24%] left-1/2 -translate-x-1/2 w-[260px] h-[260px] rounded-full opacity-18 blur-3xl"
          style={{ background: 'radial-gradient(circle, #FBBF24 0%, transparent 70%)' }}
        />

        {/* Brand Header — Floating White Capsule ala Login */}
        <div className="relative z-10 px-5 py-5 border-b border-white/[0.1] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 bg-white/95 rounded-2xl px-3.5 py-2.5 shadow-[0_12px_28px_rgba(0,0,0,0.28)] ring-1 ring-white/80 flex items-center justify-center transition-transform duration-300 hover:scale-[1.01]">
              <img
                src="/assets/brida-logo.png"
                alt="Logo BRIDA Kota Makassar"
                className="h-9 w-auto object-contain"
              />
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-2 rounded-full text-white/80 hover:bg-white/10 transition cursor-pointer"
              aria-label="Tutup menu"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex items-center justify-between px-1">
            <h1 className="font-bold text-[11px] tracking-[0.14em] uppercase text-white/90">
              OJS BRIDA
            </h1>
            <p className="text-[10px] text-amber-300/90 font-semibold tracking-wider uppercase">
              Multi-Journal
            </p>
          </div>
        </div>

        {/* Multi-Journal Context Switcher — Pill Rounded ala Login */}
        <div className="relative z-10 px-5 pt-4 pb-4 border-b border-white/[0.1]">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60 mb-2 flex items-center gap-1.5">
            <Layers size={12} className="text-amber-300" /> Konteks Jurnal Aktif
          </label>
          <select
            value={selectedJournalId}
            onChange={(e) => setSelectedJournalId(e.target.value)}
            className="w-full bg-white/[0.09] hover:bg-white/[0.14] border border-white/[0.16] rounded-full px-4 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-300/80 transition cursor-pointer"
          >
            <option value="all" className="text-slate-900 font-bold">
              Semua Jurnal ({journals.length} Jurnal)
            </option>
            {journals.map((j) => (
              <option key={j.id} value={j.id} className="text-slate-900 font-semibold">
                {j.abbreviation} — {j.accreditation}
              </option>
            ))}
          </select>
        </div>

        {/* Main Navigation — Pill-Shaped Floating Active Items */}
        <nav className="relative z-10 flex-1 px-3.5 py-4 space-y-1.5 overflow-y-auto">
          <p className="px-3.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
            Navigasi • {currentUser?.label}
          </p>

          <button
            onClick={() => {
              setPortalSelectedJournal(null);
              switchTab('portal');
            }}
            className={`w-full flex items-center justify-between py-2.5 px-4 rounded-full text-[13px] font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer ${
              navTab === 'portal'
                ? 'bg-white text-[#7A2222] shadow-[0_10px_26px_-6px_rgba(0,0,0,0.32)] font-bold translate-x-0.5'
                : 'text-white/80 hover:bg-white/[0.09] hover:text-white hover:translate-x-1'
            }`}
          >
            <span className="flex items-center gap-3">
              <Globe size={16} className={navTab === 'portal' ? 'text-[#7A2222]' : 'text-white/60'} />
              Portal Publik Jurnal
            </span>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold tabular-nums ${
              navTab === 'portal' ? 'bg-[#FEF2F2] text-[#7A2222]' : 'bg-white/12 text-white/85'
            }`}>
              {journals.length}
            </span>
          </button>

          {/* Menu Trending & Forum Riset */}
          <button
            onClick={() => switchTab('trending')}
            className={`w-full flex items-center justify-between py-2.5 px-4 rounded-full text-[13px] font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer ${
              navTab === 'trending'
                ? 'bg-white text-[#7A2222] shadow-[0_10px_26px_-6px_rgba(0,0,0,0.32)] font-bold translate-x-0.5'
                : 'text-white/80 hover:bg-white/[0.09] hover:text-white hover:translate-x-1'
            }`}
          >
            <span className="flex items-center gap-3">
              <Flame size={16} className={navTab === 'trending' ? 'text-amber-600' : 'text-amber-300'} />
              Trending &amp; Forum
            </span>
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold tabular-nums ${
              navTab === 'trending'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-amber-400/20 text-amber-300 border border-amber-300/30'
            }`}>
              {forumThreadCount > 0 ? forumThreadCount : 'HOT'}
            </span>
          </button>

          {!isGuest && (
            <button
              onClick={() => switchTab('dashboard')}
              className={`w-full flex items-center justify-between py-2.5 px-4 rounded-full text-[13px] font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer ${
                navTab === 'dashboard'
                  ? 'bg-white text-[#7A2222] shadow-[0_10px_26px_-6px_rgba(0,0,0,0.32)] font-bold translate-x-0.5'
                  : 'text-white/80 hover:bg-white/[0.09] hover:text-white hover:translate-x-1'
              }`}
            >
              <span className="flex items-center gap-3">
                <LayoutDashboard size={16} className={navTab === 'dashboard' ? 'text-[#7A2222]' : 'text-white/60'} />
                {isAuthor ? 'Dasbor Naskah Saya' : isReviewer ? 'Naskah Tugasan Saya' : 'Dasbor & Analitik'}
              </span>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold tabular-nums ${
                navTab === 'dashboard' ? 'bg-[#FEF2F2] text-[#7A2222]' : 'bg-white/12 text-white/85'
              }`}>
                {scopedStats.total}
              </span>
            </button>
          )}

          {/* Menu Manajemen Multi-Jurnal khusus Admin/Editor */}
          {isAdminOrEditor && (
            <button
              onClick={() => switchTab('journals')}
              className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-full text-[13px] font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer ${
                navTab === 'journals'
                  ? 'bg-white text-[#7A2222] shadow-[0_10px_26px_-6px_rgba(0,0,0,0.32)] font-bold translate-x-0.5'
                  : 'text-white/80 hover:bg-white/[0.09] hover:text-white hover:translate-x-1'
              }`}
            >
              <BookOpen size={16} className={navTab === 'journals' ? 'text-[#7A2222]' : 'text-white/60'} />
              Manajemen Multi-Jurnal
            </button>
          )}

          {/* Menu Manajemen Pengguna khusus Admin/Editor */}
          {isAdminOrEditor && (
            <button
              onClick={() => switchTab('users')}
              className={`w-full flex items-center justify-between py-2.5 px-4 rounded-full text-[13px] font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer ${
                navTab === 'users'
                  ? 'bg-white text-[#7A2222] shadow-[0_10px_26px_-6px_rgba(0,0,0,0.32)] font-bold translate-x-0.5'
                  : 'text-white/80 hover:bg-white/[0.09] hover:text-white hover:translate-x-1'
              }`}
            >
              <span className="flex items-center gap-3">
                <Users size={16} className={navTab === 'users' ? 'text-[#7A2222]' : 'text-white/60'} />
                Manajemen Pengguna
              </span>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold tabular-nums ${
                navTab === 'users' ? 'bg-[#FEF2F2] text-[#7A2222]' : 'bg-white/12 text-white/85'
              }`}>
                {(stats.users || []).length}
              </span>
            </button>
          )}

          {/* Menu Unggah Naskah Baru untuk Author & Admin */}
          {(isAuthor || isAdminOrEditor) && (
            <button
              onClick={() => switchTab('unggah')}
              className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-full text-[13px] font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer ${
                navTab === 'unggah'
                  ? 'bg-white text-[#7A2222] shadow-[0_10px_26px_-6px_rgba(0,0,0,0.32)] font-bold translate-x-0.5'
                  : 'text-white/80 hover:bg-white/[0.09] hover:text-white hover:translate-x-1'
              }`}
            >
              <FileUp size={16} className={navTab === 'unggah' ? 'text-[#7A2222]' : 'text-white/60'} />
              Unggah Naskah Baru
            </button>
          )}

          {/* Menu Evaluasi & Editorial khusus Reviewer & Admin/Editor */}
          {(isReviewer || isAdminOrEditor) && (
            <button
              onClick={() => switchTab('review')}
              className={`w-full flex items-center justify-between py-2.5 px-4 rounded-full text-[13px] font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer ${
                navTab === 'review'
                  ? 'bg-white text-[#7A2222] shadow-[0_10px_26px_-6px_rgba(0,0,0,0.32)] font-bold translate-x-0.5'
                  : 'text-white/80 hover:bg-white/[0.09] hover:text-white hover:translate-x-1'
              }`}
            >
              <span className="flex items-center gap-3">
                <CheckSquare size={16} className={navTab === 'review' ? 'text-[#7A2222]' : 'text-white/60'} />
                {isReviewer ? 'Meja Evaluasi Review' : 'Evaluasi & Editorial'}
              </span>
              {reviewQueueBadgeCount > 0 && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold tabular-nums shadow-xs">
                  {reviewQueueBadgeCount}
                </span>
              )}
            </button>
          )}
        </nav>

        {/* RBAC Role Info Box at Bottom of Sidebar */}
        <div className="relative z-10 p-4 m-3.5 rounded-[24px] bg-white/[0.07] border border-white/[0.12] backdrop-blur-xs text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-300 font-bold text-[11px] tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span>AKSES: {currentUser?.role?.toUpperCase()}</span>
          </div>
          <p className="text-[11px] text-white/75 leading-relaxed">
            {isAdminOrEditor && 'Akses Penuh: Kelola Multi-Jurnal, Pengguna, Multi-Reviewer, & Penerbitan DOI.'}
            {isReviewer && 'Akses Mitra Bestari: Konfirmasi undangan & telaah naskah secara independen.'}
            {isAuthor && 'Akses Penulis: Kirim naskah berstandar SINTA, pantau progress, & unggah revisi.'}
            {isGuest && 'Mode Pengunjung Publik: Jelajahi artikel Open Access & Trending Topik Riset.'}
          </p>
        </div>
      </aside>

      {/* =====================================================================
          MAIN CONTENT AREA
          ===================================================================== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-clip relative">
        {/* TOPBAR HEADER — FROSTED GLASS & PILL CONTROLS ALA LOGIN */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-[#7A2222]/8 px-4 sm:px-8 py-3.5 flex flex-wrap justify-between items-center gap-3 sticky top-0 z-30 shadow-[0_6px_24px_-16px_rgba(74,19,19,0.16)]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-full border border-gray-200 text-[#7A2222] hover:bg-[#FDF7F7] transition cursor-pointer shrink-0"
              aria-label="Buka menu navigasi"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-[#7A2222] tracking-tight">
                  OJS BRIDA
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-0.5 rounded-full bg-[#FEF2F2] text-[#7A2222] border border-[#7A2222]/15">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {activeJournalObj ? activeJournalObj.abbreviation : 'Portal Multi-Journal BRIDA'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 truncate">
                {isGuest ? (
                  <span>Sistem Publikasi Ilmiah Terpadu • Open Access</span>
                ) : (
                  <>
                    <strong className="text-gray-800 font-semibold">{currentUser?.name}</strong>{' '}
                    <span className="hidden sm:inline text-gray-400">({currentUser?.email})</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Authenticated User Pill + Pill-Shaped Maroon Auth Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {!isGuest && (
              <div className="hidden md:flex items-center gap-1.5 bg-[#FDF7F7] px-3.5 py-1.5 rounded-full border border-[#7A2222]/15 text-xs">
                <ShieldCheck size={14} className="text-[#7A2222]" />
                <span className="font-semibold text-[#7A2222]">{currentUser?.label}</span>
              </div>
            )}

            <button
              onClick={onLogout}
              className={`flex items-center gap-1.5 font-bold text-xs px-5 py-2 rounded-full border transition-all duration-300 active:scale-[0.97] cursor-pointer ${
                isGuest
                  ? 'bg-[#7A2222] hover:bg-[#661B1B] text-white border-[#7A2222] shadow-[0_10px_22px_-8px_rgba(122,34,34,0.5)]'
                  : 'bg-white text-gray-700 hover:bg-[#FEF2F2] hover:text-[#7A2222] hover:border-[#7A2222]/40 border-gray-200'
              }`}
            >
              {isGuest ? (
                <>
                  <Lock size={13} /> Masuk
                </>
              ) : (
                <>
                  <LogOut size={13} /> Keluar
                </>
              )}
            </button>
          </div>
          {/* Sleek Maroon-Gold Shimmer Progress Bar saat perpindahan menu */}
          {isTabFading && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2.5px] overflow-hidden">
              <div className="h-full w-full bg-gradient-to-r from-transparent via-[#7A2222] to-[#FBBF24] animate-topbar-sweep" />
            </div>
          )}
        </header>

        {/* SMOOTH IN-PLACE CROSSFADE VIEWPORT (100% GPU OPACITY, 0px GERAK / 0 GETAR) */}
        <div
          className={`flex-1 flex flex-col transition-opacity will-change-[opacity] ${
            isTabFading
              ? 'opacity-0 duration-[160ms] ease-out pointer-events-none'
              : 'opacity-100 duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)]'
          }`}
        >

        {/* ===================================================================
            TAB 1: PORTAL PUBLIK MULTI-JOURNAL — SIGAP BRIDA MAROON EDITION
           =================================================================== */}
        {activeTab === 'portal' && (
          <div className="flex-1 w-full relative overflow-x-hidden pb-24">
            {!portalSelectedJournal ? (
              <>
                {/* HERO BAND MAROON — HARMONISASI DESIGN SYSTEM LOGIN BRIDA */}
                <section className="relative overflow-hidden bg-gradient-to-br from-[#7A2222] via-[#661B1B] to-[#4A1313] border-b border-white/10 text-white px-5 sm:px-10 pt-8 pb-16">
                  {/* Ambient Rings & Warm Gold Glow (Identik dengan Kartu Gelap Login) */}
                  <div className="pointer-events-none absolute -top-28 -right-20 w-[380px] h-[380px] rounded-full border border-white/[0.08]" />
                  <div className="pointer-events-none absolute -bottom-36 -left-24 w-[440px] h-[440px] rounded-full border border-white/[0.06]" />
                  <div
                    className="pointer-events-none absolute top-1/2 left-1/3 -translate-y-1/2 w-[420px] h-[300px] rounded-full opacity-18 blur-3xl"
                    style={{ background: 'radial-gradient(circle, #FBBF24 0%, transparent 70%)' }}
                  />

                  <div className="relative z-10 max-w-[1140px] mx-auto space-y-6">
                    {/* Top Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/15">
                      <div>
                        <h1 className="text-base sm:text-lg font-extrabold tracking-wide uppercase text-white">
                          OJS BRIDA KOTA MAKASSAR
                        </h1>
                        <p className="text-xs text-white/75 mt-0.5">
                          Portal Publikasi &amp; Repositori Jurnal Ilmiah Terpadu Badan Riset dan Inovasi Daerah
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.1] border border-white/15 text-[11px] font-semibold text-white/95 backdrop-blur-xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                          Layanan Aktif
                        </span>
                        {isGuest ? (
                          <button
                            type="button"
                            onClick={onLogout}
                            className="px-5 py-1.5 rounded-full bg-white hover:bg-gray-100 active:scale-[0.98] text-[#7A2222] font-bold text-xs shadow-sm transition cursor-pointer"
                          >
                            Masuk / Daftar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => switchTab('dashboard')}
                            className="px-5 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-gray-900 font-bold text-xs shadow-sm transition cursor-pointer"
                          >
                            Dashboard Saya →
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Split Hero Grid: Kartu Pencarian Putih Rounded-[32px] + Ringkasan & Akses Unggulan */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                      {/* Kartu Kiri: Pencarian Pill-Style & Statistik Ringkas */}
                      <div className="lg:col-span-8 bg-white text-gray-900 rounded-[32px] p-6 sm:p-8 shadow-[0_30px_70px_-20px_rgba(28,10,10,0.48)] border border-white/80 flex flex-col justify-between gap-5">
                        {/* Header Judul */}
                        <div className="space-y-2.5">
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FEF2F2] text-[#7A2222] text-[11px] font-extrabold uppercase tracking-wider border border-[#7A2222]/10">
                            <Search size={12} /> Pencarian Jurnal &amp; Artikel Ilmiah
                          </span>
                          <h2 className="font-serif-editorial text-2xl sm:text-[31px] font-bold text-gray-900 leading-tight">
                            Pusat Publikasi Ilmiah Resmi BRIDA Kota Makassar
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                            Temukan artikel penelitian terakreditasi SINTA, kajian kebijakan berbasis bukti, dan inovasi daerah secara terbuka (<em>Diamond Open Access</em>).
                          </p>
                        </div>

                        {/* Form Pencarian Pill-Style ala Login */}
                        <div className="bg-[#FDF7F7]/90 border border-[#7A2222]/12 rounded-[26px] p-4 sm:p-5 space-y-3.5">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1.5 px-1">
                              Kata Kunci, Judul Artikel, Penulis, atau Nomor DOI
                            </label>
                            <div className="relative">
                              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Contoh: Smart City, Inovasi Daerah, nama penulis, atau 10.31290/..."
                                className="w-full bg-white border border-gray-200 focus:border-[#7A2222] focus:ring-4 focus:ring-[#7A2222]/10 rounded-full pl-11 pr-5 py-3 text-xs sm:text-sm text-gray-800 placeholder-gray-400 outline-none transition"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1 px-1">
                                Filter Jurnal BRIDA
                              </label>
                              <select
                                value={selectedJournalId}
                                onChange={(e) => setSelectedJournalId(e.target.value)}
                                className="w-full bg-white border border-gray-200 focus:border-[#7A2222] focus:ring-4 focus:ring-[#7A2222]/10 rounded-full px-4 py-2.5 text-xs font-semibold text-gray-800 outline-none cursor-pointer transition"
                              >
                                <option value="all">Semua Jurnal ({journals.length} Jurnal Aktif)</option>
                                {journals.map((j) => (
                                  <option key={j.id} value={j.id}>
                                    {j.abbreviation} — {j.accreditation}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1 px-1">
                                Topik Pencarian Cepat
                              </label>
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {['Smart City', 'Inovasi', 'Ekonomi', 'Kesehatan'].map((topic) => (
                                  <button
                                    key={topic}
                                    type="button"
                                    onClick={() => {
                                      setSearchQuery(topic);
                                      const el = document.getElementById('daftar-artikel');
                                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all duration-200 active:scale-95 cursor-pointer ${
                                      searchQuery.toLowerCase() === topic.toLowerCase()
                                        ? 'bg-[#7A2222] text-white border-[#7A2222] shadow-xs'
                                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#7A2222]/50 hover:text-[#7A2222]'
                                    }`}
                                  >
                                    {topic}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Bar Tombol Aksi Pill-Shaped */}
                          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const el = document.getElementById('daftar-artikel');
                                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#7A2222] hover:bg-[#661B1B] active:scale-[0.98] text-white font-bold text-xs shadow-[0_12px_26px_-8px_rgba(122,34,34,0.52)] transition-all cursor-pointer"
                              >
                                <Search size={14} /> Cari Artikel
                              </button>
                              {(searchQuery || selectedJournalId !== 'all') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSearchQuery('');
                                    setSelectedJournalId('all');
                                  }}
                                  className="px-4 py-2.5 rounded-full bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
                                >
                                  Reset
                                </button>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById('daftar-artikel');
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="text-xs font-extrabold text-[#7A2222] hover:underline cursor-pointer"
                            >
                              Semua Artikel Terbit →
                            </button>
                          </div>
                        </div>

                        {/* 4 Ringkasan Statistik Live Portal — Seragam Merah Maroon BRIDA */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <div className="rounded-2xl bg-[#FDF7F7] border border-[#7A2222]/15 px-4 py-3 transition hover:border-[#7A2222]/35 hover:-translate-y-0.5">
                            <div className="text-lg font-extrabold text-[#7A2222] tabular-nums leading-none">
                              {journals.length}
                            </div>
                            <div className="text-[10px] font-bold text-[#7A2222]/75 mt-1">Jurnal Resmi</div>
                          </div>
                          <div className="rounded-2xl bg-[#FDF7F7] border border-[#7A2222]/15 px-4 py-3 transition hover:border-[#7A2222]/35 hover:-translate-y-0.5">
                            <div className="text-lg font-extrabold text-[#7A2222] tabular-nums leading-none">
                              {publishedSubmissions.length}
                            </div>
                            <div className="text-[10px] font-bold text-[#7A2222]/75 mt-1">Artikel Terbit</div>
                          </div>
                          <div className="rounded-2xl bg-[#FDF7F7] border border-[#7A2222]/15 px-4 py-3 transition hover:border-[#7A2222]/35 hover:-translate-y-0.5">
                            <div className="text-lg font-extrabold text-[#7A2222] tabular-nums leading-none">
                              {forumThreadCount}
                            </div>
                            <div className="text-[10px] font-bold text-[#7A2222]/75 mt-1">Diskusi Riset</div>
                          </div>
                          <div className="rounded-2xl bg-[#FDF7F7] border border-[#7A2222]/15 px-4 py-3 transition hover:border-[#7A2222]/35 hover:-translate-y-0.5">
                            <div className="text-lg font-extrabold text-[#7A2222] leading-none">
                              Rp 0
                            </div>
                            <div className="text-[10px] font-bold text-[#7A2222]/75 mt-1">Biaya Publikasi</div>
                          </div>
                        </div>

                        {/* Institutional Trust Bar */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 border-t border-gray-100 text-[11px] font-semibold text-gray-500">
                          <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-emerald-600" /> Diamond Open Access (Rp 0)
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-emerald-600" /> Double-Blind Peer Review
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-emerald-600" /> Standar SINTA &amp; DOI Resmi
                          </span>
                        </div>
                      </div>

                      {/* Kartu Kanan: Ilustrasi + Akses Layanan Unggulan */}
                      <div className="lg:col-span-4 flex flex-col gap-4">
                        <div className="bg-white text-gray-900 rounded-[32px] p-6 shadow-[0_30px_70px_-20px_rgba(28,10,10,0.48)] border border-white/80 flex-1 flex flex-col items-center justify-center text-center space-y-3">
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FEF2F2] text-[#7A2222] text-[10px] font-extrabold uppercase tracking-wider border border-[#7A2222]/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#7A2222]" /> {journals.length} Jurnal Aktif
                          </span>
                          <img
                            src="/assets/hero-books.png"
                            alt="Koleksi Jurnal BRIDA"
                            className="w-32 sm:w-36 object-contain drop-shadow-md transition-transform duration-500 hover:-translate-y-1"
                          />
                          <div>
                            <h3 className="font-serif-editorial text-lg font-bold text-gray-900">
                              Portal OJS Multi-Journal
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                              Publikasi gratis (APC Rp 0) dengan validasi otomatis standar SINTA/ARJUNA.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => (isGuest ? onLogout() : switchTab(isReviewer ? 'review' : 'unggah'))}
                            className="w-full py-3 px-5 rounded-full bg-[#7A2222] hover:bg-[#661B1B] active:scale-[0.98] text-white font-bold text-xs shadow-[0_12px_26px_-8px_rgba(122,34,34,0.52)] transition-all cursor-pointer"
                          >
                            {isGuest ? 'Kirim Naskah / Login →' : isReviewer ? 'Buka Meja Review →' : 'Unggah Naskah Baru →'}
                          </button>
                        </div>

                        {/* Dark Maroon Sub-card "Akses Layanan Unggulan" */}
                        <div className="bg-white/[0.08] backdrop-blur-md border border-white/15 rounded-[26px] p-4 space-y-2.5">
                          <div className="text-xs font-extrabold text-white">Akses Layanan Unggulan</div>
                          <p className="text-[11px] text-white/80 leading-relaxed">
                            Jelajahi topik riset terhangat atau unduh template resmi berstandar SINTA.
                          </p>
                          <div className="grid grid-cols-2 gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleOpenForum('')}
                              className="py-2.5 px-3 rounded-full bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-gray-900 font-extrabold text-[11px] transition cursor-pointer"
                            >
                              Trending &amp; Forum
                            </button>
                            <a
                              href={`${API_BASE}/template-naskah`}
                              className="py-2.5 px-3 rounded-full bg-white hover:bg-gray-100 active:scale-[0.98] text-[#7A2222] font-extrabold text-[11px] text-center transition"
                            >
                              Template SINTA
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="max-w-[1140px] mx-auto px-5 sm:px-10 pt-10 space-y-14">

                {/* SECTION: TRENDING TOPIK & DISKUSI HANGAT */}
                <TrendingPortalWidget apiBase={API_BASE} preloadedData={forumPreview} onOpenForum={handleOpenForum} />

                {/* SECTION: PUSAT PUBLIKASI + INFORMASI JURNAL SPLIT CARD */}
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Left Card */}
                  <div className="lg:col-span-4 card-luxury card-luxury-hover rounded-[32px] p-7 flex flex-col items-center justify-center text-center">
                    <img
                      src="/assets/pusat-books.png"
                      alt="Pusat Publikasi & Riset Inovasi Daerah"
                      className="w-44 sm:w-52 object-contain mb-5 drop-shadow-[0_16px_24px_rgba(74,19,19,0.16)] transition-transform duration-500 hover:-translate-y-1"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-1.5">
                      Ekosistem Publikasi
                    </span>
                    <h3 className="font-serif-editorial text-[#7A2222] font-bold text-xl leading-snug max-w-[240px]">
                      Pusat Publikasi &amp; Riset Inovasi Daerah
                    </h3>
                  </div>

                  {/* Right Split Card — Mirroring Login Split Card */}
                  <div className="lg:col-span-8 card-luxury rounded-[32px] overflow-hidden grid grid-cols-1 md:grid-cols-12">
                    {/* Royal Maroon Left Sidebar */}
                    <div className="md:col-span-4 relative overflow-hidden bg-gradient-to-b from-[#7A2222] via-[#661B1B] to-[#4A1313] text-white p-6 flex flex-col justify-between">
                      <div className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full border border-white/[0.08]" />
                      <div className="relative z-10">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300/90 block mb-1">
                          Profil Redaksi
                        </span>
                        <h3 className="font-serif-editorial font-bold text-xl mb-5 tracking-tight">
                          Informasi Jurnal
                        </h3>
                        <div className="space-y-1.5">
                          {[
                            { key: 'fokus', label: 'Fokus & Ruang Lingkup' },
                            { key: 'peer_review', label: 'Proses Peer Review' },
                            { key: 'dewan_editor', label: 'Dewan Editor' },
                            { key: 'apc', label: 'Kebijakan Akses & APC' },
                          ].map((tab) => (
                            <button
                              key={tab.key}
                              type="button"
                              onClick={() => setActiveInfoTab(tab.key)}
                              className={`w-full text-left px-4 py-2.5 rounded-full text-xs transition-all duration-300 ease-out cursor-pointer ${
                                activeInfoTab === tab.key
                                  ? 'bg-white text-[#7A2222] font-bold shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3)] translate-x-0.5'
                                  : 'text-white/80 hover:bg-white/[0.1] hover:text-white font-medium hover:translate-x-1'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="relative z-10 mt-6 pt-4 border-t border-white/15 text-[11px] text-white/75">
                        {activeJournalObj ? (
                          <>
                            <div className="font-bold text-white">{activeJournalObj.abbreviation}</div>
                            <div>e-ISSN: {activeJournalObj.issn_online} • {activeJournalObj.accreditation}</div>
                          </>
                        ) : (
                          <>
                            <div className="font-bold text-white">Jurnal SINTESA</div>
                            <div>BRIDA Kota Makassar • SINTA Terakreditasi</div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* White Right Content Box with Smooth Blur-Morph on Tab Switch */}
                    <div className="md:col-span-8 p-6 sm:p-8 flex flex-col justify-center bg-white">
                      {activeInfoTab === 'fokus' && (
                        <div key="info-fokus" className="animate-blur-morph">
                          <h3 className="text-[#7A2222] font-extrabold text-xl sm:text-2xl mb-3">
                            Fokus &amp; Ruang Lingkup
                          </h3>
                          {activeJournalObj ? (
                            <>
                              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-3.5">
                                <strong className="text-slate-800">
                                  "{activeJournalObj.title} ({activeJournalObj.abbreviation})"
                                </strong>{' '}
                                {activeJournalObj.description}
                              </p>
                              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                                Kami menerima naskah penelitian orisinal dan kajian analitis di bidang:{' '}
                                <strong className="text-slate-800">{activeJournalObj.focus_scope}.</strong>
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-3.5">
                                <strong className="text-slate-800">
                                  "Jurnal SINTESA (Sains, Inovasi, dan Teknologi Daerah)"
                                </strong>{' '}
                                adalah wadah publikasi ilmiah resmi yang dikelola oleh Badan Riset dan Inovasi Daerah (BRIDA) Kota Makassar.
                              </p>
                              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                                Menerima naskah penelitian orisinal di bidang:{' '}
                                <strong className="text-slate-800">
                                  Kebijakan Publik, Tata Kelola Smart City, Ketahanan Pangan, dan Inovasi Teknologi Tepat Guna.
                                </strong>
                              </p>
                            </>
                          )}
                        </div>
                      )}

                      {activeInfoTab === 'peer_review' && (
                        <div key="info-peer" className="animate-blur-morph">
                          <h3 className="text-[#7A2222] font-extrabold text-xl sm:text-2xl mb-3">
                            Proses Peer Review
                          </h3>
                          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-3">
                            Setiap naskah yang masuk ke sistem OJS BRIDA melalui tahapan seleksi awal (Pre-Review) oleh Dewan Editor untuk memeriksa kesesuaian fokus ruang lingkup dan tingkat kemiripan (uji plagiarisme).
                          </p>
                          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                            Naskah kemudian dinilai secara <strong className="text-slate-800">Double-Blind Peer Review</strong> oleh minimal 2 (dua) Mitra Bestari (Reviewer) independen sebelum keputusan akhir diterbitkan.
                          </p>
                        </div>
                      )}

                      {activeInfoTab === 'dewan_editor' && (
                        <div key="info-editor" className="animate-blur-morph">
                          <h3 className="text-[#7A2222] font-extrabold text-xl sm:text-2xl mb-3">
                            Dewan Editor
                          </h3>
                          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-2">
                            Dewan editor bertanggung jawab memastikan kualitas naskah melalui proses evaluasi ilmiah yang adil dan profesional:
                          </p>
                          <ul className="text-xs sm:text-sm text-slate-700 space-y-1.5 list-disc pl-5">
                            <li><strong>Editor in Chief:</strong> Dr. Ir. Budi Santoso, M.Kom (Universitas Indonesia)</li>
                            <li><strong>Managing Editor:</strong> Dr. Siti Aminah, M.Sc (Institut Teknologi Bandung)</li>
                            <li><strong>Editor Associate:</strong> Dr. Hendra Wijaya, Ph.D (Universitas Gadjah Mada)</li>
                            <li><strong>Editor Associate:</strong> Dr. Rina Fitriani, M.Kom (Universitas Airlangga)</li>
                          </ul>
                        </div>
                      )}

                      {activeInfoTab === 'apc' && (
                        <div key="info-apc" className="animate-blur-morph">
                          <h3 className="text-[#7A2222] font-extrabold text-xl sm:text-2xl mb-3">
                            Kebijakan Akses &amp; APC
                          </h3>
                          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-3">
                            Seluruh jurnal menerapkan kebijakan <strong className="text-slate-800">Diamond Open Access (CC BY-SA 4.0)</strong> di mana masyarakat, akademisi, dan pemangku kebijakan dapat membaca dan mengunduh PDF artikel secara gratis.
                          </p>
                          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                            <strong className="text-slate-800">Biaya Publikasi (APC): Rp 0 (Gratis)</strong> — didanai sepenuhnya oleh Badan Riset dan Inovasi Daerah (BRIDA) Kota Makassar.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* SECTION: 5-STEP ALUR PENERBITAN NASKAH */}
                <section className="card-luxury rounded-[28px] px-6 sm:px-10 py-10 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 block mb-2">
                    Standar Publikasi OJS
                  </span>
                  <h2 className="font-serif-editorial text-[#7A2222] font-bold text-2xl sm:text-3xl tracking-tight mb-10">
                    Alur Penerbitan Naskah Ilmiah
                  </h2>

                  <div className="max-w-[920px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-0 px-2">
                    {[
                      {
                        label: 'Submission',
                        sub: 'Validasi SINTA',
                        icon: <FileUp size={24} className="text-white" />
                      },
                      {
                        label: 'Pre-Review',
                        sub: 'Seleksi Editor',
                        icon: <BookOpen size={24} className="text-white" />
                      },
                      {
                        label: 'Peer Review',
                        sub: 'Double-Blind',
                        icon: <CheckSquare size={24} className="text-white" />
                      },
                      {
                        label: 'Revisi',
                        sub: 'Penyempurnaan',
                        icon: <RefreshCw size={24} className="text-white" />
                      },
                      {
                        label: 'Terbit & DOI',
                        sub: 'Open Access',
                        icon: <CheckCircle2 size={24} className="text-white" />
                      },
                    ].map((step, idx, arr) => (
                      <React.Fragment key={step.label}>
                        <div className="flex flex-col items-center group">
                          <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-[#7A2222] to-[#7A2222] ring-4 ring-slate-100 shadow-[0_12px_26px_-8px_rgba(12,32,61,0.35)] flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1">
                            {step.icon}
                            <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white text-[#7A2222] border border-slate-200 text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                              {idx + 1}
                            </span>
                          </div>
                          <span className="mt-3.5 text-xs sm:text-sm font-bold text-[#7A2222]">
                            {step.label}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                            {step.sub}
                          </span>
                        </div>
                        {idx < arr.length - 1 && (
                          <div className="hidden sm:block flex-1 border-t border-dashed border-slate-300 mx-3 -mt-9" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </section>

                {/* SECTION: TERBITAN TERKINI (CURRENT ISSUE) */}
                <section id="daftar-artikel" className="space-y-6">
                  {/* Editorial Section Header */}
                  <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 block mb-1">
                        Publikasi Terkini • Open Access
                      </span>
                      <h2 className="font-serif-editorial text-[#7A2222] font-bold text-2xl sm:text-3xl tracking-tight">
                        Terbitan Terkini (Current Issue)
                      </h2>
                      <p className="text-slate-500 text-xs sm:text-sm mt-1">
                        Koleksi artikel ilmiah resmi yang telah melalui penelaahan sejawat &amp; ber-DOI aktif.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7A2222] bg-white px-4 py-2 rounded-full border border-slate-200 shadow-2xs">
                      <BookOpen size={13} /> {publishedSubmissions.length} Artikel Resmi Terbit
                    </span>
                  </div>

                  {/* Cards Grid */}
                  {publishedSubmissions.length === 0 ? (
                    <div className="card-luxury rounded-[24px] p-12 text-center">
                      <p className="text-sm font-semibold text-slate-600">
                        Tidak ditemukan artikel terbit yang cocok dengan pencarian Anda.
                      </p>
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="mt-3 px-4 py-2 rounded-full bg-[#7A2222] text-white text-xs font-semibold cursor-pointer"
                        >
                          Reset Pencarian
                        </button>
                      )}
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {publishedSubmissions.map((sub) => {
                      const coverTheme = JOURNAL_THEME[sub.journal?.accent_color] || JOURNAL_THEME.blue;
                      return (
                      <div
                        key={sub.id}
                        className="card-luxury card-luxury-hover rounded-[24px] p-5 flex flex-col justify-between"
                      >
                        <div>
                          {/* Bespoke Editorial Academic Journal Cover — Solid BRIDA Maroon */}
                          <div
                            onClick={() => setDetailSubmission(sub)}
                            className={`w-full h-44 rounded-[18px] ${coverTheme.bgHeader} mb-4 relative overflow-hidden cursor-pointer group p-4 flex flex-col justify-between text-white shadow-inner`}
                          >
                            {/* Decorative subtle editorial lines */}
                            <div className="pointer-events-none absolute -right-10 -top-10 w-36 h-36 rounded-full bg-white/[0.06]" />
                            <div className="pointer-events-none absolute -left-8 -bottom-12 w-32 h-32 rounded-full bg-white/[0.04]" />

                            <div className="relative z-10 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold tracking-[0.14em] uppercase px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 backdrop-blur-xs">
                                {sub.journal?.abbreviation || 'J-SINTESA'}
                              </span>
                              <span className="text-[10px] font-semibold text-amber-200/95">
                                {sub.journal?.accreditation || 'SINTA 2'}
                              </span>
                            </div>

                            <div className="relative z-10 space-y-1.5">
                              <div className="w-8 h-0.5 bg-amber-300/80 rounded-full" />
                              <div className="font-serif-editorial text-sm font-bold leading-snug line-clamp-2 text-white/95 group-hover:text-white transition">
                                {sub.title}
                              </div>
                              <div className="text-[10px] text-blue-100/75 flex items-center justify-between pt-0.5">
                                <span className="truncate">{sub.issue ? `${sub.issue.volume} ${sub.issue.number} (${sub.issue.year})` : 'Open Access Article'}</span>
                                <span className="font-semibold text-white/90 group-hover:translate-x-0.5 transition">Baca →</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[#7A2222] font-bold text-[10px] border border-slate-200/80">
                              {sub.journal?.abbreviation || 'J-SINTESA'}
                            </span>
                            {sub.doi && (
                              <span className="text-[10px] font-mono text-slate-400 truncate">
                                {sub.doi}
                              </span>
                            )}
                          </div>

                          <h3
                            onClick={() => setDetailSubmission(sub)}
                            className="text-slate-900 font-bold text-[15px] leading-snug cursor-pointer hover:text-[#661B1B] line-clamp-2 transition"
                          >
                            {sub.title}
                          </h3>
                          <p className="text-slate-500 text-xs mt-1.5 line-clamp-1">
                            {sub.author?.name || 'Penerbit'}
                            {sub.co_authors ? `, ${sub.co_authors}` : ''}
                          </p>
                        </div>

                        {/* Bottom Action Bar */}
                        <div className="mt-5 flex items-center justify-between pt-3.5 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setDetailSubmission(sub)}
                            className="text-xs font-semibold text-slate-500 hover:text-[#7A2222] transition cursor-pointer"
                          >
                            Detail Abstrak
                          </button>
                          {sub.file_path && (
                            <a
                              href={resolveFileUrl(sub.file_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#7A2222] hover:bg-[#661B1B] text-white font-semibold text-xs shadow-xs transition"
                            >
                              <FileText size={12} /> Baca PDF
                            </a>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                  )}
                </section>

                {/* SECTION: KATALOG MULTI-JURNAL BRIDA */}
                <section className="space-y-6 pt-4">
                  <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 block mb-1">
                        Direktori Resmi
                      </span>
                      <h3 className="font-serif-editorial text-2xl sm:text-3xl font-bold text-[#7A2222] tracking-tight">
                        Katalog Jurnal Ilmiah BRIDA ({journals.length} Jurnal)
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Jelajahi seluruh jurnal ilmiah resmi yang dinaungi dalam ekosistem Portal OJS BRIDA Kota Makassar.
                      </p>
                    </div>

                    {isAdminOrEditor && (
                      <button
                        onClick={() => setShowAddJournalModal(true)}
                        className="flex items-center gap-2 bg-[#7A2222] hover:bg-[#661B1B] text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-sm transition cursor-pointer"
                      >
                        <PlusCircle size={15} /> Tambah Jurnal Baru
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    {journals.map((j) => {
                      const theme = JOURNAL_THEME[j.accent_color] || JOURNAL_THEME.blue;
                      const currentIssue = j.issues?.find((i) => i.is_current) || j.issues?.[0];
                      return (
                        <div
                          key={j.id}
                          className="card-luxury card-luxury-hover rounded-[28px] overflow-hidden flex flex-col group"
                        >
                          {/* Header Solid Merah Maroon dengan Tinggi Seragam Kiri & Kanan */}
                          <div className={`${theme.bgHeader} p-6 text-white min-h-[178px] flex flex-col justify-between gap-3`}>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-extrabold uppercase tracking-wider bg-black/20 px-3 py-1 rounded-full border border-white/20">
                                  {j.abbreviation}
                                </span>
                                <span className="text-xs font-extrabold bg-amber-400 text-slate-950 px-3 py-1 rounded-full flex items-center gap-1 shadow-xs shrink-0">
                                  <Award size={13} /> Terakreditasi {j.accreditation}
                                </span>
                              </div>
                              <h4 className="text-lg font-extrabold leading-snug line-clamp-2 min-h-[3.1rem] group-hover:underline">
                                {j.title}
                              </h4>
                            </div>

                            <div className="pt-2 border-t border-white/15 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-white/85 font-medium">
                              <span>P-ISSN: {j.issn_print} • E-ISSN: {j.issn_online}</span>
                              <span className="text-white/75">{j.frequency}</span>
                            </div>
                          </div>

                          {/* Badan Kartu Sejajar Simetris */}
                          <div className="flex-1 p-6 flex flex-col justify-between gap-4">
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                              {j.description}
                            </p>
                            <div className="bg-[#FDF7F7] p-4 rounded-2xl border border-[#7A2222]/15 text-xs space-y-1.5">
                              <div className="line-clamp-2">
                                <strong className="text-slate-800">Fokus &amp; Ruang Lingkup:</strong>{' '}
                                <span className="text-slate-600">{j.focus_scope}</span>
                              </div>
                              <div className="truncate">
                                <strong className="text-slate-800">Ketua Dewan Redaksi:</strong>{' '}
                                <span className="text-slate-600">{j.chief_editor}</span>
                              </div>
                              {currentIssue && (
                                <div className="text-[#7A2222] font-bold pt-1 line-clamp-2">
                                  📌 Terbitan Terkini: {currentIssue.volume} {currentIssue.number} ({currentIssue.year}) — {currentIssue.title}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                              <span>📄 {j.submissions_count || 0} Naskah</span>
                              <span className="text-[#7A2222]">✅ {j.published_count || 0} Terbit</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {!isReviewer && !isGuest && (
                                <button
                                  onClick={() => {
                                    setFormJournalId(String(j.id));
                                    switchTab('unggah');
                                    toast.success(`Jurnal tujuan disetel ke: ${j.abbreviation}`);
                                  }}
                                  className="px-4 py-2 rounded-full border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
                                >
                                  + Submit
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedJournalId(j.id);
                                  setPortalSelectedJournal(j);
                                }}
                                className={`px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-[0.98] cursor-pointer ${theme.btn}`}
                              >
                                Kunjungi Jurnal <ChevronRight size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* BOTTOM CTA BANNER ALA SIGAP BRIDA KOTA MAKASSAR */}
                <section className="rounded-3xl bg-gradient-to-r from-[#7A2222] via-[#661B1B] to-[#4A1313] p-7 sm:p-9 text-white shadow-[0_18px_40px_-14px_rgba(74,19,19,0.4)] flex flex-wrap items-center justify-between gap-6">
                  <div className="space-y-1.5 max-w-xl">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300">
                      Publikasi Terbuka • APC Rp 0
                    </span>
                    <h3 className="font-serif-editorial text-2xl sm:text-3xl font-bold tracking-tight">
                      Siap mempublikasikan riset Anda bersama BRIDA Makassar?
                    </h3>
                    <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                      Daftarkan akun peneliti atau mitra bestari secara gratis dan nikmati proses peer-review transparan berstandar SINTA &amp; DOI resmi.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => (isGuest ? onLogout() : setActiveTab(isReviewer ? 'review' : 'unggah'))}
                      className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-gray-900 font-extrabold text-xs sm:text-sm shadow-sm transition cursor-pointer"
                    >
                      {isGuest ? 'Mulai Daftar / Masuk →' : isReviewer ? 'Buka Meja Review →' : '+ Unggah Naskah Sekarang'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenForum('')}
                      className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold text-xs sm:text-sm transition cursor-pointer"
                    >
                      Buka Trending &amp; Forum
                    </button>
                  </div>
                </section>
              </div>
              </>
            ) : (
              /* TAMPILAN HALAMAN SPESIFIK 1 JURNAL */
              <div className="max-w-[1140px] mx-auto px-5 sm:px-10 pt-8 space-y-6">
                <button
                  onClick={() => {
                    setPortalSelectedJournal(null);
                    setSelectedJournalId('all');
                  }}
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#7A2222] bg-white hover:bg-[#FDF7F7] px-5 py-2.5 rounded-full border border-[#7A2222]/20 shadow-sm transition cursor-pointer"
                >
                  ← Kembali ke Katalog Rumah Jurnal BRIDA
                </button>

                <div className="card-luxury rounded-[32px] overflow-hidden">
                  <div className={`${(JOURNAL_THEME[portalSelectedJournal.accent_color] || JOURNAL_THEME.blue).bgHeader} p-8 text-white`}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-2 max-w-3xl">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-black/25 border border-white/20">
                            {portalSelectedJournal.abbreviation}
                          </span>
                          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-400 text-slate-950">
                            Terakreditasi {portalSelectedJournal.accreditation}
                          </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-extrabold">
                          {portalSelectedJournal.title}
                        </h2>
                        <p className="text-sm text-white/90 leading-relaxed">
                          {portalSelectedJournal.description}
                        </p>
                      </div>

                      {!isReviewer && !isGuest && (
                        <button
                          onClick={() => {
                            setFormJournalId(String(portalSelectedJournal.id));
                            setActiveTab('unggah');
                          }}
                          className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 transition cursor-pointer shrink-0"
                        >
                          <FileUp size={16} /> Submit Naskah ke {portalSelectedJournal.abbreviation}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/15 text-xs">
                      <div>
                        <span className="text-white/70 block">Print ISSN</span>
                        <strong className="text-sm">{portalSelectedJournal.issn_print}</strong>
                      </div>
                      <div>
                        <span className="text-white/70 block">Online E-ISSN</span>
                        <strong className="text-sm">{portalSelectedJournal.issn_online}</strong>
                      </div>
                      <div>
                        <span className="text-white/70 block">Ketua Dewan Redaksi</span>
                        <strong className="text-sm">{portalSelectedJournal.chief_editor}</strong>
                      </div>
                      <div>
                        <span className="text-white/70 block">Frekuensi Terbitan</span>
                        <strong className="text-sm">{portalSelectedJournal.frequency}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 space-y-6">
                    <h3 className="text-lg font-extrabold text-slate-800 border-b border-slate-100 pb-3">
                      Daftar Artikel Terbit pada {portalSelectedJournal.title}
                    </h3>

                    {submissions.filter((s) => s.journal_id === portalSelectedJournal.id && (isAdminOrEditor ? true : s.status === 'published')).length === 0 ? (
                      <p className="text-sm text-slate-500 italic py-8 text-center">
                        Belum ada artikel yang diterbitkan pada jurnal ini.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {submissions
                          .filter((s) => s.journal_id === portalSelectedJournal.id && (isAdminOrEditor ? true : s.status === 'published'))
                          .map((art) => (
                            <div key={art.id} className="py-5 flex flex-col md:flex-row justify-between gap-4">
                              <div className="space-y-2 max-w-3xl">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${(STATUS_BADGE[art.status] || STATUS_BADGE.pending).bg}`}>
                                    {(STATUS_BADGE[art.status] || STATUS_BADGE.pending).label}
                                  </span>
                                  <span className="text-xs text-slate-500 font-semibold">{art.section}</span>
                                  {art.doi && (
                                    <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                      DOI: {art.doi}
                                    </span>
                                  )}
                                </div>
                                <h4
                                  onClick={() => setDetailSubmission(art)}
                                  className="text-base font-bold text-slate-800 hover:text-[#7A2222] cursor-pointer"
                                >
                                  {art.title}
                                </h4>
                                <p className="text-xs text-slate-600">
                                  Penulis: <strong>{art.author?.name}</strong>
                                  {art.co_authors ? `, ${art.co_authors}` : ''}
                                </p>
                                <p className="text-xs text-slate-500 leading-relaxed">{art.abstract}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {art.file_path && (
                                  <a
                                    href={resolveFileUrl(art.file_path)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 rounded-xl bg-[#7A2222] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#661B1B] transition"
                                  >
                                    <FileText size={14} /> Lihat PDF
                                  </a>
                                )}
                                <button
                                  onClick={() => setDetailSubmission(art)}
                                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                                >
                                  Detail
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            TAB 1B: TRENDING TOPIK & FORUM DISKUSI ALA THREADS / X (SEMUA ROLE & PUBLIK)
           =================================================================== */}
        {activeTab === 'trending' && (
          <ForumTrending
            apiBase={API_BASE}
            storageBase={STORAGE_BASE}
            currentUser={currentUser}
            isGuest={isGuest}
            isAdminOrEditor={isAdminOrEditor}
            journals={journals}
            selectedJournalId={selectedJournalId}
            initialTag={forumInitialTag}
            onClearInitialTag={() => setForumInitialTag('')}
            onRequireLogin={onLogout}
            onThreadCountChange={setForumThreadCount}
            onOpenArticleDetail={(art) => setDetailSubmission(art)}
            onGoToSubmit={() => switchTab('unggah')}
          />
        )}

        {/* ===================================================================
            TAB 2: DASBOR EKSEKUTIF & ANALITIK MULTI-JOURNAL
           =================================================================== */}
        {activeTab === 'dashboard' && !isGuest && (
          <div className="p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
            {/* Kartu Metrik Eksekutif — Floating Rounded-[28px] ala Login */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="card-luxury card-luxury-hover p-6 rounded-[28px]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {isAuthor ? 'Naskah Saya' : isReviewer ? 'Tugas Review Saya' : 'Total Naskah'}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-[#FEF2F2] text-[#7A2222] flex items-center justify-center border border-[#7A2222]/10">
                    <FileText size={17} />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-[#7A2222] mt-3 tabular-nums tracking-tight">
                  {scopedStats.total}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Tersebar di {stats.journals_count || journals.length} Jurnal BRIDA
                </p>
              </div>

              <div className="card-luxury card-luxury-hover p-6 rounded-[28px]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Dalam Proses Review
                  </span>
                  <div className="w-10 h-10 rounded-full bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200/70">
                    <Clock size={17} />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-sky-700 mt-3 tabular-nums tracking-tight">
                  {scopedStats.pending + scopedStats.under_review + scopedStats.revision_required}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {scopedStats.pending} Pending • {scopedStats.under_review} Direview • {scopedStats.revision_required} Revisi
                </p>
              </div>

              <div className="card-luxury card-luxury-hover p-6 rounded-[28px]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Disetujui (Accepted)
                  </span>
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/70">
                    <CheckCircle2 size={17} />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-emerald-700 mt-3 tabular-nums tracking-tight">
                  {scopedStats.accepted}
                </p>
                <p className="text-xs text-slate-400 mt-1">Siap diterbitkan ke Nomor Issue</p>
              </div>

              <div className="card-luxury card-luxury-hover p-6 rounded-[28px]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Resmi Terbit
                  </span>
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200/70">
                    <Award size={17} />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-indigo-700 mt-3 tabular-nums tracking-tight">
                  {scopedStats.published}
                </p>
                <p className="text-xs text-slate-400 mt-1">Lengkap dengan registrasi DOI</p>
              </div>
            </div>

            {/* Grafik Analitik: BarChart Multi-Jurnal & PieChart Status */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 card-luxury p-6 rounded-[28px]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
                      Perbandingan Produktivitas Antar-Jurnal (Multi-Journal Analytics)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Sebaran jumlah artikel terbit dan naskah dalam proses evaluasi per jurnal
                    </p>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Terbit" fill="#7A2222" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="Proses" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-5 card-luxury p-6 rounded-[28px] flex flex-col justify-between">
                <div className="mb-2 pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
                    Distribusi Status Naskah
                  </h3>
                  <p className="text-xs text-slate-400">
                    Persentase alur editorial secara real-time
                  </p>
                </div>
                <div className="h-64 flex items-center justify-center">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {pieData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Belum ada data statistik</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tabel Daftar Naskah Multi-Journal */}
            <section className="card-luxury rounded-[28px] p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">
                    {isAuthor ? 'Pelacakan Status Naskah Saya' : 'Manajemen Naskah Lintas Jurnal'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Menampilkan {filteredSubmissions.length} naskah ilmiah
                  </p>
                </div>

                {/* Filter Bar Pill-Style */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari judul, penulis, DOI..."
                      className="pl-10 pr-4 py-2 rounded-full border border-slate-200 text-xs focus:outline-none focus:border-[#7A2222] focus:ring-4 focus:ring-[#7A2222]/10 w-60 transition"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#7A2222]"
                  >
                    <option value="all">Semua Status ({roleScopedSubmissions.length})</option>
                    <option value="pending">Menunggu Editor</option>
                    <option value="under_review">Sedang Direview</option>
                    <option value="revision_required">Perlu Revisi</option>
                    <option value="accepted">Disetujui (Accepted)</option>
                    <option value="published">Resmi Terbit (Published)</option>
                    <option value="rejected">Ditolak (Rejected)</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FDF7F7] text-slate-700 font-extrabold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3">ID</th>
                      <th className="p-3">Jurnal Tujuan</th>
                      <th className="p-3">Judul Naskah &amp; Penulis</th>
                      <th className="p-3">Status Alur</th>
                      <th className="p-3">Dokumen PDF</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                          {isAuthor
                            ? 'Anda belum memiliki naskah yang cocok dengan filter ini. Klik "+ Unggah Naskah Baru" untuk mengirim naskah.'
                            : isReviewer
                            ? 'Belum ada naskah yang ditugaskan kepada akun Mitra Bestari Anda.'
                            : 'Tidak ada naskah yang sesuai dengan filter.'}
                        </td>
                      </tr>
                    ) : (
                    filteredSubmissions.map((sub) => {
                      const badge = STATUS_BADGE[sub.status] || STATUS_BADGE.pending;
                      const isOwnSubmission = isAuthor && String(sub.author_id) === String(currentUser?.id);
                      const myRev = isReviewer
                        ? (sub.reviews || []).find((r) => String(r.reviewer_id) === String(currentUser?.id))
                        : null;
                      const prog = getSubmissionProgressMeta(sub);
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-3 font-mono font-bold text-slate-500">#{sub.id}</td>
                          <td className="p-3">
                            <span className="font-extrabold text-[11px] px-2.5 py-1 rounded-md bg-[#FEF2F2] text-[#7A2222] border border-blue-200">
                              {sub.journal?.abbreviation}
                            </span>
                          </td>
                          <td className="p-3 max-w-md">
                            <div
                              onClick={() => setDetailSubmission(sub)}
                              className="font-bold text-slate-800 hover:text-[#7A2222] cursor-pointer"
                            >
                              {sub.title}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Penulis: {sub.author?.name || 'Penulis'}
                              {sub.co_authors ? `, ${sub.co_authors}` : ''}
                            </div>
                          </td>
                          <td className="p-3 min-w-[180px]">
                            {isReviewer && myRev ? (
                              <div className="space-y-1">
                                <span className={`inline-block text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                                  myRev.status === 'assigned'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : myRev.status === 'in_progress'
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : myRev.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}>
                                  {myRev.status === 'assigned'
                                    ? '📩 UNDANGAN BARU'
                                    : myRev.status === 'in_progress'
                                    ? '📝 SEDANG ANDA TELAAH'
                                    : myRev.status === 'completed'
                                    ? '✅ BERHASIL ANDA REVIEW'
                                    : '🚫 ANDA MENOLAK REVIEW'}
                                </span>
                                <div className="text-[10px] text-slate-400">
                                  Status Naskah: {badge.label}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                                    {badge.label}
                                  </span>
                                  <span className="text-[10px] font-extrabold text-slate-500">
                                    {sub.status === 'rejected' ? '✕' : `${prog.percent}%`}
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${prog.barColor}`} style={{ width: `${prog.percent}%` }} />
                                </div>
                                {sub.reviews && sub.reviews.length > 0 && (
                                  <div className="text-[10px] text-slate-500 flex flex-wrap gap-1.5">
                                    <span>Reviewer: {prog.completedRevs.length}/{prog.activeRevs.length} selesai</span>
                                    {prog.declinedRevs.length > 0 && (
                                      <span className="text-rose-600 font-bold">• ⚠ {prog.declinedRevs.length} menolak</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            {sub.file_path && !(isReviewer && myRev && (myRev.status === 'assigned' || myRev.status === 'declined')) ? (
                              <a
                                href={resolveFileUrl(sub.file_path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#7A2222] font-bold text-[11px] border border-blue-200"
                              >
                                <FileText size={13} /> Dokumen
                              </a>
                            ) : isReviewer && myRev?.status === 'assigned' ? (
                              <span className="text-amber-600 italic text-[11px] font-semibold">Terima undangan dulu</span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>
                          <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                            {isAdminOrEditor && sub.status === 'pending' && (
                              <button
                                onClick={() => {
                                  setSelectedSubForAction(sub);
                                  setActiveTab('review');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#7A2222] text-white font-bold text-[11px] hover:bg-[#661B1B] cursor-pointer"
                              >
                                Tugaskan Reviewer
                              </button>
                            )}

                            {isAdminOrEditor && sub.status === 'accepted' && (
                              <button
                                onClick={() => handlePublishArticle(sub.id)}
                                className="px-2.5 py-1 rounded-lg bg-purple-700 text-white font-bold text-[11px] hover:bg-purple-800 cursor-pointer"
                              >
                                Terbitkan + DOI
                              </button>
                            )}

                            {isOwnSubmission && sub.status === 'revision_required' && (
                              <button
                                onClick={() => setDetailSubmission(sub)}
                                className="px-2.5 py-1 rounded-lg bg-orange-600 text-white font-bold text-[11px] hover:bg-orange-700 cursor-pointer"
                              >
                                📤 Unggah Revisi
                              </button>
                            )}

                            {isReviewer && sub.status === 'under_review' && myRev && myRev.status === 'assigned' && (
                              <button
                                onClick={() => {
                                  setSelectedSubForAction(sub);
                                  setShowDeclineForm(false);
                                  setActiveTab('review');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 cursor-pointer"
                              >
                                📩 Konfirmasi Undangan
                              </button>
                            )}

                            {isReviewer && sub.status === 'under_review' && myRev && myRev.status === 'in_progress' && (
                              <button
                                onClick={() => {
                                  setSelectedSubForAction(sub);
                                  setShowDeclineForm(false);
                                  setActiveTab('review');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-bold text-[11px] hover:bg-emerald-800 cursor-pointer"
                              >
                                Beri Skor Review
                              </button>
                            )}

                            <button
                              onClick={() => setDetailSubmission(sub)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-slate-700 cursor-pointer"
                            >
                              Detail
                            </button>

                            {(isAdminOrEditor || isOwnSubmission) && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(sub)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-[11px] font-bold text-[#7A2222] cursor-pointer"
                                title="Edit Judul, Penulis & Abstrak"
                              >
                                <Edit3 size={11} /> Edit
                              </button>
                            )}

                            {(isAdminOrEditor || (isOwnSubmission && sub.status === 'pending')) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSubmission(sub)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-[11px] font-bold text-rose-600 cursor-pointer"
                                title="Hapus / Tarik Naskah"
                              >
                                <Trash2 size={11} /> Hapus
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ===================================================================
            TAB 3: MANAJEMEN MULTI-JURNAL (ADMIN/EDITOR)
           =================================================================== */}
        {activeTab === 'journals' && isAdminOrEditor && (
          <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-extrabold text-slate-800">
                  Manajemen Multi-Jurnal OJS BRIDA
                </h3>
                <p className="text-xs text-slate-500">
                  Kelola identitas, dewan redaksi, dan konfigurasi seluruh jurnal ilmiah resmi.
                </p>
              </div>

              <button
                onClick={() => setShowAddJournalModal(true)}
                className="flex items-center gap-2 bg-[#7A2222] hover:bg-[#661B1B] active:scale-[0.98] text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-[0_12px_26px_-8px_rgba(122,34,34,0.52)] transition cursor-pointer"
              >
                <PlusCircle size={16} /> + Tambah Jurnal Baru
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {journals.map((j) => (
                <div key={j.id} className="card-luxury card-luxury-hover rounded-[28px] p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase px-3 py-0.5 rounded-full bg-[#FEF2F2] text-[#7A2222] border border-[#7A2222]/15">
                        {j.abbreviation}
                      </span>
                      <h4 className="text-lg font-extrabold text-slate-800 mt-2">{j.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">{j.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-[#FDF7F7] p-3 rounded-xl border border-[#7A2222]/15">
                    <div>
                      <span className="text-slate-400 block text-[10px]">P-ISSN / E-ISSN</span>
                      <span className="font-bold text-slate-700">{j.issn_print} / {j.issn_online}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Akreditasi</span>
                      <span className="font-bold text-emerald-700">{j.accreditation}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Ketua Redaksi</span>
                      <span className="font-semibold text-slate-700 truncate block">{j.chief_editor}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Frekuensi</span>
                      <span className="font-semibold text-slate-700">{j.frequency}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                    <span className="font-bold text-slate-600">
                      Total Naskah: {j.submissions_count || 0}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedJournalId(j.id);
                          setStatusFilter('all');
                          setSearchQuery('');
                          setActiveTab('dashboard');
                        }}
                        className="text-[#7A2222] font-bold hover:underline cursor-pointer"
                      >
                        Buka Naskah →
                      </button>
                      {isAdminOrEditor && (
                        <button
                          type="button"
                          onClick={() => handleDeleteJournal(j)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 transition font-bold text-[11px] cursor-pointer"
                          title="Hapus Jurnal"
                        >
                          <Trash2 size={12} /> Hapus
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 4: UNGGAH NASKAH BARU (GATEKEEPER STANDARISASI SINTA / OJS)
           =================================================================== */}
        {activeTab === 'unggah' && (isAuthor || isAdminOrEditor) && (
          <div className="p-6 sm:p-8 max-w-4xl w-full mx-auto">
            <div className="card-luxury rounded-[32px] p-6 sm:p-10 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">Submit Naskah Ilmiah</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Seluruh naskah wajib memenuhi standarisasi publikasi ilmiah <strong>SINTA / ARJUNA &amp; PKP OJS</strong> sebelum diterima sistem.
                  </p>
                </div>
                <a
                  href={`${API_BASE}/template-naskah`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs shadow-2xs transition shrink-0"
                >
                  <Download size={15} /> Unduh Template Resmi (.docx IMRAD)
                </a>
              </div>

              {/* Live Standarisasi Gatekeeper Panel */}
              <div className="bg-[#FDF7F7] border border-[#7A2222]/15 rounded-[24px] p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#7A2222]">
                    <ShieldCheck size={16} />
                    <span>Gatekeeper Standarisasi Naskah (Standar SINTA / ARJUNA &amp; OJS)</span>
                  </div>
                  <span className={`text-[11px] font-extrabold px-3 py-0.5 rounded-full border ${
                    standardScoreCount === 6
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {standardScoreCount}/6 Standar Terpenuhi
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
                  {[
                    {
                      ok: isTitleStandardOk,
                      label: 'Judul: 5–20 kata (Bukan ALL CAPS)',
                      info: `${titleWordCount} kata`
                    },
                    {
                      ok: isAbstractStandardOk,
                      label: 'Abstrak: 150–250 kata, 1 paragraf, tanpa sitasi',
                      info: `${abstractWordCount} kata`
                    },
                    {
                      ok: isKeywordsStandardOk,
                      label: 'Kata Kunci: 3–6 frasa unik (pisah koma)',
                      info: `${keywordItems.length} frasa`
                    },
                    {
                      ok: isFileStandardOk,
                      label: 'Berkas: .docx/.pdf/.doc + Scan IMRAD & Magic Bytes',
                      info: file ? fileExt.toUpperCase() : 'Belum ada'
                    },
                    {
                      ok: Boolean(formJournalId),
                      label: 'Jurnal Tujuan & Kategori Dipilih',
                      info: formJournalId ? 'Siap' : 'Belum'
                    },
                    {
                      ok: isChecklistStandardOk,
                      label: 'Checklist Persiapan OJS (Orisinalitas & Plagiarisme <20%)',
                      info: `${checklistCheckedCount}/4`
                    }
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                        item.ok
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <span className={`font-extrabold mt-0.5 ${item.ok ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {item.ok ? '✓' : '✕'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold leading-snug">{item.label}</div>
                        <div className="text-[10px] opacity-75">{item.info}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kotak Pencegatan (Muncul Jika Gagal Standarisasi di Frontend / Backend) */}
              {submitViolations.length > 0 && (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 sm:p-5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="font-extrabold text-rose-800 flex items-center gap-2">
                      <span>⛔ Pengunggahan Dicegat Sistem — Naskah Belum Memenuhi Standarisasi:</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSubmitViolations([])}
                      className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-rose-700 font-medium leading-relaxed">
                    {submitViolations.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 5-Step Stepper Header */}
              <div className="pt-2 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between max-w-[720px] mx-auto">
                  {[
                    { num: 1, label: 'Judul & Jurnal', done: Boolean(formJournalId) && isTitleStandardOk },
                    { num: 2, label: 'Penulis & Keywords', done: isKeywordsStandardOk },
                    { num: 3, label: 'Abstrak SINTA', done: isAbstractStandardOk },
                    { num: 4, label: 'File IMRAD', done: isFileStandardOk },
                    { num: 5, label: 'Checklist OJS', done: isChecklistStandardOk }
                  ].map((s, idx, arr) => {
                    const active = submitStep === s.num;
                    return (
                      <React.Fragment key={s.num}>
                        <button
                          type="button"
                          onClick={() => setSubmitStep(s.num)}
                          className="flex flex-col items-center group cursor-pointer"
                        >
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold transition ${
                              s.done
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : active
                                ? 'bg-[#7A2222] text-white ring-4 ring-blue-100 shadow-sm'
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}
                          >
                            {s.done ? '✓' : s.num}
                          </div>
                          <span
                            className={`mt-2 text-[11px] font-bold ${
                              s.done ? 'text-emerald-700' : active ? 'text-[#7A2222]' : 'text-slate-400'
                            }`}
                          >
                            {s.label}
                          </span>
                        </button>
                        {idx < arr.length - 1 && (
                          <div
                            className={`flex-1 h-[2px] mx-2 sm:mx-4 -mt-5 ${
                              s.done ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmitManuscript} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Pilih Jurnal Tujuan <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formJournalId}
                      onChange={(e) => setFormJournalId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-[#7A2222] focus:outline-none focus:border-[#7A2222]"
                      required
                    >
                      {journals.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.abbreviation} — {j.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Kategori / Section <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#7A2222]"
                    >
                      <option value="Original Research">Original Research (Artikel Penelitian)</option>
                      <option value="Policy Brief">Policy Brief (Kajian Kebijakan)</option>
                      <option value="Case Study">Case Study (Studi Kasus Inovasi)</option>
                      <option value="Review Article">Review Article (Tinjauan Pustaka)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Judul Naskah Lengkap <span className="text-red-500">*</span>{' '}
                    <span className="text-[11px] font-normal text-slate-400">(Standar: 5–20 kata, Title Case, bukan ALL CAPS)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={250}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Analisis Efektivitas Layanan Publik Digital Berbasis Smart City di Kota Makassar"
                    className={`w-full px-4 py-3 rounded-xl border text-xs sm:text-sm text-slate-800 focus:outline-none ${
                      title.trim() === ''
                        ? 'border-slate-200 focus:border-[#7A2222]'
                        : isTitleStandardOk
                        ? 'border-emerald-400 bg-emerald-50/20'
                        : 'border-rose-400 bg-rose-50/20'
                    }`}
                    required
                  />
                  <div className="flex items-center justify-between text-[11px] mt-1">
                    <span className={`font-bold ${
                      title.trim() === ''
                        ? 'text-slate-400'
                        : isTitleStandardOk
                        ? 'text-emerald-700'
                        : 'text-rose-600'
                    }`}>
                      {titleWordCount} kata (Standar: 5–20 kata)
                      {titleIsAllCaps ? ' • ⚠ Tidak boleh HURUF KAPITAL SEMUA!' : ''}
                    </span>
                    <span className="text-slate-400">{title.length}/250 karakter</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Penulis Tambahan (Co-Authors)
                    </label>
                    <input
                      type="text"
                      value={coAuthors}
                      onChange={(e) => setCoAuthors(e.target.value)}
                      placeholder="Contoh: Dr. Siti Nurhaliza, M.Si., Ir. Budi Hartono"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Kata Kunci (Keywords) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="Contoh: Inovasi Daerah, Kebijakan Publik, Smart City, Makassar"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none ${
                        keywords.trim() === ''
                          ? 'border-slate-200 focus:border-[#7A2222]'
                          : isKeywordsStandardOk
                          ? 'border-emerald-400 bg-emerald-50/20'
                          : 'border-rose-400 bg-rose-50/20'
                      }`}
                      required
                    />
                    <div className={`text-[11px] font-bold mt-1 ${
                      keywords.trim() === ''
                        ? 'text-slate-400'
                        : isKeywordsStandardOk
                        ? 'text-emerald-700'
                        : 'text-rose-600'
                    }`}>
                      {keywordItems.length} kata kunci (Wajib: 3–6 frasa dipisahkan koma)
                      {keywordsHaveDup ? ' • ⚠ Ada kata kunci duplikat!' : ''}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Abstrak <span className="text-red-500">*</span>{' '}
                    <span className="text-[11px] font-normal text-slate-400">(Standar SINTA: 150–250 kata, 1 paragraf utuh, tanpa sitasi)</span>
                  </label>
                  <div className={`rounded-xl border overflow-hidden ${
                    abstract.trim() === ''
                      ? 'border-slate-200'
                      : isAbstractStandardOk
                      ? 'border-emerald-400'
                      : 'border-rose-400'
                  }`}>
                    <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-slate-600 text-xs">
                      <span className="font-semibold text-[11px]">
                        Komponen wajib: Latar Belakang • Tujuan • Metode • Hasil Utama • Kesimpulan
                      </span>
                      <span className={`font-extrabold text-[11px] ${
                        abstract.trim() === ''
                          ? 'text-slate-400'
                          : isAbstractStandardOk
                          ? 'text-emerald-700'
                          : 'text-rose-600'
                      }`}>
                        {abstractWordCount} / 150–250 kata
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      maxLength={3500}
                      value={abstract}
                      onChange={(e) => setAbstract(e.target.value)}
                      placeholder="Tuliskan abstrak dalam 1 paragraf utuh sepanjang 150–250 kata yang mencakup latar belakang, tujuan, metode, hasil utama, dan kesimpulan tanpa sitasi pustaka..."
                      className="w-full p-4 text-xs sm:text-sm text-slate-800 focus:outline-none resize-y leading-relaxed"
                      required
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] mt-1">
                    <div className="space-x-2">
                      {abstractMultiPara && (
                        <span className="text-rose-600 font-bold">⚠ Abstrak harus 1 paragraf (hapus baris kosong)!</span>
                      )}
                      {abstractHasCitation && (
                        <span className="text-rose-600 font-bold">⚠ Dilarang mencantumkan sitasi di dalam abstrak!</span>
                      )}
                    </div>
                    <span className="text-slate-400">{abstract.length}/3500 karakter</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Unggah File Naskah Standar IMRAD (.docx / .pdf / .doc) <span className="text-red-500">*</span>
                  </label>
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const droppedFile = e.dataTransfer?.files?.[0];
                      if (droppedFile) {
                        setFile(droppedFile);
                        toast.success(`Berkas "${droppedFile.name}" siap divalidasi & diunggah.`);
                      }
                    }}
                    className={`w-full rounded-2xl border-2 border-dashed p-7 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                      isFileStandardOk
                        ? 'border-emerald-400 bg-emerald-50/40'
                        : 'border-slate-300 hover:border-[#7A2222] bg-[#FDF7F7]/50'
                    }`}
                  >
                    <FileUp size={34} className="text-[#7A2222] mb-2" />
                    <p className="text-xs sm:text-sm text-slate-700 font-bold">
                      Drag &amp; drop file di sini atau <span className="text-[#7A2222] underline">klik untuk memilih</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-md">
                      Server otomatis memeriksa keaslian biner (Magic Bytes) serta kelengkapan struktur <strong>IMRAD</strong> (Pendahuluan, Metode, Hasil &amp; Pembahasan, Kesimpulan, Daftar Pustaka).
                    </p>
                    {file && (
                      <div className="mt-3 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                        ✓ File dipilih: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* 4-Item OJS Submission Preparation Checklist */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-2.5 text-xs">
                  <div className="font-extrabold text-slate-800 flex items-center justify-between">
                    <span>📋 Submission Preparation Checklist (Wajib Standar OJS)</span>
                    <span className={`text-[11px] font-bold ${isChecklistStandardOk ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {checklistCheckedCount}/4 disetujui
                    </span>
                  </div>
                  {[
                    {
                      key: 'original',
                      text: 'Naskah ini merupakan karya orisinal, belum pernah dipublikasikan sebelumnya, dan tidak sedang diajukan ke jurnal lain.'
                    },
                    {
                      key: 'similarity',
                      text: 'Naskah telah lolos pengecekan kemiripan (similarity/plagiarisme) dengan indeks maksimal 20% sesuai ketentuan jurnal.'
                    },
                    {
                      key: 'imrad',
                      text: 'Dokumen telah disusun sesuai struktur IMRAD (Pendahuluan, Metode, Hasil & Pembahasan, Kesimpulan, Daftar Pustaka) dan template resmi BRIDA.'
                    },
                    {
                      key: 'blind',
                      text: 'Berkas naskah telah dipersiapkan untuk evaluasi Double-Blind Peer Review (tanpa mencantumkan identitas pribadi yang membocorkan penulis).'
                    }
                  ].map((c) => (
                    <label
                      key={c.key}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={ojsChecklist[c.key]}
                        onChange={(e) =>
                          setOjsChecklist({ ...ojsChecklist, [c.key]: e.target.checked })
                        }
                        className="mt-0.5 accent-[#7A2222] w-4 h-4 cursor-pointer shrink-0"
                      />
                      <span className="text-slate-700 leading-relaxed">{c.text}</span>
                    </label>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-500">
                    {standardScoreCount === 6
                      ? '✅ Seluruh kriteria pra-validasi terpenuhi. Siap dikirim & dipindai server!'
                      : '⚠ Lengkapi seluruh kriteria standarisasi di atas agar tidak dicegat sistem.'}
                  </div>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className={`px-6 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md transition cursor-pointer ${
                      standardScoreCount === 6
                        ? 'bg-[#7A2222] hover:bg-[#661B1B] text-white'
                        : 'bg-slate-700 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {submitLoading ? 'Memindai Standar & Mengirim...' : '🚀 Validasi & Kirim Naskah'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 5: MEJA EVALUASI PEER-REVIEW (REVIEWER & ADMIN)
           =================================================================== */}
        {activeTab === 'review' && (isReviewer || isAdminOrEditor) && (
          <div className="p-6 sm:p-8 max-w-7xl w-full mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Antrean Naskah di Kiri */}
              <div className="lg:col-span-5 card-luxury rounded-[28px] p-5 space-y-4 h-fit">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    {isReviewer ? 'Daftar Naskah Tugasan Review' : 'Antrean Editorial & Peer-Review'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isReviewer
                      ? 'Pilih naskah untuk membaca PDF dan mengisi lembar skor penilaian Mitra Bestari.'
                      : 'Pilih naskah untuk menugaskan Reviewer atau menerbitkan nomor DOI.'}
                  </p>
                </div>

                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {roleScopedSubmissions.length === 0 ? (
                    <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400 italic">
                      {isReviewer
                        ? 'Belum ada naskah yang ditugaskan kepada akun Mitra Bestari Anda.'
                        : 'Belum ada naskah dalam antrean untuk konteks jurnal ini.'}
                    </div>
                  ) : (
                    [...roleScopedSubmissions]
                      .sort((a, b) => {
                        if (isReviewer) {
                          const aMyRev = (a.reviews || []).find((r) => String(r.reviewer_id) === String(currentUser?.id));
                          const bMyRev = (b.reviews || []).find((r) => String(r.reviewer_id) === String(currentUser?.id));
                          const prio = (sub, rev) => {
                            if (sub.status === 'under_review' && rev?.status === 'assigned') return 0;
                            if (sub.status === 'under_review' && rev?.status === 'in_progress') return 1;
                            if (rev?.status === 'completed') return 2;
                            return 3;
                          };
                          const diff = prio(a, aMyRev) - prio(b, bMyRev);
                          if (diff !== 0) return diff;
                        }
                        return b.id - a.id;
                      })
                      .map((sub) => {
                      const active = selectedSubForAction?.id === sub.id;
                      const badge = STATUS_BADGE[sub.status] || STATUS_BADGE.pending;
                      const prog = getSubmissionProgressMeta(sub);
                      const myRev = isReviewer
                        ? (sub.reviews || []).find((r) => String(r.reviewer_id) === String(currentUser?.id))
                        : null;
                      return (
                        <div
                          key={sub.id}
                          onClick={() => {
                            setSelectedSubForAction(sub);
                            setSelectedReviewerIds([]);
                            setExtraReviewerId('');
                            setShowDeclineForm(false);
                            setDeclineReason('');
                          }}
                          className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer space-y-2 ${
                            active
                              ? 'bg-[#FEF2F2] border-[#7A2222] ring-2 ring-[#7A2222]/20 shadow-xs'
                              : 'bg-slate-50/70 border-slate-200/80 hover:bg-[#FDF7F7] hover:border-[#7A2222]/30'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#7A2222] text-white">
                              {sub.journal?.abbreviation}
                            </span>
                            {isReviewer && myRev ? (
                              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                myRev.status === 'assigned'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : myRev.status === 'in_progress'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : myRev.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border-rose-200'
                              }`}>
                                {myRev.status === 'assigned'
                                  ? '📩 UNDANGAN BARU'
                                  : myRev.status === 'in_progress'
                                  ? '📝 SEDANG DITELAAH'
                                  : myRev.status === 'completed'
                                  ? '✅ BERHASIL DIREVIEW'
                                  : '🚫 DITOLAK ANDA'}
                              </span>
                            ) : (
                              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                                {badge.label}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 leading-snug">
                            {sub.title}
                          </h4>
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>Penulis: {sub.author?.name}</span>
                            {isAdminOrEditor && (prog.activeRevs.length > 0 || prog.declinedRevs.length > 0) && (
                              <span className="text-[10px] font-bold text-[#7A2222]">
                                {prog.completedRevs.length}/{prog.activeRevs.length} selesai
                                {prog.declinedRevs.length > 0 ? ` • ⚠ ${prog.declinedRevs.length} tolak` : ''}
                              </span>
                            )}
                            {isReviewer && (
                              <span className="text-[10px] font-bold text-slate-400">
                                {sub.status === 'published' ? 'Terbit' : sub.status === 'accepted' ? 'Accepted' : ''}
                              </span>
                            )}
                          </div>
                          {/* Mini progress strip */}
                          <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isReviewer && myRev
                                  ? myRev.status === 'completed'
                                    ? 'bg-emerald-500'
                                    : myRev.status === 'declined'
                                    ? 'bg-rose-500'
                                    : myRev.status === 'in_progress'
                                    ? 'bg-blue-600'
                                    : 'bg-amber-500'
                                  : prog.barColor
                              }`}
                              style={{
                                width: `${
                                  isReviewer && myRev
                                    ? myRev.status === 'assigned'
                                      ? 33
                                      : myRev.status === 'in_progress'
                                      ? 66
                                      : 100
                                    : prog.percent
                                }%`
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Panel Kerja di Kanan */}
              <div className="lg:col-span-7">
                {!selectedSubForAction ? (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
                    <CheckSquare size={42} className="mx-auto text-slate-300" />
                    <h4 className="text-base font-bold text-slate-700">
                      Pilih Naskah di Sebelah Kiri
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Klik salah satu judul naskah di daftar sebelah kiri untuk membuka lembar kerja{' '}
                      <strong>{currentUser?.label}</strong>.
                    </p>
                  </div>
                ) : (() => {
                  const myReviewHeader = isReviewer
                    ? (selectedSubForAction.reviews || []).find(
                        (r) => String(r.reviewer_id) === String(currentUser?.id)
                      )
                    : null;
                  const canOpenFileInReviewTab =
                    !isReviewer ||
                    (myReviewHeader &&
                      myReviewHeader.status !== 'assigned' &&
                      myReviewHeader.status !== 'declined');

                  return (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-6">
                    {/* Header Naskah */}
                    <div className="border-b border-slate-100 pb-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-[#7A2222] bg-[#FEF2F2] px-3 py-1 rounded-lg border border-blue-200">
                          Jurnal: {selectedSubForAction.journal?.title}
                        </span>
                        <div className="flex items-center gap-2">
                          {selectedSubForAction.file_path && canOpenFileInReviewTab && (
                            <a
                              href={resolveFileUrl(selectedSubForAction.file_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-[#7A2222] bg-[#FEF2F2] hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 flex items-center gap-1.5"
                            >
                              <FileText size={14} /> Buka Dokumen Naskah
                            </a>
                          )}
                          {selectedSubForAction.file_path && isReviewer && !canOpenFileInReviewTab && (
                            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                              {myReviewHeader?.status === 'declined'
                                ? '🚫 Akses Berkas Ditutup (Anda Menolak)'
                                : '🔒 Terima Undangan untuk Buka Berkas'}
                            </span>
                          )}
                          {isAdminOrEditor && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSubmission(selectedSubForAction)}
                              className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 flex items-center gap-1.5 cursor-pointer"
                              title="Hapus naskah ini dari antrean & database"
                            >
                              <Trash2 size={14} /> Hapus Naskah
                            </button>
                          )}
                        </div>
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-800">
                        {selectedSubForAction.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {selectedSubForAction.abstract}
                      </p>
                      {isAdminOrEditor && renderWorkflowProgressBar(selectedSubForAction)}
                    </div>

                    {/* Authority Chief Editor / Admin */}
                    {isAdminOrEditor && (
                      <div className="space-y-4">
                        {/* KONDISI 1: Naskah Masih Pending (Multi-Reviewer Checklist) */}
                        {selectedSubForAction.status === 'pending' && (
                          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                <UserCheck size={16} className="text-[#7A2222]" />
                                Penugasan Mitra Bestari (Support Multi-Reviewer)
                              </h4>
                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                MENUNGGU PENUGASAN
                              </span>
                            </div>

                            <p className="text-xs text-slate-500">
                              Centang <strong>1 atau lebih Mitra Bestari</strong> yang ingin Anda tugaskan untuk menelaah naskah ini secara independen.
                            </p>

                            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                              {(stats.reviewers || []).length === 0 ? (
                                <p className="text-xs text-rose-600 italic">
                                  Belum ada akun Reviewer terdaftar. Tambahkan melalui menu Manajemen Pengguna atau pendaftaran akun.
                                </p>
                              ) : (
                                (stats.reviewers || []).map((rev) => {
                                  const checked = selectedReviewerIds.includes(String(rev.id));
                                  return (
                                    <label
                                      key={rev.id}
                                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition text-xs ${
                                        checked
                                          ? 'bg-[#FEF2F2] border-[#7A2222] shadow-2xs'
                                          : 'bg-white border-slate-200 hover:bg-slate-50'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleReviewerSelection(rev.id)}
                                        className="mt-0.5 accent-[#7A2222] w-4 h-4 cursor-pointer"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="font-bold text-slate-800">{rev.name}</div>
                                        <div className="text-[11px] text-slate-500 truncate">
                                          {rev.email} • {rev.specialty || rev.affiliation || 'Mitra Bestari'}
                                        </div>
                                      </div>
                                    </label>
                                  );
                                })
                              )}
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">
                                Catatan Pengantar dari Editor (Opsional):
                              </label>
                              <input
                                type="text"
                                value={editorNotes}
                                onChange={(e) => setEditorNotes(e.target.value)}
                                placeholder="Misal: Mohon telaah fokus metodologi kuantitatif..."
                                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#7A2222]"
                              />
                            </div>

                            <div className="pt-1 flex items-center justify-between gap-3">
                              <span className="text-[11px] font-bold text-[#7A2222]">
                                {selectedReviewerIds.length} Mitra Bestari dipilih
                              </span>
                              <button
                                type="button"
                                disabled={selectedReviewerIds.length === 0}
                                onClick={() => handleAssignReviewer(selectedSubForAction.id)}
                                className="bg-[#7A2222] hover:bg-[#661B1B] disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2"
                              >
                                📋 Tugaskan {selectedReviewerIds.length > 0 ? `${selectedReviewerIds.length} ` : ''}Reviewer (Mulai Telaah)
                              </button>
                            </div>
                          </div>
                        )}

                        {/* KONDISI 2: Naskah Sedang Direview (Multi-Reviewer Progress + Penolakan Undangan + Tambah Reviewer + Split Decision) */}
                        {selectedSubForAction.status === 'under_review' && (() => {
                          const assignedReviews = selectedSubForAction.reviews || [];
                          const activeReviews = assignedReviews.filter((r) => r.status !== 'declined');
                          const declinedReviews = assignedReviews.filter((r) => r.status === 'declined');
                          const activeIds = activeReviews.map((r) => String(r.reviewer_id));
                          const declinedIds = declinedReviews.map((r) => String(r.reviewer_id));
                          const unassignedReviewers = (stats.reviewers || []).filter(
                            (r) => !activeIds.includes(String(r.id))
                          );
                          const completedCount = activeReviews.filter((r) => r.status === 'completed').length;
                          const waitingAcceptCount = activeReviews.filter((r) => r.status === 'assigned').length;
                          const allCompleted = activeReviews.length > 0 && completedCount === activeReviews.length;

                          return (
                            <div className="bg-[#FDF7F7] p-5 rounded-2xl border border-blue-200 space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#7A2222] flex items-center gap-2">
                                  <Clock size={16} className={`text-[#7A2222] ${allCompleted || activeReviews.length === 0 ? '' : 'animate-spin'}`} />
                                  {activeReviews.length === 0
                                    ? 'Semua Reviewer Menolak — Wajib Tunjuk Reviewer Pengganti'
                                    : allCompleted
                                    ? 'Seluruh Reviewer Aktif Selesai Menilai — Menunggu Keputusan Editor'
                                    : `Progress Telaah: ${completedCount}/${activeReviews.length} Selesai${waitingAcceptCount > 0 ? ` (${waitingAcceptCount} Menunggu Konfirmasi)` : ''}`}
                                </h4>
                                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                                  activeReviews.length === 0
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : allCompleted
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-blue-100 text-[#7A2222] border-blue-300'
                                }`}>
                                  {activeReviews.length === 0
                                    ? 'BUTUH PENGGANTI'
                                    : allCompleted
                                    ? 'MENUNGGU KEPUTUSAN'
                                    : 'UNDER REVIEW'}
                                </span>
                              </div>

                              {/* Peringatan Jika Ada Reviewer yang Menolak Undangan */}
                              {declinedReviews.length > 0 && (
                                <div className="bg-rose-50 border border-rose-300 rounded-xl p-3.5 text-xs text-rose-900 space-y-1">
                                  <div className="font-extrabold flex items-center gap-1.5">
                                    <span>⚠️</span>
                                    <span>
                                      {declinedReviews.length} Mitra Bestari Menolak Undangan Penelaahan!
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-rose-800 leading-relaxed">
                                    {activeReviews.length === 0
                                      ? 'Saat ini tidak ada reviewer aktif yang menelaah naskah ini. Segera tunjuk Mitra Bestari pengganti di bawah agar proses review dapat berjalan.'
                                      : 'Silakan periksa alasan penolakan di bawah dan tunjuk Mitra Bestari pengganti jika dibutuhkan opini kedua/ketiga.'}
                                  </p>
                                </div>
                              )}

                              {selectedSubForAction.editor_notes && (
                                <div className="bg-white/80 p-3 rounded-xl border border-[#7A2222]/15 text-xs text-slate-600">
                                  <span className="text-[10px] font-bold text-slate-400 block">Catatan Pengantar Editor:</span>
                                  <span className="italic">"{selectedSubForAction.editor_notes}"</span>
                                </div>
                              )}

                              {/* Daftar Semua Reviewer yang Ditugaskan */}
                              <div className="space-y-2.5">
                                {assignedReviews.map((rev, idx) => {
                                  const revDeclined = rev.status === 'declined';
                                  const revDone = !revDeclined && (rev.status === 'completed' || !!rev.decision);
                                  const revAssigned = rev.status === 'assigned';
                                  const revName =
                                    rev.reviewer?.name ||
                                    (stats.reviewers || []).find((r) => String(r.id) === String(rev.reviewer_id))?.name ||
                                    `Reviewer #${rev.reviewer_id}`;
                                  return (
                                    <div
                                      key={rev.id || idx}
                                      className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                                        revDeclined
                                          ? 'bg-rose-50/70 border-rose-200'
                                          : revDone
                                          ? 'bg-emerald-50/40 border-emerald-200'
                                          : revAssigned
                                          ? 'bg-amber-50/40 border-amber-200'
                                          : 'bg-white border-[#7A2222]/15'
                                      }`}
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                          <span className="text-[10px] text-slate-400 font-bold block">Reviewer #{idx + 1}</span>
                                          <strong className="text-slate-800">{revName}</strong>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {revDeclined ? (
                                            <>
                                              <span className="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] bg-rose-100 text-rose-800 border border-rose-300">
                                                🚫 MENOLAK UNDANGAN
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveReviewer(selectedSubForAction.id, rev.reviewer_id, revName)}
                                                className="text-[10px] font-bold text-slate-500 hover:text-rose-600 hover:underline cursor-pointer"
                                              >
                                                Hapus Log
                                              </button>
                                            </>
                                          ) : revDone ? (
                                            <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${
                                              rev.decision === 'accept'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : rev.decision === 'revise'
                                                ? 'bg-amber-100 text-amber-800'
                                                : 'bg-rose-100 text-rose-800'
                                            }`}>
                                              {rev.decision === 'accept' ? '✅ SELESAI: DITERIMA' : rev.decision === 'revise' ? '⚠️ SELESAI: REVISI' : '❌ SELESAI: DITOLAK'}
                                            </span>
                                          ) : revAssigned ? (
                                            <>
                                              <span className="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] bg-amber-100 text-amber-900 border border-amber-300">
                                                📩 MENUNGGU KONFIRMASI REVIEWER
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveReviewer(selectedSubForAction.id, rev.reviewer_id, revName)}
                                                className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                                              >
                                                Batalkan
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <span className="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                                                📝 SEDANG MENELAAH
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveReviewer(selectedSubForAction.id, rev.reviewer_id, revName)}
                                                className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                                              >
                                                Batalkan
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {revDeclined && (
                                        <div className="pt-2 border-t border-rose-200/80">
                                          <span className="text-[10px] font-extrabold text-rose-700 uppercase block mb-0.5">
                                            Alasan Penolakan dari Reviewer:
                                          </span>
                                          <p className="italic text-rose-900 bg-white/90 p-2 rounded-lg border border-rose-100">
                                            "{rev.comments || 'Reviewer tidak mencantumkan alasan.'}"
                                          </p>
                                        </div>
                                      )}

                                      {revDone && (
                                        <div className="pt-2 border-t border-slate-100 space-y-2">
                                          <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-white p-1.5 rounded-lg text-center border border-slate-100">
                                              <span className="text-[10px] text-slate-400 block">Orisinalitas</span>
                                              <strong className="text-[#7A2222]">{rev.score_originality ?? '-'}</strong>
                                            </div>
                                            <div className="bg-white p-1.5 rounded-lg text-center border border-slate-100">
                                              <span className="text-[10px] text-slate-400 block">Metodologi</span>
                                              <strong className="text-[#7A2222]">{rev.score_methodology ?? '-'}</strong>
                                            </div>
                                            <div className="bg-white p-1.5 rounded-lg text-center border border-slate-100">
                                              <span className="text-[10px] text-slate-400 block">Relevansi</span>
                                              <strong className="text-[#7A2222]">{rev.score_relevance ?? '-'}</strong>
                                            </div>
                                          </div>
                                          <p className="italic text-slate-600 bg-white p-2 rounded-lg border border-slate-100">"{rev.comments}"</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Tambah Reviewer Tambahan / Pengganti / Penunjukan Reviewer ke-3 */}
                              <div className="bg-white/90 p-3.5 rounded-xl border border-dashed border-blue-300 space-y-2">
                                <div className="text-[11px] font-extrabold text-[#7A2222]">
                                  {declinedReviews.length > 0 && activeReviews.length < 2
                                    ? `+ Tunjuk Mitra Bestari Pengganti (Reviewer Aktif ke-${activeReviews.length + 1}):`
                                    : allCompleted
                                    ? `+ Tunjuk Reviewer ke-${activeReviews.length + 1} sebagai Penengah (Third Opinion / Adjudicator):`
                                    : `+ Tambah Mitra Bestari Tambahan (Reviewer Aktif ke-${activeReviews.length + 1}):`}
                                </div>
                                {unassignedReviewers.length > 0 ? (
                                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                                    <select
                                      value={extraReviewerId}
                                      onChange={(e) => setExtraReviewerId(e.target.value)}
                                      className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
                                    >
                                      <option value="">-- Pilih Mitra Bestari --</option>
                                      {unassignedReviewers.map((r) => (
                                        <option key={r.id} value={r.id}>
                                          {r.name} ({r.specialty || r.email})
                                          {declinedIds.includes(String(r.id)) ? ' [Sebelumnya Menolak]' : ''}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      disabled={!extraReviewerId}
                                      onClick={() => handleAddExtraReviewer(selectedSubForAction.id)}
                                      className="px-4 py-2 rounded-xl bg-[#7A2222] hover:bg-[#661B1B] disabled:opacity-50 text-white font-bold text-xs cursor-pointer shrink-0"
                                    >
                                      + Undang Reviewer
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                                    <span>Seluruh akun Reviewer yang tersedia sudah ditugaskan aktif pada naskah ini.</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveTab('users');
                                        setShowAddUserModal(true);
                                      }}
                                      className="text-[#7A2222] font-bold hover:underline cursor-pointer"
                                    >
                                      + Tambah Akun Reviewer Baru →
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Panel Keputusan Akhir Chief Editor jika Split Decision / Semua Reviewer Aktif Selesai */}
                              {allCompleted ? (
                                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
                                  <div className="text-xs font-extrabold text-amber-900">
                                    ⚖️ Keputusan Akhir Dewan Redaksi (Chief Editor Tie-Breaker)
                                  </div>
                                  <p className="text-[11px] text-amber-800 leading-relaxed">
                                    {declinedReviews.length > 0 && activeReviews.length === 1
                                      ? 'Salah satu Mitra Bestari menolak undangan dan 1 Reviewer aktif telah menyelesaikan penilaian. Anda dapat menunjuk Reviewer Pengganti di atas untuk opini kedua, atau langsung menetapkan keputusan final di bawah ini:'
                                      : 'Para Mitra Bestari memberikan rekomendasi berbeda. Sebagai Chief Editor, Anda dapat menunjuk Reviewer penengah di atas atau langsung menetapkan keputusan final naskah ini:'}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleEditorDecision(selectedSubForAction.id, 'accept')}
                                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer"
                                    >
                                      ✅ Setujui (Accept)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEditorDecision(selectedSubForAction.id, 'revise')}
                                      className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer"
                                    >
                                      ⚠️ Minta Revisi Penulis
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEditorDecision(selectedSubForAction.id, 'reject')}
                                      className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs cursor-pointer"
                                    >
                                      ❌ Tolak Naskah
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-500 leading-relaxed italic">
                                  ℹ️ Reviewer yang baru diundang berstatus <strong>Menunggu Konfirmasi</strong> hingga mereka menyetujui atau menolak undangan review. Status naskah akan berlanjut setelah semua reviewer aktif selesai menilai.
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        {/* KONDISI 3: Naskah Perlu Revisi */}
                        {selectedSubForAction.status === 'revision_required' && (
                          <div className="bg-orange-50 p-5 rounded-2xl border border-orange-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-extrabold uppercase tracking-wider text-orange-900 flex items-center gap-2">
                                <Clock size={16} className="text-orange-600 animate-pulse" />
                                Status: Menunggu Berkas Perbaikan dari Penulis
                              </h4>
                              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
                                PERLU REVISI
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">
                              Reviewer telah mengevaluasi naskah dan meminta penulis melakukan revisi. Penulis saat ini sedang menyempurnakan naskah. Status akan otomatis kembali ke <em>Under Review</em> setelah penulis mengunggah berkas revisi baru.
                            </p>
                          </div>
                        )}

                        {/* KONDISI 4: Naskah Diterima (Siap Terbit) */}
                        {selectedSubForAction.status === 'accepted' && (
                          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-emerald-700" />
                                Naskah Disetujui (Accepted) — Siap Diterbitkan
                              </h4>
                              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                SIAP TERBIT
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">
                              Mitra Bestari telah merekomendasikan naskah ini untuk diterbitkan. Klik tombol di bawah untuk menerbitkan artikel secara resmi ke terbitan aktif jurnal dan meng-generate nomor DOI resmi.
                            </p>
                            <button
                              type="button"
                              onClick={() => handlePublishArticle(selectedSubForAction.id)}
                              className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2"
                            >
                              🚀 Terbitkan ke Terbitan Aktif &amp; Buat Nomor DOI
                            </button>
                          </div>
                        )}

                        {/* KONDISI 5: Naskah Telah Terbit */}
                        {selectedSubForAction.status === 'published' && (
                          <div className="bg-purple-50 p-5 rounded-2xl border border-purple-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                                <Award size={16} className="text-purple-700" />
                                Naskah Telah Resmi Diterbitkan (Published)
                              </h4>
                              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                                RESMI TERBIT
                              </span>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-purple-100 text-xs space-y-1">
                              <span className="text-slate-400 block text-[10px]">Nomor Identifikasi Digital (DOI):</span>
                              <div className="font-mono font-bold text-[#7A2222] text-sm select-all">
                                {selectedSubForAction.doi || '10.31290/makassaris.v4i2.100'}
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-500 italic">
                              Artikel telah terindeks publik dan dapat diakses pembaca melalui portal terbitan.
                            </p>
                          </div>
                        )}

                        {/* KONDISI 6: Naskah Ditolak */}
                        {selectedSubForAction.status === 'rejected' && (
                          <div className="bg-rose-50 p-5 rounded-2xl border border-rose-200 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <h4 className="font-extrabold uppercase text-rose-900 flex items-center gap-2">
                                <X size={16} className="text-rose-700" />
                                Status: Naskah Ditolak (Rejected)
                              </h4>
                              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                                DITOLAK
                              </span>
                            </div>
                            <p className="text-slate-700 leading-relaxed">
                              Berdasarkan hasil penelaahan Mitra Bestari, naskah ini dinyatakan tidak memenuhi kriteria penerbitan jurnal.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* BAGIAN B: HASIL EVALUASI REVIEWER (HANYA MUNCUL JIKA SUDAH ADA REVIEW YANG DILAKUKAN) */}
                    {isAdminOrEditor && selectedSubForAction.status !== 'pending' && selectedSubForAction.status !== 'under_review' && (
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-[#7A2222]" />
                          Laporan Hasil Penilaian Mitra Bestari (Reviewer)
                        </h4>

                        {selectedSubForAction.reviews && selectedSubForAction.reviews.length > 0 ? (
                          <div className="space-y-3">
                            {selectedSubForAction.reviews.map((rev, idx) => {
                              const isDeclined = rev.status === 'declined';
                              const isCompleted = !isDeclined && (rev.status === 'completed' || !!rev.decision);
                              const isAssigned = rev.status === 'assigned';
                              const revName =
                                rev.reviewer?.name ||
                                (stats.reviewers || []).find((r) => String(r.id) === String(rev.reviewer_id))?.name ||
                                `Reviewer #${rev.reviewer_id}`;
                              return (
                                <div
                                  key={rev.id || idx}
                                  className={`p-4 rounded-xl border space-y-2 text-xs ${
                                    isDeclined
                                      ? 'bg-rose-50/70 border-rose-200'
                                      : 'bg-[#FDF7F7] border-[#7A2222]/15'
                                  }`}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-bold text-slate-800">
                                      Mitra Bestari: {revName}
                                    </span>
                                    {isDeclined ? (
                                      <span className="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] bg-rose-100 text-rose-800 border border-rose-300">
                                        🚫 MENOLAK UNDANGAN REVIEW
                                      </span>
                                    ) : isCompleted ? (
                                      <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${
                                        rev.decision === 'accept'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : rev.decision === 'revise'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-rose-100 text-rose-800'
                                      }`}>
                                        Rekomendasi: {rev.decision === 'accept' ? 'DITERIMA (ACCEPT)' : rev.decision === 'revise' ? 'PERLU REVISI' : 'DITOLAK'}
                                      </span>
                                    ) : isAssigned ? (
                                      <span className="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] bg-amber-100 text-amber-800 border border-amber-200">
                                        📩 MENUNGGU KONFIRMASI
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                                        <Clock size={11} className="inline animate-spin" /> SEDANG MENELAAH (IN PROGRESS)
                                      </span>
                                    )}
                                  </div>

                                  {isDeclined && (
                                    <div>
                                      <span className="text-[10px] font-bold text-rose-700 block">Alasan Penolakan Undangan:</span>
                                      <p className="text-rose-900 italic bg-white p-2.5 rounded-lg border border-rose-100 mt-1 leading-relaxed">
                                        "{rev.comments || 'Tidak ada alasan tertulis.'}"
                                      </p>
                                    </div>
                                  )}

                                  {isCompleted && (
                                    <>
                                      <div className="grid grid-cols-3 gap-2 py-1">
                                        <div className="bg-white p-2 rounded-lg text-center border border-slate-100">
                                          <span className="text-[10px] text-slate-400 block">Orisinalitas</span>
                                          <strong className="text-sm text-[#7A2222]">{rev.score_originality ?? '-'}</strong>
                                        </div>
                                        <div className="bg-white p-2 rounded-lg text-center border border-slate-100">
                                          <span className="text-[10px] text-slate-400 block">Metodologi</span>
                                          <strong className="text-sm text-[#7A2222]">{rev.score_methodology ?? '-'}</strong>
                                        </div>
                                        <div className="bg-white p-2 rounded-lg text-center border border-slate-100">
                                          <span className="text-[10px] text-slate-400 block">Relevansi</span>
                                          <strong className="text-sm text-[#7A2222]">{rev.score_relevance ?? '-'}</strong>
                                        </div>
                                      </div>

                                      <div>
                                        <span className="text-[10px] font-bold text-slate-500 block">Catatan &amp; Masukan Reviewer:</span>
                                        <p className="text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-100 mt-1 leading-relaxed">
                                          "{rev.comments || 'Tidak ada catatan tertulis.'}"
                                        </p>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                            Naskah sedang dalam proses penelaahan oleh Reviewer yang ditugaskan.
                          </div>
                        )}
                      </div>
                    )}

                    {/* BAGIAN C: WORKSPACE PEER-REVIEW (PER-AKUN REVIEWER: KONFIRMASI UNDANGAN, EVALUASI, & STATUS PROGRESS) */}
                    {isReviewer && (() => {
                      const myReview = (selectedSubForAction.reviews || []).find(
                        (r) => String(r.reviewer_id) === String(currentUser?.id)
                      );
                      const isAssigned = myReview?.status === 'assigned';
                      const isInProgress = myReview?.status === 'in_progress';
                      const isCompleted = myReview?.status === 'completed';
                      const isDeclined = myReview?.status === 'declined';
                      const canRespondInvite = selectedSubForAction.status === 'under_review' && isAssigned;
                      const canReviewNow = selectedSubForAction.status === 'under_review' && isInProgress;
                      const avgScore =
                        myReview && isCompleted
                          ? (
                              (Number(myReview.score_originality || 0) +
                                Number(myReview.score_methodology || 0) +
                                Number(myReview.score_relevance || 0)) /
                              3
                            ).toFixed(1)
                          : null;
                      const subProgress = getSubmissionProgressMeta(selectedSubForAction);
                      const declinePresets = [
                        'Di luar bidang keahlian / kepakaran saya',
                        'Terdapat potensi konflik kepentingan (Conflict of Interest)',
                        'Beban kerja saat ini penuh / sedang berhalangan',
                        'Waktu tenggat penelaahan tidak mencukupi'
                      ];

                      const reviewerStageStep = isAssigned ? 1 : isInProgress ? 2 : 3;

                      return (
                        <div className="space-y-4">
                          {/* Stepper Progress 3 Tahap Khusus Sisi Reviewer */}
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                            <div className="flex items-center justify-between text-[11px] font-extrabold">
                              <span className="text-slate-700 uppercase tracking-wider">
                                Progress Penelaahan Anda
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full border text-[10px] ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : isDeclined
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : isInProgress
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}>
                                {isCompleted
                                  ? '✅ 100% — BERHASIL ANDA REVIEW'
                                  : isDeclined
                                  ? '🚫 UNDANGAN DITOLAK'
                                  : isInProgress
                                  ? '📝 66% — SEDANG ANDA TELAAH'
                                  : '📩 33% — MENUNGGU KONFIRMASI ANDA'}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                              {[
                                { id: 1, label: '1. Undangan Masuk' },
                                { id: 2, label: '2. Terima & Telaah' },
                                { id: 3, label: isDeclined ? '3. Undangan Ditolak' : '3. Berhasil Direview' }
                              ].map((st) => {
                                const done = !isDeclined && reviewerStageStep > st.id;
                                const active = reviewerStageStep === st.id;
                                return (
                                  <div
                                    key={st.id}
                                    className={`p-2 rounded-xl border ${
                                      isDeclined && st.id === 3
                                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                                        : isCompleted && st.id === 3
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                        : active
                                        ? 'bg-blue-50 border-blue-300 text-[#7A2222]'
                                        : done
                                        ? 'bg-white border-emerald-200 text-emerald-700'
                                        : 'bg-white border-slate-200 text-slate-400'
                                    }`}
                                  >
                                    <span className="block">{st.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* STATE 1: UNDANGAN REVIEW BARU (BELUM DITERIMA / DITOLAK) */}
                          {canRespondInvite && (
                            <div className="bg-amber-50/80 p-5 rounded-2xl border-2 border-amber-300 space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-950 flex items-center gap-2">
                                  <span>📩</span> Undangan Penelaahan Sejawat (Review Request)
                                </h4>
                                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950">
                                  MENUNGGU KONFIRMASI ANDA
                                </span>
                              </div>

                              <p className="text-xs text-amber-900 leading-relaxed">
                                Dewan Redaksi <strong>{selectedSubForAction.journal?.title}</strong> mengundang Anda sebagai Mitra Bestari untuk menelaah naskah di atas.
                                Silakan tinjau judul dan abstrak terlebih dahulu. Berkas lengkap naskah akan terbuka setelah Anda menyetujui undangan ini.
                                Jika tidak sesuai bidang keahlian, berhalangan, atau terdapat <em>Conflict of Interest</em>, Anda berhak menolak undangan ini.
                              </p>

                              {selectedSubForAction.editor_notes && (
                                <div className="bg-white/90 p-3 rounded-xl border border-amber-200 text-xs text-slate-700">
                                  <span className="font-bold text-amber-900 block text-[10px] uppercase mb-0.5">
                                    Catatan Pengantar dari Editor:
                                  </span>
                                  "{selectedSubForAction.editor_notes}"
                                </div>
                              )}

                              <div className="flex flex-wrap items-center gap-3 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleRespondReviewInvitation(selectedSubForAction.id, 'accept')}
                                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2"
                                >
                                  ✅ Terima Undangan &amp; Mulai Review
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowDeclineForm((prev) => !prev)}
                                  className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2"
                                >
                                  ❌ Tolak Undangan Review
                                </button>
                              </div>

                              {showDeclineForm && (
                                <div className="bg-white p-4 rounded-xl border border-rose-200 space-y-3 mt-2">
                                  <div className="text-xs font-extrabold text-rose-800">
                                    Alasan Menolak Undangan Penelaahan (Dikirim ke Admin/Editor):
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {declinePresets.map((preset) => (
                                      <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setDeclineReason(preset)}
                                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                                          declineReason === preset
                                            ? 'bg-rose-600 text-white border-rose-600'
                                            : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                                        }`}
                                      >
                                        {preset}
                                      </button>
                                    ))}
                                  </div>
                                  <textarea
                                    value={declineReason}
                                    onChange={(e) => setDeclineReason(e.target.value)}
                                    placeholder="Tuliskan alasan penolakan Anda secara singkat agar Editor dapat menunjuk Mitra Bestari pengganti..."
                                    className="w-full bg-slate-50 border border-rose-200 rounded-xl p-3 text-xs h-20 outline-none focus:border-rose-400"
                                  />
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowDeclineForm(false);
                                        setDeclineReason('');
                                      }}
                                      className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                                    >
                                      Batal
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRespondReviewInvitation(selectedSubForAction.id, 'decline')}
                                      className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs cursor-pointer"
                                    >
                                      🚫 Kirim Penolakan Undangan
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* STATE 2: SEDANG MENELAAH (FORM LEMBAR EVALUASI AKTIF) */}
                          {canReviewNow && (
                            <div className="bg-[#FDF7F7] p-5 rounded-2xl border border-blue-200 space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#7A2222] flex items-center gap-2">
                                  <CheckSquare size={16} className="text-[#7A2222]" />
                                  Lembar Evaluasi Sejawat — {currentUser?.name}
                                </h4>
                                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-[#7A2222] border border-blue-300">
                                  UNDANGAN DITERIMA • SIAP DINILAI
                                </span>
                              </div>

                              {selectedSubForAction.editor_notes && (
                                <div className="bg-white/90 p-3 rounded-xl border border-[#7A2222]/15 text-xs text-slate-600">
                                  <span className="font-bold text-[#7A2222] block text-[10px] uppercase mb-0.5">
                                    Catatan Pengantar dari Editor:
                                  </span>
                                  "{selectedSubForAction.editor_notes}"
                                </div>
                              )}

                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Orisinalitas (1-100)
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={reviewScores.score_originality}
                                    onChange={(e) =>
                                      setReviewScores({ ...reviewScores, score_originality: Number(e.target.value) })
                                    }
                                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-extrabold text-center"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Metodologi (1-100)
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={reviewScores.score_methodology}
                                    onChange={(e) =>
                                      setReviewScores({ ...reviewScores, score_methodology: Number(e.target.value) })
                                    }
                                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-extrabold text-center"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Relevansi (1-100)
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={reviewScores.score_relevance}
                                    onChange={(e) =>
                                      setReviewScores({ ...reviewScores, score_relevance: Number(e.target.value) })
                                    }
                                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-sm font-extrabold text-center"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                  Komentar &amp; Masukan Substansi untuk Penulis *
                                </label>
                                <textarea
                                  value={reviewScores.comments}
                                  onChange={(e) =>
                                    setReviewScores({ ...reviewScores, comments: e.target.value })
                                  }
                                  placeholder="Tuliskan hasil telaah metodologi, kebaruan riset, dan bagian yang perlu diperbaiki..."
                                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs h-24 outline-none"
                                />
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <label className="text-xs font-bold text-slate-700">Rekomendasi:</label>
                                  <select
                                    value={reviewScores.decision}
                                    onChange={(e) =>
                                      setReviewScores({ ...reviewScores, decision: e.target.value })
                                    }
                                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-extrabold"
                                  >
                                    <option value="accept">✅ Terima Naskah (Accept Submission)</option>
                                    <option value="revise">⚠️ Perlu Revisi (Revisions Required)</option>
                                    <option value="reject">❌ Tolak Naskah (Decline Submission)</option>
                                  </select>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleSubmitPeerReview(selectedSubForAction.id)}
                                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                                >
                                  Simpan Keputusan Peer-Review
                                </button>
                              </div>

                              {/* Opsi Pengunduran Diri jika ternyata ada Conflict of Interest / Berhalangan */}
                              <div className="pt-3 border-t border-blue-200/80">
                                <button
                                  type="button"
                                  onClick={() => setShowDeclineForm((prev) => !prev)}
                                  className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer"
                                >
                                  {showDeclineForm
                                    ? '▲ Tutup form pembatalan kesediaan review'
                                    : 'Berhalangan melanjutkan atau menemukan Conflict of Interest? Tolak / Mundur dari Review ini'}
                                </button>

                                {showDeclineForm && (
                                  <div className="bg-white p-3.5 rounded-xl border border-rose-200 space-y-2.5 mt-2">
                                    <div className="flex flex-wrap gap-1.5">
                                      {declinePresets.map((preset) => (
                                        <button
                                          key={preset}
                                          type="button"
                                          onClick={() => setDeclineReason(preset)}
                                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                                            declineReason === preset
                                              ? 'bg-rose-600 text-white border-rose-600'
                                              : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                                          }`}
                                        >
                                          {preset}
                                        </button>
                                      ))}
                                    </div>
                                    <textarea
                                      value={declineReason}
                                      onChange={(e) => setDeclineReason(e.target.value)}
                                      placeholder="Tuliskan alasan Anda mengundurkan diri dari penelaahan naskah ini..."
                                      className="w-full bg-slate-50 border border-rose-200 rounded-xl p-2.5 text-xs h-16 outline-none"
                                    />
                                    <div className="flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() => handleRespondReviewInvitation(selectedSubForAction.id, 'decline')}
                                        className="px-4 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs cursor-pointer"
                                      >
                                        🚫 Konfirmasi Mundur / Tolak Review
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* STATE 3: BERHASIL DIREVIEW (TAMPILAN KONFIRMASI SUKSES & RINGKASAN SKOR) */}
                          {isCompleted && (
                            <div className="bg-emerald-50/80 p-5 rounded-2xl border-2 border-emerald-300 space-y-4 text-xs">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                    <CheckCircle2 size={22} />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-extrabold text-emerald-950">
                                      ✅ Naskah Berhasil Anda Review!
                                    </h4>
                                    <p className="text-[11px] text-emerald-800 mt-0.5">
                                      Terima kasih, <strong>{currentUser?.name}</strong>. Hasil evaluasi sejawat Anda telah tercatat resmi di sistem.
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className={`px-3 py-1 rounded-full font-extrabold text-[10px] border ${
                                    myReview.decision === 'accept'
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                      : myReview.decision === 'revise'
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : 'bg-rose-100 text-rose-900 border-rose-300'
                                  }`}>
                                    Rekomendasi Anda:{' '}
                                    {myReview.decision === 'accept'
                                      ? 'DITERIMA (ACCEPT)'
                                      : myReview.decision === 'revise'
                                      ? 'PERLU REVISI'
                                      : 'DITOLAK (REJECT)'}
                                  </span>
                                  {avgScore && (
                                    <span className="text-[11px] font-extrabold text-emerald-900">
                                      Rata-rata Skor: {avgScore} / 100
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* 3 Kartu Skor */}
                              <div className="grid grid-cols-3 gap-2.5">
                                <div className="bg-white p-2.5 rounded-xl text-center border border-emerald-200">
                                  <span className="text-[10px] text-slate-400 font-bold block">Orisinalitas</span>
                                  <strong className="text-base text-[#7A2222]">{myReview.score_originality ?? '-'}</strong>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl text-center border border-emerald-200">
                                  <span className="text-[10px] text-slate-400 font-bold block">Metodologi</span>
                                  <strong className="text-base text-[#7A2222]">{myReview.score_methodology ?? '-'}</strong>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl text-center border border-emerald-200">
                                  <span className="text-[10px] text-slate-400 font-bold block">Relevansi</span>
                                  <strong className="text-base text-[#7A2222]">{myReview.score_relevance ?? '-'}</strong>
                                </div>
                              </div>

                              {/* Catatan Evaluasi yang Dikirim */}
                              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-1">
                                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                                  Catatan Evaluasi yang Anda Kirim:
                                </span>
                                <p className="italic text-slate-700 leading-relaxed">"{myReview.comments}"</p>
                              </div>

                              {/* Info Lanjutan Progress Naskah */}
                              <div className="bg-white/90 p-3.5 rounded-xl border border-blue-200 space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-extrabold text-[#7A2222]">
                                  <span>📌 Status Naskah Saat Ini:</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] border ${(STATUS_BADGE[selectedSubForAction.status] || STATUS_BADGE.pending).bg}`}>
                                    {(STATUS_BADGE[selectedSubForAction.status] || STATUS_BADGE.pending).label} ({subProgress.percent}%)
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${subProgress.barColor}`}
                                    style={{ width: `${subProgress.percent}%` }}
                                  />
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">{subProgress.summary}</p>
                              </div>
                            </div>
                          )}

                          {/* STATE 4: REVIEWER MENOLAK UNDANGAN REVIEW */}
                          {isDeclined && (
                            <div className="bg-rose-50/80 p-5 rounded-2xl border-2 border-rose-200 space-y-3 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h4 className="text-sm font-extrabold text-rose-900 flex items-center gap-2">
                                  <span>🚫</span> Anda Telah Menolak Undangan Penelaahan Ini
                                </h4>
                                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                                  DECLINED BY REVIEWER
                                </span>
                              </div>
                              <p className="text-rose-800 leading-relaxed">
                                Keputusan penolakan Anda telah disampaikan kepada Admin / Chief Editor agar dapat menunjuk Mitra Bestari pengganti. Anda tidak lagi dibebani penelaahan untuk naskah ini.
                              </p>
                              <div className="bg-white p-3.5 rounded-xl border border-rose-200 space-y-1">
                                <span className="text-[10px] font-extrabold uppercase text-rose-700 block">
                                  Alasan Penolakan yang Anda Kirim:
                                </span>
                                <p className="italic text-slate-700">"{myReview.comments || '-'}"</p>
                              </div>
                            </div>
                          )}

                          {/* FALLBACK: NASKAH SUDAH TIDAK UNDER_REVIEW TAPI REVIEWER BELUM MENYELESAIKAN */}
                          {!canRespondInvite && !canReviewNow && !isCompleted && !isDeclined && (
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <h4 className="font-extrabold uppercase tracking-wider text-slate-700">
                                  Status Naskah ({currentUser?.name})
                                </h4>
                                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${(STATUS_BADGE[selectedSubForAction.status] || STATUS_BADGE.pending).bg}`}>
                                  {(STATUS_BADGE[selectedSubForAction.status] || STATUS_BADGE.pending).label}
                                </span>
                              </div>
                              <p className="text-slate-600 leading-relaxed">{subProgress.summary}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 6: MANAJEMEN PENGGUNA (KHUSUS ADMIN/EDITOR)
           =================================================================== */}
        {activeTab === 'users' && isAdminOrEditor && (
          <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-extrabold text-slate-800">
                  Manajemen Pengguna &amp; Mitra Bestari
                </h3>
                <p className="text-xs text-slate-500">
                  Kelola akun Admin, Editor, Reviewer (Mitra Bestari), dan Penulis yang terdaftar di database portal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-2 bg-[#7A2222] hover:bg-[#661B1B] active:scale-[0.98] text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-[0_12px_26px_-8px_rgba(122,34,34,0.52)] transition cursor-pointer"
              >
                <UserPlus size={16} /> + Tambah Pengguna / Reviewer
              </button>
            </div>

            <div className="card-luxury rounded-[28px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FDF7F7] text-slate-700 font-extrabold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3">ID</th>
                      <th className="p-3">Nama &amp; Email</th>
                      <th className="p-3">Peran (Role)</th>
                      <th className="p-3">Afiliasi &amp; Keahlian</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(stats.users || []).map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70">
                        <td className="p-3 font-mono font-bold text-slate-400">#{u.id}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{u.name}</div>
                          <div className="text-[11px] text-slate-500">{u.email}</div>
                        </td>
                        <td className="p-3">
                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                            u.role === 'admin'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : u.role === 'editor'
                              ? 'bg-blue-50 text-[#7A2222] border-blue-200'
                              : u.role === 'reviewer'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="text-slate-700 font-medium">{u.affiliation || '-'}</div>
                          {u.specialty && <div className="text-[11px] text-slate-400">{u.specialty}</div>}
                        </td>
                        <td className="p-3 text-right">
                          {String(u.id) === String(currentUser?.id) ? (
                            <span className="text-[11px] text-emerald-600 font-bold">Akun Aktif</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[11px] cursor-pointer"
                            >
                              <Trash2 size={11} /> Hapus
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>

      {/* =====================================================================
          MODAL DETAIL NASKAH LENGKAP & ALUR REVISI
          ===================================================================== */}
      {detailSubmission && (
        <div className="fixed inset-0 z-50 bg-[#1a0909]/55 backdrop-blur-md flex items-center justify-center p-4 animate-backdrop-fade">
          <div className="bg-white rounded-[32px] max-w-2xl w-full p-6 sm:p-8 shadow-[0_36px_90px_-20px_rgba(28,10,10,0.45)] border border-white/80 space-y-4 max-h-[90vh] overflow-y-auto animate-modal-pop">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#FEF2F2] text-[#7A2222] font-bold text-xs border border-[#7A2222]/20">
                  {detailSubmission.journal?.title}
                </span>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${(STATUS_BADGE[detailSubmission.status] || STATUS_BADGE.pending).bg}`}>
                  {(STATUS_BADGE[detailSubmission.status] || STATUS_BADGE.pending).label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetailSubmission(null);
                  setRevisionFile(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Progress Tracker 5 Tahap Real-Time */}
            {renderWorkflowProgressBar(detailSubmission)}

            <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
              {detailSubmission.title}
            </h3>

            <div className="text-xs text-slate-500">
              Penulis: <strong>{detailSubmission.author?.name}</strong>
              {detailSubmission.co_authors ? `, ${detailSubmission.co_authors}` : ''}
            </div>

            {detailSubmission.doi && (
              <div className="text-xs font-mono text-[#7A2222] bg-[#FEF2F2] p-2 rounded-lg">
                DOI: {detailSubmission.doi}
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed max-h-40 overflow-y-auto">
              <div className="font-bold text-slate-900 mb-1">Abstrak:</div>
              {detailSubmission.abstract}
            </div>

            {/* Kotak Catatan Evaluasi Reviewer (HANYA review selesai — TIDAK menampilkan alasan penolakan undangan reviewer ke Penulis) */}
            {(() => {
              const completedReviews = (detailSubmission.reviews || []).filter(
                (r) => r.status === 'completed' && !!r.decision && r.comments
              );
              if (completedReviews.length === 0) return null;
              return (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 font-extrabold text-amber-900">
                    <Clock size={15} />
                    <span>Catatan &amp; Masukan Evaluasi Mitra Bestari ({completedReviews.length} Reviewer):</span>
                  </div>
                  {completedReviews.map((r, i) => (
                    <div key={r.id || i} className="text-slate-700 bg-white p-3 rounded-xl border border-amber-100 space-y-1.5 leading-relaxed">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-[#7A2222]">
                          {isAdminOrEditor && r.reviewer?.name ? r.reviewer.name : `Mitra Bestari #${i + 1} (Anonim)`}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                          r.decision === 'accept'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.decision === 'revise'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {r.decision === 'accept' ? '✅ Diterima' : r.decision === 'revise' ? '⚠️ Perlu Revisi' : '❌ Ditolak'}
                        </span>
                      </div>
                      <p className="italic">"{r.comments}"</p>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Panel Khusus Penulis Pemilik Naskah: Unggah Berkas Naskah Revisi */}
            {isAuthor && String(detailSubmission.author_id) === String(currentUser?.id) && detailSubmission.status === 'revision_required' && (
              <div className="bg-[#FEF2F2] border-2 border-dashed border-[#7A2222] rounded-2xl p-4 space-y-3">
                <div className="text-xs font-extrabold text-[#7A2222] flex items-center gap-2">
                  <FileUp size={16} />
                  <span>Unggah Berkas Naskah Revisi (Perbaikan)</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Perbaiki dokumen Anda sesuai catatan reviewer di atas, lalu unggah file hasil perbaikan (PDF/DOCX) ke sini.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setRevisionFile(e.target.files?.[0] || null)}
                    className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#7A2222] file:text-white hover:file:bg-[#661B1B] cursor-pointer"
                  />
                  <button
                    type="button"
                    disabled={uploadingRevision || !revisionFile}
                    onClick={() => handleUploadRevision(detailSubmission.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {uploadingRevision ? 'Mengunggah...' : '📤 Kirim Revisi ke Reviewer'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {(isAdminOrEditor || (isAuthor && String(detailSubmission.author_id) === String(currentUser?.id))) && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(detailSubmission)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-[#7A2222] font-bold text-xs cursor-pointer"
                  >
                    <Edit3 size={13} /> Edit Judul &amp; Penulis
                  </button>
                )}
                {(isAdminOrEditor || (isAuthor && String(detailSubmission.author_id) === String(currentUser?.id) && detailSubmission.status === 'pending')) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSubmission(detailSubmission)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 font-bold text-xs cursor-pointer"
                  >
                    <Trash2 size={13} /> Hapus Naskah
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDetailSubmission(null);
                    setRevisionFile(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Tutup
                </button>
                {detailSubmission.file_path && (() => {
                  const myModalRev = isReviewer
                    ? (detailSubmission.reviews || []).find((r) => String(r.reviewer_id) === String(currentUser?.id))
                    : null;
                  const canOpenModalFile =
                    !isReviewer ||
                    detailSubmission.status === 'published' ||
                    (myModalRev && myModalRev.status !== 'assigned' && myModalRev.status !== 'declined');
                  if (!canOpenModalFile) return null;
                  return (
                    <a
                      href={resolveFileUrl(detailSubmission.file_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2 rounded-xl bg-[#7A2222] hover:bg-[#661B1B] text-white font-bold text-xs"
                    >
                      Buka File Naskah
                    </a>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL EDIT METADATA NASKAH (JUDUL, PENULIS, ABSTRAK)
          ===================================================================== */}
      {editSubmissionModal && (
        <div className="fixed inset-0 z-50 bg-[#1a0909]/55 backdrop-blur-md flex items-center justify-center p-4 animate-backdrop-fade">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-6 sm:p-8 shadow-[0_36px_90px_-20px_rgba(28,10,10,0.45)] border border-white/80 space-y-4 animate-modal-pop">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Edit3 size={18} className="text-[#7A2222]" /> Edit Judul &amp; Penulis Naskah
                </h3>
                <p className="text-xs text-slate-500">
                  Perbarui informasi naskah #{editSubmissionModal.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditSubmissionModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmission} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Judul Naskah *</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#7A2222]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Penulis Tambahan / Co-Authors (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Balanza Aryandi, Dr. Muhammad Ikbal"
                  value={editForm.co_authors}
                  onChange={(e) => setEditForm({ ...editForm, co_authors: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#7A2222]"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Pisahkan dengan koma jika lebih dari satu penulis.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kata Kunci (Keywords)</label>
                <input
                  type="text"
                  value={editForm.keywords}
                  onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#7A2222]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Abstrak *</label>
                <textarea
                  rows={4}
                  required
                  value={editForm.abstract}
                  onChange={(e) => setEditForm({ ...editForm, abstract: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#7A2222] leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditSubmissionModal(null)}
                  className="px-5 py-2 rounded-full border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2 rounded-full bg-[#7A2222] hover:bg-[#661B1B] text-white font-bold shadow-[0_10px_22px_-8px_rgba(122,34,34,0.5)] transition cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL TAMBAH JURNAL BARU (MULTI-JOURNAL PROOF)
          ===================================================================== */}
      {showAddJournalModal && (
        <div className="fixed inset-0 z-50 bg-[#1a0909]/55 backdrop-blur-md flex items-center justify-center p-4 animate-backdrop-fade">
          <div className="bg-white rounded-[32px] max-w-xl w-full p-6 sm:p-8 shadow-[0_36px_90px_-20px_rgba(28,10,10,0.45)] border border-white/80 space-y-4 animate-modal-pop">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Tambah Jurnal Baru ke Portal BRIDA
                </h3>
                <p className="text-xs text-slate-500">
                  Jurnal baru akan langsung aktif dan muncul di katalog publik OJS.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddJournalModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJournal} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Unik URL</label>
                  <input
                    type="text"
                    value={newJournal.code}
                    onChange={(e) => setNewJournal({ ...newJournal, code: e.target.value })}
                    placeholder="misal: j-sintesa"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Singkatan Jurnal</label>
                  <input
                    type="text"
                    value={newJournal.abbreviation}
                    onChange={(e) => setNewJournal({ ...newJournal, abbreviation: e.target.value })}
                    placeholder="misal: J-SINTESA"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama / Judul Lengkap Jurnal</label>
                <input
                  type="text"
                  value={newJournal.title}
                  onChange={(e) => setNewJournal({ ...newJournal, title: e.target.value })}
                  placeholder="misal: Jurnal Sains, Inovasi, dan Teknologi Daerah"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">P-ISSN (Cetak)</label>
                  <input
                    type="text"
                    value={newJournal.issn_print}
                    onChange={(e) => setNewJournal({ ...newJournal, issn_print: e.target.value })}
                    placeholder="2899-001X"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">E-ISSN (Online)</label>
                  <input
                    type="text"
                    value={newJournal.issn_online}
                    onChange={(e) => setNewJournal({ ...newJournal, issn_online: e.target.value })}
                    placeholder="2899-0028"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  value={newJournal.description}
                  onChange={(e) => setNewJournal({ ...newJournal, description: e.target.value })}
                  placeholder="Fokus dan ruang lingkup jurnal..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddJournalModal(false)}
                  className="px-5 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full bg-[#7A2222] hover:bg-[#661B1B] text-white text-xs font-bold shadow-[0_10px_22px_-8px_rgba(122,34,34,0.5)] transition cursor-pointer"
                >
                  Simpan Jurnal Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL TAMBAH PENGGUNA / REVIEWER BARU (KHUSUS ADMIN)
          ===================================================================== */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-[#1a0909]/55 backdrop-blur-md flex items-center justify-center p-4 animate-backdrop-fade">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-6 sm:p-8 shadow-[0_36px_90px_-20px_rgba(28,10,10,0.45)] border border-white/80 space-y-4 animate-modal-pop">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <UserPlus size={18} className="text-[#7A2222]" /> Tambah Pengguna Baru
                </h3>
                <p className="text-xs text-slate-500">
                  Buat akun baru untuk Admin, Editor, Mitra Bestari (Reviewer), atau Penulis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap &amp; Gelar *</label>
                <input
                  type="text"
                  required
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  placeholder="Contoh: Dr. Rahmat Hidayat, M.Si."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    placeholder="nama@instansi.ac.id"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peran (Role) *</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white"
                  >
                    <option value="reviewer">Reviewer (Mitra Bestari)</option>
                    <option value="author">Author (Penulis)</option>
                    <option value="editor">Editor Jurnal</option>
                    <option value="admin">Admin Portal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kata Sandi (Min. 6 karakter) *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  placeholder="Masukkan kata sandi akun"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Afiliasi / Instansi</label>
                  <input
                    type="text"
                    value={newUserForm.affiliation}
                    onChange={(e) => setNewUserForm({ ...newUserForm, affiliation: e.target.value })}
                    placeholder="UNHAS / BRIDA Makassar"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bidang Keahlian</label>
                  <input
                    type="text"
                    value={newUserForm.specialty}
                    onChange={(e) => setNewUserForm({ ...newUserForm, specialty: e.target.value })}
                    placeholder="Smart City / Kebijakan Publik"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#7A2222] hover:bg-[#661B1B] text-white font-bold cursor-pointer"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
