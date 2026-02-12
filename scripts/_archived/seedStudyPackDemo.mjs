import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@base44/sdk';

const appId = process.env.BASE44_APP_ID;
const token = process.env.BASE44_ACCESS_TOKEN;
const appBaseUrl = process.env.BASE44_APP_BASE_URL || '';
const functionsVersion = process.env.BASE44_FUNCTIONS_VERSION || '';

if (!appId || !token) {
  console.error('Missing BASE44_APP_ID or BASE44_ACCESS_TOKEN env vars.');
  process.exit(1);
}

const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

const demoPath = path.resolve('scripts', 'study-pack-demo.txt');
const content = await fs.readFile(demoPath, 'utf-8');

const user = await base44.auth.me();
if (!user) {
  console.error('Auth failed. Check BASE44_ACCESS_TOKEN.');
  process.exit(1);
}

const pack = await base44.entities.StudyPack.create({
  user_id: user.id,
  title: 'Demo study pack',
  status: 'UPLOADED'
});

await base44.entities.StudyPackFile.create({
  pack_id: pack.id,
  filename: 'study-pack-demo.txt',
  mime_type: 'text/plain',
  size_bytes: content.length,
  content_text: content
});

console.log(`Created StudyPack ${pack.id}. You can now run processing in the app.`);
