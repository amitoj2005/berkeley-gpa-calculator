'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis, ReferenceLine,
} from 'recharts';
import type { Course, GPAData } from '@/lib/types';
import { buildGPATimeline } from '@/lib/gpa';
import GPATimeline from '@/components/GPATimeline';
import DeptBreakdown from '@/components/DeptBreakdown';

interface Props {
  courses: Course[];
  gpaData: GPAData;
}

// ── Grade distribution ────────────────────────────────────────────────────────

const GRADE_ORDER = ['A+','A','A-','B+','B','B-','C+','C','C-','D+','D','D-','F','P','NP'];

function gradeBarColor(grade: string): string {
  if (grade.startsWith('A')) return '#22c55e';
  if (grade.startsWith('B')) return '#60a5fa';
  if (grade.startsWith('C')) return '#fbbf24';
  if (grade.startsWith('D')) return '#f87171';
  if (grade === 'F') return '#ef4444';
  return '#71717a';
}

interface DistTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { grade: string; units: number; courses: number } }>;
}

function DistTooltip({ active, payload }: DistTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
      <p className="font-bold" style={{ color: gradeBarColor(d.grade) }}>{d.grade}</p>
      <p className="text-zinc-300">{d.units} unit{d.units !== 1 ? 's' : ''}</p>
      <p className="text-zinc-500">{d.courses} course{d.courses !== 1 ? 's' : ''}</p>
    </div>
  );
}

function GradeDistribution({ courses }: { courses: Course[] }) {
  const data = useMemo(() => {
    const map = new Map<string, { units: number; courses: number }>();
    for (const c of courses) {
      const g = c.grade as string;
      const prev = map.get(g) ?? { units: 0, courses: 0 };
      map.set(g, { units: prev.units + c.units, courses: prev.courses + 1 });
    }
    return GRADE_ORDER
      .filter((g) => map.has(g))
      .map((g) => ({ grade: g, ...map.get(g)! }));
  }, [courses]);

  const totalGPAUnits = courses.filter(c => c.countsTowardGPA).reduce((s, c) => s + c.units, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Grade Distribution</h3>
        <span className="text-xs text-zinc-500">{totalGPAUnits} GPA units total</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="grade"
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={{ stroke: '#3f3f46' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Units', angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 10, dy: 30 }}
          />
          <Tooltip content={<DistTooltip />} cursor={{ fill: '#27272a' }} />
          <Bar dataKey="units" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((entry) => (
              <Cell key={entry.grade} fill={gradeBarColor(entry.grade)} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Unit totals by letter family */}
      <div className="grid grid-cols-4 gap-2 pt-1">
        {[
          { label: 'A grades', color: '#22c55e', prefix: 'A' },
          { label: 'B grades', color: '#60a5fa', prefix: 'B' },
          { label: 'C grades', color: '#fbbf24', prefix: 'C' },
          { label: 'D / F',   color: '#f87171', prefix: 'DF' },
        ].map(({ label, color, prefix }) => {
          const units = courses
            .filter((c) => prefix === 'DF'
              ? c.grade.startsWith('D') || c.grade === 'F'
              : c.grade.startsWith(prefix))
            .reduce((s, c) => s + c.units, 0);
          return (
            <div key={label} className="rounded-lg bg-zinc-800 px-3 py-2 text-center">
              <p className="text-base font-bold" style={{ color }}>{units}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Heaviest semester ─────────────────────────────────────────────────────────

function HeaviestSemester({ courses }: { courses: Course[] }) {
  const timeline = useMemo(() => buildGPATimeline(courses), [courses]);
  if (timeline.length === 0) return null;

  const sorted = [...timeline].sort((a, b) => b.termUnits - a.termUnits);
  const heaviest = sorted[0];
  const avgUnits = timeline.reduce((s, t) => s + t.termUnits, 0) / timeline.length;

  return (
    <div className="rounded-xl bg-zinc-800/60 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-zinc-200">Heaviest Semester</h3>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xl font-bold text-white">{heaviest.term}</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {heaviest.termUnits} units · Term GPA {heaviest.termGPA.toFixed(3)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Avg per term</p>
          <p className="text-sm font-semibold text-zinc-300">{avgUnits.toFixed(1)} units</p>
        </div>
      </div>
      {/* Unit bar for each term */}
      <div className="space-y-1">
        {[...timeline].sort((a,b) => b.termUnits - a.termUnits).slice(0, 5).map((t) => {
          const pct = heaviest.termUnits > 0 ? (t.termUnits / heaviest.termUnits) * 100 : 0;
          const isHeaviest = t.term === heaviest.term;
          return (
            <div key={t.term} className="flex items-center gap-2 text-xs">
              <span className={`w-24 truncate text-right ${isHeaviest ? 'text-zinc-200 font-medium' : 'text-zinc-500'}`}>
                {t.term}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: isHeaviest ? '#60a5fa' : '#3f3f46',
                  }}
                />
              </div>
              <span className={`w-8 ${isHeaviest ? 'text-blue-400 font-medium' : 'text-zinc-600'}`}>
                {t.termUnits}
              </span>
            </div>
          );
        })}
        {timeline.length > 5 && (
          <p className="text-[10px] text-zinc-600 pl-28">+{timeline.length - 5} more terms</p>
        )}
      </div>
    </div>
  );
}

// ── P/NP decision helper ──────────────────────────────────────────────────────

function PNPHelper({ courses, gpaData }: { courses: Course[]; gpaData: GPAData }) {
  const { cumulativeGPA, totalUnits, totalQualityPoints } = gpaData;
  const breakEvenGrade = cumulativeGPA;

  // For each graded course, compute what GPA would be if it were P/NP instead
  const pnpImpacts = useMemo(() => {
    return courses
      .filter((c) => c.countsTowardGPA)
      .map((c) => {
        const newUnits = totalUnits - c.units;
        const newQP = totalQualityPoints - c.qualityPoints;
        const newGPA = newUnits > 0 ? newQP / newUnits : 0;
        return { course: c, newGPA, delta: newGPA - cumulativeGPA };
      })
      .sort((a, b) => b.delta - a.delta); // biggest benefit first
  }, [courses, totalUnits, totalQualityPoints, cumulativeGPA]);

  const approxLetterGrade = (gpa: number) => {
    if (gpa >= 3.85) return 'A / A-';
    if (gpa >= 3.7)  return 'A-';
    if (gpa >= 3.5)  return 'A- / B+';
    if (gpa >= 3.3)  return 'B+';
    if (gpa >= 3.15) return 'B+ / B';
    if (gpa >= 3.0)  return 'B';
    if (gpa >= 2.7)  return 'B-';
    if (gpa >= 2.3)  return 'C+';
    if (gpa >= 2.0)  return 'C';
    return 'below C';
  };

  return (
    <div className="rounded-xl bg-zinc-800/60 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-200">P/NP Decision Helper</h3>

      <div className="rounded-lg bg-zinc-900 px-4 py-3 space-y-1">
        <p className="text-xs text-zinc-400">Your break-even grade for P/NP</p>
        <p className="text-2xl font-bold text-white">{breakEvenGrade.toFixed(3)}
          <span className="text-sm font-normal text-zinc-400 ml-2">≈ {approxLetterGrade(breakEvenGrade)}</span>
        </p>
        <p className="text-xs text-zinc-500">
          For any future course: if you expect to grade <span className="text-green-400">above this</span>, keep the letter grade.
          If you might grade <span className="text-red-400">below this</span>, P/NP would protect your GPA.
        </p>
      </div>

      <div>
        <p className="text-xs text-zinc-500 mb-2">Past courses — what P/NP would have done to your GPA:</p>
        <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
          {pnpImpacts.map(({ course, newGPA, delta }) => (
            <div key={course.id} className="flex items-center gap-2 text-xs">
              <span className="w-28 font-mono text-zinc-300 shrink-0 truncate">{course.code}</span>
              <span className={`font-bold w-6 text-right shrink-0 ${gradeBarColor(course.grade)}`}>{course.grade}</span>
              <div className="flex-1 h-1 rounded-full bg-zinc-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${delta > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, Math.abs(delta) / 0.1 * 50)}%` }}
                />
              </div>
              <span className={`w-16 text-right font-mono shrink-0 ${delta > 0.001 ? 'text-green-400' : delta < -0.001 ? 'text-red-400' : 'text-zinc-500'}`}>
                {delta > 0 ? '+' : ''}{delta.toFixed(3)}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-zinc-600 mt-2">
          Green = P/NP would have helped (grade was below your avg) · Red = P/NP would have hurt (grade was above your avg)
        </p>
      </div>
    </div>
  );
}

// ── GPA vs workload scatter ───────────────────────────────────────────────────

interface ScatterTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { units: number; gpa: number; term: string } }>;
}

function WorkloadTooltip({ active, payload }: ScatterTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-zinc-200">{d.term}</p>
      <p className="text-zinc-400">{d.units} units · {d.gpa.toFixed(3)} GPA</p>
    </div>
  );
}

function WorkloadScatter({ courses }: { courses: Course[] }) {
  const data = useMemo(() => {
    const timeline = buildGPATimeline(courses);
    return timeline.map((t) => ({ units: t.termUnits, gpa: t.termGPA, term: t.term }));
  }, [courses]);

  if (data.length < 3) return null;

  return (
    <div className="rounded-xl bg-zinc-800/60 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-zinc-200">GPA vs. Course Load</h3>
        <p className="text-xs text-zinc-500 mt-0.5">Each dot is one semester — heavier semesters tend to sit lower</p>
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <ScatterChart margin={{ top: 8, right: 16, left: -20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="units" name="Units" type="number"
            label={{ value: 'Units per term', position: 'insideBottom', offset: -10, fill: '#52525b', fontSize: 10 }}
            tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={{ stroke: '#3f3f46' }} tickLine={false}
          />
          <YAxis
            dataKey="gpa" name="Term GPA" type="number" domain={[0, 4]}
            tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={(v: number) => v.toFixed(1)}
          />
          <ZAxis range={[60, 60]} />
          <ReferenceLine y={data.reduce((s, d) => s + d.gpa, 0) / data.length} stroke="#3f3f46" strokeDasharray="4 4" />
          <Tooltip content={<WorkloadTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} fill="#60a5fa" fillOpacity={0.8} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function Insights({ courses, gpaData }: Props) {
  if (courses.length === 0) {
    return (
      <p className="text-center text-zinc-500 py-8 text-sm">
        No courses yet. Upload your transcript to see insights.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <GPATimeline courses={courses} />
      <HeaviestSemester courses={courses} />
      <PNPHelper courses={courses} gpaData={gpaData} />
      <WorkloadScatter courses={courses} />
      <DeptBreakdown courses={courses} />
      <div className="rounded-xl bg-zinc-800/60 p-4">
        <GradeDistribution courses={courses} />
      </div>
    </div>
  );
}
