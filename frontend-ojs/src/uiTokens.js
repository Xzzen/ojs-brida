/**
 * Centralized Light Editorial & Institutional Color Tokens for OJS BRIDA.
 * Single disciplined accent (#7A2222) + muted, uniform semantic badges.
 */

export const SEMANTIC_TONE = {
  neutral: 'bg-[#F4F4F5] text-[#374151] border-[#D4D4D8]',
  accent: 'bg-[#FDF2F2] text-[#7A2222] border-[#DFBABA]',
  warning: 'bg-[#FAF3E8] text-[#71461D] border-[#DEC9AC]',
  positive: 'bg-[#EDF5F0] text-[#224A30] border-[#B8D4C2]',
  negative: 'bg-[#FCEEEF] text-[#7F1D28] border-[#E0B6BC]'
};

export const ROLE_META = {
  admin: {
    label: 'Admin Redaksi',
    badge: SEMANTIC_TONE.accent,
    avatar: 'bg-[#7A2222]'
  },
  editor: {
    label: 'Chief Editor',
    badge: SEMANTIC_TONE.accent,
    avatar: 'bg-[#5A1717]'
  },
  reviewer: {
    label: 'Mitra Bestari',
    badge: SEMANTIC_TONE.neutral,
    avatar: 'bg-[#374151]'
  },
  author: {
    label: 'Peneliti / Penulis',
    badge: SEMANTIC_TONE.neutral,
    avatar: 'bg-[#4B5563]'
  }
};

export const CHART_COLORS = {
  pending: '#A88253',
  under_review: '#7A2222',
  revision_required: '#8E5938',
  accepted: '#2F523B',
  published: '#1F2937',
  rejected: '#882832',
  barPublished: '#7A2222',
  barProcess: '#9CA3AF'
};
