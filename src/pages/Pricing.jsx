import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  Stethoscope,
  Check,
  Crown,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '0',
    period: 'navždy',
    description: 'Ideální pro vyzkoušení platformy',
    features: [
      'Přístup k veřejným otázkám',
      'Základní články',
      '3 algoritmy',
      'Denní limit 10 opakování',
      'Základní statistiky'
    ],
    cta: 'Začít zdarma',
    highlighted: false
  },
  {
    name: 'Premium',
    price: '299',
    period: '/měsíc',
    description: 'Kompletní přístup pro seriózní přípravu',
    features: [
      'Všechny otázky (500+)',
      'Všechny články a přehledy',
      'Všechny klinické algoritmy',
      'Neomezené opakování',
      'Detailní statistiky a pokrok',
      'Vlastní poznámky ke každé otázce',
      'Export poznámek',
      'Prioritní podpora'
    ],
    cta: 'Získat Premium',
    highlighted: true
  }
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[hsl(var(--mn-bg))]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--mn-bg)/0.8)] backdrop-blur-xl border-b border-[hsl(var(--mn-border))]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Landing')} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--mn-accent))] to-[hsl(var(--mn-accent-2))] flex items-center justify-center shadow-lg shadow-[hsl(var(--mn-accent)/0.2)]">
                <Stethoscope className="w-6 h-6 text-[hsl(var(--mn-text))]" />
              </div>
              <span className="font-bold text-xl text-[hsl(var(--mn-text))]">MedVerse</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <Link to={createPageUrl('Demo')} className="text-sm font-medium text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-accent))] transition-colors">
                Demo
              </Link>
              <Link to={createPageUrl('Pricing')} className="text-sm font-medium text-[hsl(var(--mn-accent))] dark:text-[hsl(var(--mn-accent))]">
                Ceník
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => { window.location.href = `/login?redirectTo=${encodeURIComponent(createPageUrl('Dashboard'))}`; }}>
                Přihlásit
              </Button>
              <Button 
                className="bg-gradient-to-r from-[hsl(var(--mn-accent))] to-[hsl(var(--mn-accent-2))] hover:opacity-90"
                onClick={() => { window.location.href = `/login?redirectTo=${encodeURIComponent(createPageUrl('Dashboard'))}`; }}
              >
                Začít
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(var(--mn-accent)/0.08)] text-[hsl(var(--mn-accent))] dark:text-[hsl(var(--mn-accent))] text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Jednoduchý ceník
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-[hsl(var(--mn-text))] mb-4">
              Vyberte si plán
            </h1>
            <p className="text-lg text-[hsl(var(--mn-muted))] max-w-xl mx-auto">
              Začněte zdarma a upgradujte až budete připraveni na plný přístup
            </p>
          </motion.div>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
              >
                <Card className={`p-8 h-full relative ${
                  plan.highlighted 
                    ? 'border-2 border-[hsl(var(--mn-accent))] shadow-xl shadow-[hsl(var(--mn-accent)/0.1)]' 
                    : 'border border-[hsl(var(--mn-border))]'
                }`}>
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[hsl(var(--mn-accent))] to-[hsl(var(--mn-accent-2))] text-white text-sm font-medium shadow-lg">
                        <Crown className="w-4 h-4" />
                        Nejoblíbenější
                      </div>
                    </div>
                  )}

                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-[hsl(var(--mn-text))] mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-[hsl(var(--mn-muted))] mb-4">
                      {plan.description}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold text-[hsl(var(--mn-text))]">
                        {plan.price}
                      </span>
                      <span className="text-lg text-[hsl(var(--mn-muted))]">
                        Kč{plan.period}
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-[hsl(var(--mn-accent))] dark:text-[hsl(var(--mn-accent))] mt-0.5 flex-shrink-0" />
                        <span className="text-[hsl(var(--mn-muted))]">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={`w-full h-12 ${
                      plan.highlighted 
                        ? 'bg-gradient-to-r from-[hsl(var(--mn-accent))] to-[hsl(var(--mn-accent-2))] hover:opacity-90 shadow-lg shadow-[hsl(var(--mn-accent)/0.25)]' 
                        : ''
                    }`}
                    variant={plan.highlighted ? 'default' : 'outline'}
                    onClick={() => { window.location.href = `/login?redirectTo=${encodeURIComponent(createPageUrl('Dashboard'))}`; }}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[hsl(var(--mn-surface))]/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-[hsl(var(--mn-text))] text-center mb-12">
            Často kladené dotazy
          </h2>
          
          <div className="space-y-6">
            {[
              {
                q: 'Mohu změnit plán kdykoliv?',
                a: 'Ano, plán můžete změnit kdykoliv. Při upgradu platíte pouze rozdíl, při downgradu dostanete kredit na další období.'
              },
              {
                q: 'Je Free plán opravdu zdarma?',
                a: 'Ano, Free plán je a vždy bude zdarma. Obsahuje základní funkce pro vyzkoušení platformy.'
              },
              {
                q: 'Jak funguje spaced repetition?',
                a: 'Systém automaticky plánuje opakování otázek na základě vaší výkonnosti. Otázky, které neznáte, se zobrazují častěji.'
              },
              {
                q: 'Mohu exportovat své poznámky?',
                a: 'V Premium plánu můžete exportovat všechny své poznámky do PDF nebo Markdown formátu.'
              }
            ].map((faq, i) => (
              <Card key={i} className="p-6">
                <h3 className="text-lg font-semibold text-[hsl(var(--mn-text))] mb-2">
                  {faq.q}
                </h3>
                <p className="text-[hsl(var(--mn-muted))]">
                  {faq.a}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-[hsl(var(--mn-border))]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(var(--mn-accent))] to-[hsl(var(--mn-accent-2))] flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-[hsl(var(--mn-text))]" />
            </div>
            <span className="font-semibold text-[hsl(var(--mn-text))]">MedVerse</span>
          </div>
          <p className="text-sm text-[hsl(var(--mn-muted))]">
            © 2024 MedVerse. Všechna práva vyhrazena.
          </p>
        </div>
      </footer>
    </div>
  );
}
