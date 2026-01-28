import React from 'react';

export default function HTMLContent({ content }) {
  if (!content) return null;

  // Remove all inline classes from TipTap HTML to let our CSS styles take over
  const cleanHTML = content
    .replace(/\sclass="[^"]*"/g, '')
    .replace(/\sclass='[^']*'/g, '');

  return (
    <div 
      className="tiptap-rendered-content prose prose-slate max-w-none"
      dangerouslySetInnerHTML={{ __html: cleanHTML }}
    />
  );
}