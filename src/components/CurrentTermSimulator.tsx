'use client';

import { useState, useMemo } from 'react';
import type { GPAData } from '@/lib/types';
import { GRADE_POINTS, getGradePoints } from '@/lib/gpa';

const GRADE_OPTIONS = Object.keys(GRADE_POINTS);

interface TermCourse {
  id: string;
  code: string;
  units: number;
  grade: string;
}

let _id = 0;
function newId() { return String(++_id); }

function newCourse(): TermCourse {
  return { id: newId(), code: '', units: 3, grade: 'B' };
}

export default function CurrentTermSimulator({ gpaData }: { gpaData: GPAData }) {
  const [courses, setCourses] = useState<TermCourse[]>([newCourse()]);

  const add = () => setCourses((p) => [...p, newCourse()]);
  const remove = (id: string) => setCourses((p) => p.filter((c) => c.id !== id));
  const update = <K extends keyof TermCourse>(id: string, field: K, val: TermCourse[K]) =>
    setCourses((p) => p.map((c) => (c.id === id ? { ...c, [field]: val } : c)));

  const { termGPA, newCumGPA, termUnits, delta } = useMemo(() => {
    const termQP = courses.reduce((s, c) => s + c.units * getGradePoints(c.grade), 0);
    const termUnits = courses.reduce((s, c) => s + c.units, 0);
    const termGPA = termUnits > 0 ? termQP / termUnits : 0;
    const totalUnits = gpaData.totalUnits + termUnits;
    const newCumGPA = totalUnits > 0 ? (gpaData.totalQualityPoints + termQP) / totalUnits : 0;
    return { termGPA, newCumGPA, termUnits, delta: newCumGPA - gpaData.cumulativeGPA };
  }, [courses, gpaData]);

  return (
    <div className="rounded-xl bg-zinc-800/60 p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Current Semester Simulator</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Enter courses you&apos;re enrolled in now and set expected grades to preview your end-of-semester GPA.
          </p>
        </div>
        <button
          onClick={add}
          className="shrink-0 rounded-lg bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 text-xs text-zinc-200 transition-colors"
        >
          + Add course
        </button>
      </div>

      <div className="space-y-2">
        {courses.map((course) => (
          <div key={course.id} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g. INDENG 150"
              value={course.code}
              onChange={(e) => update(course.id, 'code', e.target.value.toUpperCase())}
              className="flex-1 min-w-0 rounded bg-zinc-700 px-2 py-1.5 text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="number"
              min={1} max={12}
              value={course.units}
              onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0 && v <= 12) update(course.id, 'units', v); }}
              className="w-14 rounded bg-zinc-700 px-2 py-1.5 text-sm text-zinc-200 text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-xs text-zinc-600 shrink-0">un.</span>
            <select
              value={course.grade}
              onChange={(e) => update(course.id, 'grade', e.target.value)}
              className="w-20 rounded bg-zinc-700 px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            {courses.length > 1 && (
              <button onClick={() => remove(course.id)} className="text-zinc-600 hover:text-red-400 transition-colors shrink-0">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-zinc-900 px-4 py-3 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-zinc-400">Term GPA</p>
          <p className="text-2xl font-bold text-white mt-0.5">{termGPA.toFixed(3)}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{termUnits} units</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">New Cumulative</p>
          <p className="text-2xl font-bold text-white mt-0.5">{newCumGPA.toFixed(3)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-400">Change</p>
          <p className={`text-xl font-bold mt-0.5 ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
            {delta > 0 ? '+' : ''}{delta.toFixed(3)}
          </p>
        </div>
      </div>
    </div>
  );
}
