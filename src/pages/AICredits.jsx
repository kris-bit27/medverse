import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  TrendingUp, 
  Clock,
  CreditCard,
  BarChart3,
  Lightbulb,
} from 'lucide-react';

export default function AICredits() {
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) {
        setError('Nejste přihlášen');
        return;
      }

      const userId = session.user.id;

      // Get tokens
      const { data: tokensData, error: tokensError } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (tokensError && tokensError.code !== 'PGRST116') {
        console.error('Tokens error:', tokensError);
        throw tokensError;
      }

      // If no tokens, initialize
      if (!tokensData) {
        const { data: newTokens, error: insertError } = await supabase
          .from('user_tokens')
          .insert({ user_id: userId })
          .select()
          .single();
        
        if (insertError) throw insertError;
        setTokens(newTokens);
      } else {
        setTokens(tokensData);
      }

      // Get recent transactions
      const { data: transData, error: transError } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transError) {
        console.error('Transactions error:', transError);
        throw transError;
      }

      setTransactions(transData || []);

    } catch (err) {
      console.error('Error loading AI credits:', err);
      setError(err.message || 'Chyba při načítání');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[hsl(var(--mn-border))] border-t-teal-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <p className="text-red-600">Chyba: {error}</p>
            <button 
              onClick={loadData}
              className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              Zkusit znovu
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokens) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Inicializuji tokeny...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const percentageUsed = ((tokens.monthly_limit - tokens.current_tokens) / tokens.monthly_limit) * 100;
  const daysUntilReset = Math.ceil((new Date(tokens.next_reset_date) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className="container max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold mb-2">AI Kredity & Billing</h1>
        <p className="text-muted-foreground">
          Sleduj využití AI a spravuj platby
        </p>
      </div>

      {/* Current Balance */}
      <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 border-teal-200">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tento měsíc</p>
              <h2 className="text-4xl font-bold">
                {tokens.current_tokens.toLocaleString()} / {tokens.monthly_limit.toLocaleString()} 💎
              </h2>
            </div>
            <Badge 
              variant={percentageUsed > 90 ? "destructive" : percentageUsed > 70 ? "secondary" : "default"}
              className="text-lg px-3 py-1"
            >
              {percentageUsed.toFixed(0)}%
            </Badge>
          </div>

          <div className="w-full bg-teal-200 dark:bg-teal-900 rounded-full h-4 mb-4">
            <div 
              className={`h-4 rounded-full transition-all duration-500 ${
                percentageUsed > 90 
                  ? 'bg-red-500' 
                  : percentageUsed > 70 
                    ? 'bg-yellow-500' 
                    : 'bg-gradient-to-r from-teal-500 to-cyan-500'
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

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-teal-600" />
              <span className="text-sm text-muted-foreground">Celkem generací</span>
            </div>
            <p className="text-2xl font-bold">{transactions.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm text-muted-foreground">Získáno</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {tokens.total_tokens_earned?.toLocaleString() || 0} 💎
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-muted-foreground">Utraceno</span>
            </div>
            <p className="text-2xl font-bold">
              {tokens.total_tokens_used?.toLocaleString() || 0} 💎
            </p>
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
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Zatím žádná aktivita
              </p>
            ) : (
              transactions.map((transaction) => {
                const isPositive = transaction.amount > 0;
                return (
                  <div 
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-[hsl(var(--mn-surface))] dark:hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{transaction.type}</div>
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
                    <div className={`font-semibold ${isPositive ? 'text-green-600' : 'text-[hsl(var(--mn-text))]'}`}>
                      {isPositive ? '+' : ''}{transaction.amount} 💎
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Aktuální plán
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <div className="font-medium">Plán</div>
              <p className="text-2xl font-bold text-teal-600 mt-1">
                {tokens.plan_tier?.charAt(0).toUpperCase() + tokens.plan_tier?.slice(1) || 'Student'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {tokens.monthly_limit?.toLocaleString() || 1000} 💎/měsíc • {tokens.plan_price_czk || 250} Kč
              </p>
            </div>
            <button className="px-4 py-2 border rounded-lg hover:bg-[hsl(var(--mn-surface))] dark:hover:bg-slate-900 transition-colors">
              Změnit plán
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
