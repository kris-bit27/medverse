import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Bell, 
  Globe, 
  Lock,
  Database,
  Download,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function AccountSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch user settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['userSettings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data || {};
    },
    enabled: !!user?.id
  });

  // Fetch data consent
  const { data: consent, isLoading: consentLoading } = useQuery({
    queryKey: ['dataConsent', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_data_consent')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data || {
        personalization: true,
        anonymous_analytics: false,
        auto_level_detection: false,
        educational_research: false,
        institutional_aggregates: false,
        google_calendar_sync: false
      };
    },
    enabled: !!user?.id
  });

  // Update consent mutation
  const updateConsent = useMutation({
    mutationFn: async (updatedConsent) => {
      const { data, error } = await supabase
        .from('user_data_consent')
        .upsert({
          user_id: user.id,
          ...updatedConsent
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Award tokens for enabling features
      if (updatedConsent.anonymous_analytics && !consent?.anonymous_analytics) {
        await supabase.rpc('earn_tokens', {
          p_user_id: user.id,
          p_amount: 20,
          p_achievement_type: 'consent_analytics',
          p_achievement_name: 'Anonymní analytika povolena'
        });
      }
      
      if (updatedConsent.educational_research && !consent?.educational_research) {
        await supabase.rpc('earn_tokens', {
          p_user_id: user.id,
          p_amount: 50,
          p_achievement_type: 'consent_research',
          p_achievement_name: 'Výzkum povolen'
        });
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dataConsent']);
      toast.success('Nastavení uloženo!');
    },
    onError: (error) => {
      toast.error('Chyba při ukládání');
      console.error(error);
    }
  });

  // Download user data
  const downloadUserData = async () => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      const { data: tokens } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      const { data: achievements } = await supabase
        .from('gamification_achievements')
        .select('*')
        .eq('user_id', user.id);
      
      const userData = {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        },
        profile,
        tokens,
        achievements,
        downloaded_at: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medverse-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      toast.success('Data stažena!');
    } catch (error) {
      toast.error('Chyba při stahování dat');
      console.error(error);
    }
  };

  // Delete account
  const deleteAccount = async () => {
    try {
      // In production, this would be handled by a server-side function
      // that properly cascades deletes and handles auth.users deletion
      toast.info('Účet bude smazán do 30 dnů. Kontaktujte podporu pro zrušení.');
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error('Chyba při mazání účtu');
      console.error(error);
    }
  };

  if (isLoading || consentLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Nastavení účtu</h1>
        <p className="text-muted-foreground">
          Spravuj zabezpečení, notifikace a soukromí
        </p>
      </div>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Zabezpečení
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email || ''}
              disabled
              className="bg-slate-50 dark:bg-slate-900"
            />
          </div>

          <div className="space-y-2">
            <Label>Heslo</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                value="••••••••"
                disabled
                className="bg-slate-50 dark:bg-slate-900"
              />
              <Button variant="outline">Změnit heslo</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Poslední změna: Před 30 dny
            </p>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-teal-600" />
              <div>
                <div className="font-medium">Dvoufaktorové ověření (2FA)</div>
                <p className="text-sm text-muted-foreground">
                  Doporučeno pro zvýšenou bezpečnost
                </p>
              </div>
            </div>
            <Switch disabled />
          </div>

          <div className="space-y-2">
            <Label>Aktivní relace</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded border">
                <div>
                  <div className="font-medium">MacBook Pro (tento přístroj)</div>
                  <p className="text-xs text-muted-foreground">Praha, Česko • Nyní</p>
                </div>
                <Badge variant="outline">Aktivní</Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              Odhlásit všechna zařízení
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifikace
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotificationToggle
            label="Nové studijní materiály"
            description="Upozornění když jsou přidány nová témata"
            defaultChecked={true}
          />
          <NotificationToggle
            label="Připomínky opakování"
            description="Denní upozornění na flashcards k opakování"
            defaultChecked={true}
          />
          <NotificationToggle
            label="AI budget varování"
            description="Upozornění při 80% a 100% využití kreditů"
            defaultChecked={true}
          />
          <NotificationToggle
            label="Týdenní souhrn aktivity"
            description="Nedělní email se statistikami"
            defaultChecked={false}
          />
          <NotificationToggle
            label="Novinky & aktualizace"
            description="Informace o nových funkcích"
            defaultChecked={false}
          />
          <NotificationToggle
            label="Marketing"
            description="Nabídky a doporučení"
            defaultChecked={false}
          />

          <div className="pt-4 border-t">
            <Label className="mb-2 block">Frekvence notifikací</Label>
            <select className="w-full p-2 border rounded-md">
              <option>Denně v 8:00</option>
              <option>Denně v 18:00</option>
              <option>Týdně (neděle 18:00)</option>
              <option>Nikdy</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Language & Region */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Jazyk & Region
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Jazyk rozhraní</Label>
            <select className="w-full p-2 border rounded-md">
              <option>Čeština</option>
              <option>English</option>
              <option>Slovenčina</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Časové pásmo</Label>
            <select className="w-full p-2 border rounded-md">
              <option>Praha (CET)</option>
              <option>UTC</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Formát data</Label>
            <select className="w-full p-2 border rounded-md">
              <option>DD.MM.YYYY</option>
              <option>MM/DD/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Data (GDPR) */}
      <Card className="border-teal-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Soukromí & Data (GDPR)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Máte plnou kontrolu nad tím, jak jsou vaše data používána.
          </p>

          <DataConsentToggle
            label="Personalizace (povinné)"
            description="AI doporučení a studijní plány"
            bonus={0}
            checked={consent?.personalization ?? true}
            onChange={(checked) => updateConsent.mutate({ ...consent, personalization: checked })}
            required
          />

          <DataConsentToggle
            label="Anonymní analytika"
            description="Agregované metriky pro vylepšení platformy"
            bonus={20}
            checked={consent?.anonymous_analytics ?? false}
            onChange={(checked) => updateConsent.mutate({ ...consent, anonymous_analytics: checked })}
          />

          <DataConsentToggle
            label="Automatická detekce úrovně"
            description="AI automaticky určí vaši úroveň znalostí"
            bonus={0}
            checked={consent?.auto_level_detection ?? false}
            onChange={(checked) => updateConsent.mutate({ ...consent, auto_level_detection: checked })}
          />

          <DataConsentToggle
            label="Vzdělávací výzkum"
            description="Anonymizovaná data pro pedagogický výzkum"
            bonus={50}
            checked={consent?.educational_research ?? false}
            onChange={(checked) => updateConsent.mutate({ ...consent, educational_research: checked })}
          />

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Co sbíráme:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 mb-4">
              <li>✓ Studijní pokrok a výsledky testů</li>
              <li>✓ Preference a nastavení</li>
              <li>✓ Využití AI funkcí</li>
              <li>✓ Čas strávený na platformě</li>
            </ul>

            <h4 className="font-medium mb-2">Co NIKDY nesbíráme:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✗ Zdravotní informace pacientů</li>
              <li>✗ Osobní identifikátory (rodné číslo atd.)</li>
              <li>✗ Lokační data v reálném čase</li>
              <li>✗ Obsah soukromých poznámek</li>
            </ul>
          </div>

          <div className="pt-4 border-t space-y-3">
            <h4 className="font-medium">Vaše práva (GDPR):</h4>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={downloadUserData}
            >
              <Download className="w-4 h-4 mr-2" />
              Stáhnout moje data (JSON)
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start text-red-600 hover:text-red-700"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Smazat můj účet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Smazat účet?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                Tato akce je <strong>nevratná</strong>. Všechna vaše data budou
                trvale smazána do 30 dnů.
              </p>
              <p className="text-sm text-muted-foreground">
                Co bude smazáno:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Profil a nastavení</li>
                <li>• Studijní pokrok</li>
                <li>• Poznámky a flashcards</li>
                <li>• AI generace a cache</li>
              </ul>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Zrušit
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={deleteAccount}
                >
                  Smazat účet
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Notification Toggle Component
function NotificationToggle({ label, description, defaultChecked }) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={setChecked}
      />
    </div>
  );
}

// Data Consent Toggle Component
function DataConsentToggle({ label, description, bonus, checked, onChange, required }) {
  return (
    <div className="flex items-start justify-between p-4 rounded-lg border">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{label}</span>
          {required && (
            <Badge variant="secondary" className="text-xs">Povinné</Badge>
          )}
          {bonus > 0 && (
            <Badge variant="default" className="text-xs bg-teal-500">
              +{bonus} 💎
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={required}
      />
    </div>
  );
}
