import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Scissors, GraduationCap, BookOpen, Users, FileText, TrendingUp } from 'lucide-react';

export default function LogbookStats({ entries }) {
  const stats = {
    procedures: entries.filter(e => e.entry_type === 'procedure').reduce((sum, e) => sum + (e.count || 1), 0),
    internships: entries.filter(e => e.entry_type === 'internship').length,
    courses: entries.filter(e => e.entry_type === 'course').length,
    conferences: entries.filter(e => e.entry_type === 'conference').length,
    publications: entries.filter(e => e.entry_type === 'publication').length,
    verified: entries.filter(e => e.verified).length
  };

  const statItems = [
    { label: 'Výkonů', value: stats.procedures, icon: Scissors, color: 'text-blue-600 bg-blue-100' },
    { label: 'Stáží', value: stats.internships, icon: GraduationCap, color: 'text-teal-600 bg-teal-100' },
    { label: 'Kurzů', value: stats.courses, icon: BookOpen, color: 'text-green-600 bg-green-100' },
    { label: 'Konferencí', value: stats.conferences, icon: Users, color: 'text-amber-600 bg-amber-100' },
    { label: 'Publikací', value: stats.publications, icon: FileText, color: 'text-pink-600 bg-pink-100' },
    { label: 'Ověřených', value: stats.verified, icon: TrendingUp, color: 'text-teal-600 bg-teal-100' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statItems.map((item, idx) => (
        <Card key={idx}>
          <CardContent className="p-4 text-center">
            <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center mx-auto mb-2`}>
              <item.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{item.value}</p>
            <p className="text-xs text-slate-500">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}