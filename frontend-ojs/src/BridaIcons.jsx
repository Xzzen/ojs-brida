import React from 'react';

const baseProps = (size = 16, className = '') => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: `shrink-0 ${className}`.trim()
});

/** Dokumen Ilmiah Clean Duotone (menggantikan ikon dokumen default & emoji 📄) */
export function IconDocClean({ size = 16, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <path
        d="M7 3.5h6.8L18.5 8.2V19a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Z"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <path d="M13.5 3.5V8.5h5" />
      <path d="M8.75 12h6.5" />
      <path d="M8.75 15.5h4.5" />
    </svg>
  );
}

/** Unggah Naskah / Manuscript Upload Duotone */
export function IconDocUpload({ size = 16, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <path
        d="M6.5 20h11a3.5 3.5 0 0 0 .8-6.91A5.25 5.25 0 0 0 8.1 10.6 3.75 3.75 0 0 0 6.5 20Z"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <path d="M12 16v-6.5" />
      <path d="m9.25 12.25 2.75-2.75 2.75 2.75" />
    </svg>
  );
}

/** Dokumen Terverifikasi / Evaluasi & Checklist Duotone */
export function IconDocCheck({ size = 16, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <path
        d="M7 3.5h6.8L18.5 8.2V19a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Z"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <path d="M13.5 3.5V8.5h5" />
      <path d="m9 14.2 2 2 4-4.2" />
    </svg>
  );
}

/** Telaah Sejawat / Peer-Review Magnifying Manuscript Duotone */
export function IconDocReview({ size = 16, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <path
        d="M6.5 3.5h8.2L18.5 7.3V11"
        fill="currentColor"
        fillOpacity="0.08"
      />
      <path d="M10.5 20.5H6.5A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5h8.2L18.5 7.3V10" />
      <path d="M8.5 9.5h4.5" />
      <circle cx="15.75" cy="15.75" r="3.5" fill="currentColor" fillOpacity="0.16" />
      <path d="m18.4 18.4 2.1 2.1" />
    </svg>
  );
}

/** Revisi / Penyempurnaan Naskah Duotone */
export function IconDocRevision({ size = 16, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <circle cx="12" cy="12" r="8.5" fill="currentColor" fillOpacity="0.1" stroke="none" />
      <path d="M20 11a8 8 0 0 0-14.2-4.6L4.5 8" />
      <path d="M4.5 4.2V8h3.8" />
      <path d="M4 13a8 8 0 0 0 14.2 4.6L19.5 16" />
      <path d="M19.5 19.8V16h-3.8" />
    </svg>
  );
}

/** Artikel Resmi Terbit & Sertifikasi DOI Duotone */
export function IconDocPublish({ size = 16, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <circle cx="12" cy="9.5" r="5.5" fill="currentColor" fillOpacity="0.14" />
      <path d="m9.5 14.3-1.2 6.2L12 18.6l3.7 1.9-1.2-6.2" />
      <path d="m9.7 9.6 1.6 1.6 3.1-3.2" />
    </svg>
  );
}

/** Portal Publik Globe Duotone */
export function IconPortalGlobe({ size = 16, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <circle cx="12" cy="12" r="8.75" fill="currentColor" fillOpacity="0.12" />
      <ellipse cx="12" cy="12" rx="3.8" ry="8.75" />
      <path d="M3.7 9.2h16.6" />
      <path d="M3.7 14.8h16.6" />
    </svg>
  );
}

/** Dasbor & Analitik Bar Duotone */
export function IconAnalytics({ size = 16, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <rect x="4" y="12.5" width="3.8" height="7.5" rx="1.4" fill="currentColor" fillOpacity="0.16" />
      <rect x="10.1" y="8" width="3.8" height="12" rx="1.4" fill="currentColor" fillOpacity="0.22" />
      <rect x="16.2" y="4" width="3.8" height="16" rx="1.4" fill="currentColor" fillOpacity="0.16" />
    </svg>
  );
}

/** Kotak Masuk / Mail Duotone */
export function IconInboxClean({ size = 16, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <rect x="3.25" y="5.25" width="17.5" height="13.5" rx="2.5" fill="currentColor" fillOpacity="0.12" />
      <path d="m4.5 7.2 7.5 5.6 7.5-5.6" />
    </svg>
  );
}

/** Trending & Forum Spark Duotone */
export function IconTrendingSpark({ size = 16, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <path
        d="M12.6 3.3c.4 3.4-2.1 5-2.1 7.2 0 1.2.8 2 1.8 2 1.3 0 2.3-1.2 2.5-2.7 2.2 1.7 3.7 4 3.7 6.5a6.5 6.5 0 1 1-13 0c0-3.2 2.1-6.5 7.1-13Z"
        fill="currentColor"
        fillOpacity="0.15"
      />
    </svg>
  );
}

/** Manajemen Multi-Jurnal Stack Duotone */
export function IconJournalStack({ size = 16, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <path
        d="M4.5 6.2A2.2 2.2 0 0 1 6.7 4h12.8v14.2H6.7a2.2 2.2 0 0 0-2.2 2.2V6.2Z"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <path d="M4.5 18.2A2.2 2.2 0 0 1 6.7 16h12.8" />
      <path d="M8.5 8.5h7" />
      <path d="M8.5 11.8h4.5" />
    </svg>
  );
}

/** Manajemen Pengguna & Reviewer Duotone */
export function IconUsersGroup({ size = 16, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <circle cx="9.2" cy="8.2" r="3.2" fill="currentColor" fillOpacity="0.16" />
      <path d="M3.5 19.2c.4-3.1 2.8-5 5.7-5s5.3 1.9 5.7 5" fill="currentColor" fillOpacity="0.1" />
      <circle cx="16.5" cy="9.2" r="2.4" />
      <path d="M16.5 14.4c2.1.2 3.8 1.7 4.2 4.3" />
    </svg>
  );
}

/** Terbit / Disetujui / Verified Badge Duotone (menggantikan ✅) */
export function IconVerifiedBadge({ size = 14, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <circle cx="12" cy="12" r="8.75" fill="currentColor" fillOpacity="0.14" />
      <path d="m8.6 12.2 2.2 2.3 4.6-4.8" />
    </svg>
  );
}

/** Ditolak / Larangan Clean (menggantikan 🚫 / ❌ / ⛔) */
export function IconDeclinedBan({ size = 14, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <circle cx="12" cy="12" r="8.75" fill="currentColor" fillOpacity="0.12" />
      <path d="m6.2 6.2 11.6 11.6" />
    </svg>
  );
}

/** Peringatan / Revisi Clean (menggantikan ⚠️) */
export function IconAlertClean({ size = 14, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <path
        d="M10.4 4.3 3.2 17a1.8 1.8 0 0 0 1.6 2.7h14.4a1.8 1.8 0 0 0 1.6-2.7L13.6 4.3a1.8 1.8 0 0 0-3.2 0Z"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path d="M12 9.5v4" />
      <circle cx="12" cy="16.4" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Pin Terbitan Terkini / Sematan Clean (menggantikan 📌) */
export function IconPinClean({ size = 14, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <path
        d="M6.5 4.2h11v16l-5.5-3.4-5.5 3.4v-16Z"
        fill="currentColor"
        fillOpacity="0.14"
      />
    </svg>
  );
}

/** Undangan Review Clean (menggantikan 📩) */
export function IconMailInvite({ size = 14, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" fill="currentColor" fillOpacity="0.12" />
      <path d="m4.5 7.3 7.5 5.4 7.5-5.4" />
    </svg>
  );
}

/** Keputusan Redaksi / Timbangan Clean (menggantikan ⚖️) */
export function IconScaleJudge({ size = 15, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <path d="M12 4v16" />
      <path d="M7.5 20h9" />
      <path d="M5 7.5h14" />
      <path d="m5 7.5-2 5.2a2.5 2.5 0 0 0 4 0l-2-5.2Z" fill="currentColor" fillOpacity="0.14" />
      <path d="m19 7.5-2 5.2a2.5 2.5 0 0 0 4 0l-2-5.2Z" fill="currentColor" fillOpacity="0.14" />
    </svg>
  );
}

/** Kirim / Terbitkan Rocket-Arrow Clean (menggantikan 🚀) */
export function IconLaunchClean({ size = 15, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <path
        d="M19.5 4.5 13 20l-2.6-6.4L4 11l15.5-6.5Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
      <path d="m19.5 4.5-9.1 9.1" />
    </svg>
  );
}

/** Info Bulat Clean (menggantikan ℹ️) */
export function IconInfoClean({ size = 14, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <circle cx="12" cy="12" r="8.75" fill="currentColor" fillOpacity="0.12" />
      <path d="M12 11.2v4.8" />
      <circle cx="12" cy="8.1" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Kunci Akses Clean (menggantikan 🔒 / 🔐) */
export function IconLockClean({ size = 14, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" fill="currentColor" fillOpacity="0.14" />
      <path d="M8.5 10.5V7.8a3.5 3.5 0 1 1 7 0v2.7" />
    </svg>
  );
}

/** Jam / Proses Review Clean Duotone */
export function IconClockClean({ size = 16, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <circle cx="12" cy="12" r="8.75" fill="currentColor" fillOpacity="0.12" />
      <path d="M12 7.5v4.8l3.2 1.8" />
    </svg>
  );
}

/** Salin / Copy Clean (menggantikan 📋) */
export function IconCopyClean({ size = 14, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" fill="currentColor" fillOpacity="0.14" />
      <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

/** Sitasi Akademik Clean (menggantikan 🎓) */
export function IconQuoteClean({ size = 14, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <path
        d="M10.2 8.2H6.5a2 2 0 0 0-2 2v3.3a2 2 0 0 0 2 2h2.2v1.8a2.2 2.2 0 0 1-2.2 2.2"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <path
        d="M19.5 8.2h-3.7a2 2 0 0 0-2 2v3.3a2 2 0 0 0 2 2H18v1.8a2.2 2.2 0 0 1-2.2 2.2"
        fill="currentColor"
        fillOpacity="0.12"
      />
    </svg>
  );
}

/** Kolaborasi / Tips Clean */
export function IconTipsSpark({ size = 14, className = '' }) {
  return (
    <svg {...baseProps(size, className)}>
      <path
        d="M12 3.5 14 9l5.5 2-5.5 2-2 5.5L10 13l-5.5-2L10 9l2-5.5Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
    </svg>
  );
}
