// academy-generate-content — Admin-only Edge Function for generating Academy lesson content
// Flow: auth → admin check → read lesson → generate via Anthropic → save to DB → log

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const MODEL_ARTICLE =
  Deno.env.get("ACADEMY_CONTENT_MODEL_ARTICLE") || "claude-sonnet-4-20250514";
const MODEL_QUIZ =
  Deno.env.get("ACADEMY_CONTENT_MODEL_QUIZ") || "claude-haiku-4-5-20251001";
const MODEL_CASE_STUDY =
  Deno.env.get("ACADEMY_CONTENT_MODEL_CASE_STUDY") || "claude-sonnet-4-20250514";

// ─── System Prompts ──────────────────────────────────────

const ARTICLE_SYSTEM_PROMPT = `Jsi senior medicínský educator a expert na AI v klinické praxi.
Tvým úkolem je vytvořit vzdělávací lekci pro platformu MedVerse AI Academy.

POŽADAVKY NA OBSAH:
- Délka: 800-1500 slov (5-10 minut čtení)
- Styl: profesionální ale přístupný, ne suchý textbook
- Struktura: jasné sekce s nadpisy (## H2)
- Příklady: konkrétní klinické příklady, ne abstraktní teorie
- Tone: "zkušený kolega vysvětluje kolegovi" — ne přednáška, ne tutorial pro laiky
- Actionable: každá sekce by měla obsahovat praktický tip nebo takeaway

POVINNÉ ELEMENTY:
- Minimálně 2 konkrétní klinické příklady (fiktivní pacienti/scénáře)
- "Aha moment" — něco překvapivého nebo kontraintuitivního
- Propojení s reálnou klinickou praxí v ČR/EU

BEZPEČNOST:
- Nikdy neuvádět AI jako náhradu klinického rozhodování
- Vždy zdůrazňovat nutnost ověření AI výstupů
- Explicitně varovat před GDPR riziky při práci s pacientskými daty
- Wording: "AI jako nástroj pro rozšíření klinické rozvahy", NE "AI dělá diagnózu"

JAZYK: čeština (české odborné termíny, kde je to vhodné s anglickým ekvivalentem v závorce)

VÝSTUP: Pouze validní JSON (bez markdown code blocks):
{
  "body_md": "## Celý text lekce v markdownu...",
  "key_takeaways": ["3-5 klíčových bodů k zapamatování"],
  "clinical_pearl": "Jedna klinická perla — praktický tip k okamžitému použití",
  "further_reading": [{"title": "...", "url": "..."}]
}`;

const QUIZ_SYSTEM_PROMPT = `Jsi medicínský educator. Vytvoř kvíz pro AI Academy lekci.

PRAVIDLA:
- Formát: single-choice MCQ, 4 možnosti (A-D)
- Obtížnost: přiměřená pro lékaře s 0-2 lety praxe
- NIKDY nepoužívat "všechny výše uvedené" nebo "žádná z výše uvedených"
- Každá otázka musí mít jasně jednu správnou odpověď
- Vysvětlení musí být edukativní — ne jen "správná odpověď je X"
- Distraktory musí být plausibilní (ne zjevně špatné)
- Otázky testují POROZUMĚNÍ, ne memorování

JAZYK: čeština

VÝSTUP: Pouze validní JSON (bez markdown code blocks):
{
  "questions": [
    {
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": 0,
      "explanation": "..."
    }
  ],
  "passing_score": 70,
  "time_limit_seconds": null
}`;

const CASE_STUDY_SYSTEM_PROMPT = `Jsi klinický lékař a educator. Vytvoř case study pro AI Academy.

PRAVIDLA:
- Pacient musí být FIKTIVNÍ (žádná reálná data)
- Scénář musí demonstrovat správné/nesprávné použití AI v praxi
- Vitální funkce a lab hodnoty musí být realistické a klinicky konzistentní
- Ideální postup musí explicitně zahrnovat: kdy konzultovat AI, jak ověřit výstup, kdy se spolehnout na vlastní úsudek

JAZYK: čeština

VÝSTUP: Pouze validní JSON:
{
  "patient": {
    "name": "Jan Novák",
    "age": 58,
    "sex": "M",
    "presenting_complaint": "...",
    "history": "...",
    "vitals": "TK .../..., TF ..., SpO2 ...%"
  },
  "question": "Jak byste v tomto případě využili AI? Jaký je váš postup?",
  "ideal_approach": "Krok 1: ... Krok 2: ... atd.",
  "stop_the_ai": false,
  "ai_response_with_error": null,
  "error_description": null
}`;

const CASE_STUDY_STOP_AI_ADDON = `
SPECIÁLNÍ REŽIM: "Stop the AI"
Vygeneruj case study kde AI odpověď obsahuje JEDNU PLAUSIBILNÍ ALE NEBEZPEČNOU CHYBU.
Chyba musí být:
- Realistická (ne absurdní)
- Klinicky relevantní (ne kosmetická)
- Detekovatelná zkušeným lékařem
- Dobře maskovaná v jinak korektní odpovědi

Příklady chyb: špatná dávka léku, opomenutá kontraindikace, nesprávná interpretace lab hodnoty, nevhodný postup pro danou komoribiditu.

VÝSTUP: Pouze validní JSON:
{
  "patient": { ... },
  "question": "Identifikujte problém v následující AI odpovědi.",
  "ideal_approach": "Chyba AI odpovědi je: [popis chyby]. Správný postup je: ...",
  "stop_the_ai": true,
  "ai_response_with_error": "Celá AI odpověď s chybou...",
  "error_description": "Popis chyby pro evaluaci."
}`;

// ─── Helpers ─────────────────────────────────────────────

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callAnthropic(
  systemPrompt: string,
  userMessage: string,
  model: string,
  maxTokens: number
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`Anthropic API ${resp.status}: ${errBody}`);
    }

    const data = await resp.json();
    const text = data.content?.[0]?.text || "";
    const usage = data.usage || {};

    return {
      text,
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractJSON(raw: string): Record<string, unknown> {
  // Try direct parse first
  try {
    return JSON.parse(raw);
  } catch {
    // Try extracting from markdown code block
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1].trim());
    }
    // Try finding JSON object pattern
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("No valid JSON found in response");
  }
}

// ─── Cost estimation ─────────────────────────────────────

function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Approximate costs per 1M tokens
  const costs: Record<string, { input: number; output: number }> = {
    "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
    "claude-haiku-4-5-20251001": { input: 0.8, output: 4.0 },
  };
  const c = costs[model] || { input: 3.0, output: 15.0 };
  return (inputTokens / 1_000_000) * c.input + (outputTokens / 1_000_000) * c.output;
}

// ─── Main Handler ────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const startTime = Date.now();

  try {
    // ── 1. Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Chybí autorizace.", code: "UNAUTHORIZED" }, 401);
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "Neplatný token.", code: "UNAUTHORIZED" }, 401);
    }

    // ── 2. Admin check ──
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    // Also check JWT metadata
    const jwtRole = user.app_metadata?.role || user.user_metadata?.role;
    const isAdmin = profile?.role === "admin" || jwtRole === "admin";

    if (!isAdmin) {
      return jsonResponse({ error: "Přístup odepřen. Pouze admin.", code: "FORBIDDEN" }, 403);
    }

    // ── 3. Parse request ──
    const body = await req.json();
    const { lesson_id, force_regenerate = false } = body;

    if (!lesson_id) {
      return jsonResponse({ error: "Chybí lesson_id.", code: "BAD_REQUEST" }, 400);
    }

    // ── 4. Read lesson + course ──
    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from("academy_lessons")
      .select("*, academy_courses(*)")
      .eq("id", lesson_id)
      .single();

    if (lessonError || !lesson) {
      return jsonResponse({ error: "Lekce nenalezena.", code: "NOT_FOUND" }, 404);
    }

    const course = lesson.academy_courses;
    const contentType = lesson.content_type;

    // ── 5. Check existing content ──
    const hasContent =
      lesson.content &&
      typeof lesson.content === "object" &&
      Object.keys(lesson.content).length > 0;

    if (hasContent && !force_regenerate) {
      return jsonResponse(
        {
          error: "Content already exists. Use force_regenerate=true to overwrite.",
          code: "CONFLICT",
          lesson_id,
          content_type: contentType,
        },
        409
      );
    }

    // ── 6. Skip manual content types ──
    if (contentType === "interactive" || contentType === "sandbox" || contentType === "video") {
      return jsonResponse(
        {
          error: `Content type '${contentType}' requires manual content. Cannot auto-generate.`,
          code: "MANUAL_CONTENT_TYPE",
        },
        400
      );
    }

    // ── 7. Build prompt and select model ──
    let systemPrompt: string;
    let userMessage: string;
    let model: string;
    let maxTokens: number;

    const courseTitle = course?.title || "Unknown Course";
    const lessonTitle = lesson.title || "Unknown Lesson";

    if (contentType === "article") {
      systemPrompt = ARTICLE_SYSTEM_PROMPT;
      userMessage = `KONTEXT:
- Kurz: ${courseTitle}
- Level: ${course?.level || 1}
- Lekce: ${lessonTitle}
- Cílová skupina: čeští lékaři a medici

Vytvoř vzdělávací článek pro tuto lekci.`;
      model = MODEL_ARTICLE;
      maxTokens = 4096;
    } else if (contentType === "quiz") {
      const numQuestions = lessonTitle.toLowerCase().includes("závěrečný") ? 20 : 5;
      systemPrompt = QUIZ_SYSTEM_PROMPT;
      userMessage = `KONTEXT:
- Kurz: ${courseTitle}
- Level: ${course?.level || 1}
- Lekce: ${lessonTitle}
- Počet otázek: ${numQuestions}

Vytvoř kvíz pro tuto lekci.`;
      model = MODEL_QUIZ;
      maxTokens = 2048;
    } else if (contentType === "case_study") {
      // Check if lesson title hints at "stop the AI"
      const isStopTheAI =
        lessonTitle.toLowerCase().includes("stop the ai") ||
        lessonTitle.toLowerCase().includes("odhal");

      systemPrompt = isStopTheAI
        ? CASE_STUDY_SYSTEM_PROMPT + CASE_STUDY_STOP_AI_ADDON
        : CASE_STUDY_SYSTEM_PROMPT;
      userMessage = `KONTEXT:
- Kurz: ${courseTitle}
- Level: ${course?.level || 1}
- Lekce: ${lessonTitle}
${isStopTheAI ? "\nREŽIM: Stop the AI — vygeneruj case s chybou v AI odpovědi." : ""}

Vytvoř case study pro tuto lekci.`;
      model = MODEL_CASE_STUDY;
      maxTokens = 3000;
    } else {
      return jsonResponse(
        { error: `Unsupported content_type: ${contentType}`, code: "BAD_REQUEST" },
        400
      );
    }

    // ── 8. Call AI (with 1 retry on JSON failure) ──
    let generatedContent: Record<string, unknown> | null = null;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let attempts = 0;

    for (let attempt = 0; attempt < 2; attempt++) {
      attempts = attempt + 1;
      const retryMsg =
        attempt === 1
          ? "\n\nYour previous response was not valid JSON. Return ONLY valid JSON, no markdown code blocks, no extra text."
          : "";

      const result = await callAnthropic(
        systemPrompt,
        userMessage + retryMsg,
        model,
        maxTokens
      );

      totalInputTokens += result.inputTokens;
      totalOutputTokens += result.outputTokens;

      try {
        generatedContent = extractJSON(result.text);
        break; // Success
      } catch (parseErr) {
        if (attempt === 1) {
          // Second attempt also failed
          const costUsd = estimateCost(model, totalInputTokens, totalOutputTokens);

          // Log failure
          try {
            await supabaseAdmin.from("api_call_log").insert({
              user_id: user.id,
              source: "academy-generate-content",
              model,
              input_tokens: totalInputTokens,
              output_tokens: totalOutputTokens,
              cost_usd: costUsd,
              success: false,
              elapsed_ms: Date.now() - startTime,
              metadata: {
                lesson_id,
                content_type: contentType,
                error: "JSON parse failed after 2 attempts",
                raw_response_preview: result.text.slice(0, 500),
              },
            });
          } catch {
            // Logging is non-critical
          }

          return jsonResponse(
            {
              error: "AI vrátila nevalidní JSON po 2 pokusech.",
              code: "JSON_PARSE_ERROR",
              raw_preview: result.text.slice(0, 200),
            },
            500
          );
        }
        // First attempt failed, will retry
      }
    }

    if (!generatedContent) {
      return jsonResponse({ error: "Generování selhalo.", code: "GENERATION_FAILED" }, 500);
    }

    // ── 9. Save content to DB ──
    const { error: updateError } = await supabaseAdmin
      .from("academy_lessons")
      .update({
        content: generatedContent,
        metadata: {
          ...(lesson.metadata || {}),
          review_status: "pending",
          generated_at: new Date().toISOString(),
          generated_by: user.id,
          generation_model: model,
          generation_attempts: attempts,
        },
      })
      .eq("id", lesson_id);

    if (updateError) {
      return jsonResponse(
        { error: "Uložení selhalo: " + updateError.message, code: "SAVE_ERROR" },
        500
      );
    }

    // ── 10. Log success ──
    const costUsd = estimateCost(model, totalInputTokens, totalOutputTokens);

    try {
      await supabaseAdmin.from("api_call_log").insert({
        user_id: user.id,
        source: "academy-generate-content",
        model,
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        cost_usd: costUsd,
        success: true,
        elapsed_ms: Date.now() - startTime,
        metadata: {
          lesson_id,
          content_type: contentType,
          course_title: courseTitle,
          lesson_title: lessonTitle,
        },
      });
    } catch {
      // Logging is non-critical
    }

    // ── 11. Return success ──
    return jsonResponse({
      success: true,
      lesson_id,
      content_type: contentType,
      model,
      tokens_used: totalInputTokens + totalOutputTokens,
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      cost_usd: costUsd,
      attempts,
      elapsed_ms: Date.now() - startTime,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      return jsonResponse({ error: "Timeout — AI odpovídala příliš dlouho.", code: "TIMEOUT" }, 504);
    }

    console.error("[academy-generate-content] Unexpected error:", err);
    return jsonResponse(
      { error: "Interní chyba serveru.", code: "INTERNAL_ERROR" },
      500
    );
  }
});
