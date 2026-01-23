import React from 'react';
import {
  Heart,
  Brain,
  Bone,
  Syringe,
  Activity,
  Scale,
  Baby,
  Pill,
  Microscope,
  Radiation,
  Droplet,
  Eye,
  Ear,
  Waves,
  Dna,
  Stethoscope
} from 'lucide-react';

const iconMap = {
  heart: Heart,
  brain: Brain,
  bone: Bone,
  syringe: Syringe,
  activity: Activity,
  scale: Scale,
  baby: Baby,
  pill: Pill,
  microscope: Microscope,
  radiation: Radiation,
  droplet: Droplet,
  eye: Eye,
  ear: Ear,
  waves: Waves,
  dna: Dna,
  stethoscope: Stethoscope
};

export default function DisciplineIcon({ icon, className = "w-5 h-5" }) {
  const IconComponent = iconMap[icon] || Stethoscope;
  return <IconComponent className={className} />;
}