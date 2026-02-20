import {
  BookOpen,
  Zap,
  Terminal,
  Stethoscope,
  ClipboardCheck,
  Play,
} from 'lucide-react';

export const ACADEMY_LEVELS = {
  1: { label: 'Foundations', labelCs: 'Základy', color: '#3B82F6', icon: '🎓' },
  2: { label: 'Clinical AI', labelCs: 'Klinická AI', color: '#10B981', icon: '🔬' },
  3: { label: 'Power User', labelCs: 'Pokročilý', color: '#F59E0B', icon: '🛠️' },
  4: { label: 'Builder', labelCs: 'Builder', color: '#EC4899', icon: '🚀' },
};

export const CONTENT_TYPE_ICONS = {
  article: BookOpen,
  interactive: Zap,
  sandbox: Terminal,
  case_study: Stethoscope,
  quiz: ClipboardCheck,
  video: Play,
};

export const CONTENT_TYPE_LABELS = {
  article: 'Článek',
  interactive: 'Interaktivní',
  sandbox: 'AI Sandbox',
  case_study: 'Case Study',
  quiz: 'Kvíz',
  video: 'Video',
};

export const SKILL_RADAR_LABELS = {
  prompt_engineering: 'Prompt Engineering',
  critical_thinking: 'Kritické myšlení',
  ethics: 'Etika AI',
  clinical_ai: 'Klinická AI',
  safety_awareness: 'Bezpečnost',
  technical_literacy: 'Tech. gramotnost',
};

export const SANDBOX_TOKEN_COST = 5;
export const SANDBOX_DAILY_LIMIT = 20;
