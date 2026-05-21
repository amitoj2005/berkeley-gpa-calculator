'use client';

import { useState, useMemo } from 'react';
import { GRADE_POINTS } from '@/lib/gpa';
import type { Course, GPAData } from '@/lib/types';

interface Props {
  courses: Course[];
  gpaData: GPAData;
}

type Decision = 'letter' | 'pnp' | 'drop';

interface Entry {
  id: string;
  code: string;
  title: string;
  units: number;
  term: string;
  decision: Decision;
  expectedGrade: string;
  fromTranscript: boolean;
}

const LETTER_GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];

let uid = 0;
function mkId() { return `uc-${++uid}`; }

function blank(): Entry {
  return { id: mkId(), code: '', title: '', units: 3, term: '', decision: 'letter', expectedGrade: 'B', fromTranscript: false };
}

function approxLetter(gpa: number): string {
  if (gpa >= 3.85) return 'A';
  if (gpa >= 3.5)  return 'A-/B+';
  if (gpa >= 3.15) return 'B';
  if (gpa >= 2.85) return 'B-';
  if (gpa >= 2.5)  return 'C+';
  return 'C or below';
}

export default function UpcomingCoursesSimulator({ courses, gpaData }: Props) {
  const fromTranscript = useMemo(() =>
    courses.filter((c) => {
      const g = (c.grade as string).toUpperCase();
      return g === 'IP' || g === 'RD' || g === 'GRD';
    }),
  [courses]);

  const [entries, setEntries] = useState<Entry[]>(() =>
    fromTranscript.map((c) => ({
      id: mkId(),
      code: c.code,
      title: c.title,
      units: c.units,
      term: c.term,
      decision: 'letter' as Decision,
      expectedGrade: 'B',
      fromTranscript: true,
    }))
  );

  const breakEven = gpaData.cumulativeGPA;

  const projected = useMemo(() => {
    let addedQP = 0;
    let addedUnits = 0;
    for (const e of entries) {
      if (e.decision !== 'letter' || e.units <= 0) continue;
      const gp = GRADE_POINTS[e.expectedGrade];
      if (gp === undefined) continue;
      addedQP += gp * e.units;
      addedUnits += e.units;
    }
    const totalUnits = gpaData.totalUnits + addedUnits;
    const totalQP = gpaData.totalQualityPoints + addedQP;
    return { gpa: totalUnits > 0 ? totalQP / totalUnits : gpaData.cumulativeGPA, units: totalUnits };
  }, [entries, gpaData]);

  const update = (id: string, patch: Partial<Entry>) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const remove = (id: string) =>
    setEntries((prev) => prev.filter((e) => e.id !== id));

  const delta = projected.gpa - gpaData.cumulativeGPA;
  const hasLetterEntries = entries.some((e) => e.decision === 'letter' && e.units > 0);

  return (
    <div className="rounded-xl bg-zinc-800/60 p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Upcoming Courses Simulator</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Decide whether to take a letter grade, go P/NP, or drop — and see the GPA impact.
            {fromTranscript.length > 0 && ' Enrolled courses detected from your transcript.'}
          </p>
        </div>
        <button
          onClick={() => setEntries((p) => [...p, blank()])}
          className="shrink-0 rounded-lg bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 text-xs text-zinc-200 transition-colors"
        >
          + Add course
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-zinc-600 text-center py-4">
          No enrolled courses detected. Add courses manually or upload a transcript that includes IP-enrolled courses.
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((e) => {
            const gp = GRADE_POINTS[e.expectedGrade] ?? NaN;
            const courseDelta =
              !isNaN(gp) && e.units > 0 && e.decision === 'letter' && gpaData.totalUnits > 0
                ? (gpaData.totalQualityPoints + gp * e.units) / (gpaData.totalUnits + e.units) - breakEven
                : null;
            const rec: 'letter' | 'pnp' | 'borderline' | null =
              e.decision === 'letter' && !isNaN(gp)
                ? gp > breakEven + 0.15 ? 'letter'
                : gp < breakEven - 0.15 ? 'pnp'
                : 'borderline'
                : null;

            return (
              <div key={e.id} className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 space-y-2.5">
                {/* Course header */}
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {e.fromTranscript ? (
                      <>
                        <p className="text-sm font-mono font-semibold text-zinc-200">{e.code}</p>
                        {e.title && e.title !== e.code && (
                          <p className="text-xs text-zinc-500 truncate">{e.title}</p>
                        )}
                      </>
                    ) : (
                      <input
                        placeholder="e.g. COMPSCI 188"
                        value={e.code}
                        onChange={(ev) => update(e.id, { code: ev.target.value.toUpperCase() })}
                        className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                      />
                    )}
                  </div>

                  {/* Units */}
                  {e.fromTranscript ? (
                    <span className="text-xs text-zinc-500 shrink-0 mt-1">{e.units} units</span>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number" min={0.5} max={12} step={0.5}
                        value={e.units}
                        onChange={(ev) => {
                          const v = parseFloat(ev.target.value);
                          if (!isNaN(v) && v > 0 && v <= 12) update(e.id, { units: v });
                        }}
                        className="w-14 rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-zinc-200 text-center focus:outline-none focus:border-zinc-500"
                      />
                      <span className="text-xs text-zinc-600">un.</span>
                    </div>
                  )}

                  {e.fromTranscript && e.term && (
                    <span className="text-[10px] text-zinc-600 shrink-0 mt-1">{e.term}</span>
                  )}
                  <button
                    onClick={() => remove(e.id)}
                    className="text-zinc-600 hover:text-zinc-300 text-xs shrink-0 mt-1"
                  >
                    ✕
                  </button>
                </div>

                {/* Decision buttons */}
                <div className="flex gap-1">
                  {(['letter', 'pnp', 'drop'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => update(e.id, { decision: d })}
                      className={`flex-1 rounded py-1 text-xs font-medium transition-colors border ${
                        e.decision === d
                          ? d === 'drop' ? 'bg-red-900/50 text-red-300 border-red-800'
                          : d === 'pnp'  ? 'bg-zinc-600 text-zinc-100 border-zinc-500'
                                         : 'bg-blue-900/50 text-blue-300 border-blue-800'
                          : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 border-transparent'
                      }`}
                    >
                      {d === 'letter' ? 'Letter Grade' : d === 'pnp' ? 'P/NP' : 'Drop'}
                    </button>
                  ))}
                </div>

                {/* Decision details */}
                {e.decision === 'letter' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-zinc-500">Expected:</span>
                    <select
                      value={e.expectedGrade}
                      onChange={(ev) => update(e.id, { expectedGrade: ev.target.value })}
                      className="rounded bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500"
                    >
                      {LETTER_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                    {courseDelta !== null && (
                      <span className={`text-xs font-mono font-semibold ${
                        courseDelta > 0.0005 ? 'text-green-400' : courseDelta < -0.0005 ? 'text-red-400' : 'text-zinc-400'
                      }`}>
                        {courseDelta > 0 ? '+' : ''}{courseDelta.toFixed(3)}
                      </span>
                    )}
                    {rec === 'letter' && (
                      <span className="text-[10px] bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded">
                        above break-even — keep letter
                      </span>
                    )}
                    {rec === 'pnp' && (
                      <span className="text-[10px] bg-yellow-900/40 text-yellow-400 px-1.5 py-0.5 rounded">
                        below break-even — consider P/NP
                      </span>
                    )}
                    {rec === 'borderline' && (
                      <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">
                        near break-even
                      </span>
                    )}
                  </div>
                )}
                {e.decision === 'pnp' && (
                  <p className="text-xs text-zinc-500">
                    No GPA impact — these {e.units} units won&apos;t count toward your GPA.
                    You need a passing grade to earn the units.
                  </p>
                )}
                {e.decision === 'drop' && (
                  <p className="text-xs text-red-400/70">
                    Dropped — no GPA or unit impact. Make sure you&apos;re within the drop deadline.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-zinc-600">
        Your break-even grade is {breakEven.toFixed(2)} (≈ {approxLetter(breakEven)}).
        Grades above this raise your GPA; grades below lower it.
        Major requirements often can&apos;t be switched to P/NP — check with your advisor.
      </p>

      {hasLetterEntries && (
        <div className="rounded-lg bg-zinc-900 px-4 py-3 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-zinc-400">Current GPA</p>
            <p className="text-xl font-bold text-zinc-400">{gpaData.cumulativeGPA.toFixed(3)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Projected GPA</p>
            <p className="text-xl font-bold text-white">{projected.gpa.toFixed(3)}</p>
            <p className="text-xs text-zinc-500">{projected.units} units</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400">Change</p>
            <p className={`text-xl font-bold ${delta > 0.0005 ? 'text-green-400' : delta < -0.0005 ? 'text-red-400' : 'text-zinc-400'}`}>
              {delta > 0 ? '+' : ''}{delta.toFixed(3)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
