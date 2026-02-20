import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAcademyCertificates } from '@/hooks/useAcademy';
import { ACADEMY_LEVELS } from '@/lib/academy-constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Award,
  Download,
  Share2,
  ExternalLink,
  GraduationCap,
} from 'lucide-react';

function CertificateCard({ cert }) {
  const [isShared, setIsShared] = useState(cert.is_publicly_shared || false);
  const [toggling, setToggling] = useState(false);
  const levelInfo = ACADEMY_LEVELS[cert.level] || {};

  const handleToggleShare = async () => {
    setToggling(true);
    try {
      const { error } = await supabase
        .from('academy_certificates')
        .update({ is_publicly_shared: !isShared })
        .eq('id', cert.id);

      if (error) throw error;
      setIsShared(!isShared);
      toast.success(isShared ? 'Certifikát je nyní soukromý.' : 'Certifikát je nyní veřejný.');
    } catch (err) {
      console.error('Toggle share error:', err);
      toast.error('Chyba při změně sdílení.');
    } finally {
      setToggling(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!cert.pdf_storage_path) {
      toast.error('PDF není k dispozici.');
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from('certificates')
        .createSignedUrl(cert.pdf_storage_path, 300);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error('Chyba při stahování PDF.');
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center">
              <Award className="w-6 h-6 text-teal-500" />
            </div>
            <div>
              <h3 className="font-semibold">{cert.title}</h3>
              {levelInfo.labelCs && (
                <Badge
                  variant="secondary"
                  className="text-xs mt-1"
                  style={{
                    backgroundColor: `${levelInfo.color}15`,
                    color: levelInfo.color,
                  }}
                >
                  {levelInfo.icon} Level {cert.level}: {levelInfo.labelCs}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[hsl(var(--mn-muted))]">Číslo certifikátu</span>
            <p className="font-mono text-xs mt-0.5">{cert.certificate_number || '—'}</p>
          </div>
          <div>
            <span className="text-[hsl(var(--mn-muted))]">Datum vydání</span>
            <p className="mt-0.5">
              {cert.issued_at
                ? new Date(cert.issued_at).toLocaleDateString('cs-CZ')
                : '—'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleShare}
            disabled={toggling}
          >
            <Share2 className="w-4 h-4 mr-1" />
            {isShared ? 'Zrušit sdílení' : 'Sdílet veřejně'}
          </Button>

          {isShared && cert.public_slug && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const url = `${window.location.origin}/cert/${cert.public_slug}`;
                navigator.clipboard.writeText(url);
                toast.success('URL zkopírována do schránky.');
              }}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Kopírovat URL
            </Button>
          )}

          {cert.pdf_storage_path && (
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-1" />
              Stáhnout PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AcademyCertificates() {
  const { user } = useAuth();
  const { data: certificates = [], isLoading } = useAcademyCertificates(user?.id);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-teal-500" />
          Moje certifikáty
        </h1>
        <p className="text-[hsl(var(--mn-muted))] mt-1">
          Přehled získaných certifikátů z AI Academy
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Award className="w-12 h-12 mx-auto mb-3 text-[hsl(var(--mn-muted))] opacity-50" />
            <h3 className="font-semibold mb-1">Zatím nemáte žádné certifikáty</h3>
            <p className="text-sm text-[hsl(var(--mn-muted))]">
              Dokončete Level 1 pro získání prvního certifikátu.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {certificates.map((cert) => (
            <CertificateCard key={cert.id} cert={cert} />
          ))}
        </div>
      )}
    </div>
  );
}
