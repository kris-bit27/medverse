import React from 'react';

export default function HTMLContent({ content }) {
  if (!content) return null;

  // Always render as HTML since TipTap editor produces HTML
  return (
    <div 
      className="prose prose-slate dark:prose-invert max-w-none
        prose-headings:font-semibold prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-4
        prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-3
        prose-p:leading-relaxed prose-p:my-3
        prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
        prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
        prose-li:my-1
        prose-strong:font-semibold prose-strong:text-slate-900 dark:prose-strong:text-white
        prose-em:italic
        prose-blockquote:border-l-4 prose-blockquote:border-teal-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-4
        prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
        prose-pre:bg-slate-900 prose-pre:text-slate-100
        prose-table:border-collapse prose-table:my-6
        prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-th:p-3 prose-th:border prose-th:border-slate-300
        prose-td:p-3 prose-td:border prose-td:border-slate-300
        prose-hr:my-8 prose-hr:border-slate-200 dark:prose-hr:border-slate-700
        prose-a:text-teal-600 dark:prose-a:text-teal-400 prose-a:no-underline hover:prose-a:underline"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}