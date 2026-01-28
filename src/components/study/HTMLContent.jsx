import React from 'react';

export default function HTMLContent({ content }) {
  if (!content) return null;

  // Remove Tailwind classes from HTML content to let CSS styles apply
  const cleanContent = content
    .replace(/class="[^"]*list-disc[^"]*"/g, '')
    .replace(/class="[^"]*pl-\d+[^"]*"/g, '')
    .replace(/class="[^"]*"/g, '')
    .replace(/class='[^']*'/g, '');

  return (
    <div 
      className="tiptap-rendered-content"
      dangerouslySetInnerHTML={{ __html: cleanContent }}
    />
  );
}