import React from 'react';

export default function HTMLContent({ content }) {
  if (!content) return null;

  // Always render as HTML since TipTap editor produces HTML
  return (
    <div 
      className="prose prose-slate dark:prose-invert max-w-none tiptap-rendered-content"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}