/**
 * useAnalytics — global lightweight event tracking
 * 
 * Works anywhere in the app. Batches events to reduce DB writes.
 * Uses analytics_events table with debounced inserts.
 * 
 * Usage:
 *   const { track } = useAnalytics();
 *   track('search_query', { query: 'SGLT2', mode: 'answer', results: 8 });
 */
import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

const BATCH_INTERVAL = 5000; // flush every 5s
const MAX_BATCH = 20;

// Shared buffer across all hook instances
let eventBuffer = [];
let flushTimer = null;

async function flushEvents() {
  if (eventBuffer.length === 0) return;
  const batch = eventBuffer.splice(0, MAX_BATCH);
  try {
    await supabase.from('analytics_events').insert(batch);
  } catch (err) {
    console.warn('[analytics] flush failed:', err);
    // Put events back (lossy — OK for analytics)
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushEvents();
  }, BATCH_INTERVAL);
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (eventBuffer.length > 0) {
      // Use sendBeacon for reliable delivery on unload
      const payload = JSON.stringify(eventBuffer);
      eventBuffer = [];
      try {
        // Can't use supabase client here, so we do raw fetch via sendBeacon
        // This is best-effort — some events may be lost on unload, which is acceptable
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/analytics_events`,
          new Blob([payload], { type: 'application/json' })
        );
      } catch (_) {}
    }
  });
}

export function useAnalytics() {
  const { user } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;

  const track = useCallback((eventType, eventData = {}) => {
    const u = userRef.current;
    if (!u?.id) return;

    eventBuffer.push({
      user_id: u.id,
      event_type: eventType,
      event_data: {
        ...eventData,
        ts: new Date().toISOString(),
        path: window.location.pathname + window.location.search,
      },
    });

    // Flush immediately if buffer is full
    if (eventBuffer.length >= MAX_BATCH) {
      flushEvents();
    } else {
      scheduleFlush();
    }
  }, []);

  // Track page view on mount
  const trackPageView = useCallback((pageName, extra = {}) => {
    track('page_view', { page: pageName, ...extra });
  }, [track]);

  return { track, trackPageView };
}

export default useAnalytics;
