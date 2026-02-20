import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { useAcademyProfile } from '@/hooks/useAcademy';
import { Zap, X } from 'lucide-react';

const DISMISS_KEY = 'academy-rec-dismissed';
const SESSION_KEY = 'academy-rec-shown-this-session';

export default function AcademyRecommendation() {
  const { user } = useAuth();
  const { data: profile } = useAcademyProfile(user?.id);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const wasDismissed = localStorage.getItem(DISMISS_KEY) === 'true';
    const shownThisSession = sessionStorage.getItem(SESSION_KEY) === 'true';
    setDismissed(wasDismissed || shownThisSession);
    if (!wasDismissed && !shownThisSession) {
      sessionStorage.setItem(SESSION_KEY, 'true');
    }
  }, []);

  if (dismissed || !user) return null;

  const academyLevel = profile?.academy_level || 0;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-teal-500/20 bg-teal-500/5">
      <Zap className="w-4 h-4 text-teal-500 shrink-0" />
      <div className="flex-1 text-sm">
        {academyLevel < 1 ? (
          <span>
            Naučte se efektivně využívat AI pro studium →{' '}
            <Link
              to={createPageUrl('AcademyDashboard')}
              className="font-medium text-teal-600 dark:text-teal-400 hover:underline"
            >
              AI Academy (zdarma)
            </Link>
          </span>
        ) : (
          <span>
            Vyzkoušejte AI sandbox pro toto téma →{' '}
            <Link
              to={createPageUrl('AcademySandbox')}
              className="font-medium text-teal-600 dark:text-teal-400 hover:underline"
            >
              Sandbox
            </Link>
          </span>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
