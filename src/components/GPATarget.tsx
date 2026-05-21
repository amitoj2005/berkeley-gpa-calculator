'use client';

import { useMemo, useState } from 'react';
import type { GPAData } from '@/lib/types';

function approxGrade(gpa: number): string {
  if (gpa >= 4.0)  return "straight A's";
  if (gpa >= 3.85) return 'A / A-';
  if (gpa >= 3.7)  return 'A-';
  if (gpa >= 3.5)  return 'A- / B+';
  if (gpa >= 3.3)  return 'B+';
  if (gpa >= 3.15) return 'B+ / B';
  if (gpa >= 3.0)  return 'B';
  if (gpa >= 2.85) return 'B / B-';
  if (gpa >= 2.7)  return 'B-';
  if (gpa >= 2.5)  return 'B- / C+';
  if (gpa >= 2.3)  return 'C+';
  if (gpa >= 2.0)  return 'C';
  if (gpa >= 0)    return 'below C';
  return 'not possible';
}

export default function GPATarget({ gpaData }: { gpaData: GPAData }) {
  const { totalUnits, totalQualityPoints, cumulativeGPA } = gpaData;
  const [targetGPA, setTargetGPA] = useState(
    Math.min(4.0, Math.round((cumulativeGPA + 0.3) * 10) / 10)
  );
  const [plannedUnits, setPlannedUnits] = useState(16);

  const requiredGPA = useMemo(() => {
    if (plannedUnits <= 0 || totalUnits === 0) return null;
    return (targetGPA * (totalUnits + plannedUnits) - totalQualityPoints) / plannedUnits;
  }, [targetGPA, plannedUnits, totalUnits, totalQualityPoints]);

  const alreadyThere = cumulativeGPA >= targetGPA;
  const impossible = requiredGPA !== null && requiredGPA > 4.0;
  const resultColor = alreadyThere ? 'text-green-400' : impossible ? 'text-red-400' : 'text-blue-400';

  return (
    <div className="rounded-xl bg-zinc-800/60 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-200">GPA Target Calculator</h3>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400">Target GPA</label>
            <input
              type="number" min={0} max={4.0} step={0.01}
              value={targetGPA}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) setTargetGPA(Math.min(4.0, Math.max(0, v)));
              }}
              className="w-16 rounded bg-zinc-700 px-2 py-1 text-sm text-zinc-200 text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <input
            type="range"
            min={cumulativeGPA < 4.0 ? Math.max(0, cumulativeGPA - 0.5) : 2.0}
            max={4.0} step={0.05} value={targetGPA}
            onChange={(e) => setTargetGPA(parseFloat(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400">Planned future units</label>
            <input
              type="number" min={1} max={200}
              value={plannedUnits}
              onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) setPlannedUnits(v); }}
              className="w-16 rounded bg-zinc-700 px-2 py-1 text-sm text-zinc-200 text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <input
            type="range" min={1} max={80} step={1} value={plannedUnits}
            onChange={(e) => setPlannedUnits(parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>
      </div>

      <div className="rounded-lg bg-zinc-900 px-4 py-3 flex items-center justify-between">
        {alreadyThere ? (
          <div>
            <p className="text-green-400 font-semibold text-sm">You&apos;re already there!</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Your current GPA of {cumulativeGPA.toFixed(3)} meets or exceeds {targetGPA.toFixed(2)}.
            </p>
          </div>
        ) : impossible ? (
          <div>
            <p className="text-red-400 font-semibold text-sm">Not achievable in {plannedUnits} units</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Would need {requiredGPA!.toFixed(3)} — above the 4.0 max. Try more units or a lower target.
            </p>
          </div>
        ) : requiredGPA !== null ? (
          <>
            <div>
              <p className="text-xs text-zinc-400">Required avg GPA over next {plannedUnits} units</p>
              <p className={`text-3xl font-bold mt-0.5 ${resultColor}`}>{requiredGPA.toFixed(3)}</p>
              <p className="text-xs text-zinc-500 mt-1">≈ {approxGrade(requiredGPA)} average</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-400">Gap from current</p>
              <p className="text-xl font-bold text-zinc-200 mt-0.5">
                +{(targetGPA - cumulativeGPA).toFixed(3)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">{totalUnits + plannedUnits} total units after</p>
            </div>
          </>
        ) : (
          <p className="text-zinc-500 text-sm">Enter a target and planned units above.</p>
        )}
      </div>
    </div>
  );
}
