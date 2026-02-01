import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Anthropic from 'npm:@anthropic-ai/sdk@0.34.0';

const CLAUDE_VERSION_TAG = "medverse_claude_sonnet_4_v1";

const MODEL_ID = 'claude-sonnet-4-20250514';
const DEFAULT_TEMP = 0.3;
const MAX_TOKENS = 4096;
const INPUT_COST_PER_1M = 3;
const OUTPUT_COST_PER_1M = 15;

const MODES = {
  topic_generate_fulltext_v2: {
    systemPrompt: 'Jsi odborný medicínský edukátor. Piš česky, strukturovaně, bez halucinací.',
    userPromptTemplate: `FULLTEXT\nTASK:\nVytvoř kompletní studijní text na atestační úrovni.\n\nCONTEXT:\nSpecialty: {{specialty}}\nOkruh: {{okruh}}\nTéma: {{tema}}\nTopic / Question: {{title}}\n\nOUTPUT:\nVrať čistý markdown.`,
    enableWebSearch: false
  },
  topic_generate_high_yield: {
    systemPrompt: 'Jsi odborný medicínský edukátor. Piš česky, stručně.',
    userPromptTemplate: `HIGH-YIELD\nTASK:\nZ plného textu vytvoř high-yield body.\n\nFULL TEXT:\n{{full_text}}\n\nOUTPUT:\nPouze odrážky v markdown.`,
    enableWebSearch: false
  },
  topic_generate_deep_dive: {
    systemPrompt: 'Jsi odborný medicínský edukátor. Piš česky, pokročile.',
    userPromptTemplate: `DEEP-DIVE\nTASK:\nVytvoř rozšířený expert content bez opakování fulltextu.\n\nFULL TEXT:\n{{full_text}}\n\nOUTPUT:\nMarkdown.`,
    enableWebSearch: true
  },
  topic_summarize: {
    systemPrompt: 'Jsi odborný medicínský edukátor. Piš česky, extrakt pouze z textu.',
    userPromptTemplate: `SHRNUTÍ\nTASK:\nExtrahuj pouze klíčové body z plného textu.\n\nFULL TEXT:\n{{full_text}}\n\nOUTPUT:\nPouze odrážky v markdown.`,
    enableWebSearch: false
  },
  topic_reformat: {
    systemPrompt: 'Jsi editor studijního textu. Nepřidávej nové informace.',
    userPromptTemplate: `REFORMAT\nTASK:\nPřeformátuj text do přehledného markdownu. Neztrácej informace.\n\nTEXT:\n{{full_text}}\n\nOUTPUT:\nMarkdown.`,
    enableWebSearch: false
  }
};

function fillTemplate(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value || ''),
    template
  );
}

function calculateCost(usage: { input_tokens?: number; output_tokens?: number }) {
  const input = usage.input_tokens || 0;
  const output = usage.output_tokens || 0;
  const inputCost = (input / 1_000_000) * INPUT_COST_PER_1M;
  const outputCost = (output / 1_000_000) * OUTPUT_COST_PER_1M;
  return {
    input: Number(inputCost.toFixed(6)),
    output: Number(outputCost.toFixed(6)),
    total: Number((inputCost + outputCost).toFixed(6))
  };
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  let payload: any = null;

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    payload = await req.json();
    const {
      mode,
      entityContext = {},
      userPrompt
    } = payload || {};

    if (!mode || !MODES[mode]) {
      return Response.json({ error: 'Invalid mode', validModes: Object.keys(MODES) }, { status: 400 });
    }

    const modeConfig = MODES[mode];
    const templateVars = {
      specialty: entityContext?.specialty || '',
      okruh: entityContext?.okruh || '',
      tema: entityContext?.tema || '',
      title: entityContext?.title || entityContext?.topic?.title || '',
      full_text: entityContext?.full_text || entityContext?.full_text_content || ''
    };

    const finalUserPrompt = userPrompt && typeof userPrompt === 'string'
      ? userPrompt
      : fillTemplate(modeConfig.userPromptTemplate, templateVars);

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY') || ''
    });

    const tools = modeConfig.enableWebSearch
      ? [{ type: 'web_search_20250305' }]
      : [];

    const response = await anthropic.messages.create({
      model: MODEL_ID,
      temperature: DEFAULT_TEMP,
      max_tokens: MAX_TOKENS,
      system: modeConfig.systemPrompt,
      messages: [{ role: 'user', content: finalUserPrompt }],
      tools
    });

    const textBlocks = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join('\n')
      .trim();

    const usage = response.usage || {};
    const cost = calculateCost(usage);

    return Response.json({
      text: textBlocks || undefined,
      full_text: mode === 'topic_generate_fulltext_v2' ? textBlocks || undefined : undefined,
      high_yield: mode === 'topic_generate_high_yield' || mode === 'topic_summarize' ? textBlocks || undefined : undefined,
      deep_dive: mode === 'topic_generate_deep_dive' ? textBlocks || undefined : undefined,
      confidence: 0.6,
      sources: response.content.filter((b) => b.type === 'tool_result').map(() => 'web_search'),
      warnings: [],
      metadata: {
        model: MODEL_ID,
        tokensUsed: usage,
        cost,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[CLAUDE-AI]', error);
    try {
      const base44 = createClientFromRequest(req);
      const fallback = await base44.functions.invoke('invokeEduLLM', payload);
      return Response.json(fallback?.data || fallback);
    } catch (fallbackError) {
      console.error('[CLAUDE-AI] fallback failed', fallbackError);
      return Response.json({
        error: error.message,
        aiVersion: CLAUDE_VERSION_TAG,
        confidence: 0,
        warnings: ['Claude generation failed and fallback failed'],
        metadata: {
          model: MODEL_ID,
          tokensUsed: {},
          cost: { input: 0, output: 0, total: 0 },
          generatedAt: new Date().toISOString()
        }
      }, { status: 500 });
    }
  } finally {
    const elapsed = Date.now() - startTime;
    if (elapsed > 20000) {
      console.log('[CLAUDE-AI] slow response', { ms: elapsed });
    }
  }
});
