import React from 'react';

export default function HTMLContent({ content }) {
  if (!content) return null;

  // Remove all inline classes from TipTap HTML
  const cleanHTML = content
    .replace(/\sclass="[^"]*"/g, '')
    .replace(/\sclass='[^']*'/g, '');

  return (
    <div 
      className="tiptap-rendered-content"
      dangerouslySetInnerHTML={{ __html: cleanHTML }}
    />
  );
}