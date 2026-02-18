import MedVerseLogo from "@/components/MedVerseLogo";
import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Brain,
  BookOpen,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Zap,
  ClipboardList,
  Search,
  BarChart3,
  CheckCircle2,
  Layers,
  FileText,
  Stethoscope,
} from 'lucide-react';

const loginUrl = `/login?redirectTo=${encodeURIComponent('/Dashboard')}`;

const stats = [
  { value: '1 468', label: 'Témat' },
  { value: '45', label: 'Oborů' },
  { value: '15 000+', label: 'Kartiček' },
  { value: '3 400+', label: 'Otázek' },
];

const features = [
  {
    icon: BookOpen,
    title: 'Strukturovaný obsah dle VP 2019',
    desc: 'Každé téma obsahuje plný text, high-yield shrnutí a je mapováno na vzdělávací program MZČR.',
    accent: 'from-[hsl(var(--mn-accent))] to-[hsl(var(--mn-success))]',
  },
  {
    icon: Brain,
    title: 'AI Copilot pro medicínu',
    desc: 'Ptejte se na cokoliv z medicíny. Claude analyzuje kontext a odpovídá přesně v rámci vašeho oboru.',
    accent: 'from-[hsl(var(--mn-accent-2))] to-[hsl(168,60%,35%)]',
  },
  {
    icon: RefreshCw,
    title: 'Spaced Repetition kartičky',
    desc: 'Automaticky generované flashcards s algoritmem opakování. Systém ví, co potřebujete zopakovat.',
    accent: 'from-[#8b5cf6] to-[#a855f7]',
  },
  {
    icon: Zap,
    title: 'Generátor testů',
    desc: 'MCQ testy z libovolného oboru a okruhu. Okamžité vyhodnocení s vysvětlením správných odpovědí.',
    accent: 'from-[hsl(var(--mn-warn))] to-[#f97316]',
  },
  {
    icon: ClipboardList,
    title: 'Logbook & VP Tracker',
    desc: 'Sledujte plnění vzdělávacího programu. Vizuální přehled splněných požadavků pro každý obor.',
    accent: 'from-[#f43f5e] to-[#ec4899]',
  },
  {
    icon: Search,
    title: 'Med Search s PubMed',
    desc: 'Hledejte napříč obsahem i v PubMed databázi. AI zpracuje výsledky a shrne klíčové informace.',
    accent: 'from-[hsl(var(--mn-accent))] to-[hsl(var(--mn-accent-2))]',
  },
];

const workflow = [
  { step: '01', title: 'Vyberte obor', desc: 'Plastická chirurgie, Kardiologie, Neurologie… 45 oborů dle MZČR.', icon: Layers },
  { step: '02', title: 'Studujte obsah', desc: 'Full-text nebo high-yield shrnutí. AI copilot vždy po ruce.', icon: FileText },
  { step: '03', title: 'Opakujte & testujte', desc: 'Flashcards + MCQ testy. Systém trackuje vaše slabá místa.', icon: RefreshCw },
  { step: '04', title: 'Sledujte pokrok', desc: 'Dashboard s přehledem mastery, VP plnění a studijní statistiky.', icon: BarChart3 },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[hsl(var(--mn-bg))] text-[hsl(var(--mn-text))] overflow-hidden">

      {/* ══════ NAV ══════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--mn-bg)/0.85)] backdrop-blur-xl border-b border-[hsl(var(--mn-border)/0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <MedVerseLogo size={36} />
            <span className="font-bold text-lg">MedVerse</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] transition-colors">Funkce</a>
            <a href="#workflow" className="text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] transition-colors">Jak to funguje</a>
            <Link to={createPageUrl('Demo')} className="text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] transition-colors">Demo</Link>
            <Link to={createPageUrl('Pricing')} className="text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] transition-colors">Ceník</Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-[hsl(var(--mn-muted))]" onClick={() => window.location.href = loginUrl}>
              Přihlásit se
            </Button>
            <Button size="sm" className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)] text-white" onClick={() => window.location.href = loginUrl}>
              Začít zdarma
            </Button>
          </div>
        </div>
      </nav>

      {/* ══════ HERO ══════ */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--mn-text)) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
        {/* Glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[hsl(var(--mn-accent)/0.08)] rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface)/0.5)] text-xs font-medium text-[hsl(var(--mn-muted))] mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--mn-success))] animate-pulse" />
              Připraveno pro atestaci 2026
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
              Připravte se na atestaci
              <br />
              <span className="bg-gradient-to-r from-[hsl(var(--mn-accent))] to-[hsl(var(--mn-accent-2))] bg-clip-text text-transparent">
                s AI na vaší straně
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-[hsl(var(--mn-muted))] max-w-2xl mx-auto mb-10 leading-relaxed">
              MedVerse kombinuje strukturovaný obsah dle vzdělávacího programu MZČR 
              s&nbsp;AI asistencí, flashcards a sledováním pokroku — vše na jednom místě.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button
                size="lg"
                className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)] text-white h-13 px-8 text-base shadow-lg shadow-[hsl(var(--mn-accent)/0.25)]"
                onClick={() => window.location.href = loginUrl}
              >
                Začít zdarma
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="h-13 px-8 text-base" asChild>
                <Link to={createPageUrl('Demo')}>Prohlédnout ukázku</Link>
              </Button>
            </div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-border))]"
          >
            {stats.map((s, i) => (
              <div key={i} className="bg-[hsl(var(--mn-surface))] px-6 py-5 text-center">
                <p className="text-2xl sm:text-3xl font-bold tracking-tight">{s.value}</p>
                <p className="text-xs text-[hsl(var(--mn-muted))] mt-1 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════ FEATURES ══════ */}
      <section id="features" className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--mn-accent))] mb-3">Funkce</p>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Vše co potřebujete pro přípravu
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: i * 0.07 }}
                  className="group relative p-6 rounded-2xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface)/0.5)] hover:bg-[hsl(var(--mn-surface))] hover:border-[hsl(var(--mn-accent)/0.3)] transition-all duration-300"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.accent} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-[hsl(var(--mn-muted))] leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════ WORKFLOW ══════ */}
      <section id="workflow" className="py-24 px-4 sm:px-6 bg-[hsl(var(--mn-surface)/0.3)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-[hsl(var(--mn-accent))] mb-3">Jak to funguje</p>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Od prvního otevření po zvládnutou atestaci
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflow.map((w, i) => {
              const Icon = w.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative"
                >
                  {i < workflow.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-[calc(100%_-_12px)] w-[calc(100%_-_56px)] h-px bg-gradient-to-r from-[hsl(var(--mn-border))] to-transparent z-0" />
                  )}
                  <div className="relative z-10 p-5 rounded-2xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface)/0.5)]">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-bold text-[hsl(var(--mn-accent))] tracking-widest">{w.step}</span>
                      <Icon className="w-4 h-4 text-[hsl(var(--mn-muted))]" />
                    </div>
                    <h3 className="font-semibold mb-1.5">{w.title}</h3>
                    <p className="text-sm text-[hsl(var(--mn-muted))] leading-relaxed">{w.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════ SOCIAL PROOF ══════ */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <Stethoscope className="w-5 h-5 text-[hsl(var(--mn-accent))]" />
            <span className="text-sm font-medium text-[hsl(var(--mn-muted))]">Navrženo lékaři pro lékaře</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Obsah dle vzdělávacího programu<br />
            <span className="text-[hsl(var(--mn-accent))]">MZČR 2019</span>
          </h2>
          <p className="text-lg text-[hsl(var(--mn-muted))] max-w-2xl mx-auto mb-10 leading-relaxed">
            Každý obor, každý okruh, každé téma je mapováno na oficiální vzdělávací program.
            AI generuje obsah, který je následně validován a strukturován pro efektivní přípravu.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 max-w-xl mx-auto">
            {[
              { icon: CheckCircle2, text: '45 lékařských oborů' },
              { icon: CheckCircle2, text: '67 atestačních okruhů' },
              { icon: CheckCircle2, text: '727 VP požadavků' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 justify-center text-sm">
                <item.icon className="w-4 h-4 text-[hsl(var(--mn-success))] shrink-0" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ CTA ══════ */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-3xl border border-[hsl(var(--mn-accent)/0.3)] overflow-hidden">
            {/* Gradient bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--mn-accent)/0.1)] via-transparent to-[hsl(var(--mn-accent-2)/0.05)]" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-[hsl(var(--mn-accent)/0.08)] rounded-full blur-[80px]" />

            <div className="relative p-8 sm:p-12 text-center">
              <Sparkles className="w-10 h-10 mx-auto mb-5 text-[hsl(var(--mn-accent))]" />
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                Začněte se připravovat ještě dnes
              </h2>
              <p className="text-[hsl(var(--mn-muted))] mb-8 max-w-lg mx-auto leading-relaxed">
                Vytvořte si účet zdarma a získejte přístup ke strukturovanému obsahu, AI asistenci a nástrojům pro přípravu na atestaci.
              </p>
              <Button
                size="lg"
                className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)] text-white h-13 px-8 text-base shadow-lg shadow-[hsl(var(--mn-accent)/0.25)]"
                onClick={() => window.location.href = loginUrl}
              >
                Vytvořit účet zdarma
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-xs text-[hsl(var(--mn-muted))] mt-4">
                Bez kreditní karty · Přístup odkudkoliv · 1 000 AI tokenů na start
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="py-10 px-4 sm:px-6 border-t border-[hsl(var(--mn-border))]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MedVerseLogo size={28} />
            <span className="font-semibold text-sm">MedVerse</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-[hsl(var(--mn-muted))]">
            <Link to={createPageUrl('Demo')} className="hover:text-[hsl(var(--mn-text))] transition-colors">Demo</Link>
            <Link to={createPageUrl('Pricing')} className="hover:text-[hsl(var(--mn-text))] transition-colors">Ceník</Link>
          </div>
          <p className="text-xs text-[hsl(var(--mn-muted))]">
            © 2026 MedVerse. Všechna práva vyhrazena.
          </p>
        </div>
      </footer>
    </div>
  );
}
