import React, { useState } from 'react';
import { ShieldCheck, BookOpen, UserCheck, Award, ArrowRight, Lock, Mail, Sparkles, Building2 } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    role: 'admin',
    label: 'Chief Editor / Admin Portal',
    name: 'Dr. Ir. H. Andi Syahrul, M.Si.',
    email: 'admin@brida.go.id',
    affiliation: 'Kepala Dewan Redaksi — BRIDA Kota Makassar',
    badgeColor: 'bg-red-100 text-red-800 border-red-200',
    desc: 'Akses penuh: Kelola Multi-Jurnal, Tugaskan Reviewer, & Terbitkan Nomor DOI'
  },
  {
    role: 'reviewer',
    label: 'Reviewer (Mitra Bestari)',
    name: 'Prof. Dr. Eng. Azwan Alghifari, M.T.',
    email: 'reviewer@brida.go.id',
    affiliation: 'Departemen Teknik Informatika — UNHAS',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    desc: 'Beri skor penilaian (Orisinalitas, Metodologi, Relevansi) & Keputusan Review'
  },
  {
    role: 'author',
    label: 'Author (Penulis / Peneliti)',
    name: 'Balanza Aryandi Datu Hari Putra',
    email: 'author@brida.com',
    affiliation: 'Peneliti — Universitas Hasanuddin',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    desc: 'Pilih jurnal tujuan, unggah naskah PDF, & pantau status peer-review'
  }
];

export default function Login({ onLogin, onOpenPublicPortal }) {
  const [email, setEmail] = useState('admin@brida.go.id');
  const [password, setPassword] = useState('password');
  const [selectedRole, setSelectedRole] = useState(DEMO_ACCOUNTS[0]);
  const [loading, setLoading] = useState(false);

  const handleSelectDemo = (acc) => {
    setSelectedRole(acc);
    setEmail(acc.email);
    setPassword('password');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin(selectedRole);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 flex flex-col justify-between p-4 md:p-8">
      {/* Top Header Bar */}
      <header className="max-w-6xl w-full mx-auto flex flex-wrap items-center justify-between gap-4 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-red-700 p-2.5 rounded-xl shadow-lg border border-red-500/40">
            <Building2 size={26} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-wide">PORTAL OJS BRIDA</span>
              <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-red-600/80 border border-red-400/40">
                Multi-Journal System
              </span>
            </div>
            <p className="text-xs text-red-200">Badan Riset dan Inovasi Daerah Kota Makassar</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenPublicPortal}
          className="flex items-center gap-2 bg-white text-red-900 hover:bg-red-50 font-bold text-sm px-4 py-2.5 rounded-xl shadow-md transition cursor-pointer"
        >
          <BookOpen size={17} />
          Jelajahi Katalog Jurnal Publik
          <ArrowRight size={16} />
        </button>
      </header>

      {/* Center Content */}
      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 items-center">
        {/* Left Info Column */}
        <div className="lg:col-span-7 text-white space-y-6 pr-0 lg:pr-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/20 border border-red-400/30 text-red-200 text-xs font-semibold">
            <ShieldCheck size={16} className="text-red-400" />
            Arsitektur Defensif Berbasis Laravel REST API & React SPA
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight">
            Sistem Inovasi <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-amber-300">OJS Multi-Journal</span> Kota Makassar
          </h1>

          <p className="text-slate-300 text-base leading-relaxed">
            Platform terpusat pengelolaan dan penerbitan jurnal ilmiah milik <strong>Badan Riset dan Inovasi Daerah (BRIDA) Kota Makassar</strong>. Menaungi berbagai jurnal lintas disiplin ilmu dengan standar <em>double-blind peer review</em> dan perlindungan keamanan anti-spam berlapis.
          </p>

          {/* Quick Demo Switcher Cards */}
          <div className="space-y-3 pt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-red-300 flex items-center gap-1.5">
              <Sparkles size={14} /> Pilih Akun Demo (Klik untuk Ganti Peran Login):
            </p>
            <div className="grid grid-cols-1 gap-3">
              {DEMO_ACCOUNTS.map((acc) => {
                const active = selectedRole.role === acc.role;
                return (
                  <div
                    key={acc.role}
                    onClick={() => handleSelectDemo(acc)}
                    className={`p-4 rounded-xl border transition cursor-pointer flex items-start justify-between gap-4 ${
                      active
                        ? 'bg-white/15 border-red-400 shadow-lg ring-2 ring-red-400/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${acc.badgeColor}`}>
                          {acc.label}
                        </span>
                        <span className="font-bold text-sm text-white">{acc.name}</span>
                      </div>
                      <p className="text-xs text-slate-300">{acc.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 shrink-0 ${active ? 'border-red-400 bg-red-500' : 'border-slate-400'}`}>
                      {active && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Login Card */}
        <div className="lg:col-span-5 bg-white rounded-3xl shadow-2xl p-8 border-t-8 border-red-800">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-red-700 bg-red-50 px-3 py-1 rounded-full">
              Single Sign-On (SSO) OJS
            </span>
            <h2 className="text-2xl font-extrabold text-slate-800 mt-3">Masuk ke Portal OJS</h2>
            <p className="text-slate-500 text-sm mt-1">
              Satu akun terintegrasi untuk seluruh jurnal di ekosistem BRIDA.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-slate-700 text-sm font-bold mb-2">Email Institusi / Pengguna</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-red-600 focus:bg-white focus:outline-none text-sm font-medium transition"
                  placeholder="nama@brida.go.id"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 text-sm font-bold mb-2">Kata Sandi</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-red-600 focus:bg-white focus:outline-none text-sm font-medium transition"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <UserCheck size={15} className="text-red-700" />
                Masuk Sebagai: <span className="text-red-700">{selectedRole.name}</span>
              </div>
              <div>Peran Aktif: <strong>{selectedRole.label}</strong></div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-red-800 hover:bg-red-900 text-white font-bold text-sm shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Memverifikasi Kredensial...' : 'Masuk ke Dasbor Multi-Journal'}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={onOpenPublicPortal}
              className="text-xs font-bold text-red-700 hover:text-red-900 hover:underline cursor-pointer"
            >
              Atau lihat terbitan jurnal tanpa login (Mode Pembaca Publik) →
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center text-xs text-slate-400 py-2">
        © 2026 Badan Riset dan Inovasi Daerah (BRIDA) Kota Makassar • Rekayasa Perangkat Lunak
      </footer>
    </div>
  );
}
