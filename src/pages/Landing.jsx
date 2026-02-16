import MedVerseLogo from "@/components/MedVerseLogo";
import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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
    tagline: 'Hlavní modul',
    description: 'Vzdělávací platforma kombinující strukturovaný obsah, inteligentní asistenci a nástroje pro hlubší pochopení medicíny.',
    status: 'available',
    color: 'from-teal-500 to-cyan-600'
  }
];

const valueProps = [
  { 
    title: 'Strukturované znalosti',
    description: 'Přehledně uspořádaný obsah napříč medicínskými obory.',
    icon: BookOpen
  },
  { 
    title: 'Inteligentní průvodce',
    description: 'Hippo pomáhá porozumět souvislostem a strukturovat myšlení.',
    icon: Brain
  },
  { 
    title: 'Flexibilní hloubka učení',
    description: 'Rychlá orientace i detailní vysvětlení podle aktuální potřeby.',
    icon: RefreshCw
  },
  { 
    title: 'Jeden systém, více scénářů',
    description: 'Studium, opakování, klinická praxe i týmové vzdělávání.',
    icon: CheckCircle2
  }
];

const systemValues = [
  {
    title: 'Kontext místo izolovaných informací',
    description: 'Informace jsou propojené do smysluplných celků.'
  },
  {
    title: 'Inteligentní průvodce, ne autorita',
    description: 'Hippo pomáhá porozumět, nikdy nenahrazuje klinické rozhodování.'
  },
  {
    title: 'Flexibilní hloubka',
    description: 'Rychlá orientace i hlubší pochopení podle potřeby.'
  },
  {
    title: 'Jeden systém, více scénářů',
    description: 'Od studia po klinickou praxi a týmové vzdělávání.'
  }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[hsl(var(--mn-bg))]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--mn-bg)/0.8)] backdrop-blur-xl border-b border-[hsl(var(--mn-border))]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <MedVerseLogo size={40} />
              <span className="font-bold text-xl text-[hsl(var(--mn-text))]">MedVerse</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <Link to={createPageUrl('Demo')} className="text-sm font-medium text-[hsl(var(--mn-muted))] hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                Demo
              </Link>
              <Link to={createPageUrl('Pricing')} className="text-sm font-medium text-[hsl(var(--mn-muted))] hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
                Ceník
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => { window.location.href = `/login?redirectTo=${encodeURIComponent(createPageUrl('Dashboard'))}`; }}>
                Přihlásit
              </Button>
              <Button 
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-500/25"
                onClick={() => { window.location.href = `/login?redirectTo=${encodeURIComponent(createPageUrl('Dashboard'))}`; }}
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
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[hsl(var(--mn-text))] leading-tight mb-6">
              Moderní vzdělávací
              <span className="block bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                platforma pro medicínu
              </span>
            </h1>
            
            <p className="text-xl text-[hsl(var(--mn-muted))] mb-10 max-w-3xl mx-auto leading-relaxed">
              MedVerse propojuje strukturované znalosti, inteligentní asistenci a praktické nástroje 
              pro studenty, lékaře i kliniky napříč medicínskými obory.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-xl shadow-teal-500/25 h-14 px-8 text-lg"
                onClick={() => { window.location.href = `/login?redirectTo=${encodeURIComponent(createPageUrl('Dashboard'))}`; }}
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
                  Prohlédnout ukázku
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Value Props */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {valueProps.map((prop, i) => {
              const Icon = prop.icon;
              return (
                <div key={i} className="text-center p-6 rounded-xl bg-[hsl(var(--mn-surface))]/50 border border-[hsl(var(--mn-border))]">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[hsl(var(--mn-text))]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[hsl(var(--mn-text))] mb-2">
                    {prop.title}
                  </h3>
                  <p className="text-xs text-[hsl(var(--mn-muted))] leading-relaxed">
                    {prop.description}
                  </p>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* System Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[hsl(var(--mn-bg))]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[hsl(var(--mn-text))] mb-4">
              Navrženo pro moderní medicínu
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {systemValues.map((value, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-xl bg-[hsl(var(--mn-surface))]/50 border border-[hsl(var(--mn-border))]"
              >
                <h3 className="text-lg font-semibold text-[hsl(var(--mn-text))] mb-2">
                  {value.title}
                </h3>
                <p className="text-[hsl(var(--mn-muted))] leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[hsl(var(--mn-surface))]/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[hsl(var(--mn-text))] mb-4">
              MedVerse EDU
            </h2>
            <p className="text-lg text-[hsl(var(--mn-muted))] max-w-2xl mx-auto">
              Hlavní modul dostupný nyní
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            {products.map((product, i) => {
              const Icon = product.icon;
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  onClick={() => { window.location.href = `/login?redirectTo=${encodeURIComponent(createPageUrl('Dashboard'))}`; }}
                >
                  <Card className="p-8 border-2 border-teal-200 dark:border-teal-800 shadow-xl hover:shadow-2xl transition-all duration-300 group relative overflow-hidden cursor-pointer">
                    <div className={`absolute inset-0 bg-gradient-to-br ${product.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-5">
                        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${product.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300`}>
                          <Icon className="w-8 h-8 text-[hsl(var(--mn-text))]" />
                        </div>
                        <motion.span 
                          className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center gap-1"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          {product.tagline}
                        </motion.span>
                      </div>
                      <h3 className="text-2xl font-bold text-[hsl(var(--mn-text))] mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-[hsl(var(--mn-muted))] leading-relaxed mb-6">
                        {product.description}
                      </p>
                      <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-base font-semibold group-hover:gap-3 transition-all">
                        Spustit MedVerse EDU
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
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
              <Sparkles className="w-12 h-12 mx-auto mb-6 text-[hsl(var(--mn-text))]" />
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Začněte pracovat s medicínskými znalostmi chytře
              </h2>
              <p className="text-lg text-teal-100 mb-6 max-w-2xl mx-auto">
                MedVerse pomáhá orientovat se v informacích, porozumět souvislostem a učit se efektivněji.
              </p>
              <Button 
                size="lg"
                className="bg-[hsl(var(--mn-surface))] text-teal-700 hover:bg-teal-50 shadow-xl h-14 px-8 text-lg mb-3"
                onClick={() => { window.location.href = `/login?redirectTo=${encodeURIComponent(createPageUrl('Dashboard'))}`; }}
              >
                Začít zdarma
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <p className="text-sm text-teal-100">
                Bez závazků. Přístup odkudkoliv.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-[hsl(var(--mn-border))]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MedVerseLogo size={32} />
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
