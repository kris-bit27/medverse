// scripts/export-base44.js
const fs = require('fs');

// Dynamický import Base44 klienta
async function exportData() {
  console.log('🔄 Exportuji data z Base44...\n');

  let base44;
  try {
    const module = await import('../src/api/base44Client.js');
    base44 = module.base44;
  } catch (error) {
    console.error('❌ Nelze načíst Base44 client:', error.message);
    console.log('⚠️  Možná Base44 není dostupný. Pokračujeme bez exportu.\n');
    return;
  }

  const exports = {
    topics: { entity: 'Topic', file: 'topics.json' },
    obory: { entity: 'Obor', file: 'obory.json' },
    okruhy: { entity: 'Okruh', file: 'okruhy.json' },
    questions: { entity: 'Question', file: 'questions.json' }
  };

  for (const [name, config] of Object.entries(exports)) {
    try {
      console.log(`📚 Exportuji ${name}...`);
      const data = await base44.entities[config.entity].filter({});
      
      fs.writeFileSync(
        `./migration-data/${config.file}`,
        JSON.stringify(data, null, 2)
      );
      
      console.log(`✅ ${name}: ${data.length} záznamů\n`);
    } catch (error) {
      console.log(`⚠️  ${name}: Chyba (${error.message})\n`);
    }
  }

  console.log('✅ Export dokončen!\n');
}

exportData().catch(error => {
  console.error('❌ Export selhal:', error);
  process.exit(1);
});
