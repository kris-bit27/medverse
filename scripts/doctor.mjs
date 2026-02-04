import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const srcDir = path.join(projectRoot, 'src');
const pkgPath = path.join(projectRoot, 'package.json');

const exts = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (exts.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function isExternal(spec) {
  return !(
    spec.startsWith('.') ||
    spec.startsWith('/') ||
    spec.startsWith('@/') ||
    spec.startsWith('~/') ||
    spec.startsWith('virtual:') ||
    spec.startsWith('node:')
  );
}

function toPackageName(spec) {
  if (!isExternal(spec)) return null;
  if (spec.startsWith('@')) {
    const parts = spec.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : spec;
  }
  return spec.split('/')[0];
}

function collectImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const specs = new Set();
  const patterns = [
    /\b(?:import|export)\s+(?:[^'\"]+\s+from\s+)?['\"]([^'\"]+)['\"]/g,
    /\brequire\(\s*['\"]([^'\"]+)['\"]\s*\)/g,
    /\bimport\(\s*['\"]([^'\"]+)['\"]\s*\)/g
  ];

  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(content))) {
      specs.add(match[1]);
    }
  }

  return specs;
}

function main() {
  if (!fs.existsSync(srcDir)) {
    console.error('doctor: src/ directory not found.');
    process.exit(1);
  }
  if (!fs.existsSync(pkgPath)) {
    console.error('doctor: package.json not found.');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const declared = new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {})
  ]);

  const files = walk(srcDir);
  const rawSpecs = new Set();
  for (const file of files) {
    for (const spec of collectImports(file)) rawSpecs.add(spec);
  }

  const externals = [...rawSpecs]
    .map(toPackageName)
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .sort();

  const missing = externals.filter((name) => !declared.has(name));

  if (missing.length === 0) {
    console.log('doctor: ok - no missing dependencies found.');
    process.exit(0);
  }

  console.log('doctor: missing dependencies found:');
  for (const name of missing) {
    console.log(`- ${name}`);
  }

  console.log('');
  console.log(`Suggested install command:`);
  console.log(`npm i ${missing.join(' ')}`);

  process.exit(1);
}

main();
