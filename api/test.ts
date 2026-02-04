export default async function handler(req: any, res: any) {
  return res.json({ 
    message: 'API works!',
    env: {
      hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
      hasSupabase: !!process.env.VITE_SUPABASE_URL
    }
  });
}
