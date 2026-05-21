'use client';

import { useMemo } from 'react';
import type { Course } from '@/lib/types';

function dept(code: string): string {
  return code.split(' ')[0] ?? code;
}

function barColor(gpa: number): string {
  if (gpa >= 3.7) return '#22c55e';
  if (gpa >= 3.0) return '#60a5fa';
  if (gpa >= 2.0) return '#fbbf24';
  return '#ef4444';
}

function gpaColor(gpa: number): string {
  if (gpa >= 3.7) return 'text-green-400';
  if (gpa >= 3.0) return 'text-blue-400';
  if (gpa >= 2.0) return 'text-yellow-400';
  return 'text-red-400';
}

export default function DeptBreakdown({ courses }: { courses: Course[] }) {
  const depts = useMemo(() => {
    const map = new Map<string, { units: number; qp: number; count: number }>();
    for (const c of courses) {
      if (!c.countsTowardGPA) continue;
      const d = dept(c.code);
      const prev = map.get(d) ?? { units: 0, qp: 0, count: 0 };
      map.set(d, { units: prev.units + c.units, qp: prev.qp + c.qualityPoints, count: prev.count + 1 });
    }
    return [...map.entries()]
      .map(([d, { units, qp, count }]) => ({ dept: d, units, count, gpa: units > 0 ? qp / units : 0 }))
      .sort((a, b) => b.units - a.units);
  }, [courses]);

  if (depts.length < 2) return null;

  const maxUnits = depts[0].units;

  return (
    <div className="rounded-xl bg-zinc-800/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">GPA by Department</h3>
        <span className="text-xs text-zinc-500">{depts.length} departments</span>
      </div>
      <div className="space-y-2">
        {depts.map(({ dept: d, units, count, gpa }) => (
          <div key={d} className="flex items-center gap-3">
            <span className="w-24 font-mono text-xs text-zinc-200 shrink-0 truncate">{d}</span>
            <div className="flex-1 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(units / maxUnits) * 100}%`, background: barColor(gpa), opacity: 0.8 }}
              />
            </div>
            <span className={`text-xs font-mono font-bold w-12 text-right shrink-0 ${gpaColor(gpa)}`}>
              {gpa.toFixed(3)}
            </span>
            <span className="text-xs text-zinc-600 w-20 text-right shrink-0">
              {units} units · {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
