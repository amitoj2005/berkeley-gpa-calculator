'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { GPAData } from '@/lib/types';
import { calculateUCGPA } from '@/lib/gpa';

interface Props {
  gpaData: GPAData;
  majorGPAData: GPAData;
  projectedGPA?: number;
  projectedUnits?: number;
}

function GradeRing({ gpa }: { gpa: number }) {
  const pct = Math.min(gpa / 4.0, 1);
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  const color =
    gpa >= 3.7 ? '#22c55e' : gpa >= 3.0 ? '#3b82f6' : gpa >= 2.0 ? '#f59e0b' : '#ef4444';

  return (
    <svg width="120" height="120" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#27272a" strokeWidth="12" />
      <circle
        cx="50" cy="50" r={r}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x="50" y="46" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
        {gpa.toFixed(3)}
      </text>
      <text x="50" y="62" textAnchor="middle" fill="#a1a1aa" fontSize="9">
        GPA
      </text>
    </svg>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-zinc-800 px-4 py-3 text-center">
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-[10px] text-zinc-500 mt-0.5">{sub}</p>}
      <p className="mt-1 text-xs text-zinc-400">{label}</p>
    </div>
  );
}

function UCGPAStat({ value }: { value: string }) {
  const [visible, setVisible] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const rect = btnRef.current?.getBoundingClientRect();
  const tooltip = visible && rect ? createPortal(
    <div
      className="fixed z-50 w-64 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs shadow-xl text-zinc-300 leading-relaxed"
      style={{ top: rect.bottom + 8, left: Math.min(rect.left, window.innerWidth - 272) }}
    >
      <p className="font-semibold text-zinc-100 mb-1">UC GPA (no +/− modifiers)</p>
      <p>The UC system counts A, A−, and A+ all as 4.0; B+, B, and B− all as 3.0; and so on — ignoring the ±. This matters for UC graduate school applications, certain scholarships, and UC-wide reporting.</p>
      <p className="mt-1.5 text-zinc-500">Your Berkeley GPA uses the full ± scale (A− = 3.7, B+ = 3.3, etc.).</p>
    </div>,
    document.body
  ) : null;

  return (
    <div className="rounded-lg bg-zinc-800 px-4 py-3 text-center relative">
      <p className="text-xl font-bold text-white">{value}</p>
      <div className="mt-1 flex items-center justify-center gap-1">
        <p className="text-xs text-zinc-400">UC GPA</p>
        <button
          ref={btnRef}
          onMouseEnter={() => setVisible(true)}
          onMouseLeave={() => setVisible(false)}
          className="text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {tooltip}
    </div>
  );
}

function latinHonors(gpa: number): { label: string; color: string } | null {
  if (gpa >= 3.9) return { label: 'Highest Honors trajectory', color: 'text-yellow-400' };
  if (gpa >= 3.7) return { label: 'High Honors trajectory', color: 'text-zinc-200' };
  if (gpa >= 3.5) return { label: 'Honors trajectory', color: 'text-blue-300' };
  return null;
}

export default function GPADashboard({ gpaData, majorGPAData, projectedGPA, projectedUnits }: Props) {
  const { cumulativeGPA, totalUnits, totalQualityPoints, courses } = gpaData;
  const gpaCourses = courses.filter((c) => c.countsTowardGPA);
  const ucGPA = calculateUCGPA(courses);

  const hasProjection = projectedGPA !== undefined && projectedUnits !== undefined && projectedUnits > totalUnits;
  const delta = hasProjection ? projectedGPA! - cumulativeGPA : 0;
  const honors = latinHonors(cumulativeGPA);
  const hasMajor = majorGPAData.courses.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-center">
        <GradeRing gpa={cumulativeGPA} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Cumulative GPA" value={cumulativeGPA.toFixed(3)} />
          <Stat label="GPA Units" value={totalUnits.toFixed(1)} />
          <Stat label="Quality Points" value={totalQualityPoints.toFixed(1)} />
          <Stat label="GPA Courses" value={String(gpaCourses.length)} />
          <Stat label="Total Courses" value={String(courses.length)} />
          <UCGPAStat value={ucGPA.toFixed(3)} />
          {hasMajor ? (
            <Stat
              label="Major GPA"
              value={majorGPAData.cumulativeGPA.toFixed(3)}
              sub={`${majorGPAData.totalUnits} units tagged`}
            />
          ) : (
            <div className="rounded-lg bg-zinc-800 px-4 py-3 text-center">
              <p className="text-xs text-zinc-500 mt-2">Tag major courses</p>
              <p className="text-xs text-zinc-600">in the Courses tab</p>
            </div>
          )}
          {hasProjection && (
            <div className="rounded-lg bg-indigo-900/60 px-4 py-3 text-center">
              <p className={`text-xl font-bold ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {projectedGPA!.toFixed(3)}
              </p>
              <p className="mt-1 text-xs text-indigo-300">
                Projected ({delta >= 0 ? '+' : ''}{delta.toFixed(3)})
              </p>
            </div>
          )}
        </div>
      </div>

      {honors && (
        <div className={`flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/40 px-4 py-2.5 text-sm ${honors.color}`}>
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="font-medium">{honors.label}</span>
          <span className="text-zinc-500 text-xs ml-auto">based on current GPA</span>
        </div>
      )}
    </div>
  );
}
