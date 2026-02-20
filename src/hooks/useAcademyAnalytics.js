import { useCallback } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

export function useAcademyTrack() {
  const { track } = useAnalytics();

  return useCallback(
    (eventType, metadata = {}) => {
      track(eventType, { ...metadata, source: 'academy' });
    },
    [track]
  );
}

export default useAcademyTrack;
