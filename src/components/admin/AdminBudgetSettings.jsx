import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminBudgetSettings() {
  const [settings, setSettings] = useState({
    budgetEnabled: false,
    monthlyBudget: 10,
    warningThreshold: 75,
    emailAlerts: true,
    gracePeriod: false
  });

  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    // In real implementation, save to Vercel env vars or database
    console.log('Saving budget settings:', settings);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSaved(true);
    toast.success('Budget settings saved successfully');
    
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold">Budget & Cost Control</h2>
        <p className="text-muted-foreground">
          Configure AI usage budgets and cost limits
        </p>
      </div>

      {/* Main Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Budget Limits</CardTitle>
          <CardDescription>
            Set maximum AI spending per user per month
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-slate-50 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <Label className="text-base font-semibold">
                  Enable Budget Limits
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Enforce monthly spending caps per user
                </p>
              </div>
            </div>
            <Switch
              checked={settings.budgetEnabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, budgetEnabled: checked }))
              }
            />
          </div>

          {settings.budgetEnabled && (
            <>
              {/* Monthly Budget Amount */}
              <div className="space-y-2">
                <Label htmlFor="monthlyBudget">
                  Monthly Budget per User (USD)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="monthlyBudget"
                    type="number"
                    min="1"
                    step="1"
                    value={settings.monthlyBudget}
                    onChange={(e) => 
                      setSettings(prev => ({ 
                        ...prev, 
                        monthlyBudget: parseFloat(e.target.value) || 10 
                      }))
                    }
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Users will be blocked from generating content after exceeding this amount
                </p>
              </div>

              {/* Warning Threshold */}
              <div className="space-y-2">
                <Label htmlFor="warningThreshold">
                  Warning Threshold (%)
                </Label>
                <Input
                  id="warningThreshold"
                  type="number"
                  min="50"
                  max="95"
                  step="5"
                  value={settings.warningThreshold}
                  onChange={(e) => 
                    setSettings(prev => ({ 
                      ...prev, 
                      warningThreshold: parseFloat(e.target.value) || 75 
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Show warning when user reaches this percentage of their budget
                </p>
              </div>

              {/* Email Alerts */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label>Email Alerts</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Notify users when they reach 80% and 100% of budget
                  </p>
                </div>
                <Switch
                  checked={settings.emailAlerts}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, emailAlerts: checked }))
                  }
                />
              </div>

              {/* Grace Period */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label>Grace Period</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Allow 1 additional request after budget is exceeded
                  </p>
                </div>
                <Switch
                  checked={settings.gracePeriod}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, gracePeriod: checked }))
                  }
                />
              </div>
            </>
          )}

          {/* Save Button */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={handleSave}
              className="flex-1"
              disabled={saved}
            >
              {saved ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={() => setSettings({
                budgetEnabled: false,
                monthlyBudget: 10,
                warningThreshold: 75,
                emailAlerts: true,
                gracePeriod: false
              })}
            >
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview/Impact */}
      <Card>
        <CardHeader>
          <CardTitle>Impact Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg border">
              <div className="text-xs text-muted-foreground mb-1">
                Monthly budget
              </div>
              <div className="text-2xl font-bold">
                ${settings.monthlyBudget}
              </div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-xs text-muted-foreground mb-1">
                Warning at
              </div>
              <div className="text-2xl font-bold">
                ${(settings.monthlyBudget * settings.warningThreshold / 100).toFixed(2)}
              </div>
            </div>
          </div>

          <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Example:</strong> With a ${settings.monthlyBudget} budget:
              <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                <li>~{Math.floor(settings.monthlyBudget / 0.6)} Opus 4 requests (avg $0.60 each)</li>
                <li>~{Math.floor(settings.monthlyBudget / 0.15)} Sonnet 4 requests (avg $0.15 each)</li>
                <li>Unlimited Gemini requests (free)</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Implementation Instructions */}
      <Card className="bg-slate-50 dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-base">📝 Implementation Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>
            To activate these settings in production:
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Add <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">ENABLE_BUDGET_LIMIT=true</code> to Vercel env vars</li>
            <li>Add <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">MONTHLY_BUDGET_USD={settings.monthlyBudget}</code></li>
            <li>Redeploy the application</li>
            <li>Monitor usage in Admin Analytics</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
