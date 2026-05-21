'use client';

import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, Dot,
} from 'recharts';
import type { Course } from '@/lib/types';
import { buildGPATimeline } from '@/lib/gpa';

interface Props {
  courses: Course[];
}

interface TooltipPayload {
  color: string;
  name: string;
  value: number;
  payload: ReturnType<typeof buildGPATimeline>[number];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 shadow-2xl text-sm space-y-2">
      <p className="font-semibold text-zinc-100">{d.term}</p>
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="font-mono font-bold" style={{ color: p.color }}>
              {p.value.toFixed(3)}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-700 pt-1 text-xs text-zinc-500">
        {d.termUnits > 0 ? `${d.termUnits} GPA units this term` : 'No graded units'}
        {' · '}{d.cumulativeUnits} total
      </div>
    </div>
  );
}

const GPA_THRESHOLDS = [
  { value: 3.5, label: 'Dean\'s List', color: '#22c55e' },
  { value: 2.0, label: 'Min. Standing', color: '#ef4444' },
];

export default function GPATimeline({ courses }: Props) {
  const data = useMemo(() => buildGPATimeline(courses), [courses]);

  if (data.length < 2) {
    return (
      <p className="text-center text-zinc-500 py-8 text-sm">
        {data.length === 0
          ? 'No courses loaded yet.'
          : 'Need at least 2 terms to show a trend.'}
      </p>
    );
  }

  // Shorten term labels for x-axis: "Fall 2023" → "F'23"
  const formatTerm = (term: string) => {
    const m = term.match(/(Spring|Summer|Fall|Winter)\s+(\d{4})/i);
    if (!m) return term;
    return `${m[1][0]}'${m[2].slice(2)}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-zinc-400 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 bg-blue-400 rounded" />
          Cumulative GPA
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 bg-indigo-400 rounded opacity-60" style={{borderTop: '2px dashed #818cf8'}} />
          Term GPA
        </span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="term"
            tickFormatter={formatTerm}
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={{ stroke: '#3f3f46' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 4.0]}
            ticks={[0, 1.0, 2.0, 3.0, 3.5, 4.0]}
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={{ stroke: '#3f3f46' }}
            tickLine={false}
            tickFormatter={(v: number) => v.toFixed(1)}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3f3f46', strokeWidth: 1 }} />

          {GPA_THRESHOLDS.map((t) => (
            <ReferenceLine
              key={t.value}
              y={t.value}
              stroke={t.color}
              strokeDasharray="4 4"
              strokeOpacity={0.4}
              label={{ value: t.label, position: 'insideTopRight', fill: t.color, fontSize: 10, opacity: 0.7 }}
            />
          ))}

          {/* Term GPA — dashed, secondary */}
          <Line
            type="monotone"
            dataKey="termGPA"
            name="Term GPA"
            stroke="#818cf8"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            activeDot={{ r: 4, fill: '#818cf8', stroke: '#1e1b4b' }}
          />

          {/* Cumulative GPA — solid, primary */}
          <Line
            type="monotone"
            dataKey="cumulativeGPA"
            name="Cumulative GPA"
            stroke="#60a5fa"
            strokeWidth={2.5}
            dot={<CustomDot />}
            activeDot={{ r: 6, fill: '#60a5fa', stroke: '#1e3a5f', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Color the dot by GPA level
function CustomDot(props: {
  cx?: number; cy?: number; payload?: ReturnType<typeof buildGPATimeline>[number];
}) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  const gpa = payload.cumulativeGPA;
  const fill = gpa >= 3.7 ? '#22c55e' : gpa >= 3.0 ? '#60a5fa' : gpa >= 2.0 ? '#f59e0b' : '#ef4444';
  return <circle cx={cx} cy={cy} r={4} fill={fill} stroke="#0f172a" strokeWidth={1.5} />;
}
