import React from 'react';
import { ACADEMY_LEVELS } from '@/lib/academy-constants';

const SIZE_CLASSES = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-0.5 gap-1.5',
  lg: 'text-sm px-2.5 py-1 gap-1.5',
};

export default function CredentialBadge({ level, size = 'sm' }) {
  if (!level || level < 1) return null;

  const info = ACADEMY_LEVELS[level];
  if (!info) return null;

  const label =
    level === 1
      ? 'AI-Aware Clinician'
      : level === 2
      ? 'AI-Proficient Clinician'
      : `Academy Lvl ${level}`;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${SIZE_CLASSES[size] || SIZE_CLASSES.sm}`}
      style={{
        borderColor: `${info.color}40`,
        backgroundColor: `${info.color}10`,
        color: info.color,
      }}
      title={`Certifikovaný MedVerse AI Academy Level ${level}`}
    >
      <span>{info.icon}</span>
      <span>{label}</span>
    </span>
  );
}
