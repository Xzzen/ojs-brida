import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Mail,
  Send,
  Inbox,
  CheckCheck,
  Trash2,
  Search,
  RefreshCw,
  Reply,
  PenSquare,
  X,
  Clock,
  ArrowRight
} from 'lucide-react';
import { IconDocClean, IconInboxClean } from './BridaIcons';
import { SEMANTIC_TONE } from './uiTokens';
import { useBridaDialog } from './BridaDialog';

const CATEGORY_STYLE = {
  invitation: {
    label: 'Undangan Review',
    badge: SEMANTIC_TONE.warning,
    dot: 'bg-[#7C5329]'
  },
  decision: {
    label: 'Keputusan Redaksi',
    badge: SEMANTIC_TONE.negative,
    dot: 'bg-[#882832]'
  },
  revision: {
    label: 'Revisi Naskah',
    badge: SEMANTIC_TONE.warning,
    dot: 'bg-[#7C5329]'
  },
  decline_notice: {
    label: 'Penolakan Undangan',
    badge: SEMANTIC_TONE.negative,
    dot: 'bg-[#882832]'
  },
  published: {
    label: 'Artikel Terbit & DOI',
    badge: SEMANTIC_TONE.positive,
    dot: 'bg-[#2F523B]'
  },
  submission: {
    label: 'Status Naskah',
    badge: SEMANTIC_TONE.accent,
    dot: 'bg-[#7A2222]'
  },
  direct: {
    label: 'Pesan Langsung',
    badge: SEMANTIC_TONE.neutral,
    dot: 'bg-[#737373]'
  }
};

const ROLE_LABEL = {
  admin: 'Admin Redaksi',
  editor: 'Editor Jurnal',
  reviewer: 'Mitra Bestari',
  author: 'Penulis'
};

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} jam lalu`;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getInitials(name) {
  if (!name) return 'OB';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function InboxPanel({
  apiBase,
  currentUser,
  submissions = [],
  onUnreadCountChange,
  onOpenSubmission,
  onGoToReview
}) {
  const dialog = useBridaDialog();
  const [box, setBox] = useState('inbox'); // inbox | sent
  const [categoryFilter, setCategoryFilter] = useState('all'); // all | unread | invitation | decision | revision | direct
  const [searchTerm, setSearchTerm] = useState('');
  const [messages, setMessages] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [counts, setCounts] = useState({ unread: 0, inbox: 0, sent: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedMsg, setSelectedMsg] = useState(null);

  // State balas cepat di bawah detail pesan
  const [replyBody, setReplyBody] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Modal Tulis Pesan Baru
  const [showCompose, setShowCompose] = useState(false);
  const [composeForm, setComposeForm] = useState({
    recipient_id: '',
    submission_id: '',
    subject: '',
    body: ''
  });
  const [sendingCompose, setSendingCompose] = useState(false);

  const fetchInbox = useCallback(async (silent = false) => {
    if (!currentUser?.id) return;
    if (!silent) setLoading(true);
    try {
      const res = await axios.get(`${apiBase}/inbox`, {
        params: {
          user_id: currentUser.id,
          box,
          category: categoryFilter,
          q: searchTerm.trim() || undefined
        }
      });
      const data = res.data?.data || {};
      const list = data.messages || [];
      setMessages(list);
      setRecipients(data.recipients || []);
      const nextCounts = data.counts || { unread: 0, inbox: 0, sent: 0 };
      setCounts(nextCounts);
      onUnreadCountChange && onUnreadCountChange(nextCounts.unread || 0);

      // Update selectedMsg jika masih ada dalam daftar
      setSelectedMsg((prev) => {
        if (!prev) return list[0] || null;
        return list.find((m) => m.id === prev.id) || list[0] || null;
      });
    } catch (err) {
      toast.error('Gagal memuat Kotak Masuk.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [apiBase, currentUser?.id, box, categoryFilter, searchTerm, onUnreadCountChange]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const handleSelectMessage = async (msg) => {
    setSelectedMsg(msg);
    setReplyBody('');
    if (!msg.is_read && String(msg.recipient_id) === String(currentUser?.id)) {
      // Optimistic mark read
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, is_read: true } : m)));
      setCounts((prev) => {
        const nextUnread = Math.max(0, (prev.unread || 0) - 1);
        onUnreadCountChange && onUnreadCountChange(nextUnread);
        return { ...prev, unread: nextUnread };
      });
      try {
        await axios.post(`${apiBase}/inbox/${msg.id}/read`, { user_id: currentUser.id });
      } catch {
        // silent
      }
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser?.id) return;
    try {
      await axios.post(`${apiBase}/inbox/read-all`, { user_id: currentUser.id });
      toast.success('Semua pesan ditandai sudah dibaca.');
      setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
      setCounts((prev) => ({ ...prev, unread: 0 }));
      onUnreadCountChange && onUnreadCountChange(0);
    } catch {
      toast.error('Gagal menandai semua pesan dibaca.');
    }
  };

  const handleDeleteMessage = async (msg) => {
    const confirmed = await dialog.confirm({
      title: 'Hapus Pesan',
      message: `Hapus pesan "${msg.subject}" dari Kotak Masuk?`,
      confirmText: 'Ya, Hapus Pesan',
      variant: 'destructive'
    });
    if (!confirmed) return;
    try {
      await axios.delete(`${apiBase}/inbox/${msg.id}`, {
        params: { user_id: currentUser.id }
      });
      toast.success('Pesan berhasil dihapus.');
      setSelectedMsg(null);
      fetchInbox(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus pesan.');
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!selectedMsg || !replyBody.trim()) return;

    // Tentukan penerima balasan: jika sedang melihat pesan masuk, balas ke sender; jika pesan terkirim, kirim lagi ke recipient
    const targetId =
      String(selectedMsg.sender_id) === String(currentUser?.id)
        ? selectedMsg.recipient_id
        : selectedMsg.sender_id;

    if (!targetId) {
      toast.error('Pesan sistem otomatis tidak memiliki pengirim personal. Gunakan "Tulis Pesan Baru" untuk menghubungi Editor.');
      return;
    }

    setSendingReply(true);
    try {
      const cleanSubj = selectedMsg.subject.startsWith('Re:')
        ? selectedMsg.subject
        : `Re: ${selectedMsg.subject}`;
      await axios.post(`${apiBase}/inbox`, {
        sender_id: currentUser.id,
        recipient_id: targetId,
        submission_id: selectedMsg.submission_id || null,
        category: 'direct',
        subject: cleanSubj,
        body: replyBody.trim()
      });
      toast.success('Balasan berhasil terkirim ke Kotak Masuk penerima!');
      setReplyBody('');
      fetchInbox(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengirim balasan.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleSendCompose = async (e) => {
    e.preventDefault();
    if (!composeForm.recipient_id || !composeForm.subject.trim() || !composeForm.body.trim()) {
      toast.error('Penerima, subjek, dan isi pesan wajib diisi.');
      return;
    }
    setSendingCompose(true);
    try {
      await axios.post(`${apiBase}/inbox`, {
        sender_id: currentUser.id,
        recipient_id: Number(composeForm.recipient_id),
        submission_id: composeForm.submission_id ? Number(composeForm.submission_id) : null,
        category: 'direct',
        subject: composeForm.subject.trim(),
        body: composeForm.body.trim()
      });
      toast.success('Pesan berhasil dikirim!');
      setShowCompose(false);
      setComposeForm({ recipient_id: '', submission_id: '', subject: '', body: '' });
      fetchInbox(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengirim pesan.');
    } finally {
      setSendingCompose(false);
    }
  };

  const canReplySelected =
    selectedMsg &&
    ((String(selectedMsg.sender_id) !== String(currentUser?.id) && !!selectedMsg.sender_id) ||
      (String(selectedMsg.sender_id) === String(currentUser?.id) && !!selectedMsg.recipient_id));

  const relatedSubmissionObj = selectedMsg?.submission_id
    ? submissions.find((s) => String(s.id) === String(selectedMsg.submission_id))
    : null;

  return (
    <div className="p-5 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* HEADER BANNER KOTAK MASUK — CLEAN SOLID INSTITUTIONAL MAROON */}
      <div className="relative overflow-hidden bg-[#7A2222] rounded-2xl p-6 sm:p-7 text-white flex flex-wrap items-center justify-between gap-4 border border-[#611B1B]">
        <div className="pointer-events-none absolute -top-20 -right-14 w-[260px] h-[260px] rounded-full border border-white/[0.08]" />

        <div className="relative z-10 space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] bg-white/12 border border-white/20 px-3 py-1 rounded-full text-white/90">
            <IconInboxClean size={13} className="text-white/90" />
            Kotak Masuk &amp; Notifikasi Terpadu OJS BRIDA
          </div>
          <h3 className="font-serif-editorial text-2xl sm:text-3xl font-bold tracking-tight">
            Kotak Masuk Pesan &amp; Pemberitahuan
          </h3>
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
            Pantau undangan penelaahan, alasan penolakan naskah, permintaan revisi, penerbitan DOI, serta berkirim pesan langsung dengan Dewan Redaksi.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          {counts.unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/12 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition cursor-pointer"
            >
              <CheckCheck size={14} /> Tandai Semua Dibaca
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowCompose(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-[#F5F5F5] active:scale-[0.98] text-[#7A2222] font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <PenSquare size={14} /> Tulis Pesan Baru
          </button>
        </div>
      </div>

      {/* TOOLBAR SWITCHER KOTAK MASUK / TERKIRIM + FILTER + PENCARIAN */}
      <div className="card-luxury rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Sliding Pill Switcher: Pesan Masuk vs Terkirim */}
        <div className="relative grid grid-cols-2 bg-[#F4F4F5] p-1 rounded-xl w-full sm:w-[290px] overflow-hidden border border-[#D4D4D8]">
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-[#7A2222] shadow-xs transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
              box === 'sent' ? 'translate-x-full' : 'translate-x-0'
            }`}
          />
          <button
            type="button"
            onClick={() => {
              setBox('inbox');
              setCategoryFilter('all');
            }}
            className={`relative z-10 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              box === 'inbox' ? 'text-white' : 'text-[#525252] hover:text-[#141414]'
            }`}
          >
            <Inbox size={14} />
            <span>Masuk</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full tabular-nums ${
              box === 'inbox' ? 'bg-white/20 text-white' : 'bg-white text-[#525252] border border-[#D4D4D8]'
            }`}>
              {counts.inbox}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setBox('sent');
              setCategoryFilter('all');
            }}
            className={`relative z-10 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              box === 'sent' ? 'text-white' : 'text-[#525252] hover:text-[#141414]'
            }`}
          >
            <Send size={13} />
            <span>Terkirim</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full tabular-nums ${
              box === 'sent' ? 'bg-white/20 text-white' : 'bg-white text-[#525252] border border-[#D4D4D8]'
            }`}>
              {counts.sent}
            </span>
          </button>
        </div>

        {/* Filter Chips */}
        {box === 'inbox' && (
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'unread', label: `Belum Dibaca (${counts.unread})` },
              { id: 'invitation', label: 'Undangan' },
              { id: 'decision', label: 'Keputusan / Tolak' },
              { id: 'revision', label: 'Revisi' },
              { id: 'direct', label: 'Pesan Langsung' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setCategoryFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                  categoryFilter === f.id
                    ? 'bg-[#7A2222] text-white border-[#7A2222]'
                    : 'bg-white text-[#525252] border-[#D4D4D8] hover:border-[#DFBABA] hover:text-[#7A2222]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Search & Refresh */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-[260px]">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#525252]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari subjek atau isi pesan..."
              className="w-full bg-[#FAFAFA] border border-[#D4D4D8] rounded-xl pl-9 pr-4 py-2 text-xs text-[#141414] placeholder:text-[#6B7280] outline-none focus:bg-white focus:border-[#7A2222] focus:ring-2 focus:ring-[#7A2222]/10 transition"
            />
          </div>
          <button
            type="button"
            onClick={() => fetchInbox()}
            title="Muat ulang kotak masuk"
            className="p-2 rounded-xl border border-[#D4D4D8] text-[#4B5563] hover:text-[#7A2222] hover:bg-[#FDF2F2] cursor-pointer transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* MAIN SPLIT 2-KOLOM ALA EMAIL MODERN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* DAFTAR PESAN (KIRI - 5 COLS) */}
        <div className="lg:col-span-5 card-luxury rounded-2xl overflow-hidden min-w-0">
          <div className="px-5 py-3.5 border-b border-[#D4D4D8] flex items-center justify-between bg-[#FAFAFA]">
            <span className="text-xs font-bold text-[#141414] uppercase tracking-wider">
              {box === 'sent' ? 'Pesan Terkirim' : 'Daftar Pesan Masuk'}
            </span>
            <span className="text-[11px] font-semibold text-[#4B5563] tabular-nums">
              {messages.length} pesan
            </span>
          </div>

          <div className="divide-y divide-[#D4D4D8] max-h-[620px] overflow-y-auto">
            {loading ? (
              <div className="p-10 text-center text-xs text-[#4B5563]">
                Memuat pesan kotak masuk...
              </div>
            ) : messages.length === 0 ? (
              <div className="p-10 text-center space-y-2.5">
                <Mail size={34} className="mx-auto text-[#D4D4D4]" />
                <div className="text-xs font-bold text-[#404040]">
                  Belum ada pesan di folder ini
                </div>
                <p className="text-[11px] text-[#4B5563]">
                  Notifikasi undangan review, keputusan redaksi, revisi, dan pesan langsung akan muncul di sini.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isUnread = !msg.is_read && String(msg.recipient_id) === String(currentUser?.id);
                const isSelected = selectedMsg?.id === msg.id;
                const cat = CATEGORY_STYLE[msg.category] || CATEGORY_STYLE.direct;
                const peer =
                  box === 'sent'
                    ? msg.recipient
                    : msg.sender || { name: 'Sistem OJS BRIDA', role: 'admin' };

                return (
                  <button
                    key={msg.id}
                    type="button"
                    onClick={() => handleSelectMessage(msg)}
                    className={`w-full text-left p-4 transition-colors cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-[#FDF2F2] border-l-4 border-l-[#7A2222]'
                        : isUnread
                        ? 'bg-[#FAFAFA] hover:bg-[#FDF2F2]/60'
                        : 'bg-white hover:bg-[#FAFAFA]'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-[#7A2222] text-white font-bold text-[11px] flex items-center justify-center">
                        {getInitials(peer?.name)}
                      </div>
                      {isUnread && (
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#7A2222] ring-2 ring-white" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs truncate ${isUnread ? 'font-bold text-[#141414]' : 'font-semibold text-[#404040]'}`}>
                          {box === 'sent' ? `Kepada: ${peer?.name || '-'}` : peer?.name || 'Sistem OJS BRIDA'}
                        </span>
                        <span className="text-[10px] text-[#4B5563] shrink-0 tabular-nums">
                          {formatDateTime(msg.created_at)}
                        </span>
                      </div>

                      <div className={`text-xs line-clamp-1 ${isUnread ? 'font-bold text-[#7A2222]' : 'font-semibold text-[#141414]'}`}>
                        {msg.subject}
                      </div>

                      <p className="text-[11px] text-[#4B5563] line-clamp-2 leading-relaxed">
                        {msg.body}
                      </p>

                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${cat.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
                          {cat.label}
                        </span>
                        {msg.submission?.journal?.abbreviation && (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F5F5] text-[#525252] border border-[#D4D4D8]">
                            {msg.submission.journal.abbreviation}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL BACA PESAN & BALAS CEPAT (KANAN - 7 COLS) */}
        <div className="lg:col-span-7 min-w-0">
          {!selectedMsg ? (
            <div className="card-luxury rounded-2xl p-12 text-center space-y-3">
              <Mail size={42} className="mx-auto text-[#D4D4D4]" />
              <h4 className="text-base font-bold text-[#141414]">Pilih Pesan untuk Membaca</h4>
              <p className="text-xs text-[#4B5563] max-w-sm mx-auto leading-relaxed">
                Klik salah satu pesan di sebelah kiri untuk melihat isi lengkap, alasan penolakan/revisi, atau membalas pesan secara langsung.
              </p>
            </div>
          ) : (() => {
            const cat = CATEGORY_STYLE[selectedMsg.category] || CATEGORY_STYLE.direct;
            const senderObj = selectedMsg.sender || { name: 'Sistem Otomatis OJS BRIDA', email: 'noreply@brida.go.id', role: 'admin' };
            const recipientObj = selectedMsg.recipient || { name: currentUser?.name, email: currentUser?.email, role: currentUser?.role };

            return (
              <div className="card-luxury rounded-2xl overflow-hidden flex flex-col min-w-0">
                {/* Header Detail Pesan */}
                <div className="p-6 border-b border-[#D4D4D8] space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${cat.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
                      {cat.label}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#4B5563]">
                        <Clock size={12} /> {formatDateTime(selectedMsg.created_at)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(selectedMsg)}
                        className="p-1.5 rounded-lg text-[#4B5563] hover:text-[#882832] hover:bg-[#FBF3F4] transition cursor-pointer"
                        title="Hapus pesan"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-[#141414] leading-snug">
                    {selectedMsg.subject}
                  </h3>

                  <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAFAFA] border border-[#D4D4D8] rounded-xl p-3.5 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#7A2222] text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {getInitials(senderObj.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[#141414] flex items-center gap-2 flex-wrap">
                          <span className="truncate">{senderObj.name}</span>
                          {senderObj.role && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-[#7A2222] border border-[#DFBABA]">
                              {ROLE_LABEL[senderObj.role] || senderObj.role}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#4B5563] truncate">
                          Kepada: <strong className="text-[#404040]">{recipientObj.name}</strong> ({recipientObj.email})
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Isi Pesan Lengkap */}
                <div className="p-6 space-y-5">
                  <div className="text-xs sm:text-sm text-[#404040] leading-relaxed whitespace-pre-line bg-white">
                    {selectedMsg.body}
                  </div>

                  {/* Kartu Tautan Naskah Terkait (Jika Ada) */}
                  {selectedMsg.submission && (
                    <div className="rounded-xl bg-[#FDF2F2] border border-[#DFBABA] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#7A2222]">
                          <IconDocClean size={14} /> Naskah Terkait ({selectedMsg.submission.journal?.abbreviation || 'OJS'})
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-[#141414] line-clamp-2">
                          {selectedMsg.submission.title}
                        </div>
                        {selectedMsg.submission.doi && (
                          <div className="text-[11px] font-mono text-[#7A2222]">
                            DOI: {selectedMsg.submission.doi}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {relatedSubmissionObj && onOpenSubmission && (
                          <button
                            type="button"
                            onClick={() => onOpenSubmission(relatedSubmissionObj)}
                            className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#FDF2F2] border border-[#DFBABA] text-[#7A2222] font-semibold text-xs transition cursor-pointer"
                          >
                            Lihat Detail Naskah
                          </button>
                        )}
                        {(currentUser?.role === 'reviewer' || currentUser?.role === 'editor' || currentUser?.role === 'admin') && onGoToReview && (
                          <button
                            type="button"
                            onClick={() => onGoToReview(relatedSubmissionObj || null)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#7A2222] hover:bg-[#611B1B] text-white font-semibold text-xs transition cursor-pointer"
                          >
                            Buka Meja Review <ArrowRight size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Kotak Balas Pesan 2-Arah */}
                <div className="px-6 py-5 bg-[#FAFAFA] border-t border-[#D4D4D8]">
                  {canReplySelected ? (
                    <form onSubmit={handleSendReply} className="space-y-2.5">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-[#404040]">
                        <Reply size={14} className="text-[#7A2222]" />
                        Balas langsung ke{' '}
                        <span className="text-[#7A2222]">
                          {String(selectedMsg.sender_id) === String(currentUser?.id)
                            ? recipientObj.name
                            : senderObj.name}
                        </span>
                      </label>
                      <textarea
                        rows={3}
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder="Tuliskan balasan Anda di sini (akan langsung masuk ke Kotak Masuk penerima)..."
                        className="w-full bg-white border border-[#D4D4D8] focus:border-[#7A2222] focus:ring-2 focus:ring-[#7A2222]/10 rounded-xl p-3.5 text-xs text-[#141414] placeholder:text-[#6B7280] outline-none transition resize-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="submit"
                          disabled={sendingReply || !replyBody.trim()}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7A2222] hover:bg-[#611B1B] disabled:opacity-50 text-white font-semibold text-xs transition cursor-pointer"
                        >
                          <Send size={13} />
                          {sendingReply ? 'Mengirim...' : 'Kirim Balasan'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#525252]">
                      <span>Pesan ini dikirim otomatis oleh sistem OJS BRIDA.</span>
                      <button
                        type="button"
                        onClick={() => setShowCompose(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#7A2222] hover:bg-[#611B1B] text-white font-semibold text-xs cursor-pointer"
                      >
                        <PenSquare size={13} /> Hubungi Dewan Redaksi
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* MODAL TULIS PESAN BARU */}
      {showCompose && (
        <div className="fixed inset-0 z-50 bg-[#141414]/45 backdrop-blur-xs flex items-center justify-center p-4 animate-backdrop-fade">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-[0_20px_50px_-15px_rgba(20,20,20,0.22)] border border-[#D4D4D8] space-y-4 animate-modal-pop">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#141414] flex items-center gap-2">
                  <PenSquare size={18} className="text-[#7A2222]" /> Tulis Pesan Baru
                </h3>
                <p className="text-xs text-[#4B5563] mt-0.5 leading-relaxed">
                  {currentUser?.role === 'author' || currentUser?.role === 'reviewer'
                    ? 'Sesuai etika Double-Blind Peer Review, pesan dikirim melalui Editor / Dewan Redaksi.'
                    : 'Kirim pesan langsung ke Penulis, Mitra Bestari, Editor, atau Admin Portal.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCompose(false)}
                className="text-[#525252] hover:text-[#141414] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendCompose} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#404040] mb-1">Kepada (Penerima) *</label>
                <select
                  required
                  value={composeForm.recipient_id}
                  onChange={(e) => setComposeForm({ ...composeForm, recipient_id: e.target.value })}
                  className="w-full bg-white border border-[#D4D4D8] focus:border-[#7A2222] focus:ring-2 focus:ring-[#7A2222]/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#141414] outline-none cursor-pointer"
                >
                  <option value="">-- Pilih Penerima Pesan --</option>
                  {recipients.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.name} — {ROLE_LABEL[rec.role] || rec.role} ({rec.email})
                    </option>
                  ))}
                </select>
              </div>

              {submissions.length > 0 && (
                <div>
                  <label className="block font-bold text-[#404040] mb-1">Tautkan Naskah (Opsional)</label>
                  <select
                    value={composeForm.submission_id}
                    onChange={(e) => setComposeForm({ ...composeForm, submission_id: e.target.value })}
                    className="w-full bg-white border border-[#D4D4D8] focus:border-[#7A2222] focus:ring-2 focus:ring-[#7A2222]/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#141414] outline-none cursor-pointer"
                  >
                    <option value="">-- Tidak menautkan naskah --</option>
                    {submissions.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.journal?.abbreviation || 'OJS'}] {s.title.slice(0, 65)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-[#404040] mb-1">Subjek Pesan *</label>
                <input
                  type="text"
                  required
                  value={composeForm.subject}
                  onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                  placeholder="Contoh: Klarifikasi Revisi Naskah / Pertanyaan Ruang Lingkup Jurnal"
                  className="w-full bg-white border border-[#D4D4D8] focus:border-[#7A2222] focus:ring-2 focus:ring-[#7A2222]/10 rounded-xl px-3.5 py-2.5 text-xs text-[#141414] placeholder:text-[#6B7280] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#404040] mb-1">Isi Pesan *</label>
                <textarea
                  rows={4}
                  required
                  value={composeForm.body}
                  onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                  placeholder="Tuliskan pesan Anda secara jelas..."
                  className="w-full bg-white border border-[#D4D4D8] focus:border-[#7A2222] focus:ring-2 focus:ring-[#7A2222]/10 rounded-xl p-3.5 text-xs text-[#141414] placeholder:text-[#6B7280] outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D4D4D8]">
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 rounded-lg border border-[#D4D4D8] font-semibold text-[#525252] hover:bg-[#FAFAFA] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={sendingCompose}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#7A2222] hover:bg-[#611B1B] text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  <Send size={13} /> {sendingCompose ? 'Mengirim...' : 'Kirim Pesan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
