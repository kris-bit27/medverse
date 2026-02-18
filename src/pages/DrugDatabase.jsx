import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Pill,
  Search,
  AlertTriangle,
  Info,
  Activity,
  FileText
} from 'lucide-react';

export default function DrugDatabase() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDrug, setSelectedDrug] = useState(null);

  // Fetch all drugs
  const { data: drugs = [], isLoading } = useQuery({
    queryKey: ['drugs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drugs')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  const filteredDrugs = drugs.filter(drug => {
    const matchesCategory = selectedCategory === 'all' || drug.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      drug.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drug.generic_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drug.brand_names?.some(b => b.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categories = [...new Set(drugs.map(d => d.category).filter(Boolean))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[hsl(var(--mn-accent))] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold mb-2">Databáze Léků</h1>
        <p className="text-muted-foreground">
          Rychlá reference k nejčastěji používaným lékům
        </p>
      </div>

      {/* Search & Filter */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Hledat lék (název, generikum, brand)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Všechny kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny kategorie</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Drug List */}
        <div className="md:col-span-1 space-y-3">
          <h3 className="font-semibold">Léky ({filteredDrugs.length})</h3>
          
          <div className="space-y-2 max-h-[700px] overflow-y-auto">
            {filteredDrugs.map((drug) => {
              const isSelected = selectedDrug?.id === drug.id;

              return (
                <Card
                  key={drug.id}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'border-[hsl(var(--mn-accent))] bg-[hsl(var(--mn-accent)/0.06)]' : 'hover:bg-[hsl(var(--mn-surface))] dark:hover:bg-[hsl(var(--mn-surface))]'
                  }`}
                  onClick={() => setSelectedDrug(drug)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Pill className="w-5 h-5 text-[hsl(var(--mn-accent))] mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">{drug.name}</p>
                        {drug.generic_name && (
                          <p className="text-xs text-muted-foreground">
                            {drug.generic_name}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {drug.category}
                          </Badge>
                          {drug.atc_code && (
                            <span className="text-xs text-muted-foreground">
                              {drug.atc_code}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredDrugs.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Žádné léky nenalezeny
            </p>
          )}
        </div>

        {/* Drug Detail */}
        <div className="md:col-span-2">
          {selectedDrug ? (
            <div className="space-y-6">
              {/* Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl mb-2">{selectedDrug.name}</CardTitle>
                      {selectedDrug.generic_name && (
                        <p className="text-muted-foreground">
                          Generický název: {selectedDrug.generic_name}
                        </p>
                      )}
                    </div>
                    <Badge>{selectedDrug.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Brand Names */}
                  {selectedDrug.brand_names && selectedDrug.brand_names.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Obchodní názvy</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedDrug.brand_names.map((brand, idx) => (
                          <Badge key={idx} variant="secondary">{brand}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ATC Code */}
                  {selectedDrug.atc_code && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">ATC kód</h4>
                      <p className="text-sm font-mono">{selectedDrug.atc_code}</p>
                    </div>
                  )}

                  {/* Pregnancy Category */}
                  {selectedDrug.pregnancy_category && (
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Kategorie v těhotenství</h4>
                      <Badge variant="outline">{selectedDrug.pregnancy_category}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Indication */}
              {selectedDrug.indication && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Info className="w-5 h-5" />
                      Indikace
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedDrug.indication}</p>
                  </CardContent>
                </Card>
              )}

              {/* Dosage */}
              {selectedDrug.dosage && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Activity className="w-5 h-5" />
                      Dávkování
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(selectedDrug.dosage).map(([key, value]) => (
                      <div key={key} className="p-3 rounded-lg bg-[hsl(var(--mn-surface))]">
                        <p className="font-semibold text-sm capitalize mb-1">{key}</p>
                        <p className="text-sm">{value}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Side Effects */}
              {selectedDrug.side_effects && selectedDrug.side_effects.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      Nežádoucí účinky
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedDrug.side_effects.map((effect, idx) => (
                        <li key={idx} className="text-sm">{effect}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Contraindications */}
              {selectedDrug.contraindications && (
                <Card className="border-[hsl(var(--mn-danger)/0.3)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-[hsl(var(--mn-danger))]">
                      <AlertTriangle className="w-5 h-5" />
                      Kontraindikace
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedDrug.contraindications}</p>
                  </CardContent>
                </Card>
              )}

              {/* Interactions */}
              {selectedDrug.interactions && selectedDrug.interactions.length > 0 && (
                <Card className="border-[hsl(var(--mn-warn)/0.3)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-[hsl(var(--mn-warn))]">
                      <AlertTriangle className="w-5 h-5" />
                      Lékové interakce
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedDrug.interactions.map((interaction, idx) => (
                        <li key={idx} className="text-sm">{interaction}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Warnings */}
              {selectedDrug.warnings && (
                <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      Varování
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedDrug.warnings}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Pill className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold mb-2">Vyberte lék</h3>
                <p className="text-muted-foreground">
                  Klikněte na lék vlevo pro zobrazení detailů
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
