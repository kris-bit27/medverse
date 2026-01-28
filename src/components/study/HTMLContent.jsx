import React from 'react';

export default function HTMLContent({ content }) {
  if (!content) return null;

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

  // Clean HTML: remove classes, empty paragraphs, and excessive breaks
  let cleanHTML = sanitizeHtml(content)
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
