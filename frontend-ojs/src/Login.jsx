import React, { useState, useRef, useEffect } from 'react';
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
  const [mode, setMode] = useState('login'); // Target posisi kartu: 'login' | 'register'
  const [overlayMode, setOverlayMode] = useState('login'); // Teks di dalam kartu gelap (diganti diam-diam saat ter-blur di midpoint)
  const [isBlurring, setIsBlurring] = useState(false); // Efek motion-blur lembut saat kartu sedang meluncur
  const timerMidRef = useRef(null);
  const timerEndRef = useRef(null);

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

  const isRegister = mode === 'register';

  useEffect(() => {
    return () => {
      if (timerMidRef.current) clearTimeout(timerMidRef.current);
      if (timerEndRef.current) clearTimeout(timerEndRef.current);
    };
  }, []);

  const handleSwitchMode = (nextMode) => {
    if (nextMode === mode) return;

    if (timerMidRef.current) clearTimeout(timerMidRef.current);
    if (timerEndRef.current) clearTimeout(timerEndRef.current);

    // Fase 1: Blur lembut konten + mulai luncurkan kartu menimpa
    setIsBlurring(true);
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

    // Fase 2 (Midpoint 340ms): Ganti teks kartu gelap secara diam-diam saat sedang ter-blur/redup
    timerMidRef.current = setTimeout(() => {
      setOverlayMode(nextMode);
    }, 340);

    // Fase 3 (430ms): Buka kembali blur sehingga konten baru muncul mulus saat kartu mendarat
    timerEndRef.current = setTimeout(() => {
      setIsBlurring(false);
    }, 430);
  };

  const handleSubmit = async (e, submitMode) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!notRobot) {
      setErrorMsg("Harap centang verifikasi 'I'm not a robot' terlebih dahulu.");
      return;
    }

    setLoading(true);
    try {
      if (submitMode === 'register') {
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
        const userPayload = res.data?.data || res.data?.user;
        if (userPayload) {
          onLogin(userPayload);
        } else {
          setErrorMsg(res.data?.message || 'Pendaftaran tidak mengembalikan data akun. Silakan coba lagi.');
        }
      } else {
        const res = await axios.post(`${API_BASE}/login`, {
          email: email.trim(),
          password
        });
        const userPayload = res.data?.data || res.data?.user;
        if (userPayload) {
          onLogin(userPayload);
        } else {
          setErrorMsg(res.data?.message || 'Login berhasil, tetapi data akun tidak ditemukan.');
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

  // Reusable minimalist "I'm not a robot" verification pill
  const renderRobotPill = () => (
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
            notRobot ? 'bg-[#7A2222] border-[#7A2222] text-white' : 'bg-white border-gray-300'
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
  );

  return (
    <div
      className="min-h-screen w-full relative overflow-x-hidden flex items-center justify-center py-6 px-4 sm:px-8 select-none"
      style={{
        background: 'linear-gradient(145deg, #F9FAFB 0%, #FDF7F7 50%, #F3E9E9 100%)'
      }}
    >
      {/* Subtle Ambient SIGAP BRIDA Maroon Halo Behind the Card */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[640px] h-[340px] rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, #7A2222 0%, #4A1313 45%, transparent 75%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-1/4 w-[480px] h-[260px] rounded-full opacity-15 blur-3xl"
        style={{ background: 'radial-gradient(circle, #FBBF24 0%, #7A2222 45%, transparent 70%)' }}
      />

      {/* ====================================================================
          BASE WHITE CARD CONTAINER (DUA FORM TERPASANG TETAP DI KIRI & KANAN,
          DITIMPA KARTU GELAP YANG MELUNCUR HALUS + SOFT BLUR MORPH!)
         ==================================================================== */}
      <div className="relative z-10 w-full max-w-[1040px] lg:h-[680px] rounded-[32px] bg-white shadow-[0_40px_110px_-24px_rgba(28,10,10,0.38)] border border-white/80 overflow-hidden flex flex-col lg:block">
        {/* ================================================================
            SISI KIRI BAWAH (LAYER 1): FORM DAFTAR AKUN
            Muncul halus dari blur tepat saat kartu gelap menyingkapnya!
           ================================================================ */}
        <div
          className={`w-full lg:w-1/2 lg:h-full lg:absolute lg:top-0 lg:left-0 bg-white px-7 sm:px-11 py-6 sm:py-7 flex flex-col justify-between overflow-y-auto transition-all duration-700 ease-out ${
            isRegister
              ? 'opacity-100 blur-0 scale-100 pointer-events-auto z-10 lg:delay-200'
              : 'hidden lg:flex lg:opacity-0 lg:blur-md lg:scale-[0.97] lg:pointer-events-none lg:z-0 lg:delay-0'
          }`}
        >
          <div className="flex items-center justify-between gap-3 shrink-0">
            <img
              src="/assets/brida-logo.png"
              alt="BRIDA Kota Makassar"
              className="h-9 sm:h-10 object-contain"
            />
            <button
              type="button"
              onClick={() => handleSwitchMode('login')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-gray-200 hover:border-[#7A2222]/40 hover:bg-[#FDF7F7] text-xs font-semibold text-gray-700 hover:text-[#7A2222] transition cursor-pointer"
            >
              <LogIn size={13} className="text-[#7A2222]" />
              <span>Masuk</span>
            </button>
          </div>

          <div className="w-full max-w-[360px] mx-auto my-auto py-3">
            <h1 className="text-[28px] sm:text-[32px] font-semibold text-gray-900 tracking-tight leading-tight mb-1">
              Daftar Akun
            </h1>
            <p className="text-xs text-gray-400 mb-4">
              Buat akun Penulis atau Reviewer baru
            </p>

            {errorMsg && isRegister && (
              <div className="mb-3 px-4 py-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={(e) => handleSubmit(e, 'register')} className="space-y-2.5">
              <div className="relative">
                <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Lengkap & Gelar *"
                  className="w-full pl-11 pr-5 py-2.5 rounded-full border border-gray-200 bg-white text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#7A2222] focus:ring-4 focus:ring-[#7A2222]/10 transition"
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 bg-white text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#7A2222] focus:ring-4 focus:ring-[#7A2222]/10 transition"
                  />
                </div>
                <div className="relative">
                  <UserCheck size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={registerRole}
                    onChange={(e) => setRegisterRole(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#7A2222] transition cursor-pointer"
                  >
                    <option value="author">Penulis</option>
                    <option value="reviewer">Reviewer</option>
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
                    className="w-full pl-11 pr-5 py-2.5 rounded-full border border-gray-200 bg-white text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#7A2222] focus:ring-4 focus:ring-[#7A2222]/10 transition"
                  />
                </div>
              )}

              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email akun Anda"
                  className="w-full pl-11 pr-5 py-2.5 rounded-full border border-gray-200 bg-white text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#7A2222] focus:ring-4 focus:ring-[#7A2222]/10 transition"
                  required
                />
              </div>

              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kata sandi (minimal 6 karakter)"
                  className="w-full pl-11 pr-12 py-2.5 rounded-full border border-gray-200 bg-white text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#7A2222] focus:ring-4 focus:ring-[#7A2222]/10 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Tampilkan atau sembunyikan kata sandi"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition cursor-pointer"
                >
                  {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>

              {renderRobotPill()}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-[#7A2222] hover:bg-[#661B1B] active:scale-[0.99] text-white font-semibold text-sm shadow-[0_12px_26px_-8px_rgba(122,34,34,0.52)] transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <UserCheck size={16} />
                <span>{loading ? 'Memproses...' : 'Daftar Akun Baru'}</span>
              </button>
            </form>

            <div className="mt-4 text-center space-y-1.5">
              <p className="text-xs text-gray-500">
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={() => handleSwitchMode('login')}
                  className="font-bold text-[#7A2222] hover:underline cursor-pointer"
                >
                  Masuk di sini
                </button>
              </p>
              <button
                type="button"
                onClick={onOpenPublicPortal}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#7A2222] transition cursor-pointer"
              >
                <BookOpen size={13} />
                <span>Jelajahi Portal Publik tanpa login</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400 shrink-0">
            <span>© 2026 BRIDA Kota Makassar</span>
            <span className="text-gray-500 font-semibold">OJS • ID</span>
          </div>
        </div>

        {/* ================================================================
            SISI KANAN BAWAH (LAYER 1): FORM MASUK
            Muncul halus dari blur tepat saat kartu gelap menyingkapnya!
           ================================================================ */}
        <div
          className={`w-full lg:w-1/2 lg:h-full lg:absolute lg:top-0 lg:right-0 bg-white px-7 sm:px-11 py-6 sm:py-7 flex flex-col justify-between overflow-y-auto transition-all duration-700 ease-out ${
            !isRegister
              ? 'opacity-100 blur-0 scale-100 pointer-events-auto z-10 lg:delay-200'
              : 'hidden lg:flex lg:opacity-0 lg:blur-md lg:scale-[0.97] lg:pointer-events-none lg:z-0 lg:delay-0'
          }`}
        >
          <div className="flex items-center justify-between gap-3 shrink-0">
            <img
              src="/assets/brida-logo.png"
              alt="BRIDA Kota Makassar"
              className="h-9 sm:h-10 object-contain"
            />
            <button
              type="button"
              onClick={() => handleSwitchMode('register')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-gray-200 hover:border-[#7A2222]/40 hover:bg-[#FDF7F7] text-xs font-semibold text-gray-700 hover:text-[#7A2222] transition cursor-pointer"
            >
              <User size={13} className="text-[#7A2222]" />
              <span>Daftar Akun</span>
            </button>
          </div>

          <div className="w-full max-w-[360px] mx-auto my-auto py-4">
            <h1 className="text-[30px] sm:text-[34px] font-semibold text-gray-900 tracking-tight leading-tight mb-1.5">
              Masuk
            </h1>
            <p className="text-xs text-gray-400 mb-6">
              Masuk ke Portal E-Journal OJS BRIDA Kota Makassar
            </p>

            {errorMsg && !isRegister && (
              <div className="mb-4 px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            {infoMsg && !isRegister && (
              <div className="mb-4 px-4 py-3 rounded-2xl bg-[#FEF2F2] border border-[#7A2222]/20 text-[#7A2222] text-xs font-semibold flex items-start gap-2">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                <span>{infoMsg}</span>
              </div>
            )}

            <form onSubmit={(e) => handleSubmit(e, 'login')} className="space-y-3.5">
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

              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kata sandi"
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

              <div className="px-2">
                <button
                  type="button"
                  onClick={() =>
                    setInfoMsg(
                      'Silakan hubungi Administrator Portal OJS BRIDA Kota Makassar (admin@brida.go.id) untuk pemulihan kata sandi.'
                    )
                  }
                  className="text-xs font-semibold text-[#7A2222] hover:text-[#4A1313] hover:underline cursor-pointer"
                >
                  Lupa kata sandi?
                </button>
              </div>

              {renderRobotPill()}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-full bg-[#7A2222] hover:bg-[#661B1B] active:scale-[0.99] text-white font-semibold text-sm shadow-[0_12px_26px_-8px_rgba(122,34,34,0.52)] transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <LogIn size={16} />
                <span>{loading ? 'Memproses...' : 'Masuk'}</span>
              </button>
            </form>

            <div className="mt-5 text-center space-y-2">
              <p className="text-xs text-gray-500">
                Belum punya akun?{' '}
                <button
                  type="button"
                  onClick={() => handleSwitchMode('register')}
                  className="font-bold text-[#7A2222] hover:underline cursor-pointer"
                >
                  Daftar sekarang
                </button>
              </p>
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

          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400 shrink-0">
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

        {/* ================================================================
            KARTU GELAP MENIMPA (OVERLAY CURTAIN CARD — Z-30)
            Konten di dalamnya halus blur-morph diam-diam saat meluncur
            sehingga pergantian teks sama sekali tidak terlihat mencolok!
           ================================================================ */}
        <div
          className={`relative lg:absolute lg:top-0 lg:left-0 lg:w-1/2 lg:h-full z-30 overflow-hidden bg-gradient-to-b from-[#7A2222] via-[#661B1B] to-[#4A1313] text-white px-8 pt-7 pb-0 flex flex-col justify-between min-h-[430px] will-change-transform transition-all duration-[850ms] ease-[cubic-bezier(0.76,0,0.24,1)] ${
            isRegister
              ? 'lg:translate-x-full lg:rounded-l-[32px] lg:shadow-[-28px_0_75px_-10px_rgba(74,19,19,0.5)]'
              : 'lg:translate-x-0 lg:rounded-r-[32px] lg:shadow-[28px_0_75px_-10px_rgba(74,19,19,0.5)]'
          }`}
        >
          {/* Ambient Rings & Warm Maroon-Gold Glow */}
          <div className="pointer-events-none absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] rounded-full border border-white/[0.10]" />
          <div className="pointer-events-none absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[410px] h-[410px] rounded-full border border-white/[0.06]" />
          <div
            className="pointer-events-none absolute top-[34%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #FBBF24 0%, transparent 70%)' }}
          />

          {/* Top Tagline (Blur-Morph Halus Saat Berpindah) */}
          <p
            className={`relative z-10 text-center text-[11px] sm:text-xs text-white/55 font-medium tracking-wide transition-all duration-300 ease-out ${
              isBlurring ? 'opacity-0 blur-md -translate-y-1' : 'opacity-100 blur-0 translate-y-0'
            }`}
          >
            {overlayMode === 'register'
              ? 'Bergabung sebagai Penulis atau Reviewer BRIDA Kota Makassar.'
              : 'Publikasi ilmiah modern — satu portal untuk seluruh jurnal BRIDA Makassar.'}
          </p>

          {/* Logo BRIDA (Stabil) + Judul (Blur-Morph Halus di Pertengahan Slide) */}
          <div className="relative z-10 text-center my-4 space-y-4">
            <div className="inline-flex items-center justify-center bg-white/95 rounded-2xl px-4 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.38)] ring-1 ring-white/80">
              <img
                src="/assets/brida-logo.png"
                alt="Logo BRIDA Kota Makassar"
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </div>

            <h2
              className={`text-3xl sm:text-[42px] font-bold tracking-tight leading-[1.08] text-white transition-all duration-300 ease-out ${
                isBlurring ? 'opacity-0 blur-lg scale-95' : 'opacity-100 blur-0 scale-100'
              }`}
            >
              {overlayMode === 'register' ? (
                <>
                  Mulai berkarya
                  <br />
                  bersama BRIDA
                </>
              ) : (
                <>
                  Publikasi
                  <br />
                  riset Anda
                </>
              )}
            </h2>
          </div>

          {/* Bottom Smartphone Mockup (Halus ikut miring + subtle motion blur saat meluncur) */}
          <div className="relative z-10 flex justify-center items-end pt-1">
            <div
              className={`w-[238px] sm:w-[256px] rounded-t-[34px] bg-[#0e0b0b] border-t-[6px] border-x-[6px] border-[#3a2c2c] shadow-[0_-18px_50px_rgba(0,0,0,0.65)] p-3 pb-4 translate-y-2 transition-all duration-[850ms] ease-[cubic-bezier(0.76,0,0.24,1)] hover:rotate-0 ${
                isRegister ? 'rotate-3' : '-rotate-3'
              } ${isBlurring ? 'blur-[1.5px] scale-[0.98]' : 'blur-0 scale-100'}`}
            >
              <div className="w-16 h-3.5 bg-black rounded-full mx-auto mb-3" />
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
                <div className="flex items-end justify-between gap-1.5 h-16 pt-2">
                  {chartBars.map((bar) => (
                    <div key={bar.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div className="w-full bg-gray-100 rounded-md h-full flex items-end overflow-hidden">
                        <div
                          className="w-full rounded-md bg-gradient-to-t from-[#4A1313] via-[#7A2222] to-[#A63232]"
                          style={{ height: `${bar.h}%` }}
                        />
                      </div>
                      <span className="text-[8px] font-bold text-gray-400">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>

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

                <div className="pt-2 flex items-center justify-around text-white/40 border-t border-white/[0.06]">
                  <BookOpen size={12} />
                  <ShieldCheck size={12} />
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#4A1313] via-[#7A2222] to-[#FBBF24] p-[2px] flex items-center justify-center">
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

          {/* Subtle Public Access Pill */}
          <button
            type="button"
            onClick={onOpenPublicPortal}
            className={`hidden lg:inline-flex items-center gap-1.5 absolute bottom-5 z-20 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-[11px] font-semibold text-white/85 transition-all duration-300 cursor-pointer ${
              isRegister ? 'left-5' : 'right-5'
            } ${isBlurring ? 'opacity-0' : 'opacity-100'}`}
          >
            <Globe size={12} className="text-amber-300" />
            Portal Publik
          </button>
        </div>
      </div>
    </div>
  );
}
