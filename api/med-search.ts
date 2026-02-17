import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';


const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const TOOL_NAME = 'MedVerseEDU';
const TOOL_EMAIL = 'dev@medverse.cz';

interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  abstract: string;
  doi: string;
  url: string;
}

async function searchPubMed(query: string, maxResults = 8): Promise<PubMedArticle[]> {
  // Step 1: ESearch — get PMIDs
  const searchUrl = `${PUBMED_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&sort=relevance&retmode=json&tool=${TOOL_NAME}&email=${TOOL_EMAIL}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  const idList: string[] = searchData?.esearchresult?.idlist || [];

  if (idList.length === 0) return [];

  // Step 2: EFetch — get article details as XML
  const fetchUrl = `${PUBMED_BASE}/efetch.fcgi?db=pubmed&id=${idList.join(',')}&retmode=xml&tool=${TOOL_NAME}&email=${TOOL_EMAIL}`;
  const fetchRes = await fetch(fetchUrl);
  const xml = await fetchRes.text();

  // Parse XML (simple regex extraction — sufficient for abstracts)
  const articles: PubMedArticle[] = [];
  const articleBlocks = xml.split('<PubmedArticle>').slice(1);

  for (const block of articleBlocks) {
    const pmid = block.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1] || '';
    const title = block.match(/<ArticleTitle>(.+?)<\/ArticleTitle>/s)?.[1]?.replace(/<[^>]+>/g, '') || '';
    
    // Authors
    const authorMatches = [...block.matchAll(/<LastName>(.+?)<\/LastName>\s*<ForeName>(.+?)<\/ForeName>/g)];
    const authorList = authorMatches.map(m => `${m[2]} ${m[1]}`).slice(0, 5);
    const authors = authorList.length > 4 ? `${authorList.slice(0, 4).join(', ')} et al.` : authorList.join(', ');

    // Journal + year
    const journal = block.match(/<Title>(.+?)<\/Title>/)?.[1] || '';
    const year = block.match(/<PubDate>.*?<Year>(\d{4})<\/Year>/s)?.[1] || 
                 block.match(/<PubDate>.*?<MedlineDate>(\d{4})/s)?.[1] || '';

    // Abstract
    const abstractParts = [...block.matchAll(/<AbstractText[^>]*>(.+?)<\/AbstractText>/gs)];
    const abstract = abstractParts.map(m => m[1].replace(/<[^>]+>/g, '')).join(' ').substring(0, 1500);

    // DOI
    const doi = block.match(/<ArticleId IdType="doi">(.+?)<\/ArticleId>/)?.[1] || '';

    articles.push({
      pmid,
      title,
      authors,
      journal,
      year,
      abstract,
      doi,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    });
  }

  return articles;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { query, mode = 'search', topicContext } = req.body || {};

    if (!query?.trim()) {
      return res.status(400).json({ error: 'Missing query' });
    }

    // Step 0: Translate query to English for PubMed (indexed in English)
    let pubmedQuery = query;
    const hasNonAscii = /[^\x00-\x7F]/.test(query);
    if (hasNonAscii) {
      try {
        const translateRes = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 150,
          temperature: 0,
          system: 'Translate the following medical query to English for PubMed search. Return ONLY the English search query, nothing else. Use standard medical/MeSH terminology. Keep it concise (max 8 words).',
          messages: [{ role: 'user', content: query }],
        });
        const translated = translateRes.content
          .filter((b: any) => b.type === 'text')
          .map((b: any) => b.text)
          .join('')
          .trim();
        if (translated) pubmedQuery = translated;
      } catch (_) {
        // If translation fails, use original query
      }
    }

    // Step 1: Search PubMed (20 for browse, 8 for AI synthesis)
    const maxResults = mode === 'search' ? 20 : 8;
    const articles = await searchPubMed(pubmedQuery, maxResults);

    if (mode === 'search') {
      return res.status(200).json({ articles, query, pubmedQuery });
    }

    // Step 2: AI Synthesis (mode === 'answer' or 'deep')
    const abstractContext = articles
      .filter(a => a.abstract)
      .map((a, i) => `[${i + 1}] ${a.title} (${a.journal}, ${a.year})\nAuthors: ${a.authors}\nAbstract: ${a.abstract}`)
      .join('\n\n---\n\n');

    const medverseContext = topicContext 
      ? `\n\n=== MEDVERSE KONTEXT ===\n${topicContext.substring(0, 4000)}\n=== KONEC ===` 
      : '';

    const systemPrompt = `Jsi medicínský informační asistent pro české atestace. Odpovídáš na klinické otázky 
VÝHRADNĚ na základě dodaných PubMed abstrakt.

KRITICKÁ PRAVIDLA (porušení = nebezpečná dezinformace):
1. Odpovídej ČESKY, strukturovaně, klinicky přesně
2. Každé tvrzení MUSÍ mít citaci [1], [2] atd. — POUZE čísla dodaných článků
3. NIKDY nevymýšlej fakta, čísla, studie, dávkování ani reference
4. Pokud dodané abstrakty NEOBSAHUJÍ odpověď, napiš:
   "<p><strong>⚠️ Dostupné abstrakty neposkytují dostatečnou evidenci pro tuto otázku.</strong></p>"
   a uveď jen to, co z abstrakt plyne, bez domýšlení
5. Pokud si nejsi jist, raději uveď méně informací než riskuj nepřesnost
6. Na konci přidej sekci "Klinický závěr" s 2-3 větami pro praxi
7. Formátuj jako HTML (h3, p, ul/li, strong). Nepoužívej markdown
8. Nezahrnuj doporučení pro konkrétního pacienta
9. Na úplný konec přidej: "<p class='disclaimer'>Tato odpověď je generována AI na základě PubMed abstrakt a může obsahovat nepřesnosti. Vždy ověřte informace v primárních zdrojích.</p>"`;

    const userPrompt = `OTÁZKA: ${query}

PUBMED ČLÁNKY (${articles.length}):
${abstractContext}
${medverseContext}

Syntetizuj odpověď na otázku na základě dodaných článků. Cituj každé tvrzení.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3072,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const answerText = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');

    const inputTokens = response.usage?.input_tokens || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    const costUsd = (inputTokens * 3 / 1_000_000) + (outputTokens * 15 / 1_000_000);

    // Log cost (non-blocking)
    try {
      await supabase.from('api_call_log').insert({
        endpoint: 'med-search/answer',
        model: 'claude-sonnet-4-20250514',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd,
        metadata: { query, article_count: articles.length },
      });
    } catch (_) { /* ignore logging errors */ }

    return res.status(200).json({
      answer: answerText,
      articles,
      query,
      pubmedQuery,
      cost_usd: costUsd,
    });
  } catch (error: any) {
    console.error('[med-search] error:', error);
    return res.status(500).json({ error: error.message || 'Search failed' });
  }
}
