import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  Stethoscope,
  GraduationCap,
  Brain,
  BookOpen,
  RefreshCw,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Crown
} from 'lucide-react';

const features = [
  {
    icon: GraduationCap,
    title: 'Atestace & Státnice',
    description: 'Strukturované otázky podle okruhů s ověřenými odpověďmi napříč všemi chirurgickými obory'
  },
  {
    icon: Brain,
    title: 'Spaced Repetition',
    description: 'Inteligentní opakování pro dlouhodobé zapamatování'
  },
  {
    icon: BookOpen,
    title: 'Klinické články',
    description: 'Aktuální přehledy a doporučené postupy'
  },
  {
    icon: Stethoscope,
    title: 'Rozhodovací algoritmy',
    description: 'Interaktivní nástroje pro klinickou praxi'
  },
  {
    icon: BarChart3,
    title: 'Sledování pokroku',
    description: 'Detailní statistiky a přehled vašeho učení'
  },
  {
    icon: RefreshCw,
    title: 'Denní opakování',
    description: 'Personalizovaný plán pro efektivní přípravu'
  }
];

const stats = [
  { value: '500+', label: 'Otázek' },
  { value: '50+', label: 'Článků' },
  { value: '15+', label: 'Algoritmů' },
  { value: '98%', label: 'Spokojenost' }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900 dark:text-white">MedNexus</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <Link to={createPageUrl('Demo')} className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                Demo
              </Link>
              <Link to={createPageUrl('Pricing')} className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                Ceník
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => base44.auth.redirectToLogin()}>
                Přihlásit
              </Button>
              <Button 
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-500/25"
                onClick={() => base44.auth.redirectToLogin()}
              >
                Začít zdarma
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              Nová generace medicínského vzdělávání
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white leading-tight mb-6">
              Připravte se na
              <span className="block bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                atestaci efektivně
              </span>
            </h1>
            
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Platforma pro studenty medicíny, rezidenty a atestované lékaře. 
              Strukturované otázky, klinické algoritmy a spaced repetition pro dlouhodobé znalosti napříč všemi obory.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-xl shadow-teal-500/25 h-14 px-8 text-lg"
                onClick={() => base44.auth.redirectToLogin()}
              >
                Začít zdarma
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="h-14 px-8 text-lg"
                asChild
              >
                <Link to={createPageUrl('Demo')}>
                  Prohlédnout demo
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-600 dark:text-slate-400 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Vše pro vaši přípravu
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Komplexní nástroje pro studenty před státnicemi, rezidenty i atestované lékaře
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="p-6 h-full border-0 shadow-lg shadow-slate-200/50 dark:shadow-none dark:bg-slate-800/50 hover:shadow-xl transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {feature.description}
                    </p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 sm:p-12 bg-gradient-to-br from-teal-600 to-cyan-700 border-0 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMCAwaDIwdjIwSDB6Ii8+PHBhdGggZD0iTTIwIDIwaDIwdjIwSDIweiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
            <div className="relative">
              <Crown className="w-12 h-12 mx-auto mb-6 text-amber-300" />
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Připraveni začít?
              </h2>
              <p className="text-lg text-teal-100 mb-8 max-w-xl mx-auto">
                Připojte se ke studentům a lékařům, kteří se připravují na zkoušky a atestace s MedNexus
              </p>
              <Button 
                size="lg"
                className="bg-white text-teal-700 hover:bg-teal-50 shadow-xl h-14 px-8 text-lg"
                onClick={() => base44.auth.redirectToLogin()}
              >
                Začít zdarma
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900 dark:text-white">MedNexus</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            © 2024 MedNexus. Všechna práva vyhrazena.
          </p>
        </div>
      </footer>
    </div>
  );
}