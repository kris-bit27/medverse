import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { callApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Sparkles, Loader2, CheckCircle, XCircle, Clock, 
  Play, Square, RotateCcw, Filter
} from 'lucide-react';
import { toast } from 'sonner';

const MODE_LABELS = {
  fulltext: { label: 'Fulltext (Sonnet)', icon: '📝', color: 'bg-teal-100 text-teal-700' },
  high_yield: { label: 'High-Yield (Sonnet)', icon: '⚡', color: 'bg-yellow-100 text-yellow-700' },
  flashcards: { label: 'Flashcards (Haiku)', icon: '🃏', color: 'bg-blue-100 text-blue-700' },
  mcq: { label: 'MCQ (Sonnet)', icon: '❓', color: 'bg-green-100 text-green-700' },
};

const STATUS_BADGES = {
  pending: { label: 'Čeká', variant: 'secondary', icon: Clock },
  processing: { label: 'Generuje...', variant: 'default', icon: Loader2 },
  completed: { label: 'Hotovo', variant: 'success', icon: CheckCircle },
  failed: { label: 'Chyba', variant: 'destructive', icon: XCircle },
};

export default function BatchGenerationPanel() {
  const queryClient = useQueryClient();
  const [selectedTopics, setSelectedTopics] = useState(new Set());
  const [selectedModes, setSelectedModes] = useState(['fulltext', 'high_yield', 'flashcards']);
  const [filterObor, setFilterObor] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch topics without content
  const { data: topics = [] } = useQuery({
    queryKey: ['admin-topics-for-batch', filterObor],
    queryFn: async () => {
      let q = supabase
        .from('topics')
        .select(`
          id, title, status, owner_type,
          full_text_content, bullet_points_summary, deep_dive_content,
          obory:obor_id (id, name),
          okruhy:okruh_id (id, name)
        `)
        .eq('owner_type', 'platform')
        .order('title');

      if (filterObor !== 'all') {
        q = q.eq('obor_id', filterObor);
      }

      const { data } = await q;
      return data || [];
    },
  });

  const { data: obory = [] } = useQuery({
    queryKey: ['obory-list'],
    queryFn: async () => {
      const { data } = await supabase.from('obory').select('id, name').order('order_index');
      return data || [];
    },
  });

  // Queue status
  const { data: queueStatus } = useQuery({
    queryKey: ['batch-queue-status'],
    queryFn: async () => {
      const { data } = await supabase
        .from('batch_generation_queue')
        .select(`
          id, topic_id, modes, status, error_message, created_at, completed_at,
          topics:topic_id (title)
        `)
        .order('created_at', { ascending: false })
        .limit(30);
      return data || [];
    },
    refetchInterval: 5000, // Poll every 5s while generating
  });

  // Enqueue mutation
  const enqueueMutation = useMutation({
    mutationFn: async () => {
      const topicIds = Array.from(selectedTopics);
      return callApi('batch-generate', {
        action: 'enqueue',
        topic_ids: topicIds,
        modes: selectedModes,
      });
    },
    onSuccess: (data) => {
      toast.success(`${data.queued} témat zařazeno do fronty`);
      setSelectedTopics(new Set());
      queryClient.invalidateQueries(['batch-queue-status']);
    },
    onError: (err) => toast.error(`Chyba: ${err.message}`),
  });

  // Process mutation
  const processMutation = useMutation({
    mutationFn: async () => {
      return callApi('batch-generate', {
        action: 'process',
        limit: 3,
      });
    },
    onSuccess: (data) => {
      if (data.processed === 0) {
        toast.info('Fronta je prázdná');
      } else {
        const ok = data.results.filter((r) => r.status === 'completed').length;
        const fail = data.results.filter((r) => r.status === 'failed').length;
        toast.success(`Zpracováno: ${ok} ✅ ${fail > 0 ? `${fail} ❌` : ''}`);
      }
      queryClient.invalidateQueries(['batch-queue-status']);
      queryClient.invalidateQueries(['admin-topics-for-batch']);
    },
    onError: (err) => toast.error(`Chyba: ${err.message}`),
  });

  const toggleTopic = (id) => {
    setSelectedTopics(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllEmpty = () => {
    const empty = topics.filter(t => !t.full_text_content).map(t => t.id);
    setSelectedTopics(new Set(empty));
  };

  const toggleMode = (mode) => {
    setSelectedModes(prev =>
      prev.includes(mode) ? prev.filter(m => m !== mode) : [...prev, mode]
    );
  };

  // Stats
  const topicsWithContent = topics.filter(t => t.full_text_content).length;
  const topicsWithHighYield = topics.filter(t => t.bullet_points_summary).length;
  const pendingInQueue = (queueStatus || []).filter(q => q.status === 'pending').length;
  const processingInQueue = (queueStatus || []).filter(q => q.status === 'processing').length;

  // Filtered topics for display
  const filteredTopics = filterStatus === 'all' ? topics 
    : filterStatus === 'empty' ? topics.filter(t => !t.full_text_content)
    : filterStatus === 'has_content' ? topics.filter(t => t.full_text_content)
    : topics;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{topics.length}</div>
            <div className="text-xs text-muted-foreground">Celkem témat</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{topicsWithContent}</div>
            <div className="text-xs text-muted-foreground">S fulltextem</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{topics.length - topicsWithContent}</div>
            <div className="text-xs text-muted-foreground">Bez obsahu</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-teal-600">{pendingInQueue + processingInQueue}</div>
            <div className="text-xs text-muted-foreground">Ve frontě</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600" />
            Hromadná generace obsahu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Pipeline kroky:</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(MODE_LABELS).map(([mode, cfg]) => (
                <button
                  key={mode}
                  onClick={() => toggleMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    selectedModes.includes(mode) 
                      ? cfg.color + ' ring-2 ring-offset-1 ring-teal-400' 
                      : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
                  }`}
                >
                  <span>{cfg.icon}</span>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <Select value={filterObor} onValueChange={setFilterObor}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtr obor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny obory</SelectItem>
                {obory.map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtr stav" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechna témata</SelectItem>
                <SelectItem value="empty">Bez obsahu</SelectItem>
                <SelectItem value="has_content">S obsahem</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={selectAllEmpty}>
              <Filter className="w-4 h-4 mr-1" /> Vybrat prázdná ({topics.length - topicsWithContent})
            </Button>
          </div>

          {/* Topic list with checkboxes */}
          <div className="border rounded-lg max-h-80 overflow-y-auto divide-y">
            {filteredTopics.map(topic => (
              <label
                key={topic.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Checkbox
                  checked={selectedTopics.has(topic.id)}
                  onCheckedChange={() => toggleTopic(topic.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{topic.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {topic.obory?.name} → {topic.okruhy?.name}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {topic.full_text_content && <Badge variant="outline" className="text-[10px]">📝</Badge>}
                  {topic.bullet_points_summary && <Badge variant="outline" className="text-[10px]">⚡</Badge>}
                  {topic.deep_dive_content && <Badge variant="outline" className="text-[10px]">🔬</Badge>}
                  {!topic.full_text_content && !topic.bullet_points_summary && (
                    <Badge variant="secondary" className="text-[10px]">prázdné</Badge>
                  )}
                </div>
              </label>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">
              {selectedTopics.size} vybraných · {selectedModes.length} kroků pipeline
            </span>
            <div className="flex gap-2">
              <Button
                onClick={() => enqueueMutation.mutate()}
                disabled={selectedTopics.size === 0 || selectedModes.length === 0 || enqueueMutation.isPending}
              >
                {enqueueMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-1" />
                )}
                Zařadit do fronty ({selectedTopics.size})
              </Button>
              <Button
                variant="secondary"
                onClick={() => processMutation.mutate()}
                disabled={pendingInQueue === 0 || processMutation.isPending}
              >
                {processMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-1" />
                )}
                Spustit generaci ({pendingInQueue})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue status */}
      {queueStatus && queueStatus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Fronta generace</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {queueStatus.map(item => {
                const statusCfg = STATUS_BADGES[item.status] || STATUS_BADGES.pending;
                const StatusIcon = statusCfg.icon;
                return (
                  <div key={item.id} className="flex items-center gap-3 text-sm py-1.5">
                    <StatusIcon className={`w-4 h-4 flex-shrink-0 ${
                      item.status === 'completed' ? 'text-green-600' :
                      item.status === 'failed' ? 'text-red-600' :
                      item.status === 'processing' ? 'text-blue-600 animate-spin' :
                      'text-slate-400'
                    }`} />
                    <span className="flex-1 truncate">{item.topics?.title || item.topic_id}</span>
                    <div className="flex gap-1">
                      {item.modes?.map(m => (
                        <span key={m} className="text-[10px]">{MODE_LABELS[m]?.icon || m}</span>
                      ))}
                    </div>
                    {item.error_message && (
                      <span className="text-xs text-red-500 truncate max-w-48" title={item.error_message}>
                        {item.error_message.substring(0, 40)}...
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
