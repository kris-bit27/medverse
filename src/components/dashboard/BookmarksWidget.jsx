import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Bookmark, ChevronRight, GraduationCap, BookOpen, Stethoscope } from 'lucide-react';

const typeConfig = {
  question: { icon: GraduationCap, page: 'QuestionDetail', param: 'id' },
  article: { icon: BookOpen, page: 'ArticleDetail', param: 'id' },
  tool: { icon: Stethoscope, page: 'ToolDetail', param: 'id' }
};

export default function BookmarksWidget({ 
  bookmarks = [],
  questions = [],
  articles = [],
  tools = []
}) {
  // Join bookmarks with their entities
  const recentBookmarks = bookmarks
    .slice(0, 5)
    .map(b => {
      const config = typeConfig[b.entity_type];
      let entity;
      switch (b.entity_type) {
        case 'question':
          entity = questions.find(q => q.id === b.entity_id);
          break;
        case 'article':
          entity = articles.find(a => a.id === b.entity_id);
          break;
        case 'tool':
          entity = tools.find(t => t.id === b.entity_id);
          break;
      }
      return { ...b, entity, config };
    })
    .filter(item => item.entity);

  if (recentBookmarks.length === 0) {
    return (
      <div className="mn-card">
        <div className="p-5 pb-0">
          <h3 className="mn-ui-font font-semibold text-lg flex items-center gap-2">
            <Bookmark className="w-5 h-5" />
            Záložky
          </h3>
        </div>
        <div className="p-5">
          <div className="text-center py-6 text-[hsl(var(--mn-muted))]">
            <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Zatím žádné záložky</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mn-card">
      <div className="flex items-center justify-between p-5 pb-4">
        <h3 className="mn-ui-font font-semibold text-lg flex items-center gap-2">
          <Bookmark className="w-5 h-5" />
          Záložky
        </h3>
        <Button variant="ghost" size="sm" asChild>
          <Link to={createPageUrl('Profile') + '#bookmarks'}>
            Vše
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>
      <div className="px-5 pb-5">
        <div className="space-y-2">
          {recentBookmarks.map((item) => {
            const Icon = item.config.icon;
            return (
              <Link
                key={item.id}
                to={createPageUrl(item.config.page) + `?${item.config.param}=${item.entity_id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-[hsl(var(--mn-surface))] dark:hover:bg-[hsl(var(--mn-surface-2))]/50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-[hsl(var(--mn-surface-2))] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[hsl(var(--mn-muted))]" />
                </div>
                <span className="text-sm font-medium text-[hsl(var(--mn-muted))] truncate group-hover:text-[hsl(var(--mn-accent))] dark:group-hover:text-[hsl(var(--mn-accent))] transition-colors">
                  {item.entity?.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}