import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { feedback_id, auto } = req.body || {};

  try {
    // If auto mode, fetch all pending feedback
    let feedbacks: any[] = [];
    if (auto) {
      const { data } = await supabase
        .from('content_feedback')
        .select('*, topics!inner(id, title, full_text_content, bullet_points_summary)')
        .eq('status', 'pending')
        .order('created_at')
        .limit(10);
      feedbacks = data || [];
    } else if (feedback_id) {
      const { data } = await supabase
        .from('content_feedback')
        .select('*, topics!inner(id, title, full_text_content, bullet_points_summary)')
        .eq('id', feedback_id)
        .single();
      if (data) feedbacks = [data];
    }

    if (!feedbacks.length) return res.status(200).json({ message: 'No pending feedback', processed: 0 });

    const results: any[] = [];

    for (const fb of feedbacks) {
      // Mark as analyzing
      await supabase.from('content_feedback').update({ status: 'analyzing' }).eq('id', fb.id);

      const topic = fb.topics;
      const content = topic.full_text_content || topic.bullet_points_summary || '';

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        temperature: 0.1,
        system: `Jsi expert na medicínský obsah. Analyzuješ zpětnou vazbu od uživatelů k AI-generovaným studijním materiálům.

Tvůj úkol:
1. Ověř, zda je nahlášený problém legitimní (založený na evidence-based medicíně)
2. Pokud ano, navrhni konkrétní opravu textu
3. Pokud ne, vysvětli proč je současný obsah správný

Vrať POUZE validní JSON:
{
  "valid": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "proč je/není feedback oprávněný",
  "evidence": ["zdroje potvrzující tvé rozhodnutí"],
  "suggested_fix": "konkrétní opravený text (nebo null pokud neoprávněný)",
  "fix_location": "popis kde v textu opravit (nebo null)",
  "severity": "critical/high/medium/low",
  "auto_apply_safe": true/false
}

auto_apply_safe=true POUZE pokud:
- confidence >= 0.9
- Jedná se o zjevnou faktickou chybu (dávkování, klasifikace, guidelines)
- Oprava je jednoznačná a neohrožuje bezpečnost pacienta
- Nejedná se o subjektivní názor`,
        messages: [{
          role: 'user',
          content: `TÉMA: "${topic.title}"

TYP HLÁŠENÍ: ${fb.feedback_type}
POPIS: ${fb.description}
${fb.quoted_text ? `CITOVANÝ TEXT: "${fb.quoted_text}"` : ''}

AKTUÁLNÍ OBSAH (zkráceno):
${content.substring(0, 8000)}`
        }]
      });

      const text = response.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
      let analysis;
      try {
        analysis = JSON.parse(text.replace(/```json\n?|```/g, '').trim());
      } catch {
        analysis = { valid: false, confidence: 0, reasoning: 'AI parsing error', auto_apply_safe: false };
      }

      // Calculate cost
      const cost = (response.usage.input_tokens / 1e6) * 3 + (response.usage.output_tokens / 1e6) * 15;

      // Log API call
      await supabase.from('api_call_log').insert({
        source: 'feedback-analyzer',
        model: 'claude-sonnet-4-20250514',
        mode: 'review',
        topic_id: topic.id,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cost_usd: cost,
        success: true,
        usage_type: 'message'
      });

      // Update feedback with analysis
      const newStatus = analysis.valid && analysis.auto_apply_safe ? 'approved' : 
                        analysis.valid ? 'approved' : 'rejected';

      await supabase.from('content_feedback').update({
        status: newStatus,
        ai_analysis: analysis,
        ai_analyzed_at: new Date().toISOString(),
        severity: analysis.severity || fb.severity,
      }).eq('id', fb.id);

      // Auto-apply if safe
      if (analysis.valid && analysis.auto_apply_safe && analysis.suggested_fix && analysis.confidence >= 0.9) {
        const currentContent = topic.full_text_content || '';
        let updatedContent = currentContent;

        // Try to find and replace the quoted text
        if (fb.quoted_text && currentContent.includes(fb.quoted_text)) {
          updatedContent = currentContent.replace(fb.quoted_text, analysis.suggested_fix);
        }
        // If no direct match but we have a fix, append a correction note
        else if (analysis.suggested_fix && analysis.fix_location) {
          // Don't auto-replace if we can't find exact match — mark for manual review
          await supabase.from('content_feedback').update({
            status: 'approved', // approved but not auto-applied
            admin_notes: 'Auto-apply failed: exact text not found. Manual review needed.'
          }).eq('id', fb.id);
          
          results.push({ id: fb.id, topic: topic.title, status: 'approved_manual', analysis });
          continue;
        }

        if (updatedContent !== currentContent) {
          await supabase.from('topics').update({
            full_text_content: updatedContent,
            updated_at: new Date().toISOString(),
          }).eq('id', topic.id);

          await supabase.from('content_feedback').update({
            status: 'applied',
            applied_at: new Date().toISOString(),
            applied_by: 'auto',
          }).eq('id', fb.id);

          results.push({ id: fb.id, topic: topic.title, status: 'auto_applied', analysis });
          continue;
        }
      }

      results.push({ id: fb.id, topic: topic.title, status: newStatus, analysis });
    }

    return res.status(200).json({ processed: results.length, results });
  } catch (error: any) {
    console.error('[analyze-feedback]', error);
    return res.status(500).json({ error: error.message });
  }
}
