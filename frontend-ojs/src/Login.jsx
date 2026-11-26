import React, { useState } from 'react';
import axios from 'axios';
import {
  ShieldCheck,
  BookOpen,
  UserCheck,
  ArrowRight,
  Lock,
  Mail,
  Building2,
  User,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  LogIn,
  Globe
} from 'lucide-react';
import { API_BASE } from './config';

export default function Login({ onLogin, onOpenPublicPortal }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [registerRole, setRegisterRole] = useState('author');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notRobot, setNotRobot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleSwitchMode = (nextMode) => {
    setMode(nextMode);
    setErrorMsg('');
    setInfoMsg('');
    setPassword('');
    setNotRobot(false);
    if (nextMode === 'register') {
      setName('');
      setAffiliation('');
      setSpecialty('');
      setRegisterRole('author');
      setEmail('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!notRobot) {
      setErrorMsg("Harap centang verifikasi 'I'm not a robot' terlebih dahulu.");
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        if (!name.trim()) {
          setErrorMsg('Nama lengkap wajib diisi.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg('Kata sandi minimal 6 karakter.');
          setLoading(false);
          return;
        }
        const res = await axios.post(`${API_BASE}/register`, {
          name: name.trim(),
          email: email.trim(),
          password,
          role: registerRole,
          affiliation: affiliation.trim(),
          specialty: specialty.trim()
        });
        if (res.data?.user) {
          onLogin(res.data.user);
        }
      } else {
        const res = await axios.post(`${API_BASE}/login`, {
          email: email.trim(),
          password
        });
        if (res.data?.user) {
          onLogin(res.data.user);
        }
      }
    } catch (err) {
      const apiMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat()[0]
          : null) ||
        'Gagal terhubung ke server API backend. Pastikan server aktif.';
      setErrorMsg(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  const chartBars = [
    { label: 'S1', h: 42 },
    { label: 'S2', h: 68 },
    { label: 'J1', h: 55 },
    { label: 'J2', h: 86 },
    { label: 'M1', h: 62 },
    { label: 'M2', h: 94 },
    { label: 'K1', h: 74 }
  ];

  return (
    <div
      className="min-h-screen w-full relative overflow-x-hidden flex items-center justify-center py-6 px-4 sm:px-8 select-none"
      style={{
        background: 'linear-gradient(135deg, #ebe7e4 0%, #f4f1ee 50%, #e7e2df 100%)'
      }}
    >
      {/* Subtle Ambient Warm Studio Halo Behind the Card */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[620px] h-[320px] rounded-full opacity-35 blur-3xl"
        style={{ background: 'radial-gradient(circle, #b45309 0%, #7A2222 45%, transparent 75%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-1/4 w-[480px] h-[260px] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #7A2222 0%, transparent 70%)' }}
      />

      {/* MAIN FLOATING LUXURY SPLIT CARD (INSPIRED BY MODERN FINTECH SIGN-IN) */}
      <div className="relative z-10 w-full max-w-[1040px] min-h-[640px] rounded-[32px] bg-[#211414] shadow-[0_38px_100px_-24px_rgba(28,10,10,0.45)] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* ================================================================
            LEFT PANEL: DEEP ESPRESSO-MAROON DARK SHOWCASE
           ================================================================ */}
        <div className="lg:col-span-6 relative bg-gradient-to-b from-[#251717] via-[#1f1212] to-[#150b0b] text-white px-8 pt-9 pb-0 flex flex-col justify-between overflow-hidden min-h-[420px] lg:min-h-[640px]">
          {/* Subtle Concentric Circle Rings Behind Headline */}
          <div className="pointer-events-none absolute top-[34%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] rounded-full border border-white/[0.06]" />
          <div className="pointer-events-none absolute top-[34%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[410px] h-[410px] rounded-full border border-white/[0.04]" />
          <div
            className="pointer-events-none absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full opacity-25 blur-3xl"
            style={{ background: 'radial-gradient(circle, #991B1B 0%, transparent 70%)' }}
          />

          {/* Top Centered Minimal Tagline */}
          <p className="relative z-10 text-center text-[11px] sm:text-xs text-white/55 font-medium tracking-wide">
            Publikasi ilmiah modern — satu portal untuk seluruh jurnal BRIDA Makassar.
          </p>

          {/* Center Bold Display Headline */}
          <div className="relative z-10 text-center my-6 lg:my-8">
            <h2 className="text-4xl sm:text-[46px] font-bold tracking-tight leading-[1.08] text-white">
              Publikasi
              <br />
              riset Anda
            </h2>
          </div>

          {/* Bottom Sleek Tilted Smartphone UI Mockup */}
          <div className="relative z-10 flex justify-center items-end pt-2">
            <div className="w-[248px] sm:w-[266px] rounded-t-[34px] bg-[#0e0b0b] border-t-[6px] border-x-[6px] border-[#3a2c2c] shadow-[0_-18px_50px_rgba(0,0,0,0.65)] p-3 pb-4 -rotate-3 translate-y-2 transition-transform duration-500 hover:rotate-0">
              {/* Dynamic Island */}
              <div className="w-16 h-3.5 bg-black rounded-full mx-auto mb-3" />

              {/* Top Light Analytics Card Inside Phone */}
              <div className="bg-white rounded-2xl p-3.5 text-gray-900 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between text-[9px] text-gray-400 font-semibold">
                  <span>Portal OJS BRIDA</span>
                  <span className="text-emerald-600 font-bold">● Live</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-xl font-extrabold tracking-tight text-gray-900 tabular-nums">
                    4 Jurnal
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#7A2222]">
                    SINTA 2–3
                  </span>
                </div>

                {/* Crimson-Coral Bar Chart (Matching Reference Energy) */}
                <div className="flex items-end justify-between gap-1.5 h-16 pt-2">
                  {chartBars.map((bar) => (
                    <div key={bar.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div className="w-full bg-gray-100 rounded-md h-full flex items-end overflow-hidden">
                        <div
                          className="w-full rounded-md bg-gradient-to-t from-[#7A2222] via-[#DC2626] to-[#F97316]"
                          style={{ height: `${bar.h}%` }}
                        />
                      </div>
                      <span className="text-[8px] font-bold text-gray-400">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lower Dark Metrics Grid Inside Phone */}
              <div className="mt-2.5 space-y-2">
                <div className="text-[9px] font-semibold text-white/45 px-1">Ekosistem Jurnal</div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="bg-white/[0.06] border border-white/[0.07] rounded-xl p-2 text-center">
                    <div className="text-[11px] font-extrabold text-white">Rp 0</div>
                    <div className="text-[8px] text-white/50 mt-0.5">Open Access</div>
                  </div>
                  <div className="bg-white/[0.06] border border-white/[0.07] rounded-xl p-2 text-center">
                    <div className="text-[11px] font-extrabold text-amber-300">DOI</div>
                    <div className="text-[8px] text-white/50 mt-0.5">Resmi Aktif</div>
                  </div>
                  <div className="bg-white/[0.06] border border-white/[0.07] rounded-xl p-2 text-center">
                    <div className="text-[11px] font-extrabold text-emerald-300">IMRAD</div>
                    <div className="text-[8px] text-white/50 mt-0.5">Standar SINTA</div>
                  </div>
                </div>

                {/* Mini Bottom Dock Inside Phone */}
                <div className="pt-2 flex items-center justify-around text-white/40 border-t border-white/[0.06]">
                  <BookOpen size={12} />
                  <ShieldCheck size={12} />
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#7A2222] via-[#DC2626] to-[#FBBF24] p-[2px] flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-[#120c0c] flex items-center justify-center">
                      <img src="/assets/brida-favicon.png" alt="" className="w-3.5 h-3.5 object-contain" />
                    </div>
                  </div>
                  <Globe size={12} />
                  <User size={12} />
                </div>
              </div>
            </div>
          </div>

          {/* Subtle Public Access Pill Bottom-Right of Dark Panel */}
          <button
            type="button"
            onClick={onOpenPublicPortal}
            title="Jelajahi Portal Publik tanpa login"
            className="hidden lg:inline-flex items-center gap-1.5 absolute bottom-5 right-5 z-20 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-[11px] font-semibold text-white/85 transition cursor-pointer"
          >
            <Globe size={12} className="text-amber-300" />
            Portal Publik
          </button>
        </div>

        {/* ================================================================
            RIGHT PANEL: CRISP ULTRA-CLEAN WHITE FORM PANEL
           ================================================================ */}
        <div className="lg:col-span-6 bg-white rounded-[32px] lg:rounded-l-[32px] px-7 sm:px-11 py-7 sm:py-8 flex flex-col justify-between">
          {/* Top Bar Inside Right Panel: BRIDA Logo + Minimalist Sign Up / Sign In Switch */}
          <div className="flex items-center justify-between gap-3">
            <img
              src="/assets/brida-logo.png"
              alt="BRIDA Kota Makassar"
              className="h-9 sm:h-10 object-contain"
            />
            <button
              type="button"
              onClick={() => handleSwitchMode(mode === 'login' ? 'register' : 'login')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#7A2222] transition cursor-pointer"
            >
              <User size={15} className="text-gray-400" />
              <span>{mode === 'login' ? 'Daftar Akun' : 'Masuk'}</span>
            </button>
          </div>

          {/* Center Minimalist Form Area */}
          <div className="w-full max-w-[360px] mx-auto my-6">
            <h1 className="text-[30px] sm:text-[34px] font-semibold text-gray-900 tracking-tight leading-tight mb-1.5">
              {mode === 'login' ? 'Masuk' : 'Daftar Akun'}
            </h1>
            <p className="text-xs text-gray-400 mb-6">
              {mode === 'login'
                ? 'Masuk ke Portal E-Journal OJS BRIDA Kota Makassar'
                : 'Buat akun Penulis atau Mitra Bestari (Reviewer) baru'}
            </p>

            {/* Error / Info Alerts */}
            {errorMsg && (
              <div className="mb-4 px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            {infoMsg && (
              <div className="mb-4 px-4 py-3 rounded-2xl bg-[#FEF2F2] border border-[#7A2222]/20 text-[#7A2222] text-xs font-semibold flex items-start gap-2">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                <span>{infoMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'register' && (
                <>
                  <div className="relative">
                    <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama Lengkap & Gelar *"
                      className="w-full pl-11 pr-5 py-3 rounded-full border border-gray-200 bg-white text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#7A2222] focus:ring-4 focus:ring-[#7A2222]/10 transition"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="relative">
                      <Building2 size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={affiliation}
                        onChange={(e) => setAffiliation(e.target.value)}
                        placeholder="Instansi / Afiliasi"
                        className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-200 bg-white text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#7A2222] focus:ring-4 focus:ring-[#7A2222]/10 transition"
                      />
                    </div>
                    <div className="relative">
                      <UserCheck size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <select
                        value={registerRole}
                        onChange={(e) => setRegisterRole(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#7A2222] transition cursor-pointer"
                      >
                        <option value="author">Penulis (Author)</option>
                        <option value="reviewer">Mitra Bestari</option>
                      </select>
                    </div>
                  </div>

                  {registerRole === 'reviewer' && (
                    <div className="relative">
                      <Briefcase size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        placeholder="Bidang Keahlian (mis. Smart City, Kesehatan)"
                        className="w-full pl-11 pr-5 py-3 rounded-full border border-gray-200 bg-white text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#7A2222] focus:ring-4 focus:ring-[#7A2222]/10 transition"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Email Pill Input */}
              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email akun Anda"
                  className="w-full pl-11 pr-5 py-3.5 rounded-full border border-gray-200 bg-white text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#7A2222] focus:ring-4 focus:ring-[#7A2222]/10 transition"
                  required
                />
              </div>

              {/* Password Pill Input */}
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Kata sandi (minimal 6 karakter)' : 'Kata sandi'}
                  className="w-full pl-11 pr-12 py-3.5 rounded-full border border-gray-200 bg-white text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#7A2222] focus:ring-4 focus:ring-[#7A2222]/10 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Tampilkan atau sembunyikan kata sandi"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                >
                  {showPassword ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
              </div>

              {/* Forgot Password Link (Matching Reference Placement) */}
              {mode === 'login' && (
                <div className="px-2">
                  <button
                    type="button"
                    onClick={() =>
                      setInfoMsg(
                        'Silakan hubungi Administrator Portal OJS BRIDA Kota Makassar (admin@brida.go.id) untuk pemulihan kata sandi.'
                      )
                    }
                    className="text-xs font-semibold text-[#B91C1C] hover:text-[#7A2222] hover:underline cursor-pointer"
                  >
                    Lupa kata sandi?
                  </button>
                </div>
              )}

              {/* Minimalist "I'm not a robot" Verification Pill */}
              <div
                onClick={() => {
                  setNotRobot(!notRobot);
                  if (!notRobot) setErrorMsg('');
                }}
                className={`px-4 py-2.5 rounded-full border flex items-center justify-between cursor-pointer select-none transition ${
                  notRobot
                    ? 'border-[#7A2222]/40 bg-[#FDF7F7]'
                    : 'border-gray-200 bg-gray-50/70 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                      notRobot
                        ? 'bg-[#7A2222] border-[#7A2222] text-white'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {notRobot && (
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-600">I&apos;m not a robot</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-400">
                  <ShieldCheck size={13} className="text-[#7A2222]/70" />
                  SSL Verified
                </span>
              </div>

              {/* Signature Vibrant Maroon-to-Coral Gradient Pill CTA Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#7A2222] via-[#C2272D] to-[#EA580C] hover:brightness-105 active:scale-[0.99] text-white font-semibold text-sm shadow-[0_14px_28px_-8px_rgba(185,28,28,0.52)] transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <LogIn size={16} />
                <span>
                  {loading
                    ? 'Memproses...'
                    : mode === 'login'
                    ? 'Masuk'
                    : 'Daftar Akun Baru'}
                </span>
              </button>
            </form>

            {/* Quick Open-Access Visitor Action */}
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={onOpenPublicPortal}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#7A2222] transition cursor-pointer"
              >
                <BookOpen size={14} />
                <span>Jelajahi Portal Publik tanpa login</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Bottom Minimalist Footer Inside Right Panel */}
          <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400">
            <span>© 2026 BRIDA Kota Makassar</span>
            <div className="flex items-center gap-4 font-medium">
              <button
                type="button"
                onClick={onOpenPublicPortal}
                className="hover:text-[#7A2222] transition cursor-pointer"
              >
                Portal Publik
              </button>
              <span className="text-gray-500 font-semibold">OJS • ID</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
