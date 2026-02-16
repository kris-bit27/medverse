import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Package,
  ArrowLeft,
  Share2,
  Copy,
  Trash2,
  Edit,
  Users,
  Lock,
  Clock,
  BookOpen,
  HelpCircle,
  Wrench,
  Sparkles,
  CheckCircle2,
  X
} from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import CollaborationDialog from '@/components/collaboration/CollaborationDialog';

export default function StudyPackageDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const packageId = urlParams.get('id');

  const [shareEmail, setShareEmail] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [collaborationOpen, setCollaborationOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => { const { data: { user } } = await supabase.auth.getUser(); return user; }
  });

  const { data: pkg, isLoading } = useQuery({
    queryKey: ['studyPackage', packageId],
    queryFn: () => supabase.from('study_packages').select('*').eq('id', packageId).single().then(r => r.data),
    enabled: !!packageId
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['packageQuestions', pkg?.question_ids],
    queryFn: async () => {
      if (!pkg?.question_ids?.length) return [];
      const all = await supabase.from('questions').select('*').then(r => r.data || []);
      return all.filter(q => pkg.question_ids.includes(q.id));
    },
    enabled: !!pkg?.question_ids
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['packageArticles', pkg?.article_ids],
    queryFn: async () => {
      if (!pkg?.article_ids?.length) return [];
      const all = await supabase.from('articles').select('*').then(r => r.data || []);
      return all.filter(a => pkg.article_ids.includes(a.id));
    },
    enabled: !!pkg?.article_ids
  });

  const { data: tools = [] } = useQuery({
    queryKey: ['packageTools', pkg?.tool_ids],
    queryFn: async () => {
      if (!pkg?.tool_ids?.length) return [];
      const all = await supabase.from('clinical_tools').select('*').then(r => r.data || []);
      return all.filter(t => pkg.tool_ids.includes(t.id));
    },
    enabled: !!pkg?.tool_ids
  });

  const { data: discipline } = useQuery({
    queryKey: ['discipline', pkg?.clinical_discipline_id],
    queryFn: () => supabase.from('obory').select('*').eq('id', pkg.clinical_discipline_id ).then(r => r.data || []).then(r => r[0]),
    enabled: !!pkg?.clinical_discipline_id
  });

  const deleteMutation = useMutation({
    mutationFn: () => supabase.from('study_packages').delete().eq('id', packageId),
    onSuccess: () => {
      queryClient.invalidateQueries(['myStudyPackages']);
      navigate(createPageUrl('StudyPackages'));
    }
  });

  const shareMutation = useMutation({
    mutationFn: async (email) => {
      const users = await supabase.from('user_profiles').select('*').then(r => r.data || []);
      const targetUser = users.find(u => u.email === email);
      if (!targetUser) throw new Error('Uživatel nenalezen');
      
      const sharedWith = pkg.shared_with || [];
      if (!sharedWith.includes(targetUser.id)) {
        await supabase.from('study_packages').update({
          shared_with: [...sharedWith, targetUser.id]
        }).eq('id', packageId);
      }
      return targetUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['studyPackage', packageId]);
      setShareEmail('');
      setShareDialogOpen(false);
    }
  });

  const forkMutation = useMutation({
    mutationFn: async () => {
      const forked = {
        ...pkg,
        title: `${pkg.title} (kopie)`,
        is_public: false,
        shared_with: [],
        original_package_id: pkg.id,
        is_ai_generated: false
      };
      delete forked.id;
      delete forked.created_date;
      delete forked.updated_date;
      delete forked.created_by;
      
      const newPkg = await supabase.from('study_packages').insert(forked).select().single().then(r => r.data);
      await supabase.from('study_packages').update({
        fork_count: (pkg.fork_count || 0) + 1
      }).eq('id', pkg.id);
      return newPkg;
    },
    onSuccess: (newPkg) => {
      queryClient.invalidateQueries(['myStudyPackages']);
      navigate(createPageUrl('StudyPackageDetail') + `?id=${newPkg.id}`);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="p-6 lg:p-8 text-center">
        <p className="text-[hsl(var(--mn-muted))]">Balíček nenalezen</p>
      </div>
    );
  }

  const isOwner = pkg.created_by === user?.email;
  const canEdit = isOwner;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Zpět
      </Button>

      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {pkg.is_ai_generated && (
                    <Sparkles className="w-5 h-5 text-teal-500" />
                  )}
                  <CardTitle className="text-2xl">{pkg.title}</CardTitle>
                </div>
                {pkg.description && (
                  <CardDescription className="text-base">{pkg.description}</CardDescription>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {pkg.is_public ? (
                    <Badge className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Veřejný
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Soukromý
                    </Badge>
                  )}
                  {discipline && (
                    <Badge variant="secondary">{discipline.name}</Badge>
                  )}
                  {pkg.target_audience && pkg.target_audience !== 'all' && (
                    <Badge variant="outline">{pkg.target_audience}</Badge>
                  )}
                  {pkg.tags?.map((tag, idx) => (
                    <Badge key={idx} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                {!isOwner && (
                  <Button
                    variant="outline"
                    onClick={() => forkMutation.mutate()}
                    disabled={forkMutation.isPending}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Zkopírovat
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setCollaborationOpen(true)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Spolupráce
                </Button>
                {isOwner && (
                  <>
                    <Button variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      Upravit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm text-[hsl(var(--mn-muted))]">
              {pkg.estimated_hours && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  ~{pkg.estimated_hours}h studia
                </span>
              )}
              <span className="flex items-center gap-1">
                <HelpCircle className="w-4 h-4" />
                {questions.length} otázek
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                {articles.length} článků
              </span>
              <span className="flex items-center gap-1">
                <Wrench className="w-4 h-4" />
                {tools.length} nástrojů
              </span>
              {pkg.fork_count > 0 && (
                <span className="flex items-center gap-1">
                  <Copy className="w-4 h-4" />
                  {pkg.fork_count} kopií
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content sections */}
        {questions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Otázky ({questions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {questions.map(q => (
                  <Link
                    key={q.id}
                    to={createPageUrl('QuestionDetail') + `?id=${q.id}`}
                    className="block p-3 rounded-lg border hover:bg-[hsl(var(--mn-surface))] dark:hover:bg-[hsl(var(--mn-surface-2))] transition-colors"
                  >
                    <p className="text-sm font-medium">{q.title}</p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {articles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Články ({articles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {articles.map(a => (
                  <Link
                    key={a.id}
                    to={createPageUrl('ArticleDetail') + `?id=${a.id}`}
                    className="block p-3 rounded-lg border hover:bg-[hsl(var(--mn-surface))] dark:hover:bg-[hsl(var(--mn-surface-2))] transition-colors"
                  >
                    <p className="text-sm font-medium">{a.title}</p>
                    {a.summary && (
                      <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">{a.summary}</p>
                    )}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {tools.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Nástroje ({tools.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tools.map(t => (
                  <Link
                    key={t.id}
                    to={createPageUrl('ToolDetail') + `?id=${t.id}`}
                    className="block p-3 rounded-lg border hover:bg-[hsl(var(--mn-surface))] dark:hover:bg-[hsl(var(--mn-surface-2))] transition-colors"
                  >
                    <p className="text-sm font-medium">{t.title}</p>
                    {t.description && (
                      <p className="text-xs text-[hsl(var(--mn-muted))] mt-1">{t.description}</p>
                    )}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <CollaborationDialog
        open={collaborationOpen}
        onOpenChange={setCollaborationOpen}
        entity={pkg}
        entityType="StudyPackage"
        entityId={packageId}
      />
    </div>
  );
}