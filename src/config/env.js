// Environment configuration
export const config = {
  openaiKey: import.meta.env.VITE_OPENAI_API_KEY,
  googleKey: import.meta.env.VITE_GOOGLE_API_KEY,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
};
