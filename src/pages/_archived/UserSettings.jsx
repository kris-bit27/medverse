import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import UserAIUsageDashboard from '@/components/dashboard/UserAIUsageDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { User, Zap, Settings as SettingsIcon, Bell } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function UserSettings() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => { const { data: { user } } = await supabase.auth.getUser(); return user; }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Please sign in to view settings</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Nastavení</h1>
        <p className="text-muted-foreground">
          Spravujte svůj účet a AI usage
        </p>
      </div>

      <Tabs defaultValue="usage" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            AI Usage
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifikace
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            Preference
          </TabsTrigger>
        </TabsList>

        {/* AI Usage Tab */}
        <TabsContent value="usage">
          <UserAIUsageDashboard user={user} />
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informace o profilu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={user.email || ''} 
                  disabled 
                  className="bg-slate-50 dark:bg-slate-900"
                />
                <p className="text-xs text-muted-foreground">
                  Email nelze změnit
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Jméno</Label>
                <Input 
                  id="name" 
                  value={user.user_metadata?.name || ''} 
                  placeholder="Vaše jméno"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialty">Specializace</Label>
                <select 
                  id="specialty"
                  className="w-full p-2 border rounded-md"
                  defaultValue={user.user_metadata?.specialty || ''}
                >
                  <option value="">Vyberte specializaci</option>
                  <option value="všeobecné">Všeobecné lékařství</option>
                  <option value="interna">Interna</option>
                  <option value="chirurgie">Chirurgie</option>
                  <option value="pediatrie">Pediatrie</option>
                  <option value="gynekologie">Gynekologie</option>
                  <option value="neurologie">Neurologie</option>
                  <option value="psychiatrie">Psychiatrie</option>
                </select>
              </div>
              <Button>Uložit změny</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notifikace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label className="font-medium">Budget Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Email když dosáhnete 80% budgetu
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label className="font-medium">Týdenní souhrn</Label>
                  <p className="text-sm text-muted-foreground">
                    Týdenní přehled AI usage
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label className="font-medium">Nový obsah</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifikace o nových tématech a článcích
                  </p>
                </div>
                <Switch />
              </div>
              <Button>Uložit nastavení</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Preference</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Preferovaný model</Label>
                <select className="w-full p-2 border rounded-md">
                  <option value="auto">Auto (Doporučeno)</option>
                  <option value="opus">Claude Opus 4 (Nejvyšší kvalita, ~$0.60)</option>
                  <option value="sonnet">Claude Sonnet 4 (Vyvážený, ~$0.15)</option>
                  <option value="gemini">Gemini Flash (Zdarma)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Auto používá nejlepší model podle typu obsahu
                </p>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label className="font-medium">Auto-save koncepty</Label>
                  <p className="text-sm text-muted-foreground">
                    Automaticky uložit vygenerovaný obsah
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label className="font-medium">Cache preference</Label>
                  <p className="text-sm text-muted-foreground">
                    Použít cached výsledky když jsou dostupné (rychlejší)
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Button>Uložit preference</Button>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">
                    💡 Tipy pro úsporu
                  </h4>
                  <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Použijte Gemini pro koncepty a návrhy (zdarma)</li>
                    <li>• Sonnet pro běžný obsah (75% levnější než Opus)</li>
                    <li>• Opus jen pro finální verze důležitých témat</li>
                    <li>• Cache šetří peníze - stejný obsah = $0</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
