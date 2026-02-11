/**
 * Supabase wrapper - provides base44-compatible API
 * This allows gradual migration from base44 to direct Supabase
 */

import { supabase } from '@/lib/supabase';

export const base44 = {
  auth: {
    // Get current user session
    me: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session?.user) return null;
      
      // Map Supabase user to base44 format
      return {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || '',
        role: session.user.app_metadata?.role || session.user.user_metadata?.role || 'student',
        clinical_disciplines: session.user.user_metadata?.clinical_disciplines || [],
        ...session.user.user_metadata
      };
    },

    // Login
    login: async ({ email, password }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return data;
    },

    // Logout
    logout: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },

    // Signup
    signup: async ({ email, password, ...metadata }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });
      if (error) throw error;
      return data;
    }
  },

  // Supabase table queries
  from: (table) => supabase.from(table),

  // Direct access to supabase for advanced usage
  _supabase: supabase
};
