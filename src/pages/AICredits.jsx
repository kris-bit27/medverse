import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  TrendingUp, 
  Clock,
  Settings,
  CreditCard,
  BarChart3,
  Lightbulb,
  ChevronRight
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function AICredits({ user }) {
  // Fetch token balance
  const { data: tokens, isLoading: tokensLoading } = useQuery({
    queryKey: ['userTokens', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      // If no tokens exist, initialize them
      if (!data) {
        const { data: newTokens, error: insertError } = await supabase
          .from('user_tokens')
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return newTokens;
      }
      
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch recent transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['tokenTransactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  if (tokensLoading || transactionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const percentageUsed = ((tokens.monthly_limit - tokens.current_tokens) / tokens.monthly_limit) * 100;
  const daysUntilReset = Math.ceil((new Date(tokens.next_reset_date) - new Date()) / (1000 * 60 * 60 * 24));
  
  // Calculate usage stats from transactions
  const thisMonthTransactions = transactions.filter(t => 
    new Date(t.created_at) >= new Date(tokens.last_reset_date)
  );
  
  const spentTransactions = thisMonthTransactions.filter(t => t.amount < 0);
  const earnedTransactions = thisMonthTransactions.filter(t => t.amount > 0);
  
  const totalSpent = Math.abs(spentTransactions.reduce((sum, t) => sum + t.amount, 0));
  const totalEarned = earnedTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Model breakdown
  const premiumUsage = spentTransactions.filter(t => t.type === 'ai_premium').length;
  const standardUsage = spentTransactions.filter(t => t.type === 'ai_standard').length;
  const freeUsage = spentTransactions.filter(t => t.type === 'ai_free').length;

  const avgCostPerGeneration = spentTransactions.length > 0 
    ? totalSpent / spentTransactions.length 
    : 0;

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">AI Kredity & Billing</h1>
        <p className="text-muted-foreground">
          Sleduj využití AI a spravuj platby
        </p>
      </div>

      {/* Current Balance */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tento měsíc</p>
              <h2 className="text-4xl font-bold">
                {tokens.current_tokens.toLocaleString()} / {tokens.monthly_limit.toLocaleString()} 💎
              </h2>
            </div>
            <Badge 
              variant={percentageUsed > 90 ? "destructive" : percentageUsed > 70 ? "warning" : "default"}
              className="text-lg px-3 py-1"
            >
              {percentageUsed.toFixed(0)}%
            </Badge>
          </div>

          <div className="w-full bg-purple-200 dark:bg-purple-900 rounded-full h-4 mb-4">
            <div 
              className={`h-4 rounded-full transition-all duration-500 ${
                percentageUsed > 90 
                  ? 'bg-red-500' 
                  : percentageUsed > 70 
                    ? 'bg-yellow-500' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
              }`}
              style={{ width: `${percentageUsed}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Zbývá: <strong>{tokens.current_tokens.toLocaleString()} 💎</strong>
            </span>
            <span className="text-muted-foreground">
              Reset za: <strong>{daysUntilReset} {daysUntilReset === 1 ? 'den' : 'dny'}</strong>
            </span>
          </div>

          {percentageUsed > 90 && (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-start gap-2">
              <Lightbulb className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong className="text-red-600">Pozor!</strong> Blížíte se limitu. 
                Zvažte upgrade na vyšší plán nebo použijte Free AI model.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5" />
              Rychlé statistiky
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatItem 
              label="Celkem generací"
              value={spentTransactions.length}
              icon={<Zap className="w-4 h-4" />}
            />
            <StatItem 
              label="Průměrná cena"
              value={`${avgCostPerGeneration.toFixed(0)} 💎`}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <StatItem 
              label="Získáno (gamifikace)"
              value={`${totalEarned} 💎`}
              icon={<Lightbulb className="w-4 h-4" />}
              positive
            />
            <StatItem 
              label="Celkem utraceno"
              value={`${totalSpent} 💎`}
              icon={<CreditCard className="w-4 h-4" />}
            />
          </CardContent>
        </Card>

        {/* Model Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="w-5 h-5" />
              Breakdown podle modelu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ModelUsageBar 
              label="Premium AI (Opus)"
              uses={premiumUsage}
              cost={45}
              color="purple"
            />
            <ModelUsageBar 
              label="Standard AI (Sonnet)"
              uses={standardUsage}
              cost={22}
              color="blue"
            />
            <ModelUsageBar 
              label="Free AI (Gemini)"
              uses={freeUsage}
              cost={0}
              color="green"
            />

            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                💡 Tip: Používej Free AI pro koncepty a ušetři kredity na finální materiály
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Nedávná aktivita
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {transactions.slice(0, 10).map((transaction) => (
              <TransactionItem 
                key={transaction.id}
                transaction={transaction}
              />
            ))}
            
            {transactions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Zatím žádná aktivita
              </p>
            )}
            
            {transactions.length > 10 && (
              <Button variant="ghost" className="w-full mt-2">
                Zobrazit vše
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            AI Preference
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Preferovaný model</Label>
            <select className="w-full p-2 border rounded-md">
              <option>Auto (AI vybírá podle typu obsahu)</option>
              <option>Opus priorita (nejvyšší kvalita)</option>
              <option>Sonnet priorita (vyvážené)</option>
              <option>Gemini priorita (nejlevnější)</option>
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Vždy zobrazit náhled ceny</div>
                <p className="text-sm text-muted-foreground">
                  Před každou generací ukázat kolik bude stát
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Varování při velkých nákladech</div>
                <p className="text-sm text-muted-foreground">
                  Upozornit když generace přesáhne 50 💎
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto-cache opakovaných dotazů</div>
                <p className="text-sm text-muted-foreground">
                  Šetří kredity při podobných požadavcích
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">Chytré šetření:</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="font-medium">AI optimalizace</div>
                  <p className="text-sm text-muted-foreground">
                    Použít levnější model pro drafty
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="font-medium">Strict mode</div>
                  <p className="text-sm text-muted-foreground">
                    Blokovat nové generace při 90% budgetu
                  </p>
                </div>
                <Switch />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Platební informace
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <div className="font-medium">Aktuální plán</div>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {tokens.plan_tier.charAt(0).toUpperCase() + tokens.plan_tier.slice(1)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {tokens.monthly_limit.toLocaleString()} 💎/měsíc • {tokens.plan_price_czk} Kč
              </p>
            </div>
            <Button variant="outline">Změnit plán</Button>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Upgrade možnosti:</h4>
            
            <PlanOption
              name="Pro"
              tokens="2,500 💎"
              price="500 Kč/měsíc"
              features={[
                'Více AI generací',
                'Prioritní podpora',
                'Pokročilá analytika'
              ]}
            />
            
            <PlanOption
              name="Team"
              tokens="5,000 💎"
              price="2,000 Kč/měsíc"
              features={[
                'Sdílené kredity',
                'Team dashboard',
                'Administrace členů'
              ]}
            />

            <PlanOption
              name="Institutional"
              tokens="Custom"
              price="Kontaktujte nás"
              features={[
                'Neomezené kredity',
                'Dedikovaný support',
                'Custom integrace'
              ]}
            />
          </div>

          <div className="pt-4 border-t">
            <Button variant="ghost" className="w-full">
              Zobrazit faktury
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Usage Insights */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            AI Usage Insights (beta)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Vzorce používání:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Nejstudovanější: Kardiologie</li>
                <li>• Preferuješ: Deep Dive (70%)</li>
                <li>• Peak čas: 18:00-22:00</li>
                <li>• Průměr: {spentTransactions.length} generací/měsíc</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Doporučení:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✓ Používej Gemini pro přehledy</li>
                <li>✓ Ušetříš ~150 💎/měsíc</li>
                <li>✓ Auto-cache: ON (úspora 15%)</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Trend</div>
                <p className="text-sm text-muted-foreground">
                  Vs. minulý měsíc: +12%
                </p>
              </div>
              <div className="text-right">
                <div className="font-medium">Projekce</div>
                <p className="text-sm text-muted-foreground">
                  Konec měsíce: ~{Math.round(tokens.monthly_limit * 0.85)} 💎
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Components
function StatItem({ label, value, icon, positive }) {
  return (
    <div className="flex items-center justify-between p-2">
      <div className="flex items-center gap-2">
        <div className="text-muted-foreground">{icon}</div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className={`font-semibold ${positive ? 'text-green-600' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function ModelUsageBar({ label, uses, cost, color }) {
  const colorMap = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500'
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{uses} použití</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-2">
          <div 
            className={`${colorMap[color]} h-2 rounded-full`}
            style={{ width: uses > 0 ? `${Math.min((uses / 10) * 100, 100)}%` : '0%' }}
          />
        </div>
        <span className="text-xs text-muted-foreground w-16 text-right">
          {cost > 0 ? `${cost} 💎` : 'Free'}
        </span>
      </div>
    </div>
  );
}

function TransactionItem({ transaction }) {
  const isPositive = transaction.amount > 0;
  const modelName = {
    'ai_premium': 'Premium AI',
    'ai_standard': 'Standard AI',
    'ai_free': 'Free AI',
    'gamification': 'Gamifikace'
  }[transaction.type] || transaction.type;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
      <div className="flex-1">
        <div className="font-medium">{modelName}</div>
        <p className="text-xs text-muted-foreground">
          {new Date(transaction.created_at).toLocaleDateString('cs-CZ', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
        {transaction.description && (
          <p className="text-xs text-muted-foreground mt-1">
            {transaction.description}
          </p>
        )}
      </div>
      <div className={`font-semibold ${isPositive ? 'text-green-600' : 'text-slate-900 dark:text-slate-100'}`}>
        {isPositive ? '+' : ''}{transaction.amount} 💎
      </div>
    </div>
  );
}

function PlanOption({ name, tokens, price, features }) {
  return (
    <div className="p-4 rounded-lg border hover:border-purple-300 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h5 className="font-semibold">{name}</h5>
          <p className="text-sm text-purple-600 font-medium">{tokens}/měsíc</p>
        </div>
        <p className="text-sm text-muted-foreground">{price}</p>
      </div>
      <ul className="space-y-1 text-xs text-muted-foreground">
        {features.map((feature, i) => (
          <li key={i}>• {feature}</li>
        ))}
      </ul>
      <Button variant="outline" size="sm" className="w-full mt-3">
        Upgrade
      </Button>
    </div>
  );
}

// Missing imports
function Label({ children, ...props }) {
  return <label className="text-sm font-medium" {...props}>{children}</label>;
}

function Switch({ checked, onCheckedChange, defaultChecked, disabled, ...props }) {
  const [isChecked, setIsChecked] = React.useState(defaultChecked || checked || false);
  
  React.useEffect(() => {
    if (checked !== undefined) {
      setIsChecked(checked);
    }
  }, [checked]);

  const handleChange = () => {
    if (disabled) return;
    const newValue = !isChecked;
    setIsChecked(newValue);
    if (onCheckedChange) {
      onCheckedChange(newValue);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      onClick={handleChange}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${isChecked ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      {...props}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${isChecked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
}
