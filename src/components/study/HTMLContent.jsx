import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function HTMLContent({ content }) {
  if (!content) return null;

  const normalizeText = (value) => {
    if (!value || typeof value !== 'string') return value;
    return value.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  };

  const tryParseJsonString = (value) => {
    if (typeof value !== 'string') return null;
    const cleaned = value.replace(/```json\n?|\n?```/g, '').trim();
    if (!cleaned.startsWith('{') || !cleaned.includes('"')) return null;
    try {
      return JSON.parse(cleaned);
    } catch {
      const first = cleaned.indexOf('{');
      const last = cleaned.lastIndexOf('}');
      if (first !== -1 && last !== -1 && last > first) {
        try {
          return JSON.parse(cleaned.slice(first, last + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  };

  const extractFromWrappedJson = (value) => {
    if (typeof value !== 'string') return null;
    const cleaned = value.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
    const key = cleaned.includes('"full_text"')
      ? 'full_text'
      : cleaned.includes('"high_yield"')
        ? 'high_yield'
        : cleaned.includes('"deep_dive"')
          ? 'deep_dive'
          : null;
    if (!key) return null;

    const keyIndex = cleaned.indexOf(`"${key}"`);
    if (keyIndex === -1) return null;
    const afterKey = cleaned.slice(keyIndex);
    const colonIndex = afterKey.indexOf(':');
    if (colonIndex === -1) return null;

    let raw = afterKey.slice(colonIndex + 1).trim();
    if (raw.startsWith('"')) raw = raw.slice(1);
    const lastQuote = raw.lastIndexOf('"');
    if (lastQuote !== -1) raw = raw.slice(0, lastQuote);

    raw = raw.replace(/\s*[,}]*\s*$/, '');
    return raw.replace(/\\"/g, '"');
  };

  let resolvedContent = content;
  const parsed = tryParseJsonString(content);
  if (parsed?.full_text || parsed?.high_yield || parsed?.deep_dive) {
    resolvedContent = parsed.full_text || parsed.high_yield || parsed.deep_dive;
  } else {
    const extracted = extractFromWrappedJson(content);
    if (extracted) resolvedContent = extracted;
  }
  resolvedContent = normalizeText(resolvedContent) || '';

  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(resolvedContent);

  const sanitizeHtml = (rawHtml) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');

    const blockedTags = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta'];
    blockedTags.forEach((tag) => {
      doc.querySelectorAll(tag).forEach((node) => node.remove());
    });

    doc.querySelectorAll('*').forEach((node) => {
      [...node.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = (attr.value || '').toLowerCase();

        if (name.startsWith('on')) {
          node.removeAttribute(attr.name);
          return;
        }

        if ((name === 'href' || name === 'src') && value.startsWith('javascript:')) {
          node.removeAttribute(attr.name);
          return;
        }

        if (name === 'style') {
          node.removeAttribute(attr.name);
          return;
        }

        if (name === 'class') {
          node.removeAttribute(attr.name);
        }
      });
    });

    return doc.body.innerHTML;
  };

  if (!looksLikeHtml) {
    return (
      <div className="tiptap-rendered-content max-w-4xl mx-auto">
        <ReactMarkdown>{resolvedContent}</ReactMarkdown>
      </div>
    );
  }

  // Clean HTML: remove classes, empty paragraphs, and excessive breaks
  const cleanHTML = sanitizeHtml(resolvedContent)
    // Remove empty paragraphs
    .replace(/<p><\/p>/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    // Clean up multiple consecutive line breaks
    .replace(/(<br\s*\/?>\s*){2,}/gi, '<br />');

  return (
    <div
      className="tiptap-rendered-content max-w-4xl mx-auto"
      dangerouslySetInnerHTML={{ __html: cleanHTML }}
    />
  );
}
