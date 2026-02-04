// test-env.js
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing environment variables...\n');

const vars = {
  'Supabase URL': process.env.VITE_SUPABASE_URL,
  'Supabase Key': process.env.VITE_SUPABASE_ANON_KEY,
  'Anthropic Key': process.env.ANTHROPIC_API_KEY
};

Object.entries(vars).forEach(([name, value]) => {
  if (value) {
    console.log(`✅ ${name}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${name}: MISSING`);
  }
});

console.log('\n' + (Object.values(vars).every(v => v) ? '✅ All set!' : '⚠️  Some missing!'));