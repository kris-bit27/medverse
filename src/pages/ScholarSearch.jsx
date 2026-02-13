import React, { useState } from 'react';
import { callApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, ExternalLink, Loader2, BookOpen, Calendar, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScholarSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await callApi('invokeLLM', {
        prompt: `Vyhledej odborné medicínské články na téma: "${query}". 
        
Pro každý článek vrať:
- title: název článku
- authors: autoři
- journal: časopis
- year: rok publikace
- summary: krátké shrnutí (2-3 věty)
- url: odkaz na článek (pokud je dostupný)
- doi: DOI (pokud existuje)

Najdi 5-8 nejrelevantnějších článků z renomovaných zdrojů.`,
        add_context_from_internet: true,
        model: 'gemini-1.5-pro',
        maxTokens: 2048,
        response_json_schema: {
          type: "object",
          properties: {
            articles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  authors: { type: "string" },
                  journal: { type: "string" },
                  year: { type: "string" },
                  summary: { type: "string" },
                  url: { type: "string" },
                  doi: { type: "string" }
                }
              }
            }
          }
        }
      });

      setResults(response.articles || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-teal-600" />
            Vyhledávání odborných článků
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Vyhledejte nejnovější medicínské publikace z renomovaných zdrojů
          </p>
        </div>

        {/* Search form */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Např. 'reconstructive surgery flap' nebo 'akutní infarkt myokardu'"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 h-12 text-base"
                  disabled={loading}
                />
              </div>
              <Button 
                type="submit" 
                size="lg"
                disabled={loading || !query.trim()}
                className="bg-teal-600 hover:bg-teal-700 px-8"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Hledám...
                  </>
                ) : (
                  'Vyhledat'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Loader2 className="w-12 h-12 animate-spin text-teal-600 mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                Prohledávám odborné databáze...
              </p>
            </motion.div>
          )}

          {!loading && results && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Nalezeno <strong className="text-teal-600">{results.length}</strong> článků
                </p>
              </div>

              {results.map((article, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg text-slate-900 dark:text-white leading-snug mb-3">
                        {article.title}
                      </CardTitle>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          <span>{article.authors}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4" />
                          <span className="italic">{article.journal}</span>
                        </div>
                        {article.year && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span>{article.year}</span>
                          </div>
                        )}
                      </div>

                      {article.doi && (
                        <Badge variant="outline" className="mt-2 w-fit text-xs">
                          DOI: {article.doi}
                        </Badge>
                      )}
                    </CardHeader>

                    <CardContent>
                      <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
                        {article.summary}
                      </p>

                      {article.url && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="gap-2"
                        >
                          <a href={article.url} target="_blank" rel="noopener noreferrer">
                            Zobrazit článek
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}

          {!loading && results && results.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                Nebyly nalezeny žádné články. Zkuste jiný dotaz.
              </p>
            </motion.div>
          )}

          {!loading && !results && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <Search className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                Zadejte hledaný výraz a začněte vyhledávat odborné články
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
