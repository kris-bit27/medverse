import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Calculator,
  Heart,
  Activity,
  Droplet,
  Scale,
  TrendingUp,
  BookOpen,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

export default function ClinicalCalculators() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState(null);
  const [inputs, setInputs] = useState({});
  const [results, setResults] = useState(null);

  // Fetch all calculators
  const { data: tools = [], isLoading } = useQuery({
    queryKey: ['clinicalTools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinical_tools')
        .select('*')
        .order('usage_count', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Log usage mutation
  const logUsage = useMutation({
    mutationFn: async ({ toolId, inputData, outputData }) => {
      const { error } = await supabase
        .from('tool_usage_log')
        .insert({
          user_id: user?.id,
          tool_id: toolId,
          input_data: inputData,
          output_data: outputData
        });

      if (error) throw error;

      // Increment usage count
      await supabase.rpc('increment', {
        table_name: 'clinical_tools',
        row_id: toolId,
        column_name: 'usage_count'
      });
    }
  });

  const filteredTools = tools.filter(tool => {
    const matchesCategory = selectedCategory === 'all' || tool.subcategory === selectedCategory;
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tool.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [...new Set(tools.map(t => t.subcategory).filter(Boolean))];

  const calculateResult = (tool) => {
    const inputFields = tool.input_fields || [];
    const outputFields = tool.output_fields || [];

    // Validate all required fields
    for (const field of inputFields) {
      if (field.required && !inputs[field.name]) {
        toast.error(`Vyplňte pole: ${field.label}`);
        return;
      }
    }

    let calculatedResults = {};

    // Calculator-specific logic
    if (tool.slug === 'bmi') {
      const weight = parseFloat(inputs.weight);
      const heightM = parseFloat(inputs.height) / 100;
      const bmi = weight / (heightM * heightM);
      
      let category = '';
      if (bmi < 18.5) category = 'Podváha';
      else if (bmi < 25) category = 'Normální';
      else if (bmi < 30) category = 'Nadváha';
      else category = 'Obezita';

      calculatedResults = { bmi: bmi.toFixed(1), category };
    }
    
    else if (tool.slug === 'gfr-ckd-epi') {
      const age = parseInt(inputs.age);
      const creatinine = parseFloat(inputs.creatinine);
      const isFemale = inputs.gender === 'female';
      const isBlack = inputs.race === 'black';

      // Convert creatinine from μmol/L to mg/dL
      const creatinineMgDl = creatinine / 88.4;

      // CKD-EPI formula
      const kappa = isFemale ? 0.7 : 0.9;
      const alpha = isFemale ? -0.329 : -0.411;
      const minValue = Math.min(creatinineMgDl / kappa, 1);
      const maxValue = Math.max(creatinineMgDl / kappa, 1);
      
      let gfr = 141 * Math.pow(minValue, alpha) * Math.pow(maxValue, -1.209) * Math.pow(0.993, age);
      if (isFemale) gfr *= 1.018;
      if (isBlack) gfr *= 1.159;

      let stage = '';
      if (gfr >= 90) stage = 'CKD 1 - Normální';
      else if (gfr >= 60) stage = 'CKD 2 - Mírně snížená';
      else if (gfr >= 30) stage = 'CKD 3 - Středně snížená';
      else if (gfr >= 15) stage = 'CKD 4 - Těžce snížená';
      else stage = 'CKD 5 - Selhání ledvin';

      calculatedResults = { gfr: gfr.toFixed(1), stage };
    }
    
    else if (tool.slug === 'chads2-vasc') {
      let score = 0;
      
      if (inputs.chf) score += 1;
      if (inputs.hypertension) score += 1;
      if (inputs.diabetes) score += 1;
      if (inputs.stroke) score += 2;
      if (inputs.vascular) score += 1;
      
      if (inputs.age === '65to74') score += 1;
      else if (inputs.age === 'over75') score += 2;
      
      if (inputs.gender === 'female') score += 1;

      let risk = '';
      let recommendation = '';
      
      if (score === 0) {
        risk = '0%';
        recommendation = 'Nízké riziko - aspirin nebo bez terapie';
      } else if (score === 1) {
        risk = '~1.3%';
        recommendation = 'Zvážit antikoagulaci';
      } else {
        risk = '2.2-17.4%';
        recommendation = 'Doporučena antikoagulace (warfarin/NOAC)';
      }

      calculatedResults = { score, risk, recommendation };
    }

    setResults(calculatedResults);

    // Log usage
    if (user) {
      logUsage.mutate({
        toolId: tool.id,
        inputData: inputs,
        outputData: calculatedResults
      });
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      cardiology: Heart,
      nephrology: Droplet,
      general: Activity,
      default: Calculator
    };
    return icons[category] || icons.default;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Klinické Kalkulačky</h1>
        <p className="text-muted-foreground">
          Praktické nástroje pro každodenní klinickou praxi
        </p>
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Hledat kalkulačku..."
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
        {/* Calculator List */}
        <div className="md:col-span-1 space-y-3">
          <h3 className="font-semibold">Dostupné kalkulačky ({filteredTools.length})</h3>
          
          {filteredTools.map((tool) => {
            const Icon = getCategoryIcon(tool.subcategory);
            const isSelected = selectedTool?.id === tool.id;

            return (
              <Card
                key={tool.id}
                className={`cursor-pointer transition-colors ${
                  isSelected ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
                onClick={() => {
                  setSelectedTool(tool);
                  setInputs({});
                  setResults(null);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900">
                      <Icon className="w-5 h-5 text-teal-600 dark:text-teal-300" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{tool.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {tool.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {tool.subcategory}
                        </Badge>
                        {tool.usage_count > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {tool.usage_count}× použito
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredTools.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Žádné kalkulačky nenalezeny
            </p>
          )}
        </div>

        {/* Calculator Interface */}
        <div className="md:col-span-2">
          {selectedTool ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{selectedTool.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTool.description}
                    </p>
                  </div>
                  <Badge>{selectedTool.subcategory}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Input Fields */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Vstupní data</h4>
                  
                  {(selectedTool.input_fields || []).map((field) => (
                    <div key={field.name} className="space-y-2">
                      <Label htmlFor={field.name}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>

                      {field.type === 'number' && (
                        <Input
                          id={field.name}
                          type="number"
                          min={field.min}
                          max={field.max}
                          value={inputs[field.name] || ''}
                          onChange={(e) => setInputs({ ...inputs, [field.name]: e.target.value })}
                          placeholder={`Zadejte ${field.label.toLowerCase()}`}
                        />
                      )}

                      {field.type === 'select' && (
                        <Select
                          value={inputs[field.name] || ''}
                          onValueChange={(value) => setInputs({ ...inputs, [field.name]: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Vyberte ${field.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((option) => (
                              <SelectItem
                                key={typeof option === 'string' ? option : option.value}
                                value={typeof option === 'string' ? option : option.value}
                              >
                                {typeof option === 'string' ? option : option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {field.type === 'checkbox' && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={field.name}
                            checked={inputs[field.name] || false}
                            onCheckedChange={(checked) => setInputs({ ...inputs, [field.name]: checked })}
                          />
                          <Label htmlFor={field.name} className="cursor-pointer">
                            {field.label}
                          </Label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <Button onClick={() => calculateResult(selectedTool)} className="w-full">
                  <Calculator className="w-4 h-4 mr-2" />
                  Vypočítat
                </Button>

                {/* Results */}
                {results && (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-semibold">Výsledky</h4>
                    
                    {(selectedTool.output_fields || []).map((field) => {
                      const value = results[field.name];
                      if (value === undefined) return null;

                      return (
                        <div key={field.name} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                          <p className="text-sm text-muted-foreground">{field.label}</p>
                          <p className="text-2xl font-bold">
                            {value} {field.unit || ''}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Citations */}
                {selectedTool.citations && selectedTool.citations.length > 0 && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4" />
                      <h4 className="font-semibold text-sm">Reference</h4>
                    </div>
                    <div className="space-y-1">
                      {selectedTool.citations.map((citation, idx) => (
                        <a
                          key={idx}
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-teal-600 hover:underline block"
                        >
                          {citation.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Calculator className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold mb-2">Vyberte kalkulačku</h3>
                <p className="text-muted-foreground">
                  Klikněte na kalkulačku vlevo pro začátek výpočtu
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
