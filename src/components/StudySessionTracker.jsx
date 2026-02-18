import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play,
  Pause,
  Clock,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function StudySessionTracker({ topicId, sessionType = 'reading' }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isActive, setIsActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      startTimeRef.current = Date.now() - (elapsedSeconds * 1000);
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  // Save session mutation
  const saveSession = useMutation({
    mutationFn: async ({ completed }) => {
      if (elapsedSeconds < 10) {
        throw new Error('Session too short');
      }

      const { error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          topic_id: topicId,
          session_type: sessionType,
          duration_seconds: elapsedSeconds,
          completed: completed
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Study session uložena!');
      queryClient.invalidateQueries(['studySessions']);
      setElapsedSeconds(0);
      setIsActive(false);
    },
    onError: (error) => {
      if (error.message === 'Session too short') {
        toast.error('Studijní session musí trvat alespoň 10 sekund');
      } else {
        toast.error('Chyba při ukládání session');
      }
    }
  });

  const handleStartPause = () => {
    setIsActive(!isActive);
  };

  const handleComplete = () => {
    setIsActive(false);
    saveSession.mutate({ completed: true });
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return null;
  }

  return (
    <Card className="border-[hsl(var(--mn-accent)/0.2)] bg-[hsl(var(--mn-accent)/0.06)]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[hsl(var(--mn-accent))]" />
            <div>
              <p className="text-sm font-medium">Study Timer</p>
              <p className="text-2xl font-mono font-bold">
                {formatTime(elapsedSeconds)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isActive ? 'secondary' : 'default'}
              onClick={handleStartPause}
            >
              {isActive ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pauza
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </>
              )}
            </Button>

            {elapsedSeconds > 0 && (
              <Button
                size="sm"
                onClick={handleComplete}
                disabled={saveSession.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Dokončit
              </Button>
            )}
          </div>
        </div>

        {isActive && (
          <div className="mt-2">
            <Badge variant="outline" className="gap-1">
              <div className="w-2 h-2 rounded-full bg-[hsl(var(--mn-success))] animate-pulse" />
              Probíhá studium
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
