import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Code,
  Highlighter,
  Table as TableIcon,
  Link as LinkIcon,
  Undo,
  Redo
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TipTapEditor({ content, onChange, placeholder = 'Začněte psát...' }) {
  const lastContentRef = useRef(content || '');
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3]
        },
        bulletList: false,
        orderedList: false,
        listItem: false
      }),
      BulletList.configure({
        keepMarks: true,
        keepAttributes: true,
        HTMLAttributes: {
          class: 'list-disc pl-6'
        }
      }),
      OrderedList.configure({
        keepMarks: true,
        keepAttributes: true,
        HTMLAttributes: {
          class: 'list-decimal pl-6'
        }
      }),
      ListItem,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-teal-600 underline hover:text-teal-700'
        }
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-[hsl(var(--mn-border))] w-full my-4'
        }
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'bg-[hsl(var(--mn-surface-2))] border border-[hsl(var(--mn-border))] p-2 font-semibold'
        }
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-[hsl(var(--mn-border))] p-2'
        }
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: 'bg-yellow-200 dark:bg-yellow-900/40 px-1 rounded'
        }
      })
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[400px] px-4 py-3'
      }
    }
  });

  if (!editor) {
    return null;
  }

  useEffect(() => {
    const nextContent = content || '';
    if (nextContent === lastContentRef.current) return;
    lastContentRef.current = nextContent;
    try {
      editor.commands.setContent(nextContent, false);
    } catch {
      // Ignore invalid content updates
    }
  }, [content, editor]);

  const addLink = () => {
    const url = window.prompt('URL odkazu:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-[hsl(var(--mn-surface))]">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b bg-[hsl(var(--mn-surface-2))]">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(editor.isActive('bold') && 'bg-slate-200 dark:bg-slate-700')}
          title="Tučně (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(editor.isActive('italic') && 'bg-slate-200 dark:bg-slate-700')}
          title="Kurzíva (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={cn(editor.isActive('highlight') && 'bg-yellow-200 dark:bg-yellow-900/40')}
          title="Zvýraznit"
        >
          <Highlighter className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />

        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn(editor.isActive('heading', { level: 2 }) && 'bg-slate-200 dark:bg-slate-700')}
          title="Nadpis 2"
        >
          <Heading2 className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn(editor.isActive('heading', { level: 3 }) && 'bg-slate-200 dark:bg-slate-700')}
          title="Nadpis 3"
        >
          <Heading3 className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />

        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(editor.isActive('bulletList') && 'bg-slate-200 dark:bg-slate-700')}
          title="Odrážkový seznam"
        >
          <List className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(editor.isActive('orderedList') && 'bg-slate-200 dark:bg-slate-700')}
          title="Číslovaný seznam"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn(editor.isActive('blockquote') && 'bg-slate-200 dark:bg-slate-700')}
          title="Citace"
        >
          <Quote className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={cn(editor.isActive('codeBlock') && 'bg-slate-200 dark:bg-slate-700')}
          title="Kód"
        >
          <Code className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />

        <Button
          size="sm"
          variant="ghost"
          onClick={addLink}
          className={cn(editor.isActive('link') && 'bg-slate-200 dark:bg-slate-700')}
          title="Přidat odkaz"
        >
          <LinkIcon className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={addTable}
          title="Vložit tabulku"
        >
          <TableIcon className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />

        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Zpět (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Znovu (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
