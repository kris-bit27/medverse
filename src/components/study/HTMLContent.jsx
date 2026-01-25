import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function HTMLContent({ content }) {
  if (!content) return null;

  // Always render as HTML since TipTap editor produces HTML
  return (
    <div 
      className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-h2:text-xl prose-h3:text-lg prose-p:leading-relaxed prose-ul:my-4 prose-li:my-1 prose-strong:font-semibold prose-em:italic prose-blockquote:border-l-4 prose-blockquote:border-teal-500 prose-blockquote:pl-4 prose-blockquote:italic prose-code:bg-slate-100 prose-code:dark:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-table:border-collapse prose-th:bg-slate-100 prose-th:dark:bg-slate-800 prose-th:p-2 prose-th:border prose-td:p-2 prose-td:border"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}