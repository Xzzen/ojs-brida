import React, { useState, useEffect } from 'react';
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
  Send, X, RefreshCw, ChevronRight, Globe, Lock
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api';

const ROLE_OPTIONS = [
  {
    role: 'admin',
    label: 'Chief Editor / Admin',
    name: 'Dr. Ir. H. Andi Syahrul, M.Si.',
    email: 'admin@brida.go.id',
    affiliation: 'Kepala Dewan Redaksi — BRIDA Kota Makassar'
  },
  {
    role: 'reviewer',
    label: 'Reviewer (Mitra Bestari)',
    name: 'Prof. Dr. Eng. Azwan Alghifari, M.T.',
    email: 'reviewer@brida.go.id',
    affiliation: 'Departemen Teknik Informatika — UNHAS'
  },
  {
    role: 'author',
    label: 'Author (Penulis)',
    name: 'Balanza Aryandi Datu Hari Putra',
    email: 'author@brida.com',
    affiliation: 'Peneliti — Universitas Hasanuddin'
  }
];

const STATUS_BADGE = {
  pending: { label: 'MENUNGGU EDITOR', bg: 'bg-amber-100 text-amber-800 border-amber-300' },
  under_review: { label: 'SEDANG DIREVIEW', bg: 'bg-blue-100 text-blue-800 border-blue-300' },
  revision_required: { label: 'PERLU REVISI', bg: 'bg-orange-100 text-orange-800 border-orange-300' },
  accepted: { label: 'DISETUJUI (ACCEPTED)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  published: { label: 'TERBIT (PUBLISHED)', bg: 'bg-purple-100 text-purple-800 border-purple-300' },
  rejected: { label: 'DITOLAK', bg: 'bg-red-100 text-red-800 border-red-300' }
};

const JOURNAL_THEME = {
  red: {
    border: 'border-red-700',
    bgHeader: 'from-red-900 via-red-800 to-red-700',
    badge: 'bg-red-100 text-red-800 border-red-200',
    btn: 'bg-red-800 hover:bg-red-900 text-white'
  },
  blue: {
    border: 'border-blue-700',
    bgHeader: 'from-blue-900 via-blue-800 to-indigo-800',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    btn: 'bg-blue-800 hover:bg-blue-900 text-white'
  },
  emerald: {
    border: 'border-emerald-700',
    bgHeader: 'from-emerald-900 via-emerald-800 to-teal-800',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    btn: 'bg-emerald-800 hover:bg-emerald-900 text-white'
  },
  amber: {
    border: 'border-amber-600',
    bgHeader: 'from-amber-800 via-amber-700 to-orange-700',
    badge: 'bg-amber-100 text-amber-900 border-amber-200',
    btn: 'bg-amber-700 hover:bg-amber-800 text-white'
  }
};

export default function Dashboard({ currentUser, onChangeRole, initialTab = 'portal', onLogout }) {
  const [activeTab, setActiveTab] = useState(initialTab);
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

  // Form Unggah Naskah Baru (Multi-Journal)
  const [formJournalId, setFormJournalId] = useState('');
  const [section, setSection] = useState('Original Research');
  const [title, setTitle] = useState('');
  const [coAuthors, setCoAuthors] = useState('');
  const [keywords, setKeywords] = useState('');
  const [abstract, setAbstract] = useState('');
  const [file, setFile] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

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

  // State Form Evaluasi / Editorial
  const [selectedSubForAction, setSelectedSubForAction] = useState(null);
  const [assignReviewerId, setAssignReviewerId] = useState('');
  const [editorNotes, setEditorNotes] = useState('');
  const [reviewScores, setReviewScores] = useState({
    score_originality: 88,
    score_methodology: 85,
    score_relevance: 90,
    comments: '',
    decision: 'accept'
  });

  const isAdminOrEditor = currentUser?.role === 'admin' || currentUser?.role === 'editor';
  const isReviewer = currentUser?.role === 'reviewer';
  const isAuthor = currentUser?.role === 'author';

  const fetchAllData = async (jId = selectedJournalId) => {
    setLoading(true);
    try {
      const [resJournals, resSubs, resStats] = await Promise.all([
        axios.get(`${API_BASE}/journals`),
        axios.get(`${API_BASE}/submissions`, {
          params: { journal_id: jId }
        }),
        axios.get(`${API_BASE}/stats`, {
          params: { journal_id: jId }
        })
      ]);

      const jList = resJournals.data?.data || [];
      setJournals(jList);
      if (!formJournalId && jList.length > 0) {
        setFormJournalId(String(jList[0].id));
      }

      const subList = resSubs.data?.data || [];
      setSubmissions(subList);

      if (resStats.data) {
        setStats(resStats.data);
        if (!assignReviewerId && resStats.data.reviewers?.length > 0) {
          setAssignReviewerId(String(resStats.data.reviewers[0].id));
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data API:', err);
      toast.error('Gagal terhubung ke server API Laravel (Port 8000).');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData(selectedJournalId);
  }, [selectedJournalId]);

  // Filter daftar naskah secara reaktif
  const filteredSubmissions = submissions.filter((sub) => {
    const matchStatus = statusFilter === 'all' || sub.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      sub.title?.toLowerCase().includes(q) ||
      sub.abstract?.toLowerCase().includes(q) ||
      sub.keywords?.toLowerCase().includes(q) ||
      sub.co_authors?.toLowerCase().includes(q) ||
      sub.doi?.toLowerCase().includes(q) ||
      sub.journal?.abbreviation?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // Handler Unggah Naskah Baru ke Jurnal Tujuan
  const handleSubmitManuscript = async (e) => {
    e.preventDefault();
    if (!formJournalId) {
      toast.error('Pilih Jurnal Tujuan terlebih dahulu!');
      return;
    }
    if (!file) {
      toast.error('Harap pilih berkas dokumen naskah (PDF/DOC/DOCX)!');
      return;
    }

    setSubmitLoading(true);
    const formData = new FormData();
    formData.append('journal_id', formJournalId);
    formData.append('section', section);
    formData.append('title', title);
    formData.append('co_authors', coAuthors);
    formData.append('keywords', keywords);
    formData.append('abstract', abstract);
    formData.append('file', file);

    toast
      .promise(
        axios.post(`${API_BASE}/submissions`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }),
        {
          loading: 'Mengunggah naskah & memvalidasi keamanan dokumen...',
          success: () => {
            setTitle('');
            setCoAuthors('');
            setKeywords('');
            setAbstract('');
            setFile(null);
            setActiveTab('dashboard');
            fetchAllData(selectedJournalId);
            return <b>Naskah berhasil dikirim ke Jurnal tujuan!</b>;
          },
          error: <b>Gagal mengunggah file. Pastikan format PDF/DOCX di bawah 10MB.</b>
        }
      )
      .finally(() => setSubmitLoading(false));
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

  // Handler Assign Reviewer (Oleh Editor/Admin)
  const handleAssignReviewer = async (submissionId) => {
    if (!assignReviewerId) {
      toast.error('Pilih Reviewer terlebih dahulu!');
      return;
    }
    try {
      await axios.post(`${API_BASE}/submissions/${submissionId}/assign-reviewer`, {
        reviewer_id: assignReviewerId,
        editor_notes: editorNotes
      });
      toast.success('Reviewer berhasil ditugaskan! Status berubah menjadi SEDANG DIREVIEW.');
      setEditorNotes('');
      setSelectedSubForAction(null);
      fetchAllData(selectedJournalId);
    } catch (err) {
      toast.error('Gagal menugaskan reviewer.');
    }
  };

  // Handler Submit Evaluasi Peer-Review (Oleh Reviewer)
  const handleSubmitPeerReview = async (submissionId) => {
    if (!reviewScores.comments.trim()) {
      toast.error('Mohon isi catatan evaluasi peer-review terlebih dahulu.');
      return;
    }
    try {
      await axios.post(`${API_BASE}/submissions/${submissionId}/review`, {
        ...reviewScores
      });
      toast.success('Keputusan & Skor Peer-Review berhasil disimpan!');
      setReviewScores({
        score_originality: 88,
        score_methodology: 85,
        score_relevance: 90,
        comments: '',
        decision: 'accept'
      });
      setSelectedSubForAction(null);
      fetchAllData(selectedJournalId);
    } catch (err) {
      toast.error('Gagal menyimpan evaluasi review.');
    }
  };

  // Handler Publish Naskah & Generate DOI (Oleh Editor/Admin)
  const handlePublishArticle = async (submissionId) => {
    try {
      await axios.post(`${API_BASE}/submissions/${submissionId}/publish`);
      toast.success('Artikel resmi diterbitkan ke edisi jurnal beserta Nomor DOI!');
      setSelectedSubForAction(null);
      fetchAllData(selectedJournalId);
    } catch (err) {
      toast.error('Gagal menerbitkan artikel.');
    }
  };

  // Data Grafik Pie Status
  const pieData = [
    { name: 'Pending', value: stats.pending },
    { name: 'Under Review', value: stats.under_review },
    { name: 'Perlu Revisi', value: stats.revision_required },
    { name: 'Accepted', value: stats.accepted },
    { name: 'Published', value: stats.published }
  ].filter((d) => d.value > 0);
  const PIE_COLORS = ['#f59e0b', '#3b82f6', '#f97316', '#10b981', '#8b5cf6'];

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

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-800">
      <Toaster position="top-right" />

      {/* SIDEBAR NAVIGASI MULTI-JOURNAL */}
      <aside className="w-72 bg-gradient-to-b from-red-950 via-red-900 to-slate-900 text-white flex flex-col shadow-2xl shrink-0">
        {/* Brand Header */}
        <div className="p-6 border-b border-white/10 flex items-center gap-3.5">
          <div className="bg-red-600 p-2.5 rounded-xl shadow-inner border border-red-400/40">
            <Building2 size={26} className="text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-wide leading-none">OJS BRIDA</h1>
            <p className="text-[11px] text-red-200 font-semibold tracking-wider uppercase mt-1">
              Multi-Journal Portal
            </p>
          </div>
        </div>

        {/* Multi-Journal Context Switcher inside Sidebar */}
        <div className="px-5 pt-5 pb-3 border-b border-white/10">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-red-200 mb-2 flex items-center gap-1.5">
            <Layers size={13} /> Konteks Jurnal Aktif:
          </label>
          <select
            value={selectedJournalId}
            onChange={(e) => setSelectedJournalId(e.target.value)}
            className="w-full bg-black/30 border border-white/20 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-red-400 cursor-pointer"
          >
            <option value="all" className="text-slate-900 font-bold">
              🌐 Semua Jurnal ({journals.length} Jurnal)
            </option>
            {journals.map((j) => (
              <option key={j.id} value={j.id} className="text-slate-900 font-semibold">
                📘 {j.abbreviation} — {j.accreditation}
              </option>
            ))}
          </select>
        </div>

        {/* Main Navigation (Menyesuaikan Hak Akses RBAC) */}
        <nav className="flex-1 p-4 space-y-1.5">
          <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-red-300/80">
            Menu Akses ({currentUser?.label})
          </p>

          <button
            onClick={() => {
              setActiveTab('portal');
              setPortalSelectedJournal(null);
            }}
            className={`w-full flex items-center justify-between py-3 px-4 rounded-xl text-sm font-bold transition cursor-pointer ${
              activeTab === 'portal'
                ? 'bg-white text-red-900 shadow-lg'
                : 'text-red-100 hover:bg-white/10'
            }`}
          >
            <span className="flex items-center gap-3">
              <Globe size={18} /> Portal Publik Jurnal
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-700 text-white">
              {journals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center justify-between py-3 px-4 rounded-xl text-sm font-bold transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-white text-red-900 shadow-lg'
                : 'text-red-100 hover:bg-white/10'
            }`}
          >
            <span className="flex items-center gap-3">
              <LayoutDashboard size={18} />
              {isAuthor ? 'Dasbor Naskah Saya' : 'Dasbor & Analitik'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white">
              {stats.total}
            </span>
          </button>

          {/* Menu Manajemen Multi-Jurnal khusus Admin/Editor */}
          {isAdminOrEditor && (
            <button
              onClick={() => setActiveTab('journals')}
              className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-bold transition cursor-pointer ${
                activeTab === 'journals'
                  ? 'bg-white text-red-900 shadow-lg'
                  : 'text-red-100 hover:bg-white/10'
              }`}
            >
              <BookOpen size={18} /> Manajemen Multi-Jurnal
            </button>
          )}

          {/* Menu Unggah Naskah Baru untuk Author & Admin */}
          {(isAuthor || isAdminOrEditor) && (
            <button
              onClick={() => setActiveTab('unggah')}
              className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-bold transition cursor-pointer ${
                activeTab === 'unggah'
                  ? 'bg-white text-red-900 shadow-lg'
                  : 'text-red-100 hover:bg-white/10'
              }`}
            >
              <FileUp size={18} /> + Unggah Naskah Baru
            </button>
          )}

          {/* Menu Evaluasi & Editorial khusus Reviewer & Admin/Editor */}
          {(isReviewer || isAdminOrEditor) && (
            <button
              onClick={() => setActiveTab('review')}
              className={`w-full flex items-center justify-between py-3 px-4 rounded-xl text-sm font-bold transition cursor-pointer ${
                activeTab === 'review'
                  ? 'bg-white text-red-900 shadow-lg'
                  : 'text-red-100 hover:bg-white/10'
              }`}
            >
              <span className="flex items-center gap-3">
                <CheckSquare size={18} />
                {isReviewer ? 'Meja Evaluasi Review' : 'Evaluasi & Editorial'}
              </span>
              {(stats.pending + stats.under_review) > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold">
                  {stats.pending + stats.under_review}
                </span>
              )}
            </button>
          )}
        </nav>

        {/* RBAC Role Info Box at Bottom of Sidebar */}
        <div className="p-4 m-4 rounded-2xl bg-black/30 border border-white/10 text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <ShieldCheck size={16} />
            <span>RBAC: {currentUser?.role?.toUpperCase()}</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {isAdminOrEditor && 'Akses Penuh: Kelola Multi-Jurnal, Tugaskan Reviewer, & Terbitkan DOI.'}
            {isReviewer && 'Akses Mitra Bestari: Evaluasi substansi naskah & beri rekomendasi keputusan.'}
            {isAuthor && 'Akses Penulis: Pilih jurnal tujuan, unggah naskah PDF, & pantau status review.'}
          </p>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* TOPBAR HEADER */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex flex-wrap justify-between items-center gap-4 sticky top-0 z-20 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-extrabold text-slate-800">
                Sistem Inovasi OJS
              </h2>
              <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-red-50 text-red-800 border border-red-200">
                {activeJournalObj ? activeJournalObj.abbreviation : 'Portal Multi-Journal BRIDA'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Login Aktif: <strong className="text-slate-800">{currentUser?.name}</strong> ({currentUser?.label})
            </p>
          </div>

          {/* Instant Role Switcher for Live Demo + Logout */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 px-2.5">Ganti Peran (Demo RBAC):</span>
              {ROLE_OPTIONS.map((r) => {
                const isCurr = currentUser?.role === r.role;
                return (
                  <button
                    key={r.role}
                    onClick={() => {
                      onChangeRole(r);
                      if (r.role === 'author' && (activeTab === 'review' || activeTab === 'journals')) {
                        setActiveTab('dashboard');
                      }
                      if (r.role === 'reviewer' && (activeTab === 'unggah' || activeTab === 'journals')) {
                        setActiveTab('review');
                      }
                      toast.success(`Hak akses diubah menjadi: ${r.label}`);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      isCurr
                        ? 'bg-red-800 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r.role === 'admin' ? 'Editor/Admin' : r.role === 'reviewer' ? 'Reviewer' : 'Author'}
                  </button>
                );
              })}
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-red-50 text-red-700 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-red-100 border border-red-200 transition cursor-pointer"
            >
              <LogOut size={15} /> Halaman Login
            </button>
          </div>
        </header>

        <div className="p-8 space-y-8 max-w-7xl w-full mx-auto">
          {/* ===================================================================
              TAB 1: PORTAL PUBLIK MULTI-JOURNAL (RUMAH JURNAL BRIDA)
             =================================================================== */}
          {activeTab === 'portal' && (
            <div className="space-y-8">
              {!portalSelectedJournal ? (
                <>
                  {/* Hero Banner Portal Multi-Journal */}
                  <div className="rounded-3xl bg-gradient-to-r from-red-950 via-red-800 to-slate-900 text-white p-8 md:p-10 shadow-xl relative overflow-hidden">
                    <div className="max-w-3xl space-y-4 relative z-10">
                      <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full bg-white/15 border border-white/20">
                        <Globe size={14} /> Rumah Jurnal Elektronik Resmi (Multi-Journal System)
                      </span>
                      <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
                        Portal Publikasi Ilmiah & Riset Daerah BRIDA Kota Makassar
                      </h1>
                      <p className="text-red-100 text-sm md:text-base leading-relaxed">
                        Halaman ini dapat diakses oleh <strong>Pembaca Publik (Open Access)</strong> untuk menjelajahi katalog{' '}
                        <strong>{journals.length} Jurnal Ilmiah Terakreditasi</strong> dan mengunduh artikel yang telah resmi terbit. Untuk mengirim naskah baru atau melakukan penilaian <em>peer-review</em>, sistem menggunakan gerbang autentikasi <strong>Single Sign-On (SSO)</strong>.
                      </p>
                      <div className="pt-2 flex flex-wrap gap-3">
                        <button
                          onClick={() => setActiveTab('unggah')}
                          className="bg-white text-red-900 hover:bg-red-50 font-extrabold text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 transition cursor-pointer"
                        >
                          <FileUp size={17} /> Kirim Naskah (Submit Manuscript)
                        </button>
                        <button
                          onClick={() => setActiveTab('dashboard')}
                          className="bg-red-700/60 hover:bg-red-700 text-white border border-white/25 font-bold text-sm px-5 py-3 rounded-xl flex items-center gap-2 transition cursor-pointer"
                        >
                          <LayoutDashboard size={17} /> Buka Dasbor Internal ({currentUser?.label.split(' ')[0]})
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Daftar Katalog Multi-Jurnal */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                          <BookOpen className="text-red-700" size={22} />
                          Katalog Jurnal Ilmiah BRIDA Kota Makassar ({journals.length} Jurnal)
                        </h3>
                        <p className="text-sm text-slate-500">
                          Pilih salah satu jurnal di bawah ini untuk melihat profil dewan redaksi, nomor ISSN, arsip terbitan, atau mengirim naskah.
                        </p>
                      </div>
                      {isAdminOrEditor && (
                        <button
                          onClick={() => setShowAddJournalModal(true)}
                          className="flex items-center gap-2 bg-red-800 hover:bg-red-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
                        >
                          <PlusCircle size={16} /> + Tambah Jurnal Baru
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {journals.map((j) => {
                        const theme = JOURNAL_THEME[j.accent_color] || JOURNAL_THEME.red;
                        const currentIssue = j.issues?.find((i) => i.is_current) || j.issues?.[0];
                        return (
                          <div
                            key={j.id}
                            className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 overflow-hidden flex flex-col justify-between transition group"
                          >
                            <div>
                              <div className={`bg-gradient-to-r ${theme.bgHeader} p-6 text-white`}>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                  <span className="text-xs font-extrabold uppercase tracking-wider bg-black/30 px-3 py-1 rounded-full border border-white/20">
                                    {j.abbreviation}
                                  </span>
                                  <span className="text-xs font-extrabold bg-amber-400 text-slate-950 px-3 py-1 rounded-full flex items-center gap-1 shadow-xs">
                                    <Award size={13} /> Terakreditasi {j.accreditation}
                                  </span>
                                </div>
                                <h4 className="text-lg font-extrabold leading-snug group-hover:underline">
                                  {j.title}
                                </h4>
                                <div className="flex flex-wrap gap-4 mt-3 text-xs text-white/85 font-medium">
                                  <span>P-ISSN: {j.issn_print}</span>
                                  <span>•</span>
                                  <span>E-ISSN: {j.issn_online}</span>
                                  <span>•</span>
                                  <span>{j.frequency}</span>
                                </div>
                              </div>

                              <div className="p-6 space-y-4">
                                <p className="text-sm text-slate-600 leading-relaxed">
                                  {j.description}
                                </p>
                                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-1.5">
                                  <div>
                                    <strong className="text-slate-700">Fokus & Ruang Lingkup:</strong>{' '}
                                    <span className="text-slate-600">{j.focus_scope}</span>
                                  </div>
                                  <div>
                                    <strong className="text-slate-700">Ketua Dewan Redaksi:</strong>{' '}
                                    <span className="text-slate-600">{j.chief_editor}</span>
                                  </div>
                                  {currentIssue && (
                                    <div className="text-red-800 font-bold pt-1">
                                      📌 Terbitan Terkini: {currentIssue.volume} {currentIssue.number} ({currentIssue.year}) — {currentIssue.title}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-4 text-xs font-bold text-slate-600">
                                <span>📄 {j.submissions_count || 0} Naskah</span>
                                <span className="text-emerald-700">✅ {j.published_count || 0} Terbit</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setFormJournalId(String(j.id));
                                    setActiveTab('unggah');
                                    toast.success(`Jurnal tujuan disetel ke: ${j.abbreviation}`);
                                  }}
                                  className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
                                >
                                  + Submit ke Jurnal Ini
                                </button>
                                <button
                                  onClick={() => setPortalSelectedJournal(j)}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer ${theme.btn}`}
                                >
                                  Kunjungi Jurnal <ChevronRight size={15} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Artikel Ilmiah Terbaru Lintas Jurnal */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-800">
                          Artikel Terbitan Terbaru (Open Access — Lintas Jurnal BRIDA)
                        </h3>
                        <p className="text-xs text-slate-500">
                          Daftar karya ilmiah yang telah lolos tahapan Peer-Review dan diterbitkan secara resmi.
                        </p>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {submissions
                        .filter((s) => s.status === 'published')
                        .map((pub) => (
                          <div key={pub.id} className="py-5 first:pt-0 last:pb-0 flex flex-col md:flex-row justify-between gap-4">
                            <div className="space-y-2 max-w-3xl">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-red-50 text-red-800 border border-red-200">
                                  {pub.journal?.abbreviation || 'J-SINTESA'}
                                </span>
                                <span className="text-xs font-semibold text-slate-500">
                                  {pub.section}
                                </span>
                                {pub.doi && (
                                  <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                    DOI: {pub.doi}
                                  </span>
                                )}
                              </div>
                              <h4
                                onClick={() => setDetailSubmission(pub)}
                                className="text-base font-bold text-slate-800 hover:text-red-800 cursor-pointer transition"
                              >
                                {pub.title}
                              </h4>
                              <p className="text-xs text-slate-600 font-medium">
                                Penulis: <strong>{pub.author?.name || 'Author BRIDA'}</strong>
                                {pub.co_authors ? `, ${pub.co_authors}` : ''}
                              </p>
                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                {pub.abstract}
                              </p>
                              <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                                <span className="flex items-center gap-1">
                                  <Eye size={13} /> {pub.views_count || 120} Kali Dibaca
                                </span>
                                <span className="flex items-center gap-1">
                                  <Download size={13} /> {pub.downloads_count || 45} Unduhan PDF
                                </span>
                                {pub.pages && <span>Halaman: {pub.pages}</span>}
                              </div>
                            </div>

                            <div className="flex md:flex-col items-end justify-center gap-2 shrink-0">
                              {pub.file_path && (
                                <a
                                  href={`http://127.0.0.1:8000/storage/${pub.file_path}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-4 py-2 rounded-xl bg-red-800 hover:bg-red-900 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
                                >
                                  <FileText size={14} /> Baca PDF Lengkap
                                </a>
                              )}
                              <button
                                onClick={() => setDetailSubmission(pub)}
                                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                              >
                                Abstrak & Sitasi
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              ) : (
                /* TAMPILAN HALAMAN SPESIFIK 1 JURNAL */
                <div className="space-y-6">
                  <button
                    onClick={() => setPortalSelectedJournal(null)}
                    className="inline-flex items-center gap-2 text-xs font-bold text-red-800 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl border border-red-200 transition cursor-pointer"
                  >
                    ← Kembali ke Katalog Rumah Jurnal BRIDA
                  </button>

                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className={`bg-gradient-to-r ${(JOURNAL_THEME[portalSelectedJournal.accent_color] || JOURNAL_THEME.red).bgHeader} p-8 text-white`}>
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-2 max-w-3xl">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-black/30 border border-white/20">
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

                        <button
                          onClick={() => {
                            setFormJournalId(String(portalSelectedJournal.id));
                            setActiveTab('unggah');
                          }}
                          className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-2 transition cursor-pointer shrink-0"
                        >
                          <FileUp size={16} /> Submit Naskah ke {portalSelectedJournal.abbreviation}
                        </button>
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
                        Daftar Artikel pada {portalSelectedJournal.title}
                      </h3>

                      {submissions.filter((s) => s.journal_id === portalSelectedJournal.id).length === 0 ? (
                        <p className="text-sm text-slate-500 italic py-8 text-center">
                          Belum ada artikel pada jurnal ini. Silakan unggah naskah pertama Anda!
                        </p>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {submissions
                            .filter((s) => s.journal_id === portalSelectedJournal.id)
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
                                    className="text-base font-bold text-slate-800 hover:text-red-800 cursor-pointer"
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
                                      href={`http://127.0.0.1:8000/storage/${art.file_path}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-4 py-2 rounded-xl bg-red-800 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-red-900 transition"
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
              TAB 2: DASBOR EKSEKUTIF & ANALITIK MULTI-JOURNAL
             =================================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Baris Kartu Metrik Utama */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 border-l-4 border-l-red-700">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                    <span>Total Naskah</span>
                    <FileText size={18} className="text-red-700" />
                  </div>
                  <p className="text-3xl font-extrabold text-slate-800 mt-3">{stats.total}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Across {stats.journals_count || journals.length} Jurnal BRIDA
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 border-l-4 border-l-blue-600">
                  <div className="flex items-center justify-between text-blue-700 text-xs font-bold uppercase">
                    <span>Tahap Evaluasi / Review</span>
                    <Clock size={18} />
                  </div>
                  <p className="text-3xl font-extrabold text-blue-700 mt-3">
                    {stats.pending + stats.under_review + stats.revision_required}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {stats.pending} Pending • {stats.under_review} Direview • {stats.revision_required} Revisi
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 border-l-4 border-l-emerald-600">
                  <div className="flex items-center justify-between text-emerald-700 text-xs font-bold uppercase">
                    <span>Lolos Review (Accepted)</span>
                    <CheckCircle2 size={18} />
                  </div>
                  <p className="text-3xl font-extrabold text-emerald-700 mt-3">{stats.accepted}</p>
                  <p className="text-xs text-slate-400 mt-1">Siap diterbitkan ke Nomor Issue</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 border-l-4 border-l-purple-600">
                  <div className="flex items-center justify-between text-purple-700 text-xs font-bold uppercase">
                    <span>Resmi Terbit (Published)</span>
                    <Award size={18} />
                  </div>
                  <p className="text-3xl font-extrabold text-purple-700 mt-3">{stats.published}</p>
                  <p className="text-xs text-slate-400 mt-1">Lengkap dengan registrasi DOI</p>
                </div>
              </div>

              {/* Baris 2 Grafik Analitik: BarChart Multi-Jurnal & PieChart Status */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
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
                        <Bar dataKey="Terbit" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Proses" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-xs border border-slate-200 flex flex-col justify-between">
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
                              <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
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
              <section className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">
                      {isAuthor ? 'Pelacakan Status Naskah Lintas Jurnal' : 'Manajemen Naskah Lintas Jurnal'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Menampilkan {filteredSubmissions.length} naskah ilmiah
                    </p>
                  </div>

                  {/* Filter Bar */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari judul, penulis, DOI..."
                        className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-red-600 w-56"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 cursor-pointer"
                    >
                      <option value="all">Semua Status</option>
                      <option value="pending">Menunggu Editor (Pending)</option>
                      <option value="under_review">Sedang Direview</option>
                      <option value="revision_required">Perlu Revisi</option>
                      <option value="accepted">Disetujui (Accepted)</option>
                      <option value="published">Terbit (Published)</option>
                    </select>

                    <button
                      onClick={() => {
                        fetchAllData(selectedJournalId);
                        toast.success('Data dasbor diperbarui!');
                      }}
                      className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl transition cursor-pointer"
                    >
                      <RefreshCw size={14} /> Refresh
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-sm text-slate-500">
                    Memuat data dari peladen MySQL...
                  </div>
                ) : filteredSubmissions.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <p className="text-sm text-slate-500 font-medium">
                      Tidak ada naskah yang cocok dengan filter pencarian.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] tracking-wider border-b border-slate-200">
                          <th className="py-3.5 px-4 font-extrabold">Jurnal Tujuan</th>
                          <th className="py-3.5 px-4 font-extrabold">Judul Naskah & Penulis</th>
                          <th className="py-3.5 px-4 font-extrabold">Dokumen</th>
                          <th className="py-3.5 px-4 font-extrabold text-center">Status Editorial</th>
                          <th className="py-3.5 px-4 font-extrabold text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredSubmissions.map((sub) => {
                          const badge = STATUS_BADGE[sub.status] || STATUS_BADGE.pending;
                          return (
                            <tr key={sub.id} className="hover:bg-slate-50/90 transition">
                              <td className="py-4 px-4 align-top">
                                <span className="inline-block text-xs font-extrabold px-2.5 py-1 rounded-lg bg-red-50 text-red-800 border border-red-200">
                                  {sub.journal?.abbreviation || 'J-SINTESA'}
                                </span>
                                <div className="text-[11px] text-slate-400 mt-1">
                                  {sub.section}
                                </div>
                              </td>
                              <td className="py-4 px-4 max-w-md align-top">
                                <div
                                  onClick={() => setDetailSubmission(sub)}
                                  className="font-bold text-slate-800 hover:text-red-800 cursor-pointer leading-snug"
                                >
                                  {sub.title}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  Oleh: <strong>{sub.author?.name || 'Author BRIDA'}</strong>
                                  {sub.co_authors ? `, ${sub.co_authors}` : ''}
                                </div>
                                {sub.doi && (
                                  <span className="inline-block mt-1 text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                    DOI: {sub.doi}
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-4 align-top">
                                {sub.file_path ? (
                                  <a
                                    href={`http://127.0.0.1:8000/storage/${sub.file_path}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-red-700 font-bold text-xs bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition inline-flex items-center gap-1.5 border border-red-200"
                                  >
                                    <FileText size={14} /> Lihat PDF
                                  </a>
                                ) : (
                                  <span className="text-slate-400 italic text-xs">Tidak ada</span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-center align-top">
                                <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold border inline-block ${badge.bg}`}>
                                  {badge.label}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right align-top space-x-2">
                                <button
                                  onClick={() => setDetailSubmission(sub)}
                                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                                >
                                  Detail & Catatan Review
                                </button>
                                {(isAdminOrEditor || isReviewer) && (
                                  <button
                                    onClick={() => {
                                      setSelectedSubForAction(sub);
                                      setActiveTab('review');
                                    }}
                                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-900 text-white transition cursor-pointer"
                                  >
                                    {isReviewer ? 'Beri Nilai Review' : 'Kelola / Publish'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ===================================================================
              TAB 3: MANAJEMEN MULTI-JURNAL (KHUSUS ADMIN / EDITOR)
             =================================================================== */}
          {activeTab === 'journals' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">
                    Manajemen Ekosistem Multi-Journal BRIDA
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Kelola daftar jurnal ilmiah, nomor ISSN, akreditasi SINTA, serta terbitan Volume/Issue.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddJournalModal(true)}
                  className="flex items-center gap-2 bg-red-800 hover:bg-red-900 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md transition cursor-pointer"
                >
                  <PlusCircle size={16} /> + Buat Jurnal Baru di Portal Ini
                </button>
              </div>

              <div className="grid grid-cols-1 gap-5">
                {journals.map((j) => (
                  <div
                    key={j.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col lg:flex-row justify-between gap-6"
                  >
                    <div className="space-y-2 max-w-3xl">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-red-800 text-white">
                          {j.abbreviation}
                        </span>
                        <span className="text-xs font-bold px-3 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                          Akreditasi {j.accreditation}
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                          Path URL: /journal/{j.code}
                        </span>
                      </div>
                      <h4 className="text-lg font-extrabold text-slate-800">{j.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{j.description}</p>
                      <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-500">
                        <span><strong>P-ISSN:</strong> {j.issn_print}</span>
                        <span><strong>E-ISSN:</strong> {j.issn_online}</span>
                        <span><strong>Chief Editor:</strong> {j.chief_editor}</span>
                        <span><strong>Jadwal:</strong> {j.frequency}</span>
                      </div>
                    </div>

                    <div className="flex lg:flex-col justify-between items-end gap-3 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
                      <div className="text-right">
                        <span className="text-2xl font-extrabold text-slate-800">
                          {j.submissions_count || 0}
                        </span>
                        <span className="block text-[11px] text-slate-400 font-bold uppercase">
                          Naskah Terdaftar
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedJournalId(String(j.id));
                            setActiveTab('dashboard');
                            toast.success(`Memfilter dasbor untuk jurnal ${j.abbreviation}`);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                        >
                          Filter Dasbor
                        </button>
                        <button
                          onClick={() => {
                            setPortalSelectedJournal(j);
                            setActiveTab('portal');
                          }}
                          className="px-3.5 py-2 rounded-xl bg-red-800 hover:bg-red-900 text-xs font-bold text-white cursor-pointer"
                        >
                          Lihat Halaman Jurnal
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================================================================
              TAB 4: UNGGAH NASKAH BARU (MULTI-JOURNAL SUBMISSION WIZARD)
             =================================================================== */}
          {activeTab === 'unggah' && (
            <section className="bg-white rounded-3xl shadow-xs border border-slate-200 p-8 max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-red-50 text-red-700">
                    <FileUp size={26} />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800">
                      Formulir Pengiriman Naskah Ilmiah Baru (Multi-Journal Submission)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Pilih jurnal tujuan di bawah naungan BRIDA Kota Makassar dan lampirkan dokumen penuh (PDF/DOCX).
                    </p>
                  </div>
                </div>
              </div>

              <form className="space-y-6" onSubmit={handleSubmitManuscript}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-red-50/50 p-5 rounded-2xl border border-red-100">
                  <div className="md:col-span-2">
                    <label className="block text-slate-800 text-xs font-extrabold uppercase tracking-wider mb-2">
                      1. Pilih Jurnal Tujuan (Multi-Journal Target) *
                    </label>
                    <select
                      value={formJournalId}
                      onChange={(e) => setFormJournalId(e.target.value)}
                      className="w-full border border-slate-300 bg-white rounded-xl p-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-red-200 focus:border-red-600 outline-none cursor-pointer"
                      required
                    >
                      {journals.map((j) => (
                        <option key={j.id} value={j.id}>
                          [{j.abbreviation}] {j.title} — ({j.accreditation})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-800 text-xs font-extrabold uppercase tracking-wider mb-2">
                      2. Kategori Seksi Artikel *
                    </label>
                    <select
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      className="w-full border border-slate-300 bg-white rounded-xl p-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-red-200 focus:border-red-600 outline-none cursor-pointer"
                    >
                      <option value="Original Research">Original Research Article</option>
                      <option value="Policy Brief">Policy Brief (Kajian Kebijakan)</option>
                      <option value="Literature Review">Systematic Literature Review</option>
                      <option value="Case Study">Case Study (Studi Kasus Daerah)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 text-sm font-bold mb-2">
                    Judul Artikel Ilmiah *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-600 outline-none"
                    placeholder="Contoh: Implementasi Smart Governance pada Pelayanan Publik Terpadu di Kota Makassar..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-slate-700 text-sm font-bold mb-2">
                      Penulis Pendamping (Co-Authors)
                    </label>
                    <input
                      type="text"
                      value={coAuthors}
                      onChange={(e) => setCoAuthors(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-600 outline-none"
                      placeholder="Pisahkan dengan koma, misal: Muh Fadhil Alrifa, Azwan Alghifari"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 text-sm font-bold mb-2">
                      Kata Kunci (Keywords)
                    </label>
                    <input
                      type="text"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-600 outline-none"
                      placeholder="Contoh: Smart City, Inovasi Daerah, Keamanan Siber"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 text-sm font-bold mb-2">
                    Abstrak Penelitian (Bahasa Indonesia / Inggris) *
                  </label>
                  <textarea
                    value={abstract}
                    onChange={(e) => setAbstract(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-3.5 text-sm h-36 focus:ring-2 focus:ring-red-200 focus:border-red-600 outline-none resize-none"
                    placeholder="Tuliskan latar belakang, tujuan, metodologi, dan hasil temuan utama penelitian..."
                    required
                  />
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300">
                  <label className="block text-slate-700 text-sm font-bold mb-2">
                    Unggah Dokumen Naskah Lengkap (PDF / DOC / DOCX — Maks. 10MB) *
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    accept=".pdf,.doc,.docx"
                    className="w-full text-sm text-slate-600 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-red-800 file:text-white hover:file:bg-red-900 cursor-pointer"
                    required
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    🔒 Berkas akan diperiksa secara otomatis oleh Middleware Sanitasi MIME-Type Laravel untuk mencegah injeksi file berbahaya.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitLoading}
                  className={`w-full text-white font-extrabold text-sm px-6 py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                    submitLoading ? 'bg-slate-400' : 'bg-red-800 hover:bg-red-900'
                  }`}
                >
                  <Send size={18} />
                  {submitLoading ? 'Sedang Mengunggah & Memvalidasi...' : 'Kirim Naskah ke Dewan Redaksi Jurnal'}
                </button>
              </form>
            </section>
          )}

          {/* ===================================================================
              TAB 5: MEJA EVALUASI PEER-REVIEW & KEPUTUSAN EDITORIAL (RBAC)
             =================================================================== */}
          {activeTab === 'review' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Daftar Antrean Naskah di Kiri */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-4 h-fit">
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
                  {submissions.map((sub) => {
                    const active = selectedSubForAction?.id === sub.id;
                    const badge = STATUS_BADGE[sub.status] || STATUS_BADGE.pending;
                    return (
                      <div
                        key={sub.id}
                        onClick={() => setSelectedSubForAction(sub)}
                        className={`p-4 rounded-xl border transition cursor-pointer space-y-2 ${
                          active
                            ? 'bg-red-50/70 border-red-600 ring-2 ring-red-200'
                            : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-red-800 text-white">
                            {sub.journal?.abbreviation}
                          </span>
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 leading-snug">
                          {sub.title}
                        </h4>
                        <div className="text-[11px] text-slate-500">
                          Penulis: {sub.author?.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Panel Formulir Penilaian & Keputusan di Kanan (Sesuai Role) */}
              <div className="lg:col-span-7">
                {!selectedSubForAction ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                    <CheckSquare size={42} className="mx-auto text-slate-300" />
                    <h4 className="text-base font-bold text-slate-700">
                      Pilih Naskah di Sebelah Kiri
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Klik salah satu judul naskah di daftar sebelah kiri untuk membuka lembar kerja{' '}
                      <strong>{currentUser?.label}</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                    {/* Info Naskah Terpilih */}
                    <div className="border-b border-slate-100 pb-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-red-800 bg-red-50 px-3 py-1 rounded-lg border border-red-200">
                          Jurnal: {selectedSubForAction.journal?.title}
                        </span>
                        {selectedSubForAction.file_path && (
                          <a
                            href={`http://127.0.0.1:8000/storage/${selectedSubForAction.file_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 flex items-center gap-1.5"
                          >
                            <FileText size={14} /> Buka Dokumen PDF Naskah
                          </a>
                        )}
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-800">
                        {selectedSubForAction.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {selectedSubForAction.abstract}
                      </p>
                    </div>

                    {/* BAGIAN A: HANYA TAMPIL UNTUK CHIEF EDITOR / ADMIN */}
                    {isAdminOrEditor && (
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                          <UserCheck size={16} className="text-red-700" />
                          Panel Otoritas Chief Editor / Admin (Penugasan Reviewer & Penerbitan DOI)
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                              Pilih Mitra Bestari (Reviewer):
                            </label>
                            <select
                              value={assignReviewerId}
                              onChange={(e) => setAssignReviewerId(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-semibold"
                            >
                              {(stats.reviewers || []).map((rev) => (
                                <option key={rev.id} value={rev.id}>
                                  {rev.name} ({rev.specialty || 'Reviewer'})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                              Catatan Editor (Opsional):
                            </label>
                            <input
                              type="text"
                              value={editorNotes}
                              onChange={(e) => setEditorNotes(e.target.value)}
                              placeholder="Instruksi khusus untuk reviewer/penulis..."
                              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => handleAssignReviewer(selectedSubForAction.id)}
                            className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                          >
                            📋 Tugaskan Reviewer (Set Under Review)
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePublishArticle(selectedSubForAction.id)}
                            className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                          >
                            🚀 Terbitkan ke Issue & Buat Nomor DOI (Publish)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* BAGIAN B: LEMBAR EVALUASI PEER-REVIEW (AKTIF UNTUK REVIEWER & ADMIN) */}
                    {(isReviewer || isAdminOrEditor) && (
                      <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-200 space-y-4">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-900 flex items-center gap-2">
                          <CheckSquare size={16} className="text-blue-700" />
                          Lembar Evaluasi Sejawat (Double-Blind Peer Review — Peran Reviewer)
                        </h4>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Orisinalitas (0-100)
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
                              Metodologi (0-100)
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
                              Relevansi (0-100)
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
                            Komentar & Masukan Substansi untuk Penulis *
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
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* =====================================================================
          MODAL 1: DETAIL NASKAH, RIWAYAT REVIEW, & SITASI
         ===================================================================== */}
      {detailSubmission && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded bg-red-800 text-white">
                    {detailSubmission.journal?.abbreviation}
                  </span>
                  <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${(STATUS_BADGE[detailSubmission.status] || STATUS_BADGE.pending).bg}`}>
                    {(STATUS_BADGE[detailSubmission.status] || STATUS_BADGE.pending).label}
                  </span>
                  {detailSubmission.doi && (
                    <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">
                      DOI: {detailSubmission.doi}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-extrabold text-slate-800 pt-1">
                  {detailSubmission.title}
                </h3>
              </div>
              <button
                onClick={() => setDetailSubmission(null)}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block">Jurnal Tujuan:</span>
                <strong className="text-slate-800">{detailSubmission.journal?.title}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Penulis Utama & Co-Authors:</span>
                <strong className="text-slate-800">
                  {detailSubmission.author?.name}
                  {detailSubmission.co_authors ? `, ${detailSubmission.co_authors}` : ''}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Kata Kunci (Keywords):</span>
                <strong className="text-slate-700">{detailSubmission.keywords || '-'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Terbitan (Issue) & Halaman:</span>
                <strong className="text-slate-700">
                  {detailSubmission.issue
                    ? `${detailSubmission.issue.volume} ${detailSubmission.issue.number} (${detailSubmission.issue.year})`
                    : 'Belum masuk nomor terbitan'}{' '}
                  {detailSubmission.pages ? `• Hal. ${detailSubmission.pages}` : ''}
                </strong>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Abstrak Artikel
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-2xl border border-slate-200">
                {detailSubmission.abstract}
              </p>
            </div>

            {/* Hasil Evaluasi Peer-Review */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Riwayat Evaluasi Mitra Bestari (Peer-Review Log)
              </h4>
              {(!detailSubmission.reviews || detailSubmission.reviews.length === 0) ? (
                <p className="text-xs text-slate-400 italic">
                  Belum ada catatan review untuk naskah ini.
                </p>
              ) : (
                detailSubmission.reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <strong className="text-blue-950">
                        Reviewer: {rev.reviewer?.name || 'Mitra Bestari BRIDA'}
                      </strong>
                      <span className="font-extrabold uppercase px-2.5 py-0.5 rounded bg-white text-blue-800 border border-blue-200">
                        Status: {rev.status} {rev.decision ? `(${rev.decision.toUpperCase()})` : ''}
                      </span>
                    </div>
                    {rev.score_originality && (
                      <div className="flex gap-4 text-slate-700 font-semibold">
                        <span>Skor Orisinalitas: <strong>{rev.score_originality}</strong></span>
                        <span>Metodologi: <strong>{rev.score_methodology}</strong></span>
                        <span>Relevansi: <strong>{rev.score_relevance}</strong></span>
                      </div>
                    )}
                    {rev.comments && (
                      <p className="text-slate-700 bg-white p-3 rounded-xl border border-blue-100">
                        "{rev.comments}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {detailSubmission.file_path && (
                <a
                  href={`http://127.0.0.1:8000/storage/${detailSubmission.file_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-red-800 hover:bg-red-900 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-2 shadow-md transition"
                >
                  <FileText size={16} /> Buka / Unduh Full-Text PDF
                </a>
              )}
              <button
                onClick={() => setDetailSubmission(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: TAMBAH JURNAL BARU (MULTI-JOURNAL BUILDER)
         ===================================================================== */}
      {showAddJournalModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">
                  + Tambah Jurnal Baru ke Portal OJS BRIDA
                </h3>
                <p className="text-xs text-slate-500">
                  Buat jurnal baru secara instan di dalam arsitektur Multi-Journal.
                </p>
              </div>
              <button
                onClick={() => setShowAddJournalModal(false)}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateJournal} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Singkatan Jurnal *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: JPPK"
                    value={newJournal.abbreviation}
                    onChange={(e) => setNewJournal({ ...newJournal, abbreviation: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kode Slug URL *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: pertanian"
                    value={newJournal.code}
                    onChange={(e) => setNewJournal({ ...newJournal, code: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Jurnal *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Jurnal Pertanian Perkotaan dan Ketahanan Pangan Makassar"
                  value={newJournal.title}
                  onChange={(e) => setNewJournal({ ...newJournal, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">P-ISSN</label>
                  <input
                    type="text"
                    placeholder="2899-101X"
                    value={newJournal.issn_print}
                    onChange={(e) => setNewJournal({ ...newJournal, issn_print: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-ISSN</label>
                  <input
                    type="text"
                    placeholder="2899-1028"
                    value={newJournal.issn_online}
                    onChange={(e) => setNewJournal({ ...newJournal, issn_online: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Akreditasi</label>
                  <select
                    value={newJournal.accreditation}
                    onChange={(e) => setNewJournal({ ...newJournal, accreditation: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-bold"
                  >
                    <option value="SINTA 1">SINTA 1</option>
                    <option value="SINTA 2">SINTA 2</option>
                    <option value="SINTA 3">SINTA 3</option>
                    <option value="SINTA 4">SINTA 4</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi Singkat Jurnal *</label>
                <textarea
                  required
                  placeholder="Jelaskan profil dan tujuan penerbitan jurnal ini..."
                  value={newJournal.description}
                  onChange={(e) => setNewJournal({ ...newJournal, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2.5 h-20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddJournalModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-red-800 hover:bg-red-900 text-white font-bold cursor-pointer"
                >
                  Simpan & Aktifkan Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
