/**
 * useStudyTracking — tracks study sessions and analytics events
 * 
 * Sprint 1: Core event tracking for personalization engine
 * Automatically records: topic_opened, study duration, tab switches
 * 
 * Usage:
 *   const { trackEvent } = useStudyTracking(topicId);
 *   // Auto-tracks open/close. Call trackEvent('custom_action', { ... }) for extras.
 */
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

export function useStudyTracking(topicId, options = {}) {
  const { user } = useAuth();
  const sessionRef = useRef(null);
  const startTimeRef = useRef(null);
  const activeTimeRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const isActiveRef = useRef(true);
  const intervalRef = useRef(null);

  // Track active time (pause when tab is hidden)
  useEffect(() => {
    if (!topicId || !user?.id) return;

    const handleVisibility = () => {
      if (document.hidden) {
        isActiveRef.current = false;
      } else {
        isActiveRef.current = true;
        lastActivityRef.current = Date.now();
      }
    };

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      isActiveRef.current = true;
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });

    // Count active seconds every second
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      // User is "active" if tab is visible AND activity in last 60s
      if (isActiveRef.current && (now - lastActivityRef.current) < 60000) {
        activeTimeRef.current += 1;
      }
    }, 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [topicId, user?.id]);

  // Start session on mount
  useEffect(() => {
    if (!topicId || !user?.id) return;

    startTimeRef.current = new Date().toISOString();
    activeTimeRef.current = 0;

    // Log topic_opened event
    logEvent('topic_opened', { topic_id: topicId });

    // Cleanup: save session on unmount
    return () => {
      saveSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, user?.id]);

  // Save session before page unload
  useEffect(() => {
    if (!topicId || !user?.id) return;

    const handleBeforeUnload = () => {
      saveSessionSync();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, user?.id]);

  const logEvent = useCallback(async (eventType, eventData = {}) => {
    if (!user?.id) return;
    try {
      await supabase.from('analytics_events').insert({
        user_id: user.id,
        event_type: eventType,
        event_data: {
          topic_id: topicId,
          ...eventData,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.warn('[tracking] event log failed:', err);
    }
  }, [user?.id, topicId]);

  const saveSession = useCallback(async () => {
    if (!user?.id || !topicId || !startTimeRef.current) return;
    const duration = activeTimeRef.current;
    if (duration < 3) return; // Skip very short visits

    try {
      const endTime = new Date().toISOString();
      await supabase.from('study_sessions').insert({
        user_id: user.id,
        topic_id: topicId,
        session_type: 'reading',
        duration_seconds: duration,
        started_at: startTimeRef.current,
        ended_at: endTime,
        metadata: {
          active_seconds: duration,
          wall_seconds: Math.round((Date.now() - new Date(startTimeRef.current).getTime()) / 1000),
        },
      });
      // Reset to prevent double-save
      startTimeRef.current = null;
    } catch (err) {
      console.warn('[tracking] session save failed:', err);
    }
  }, [user?.id, topicId]);

  // Sync version for beforeunload (sendBeacon fallback)
  const saveSessionSync = useCallback(() => {
    if (!user?.id || !topicId || !startTimeRef.current) return;
    const duration = activeTimeRef.current;
    if (duration < 3) return;

    const endTime = new Date().toISOString();
    const payload = JSON.stringify({
      user_id: user.id,
      topic_id: topicId,
      session_type: 'reading',
      duration_seconds: duration,
      started_at: startTimeRef.current,
      ended_at: endTime,
      metadata: {
        active_seconds: duration,
        wall_seconds: Math.round((Date.now() - new Date(startTimeRef.current).getTime()) / 1000),
      },
    });

    // Try sendBeacon for reliable unload tracking
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/study_sessions`;
    const headers = {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${supabase.auth?.currentSession?.access_token || ''}`,
      'Prefer': 'return=minimal',
    };

    try {
      const blob = new Blob([payload], { type: 'application/json' });
      // sendBeacon doesn't support custom headers, so fall back to fetch keepalive
      fetch(url, {
        method: 'POST',
        headers,
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Best effort
    }
    startTimeRef.current = null;
  }, [user?.id, topicId]);

  const trackEvent = useCallback((eventType, data = {}) => {
    logEvent(eventType, data);
  }, [logEvent]);

  const trackTabSwitch = useCallback((tabId) => {
    logEvent('tab_switched', { tab: tabId, seconds_so_far: activeTimeRef.current });
  }, [logEvent]);

  return {
    trackEvent,
    trackTabSwitch,
    getActiveSeconds: () => activeTimeRef.current,
  };
}

export default useStudyTracking;
