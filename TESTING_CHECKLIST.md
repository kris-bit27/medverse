# Claude Integration Testing

## Pre-deployment checklist

### Backend
- [ ] functions/invokeClaudeEduLLM.ts exists and builds
- [ ] ANTHROPIC_API_KEY je v environment variables
- [ ] Function se volá správně z frontendu
- [ ] Fallback na Gemini funguje (test s vypnutým API key)
- [ ] Error handling logs correctly

### Frontend  
- [ ] TopicContentEditorV2 používá invokeClaudeEduLLM
- [ ] Warnings se zobrazují
- [ ] Metadata se ukládají do DB
- [ ] Toast notifikace fungují
- [ ] Review panel se zobrazuje

### Test Cases

#### Test 1: Basic generation
1. Otevři existující topic
2. Klikni "Generovat Fulltext"
3. Očekáváno:
   - Loading indicator
   - Success toast s metadaty
   - Content se načte do editoru
   - Warnings (pokud existují) se zobrazí

#### Test 2: High-yield extraction
1. Topic s existujícím fulltextem
2. Klikni "Generovat High-Yield"
3. Očekáváno:
   - Max 15 bullet points
   - Formát: 🔴/⚡/⚠️
   - Confidence > 0.8

#### Test 3: Deep dive
1. Topic s fulltextem
2. Klikni "Generovat Deep Dive"
3. Očekáváno:
   - Web search byl použit
   - Sources obsahují PMID/DOI
   - 2000-3000 slov
   - Research areas populated

#### Test 4: Fallback
1. Dočasně deaktivuj ANTHROPIC_API_KEY
2. Zkus generovat content
3. Očekáváno:
   - Gemini se zavolá automaticky
   - Badge "Fallback: Gemini použit"
   - Content se vygeneruje

#### Test 5: Save & metadata
1. Vygeneruj content
2. Uložit
3. Reload stránky
4. Očekáváno:
   - AI metadata persisted
   - Warnings saved
   - Review status = pending

### Performance
- [ ] Generation time < 30s pro fulltext
- [ ] Generation time < 15s pro high-yield
- [ ] Cost < $0.30 per topic average

### Quality metrics (manual review)
- [ ] Faktická přesnost (porovnej s guidelines)
- [ ] Citace zdrojů přítomny
- [ ] České termíny správně
- [ ] Struktura logická
