import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DifficultyIndicator from '@/components/ui/DifficultyIndicator';
import StatusBadge from '@/components/ui/StatusBadge';
import VisibilityBadge from '@/components/common/VisibilityBadge';
import { motion } from 'framer-motion';

export default function QuestionCard({ 
  question, 
  progress,
  topic,
  isBookmarked,
  onToggleBookmark,
  index = 0
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className="hover:shadow-md transition-all hover:border-teal-200 dark:hover:border-[hsl(var(--mn-accent)/0.4)] group">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Main content */}
            <Link 
              to={createPageUrl('QuestionDetail') + `?id=${question.id}`}
              className="flex-1 min-w-0"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-medium text-[hsl(var(--mn-text))] group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2">
                  {question.title}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <DifficultyIndicator level={question.difficulty || 1} />
                {topic && (
                  <Badge variant="outline" className="text-xs">
                    {topic.title}
                  </Badge>
                )}
                {question.visibility && question.visibility !== 'public' && (
                  <VisibilityBadge visibility={question.visibility} />
                )}
              </div>

              {question.question_text && (
                <p className="text-sm text-[hsl(var(--mn-muted))] line-clamp-2">
                  {question.question_text.substring(0, 150)}...
                </p>
              )}
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge status={progress?.status || 'new'} size="sm" />
              
              {onToggleBookmark && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    onToggleBookmark(question.id);
                  }}
                  className="text-[hsl(var(--mn-muted))] hover:text-amber-500"
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </Button>
              )}

              <Link to={createPageUrl('QuestionDetail') + `?id=${question.id}`}>
                <ChevronRight className="w-5 h-5 text-[hsl(var(--mn-muted))] group-hover:text-teal-600 transition-colors" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}