import MedVerseLogo from "@/components/MedVerseLogo";
import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Brain, BookOpen, RefreshCw, ArrowRight, Sparkles, Zap,
  Search, BarChart3, CheckCircle2, Layers, FileText, Stethoscope,
  Calculator, Shield,
} from 'lucide-react';

const loginUrl = `/login?redirectTo=${encodeURIComponent('/Dashboard')}`;

const stats = [
  { value: '1 468', label: 'Témat' },
  { value: '45', label: 'Oborů' },
  { value: '15 000+', label: 'Kartiček' },
  { value: '3 400+', label: 'Otázek' },
];

const features = [
  { icon: BookOpen, title: 'Studijní obsah generovaný AI', desc: 'Plný text i high-yield shrnutí pro každé téma. Strukturovaný, přehledný a neustále aktualizovaný.', accent: 'from-[hsl(var(--mn-accent))] to-[hsl(var(--mn-success))]' },
  { icon: Brain, title: 'AI Copilot pro medicínu', desc: 'Ptejte se na cokoliv z medicíny. AI analyzuje kontext a odpovídá v rámci vašeho oboru a tématu.', accent: 'from-[hsl(var(--mn-accent-2))] to-[hsl(168,60%,35%)]' },
  { icon: RefreshCw, title: 'Spaced Repetition kartičky', desc: 'Automaticky generované flashcards s inteligentním algoritmem opakování. Systém ví, co potřebujete.', accent: 'from-[hsl(var(--mn-info))] to-[hsl(217,80%,45%)]' },
  { icon: Zap, title: 'Generátor testů s vysvětlením', desc: 'MCQ testy z libovolného oboru a okruhu. Okamžité vyhodnocení s podrobným vysvětlením odpovědí.', accent: 'from-[hsl(var(--mn-warn))] to-[#f97316]' },
  { icon: Calculator, title: 'Klinické kalkulačky a algoritmy', desc: '28 skórovacích systémů, 40 lékových karet, 10 rozhodovacích stromů — vše na jednom místě.', accent: 'from-[hsl(var(--mn-danger))] to-[hsl(var(--mn-warn))]' },
  { icon: Search, title: 'Med Search s PubMed', desc: 'Hledejte napříč obsahem i v PubMed. AI zpracuje výsledky a shrne klíčové informace česky.', accent: 'from-[hsl(var(--mn-accent))] to-[hsl(var(--mn-accent-2))]' },
];

const workflow = [
  { step: '01', title: 'Vyberte obor', desc: 'Chirurgie, kardiologie, neurologie… 45 lékařských oborů.', icon: Layers },
  { step: '02', title: 'Studujte obsah', desc: 'Full-text nebo high-yield shrnutí. AI copilot vždy po ruce.', icon: FileText },
  { step: '03', title: 'Opakujte & testujte', desc: 'Flashcards + MCQ testy. Systém trackuje vaše slabá místa.', icon: RefreshCw },
  { step: '04', title: 'Sledujte pokrok', desc: 'Dashboard s přehledem mastery, studijní série a statistikami.', icon: BarChart3 },
];

const audiences = [
  { emoji: '🩺', title: 'Lékaři v přípravě', desc: 'Systematická příprava na atestační zkoušku s pokrytím všech oborů.' },
  { emoji: '🎓', title: 'Medici', desc: 'Studijní materiály pro zkoušky na lékařské fakultě a státnice.' },
  { emoji: '⚕️', title: 'Praktikující lékaři', desc: 'Rychlé refreshery, klinické kalkulačky a aktuální guidelines.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[hsl(var(--mn-bg))] text-[hsl(var(--mn-text))] overflow-hidden">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--mn-bg)/0.85)] backdrop-blur-xl border-b border-[hsl(var(--mn-border)/0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <MedVerseLogo size={36} />
            <span className="mn-serif-font font-bold text-lg">MedVerse</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm mn-ui-font">
            <a href="#features" className="text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] transition-colors">Funkce</a>
            <a href="#workflow" className="text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] transition-colors">Jak to funguje</a>
            <a href="#pricing" className="text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] transition-colors">Ceník</a>
            <Link to={createPageUrl('Demo')} className="text-[hsl(var(--mn-muted))] hover:text-[hsl(var(--mn-text))] transition-colors">Demo</Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-[hsl(var(--mn-muted))]" onClick={() => window.location.href = loginUrl}>Přihlásit se</Button>
            <Button size="sm" className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)] text-white" onClick={() => window.location.href = loginUrl}>
              Začít zdarma <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--mn-text)) 0.5px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[hsl(var(--mn-accent)/0.08)] rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface-2))] text-xs font-medium text-[hsl(var(--mn-muted))] mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--mn-success))] animate-pulse" />
              Nová generace medicínského vzdělávání
            </div>
            <h1 className="mn-serif-font text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
              Studujte medicínu<br />
              <span className="bg-gradient-to-r from-[hsl(var(--mn-accent))] to-[hsl(var(--mn-accent-2))] bg-clip-text text-transparent">chytřeji s AI</span>
            </h1>
            <p className="text-lg sm:text-xl text-[hsl(var(--mn-muted))] max-w-2xl mx-auto mb-10 leading-relaxed">
              MedVerse je AI-powered platforma pro lékaře a mediky. Strukturovaný obsah, inteligentní opakování, klinické nástroje a&nbsp;testování — vše na jednom místě.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button size="lg" className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)] text-white h-13 px-8 text-base shadow-lg shadow-[hsl(var(--mn-accent)/0.25)]" onClick={() => window.location.href = loginUrl}>
                Začít zdarma <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="h-13 px-8 text-base" asChild>
                <Link to={createPageUrl('Demo')}>Prohlédnout ukázku</Link>
              </Button>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-border))]">
            {stats.map((s, i) => (
              <div key={i} className="bg-[hsl(var(--mn-surface))] px-6 py-5 text-center">
                <p className="mn-mono-font text-2xl sm:text-3xl font-bold tracking-tight">{s.value}</p>
                <p className="mn-caption text-[hsl(var(--mn-muted))] !mb-0 mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* WHO IS IT FOR */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-5">
            {audiences.map((a, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="text-center p-6 rounded-2xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface-2))]">
                <span className="text-3xl mb-3 block">{a.emoji}</span>
                <h3 className="mn-ui-font font-semibold mb-1.5">{a.title}</h3>
                <p className="text-sm text-[hsl(var(--mn-muted))] leading-relaxed">{a.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="mn-caption text-[hsl(var(--mn-accent))] !mb-3">Funkce</p>
            <h2 className="mn-serif-font text-3xl sm:text-4xl font-bold">Vše co potřebujete ke studiu</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: i * 0.07 }}
                  className="group relative p-6 rounded-2xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface-2))] hover:bg-[hsl(var(--mn-elevated))] hover:border-[hsl(var(--mn-accent)/0.3)] transition-all duration-300">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.accent} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="mn-ui-font text-base font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-[hsl(var(--mn-muted))] leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" className="py-24 px-4 sm:px-6 bg-[hsl(var(--mn-surface)/0.3)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="mn-caption text-[hsl(var(--mn-accent))] !mb-3">Jak to funguje</p>
            <h2 className="mn-serif-font text-3xl sm:text-4xl font-bold">Od prvního otevření po zvládnutou zkoušku</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflow.map((w, i) => {
              const Icon = w.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="relative">
                  {i < workflow.length - 1 && <div className="hidden lg:block absolute top-8 left-[calc(100%_-_12px)] w-[calc(100%_-_56px)] h-px bg-gradient-to-r from-[hsl(var(--mn-border))] to-transparent z-0" />}
                  <div className="relative z-10 p-5 rounded-2xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface-2))]">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="mn-mono-font text-xs font-bold text-[hsl(var(--mn-accent))] tracking-widest">{w.step}</span>
                      <Icon className="w-4 h-4 text-[hsl(var(--mn-muted))]" />
                    </div>
                    <h3 className="mn-ui-font font-semibold mb-1.5">{w.title}</h3>
                    <p className="text-sm text-[hsl(var(--mn-muted))] leading-relaxed">{w.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="mn-caption text-[hsl(var(--mn-accent))] !mb-3">Ceník</p>
            <h2 className="mn-serif-font text-3xl sm:text-4xl font-bold">Vyberte si plán</h2>
            <p className="text-[hsl(var(--mn-muted))] mt-3 max-w-lg mx-auto">Začněte zdarma a upgradujte kdykoliv. Žádné skryté poplatky.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {/* Free */}
            <div className="p-6 rounded-2xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface-2))]">
              <h3 className="mn-ui-font font-semibold text-lg mb-1">Zdarma</h3>
              <p className="text-sm text-[hsl(var(--mn-muted))] mb-4">Pro vyzkoušení platformy</p>
              <p className="mn-mono-font text-3xl font-bold mb-6">0 Kč</p>
              <ul className="space-y-2.5 mb-6">
                {['Přístup ke všem tématům (náhledy)', '50 flashcards denně', '3 testy denně', '100 AI kreditů měsíčně', 'Základní kalkulačky'].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-[hsl(var(--mn-success))] shrink-0 mt-0.5" /><span className="text-[hsl(var(--mn-muted))]">{f}</span></li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" onClick={() => window.location.href = loginUrl}>Začít zdarma</Button>
            </div>

            {/* Premium */}
            <div className="relative p-6 rounded-2xl border-2 border-[hsl(var(--mn-accent)/0.5)] bg-[hsl(var(--mn-surface-2))]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[hsl(var(--mn-accent))] text-white text-xs font-bold mn-ui-font">NEJOBLÍBENĚJŠÍ</div>
              <h3 className="mn-ui-font font-semibold text-lg mb-1">Premium</h3>
              <p className="text-sm text-[hsl(var(--mn-muted))] mb-4">Pro aktivní studium</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="mn-mono-font text-3xl font-bold">299 Kč</span>
                <span className="text-sm text-[hsl(var(--mn-muted))]">/měsíc</span>
              </div>
              <p className="text-xs text-[hsl(var(--mn-muted))] mb-6">nebo 2 490 Kč/rok (ušetříte 31%)</p>
              <ul className="space-y-2.5 mb-6">
                {['Plný přístup ke všemu obsahu', 'Neomezené flashcards a testy', '5 000 AI kreditů měsíčně', 'AI Copilot + diferenciální dg.', 'Všechny klinické nástroje', 'Sledování pokroku a slabých míst', 'Prioritní podpora'].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-[hsl(var(--mn-accent))] shrink-0 mt-0.5" /><span>{f}</span></li>
                ))}
              </ul>
              <Button className="w-full bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)] text-white" onClick={() => window.location.href = loginUrl}>Zkusit Premium</Button>
              <p className="text-center text-[10px] text-[hsl(var(--mn-muted))] mt-3 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" /> 30denní garance vrácení peněz
              </p>
            </div>

            {/* Pro — coming soon */}
            <div className="p-6 rounded-2xl border border-[hsl(var(--mn-border))] bg-[hsl(var(--mn-surface-2))] opacity-60 relative">
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-[hsl(var(--mn-surface))] border border-[hsl(var(--mn-border))] text-[10px] text-[hsl(var(--mn-muted))] mn-ui-font">BRZY</div>
              <h3 className="mn-ui-font font-semibold text-lg mb-1">Pro</h3>
              <p className="text-sm text-[hsl(var(--mn-muted))] mb-4">Pro power users</p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="mn-mono-font text-3xl font-bold">599 Kč</span>
                <span className="text-sm text-[hsl(var(--mn-muted))]">/měsíc</span>
              </div>
              <p className="text-xs text-[hsl(var(--mn-muted))] mb-6">nebo 4 990 Kč/rok</p>
              <ul className="space-y-2.5 mb-6">
                {['Vše z Premium', '8 000 AI tokenů měsíčně', 'Prioritní AI odpovědi', 'Export dat a výsledků', 'Týmové funkce', 'API přístup'].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-[hsl(var(--mn-muted))] shrink-0 mt-0.5" /><span className="text-[hsl(var(--mn-muted))]">{f}</span></li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" disabled>Již brzy</Button>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-24 px-4 sm:px-6 bg-[hsl(var(--mn-surface)/0.3)]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <Stethoscope className="w-5 h-5 text-[hsl(var(--mn-accent))]" />
            <span className="text-sm font-medium text-[hsl(var(--mn-muted))]">Navrženo lékaři pro lékaře</span>
          </div>
          <h2 className="mn-serif-font text-3xl sm:text-4xl font-bold mb-6">
            Komplexní pokrytí<br /><span className="text-[hsl(var(--mn-accent))]">české medicíny</span>
          </h2>
          <p className="text-lg text-[hsl(var(--mn-muted))] max-w-2xl mx-auto mb-10 leading-relaxed">
            Obsah pokrývá celé spektrum lékařských oborů — od interny přes chirurgii po specializované obory. AI generuje a aktualizuje obsah dle aktuálních guidelines a doporučení.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 max-w-xl mx-auto">
            {[{ text: '45 lékařských oborů' }, { text: '1 468 témat s AI obsahem' }, { text: 'Aktualizováno dle guidelines' }].map((item, i) => (
              <div key={i} className="flex items-center gap-2 justify-center text-sm">
                <CheckCircle2 className="w-4 h-4 text-[hsl(var(--mn-success))] shrink-0" /><span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-3xl border border-[hsl(var(--mn-accent)/0.3)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--mn-accent)/0.1)] via-transparent to-[hsl(var(--mn-accent-2)/0.05)]" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-[hsl(var(--mn-accent)/0.08)] rounded-full blur-[80px]" />
            <div className="relative p-8 sm:p-12 text-center">
              <Sparkles className="w-10 h-10 mx-auto mb-5 text-[hsl(var(--mn-accent))]" />
              <h2 className="mn-serif-font text-2xl sm:text-3xl font-bold mb-4">Začněte studovat ještě dnes</h2>
              <p className="text-[hsl(var(--mn-muted))] mb-8 max-w-lg mx-auto leading-relaxed">
                Vytvořte si účet zdarma a získejte přístup k tisícům témat, AI asistenci a klinickým nástrojům.
              </p>
              <Button size="lg" className="bg-[hsl(var(--mn-accent))] hover:bg-[hsl(var(--mn-accent)/0.85)] text-white h-13 px-8 text-base shadow-lg shadow-[hsl(var(--mn-accent)/0.25)]" onClick={() => window.location.href = loginUrl}>
                Vytvořit účet zdarma <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-xs text-[hsl(var(--mn-muted))] mt-4">Přístup odkudkoliv · 100 AI kreditů na start</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 px-4 sm:px-6 border-t border-[hsl(var(--mn-border))]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3"><MedVerseLogo size={28} /><span className="font-semibold text-sm">MedVerse</span></div>
          <div className="flex items-center gap-6 text-xs text-[hsl(var(--mn-muted))]">
            <Link to={createPageUrl('Demo')} className="hover:text-[hsl(var(--mn-text))] transition-colors">Demo</Link>
            <a href="#pricing" className="hover:text-[hsl(var(--mn-text))] transition-colors">Ceník</a>
            <a href="mailto:info@medverse.cz" className="hover:text-[hsl(var(--mn-text))] transition-colors">Kontakt</a>
          </div>
          <p className="text-xs text-[hsl(var(--mn-muted))]">© 2026 MedVerse. Všechna práva vyhrazena.</p>
        </div>
      </footer>
    </div>
  );
}
