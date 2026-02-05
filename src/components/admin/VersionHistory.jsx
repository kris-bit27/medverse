import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { History, RotateCcw, Eye, CheckCircle } from 'lucide-react';

export const VersionHistory = ({ topicId, onRestore }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewVersion, setPreviewVersion] = useState(null);

  useEffect(() => {
    if (topicId) fetchVersions();
  }, [topicId]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('topic_versions')
        .select('*')
        .eq('topic_id', topicId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error('Error fetching versions:', error);
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId) => {
    if (!confirm('Restore this version? Current content will be replaced.')) return;

    try {
      const { error } = await supabase.rpc('restore_topic_version', {
        p_version_id: versionId
      });

      if (error) throw error;

      toast.success('Version restored!');
      fetchVersions();
      if (onRestore) onRestore();
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Failed to restore version');
    }
  };

  if (loading) return <div>Loading versions...</div>;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          Version History ({versions.length})
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {versions.map((version) => (
            <Card key={version.id} className={version.is_current ? 'border-blue-500' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        Version {version.version_number}
                      </Badge>

                      {version.is_current && (
                        <Badge variant="default" className="bg-blue-100 text-blue-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Current
                        </Badge>
                      )}

                      {version.ai_model && (
                        <Badge variant="secondary">
                          {version.ai_model.includes('haiku') ? '🚀 Haiku' : '🧠 Sonnet'}
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      {new Date(version.created_at).toLocaleString('cs-CZ')}
                    </p>

                    {version.change_reason && (
                      <p className="text-sm mb-2">
                        <span className="font-medium">Reason:</span> {version.change_reason}
                      </p>
                    )}

                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {version.ai_confidence && (
                        <span>Confidence: {(version.ai_confidence * 100).toFixed(0)}%</span>
                      )}
                      {version.ai_cost && (
                        <span>Cost: ${version.ai_cost.toFixed(4)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewVersion(version)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    {!version.is_current && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleRestore(version.id)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Preview Modal */}
        {previewVersion && (
          <Dialog open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Version {previewVersion.version_number} Preview</DialogTitle>
              </DialogHeader>

              <div className="prose max-w-none">
                <h3>Full Text</h3>
                <div className="bg-gray-50 p-4 rounded">
                  {previewVersion.full_text_content || 'No content'}
                </div>

                {previewVersion.bullet_points_summary && (
                  <>
                    <h3 className="mt-4">High-Yield Points</h3>
                    <div className="bg-gray-50 p-4 rounded">
                      {previewVersion.bullet_points_summary}
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};
