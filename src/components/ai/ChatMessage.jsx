import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Bot, User, Loader2 } from 'lucide-react';

export default function ChatMessage({ message, isStreaming }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-[hsl(var(--mn-text))]" />
        </div>
      )}
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3",
        isUser 
          ? "bg-teal-600 text-[hsl(var(--mn-text))]" 
          : "bg-[hsl(var(--mn-surface-2))] text-[hsl(var(--mn-text))]"
      )}>
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {isStreaming && (
              <span className="inline-flex ml-1">
                <Loader2 className="h-3 w-3 animate-spin" />
              </span>
            )}
          </div>
        )}
      </div>
      {isUser && (
        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-[hsl(var(--mn-muted))] dark:text-[hsl(var(--mn-muted))]" />
        </div>
      )}
    </div>
  );
}