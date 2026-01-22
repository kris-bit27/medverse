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
  Crown,
  ExternalLink
} from 'lucide-react';

const products = [
  {
    id: 'edu',
    icon: GraduationCap,
    name: 'MedVerse EDU',
    tagline: 'Atestace & Studium',
    description: 'Komplexní platforma pro přípravu na atestace a státnice s využitím pokročilých metod učení napříč všemi medicínským obory',
    status: 'available',
    color: 'from-teal-500 to-cyan-600'
  },
  {
    id: 'clinic',
    icon: Stethoscope,
    name: 'MedVerse CLINIC',
    tagline: 'Plánování výkonů',
    description: 'Pokročilé nástroje pro předoperační plánování a vizualizaci chirurgických výkonů v klinické praxi',
    status: 'coming-soon',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'ai',
    icon: Brain,
    name: 'MedVerse AI',
    tagline: 'AI Copilot',
    description: 'Inteligentní asistent pro podporu klinického rozhodování a diagnostiky v reálném čase',
    status: 'coming-soon',
    color: 'from-purple-500 to-pink-600'
  },
  {
    id: 'atlas',
    icon: BookOpen,
    name: 'MedVerse ATLAS',
    tagline: 'Anatomie',
    description: 'Interaktivní anatomická databáze s detailní vizualizací struktur',
    status: 'coming-soon',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'lab',
    icon: BarChart3,
    name: 'MedVerse LAB',
    tagline: '3D Guides & Tisk',
    description: 'Platforma pro navrhování a výrobu personalizovaných chirurgických pomůcek pomocí 3D technologií',
    status: 'coming-soon',
    color: 'from-orange-500 to-red-600'
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
              <span className="font-bold text-xl text-slate-900 dark:text-white">MedVerse</span>
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 text-teal-700 dark:text-teal-400 text-sm font-medium mb-8 border border-teal-200 dark:border-teal-800">
              <Sparkles className="w-4 h-4" />
              Ekosystém nástrojů pro moderní medicínu
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white leading-tight mb-6">
              Vaše medicínská
              <span className="block bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                digitální platforma
              </span>
            </h1>
            
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed">
              Od studia a atestací přes plánování výkonů až po 3D tisk medicínských pomůcek. 
              Kompletní ekosystém pro studenty medicíny, rezidenty i atestované lékaře napříč všemi obory.
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

      {/* Products */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Produktové portfolio MedVerse
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Pět specializovaných modulů pokrývajících celé spektrum medicínské praxe
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, i) => {
              const Icon = product.icon;
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className={`p-6 h-full border-0 shadow-lg shadow-slate-200/50 dark:shadow-none dark:bg-slate-800/50 hover:shadow-xl transition-all group ${
                    product.status === 'available' ? 'cursor-pointer hover:scale-105' : ''
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${product.color} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      {product.status === 'available' ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          Dostupné
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Připravujeme
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                      {product.name}
                    </h3>
                    <p className="text-sm font-medium text-teal-600 dark:text-teal-400 mb-3">
                      {product.tagline}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                      {product.description}
                    </p>
                    {product.status === 'available' && (
                      <div className="mt-4 flex items-center gap-2 text-teal-600 dark:text-teal-400 text-sm font-medium group-hover:gap-3 transition-all">
                        Spustit EDU
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
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
                Začněte s MedVerse EDU a připojte se ke studentům a lékařům, kteří již využívají naše nástroje
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
            <span className="font-semibold text-slate-900 dark:text-white">MedVerse</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            © 2024 MedVerse. Všechna práva vyhrazena.
          </p>
        </div>
      </footer>
    </div>
  );
}