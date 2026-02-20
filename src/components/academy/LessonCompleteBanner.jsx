import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, ArrowRight } from 'lucide-react';

export default function LessonCompleteBanner({ xpEarned, nextLessonSlug, courseSlug, courseCompleted }) {
  const navigate = useNavigate();

  return (
    <Card className="border-green-500/30 bg-green-500/5 mt-6">
      <CardContent className="p-6 text-center space-y-3">
        <div className="text-4xl">{courseCompleted ? '🎉' : '✅'}</div>
        <h3 className="text-lg font-semibold">
          {courseCompleted ? 'Kurz dokončen!' : 'Lekce dokončena!'}
        </h3>
        {xpEarned > 0 && (
          <p className="text-[hsl(var(--mn-muted))]">+{xpEarned} XP</p>
        )}
        <div className="flex justify-center gap-3 pt-2">
          {courseCompleted ? (
            <Button onClick={() => navigate(createPageUrl('AcademyDashboard'))}>
              <Award className="w-4 h-4 mr-2" />
              Zpět na Academy
            </Button>
          ) : nextLessonSlug ? (
            <Button
              onClick={() =>
                navigate(
                  createPageUrl('AcademyLesson') +
                    `?course=${courseSlug}&lesson=${nextLessonSlug}`
                )
              }
            >
              Další lekce
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={() => navigate(createPageUrl('AcademyDashboard'))}>
              Zpět na Academy
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
