import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Camera, 
  GraduationCap, 
  Target,
  Sparkles,
  Gift,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Constants
const EDUCATION_LEVELS = [
  { value: 'pre_kmen', label: 'Student medicíny (před kmenem)' },
  { value: 'post_kmen', label: 'Student medicíny (po kmeni)' },
  { value: 'resident', label: 'Absolvent - příprava na atestaci' },
  { value: 'attending', label: 'Atestovaný lékař' },
  { value: 'specialist', label: 'Lékař se specializací' },
  { value: 'academic', label: 'Akademik / Výzkumník' }
];

const SPECIALIZATIONS = [
  'Všeobecné lékařství',
  'Chirurgie',
  'Interna',
  'Kardiologie',
  'Neurologie',
  'Psychiatrie',
  'Pediatrie',
  'Gynekologie',
  'Onkologie',
  'Radiologie',
  'Anesteziologie',
  'Ortopedie',
  'Oftalmologie',
  'ORL',
  'Dermatologie',
  'Urologie',
  'Vědecká dráha (research)'
];

const CAREER_PATHS = [
  { value: 'clinical', label: 'Klinická praxe', icon: '🏥' },
  { value: 'research', label: 'Vědecká práce / Research', icon: '🔬' },
  { value: 'academic', label: 'Akademická dráha (výuka)', icon: '👨‍🏫' },
  { value: 'management', label: 'Medicínský management', icon: '💼' }
];

const MEDICAL_FIELDS = [
  'Kardiologie', 'Onkologie', 'Neurologie', 'Gastroenterologie',
  'Nefrologie', 'Pneumologie', 'Endokrinologie', 'Hematologie',
  'Revmatologie', 'Infektologie', 'Intenzivní medicína', 'Geriatrie',
  'Pediatrie', 'Neonatologie', 'Psychiatrie', 'Dermatologie',
  'Oftalmologie', 'ORL', 'Urologie', 'Ortopedie', 'Traumatologie',
  'Plastická chirurgie', 'Cévní chirurgie', 'Neurochirurgie',
  'Anesteziologie', 'Radiologie', 'Nukleární medicína', 'Patologie',
  'Molekulární medicína', 'Genetika', 'Farmakologie'
];

export default function MyProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data || {};
    },
    enabled: !!user?.id
  });

  // Fetch gamification progress
  const { data: achievements } = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_achievements')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Fetch subject levels
  const { data: subjectLevels } = useQuery({
    queryKey: ['subjectLevels', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_subject_levels')
        .select('*')
        .eq('user_id', user.id)
        .order('level', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (updatedData) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          ...updatedData
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Check for gamification achievements
      await checkGamificationAchievements(updatedData);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userProfile']);
      queryClient.invalidateQueries(['achievements']);
      toast.success('Profil uložen!');
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error('Chyba při ukládání profilu');
      console.error(error);
    }
  });

  // Check and award gamification achievements
  const checkGamificationAchievements = async (profileData) => {
    const achievementsToCheck = [
      {
        type: 'profile_display_name',
        condition: profileData.display_name,
        name: 'Jméno vyplněno',
        tokens: 50
      },
      {
        type: 'profile_bio',
        condition: profileData.bio && profileData.bio.length > 20,
        name: 'Bio vyplněno',
        tokens: 10
      },
      {
        type: 'profile_specialization',
        condition: profileData.current_specialization,
        name: 'Obor vybrán',
        tokens: 50
      },
      {
        type: 'profile_interests',
        condition: profileData.areas_of_interest && profileData.areas_of_interest.length >= 2,
        name: '2+ oblasti zájmu',
        tokens: 30
      },
      {
        type: 'profile_learning_preferences',
        condition: profileData.learning_pace !== 5,
        name: 'Styl učení nastaven',
        tokens: 20
      }
    ];

    for (const achievement of achievementsToCheck) {
      if (achievement.condition) {
        try {
          const { data, error } = await supabase.rpc('earn_tokens', {
            p_user_id: user.id,
            p_amount: achievement.tokens,
            p_achievement_type: achievement.type,
            p_achievement_name: achievement.name
          });
          
          if (data) {
            toast.success(`🎉 +${achievement.tokens} 💎 za "${achievement.name}"!`);
          }
        } catch (err) {
          // Achievement already earned or error
          console.log('Achievement check:', err);
        }
      }
    }
  };

  // Calculate profile completion
  const calculateCompletion = () => {
    if (!profile) return 0;
    
    const fields = [
      profile.display_name,
      profile.bio,
      profile.current_specialization,
      profile.areas_of_interest && profile.areas_of_interest.length > 0,
      profile.learning_pace !== 5
    ];
    
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };

  const completion = calculateCompletion();
  const earnedTokens = achievements?.reduce((sum, a) => sum + a.tokens_earned, 0) || 0;
  const maxTokens = 160; // 50+10+50+30+20

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Můj profil</h1>
          <p className="text-muted-foreground">
            Spravuj své informace a personalizuj AI asistenta
          </p>
        </div>
        <Button 
          onClick={() => setIsEditing(!isEditing)}
          variant={isEditing ? "outline" : "default"}
        >
          {isEditing ? 'Zrušit' : 'Upravit profil'}
        </Button>
      </div>

      {/* Gamification Progress */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl">
              <Gift className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">Získej kredity za vyplnění profilu!</h3>
                <span className="text-2xl font-bold text-purple-600">{earnedTokens} / {maxTokens} 💎</span>
              </div>
              
              <div className="w-full bg-purple-200 dark:bg-purple-900 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(earnedTokens / maxTokens) * 100}%` }}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                <AchievementBadge 
                  icon="👤"
                  label="Jméno"
                  tokens={50}
                  earned={achievements?.some(a => a.achievement_type === 'profile_display_name')}
                />
                <AchievementBadge 
                  icon="🎓"
                  label="Obor"
                  tokens={50}
                  earned={achievements?.some(a => a.achievement_type === 'profile_specialization')}
                />
                <AchievementBadge 
                  icon="🎯"
                  label="Zájmy"
                  tokens={30}
                  earned={achievements?.some(a => a.achievement_type === 'profile_interests')}
                />
                <AchievementBadge 
                  icon="⚡"
                  label="Styl učení"
                  tokens={20}
                  earned={achievements?.some(a => a.achievement_type === 'profile_learning_preferences')}
                />
                <AchievementBadge 
                  icon="📝"
                  label="Bio"
                  tokens={10}
                  earned={achievements?.some(a => a.achievement_type === 'profile_bio')}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ProfileForm 
        profile={profile}
        user={user}
        isEditing={isEditing}
        onSave={(data) => updateProfile.mutate(data)}
        isSaving={updateProfile.isPending}
      />

      {/* Auto-detected Subject Levels */}
      {subjectLevels && subjectLevels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Automaticky detekovaná úroveň
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              🤖 AI analyzuje tvou aktivitu a automaticky určí úroveň znalostí
            </p>
            
            {subjectLevels.map((subject) => (
              <div key={subject.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex-1">
                  <div className="font-medium capitalize">{subject.subject}</div>
                  <div className="text-xs text-muted-foreground">
                    Na základě: {subject.topics_studied} témat, {Math.round(subject.average_score)}% úspěšnost
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= subject.level
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {subject.level === 1 && 'Začátečník'}
                    {subject.level === 2 && 'Mírně pokročilý'}
                    {subject.level === 3 && 'Pokročilý'}
                    {subject.level === 4 && 'Velmi pokročilý'}
                    {subject.level === 5 && 'Expert'}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Achievement Badge Component
function AchievementBadge({ icon, label, tokens, earned }) {
  return (
    <div className={`
      flex flex-col items-center p-2 rounded-lg border-2 transition-all
      ${earned 
        ? 'bg-green-50 border-green-300 dark:bg-green-950/20' 
        : 'bg-slate-50 border-slate-200 dark:bg-slate-900/50 opacity-60'
      }
    `}>
      <span className="text-2xl mb-1">{earned ? '✅' : icon}</span>
      <span className="text-xs font-medium text-center">{label}</span>
      <span className="text-xs text-muted-foreground">
        {earned ? `+${tokens} 💎` : `${tokens} 💎`}
      </span>
    </div>
  );
}

// Profile Form Component (separate for clarity)
function ProfileForm({ profile, user, isEditing, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    phone: profile?.phone || '',
    education_level: profile?.education_level || '',
    year_of_study: profile?.year_of_study || '',
    faculty: profile?.faculty || '',
    institution: profile?.institution || '',
    current_specialization: profile?.current_specialization || '',
    planned_specialization: profile?.planned_specialization || '',
    career_paths: profile?.career_paths || [],
    areas_of_interest: profile?.areas_of_interest || [],
    learning_pace: profile?.learning_pace || 5,
    theory_vs_practice: profile?.theory_vs_practice || 5,
    overview_vs_deepdive: profile?.overview_vs_deepdive || 5,
    text_vs_visual: profile?.text_vs_visual || 5,
    public_profile: profile?.public_profile || false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const toggleArrayItem = (array, item) => {
    if (array.includes(item)) {
      return array.filter(i => i !== item);
    }
    return [...array, item];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Základní informace
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Jméno a příjmení</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                disabled={!isEditing}
                placeholder="Jan Novák"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-slate-50 dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio (volitelné)</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              disabled={!isEditing}
              placeholder="Student 5. ročníku se zájmem o molekulární onkologii..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Získej +10 💎 za bio (min. 20 znaků)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Education & Career */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Vzdělávání & Kariéra
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="education_level">Stupeň vzdělání</Label>
            <select
              id="education_level"
              value={formData.education_level}
              onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
              disabled={!isEditing}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Vyber...</option>
              {EDUCATION_LEVELS.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {formData.education_level === 'post_kmen' && (
            <div className="space-y-2">
              <Label htmlFor="year_of_study">Ročník</Label>
              <Input
                id="year_of_study"
                type="number"
                min="4"
                max="6"
                value={formData.year_of_study}
                onChange={(e) => setFormData({ ...formData, year_of_study: parseInt(e.target.value) })}
                disabled={!isEditing}
              />
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="institution">Instituce</Label>
              <Input
                id="institution"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                disabled={!isEditing}
                placeholder="1. LF Univerzita Karlova"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faculty">Fakulta</Label>
              <Input
                id="faculty"
                value={formData.faculty}
                onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                disabled={!isEditing}
                placeholder="1. LF UK"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_specialization">Specializace (aktuální)</Label>
            <select
              id="current_specialization"
              value={formData.current_specialization}
              onChange={(e) => setFormData({ ...formData, current_specialization: e.target.value })}
              disabled={!isEditing}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Vyber...</option>
              {SPECIALIZATIONS.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Získej +50 💎 za vybraný obor
            </p>
          </div>

          <div className="space-y-2">
            <Label>Kariérní směr (můžeš vybrat více)</Label>
            <div className="grid grid-cols-2 gap-2">
              {CAREER_PATHS.map(path => (
                <button
                  key={path.value}
                  type="button"
                  onClick={() => isEditing && setFormData({
                    ...formData,
                    career_paths: toggleArrayItem(formData.career_paths, path.value)
                  })}
                  disabled={!isEditing}
                  className={`
                    p-3 rounded-lg border-2 text-left transition-all
                    ${formData.career_paths.includes(path.value)
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                      : 'border-slate-200 hover:border-slate-300'
                    }
                    ${!isEditing && 'opacity-60 cursor-not-allowed'}
                  `}
                >
                  <span className="text-xl mr-2">{path.icon}</span>
                  <span className="text-sm font-medium">{path.label}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Oblasti zájmu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vyber min. 2 oblasti pro personalizované doporučení AI (+30 💎)
          </p>
          <div className="flex flex-wrap gap-2">
            {MEDICAL_FIELDS.map(field => (
              <button
                key={field}
                type="button"
                onClick={() => isEditing && setFormData({
                  ...formData,
                  areas_of_interest: toggleArrayItem(formData.areas_of_interest, field)
                })}
                disabled={!isEditing}
                className={`
                  px-3 py-1 rounded-full text-sm transition-all
                  ${formData.areas_of_interest.includes(field)
                    ? 'bg-teal-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'
                  }
                  ${!isEditing && 'opacity-60 cursor-not-allowed'}
                `}
              >
                {field}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Learning Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Styl učení</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <LearningSlider
            label="Rychlost učení"
            leftLabel="Pomalý"
            rightLabel="Rychlý"
            value={formData.learning_pace}
            onChange={(val) => setFormData({ ...formData, learning_pace: val })}
            disabled={!isEditing}
          />
          <LearningSlider
            label="Preference obsahu"
            leftLabel="Teorie"
            rightLabel="Praxe"
            value={formData.theory_vs_practice}
            onChange={(val) => setFormData({ ...formData, theory_vs_practice: val })}
            disabled={!isEditing}
          />
          <LearningSlider
            label="Hloubka"
            leftLabel="Rychlý přehled"
            rightLabel="Deep dive"
            value={formData.overview_vs_deepdive}
            onChange={(val) => setFormData({ ...formData, overview_vs_deepdive: val })}
            disabled={!isEditing}
          />
          <LearningSlider
            label="Formát"
            leftLabel="Text"
            rightLabel="Vizuální"
            value={formData.text_vs_visual}
            onChange={(val) => setFormData({ ...formData, text_vs_visual: val })}
            disabled={!isEditing}
          />
          <p className="text-xs text-muted-foreground">
            💡 Získej +20 💎 za nastavení stylu učení
          </p>
        </CardContent>
      </Card>

      {isEditing && (
        <div className="flex gap-3">
          <Button type="submit" className="flex-1" disabled={isSaving}>
            {isSaving ? 'Ukládám...' : 'Uložit změny'}
          </Button>
        </div>
      )}
    </form>
  );
}

// Learning Slider Component
function LearningSlider({ label, leftLabel, rightLabel, value, onChange, disabled }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground w-24 text-right">{leftLabel}</span>
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-24">{rightLabel}</span>
      </div>
    </div>
  );
}
