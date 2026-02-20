#!/usr/bin/env node

/**
 * seed-academy-content.js
 *
 * Seeds Level 1 AI Academy lesson content.
 *
 * For article/quiz/case_study: calls the academy-generate-content Edge Function.
 * For interactive/sandbox: writes hardcoded content directly to DB.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... ADMIN_JWT=... node scripts/seed-academy-content.js
 *
 * Required env vars:
 *   SUPABASE_URL           — e.g. https://rrjohtzqqyhgqfpkvrbu.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — for direct DB writes (interactive/sandbox)
 *   SUPABASE_ANON_KEY      — for Edge Function calls
 *   ADMIN_JWT              — Bearer token of an admin user (for Edge Function auth)
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ADMIN_JWT = process.env.ADMIN_JWT;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Hardcoded content for interactive/sandbox lessons ───

const HARDCODED_CONTENT = {
  // Match by lesson title substring (case-insensitive)
  "jak ai přemýšlí": {
    steps: [
      {
        title: "Jak LLM generuje text",
        content:
          'Velké jazykové modely (LLM) jako GPT-4 nebo Claude **nepřemýšlejí** v lidském smyslu. Generují text slovo po slově na základě pravděpodobností.\n\nPředstavte si to jako velmi sofistikované automatické doplňování: model vidí dosavadní text a predikuje, jaké slovo s nejvyšší pravděpodobností následuje.\n\n> 🧠 **Klíčový insight:** Model neví, co je „pravda". Ví jen, co je „pravděpodobné" na základě trénovacích dat.',
      },
      {
        title: "Proč to vypadá jako porozumění",
        content:
          'LLM jsou trénované na obrovském množství textu — knihy, články, klinické guidelines, diskuze...\n\nKdyž se zeptáte na léčbu pneumonie, model negeneruje odpověď z „vědění". Statisticky rekonstruuje, co by v odpovědi na tuto otázku pravděpodobně následovalo v kvalitním medicínském textu.\n\n**Důsledek pro praxi:**\n- Běžné diagnózy → výborné výsledky (hodně trénovacích dat)\n- Raritní diagnózy → nespolehlivé (málo dat)\n- České guidelines → méně spolehlivé než mezinárodní (méně českých zdrojů)',
      },
      {
        title: 'Teplota a „kreativita" modelu',
        content:
          'Parametr **temperature** ovlivňuje, jak „kreativní" je model:\n\n- **Nízká teplota (0.0–0.3):** Deterministické, konzervativní odpovědi. Vhodné pro faktické otázky.\n- **Vysoká teplota (0.7–1.0):** Více variability, občas překvapivé odpovědi. Riziko halucinací.\n\n> ⚕️ **Pro klinickou práci:** Vždy preferujte nízkou teplotu. Nechcete, aby AI „kreativně improvizovala" s diagnózou pacienta.',
      },
      {
        title: "Co z toho plyne pro lékaře",
        content:
          '### Pravidla práce s AI v klinické praxi:\n\n1. **AI je rádce, ne rozhodovatel** — finální odpovědnost je vždy na vás\n2. **Čím specifičtější prompt, tím lepší odpověď** — model potřebuje kontext\n3. **Ověřujte vždy** — zvlášť u dávkování, kontraindikací a chirurgických postupů\n4. **Nedávejte AI reálná pacientská data** — GDPR a etika\n5. **Buďte skeptičtí k jistotě** — čím jistěji AI odpovídá, tím víc ověřujte',
      },
    ],
  },

  "ai safety checklist": {
    steps: [
      {
        title: "Proč potřebujete checklist",
        content:
          "Piloti mají pre-flight checklist. Chirurgové mají WHO Surgical Safety Checklist. Lékaři používající AI by měli mít svůj.\n\n**30 sekund** před každým AI promptem si projděte 5 otázek. Stane se to návykem za týden.",
      },
      {
        title: "Otázka 1: Jaký je můj cíl?",
        content:
          'Co přesně od AI chci?\n\n✅ Dobře: "Potřebuji diferenciální diagnózu pro 65letého muže s akutní bolestí na hrudi a elevací ST."\n\n❌ Špatně: "Co má pacient?"\n\nČím specifičtější otázka, tím užitečnější odpověď.',
      },
      {
        title: "Otázka 2: Jaká data AI dávám?",
        content:
          "**NIKDY nedávejte AI:**\n- Jméno a příjmení pacienta\n- Rodné číslo\n- Fotografii obličeje\n- Identifikační údaje\n\n**MŮŽETE dát AI:**\n- Věk, pohlaví, relevantní anamnézu (anonymizovaně)\n- Lab hodnoty bez identifikátorů\n- Popis symptomů",
      },
      {
        title: "Otázka 3: Co je riziko chyby?",
        content:
          "Zeptejte se: **Co se stane, když AI odpověď bude špatná?**\n\n🟢 **Nízké riziko:** rešerše, vzdělávání, brainstorming\n🟡 **Střední riziko:** diferenciální diagnóza (vždy ověřit), guidelines interpretace\n🔴 **Vysoké riziko:** dávkování, chirurgické postupy, urgentní rozhodnutí\n\nČím vyšší riziko, tím víc ověřujte.",
      },
      {
        title: "Otázky 4 a 5: Co ověřit? Jaké zdroje?",
        content:
          "**Otázka 4:** Jaké aspekty AI odpovědi MUSÍM ověřit?\n- Dávkování → vždy v SPC/lékové databázi\n- Kontraindikace → vždy ověřit\n- Chirurgický postup → konzultovat s guidelines/literaturou\n\n**Otázka 5:** Jaké zdroje použiji k ověření?\n- UpToDate, guidelines relevantní společnosti\n- SPC léku (SÚKL databáze)\n- Konzultace s kolegou\n\n> 📋 **Váš checklist:** Cíl? → Data? → Riziko? → Co ověřit? → Zdroje?",
      },
    ],
  },

  "stop the ai": {
    scenario:
      "AI asistent odpověděl na dotaz lékaře ohledně léčby pacienta s akutní bolestí na hrudi. Odpověď obsahuje faktickou chybu, která by mohla být klinicky nebezpečná. Vaším úkolem je identifikovat chybu a napsat prompt, kterým AI na chybu upozorníte.",
    instructions:
      "Přečtěte si níže uvedený AI výstup a napište prompt, ve kterém:\n1. Identifikujete konkrétní chybu\n2. Vysvětlíte, proč je nebezpečná\n3. Navrhnete správný postup",
    example_good_prompt:
      "V tvé odpovědi je chyba: doporučuješ podání betablokátoru u pacienta s akutním STEMI a TK 85/50. Betablokátor je kontraindikován při hypotenzi (TK < 90 systolický). Správný postup je: okamžitá PCI bez betablokátoru, volumová resuscitace dle potřeby.",
    example_bad_prompt: "Zkontroluj to",
    evaluation_focus:
      "Hodnoť: identifikace chyby (správnost), klinické odůvodnění (proč je to nebezpečné), návrh správného postupu (kompletnost)",
    min_score_to_pass: 60,
  },

  "tvůj první klinický prompt": {
    scenario:
      "Jste na ambulanci a přichází 72letá pacientka s námahovou dušností progredující 3 týdny. Chcete využít AI k rozšíření diferenciální rozvahy.",
    instructions:
      "Napište AI prompt, který:\n1. Obsahuje relevantní klinický kontext (věk, pohlaví, symptomy)\n2. Specifikuje, co od AI chcete (DDx, ne léčbu)\n3. Neobsahuje identifikační údaje\n4. Požaduje strukturovaný výstup",
    example_good_prompt:
      "72letá žena, námahová dušnost progredující 3 týdny, bez klidové dušnosti. Anamnéza: hypertenze 15 let, DM2 na metforminu. Nekuřačka. TK 150/90, TF 92 reg., SpO2 94% v klidu. Prosím o diferenciální diagnózu seřazenou dle pravděpodobnosti. Pro každou diagnózu uveď: pravděpodobnost (vysoká/střední/nízká), klíčový potvrzující test, red flags k vyloučení.",
    example_bad_prompt:
      "Pacientka Marie Nováková, RČ 500115/1234, má dušnost, co to je?",
    evaluation_focus:
      "Hodnoť: klinický kontext (kompletnost), absence PII (GDPR), specifičnost požadavku (co chce od AI), požadavek na strukturu výstupu",
    min_score_to_pass: 60,
  },

  "optimalizuj odpověď iterací": {
    scenario:
      "Máte AI odpověď na diferenciální diagnózu z předchozího cvičení. Odpověď je obecná a chybí jí klinická hloubka. Vaším úkolem je napsat follow-up prompt, který AI odpověď vylepší.",
    instructions:
      "Napište iterační prompt, který:\n1. Odkazuje na předchozí odpověď AI\n2. Požaduje konkrétnější informace (dávky, postupy, časování)\n3. Specifikuje formát výstupu (tabulka, SOAP, checklist)\n4. Ptá se na 'co bych neměl přehlédnout'",
    example_good_prompt:
      "Díky za DDx. Nyní prosím rozviň 3 nejpravděpodobnější diagnózy. Pro každou uveď ve formátu tabulky: 1) Doporučená vyšetření (seřazená chronologicky), 2) Kritéria pro potvrzení diagnózy, 3) Red flags vyžadující urgentní jednání, 4) Časté 'pitfalls' které bych neměl přehlédnout. Zaměř se na diferenciaci mezi srdečním selháním, CHOPN exacerbací a plicní embolií.",
    example_bad_prompt: "Řekni mi víc",
    evaluation_focus:
      "Hodnoť: iterační kvalita (buduje na předchozí odpovědi), specifičnost požadavků, strukturovaný výstup, safety awareness (ptá se na red flags/pitfalls)",
    min_score_to_pass: 60,
  },

  "praktický sandbox challenge": {
    scenario:
      "Závěrečná výzva Level 1. Na urgentním příjmu máte 45letého muže s febrilním stavem (39.2°C), bolestí břicha v pravém hypogastriu a leukocytózou 18.5. Chcete využít AI jako konzultačního partnera.",
    instructions:
      "Napište prompt, který demonstruje VŠECHNY dovednosti z Level 1:\n1. Správný klinický kontext (bez PII)\n2. Specifický požadavek (DDx + doporučená vyšetření)\n3. Požadavek na strukturovaný výstup\n4. Awareness limitů AI (ptejte se na confidence)\n5. Safety first (požádejte o red flags a urgentní stavy k vyloučení)",
    example_good_prompt:
      "45M, febrilie 39.2°C, bolest pravý hypogastrium, leukocytóza 18.5×10⁹/L, CRP 145, bez průjmu, bez dysúrie. McBurney pozitivní, Blumberg negativní. Prosím o: 1) DDx seřazenou dle pravděpodobnosti s confidence pro každou, 2) Doporučená vyšetření k diferenciaci, 3) Red flags vyžadující OKAMŽITÝ chirurgický konzil, 4) Upozorni mě, pokud si v něčem nejsi jistý nebo pokud ti chybí informace.",
    example_bad_prompt: "Bolí ho břicho vpravo a má horečku, co to je?",
    evaluation_focus:
      "KOMPLEXNÍ hodnocení: klinický kontext, absence PII, specifičnost, strukturovaný výstup, safety checklist awareness (cíl/data/riziko/ověření/zdroje), prompt engineering kvalita. Toto je ZÁVĚREČNÝ test.",
    min_score_to_pass: 65,
  },
};

// ─── Helpers ─────────────────────────────────────────────

function findHardcodedContent(lessonTitle) {
  const titleLower = lessonTitle.toLowerCase();
  for (const [key, content] of Object.entries(HARDCODED_CONTENT)) {
    if (titleLower.includes(key)) {
      return content;
    }
  }
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callEdgeFunction(lessonId, forceRegenerate = false) {
  const functionUrl = `${SUPABASE_URL}/functions/v1/academy-generate-content`;
  const token = ADMIN_JWT || SUPABASE_SERVICE_ROLE_KEY;

  const resp = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      lesson_id: lessonId,
      force_regenerate: forceRegenerate,
    }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || `HTTP ${resp.status}`);
  }
  return data;
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  console.log("🎓 MedVerse AI Academy — Content Seed Script\n");

  // Fetch all lessons that need content
  const { data: lessons, error } = await supabaseAdmin
    .from("academy_lessons")
    .select("id, title, slug, content_type, content, order_index, course_id, academy_courses(title, level)")
    .eq("is_active", true)
    .order("order_index");

  if (error) {
    console.error("❌ Failed to fetch lessons:", error.message);
    process.exit(1);
  }

  // Filter to lessons with empty content
  const needsContent = lessons.filter(
    (l) =>
      !l.content || (typeof l.content === "object" && Object.keys(l.content).length === 0)
  );

  console.log(
    `📊 Found ${lessons.length} total lessons, ${needsContent.length} need content.\n`
  );

  if (needsContent.length === 0) {
    console.log("✅ All lessons already have content. Nothing to do.");
    return;
  }

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;
  let totalCost = 0;

  for (let i = 0; i < needsContent.length; i++) {
    const lesson = needsContent[i];
    const courseTitle = lesson.academy_courses?.title || "?";
    const prefix = `[${i + 1}/${needsContent.length}]`;

    process.stdout.write(
      `${prefix} ${lesson.content_type.padEnd(12)} "${lesson.title}"... `
    );

    try {
      // Check if this is a hardcoded content type
      if (
        lesson.content_type === "interactive" ||
        lesson.content_type === "sandbox"
      ) {
        const hardcoded = findHardcodedContent(lesson.title);
        if (hardcoded) {
          const { error: updateError } = await supabaseAdmin
            .from("academy_lessons")
            .update({
              content: hardcoded,
              metadata: {
                review_status: "pending",
                generated_at: new Date().toISOString(),
                generated_by: "seed-script",
                source: "hardcoded",
              },
            })
            .eq("id", lesson.id);

          if (updateError) throw new Error(updateError.message);

          console.log("✓ (hardcoded)");
          successCount++;
        } else {
          console.log("⏭ (no hardcoded content found, skipping)");
          skipCount++;
        }
        continue;
      }

      // AI-generated content: call Edge Function
      if (
        lesson.content_type === "article" ||
        lesson.content_type === "quiz" ||
        lesson.content_type === "case_study"
      ) {
        const result = await callEdgeFunction(lesson.id);
        const cost = result.cost_usd || 0;
        totalCost += cost;

        console.log(
          `✓ (${result.model}, ${result.tokens_used} tokens, $${cost.toFixed(4)}, ${result.elapsed_ms}ms)`
        );
        successCount++;

        // Small delay between API calls to respect rate limits
        await sleep(1500);
        continue;
      }

      // Video or unknown type
      console.log(`⏭ (${lesson.content_type} — skipping)`);
      skipCount++;
    } catch (err) {
      console.log(`✗ ERROR: ${err.message}`);
      failCount++;
    }
  }

  // Summary
  console.log("\n" + "═".repeat(50));
  console.log("📊 SUMMARY");
  console.log("═".repeat(50));
  console.log(`  ✓ Success:  ${successCount}`);
  console.log(`  ✗ Failed:   ${failCount}`);
  console.log(`  ⏭ Skipped:  ${skipCount}`);
  console.log(`  💰 Cost:    $${totalCost.toFixed(4)}`);
  console.log("═".repeat(50));

  if (failCount > 0) {
    console.log(
      "\n⚠️  Some lessons failed. Re-run the script to retry, or use force_regenerate."
    );
  }
  if (successCount > 0) {
    console.log(
      "\n📝 All generated content has review_status='pending'. Please review before publishing."
    );
  }
}

main().catch((err) => {
  console.error("❌ Script crashed:", err);
  process.exit(1);
});
