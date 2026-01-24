import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { 
  AI_VERSION_TAG, 
  MEDVERSE_EDU_CORE_PROMPT, 
  MODE_PROMPTS,
  OUTPUT_SCHEMAS 
} from '../utils/aiPrompts.js';

/**
 * Centrální wrapper pro všechna AI volání v MedVerse EDU
 * 
 * @param {Object} params
 * @param {string} params.mode - AI režim (question_exam_answer, topic_generate_fulltext, atd.)
 * @param {Object} params.entityContext - Kontext z DB (topic, question, okruh, obor)
 * @param {string} params.userPrompt - Prompt od uživatele
 * @param {boolean} params.allowWeb - Povolit web search (default false)
 * @param {string} params.userId - ID uživatele
 * @returns {Object} {text, citations, confidence, structuredData, logId}
 */
Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mode, entityContext = {}, userPrompt, allowWeb = false } = await req.json();

    if (!mode || !MODE_PROMPTS[mode]) {
      return Response.json({ 
        error: 'Invalid mode', 
        validModes: Object.keys(MODE_PROMPTS) 
      }, { status: 400 });
    }

    // Sestavení retrieval contextu (RAG)
    const retrievalContext = await buildRetrievalContext(base44, mode, entityContext);

    // Sestavení finálního promptu
    const systemPrompt = MEDVERSE_EDU_CORE_PROMPT + "\n\n" + MODE_PROMPTS[mode];
    
    let fullPrompt = systemPrompt + "\n\n";
    
    if (retrievalContext.internal) {
      fullPrompt += "=== INTERNÍ ZDROJE (POVINNÉ K POUŽITÍ) ===\n" + retrievalContext.internal + "\n\n";
    }
    
    fullPrompt += "=== UŽIVATELSKÝ DOTAZ ===\n" + userPrompt;

    // Určení JSON schématu
    const outputSchema = OUTPUT_SCHEMAS[mode] || null;

    // Volání LLM
    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      add_context_from_internet: allowWeb,
      response_json_schema: outputSchema
    });

    // Parsování výstupu
    const result = parseAIResponse(llmResponse, mode, outputSchema);

    // Logování do AI_Interaction_Log
    const logEntry = await base44.asServiceRole.entities.AIInteractionLog.create({
      user_id: user.id,
      mode: mode,
      entity_type: entityContext.entityType || 'none',
      entity_id: entityContext.entityId || null,
      prompt_version: AI_VERSION_TAG,
      input_summary: userPrompt.substring(0, 200),
      output_text: typeof result.text === 'string' ? result.text.substring(0, 500) : JSON.stringify(result.structuredData).substring(0, 500),
      citations_json: result.citations,
      confidence: result.confidence?.level || 'medium',
      confidence_reason: result.confidence?.reason || '',
      tokens_estimate: estimateTokens(fullPrompt + JSON.stringify(llmResponse)),
      success: true,
      duration_ms: Date.now() - startTime
    });

    return Response.json({
      success: true,
      text: result.text,
      structuredData: result.structuredData,
      citations: result.citations,
      confidence: result.confidence,
      missingTopics: result.missingTopics,
      logId: logEntry.id,
      aiVersion: AI_VERSION_TAG
    });

  } catch (error) {
    console.error('invokeEduLLM error:', error);
    
    // Log error
    try {
      const base44 = createClientFromRequest(req);
      const user = await base44.auth.me();
      if (user) {
        await base44.asServiceRole.entities.AIInteractionLog.create({
          user_id: user.id,
          mode: 'unknown',
          entity_type: 'none',
          prompt_version: AI_VERSION_TAG,
          input_summary: 'Error occurred',
          success: false,
          error_text: error.message,
          duration_ms: Date.now() - startTime
        });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});

/**
 * Sestaví retrieval kontext podle režimu a entity
 */
async function buildRetrievalContext(base44, mode, entityContext) {
  const context = { internal: '', external: '' };

  // Pro question režimy - vezmi Topic a související témata
  if (mode.startsWith('question_')) {
    if (entityContext.question) {
      const question = entityContext.question;
      
      // Primární topic
      if (question.topic_id || question.linked_topic_id) {
        const topicId = question.topic_id || question.linked_topic_id;
        try {
          const topic = await base44.asServiceRole.entities.Topic.get(topicId);
          if (topic) {
            context.internal += `\n### Hlavní téma: ${topic.title}\n\n`;
            if (topic.full_text_content) {
              context.internal += `${topic.full_text_content}\n\n`;
            }
            if (topic.bullet_points_summary) {
              context.internal += `**Shrnutí:**\n${topic.bullet_points_summary}\n\n`;
            }
            if (topic.learning_objectives?.length > 0) {
              context.internal += `**Výukové cíle:**\n${topic.learning_objectives.map(o => `- ${o}`).join('\n')}\n\n`;
            }
          }
        } catch (err) {
          console.error('Failed to fetch topic:', err);
        }
      }

      // Související témata ze stejného okruhu (max 2)
      if (question.okruh_id) {
        try {
          const relatedTopics = await base44.asServiceRole.entities.Topic.filter(
            { okruh_id: question.okruh_id },
            null,
            3
          );
          if (relatedTopics.length > 0) {
            context.internal += `\n### Související témata z okruhu:\n\n`;
            for (const rt of relatedTopics.slice(0, 2)) {
              if (rt.id !== (question.topic_id || question.linked_topic_id)) {
                context.internal += `**${rt.title}**\n`;
                if (rt.bullet_points_summary) {
                  context.internal += `${rt.bullet_points_summary.substring(0, 300)}...\n\n`;
                }
              }
            }
          }
        } catch (err) {
          console.error('Failed to fetch related topics:', err);
        }
      }

      // Existující odpověď (pokud existuje)
      if (question.answer_rich) {
        context.internal += `\n### Existující odpověď (pro referenci):\n${question.answer_rich}\n\n`;
      }
    }
  }

  // Pro topic režimy
  if (mode.startsWith('topic_')) {
    if (entityContext.topic) {
      const topic = entityContext.topic;
      
      if (mode === 'topic_summarize' && topic.full_text_content) {
        context.internal += `### Plný text k sumarizaci:\n\n${topic.full_text_content}\n\n`;
      }
      
      if (mode === 'topic_deep_dive') {
        if (topic.full_text_content) {
          context.internal += `### Základní text:\n\n${topic.full_text_content}\n\n`;
        }
        if (topic.bullet_points_summary) {
          context.internal += `### Shrnutí:\n\n${topic.bullet_points_summary}\n\n`;
        }
      }

      // Související témata z okruhu
      if (topic.okruh_id) {
        try {
          const relatedTopics = await base44.asServiceRole.entities.Topic.filter(
            { okruh_id: topic.okruh_id },
            null,
            3
          );
          if (relatedTopics.length > 0) {
            context.internal += `\n### Kontext z okruhu:\n`;
            for (const rt of relatedTopics) {
              if (rt.id !== topic.id && rt.title) {
                context.internal += `- ${rt.title}\n`;
              }
            }
            context.internal += '\n';
          }
        } catch (err) {
          console.error('Failed to fetch related topics:', err);
        }
      }
    }
  }

  return context;
}

/**
 * Parsuje AI odpověď podle režimu
 */
function parseAIResponse(llmResponse, mode, outputSchema) {
  const result = {
    text: '',
    structuredData: null,
    citations: { internal: [], external: [] },
    confidence: { level: 'medium', reason: 'Standardní odpověď' },
    missingTopics: []
  };

  // Pokud je výstup JSON schema
  if (outputSchema && typeof llmResponse === 'object') {
    result.structuredData = llmResponse;
    
    // Extrahuj citations a confidence ze struktury
    if (llmResponse.citations) {
      result.citations = llmResponse.citations;
    }
    if (llmResponse.confidence) {
      result.confidence = llmResponse.confidence;
    }
    if (llmResponse.missing_topics) {
      result.missingTopics = llmResponse.missing_topics;
    }
    
    // Pro některé režimy vyextrahuj i text
    if (llmResponse.answer_md) {
      result.text = llmResponse.answer_md;
    } else if (llmResponse.mcq) {
      result.text = 'Quiz vygenerován - viz structuredData';
    }
  } else {
    // Prostý text
    result.text = typeof llmResponse === 'string' ? llmResponse : JSON.stringify(llmResponse);
  }

  return result;
}

/**
 * Odhadne počet tokenů (hrubý odhad)
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}