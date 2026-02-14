/**
 * MedicalContent.jsx
 * 
 * Rich medical content renderer for MedVerse.
 * Replaces basic ReactMarkdown + prose with custom-styled medical study content.
 * 
 * Features:
 * - Custom heading styles with section anchors
 * - Medical value badges (inline monospace for numbers)
 * - Clinical pearl / warning / info callout detection
 * - Enhanced tables with sticky headers
 * - Expandable subsections
 * - Reading progress tracking
 * - Table of contents generation
 * 
 * Usage:
 *   <MedicalContent content={markdownString} showToc={true} />
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronUp, Bookmark, Type } from 'lucide-react';

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
// UTILITY: Detect medical values like "150-200/100 000", "NIHSS ≤5", etc.
// ============================================================
function MedValue({ children }) {
  return (
    <span className="mn-med-value">{children}</span>
  );
}

// ============================================================
// CUSTOM MARKDOWN COMPONENTS
// ============================================================
function createComponents(onHeadingVisible) {
  return {
    h1: ({ children, ...props }) => {
      const id = String(children)
        .toLowerCase()
        .replace(/[^\w\s\u00C0-\u024F-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 60);
      return (
        <h1 id={id} className="mn-content-h1" {...props}>
          {children}
        </h1>
      );
    },
    h2: ({ children, ...props }) => {
      const id = String(children)
        .toLowerCase()
        .replace(/[^\w\s\u00C0-\u024F-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 60);
      return (
        <h2 id={id} className="mn-content-h2 mn-section-anchor" {...props}>
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }) => {
      const id = String(children)
        .toLowerCase()
        .replace(/[^\w\s\u00C0-\u024F-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 60);
      return (
        <h3 id={id} className="mn-content-h3 mn-section-anchor" {...props}>
          {children}
        </h3>
      );
    },
    h4: ({ children, ...props }) => (
      <h4 className="mn-content-h4" {...props}>{children}</h4>
    ),
    p: ({ children, ...props }) => {
      // Detect callout patterns: **Klinická perla:**, **Pozor:**, etc.
      const text = String(children);
      
      return (
        <p className="mn-content-p" {...props}>{children}</p>
      );
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
      <blockquote className="mn-callout mn-callout-info" {...props}>
        {children}
      </blockquote>
    ),
    code: ({ inline, children, ...props }) => {
      if (inline) {
        return <code className="mn-inline-code" {...props}>{children}</code>;
      }
      return (
        <pre className="mn-code-block">
          <code {...props}>{children}</code>
        </pre>
      );
    },
    a: ({ children, href, ...props }) => (
      <a className="mn-content-link" href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    ),
    hr: () => <hr className="mn-divider" />,
  };
}

// ============================================================
// TABLE OF CONTENTS SIDEBAR
// ============================================================
function TableOfContents({ toc, activeId, topicTitle }) {
  if (!toc || toc.length === 0) return null;

  return (
    <nav className="mn-toc">
      <div className="mn-toc-header">
        <div className="mn-toc-label">Obsah</div>
        <div className="mn-toc-title">{topicTitle}</div>
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
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
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
// READING PROGRESS BAR
// ============================================================
function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const p = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
      setProgress(p);
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
      <button
        className="mn-float-btn"
        title="Zvětšit/zmenšit font"
        onClick={() => onFontSizeChange()}
      >
        <Type className="w-4 h-4" />
      </button>
      <button
        className="mn-float-btn"
        title="Nahoru"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <ChevronUp className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function MedicalContent({ 
  content, 
  showToc = true, 
  topicTitle = '',
  className = '' 
}) {
  const [activeId, setActiveId] = useState('');
  const [fontSize, setFontSize] = useState(17);
  const contentRef = useRef(null);

  // Extract TOC
  const toc = useMemo(() => extractToc(content), [content]);

  // Custom components for ReactMarkdown
  const components = useMemo(() => createComponents(), []);

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const anchors = document.querySelectorAll('.mn-section-anchor');
      let current = '';
      anchors.forEach((anchor) => {
        if (anchor.getBoundingClientRect().top < 140) {
          current = anchor.id;
        }
      });
      if (current !== activeId) {
        setActiveId(current);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeId]);

  // Font size cycling
  const cycleFontSize = useCallback(() => {
    setFontSize((prev) => {
      if (prev >= 20) return 15;
      return prev + 1;
    });
  }, []);

  if (!content) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">Obsah není k dispozici</p>
      </div>
    );
  }

  return (
    <>
      <ReadingProgress />
      <div className={`mn-content-layout ${showToc && toc.length > 2 ? 'mn-has-toc' : ''} ${className}`}>
        {/* TOC sidebar — only on desktop & when enough headings */}
        {showToc && toc.length > 2 && (
          <aside className="mn-toc-sidebar">
            <TableOfContents toc={toc} activeId={activeId} topicTitle={topicTitle} />
          </aside>
        )}

        {/* Main article */}
        <article
          ref={contentRef}
          className="mn-article-body"
          style={{ fontSize: `${fontSize}px` }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={components}
          >
            {content}
          </ReactMarkdown>
        </article>
      </div>
      <FloatingToolbar onFontSizeChange={cycleFontSize} />
    </>
  );
}

export { extractToc, TableOfContents };
