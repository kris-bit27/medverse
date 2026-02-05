import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Search, X, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SearchTopics = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();

    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase.rpc('search_topics', {
        search_query: query,
        limit_count: 20
      });

      if (error) throw error;

      setResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hledat témata, obory, okruhy..."
            className="pl-10 pr-10"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        <Button
          type="submit"
          disabled={loading || !query.trim()}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Hledat'
          )}
        </Button>
      </form>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Žádné výsledky pro "{query}"
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Nalezeno {results.length} témat
          </p>

          {results.map((result) => (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link
                      to={`/admin/topics/${result.id}`}
                      className="hover:underline"
                    >
                      <h3 className="font-semibold text-lg mb-2">
                        {result.title}
                      </h3>
                    </Link>

                    {result.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {result.description.substring(0, 200)}
                        {result.description.length > 200 && '...'}
                      </p>
                    )}

                    <div className="flex gap-2">
                      {result.obor_name && (
                        <Badge variant="outline">
                          {result.obor_name}
                        </Badge>
                      )}
                      {result.okruh_name && (
                        <Badge variant="secondary">
                          {result.okruh_name}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="ml-4">
                    <Badge variant="default" className="bg-blue-100 text-blue-700">
                      Rank: {(result.rank * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
