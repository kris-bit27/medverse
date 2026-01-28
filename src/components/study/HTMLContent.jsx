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
    <>
      <style>
        {`
          .tiptap-rendered-content {
            line-height: 2.0 !important; /* Maximální vzdušnost */
            font-size: 1.15rem !important;
            color: #e2e8f0 !important; /* Světlejší text pro dark mode */
          }
          .tiptap-rendered-content p {
            margin-bottom: 2rem !important; /* Velké mezery mezi odstavci */
          }
          .tiptap-rendered-content strong {
            color: #5eead4 !important; /* Tyrkysová barva pro tučné písmo - MUSÍ BÝT VIDĚT */
            font-weight: 700 !important;
          }
          .tiptap-rendered-content h2 {
            color: #2dd4bf !important;
            margin-top: 3rem !important;
            border-left: 5px solid #2dd4bf !important;
            padding-left: 1.5rem !important;
          }
          .tiptap-rendered-content ul, .tiptap-rendered-content ol {
            padding-left: 2rem !important;
            margin-bottom: 2rem !important;
          }
          .tiptap-rendered-content li {
            margin-bottom: 1rem !important;
          }
        `}
      </style>
      <div 
        className="tiptap-rendered-content max-w-4xl mx-auto"
        dangerouslySetInnerHTML={{ __html: cleanHTML }}
      />
    </>
  );
}