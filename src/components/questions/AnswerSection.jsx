import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { BookOpen, ListChecks, Lightbulb, AlertTriangle, Stethoscope } from 'lucide-react';

const sectionConfig = {
  definice: { 
    label: 'Definice', 
    icon: BookOpen,
    color: 'bg-[hsl(var(--mn-accent-2)/0.06)] border-[hsl(var(--mn-accent-2)/0.3)]'
  },
  diagnostika: { 
    label: 'Diagnostika', 
    icon: Stethoscope,
    color: 'bg-[hsl(var(--mn-accent)/0.08)] border-[hsl(var(--mn-accent)/0.2)] dark:border-[hsl(var(--mn-accent)/0.3)]'
  },
  lecba: { 
    label: 'Léčba', 
    icon: ListChecks,
    color: 'bg-[hsl(var(--mn-success)/0.06)] border-[hsl(var(--mn-success)/0.3)]'
  },
  komplikace: { 
    label: 'Komplikace', 
    icon: AlertTriangle,
    color: 'bg-[hsl(var(--mn-warn)/0.06)] border-[hsl(var(--mn-warn)/0.2)]'
  },
  pearls: { 
    label: 'Klinické perly', 
    icon: Lightbulb,
    color: 'bg-[hsl(var(--mn-accent)/0.08)] border-[hsl(var(--mn-accent)/0.2)] dark:border-[hsl(var(--mn-accent)/0.3)]'
  }
};

export default function AnswerSection({ 
  answerRich, 
  answerStructured,
  refs = [],
  images = []
}) {
  const hasStructured = answerStructured && Object.keys(answerStructured).some(k => answerStructured[k]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Odpověď</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={hasStructured ? 'structured' : 'rich'}>
          <TabsList className="mb-4">
            {hasStructured && <TabsTrigger value="structured">Strukturovaná</TabsTrigger>}
            {answerRich && <TabsTrigger value="rich">Plná odpověď</TabsTrigger>}
          </TabsList>

          {hasStructured && (
            <TabsContent value="structured" className="space-y-4">
              {Object.entries(answerStructured).map(([key, value]) => {
                if (!value) return null;
                const config = sectionConfig[key];
                if (!config) return null;
                const Icon = config.icon;

                return (
                  <div 
                    key={key} 
                    className={`p-4 rounded-lg border ${config.color}`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-4 h-4" />
                      <h4 className="font-semibold">{config.label}</h4>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{value}</ReactMarkdown>
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          )}

          {answerRich && (
            <TabsContent value="rich">
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown>{answerRich}</ReactMarkdown>
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Images */}
        {images && images.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold text-[hsl(var(--mn-text))] mb-3">Obrázky</h4>
            <div className="grid grid-cols-2 gap-4">
              {images.map((img, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden">
                  <img 
                    src={img.url} 
                    alt={img.caption || `Obrázek ${i + 1}`}
                    className="w-full h-48 object-cover"
                  />
                  {img.caption && (
                    <p className="text-xs text-[hsl(var(--mn-muted))] mt-1 text-center">
                      {img.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* References */}
        {refs && refs.length > 0 && (
          <div className="mt-6 pt-6 border-t dark:border-[hsl(var(--mn-border))]">
            <h4 className="font-semibold text-[hsl(var(--mn-text))] mb-3">Reference</h4>
            <ul className="space-y-2">
              {refs.map((ref, i) => (
                <li key={i}>
                  <a 
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[hsl(var(--mn-accent))] dark:text-[hsl(var(--mn-accent))] hover:underline"
                  >
                    {ref.label || ref.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}