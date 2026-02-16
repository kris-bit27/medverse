import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bookmark className="w-5 h-5" />
            Záložky
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-[hsl(var(--mn-muted))]">
            <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Zatím žádné záložky</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bookmark className="w-5 h-5" />
          Záložky
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to={createPageUrl('Profile') + '#bookmarks'}>
            Vše
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
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
                <span className="text-sm font-medium text-[hsl(var(--mn-muted))] truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  {item.entity?.title}
                </span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}