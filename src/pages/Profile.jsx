import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User,
  Settings,
  Crown,
  Calendar,
  Target,
  Save,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ProgressRing from '@/components/ui/ProgressRing';
import { calculateProgressStats } from '@/components/utils/srs';
import EducationSettings from '@/components/profile/EducationSettings';

export default function Profile() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['userProgress', user?.id],
    queryFn: () => base44.entities.UserProgress.filter({ user_id: user.id }),
    enabled: !!user?.id
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => base44.entities.Question.list()
  });

  const [settings, setSettings] = useState(null);

  React.useEffect(() => {
    if (user?.settings) {
      setSettings(user.settings);
    } else {
      setSettings({
        daily_goal: 15,
        exam_date: '',
        theme: 'light'
      });
    }
  }, [user]);

  const handleSaveSettings = async () => {
    setSaving(true);
    await base44.auth.updateMe({ settings });
    queryClient.invalidateQueries(['currentUser']);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const stats = calculateProgressStats(progress);
  const daysUntilExam = settings?.exam_date 
    ? differenceInDays(new Date(settings.exam_date), new Date())
    : null;

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-6 mb-8">
        <Avatar className="w-20 h-20">
          <AvatarFallback className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-2xl">
            {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {user?.full_name || 'Uživatel'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">{user?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            {user?.plan === 'premium' ? (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            ) : (
              <Badge variant="secondary">Free</Badge>
            )}
            <Badge variant="outline">{user?.role}</Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="stats">
        <TabsList className="mb-6">
          <TabsTrigger value="stats">Statistiky</TabsTrigger>
          <TabsTrigger value="settings">Nastavení</TabsTrigger>
          <TabsTrigger value="education">Vzdělání</TabsTrigger>
        </TabsList>

        {/* Stats tab */}
        <TabsContent value="stats">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Progress overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Celkový pokrok</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <ProgressRing progress={stats.percentage} size={160} strokeWidth={12}>
                  <div className="text-center">
                    <span className="text-4xl font-bold text-slate-900 dark:text-white">
                      {stats.percentage}%
                    </span>
                    <p className="text-sm text-slate-500">zvládnuto</p>
                  </div>
                </ProgressRing>
                <div className="grid grid-cols-3 gap-4 mt-6 w-full">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-400">{stats.new}</p>
                    <p className="text-xs text-slate-500">Nové</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-500">{stats.learning}</p>
                    <p className="text-xs text-slate-500">Učím se</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-500">{stats.mastered}</p>
                    <p className="text-xs text-slate-500">Zvládnuto</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Exam countdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Do atestace
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-8">
                {daysUntilExam !== null && daysUntilExam > 0 ? (
                  <>
                    <p className="text-5xl font-bold text-teal-600 mb-2">
                      {daysUntilExam}
                    </p>
                    <p className="text-slate-500">dní zbývá</p>
                    <p className="text-sm text-slate-400 mt-2">
                      {format(new Date(settings.exam_date), 'd. MMMM yyyy', { locale: cs })}
                    </p>
                  </>
                ) : (
                  <div>
                    <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500">Nastavte datum atestace</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Questions stats */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Přehled otázek</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{questions.length}</p>
                    <p className="text-sm text-slate-500">Celkem otázek</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{progress.length}</p>
                    <p className="text-sm text-slate-500">Zkoušených</p>
                  </div>
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                    <p className="text-3xl font-bold text-emerald-600">{stats.mastered}</p>
                    <p className="text-sm text-slate-500">Zvládnutých</p>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                    <p className="text-3xl font-bold text-amber-600">{stats.learning}</p>
                    <p className="text-sm text-slate-500">V opakování</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings tab */}
        <TabsContent value="settings">
          <div className="space-y-6">
            {/* Learning Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Studijní cíle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Daily goal */}
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Label>Denní cíl opakování</Label>
                    <span className="font-semibold text-teal-600">{settings.daily_goal} otázek</span>
                  </div>
                  <Slider
                    value={[settings.daily_goal]}
                    onValueChange={([value]) => setSettings(s => ({ ...s, daily_goal: value }))}
                    min={5}
                    max={50}
                    step={5}
                  />
                  <p className="text-xs text-slate-500">
                    Doporučujeme 15-20 otázek denně pro optimální zlepšování
                  </p>
                </div>

                {/* Exam date */}
                <div className="space-y-2">
                  <Label htmlFor="exam-date">Datum atestace</Label>
                  <Input
                    id="exam-date"
                    type="date"
                    value={settings.exam_date || ''}
                    onChange={(e) => setSettings(s => ({ ...s, exam_date: e.target.value }))}
                  />
                  {daysUntilExam !== null && daysUntilExam > 0 && (
                    <p className="text-xs text-slate-500">
                      Zbývá <span className="font-semibold text-teal-600">{daysUntilExam} dní</span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Notifikace
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications">E-mailové notifikace</Label>
                    <p className="text-xs text-slate-500">Připomínky denního opakování</p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={settings.email_notifications ?? true}
                    onCheckedChange={(checked) => setSettings(s => ({ ...s, email_notifications: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="study-reminders">Studijní připomínky</Label>
                    <p className="text-xs text-slate-500">Denní upozornění na nevyřízené otázky</p>
                  </div>
                  <Switch
                    id="study-reminders"
                    checked={settings.study_reminders ?? true}
                    onCheckedChange={(checked) => setSettings(s => ({ ...s, study_reminders: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Vzhled
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Barevné téma</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {['light', 'dark', 'auto'].map((theme) => (
                      <button
                        key={theme}
                        onClick={() => setSettings(s => ({ ...s, theme }))}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          settings.theme === theme || (!settings.theme && theme === 'light')
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-sm font-medium capitalize text-slate-900 dark:text-white">
                          {theme === 'light' ? '☀️ Světlý' : theme === 'dark' ? '🌙 Tmavý' : '🔄 Auto'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save button */}
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full bg-teal-600 hover:bg-teal-700"
              size="lg"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saved ? 'Uloženo!' : 'Uložit nastavení'}
            </Button>
          </div>
        </TabsContent>

        {/* Education tab */}
        <TabsContent value="education">
          <EducationSettings user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}