import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

export function useAcademyCourses(level) {
  return useQuery({
    queryKey: ['academy-courses', level],
    queryFn: async () => {
      let query = supabase
        .from('academy_courses')
        .select('*, academy_course_prerequisites(prerequisite_course_id)')
        .eq('is_active', true)
        .order('order_index');

      if (level !== undefined && level !== null) {
        query = query.eq('level', level);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAcademyLessons(courseId) {
  return useQuery({
    queryKey: ['academy-lessons', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_lessons')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('order_index');

      if (error) throw error;
      return data || [];
    },
    enabled: !!courseId,
  });
}

export function useAcademyProgress(userId) {
  return useQuery({
    queryKey: ['academy-progress', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_user_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useAcademyCourseProgress(userId) {
  return useQuery({
    queryKey: ['academy-course-progress', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_academy_course_progress', { p_user_id: userId });

      if (error) {
        console.error('[useAcademyCourseProgress] RPC error:', error);
        throw error;
      }
      console.log('[useAcademyCourseProgress] RPC data:', data);
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useAcademySkillRadar(userId) {
  return useQuery({
    queryKey: ['academy-skill-radar', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_academy_skill_radar', {
        p_user_id: userId,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useUpdateProgress() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ lessonId, status, score, timeSpentSeconds, quizAnswers }) => {
      const payload = {
        user_id: user.id,
        lesson_id: lessonId,
        status,
        ...(score !== undefined && { score }),
        ...(timeSpentSeconds !== undefined && { time_spent_seconds: timeSpentSeconds }),
        ...(quizAnswers !== undefined && { quiz_answers: quizAnswers }),
        ...(status === 'completed' && { completed_at: new Date().toISOString() }),
      };

      const { data, error } = await supabase
        .from('academy_user_progress')
        .upsert(payload, { onConflict: 'user_id,lesson_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academy-progress'] });
      queryClient.invalidateQueries({ queryKey: ['academy-course-progress'] });
    },
  });
}

export function useAcademyCertificates(userId) {
  return useQuery({
    queryKey: ['academy-certificates', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_certificates')
        .select('*')
        .eq('user_id', userId)
        .order('issued_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useAcademyProfile(userId) {
  return useQuery({
    queryKey: ['academy-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('academy_level, academy_xp, academy_badges, is_builder, builder_role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useAcademySandboxSessions(userId, limit = 5) {
  return useQuery({
    queryKey: ['academy-sandbox-sessions', userId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academy_sandbox_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useCheckAcademyAchievement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ achievementType, tokens, name }) => {
      const { data, error } = await supabase.rpc('earn_tokens', {
        p_user_id: user.id,
        p_amount: tokens,
        p_achievement_type: achievementType,
        p_achievement_name: name,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      if (data) {
        toast.success(`🎉 Achievement: "${variables.name}" +${variables.tokens} 💎`);
        queryClient.invalidateQueries({ queryKey: ['achievements'] });
        queryClient.invalidateQueries({ queryKey: ['userTokens'] });
      }
    },
  });
}
