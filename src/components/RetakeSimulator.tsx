'use client';

import { useMemo, useState } from 'react';
import type { Course, GPAData } from '@/lib/types';
import { getGradePoints, GRADE_POINTS } from '@/lib/gpa';

const RETAKE_ELIGIBLE = new Set(['D+', 'D', 'D-', 'F']);
const GRADE_OPTIONS = Object.keys(GRADE_POINTS);

export default function RetakeSimulator({ courses, gpaData }: { courses: Course[]; gpaData: GPAData }) {
  const eligible = useMemo(
    () => courses.filter((c) => RETAKE_ELIGIBLE.has(c.grade) && c.countsTowardGPA),
    [courses]
  );

  const [retakes, setRetakes] = useState<Record<string, string>>({});

  const projectedGPA = useMemo(() => {
    const { totalUnits, totalQualityPoints } = gpaData;
    if (totalUnits === 0) return 0;
    let adjustedQP = totalQualityPoints;
    for (const [id, newGrade] of Object.entries(retakes)) {
      const course = courses.find((c) => c.id === id);
      if (!course) continue;
      adjustedQP -= course.qualityPoints;
      adjustedQP += course.units * getGradePoints(newGrade);
    }
    return adjustedQP / totalUnits;
  }, [retakes, courses, gpaData]);

  const delta = projectedGPA - gpaData.cumulativeGPA;
  const hasRetakes = Object.keys(retakes).length > 0;

  if (eligible.length === 0) {
    return (
      <div className="rounded-xl bg-zinc-800/60 p-4">
        <h3 className="text-sm font-semibold text-zinc-200 mb-2">Retake Simulator</h3>
        <p className="text-xs text-zinc-500">No D+, D, D-, or F grades — nothing eligible to retake.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-zinc-800/60 p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Retake Simulator</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            At Berkeley, retaking a course replaces the lower grade in your GPA. Select courses and choose the grade you&apos;d aim for.
          </p>
        </div>
        {hasRetakes && (
          <button onClick={() => setRetakes({})} className="text-xs text-zinc-500 hover:text-zinc-300 underline ml-4 shrink-0">
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-2">
        {eligible.map((course) => {
          const selected = course.id in retakes;
          const newGrade = retakes[course.id] ?? 'B';
          const qpGain = selected ? course.units * getGradePoints(newGrade) - course.qualityPoints : 0;
          return (
            <div key={course.id} className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${selected ? 'bg-zinc-700/60 border border-zinc-600' : 'bg-zinc-800/40'}`}>
              <input
                type="checkbox" checked={selected}
                onChange={(e) => setRetakes((prev) => { const n = { ...prev }; if (e.target.checked) n[course.id] = 'B'; else delete n[course.id]; return n; })}
                className="accent-blue-500 h-4 w-4 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200 font-mono">{course.code}</p>
                <p className="text-xs text-zinc-500 truncate">{course.title} · {course.term}</p>
              </div>
              <span className="text-sm font-bold text-red-400 w-8 text-center">{course.grade}</span>
              {selected && (
                <>
                  <svg className="h-3.5 w-3.5 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <select
                    value={newGrade}
                    onChange={(e) => setRetakes((prev) => ({ ...prev, [course.id]: e.target.value }))}
                    className="w-20 rounded bg-zinc-600 px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <span className={`text-xs font-mono w-16 text-right ${qpGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {qpGain >= 0 ? '+' : ''}{qpGain.toFixed(2)} QP
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {hasRetakes && (
        <div className="rounded-lg bg-zinc-900 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">GPA after {Object.keys(retakes).length} retake{Object.keys(retakes).length !== 1 ? 's' : ''}</p>
            <p className="text-2xl font-bold text-white mt-0.5">{projectedGPA.toFixed(3)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400">Change</p>
            <p className={`text-xl font-bold mt-0.5 ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
              {delta > 0 ? '+' : ''}{delta.toFixed(3)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
