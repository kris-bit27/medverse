import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function HTMLContent({ content }) {
  if (!content) return null;

  // Detect if content is HTML (contains HTML tags)
  const isHTML = /<[a-z][\s\S]*>/i.test(content);

  if (isHTML) {
    return (
      <div 
        className="prose prose-slate dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  // Otherwise treat as markdown
  return (
    <div className="prose prose-slate dark:prose-invert max-w-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}