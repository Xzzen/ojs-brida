import React, { useState } from 'react';
import axios from 'axios';
import {
  ShieldCheck,
  BookOpen,
  UserCheck,
  ArrowRight,
  Lock,
  Mail,
  Sparkles,
  Building2,
  User,
  Briefcase,
  AlertCircle,
  CheckCircle2
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
      setErrorMsg("Harap centang kotak verifikasi 'I'm not a robot' terlebih dahulu.");
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
        if (res.data?.data) {
          onLogin(res.data.data);
        }
      } else {
        const res = await axios.post(`${API_BASE}/login`, {
          email: email.trim(),
          password
        });
        if (res.data?.data) {
          onLogin(res.data.data);
        }
      }
    } catch (err) {
      const serverMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat()[0]
          : null) ||
        'Gagal terhubung ke server API backend. Pastikan server aktif.';
      setErrorMsg(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full relative overflow-x-hidden flex flex-col justify-between py-6 px-4 sm:px-8 select-none"
      style={{
        background: 'linear-gradient(145deg, #8bb4de 0%, #c2dcf2 38%, #dcebf8 70%, #9ec2e6 100%)'
      }}
    >
      {/* Decorative ambient radial glows */}
      <div
        className="pointer-events-none absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full opacity-45 blur-3xl"
        style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-24 w-[600px] h-[600px] rounded-full opacity-45 blur-3xl"
        style={{ background: 'radial-gradient(circle, #1d4ed8 0%, transparent 70%)' }}
      />

      {/* Top Header Bar */}
      <header className="relative z-20 max-w-[1140px] w-full mx-auto flex flex-wrap items-center justify-between gap-4 bg-white/75 backdrop-blur-md border border-white/80 rounded-2xl px-6 py-3.5 shadow-[0_8px_30px_rgba(27,73,138,0.1)]">
        <div className="flex items-center gap-3">
          <img
            src="/assets/brida-logo.png"
            alt="BRIDA Kota Makassar"
            className="h-10 sm:h-11 object-contain"
          />
          <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-wider text-[#153e75] bg-[#eaf2fb] px-3 py-1 rounded-full border border-blue-200">
            Multi-Journal System
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenPublicPortal}
          className="flex items-center gap-2 bg-[#153e75] hover:bg-[#0f2e5a] text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-md transition cursor-pointer"
        >
          <BookOpen size={16} />
          <span>Jelajahi Portal Publik (Tanpa Login)</span>
          <ArrowRight size={16} />
        </button>
      </header>

      {/* Main Split Card */}
      <div className="relative z-10 my-6 max-w-[1080px] w-full mx-auto bg-white rounded-[28px] shadow-[0_25px_70px_rgba(19,59,118,0.22)] border-2 border-[#1e4b85]/40 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Side: "Start your journey" with Notebook Illustration */}
        <div className="lg:col-span-6 relative rounded-[20px] overflow-hidden min-h-[360px] lg:min-h-[580px] flex flex-col justify-between p-6 sm:p-8 select-none">
          <img
            src="/assets/login-bg.png"
            alt="Sky Background"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <img
            src="/assets/login-notebook.png"
            alt="Notebook and Fountain Pen"
            className="absolute right-0 bottom-0 w-[92%] max-w-none object-contain pointer-events-none drop-shadow-2xl"
          />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-bold border border-white/30">
              <Sparkles size={13} className="text-amber-300" />
              Sistem Publikasi Ilmiah Terakreditasi
            </span>
          </div>

          <div className="relative z-10">
            <h2 className="text-white font-extrabold text-4xl sm:text-[50px] leading-[1.06] tracking-tight drop-shadow-[0_4px_16px_rgba(10,37,77,0.35)]">
              Start your
              <br />
              journey
            </h2>
            <p className="text-white/85 text-xs sm:text-sm mt-3 max-w-xs drop-shadow-sm font-medium">
              Satu portal terintegrasi untuk seluruh jurnal ilmiah Badan Riset dan Inovasi Daerah (BRIDA) Kota Makassar.
            </p>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="lg:col-span-6 flex flex-col justify-center px-2 sm:px-6 py-2">
          <div className="mb-3">
            <img
              src="/assets/brida-logo.png"
              alt="BRIDA Kota Makassar"
              className="h-11 sm:h-12 object-contain"
            />
          </div>

          <p className="text-[11px] font-extrabold tracking-wider text-slate-800 uppercase mb-1">
            MENCARI, MENERBITKAN, DAMPAK.
          </p>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 leading-tight mb-1">
            {mode === 'login' ? 'Masuk ke Portal OJS' : 'Daftar Akun Baru'}
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-500 mb-4">
            {mode === 'login'
              ? 'Masuk menggunakan email dan kata sandi akun terdaftar Anda'
              : 'Daftarkan akun Penulis atau Mitra Bestari (Reviewer) untuk mulai berkontribusi'}
          </p>

          {/* Error / Info Alerts */}
          {errorMsg && (
            <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {infoMsg && (
            <div className="mb-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-[#153e75] text-xs font-semibold flex items-start gap-2">
              <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap &amp; Gelar <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Dr. Ahmad Fauzi, M.T."
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#153e75] focus:ring-2 focus:ring-[#153e75]/15 transition"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Instansi / Afiliasi
                    </label>
                    <div className="relative">
                      <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={affiliation}
                        onChange={(e) => setAffiliation(e.target.value)}
                        placeholder="Universitas / Instansi"
                        className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#153e75] transition"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Daftar Sebagai
                    </label>
                    <div className="relative">
                      <UserCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        value={registerRole}
                        onChange={(e) => setRegisterRole(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#153e75] transition"
                      >
                        <option value="author">Penulis (Author)</option>
                        <option value="reviewer">Reviewer (Mitra Bestari)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {registerRole === 'reviewer' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bidang Keahlian / Kepakaran (Specialty)
                    </label>
                    <div className="relative">
                      <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        placeholder="Misal: Kebijakan Publik, Smart City, Kesehatan Lingkungan"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#153e75] transition"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@instansi.ac.id"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#153e75] focus:ring-2 focus:ring-[#153e75]/15 transition"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kata sandi <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Minimal 6 karakter' : 'Masukkan kata sandi anda'}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#153e75] focus:ring-2 focus:ring-[#153e75]/15 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? '👁' : '👁‍🗨'}
                </button>
              </div>
            </div>

            {/* reCAPTCHA Box ("I'm not a robot") */}
            <div
              onClick={() => {
                setNotRobot(!notRobot);
                if (!notRobot) setErrorMsg('');
              }}
              className="w-full sm:w-[260px] px-3 py-2 rounded-lg border border-slate-300 bg-[#f9fafb] flex items-center justify-between cursor-pointer select-none shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                    notRobot
                      ? 'bg-[#153e75] border-[#153e75] text-white'
                      : 'bg-white border-slate-400'
                  }`}
                >
                  {notRobot && (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-xs font-medium text-slate-700">I'm not a robot</span>
              </div>
              <div className="flex flex-col items-center text-[8px] text-slate-400 leading-tight">
                <svg className="w-4 h-4 text-[#1e50a2] mb-0.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a10 10 0 1010 10h-2a8 8 0 11-2.34-5.66l-2.16 2.16H22V2l-2.92 2.92A9.96 9.96 0 0012 2z" />
                </svg>
                <span>reCAPTCHA</span>
              </div>
            </div>

            {/* Security SSL Note */}
            <div className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
              <ShieldCheck size={16} className="text-slate-500 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-700 font-semibold">Keamanan data terjamin</strong> - Kami menggunakan enkripsi SSL untuk melindungi data anda
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#153e75] hover:bg-[#102e5a] text-white font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-60"
            >
              {loading ? 'Memproses...' : mode === 'login' ? 'Masuk ke Portal OJS' : 'Daftar Akun Baru'}
            </button>
          </form>

          {/* Divider "or" */}
          <div className="my-3 flex items-center gap-3">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-xs text-slate-400 font-medium">or</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          {/* Footer Toggle between Login & Register */}
          <div className="text-center space-y-1 text-xs">
            <p className="text-slate-600">
              {mode === 'login' ? 'Belum mempunyai akun? ' : 'Sudah mempunyai akun? '}
              <button
                type="button"
                onClick={() => handleSwitchMode(mode === 'login' ? 'register' : 'login')}
                className="font-bold text-[#153e75] hover:underline cursor-pointer"
              >
                {mode === 'login' ? 'Daftar sekarang' : 'Masuk sekarang'}
              </button>
            </p>
            {mode === 'login' && (
              <p className="text-slate-400">
                Lupa password?{' '}
                <button
                  type="button"
                  onClick={() =>
                    setInfoMsg(
                      'Silakan hubungi Administrator Portal OJS BRIDA Kota Makassar (admin@brida.go.id) untuk pemulihan kata sandi.'
                    )
                  }
                  className="font-semibold text-slate-600 hover:text-[#153e75] hover:underline cursor-pointer"
                >
                  Hubungi Admin
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 text-center text-[11px] text-[#153e75]/80 font-medium">
        Portal Multi-Journal Open Journal Systems (OJS) • Badan Riset dan Inovasi Daerah (BRIDA) Kota Makassar
      </div>
    </div>
  );
}
