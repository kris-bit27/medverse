import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { SKILL_RADAR_LABELS } from '@/lib/academy-constants';

export default function SkillRadarChart({ data, size = 300 }) {
  if (!data) return null;

  const chartData = Object.entries(SKILL_RADAR_LABELS).map(([key, label]) => {
    const value = data[key];
    const isInsufficient = value === -1 || value === null || value === undefined;
    return {
      subject: isInsufficient ? `${label} (málo dat)` : label,
      value: isInsufficient ? 0 : value,
      fullMark: 100,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={size}>
      <RadarChart data={chartData}>
        <PolarGrid stroke="hsl(var(--mn-border))" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: 'hsl(var(--mn-muted))', fontSize: 11 }}
        />
        <Radar
          name="Dovednosti"
          dataKey="value"
          stroke="#14b8a6"
          fill="#14b8a6"
          fillOpacity={0.3}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
