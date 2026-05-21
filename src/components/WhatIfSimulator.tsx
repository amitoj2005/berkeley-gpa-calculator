'use client';

import { useCallback } from 'react';
import type { HypotheticalCourse } from '@/lib/types';
import { GRADE_POINTS } from '@/lib/gpa';

const GRADES = Object.keys(GRADE_POINTS).concat(['P', 'NP']);
const UNIT_OPTIONS = [0.5, 1, 1.5, 2, 3, 4, 5, 6];

interface Props {
  hypothetical: HypotheticalCourse[];
  onChange: (courses: HypotheticalCourse[]) => void;
  currentGPA: number;
  projectedGPA: number;
  projectedUnits: number;
  currentUnits: number;
}

let hypoIdCounter = 0;
function newHypo(): HypotheticalCourse {
  return { id: `hypo-${++hypoIdCounter}`, code: '', units: 4, grade: 'A' };
}

export default function WhatIfSimulator({
  hypothetical,
  onChange,
  currentGPA,
  projectedGPA,
  projectedUnits,
  currentUnits,
}: Props) {
  const add = useCallback(() => onChange([...hypothetical, newHypo()]), [hypothetical, onChange]);

  const update = useCallback(
    (id: string, patch: Partial<HypotheticalCourse>) => {
      onChange(hypothetical.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    },
    [hypothetical, onChange]
  );

  const remove = useCallback(
    (id: string) => onChange(hypothetical.filter((c) => c.id !== id)),
    [hypothetical, onChange]
  );

  const delta = projectedGPA - currentGPA;
  const hasHypo = hypothetical.length > 0;
  const addedUnits = projectedUnits - currentUnits;

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Add hypothetical future courses to see how they would affect your GPA.
      </p>

      {hasHypo && (
        <>
          <div className="rounded-xl bg-zinc-800/60 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400">Projected GPA</p>
              <p className="text-3xl font-bold text-white mt-0.5">{projectedGPA.toFixed(3)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-400">Change from current</p>
              <p className={`text-2xl font-bold mt-0.5 ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                {delta > 0 ? '+' : ''}{delta.toFixed(3)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-zinc-800 px-3 py-2">
              <p className="text-lg font-bold text-white">{addedUnits}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Units added</p>
            </div>
            <div className="rounded-lg bg-zinc-800 px-3 py-2">
              <p className="text-lg font-bold text-white">{hypothetical.length}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Courses</p>
            </div>
            <div className="rounded-lg bg-zinc-800 px-3 py-2">
              <p className="text-lg font-bold text-white">{currentUnits + addedUnits}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Total units</p>
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        {hypothetical.map((course) => (
          <div key={course.id} className="flex items-center gap-2 rounded-lg bg-zinc-800 p-3">
            <input
              type="text"
              placeholder="Course code (optional)"
              value={course.code}
              onChange={(e) => update(course.id, { code: e.target.value })}
              className="flex-1 min-w-0 rounded bg-zinc-700 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={course.units}
              onChange={(e) => update(course.id, { units: Number(e.target.value) })}
              className="w-20 rounded bg-zinc-700 px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>{u} unit{u !== 1 ? 's' : ''}</option>
              ))}
            </select>
            <select
              value={course.grade}
              onChange={(e) => update(course.id, { grade: e.target.value as HypotheticalCourse['grade'] })}
              className="w-20 rounded bg-zinc-700 px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <button
              onClick={() => remove(course.id)}
              className="text-zinc-600 hover:text-red-400 transition-colors px-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={add}
        className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-600 px-4 py-2.5 text-sm text-zinc-400 hover:border-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add hypothetical course
      </button>

      {hasHypo && (
        <button
          onClick={() => onChange([])}
          className="text-xs text-zinc-500 hover:text-zinc-300 underline"
        >
          Clear all hypotheticals
        </button>
      )}
    </div>
  );
}
