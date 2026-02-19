/**
 * MedicalContent.jsx — MedVerse study content renderer v3
 * 
 * v3 enhancements:
 * - Smart callout detection (🔴 danger, ⚠️ warning, 💡 pearl, ℹ️ info, ✅ success)
 * - Abbreviation tooltips (auto-detected medical abbreviations)
 * - Bookmark support in floating toolbar
 * - Content preprocessor for emoji→callout transform
 * 
 * TOC is rendered outside this component by parent.
 * Export extractToc + TableOfContents for parent to use.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronUp, Type, ChevronDown, Bookmark, BookmarkCheck, AlertTriangle, Lightbulb, Info, ShieldAlert, CheckCircle } from 'lucide-react';

// ============================================================
// MEDICAL ABBREVIATIONS DATABASE
// ============================================================
const MEDICAL_ABBREVIATIONS = {
  'TIA': 'Tranzitorní ischemická ataka',
  'CMP': 'Cévní mozková příhoda',
  'AIM': 'Akutní infarkt myokardu',
  'CHOPN': 'Chronická obstrukční plicní nemoc',
  'ARDS': 'Syndrom akutní dechové tísně',
  'DIC': 'Diseminovaná intravaskulární koagulace',
  'GCS': 'Glasgow Coma Scale',
  'NIHSS': 'National Institutes of Health Stroke Scale',
  'INR': 'International Normalized Ratio',
  'aPTT': 'Aktivovaný parciální tromboplastinový čas',
  'CRP': 'C-reaktivní protein',
  'PCT': 'Prokalcitonin',
  'AST': 'Aspartátaminotransferáza',
  'ALT': 'Alaninaminotransferáza',
  'GGT': 'Gamaglutamyltransferáza',
  'ALP': 'Alkalická fosfatáza',
  'ERCP': 'Endoskopická retrográdní cholangiopankreatikografie',
  'MRCP': 'Magnetická rezonanční cholangiopankreatikografie',
  'UZ': 'Ultrazvuk',
  'CT': 'Výpočetní tomografie',
  'MRI': 'Magnetická rezonance',
  'EKG': 'Elektrokardiografie',
  'RTG': 'Rentgen',
  'LMWH': 'Nízkomolekulární heparin',
  'UFH': 'Nefrakcionovaný heparin',
  'NOAC': 'Přímá perorální antikoagulancia',
  'DOAC': 'Přímá perorální antikoagulancia',
  'PCI': 'Perkutánní koronární intervence',
  'CABG': 'Aortokoronární bypass',
  'ICP': 'Intrakraniální tlak',
  'MAP': 'Střední arteriální tlak',
  'CVP': 'Centrální žilní tlak',
  'PEEP': 'Pozitivní endexpirační tlak',
  'FiO2': 'Frakce vdechovaného kyslíku',
  'SpO2': 'Saturace periferní krve kyslíkem',
  'SOFA': 'Sequential Organ Failure Assessment',
  'qSOFA': 'Quick SOFA',
  'SIRS': 'Syndrom systémové zánětlivé odpovědi',
  'RDS': 'Respiratory Distress Syndrome',
  'CPAP': 'Continuous Positive Airway Pressure',
  'BMI': 'Body Mass Index',
  'GFR': 'Glomerulární filtrace',
  'eGFR': 'Odhadovaná glomerulární filtrace',
  'HbA1c': 'Glykovaný hemoglobin',
  'FAST': 'Focused Assessment with Sonography for Trauma',
  'ATLS': 'Advanced Trauma Life Support',
  'ESC': 'Evropská kardiologická společnost',
  'GOLD': 'Global Initiative for Chronic Obstructive Lung Disease',
  'FIGO': 'Mezinárodní federace gynekologie a porodnictví',
  'TNM': 'Tumor-Nodes-Metastasis klasifikace',
  'NYHA': 'New York Heart Association',
  'FS': 'Fibrilace síní',
  'PE': 'Plicní embolie',
  'DVT': 'Hluboká žilní trombóza',
  'VTE': 'Žilní tromboembolismus',
  'GERD': 'Gastroezofageální refluxní choroba',
};

// ============================================================
// UTILITY: Extract TOC from markdown
// ============================================================
function extractToc(markdown) {
  if (!markdown) return [];
  const lines = markdown.split('\n');
  const toc = [];
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/\*\*/g, '').replace(/\*/g, '').trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s\u00C0-\u024F-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 60);
      toc.push({ level, text, id });
    }
  }
  return toc;
}

// ============================================================
// TABLE OF CONTENTS (exported for parent use)
// ============================================================
function TableOfContents({ toc, activeId, topicTitle, onClose }) {
  if (!toc || toc.length === 0) return null;
  return (
    <nav className="mn-toc">
      <div className="mn-toc-header">
        <div>
          <div className="mn-toc-label">Obsah</div>
          {topicTitle && <div className="mn-toc-title">{topicTitle}</div>}
        </div>
        {onClose && (
          <button onClick={onClose} className="mn-toc-close" title="Skrýt obsah">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>
      <div className="mn-toc-list">
        {toc.map((item, i) => (
          <a
            key={`${item.id}-${i}`}
            href={`#${item.id}`}
            className={`mn-toc-item ${item.level === 3 ? 'mn-toc-sub' : ''} ${activeId === item.id ? 'mn-toc-active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(item.id);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            {item.text}
          </a>
        ))}
      </div>
    </nav>
  );
}

// ============================================================
// CALLOUT DETECTION
// ============================================================
const CALLOUT_PATTERNS = [
  { pattern: /^🔴|^❗|^\*\*KRITICKÉ\*\*|^\*\*DANGER\*\*|^\*\*URGENTNÍ\*\*/i, type: 'danger' },
  { pattern: /^⚠️|^⚠|^\*\*CAVE\*\*|^\*\*POZOR\*\*|^\*\*WARNING\*\*/i, type: 'warning' },
  { pattern: /^💡|^🔑|^\*\*PERLA\*\*|^\*\*TIP\*\*|^\*\*PEARL\*\*/i, type: 'pearl' },
  { pattern: /^✅|^💊|^\*\*TERAPIE\*\*|^\*\*LÉČBA\*\*|^\*\*DOPORUČENÍ\*\*/i, type: 'success' },
  { pattern: /^ℹ️|^📊|^📋|^\*\*INFO\*\*|^\*\*POZNÁMKA\*\*/i, type: 'info' },
  { pattern: /^⚡|^\*\*HIGH-YIELD\*\*/i, type: 'pearl' },
  { pattern: /^🔬|^\*\*DIAGNOSTIKA\*\*/i, type: 'info' },
  { pattern: /^\[!(WARNING|CAUTION)\]/i, type: 'warning' },
  { pattern: /^\[!(DANGER|CRITICAL)\]/i, type: 'danger' },
  { pattern: /^\[!(TIP|HINT|PEARL)\]/i, type: 'pearl' },
  { pattern: /^\[!(NOTE|INFO)\]/i, type: 'info' },
  { pattern: /^\[!(SUCCESS|CHECK)\]/i, type: 'success' },
];

const CALLOUT_ICONS = {
  danger: ShieldAlert,
  warning: AlertTriangle,
  pearl: Lightbulb,
  info: Info,
  success: CheckCircle,
};

const CALLOUT_LABELS = {
  danger: 'Kritické',
  warning: 'Pozor',
  pearl: 'Klinická perla',
  info: 'Poznámka',
  success: 'Doporučení',
};

function detectCalloutType(children) {
  const text = getTextFromChildren(children).trim();
  for (const { pattern, type } of CALLOUT_PATTERNS) {
    if (pattern.test(text)) return type;
  }
  return 'info';
}

function getTextFromChildren(children) {
  if (!children) return '';
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(getTextFromChildren).join('');
  if (children.props?.children) return getTextFromChildren(children.props.children);
  return '';
}

// ============================================================
// ABBREVIATION TOOLTIP
// ============================================================
function AbbreviationTooltip({ text, definition }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="mn-abbr"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      tabIndex={0}
    >
      {text}
      {show && <span className="mn-abbr-tooltip" role="tooltip">{definition}</span>}
    </span>
  );
}

function processAbbreviations(text) {
  if (typeof text !== 'string') return text;
  if (!/[A-Z]{2}/.test(text)) return text;

  const parts = [];
  let lastIndex = 0;
  const sortedAbbrs = Object.keys(MEDICAL_ABBREVIATIONS).sort((a, b) => b.length - a.length);
  const abbrRegex = new RegExp(`\\b(${sortedAbbrs.map(a => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g');
  const seen = new Set();
  let match;

  while ((match = abbrRegex.exec(text)) !== null) {
    const abbr = match[1];
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (!seen.has(abbr)) {
      seen.add(abbr);
      parts.push(<AbbreviationTooltip key={`${abbr}-${match.index}`} text={abbr} definition={MEDICAL_ABBREVIATIONS[abbr]} />);
    } else {
      parts.push(abbr);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 1 ? parts : text;
}

// ============================================================
// CUSTOM MARKDOWN COMPONENTS
// ============================================================
function createComponents() {
  const makeId = (children) => String(children)
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u024F-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 60);

  return {
    h1: ({ children, ...props }) => (
      <h1 id={makeId(children)} className="mn-content-h1" {...props}>{children}</h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 id={makeId(children)} className="mn-content-h2 mn-section-anchor" {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 id={makeId(children)} className="mn-content-h3 mn-section-anchor" {...props}>{children}</h3>
    ),
    h4: ({ children, ...props }) => (
      <h4 className="mn-content-h4" {...props}>{children}</h4>
    ),
    p: ({ children, ...props }) => {
      const processed = React.Children.map(children, child =>
        typeof child === 'string' ? processAbbreviations(child) : child
      );
      return <p className="mn-content-p" {...props}>{processed}</p>;
    },
    strong: ({ children, ...props }) => (
      <strong className="mn-content-strong" {...props}>{children}</strong>
    ),
    em: ({ children, ...props }) => (
      <em className="mn-content-em" {...props}>{children}</em>
    ),
    ul: ({ children, ...props }) => (
      <ul className="mn-content-ul" {...props}>{children}</ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="mn-content-ol" {...props}>{children}</ol>
    ),
    li: ({ children, ...props }) => {
      const processed = React.Children.map(children, child =>
        typeof child === 'string' ? processAbbreviations(child) : child
      );
      return <li className="mn-content-li" {...props}>{processed}</li>;
    },
    table: ({ children, ...props }) => (
      <div className="mn-table-wrapper">
        <table className="mn-table" {...props}>{children}</table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead className="mn-table-head" {...props}>{children}</thead>
    ),
    th: ({ children, ...props }) => (
      <th className="mn-table-th" {...props}>{children}</th>
    ),
    td: ({ children, ...props }) => {
      const processed = React.Children.map(children, child =>
        typeof child === 'string' ? processAbbreviations(child) : child
      );
      return <td className="mn-table-td" {...props}>{processed}</td>;
    },
    tr: ({ children, ...props }) => (
      <tr className="mn-table-tr" {...props}>{children}</tr>
    ),
    blockquote: ({ children, ...props }) => {
      const type = detectCalloutType(children);
      const Icon = CALLOUT_ICONS[type];
      const label = CALLOUT_LABELS[type];
      return (
        <div className={`mn-callout mn-callout-${type}`} {...props}>
          <div className="mn-callout-header">
            <Icon className="mn-callout-icon" />
            <span className="mn-callout-label">{label}</span>
          </div>
          <div className="mn-callout-body">{children}</div>
        </div>
      );
    },
    code: ({ inline, children, className: codeClassName, ...props }) => {
      if (inline || !codeClassName) {
        return <code className="mn-inline-code" {...props}>{children}</code>;
      }
      return <pre className="mn-code-block"><code {...props}>{children}</code></pre>;
    },
    a: ({ children, href, ...props }) => (
      <a className="mn-content-link" href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
    ),
    hr: () => <hr className="mn-divider" />,
  };
}

// ============================================================
// READING PROGRESS BAR
// ============================================================
function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docH > 0 ? Math.min((window.scrollY / docH) * 100, 100) : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return (
    <div className="mn-reading-progress">
      <div className="mn-reading-progress-bar" style={{ width: `${progress}%` }} />
    </div>
  );
}

// ============================================================
// FLOATING TOOLBAR
// ============================================================
function FloatingToolbar({ onFontSizeChange, onBookmark, isBookmarked }) {
  return (
    <div className="mn-float-toolbar">
      <button className="mn-float-btn" title="Velikost textu" onClick={onFontSizeChange}>
        <Type className="w-4 h-4" />
      </button>
      {onBookmark && (
        <button
          className={`mn-float-btn ${isBookmarked ? 'mn-float-btn-active' : ''}`}
          title={isBookmarked ? 'Odebrat záložku' : 'Přidat záložku'}
          onClick={onBookmark}
        >
          {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
      )}
      <button className="mn-float-btn" title="Nahoru" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <ChevronUp className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================
// CONTENT PREPROCESSOR
// ============================================================
function preprocessContent(content) {
  if (!content) return content;
  let c = content;
  
  // Fix JSON-wrapped content: ```json\n{"full_text": "..."}\n```
  const jsonMatch = c.match(/^```json\s*\{?\s*"full_text"\s*:\s*"([\s\S]*?)"\s*\}?\s*```\s*$/);
  if (jsonMatch) {
    c = jsonMatch[1];
  }
  // Also handle plain JSON object without code fences
  const plainJsonMatch = c.match(/^\s*\{\s*"full_text"\s*:\s*"([\s\S]*?)"\s*\}\s*$/);
  if (plainJsonMatch) {
    c = plainJsonMatch[1];
  }
  
  // Fix escaped newlines (literal \n → real newline)
  c = c.replace(/\\n/g, '\n');
  // Fix escaped quotes
  c = c.replace(/\\"/g, '"');
  // Fix escaped backslashes
  c = c.replace(/\\\\/g, '\\');
  
  // Transform standalone emoji-prefixed lines into blockquotes for callout detection
  return c.replace(
    /^(🔴|⚠️|💡|✅|⚡|💊|🔬|📊)\s+/gm,
    '> $1 '
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function MedicalContent({ content, className = '', onBookmark, isBookmarked = false }) {
  const [fontSize, setFontSize] = useState(17);
  const contentRef = useRef(null);
  const components = useMemo(() => createComponents(), []);
  const cycleFontSize = useCallback(() => {
    setFontSize((prev) => (prev >= 20 ? 15 : prev + 1));
  }, []);
  const processedContent = useMemo(() => preprocessContent(content), [content]);

  if (!content) {
    return (
      <div className="text-center py-12">
        <p className="text-[hsl(var(--mn-muted))]">Obsah neni k dispozici</p>
      </div>
    );
  }

  return (
    <>
      <ReadingProgress />
      <article
        ref={contentRef}
        className={`mn-article-body ${className}`}
        style={{ fontSize: `${fontSize}px` }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {processedContent}
        </ReactMarkdown>
      </article>
      <FloatingToolbar onFontSizeChange={cycleFontSize} onBookmark={onBookmark} isBookmarked={isBookmarked} />
    </>
  );
}

function useActiveTocId() {
  const [activeId, setActiveId] = useState('');
  useEffect(() => {
    const handleScroll = () => {
      const anchors = document.querySelectorAll('.mn-section-anchor');
      let current = '';
      anchors.forEach((anchor) => {
        if (anchor.getBoundingClientRect().top < 140) current = anchor.id;
      });
      setActiveId(current);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return activeId;
}

export { extractToc, TableOfContents, useActiveTocId };
