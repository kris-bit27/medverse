import React from 'react';

export default function HTMLContent({ content }) {
  if (!content) return null;

  return (
    <div 
      className="tiptap-rendered-content"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}