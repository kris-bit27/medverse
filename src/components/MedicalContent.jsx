/**
 * MedicalContent.jsx — MedVerse study content renderer
 * 
 * v2: TOC is rendered outside this component by parent.
 * This component just renders the article body.
 * Export extractToc + TableOfContents for parent to use.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronUp, Type } from 'lucide-react';

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
    p: ({ children, ...props }) => (
      <p className="mn-content-p" {...props}>{children}</p>
    ),
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
    li: ({ children, ...props }) => (
      <li className="mn-content-li" {...props}>{children}</li>
    ),
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
    td: ({ children, ...props }) => (
      <td className="mn-table-td" {...props}>{children}</td>
    ),
    tr: ({ children, ...props }) => (
      <tr className="mn-table-tr" {...props}>{children}</tr>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote className="mn-callout mn-callout-info" {...props}>{children}</blockquote>
    ),
    code: ({ inline, children, className: codeClassName, ...props }) => {
      if (inline || !codeClassName) {
        return <code className="mn-inline-code" {...props}>{children}</code>;
      }
      return (
        <pre className="mn-code-block"><code {...props}>{children}</code></pre>
      );
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
function FloatingToolbar({ onFontSizeChange }) {
  return (
    <div className="mn-float-toolbar">
      <button className="mn-float-btn" title="Velikost textu" onClick={() => onFontSizeChange()}>
        <Type className="w-4 h-4" />
      </button>
      <button className="mn-float-btn" title="Nahoru" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <ChevronUp className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT — just the article body (no TOC grid)
// ============================================================
export default function MedicalContent({ content, className = '' }) {
  const [fontSize, setFontSize] = useState(17);
  const contentRef = useRef(null);
  const components = useMemo(() => createComponents(), []);

  const cycleFontSize = useCallback(() => {
    setFontSize((prev) => (prev >= 20 ? 15 : prev + 1));
  }, []);

  if (!content) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">Obsah neni k dispozici</p>
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
          {content}
        </ReactMarkdown>
      </article>
      <FloatingToolbar onFontSizeChange={cycleFontSize} />
    </>
  );
}

// Hook for parent to track active TOC section
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
