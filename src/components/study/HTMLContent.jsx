import React from 'react';

export default function HTMLContent({ content }) {
  if (!content) return null;

  // Always render as HTML since TipTap editor produces HTML
  return (
    <div 
      className="tiptap-content prose prose-slate dark:prose-invert max-w-none
        prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white
        prose-h1:text-2xl prose-h1:mt-8 prose-h1:mb-4
        prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-4
        prose-h3:text-lg prose-h3:mt-5 prose-h3:mb-3
        prose-p:text-base prose-p:leading-7 prose-p:my-3 prose-p:text-slate-700 dark:prose-p:text-slate-300
        prose-ul:my-4 prose-ul:space-y-2
        prose-ol:my-4 prose-ol:space-y-2
        prose-li:text-slate-700 dark:prose-li:text-slate-300
        prose-strong:font-bold prose-strong:text-slate-900 dark:prose-strong:text-white
        prose-em:italic prose-em:text-slate-800 dark:prose-em:text-slate-200
        prose-blockquote:border-l-4 prose-blockquote:border-teal-500 prose-blockquote:bg-teal-50 dark:prose-blockquote:bg-teal-900/20 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:my-4 prose-blockquote:italic
        prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
        prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
        prose-table:w-full prose-table:border-collapse prose-table:my-6
        prose-thead:bg-slate-100 dark:prose-thead:bg-slate-800
        prose-th:font-bold prose-th:text-left prose-th:p-3 prose-th:border prose-th:border-slate-300 dark:prose-th:border-slate-600
        prose-td:p-3 prose-td:border prose-td:border-slate-300 dark:prose-td:border-slate-600
        prose-hr:my-8 prose-hr:border-t-2 prose-hr:border-slate-200 dark:prose-hr:border-slate-700
        prose-a:text-teal-600 dark:prose-a:text-teal-400 prose-a:font-medium prose-a:no-underline hover:prose-a:underline
        [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
        [&_ul]:list-disc [&_ul]:pl-6
        [&_ol]:list-decimal [&_ol]:pl-6
        [&_ul_ul]:list-circle [&_ul_ul]:pl-6
        [&_ol_ol]:list-lower-alpha [&_ol_ol]:pl-6"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}