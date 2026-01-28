import React from 'react';

export default function HTMLContent({ content }) {
  if (!content) return null;

  // Clean HTML: remove classes, empty paragraphs, and excessive breaks
  let cleanHTML = content
    // Remove all class attributes
    .replace(/\sclass="[^"]*"/gi, '')
    .replace(/\sclass='[^']*'/gi, '')
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