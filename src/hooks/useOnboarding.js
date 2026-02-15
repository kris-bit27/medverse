import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

/**
 * Hook that checks if the current user needs onboarding.
 * Returns { needsOnboarding, isLoading } 
 * 
 * User needs onboarding if:
 * 1. They have no user_profiles record with onboarding_completed = true
 * 2. AND they have no active user_specialization_profile
 */
export function useOnboarding() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-status', user?.id],
    queryFn: async () => {
      if (!user) return { needsOnboarding: false };

      // Check if onboarding was completed
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .single();

      if (profile?.onboarding_completed) {
        return { needsOnboarding: false };
      }

      // Check if they already have a specialization profile (set up before onboarding existed)
      const { data: specProfiles } = await supabase
        .from('user_specialization_profile')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (specProfiles && specProfiles.length > 0) {
        // They already have a profile, mark onboarding as done
        await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        return { needsOnboarding: false };
      }

      return { needsOnboarding: true };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  return {
    needsOnboarding: data?.needsOnboarding ?? false,
    isLoading,
  };
}
