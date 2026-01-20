import React from 'react';
import { Globe, Users, Crown } from 'lucide-react';
import TagPill from '@/components/ui/TagPill';

const visibilityConfig = {
  public: { label: 'Veřejné', icon: Globe, variant: 'default' },
  members_only: { label: 'Pro členy', icon: Users, variant: 'primary' },
  premium: { label: 'Premium', icon: Crown, variant: 'premium' }
};

export default function VisibilityBadge({ visibility = 'public' }) {
  const config = visibilityConfig[visibility] || visibilityConfig.public;
  const Icon = config.icon;

  return (
    <TagPill variant={config.variant} size="xs">
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </TagPill>
  );
}