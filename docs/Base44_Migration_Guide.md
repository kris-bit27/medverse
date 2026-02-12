# Base44 SDK Removal — Migration Guide

> **Stav:** Připraveno k implementaci
> **Dopad:** 3 vrstvy (frontend client, backend edge functions, utility scripts)
> **Riziko:** Nízké — frontend `base44` objekt zachovává stejné API

---

## Vrstva 1: Frontend (`src/api/base44Client.js`)

### Co se mění
Stávající soubor **už nepoužívá Base44 SDK** na frontendu — interně volá Supabase.
Ale obsahuje legacy kruft, nekonzistence v entity mappingu a chybí auth token forwarding pro API calls.

### Akce
```
Nahradit: src/api/base44Client.js
Novým:    src/api/base44Client.js  (viz base44Client.v2.js)
```

### Klíčové změny v novém souboru

| Oblast | Stará verze | Nová verze |
|--------|-------------|------------|
| Entity mapping | Duplikace `ENTITY_TABLES` + `ENTITY_CONFIG` | Jeden `ENTITY_CONFIG` objekt |
| Auth token v API calls | Chybí | `callApi()` přidává `Authorization: Bearer` header |
| Export | Pouze `base44` | `base44` (compat) + `medverse` (nový název) |
| AIInteractionLog | Chybí v mappingu | Přidán |
| `plan` na user objektu | Chybí | Mapuje z `user_metadata.plan` |
| Komentáře | Minimální | Plně zdokumentováno |

### Co se NEMĚNÍ (backwards compatible)
- `import { base44 } from '@/api/base44Client'` — funguje identicky
- `base44.entities.Question.list()` — stejné API
- `base44.entities.ClinicalDiscipline.list()` — stejný fieldMap (obory → ClinicalDiscipline)
- `base44.auth.me()` — stejný output
- `base44.functions.invoke('invokeEduLLM', {...})` — stejné
- `base44.agents.sendMessage(...)` — stejné
- `base44.integrations.Core.InvokeLLM(...)` — stejné

### Žádné 30+ komponent nepotřebuje změnit import!

---

## Vrstva 2: Backend Edge Functions (Supabase)

### Soubory s `@base44/sdk` importem

#### `functions/invokeEduLLM.ts`
```typescript
// AKTUÁLNĚ:
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
const base44 = createClientFromRequest(req);
const user = await base44.auth.me();
await base44.asServiceRole.entities.AIInteractionLog.create({...});

// NAHRADIT:
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// User auth z request headeru
const authHeader = req.headers.get('Authorization');
const supabaseUser = createClient(supabaseUrl, supabaseServiceKey);
const { data: { user } } = await supabaseUser.auth.getUser(
  authHeader?.replace('Bearer ', '')
);

// Service role pro audit logging
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
await supabaseAdmin.from('ai_interaction_logs').insert({...});
```

#### `functions/invokeClaudeEduLLM.ts`
```typescript
// STEJNÝ PATTERN — nahradit createClientFromRequest za Supabase client
```

#### `functions/generateTaxonomy.ts`
```typescript
// STEJNÝ PATTERN — nahradit createClientFromRequest za Supabase client
```

### Vzorový refaktor Edge Function

```typescript
// functions/_shared/supabaseAdmin.ts (sdílený helper)
import { createClient } from 'npm:@supabase/supabase-js@2';

export const getSupabaseAdmin = () => createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export const getUserFromRequest = async (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  
  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return user;
};
```

### Environment Variables potřebné v Supabase Edge Functions
- `SUPABASE_URL` — automaticky dostupné
- `SUPABASE_ANON_KEY` — automaticky dostupné  
- `SUPABASE_SERVICE_ROLE_KEY` — musí být nastaveno v secrets
- `ANTHROPIC_API_KEY` — již existuje

---

## Vrstva 3: Utility skripty

### `scripts/seedStudyPackDemo.mjs`
```javascript
// AKTUÁLNĚ:
import { createClient } from '@base44/sdk';
const base44 = createClient({ appId, token, ... });

// NAHRADIT:
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
// Pak přímo: await supabase.from('study_packs').insert({...})
```

### `scripts/export-base44.js`
```javascript
// TENTO SKRIPT JE OBSOLETE — byl pro export dat z Base44 platformy
// AKCE: Přesunout do scripts/archive/ nebo smazat
// Pokud potřebujeme export z Supabase, použijeme pg_dump nebo Supabase CLI
```

---

## Vrstva 4: Vercel API routes (`functions/api/index.js`)

Tento soubor **už nepoužívá Base44 SDK** — importuje přímo `@supabase/supabase-js` a `@anthropic-ai/sdk`. Žádná akce potřeba.

---

## Odstranění @base44/sdk z dependencies

### Frontend `package.json`
```bash
# Zkontrolovat jestli @base44/sdk je v dependencies
npm ls @base44/sdk
# Pokud ano:
npm uninstall @base44/sdk
```

### Functions `functions/package.json`
Deno edge functions importují přes `npm:` specifier, takže nejsou v package.json.
Ale po migraci už žádný soubor nebude importovat `npm:@base44/sdk`.

---

## Pořadí implementace

```
KROK 1: Nahradit src/api/base44Client.js novým souborem
        → Test: všechny stránky fungují stejně
        
KROK 2: Vytvořit functions/_shared/supabaseAdmin.ts helper
        → Sdílený kód pro edge functions

KROK 3: Migrovat functions/invokeEduLLM.ts
        → Nahradit createClientFromRequest → Supabase client
        → Test: AI generování funguje
        
KROK 4: Migrovat functions/invokeClaudeEduLLM.ts
        → Stejný pattern
        → Test: Claude generování funguje
        
KROK 5: Migrovat functions/generateTaxonomy.ts
        → Stejný pattern
        → Test: taxonomy generování funguje
        
KROK 6: Archivovat/smazat legacy skripty
        → scripts/export-base44.js → scripts/archive/
        → scripts/seedStudyPackDemo.mjs → přepsat na Supabase
        
KROK 7: Odstranit @base44/sdk z dependencies
        → npm uninstall @base44/sdk
        → Ověřit build

KROK 8: Odstranit Base44 env variables
        → VITE_BASE44_APP_ID
        → VITE_BASE44_APP_BASE_URL
        → BASE44_ACCESS_TOKEN
        → BASE44_FUNCTIONS_VERSION
```

---

## Rizika a mitigace

| Riziko | Pravděpodobnost | Mitigace |
|--------|-----------------|----------|
| Edge functions ztratí auth | Střední | Nový helper parsuje JWT z Authorization headeru |
| `asServiceRole` pattern chybí | Střední | Nahrazeno přímým Supabase admin clientem |
| Některá stránka volá nezmapovanou entitu | Nízké | Proxy fallback na `toSnakeCase(entityName)` |
| Agent conversations zmizí | Nízké | Stále v localStorage, kód je identický |

---

## Verifikace po migraci

- [ ] `npm run build` prošel bez chyb
- [ ] Login → Dashboard funguje
- [ ] Otázky se načítají (entities.Question.list)
- [ ] Obory se načítají (entities.ClinicalDiscipline.list → tabulka `obory`)
- [ ] Okruhy se načítají (entities.Okruh.list → tabulka `okruhy`)
- [ ] AI generování odpovědí funguje (functions.invoke)
- [ ] Hippo chat funguje (agents.sendMessage)
- [ ] File upload funguje (integrations.Core.UploadFile)
- [ ] Admin CRUD funguje (create, update, delete)
- [ ] Review session funguje (UserProgress update)
- [ ] Žádný import `@base44/sdk` v celém codebase
