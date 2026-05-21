'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Course } from '@/lib/types';
import { groupByTerm, termGPA, courseGPAImpact, buildGPATimeline } from '@/lib/gpa';

interface Props {
  courses: Course[];
  totalUnits: number;
  cumulativeGPA: number;
  majorIds: Set<string>;
  onRemove: (id: string) => void;
  onToggleMajor: (id: string) => void;
  onExport: () => void;
}

function gradeColor(grade: string): string {
  if (['A+', 'A', 'A-'].includes(grade)) return 'text-green-400';
  if (['B+', 'B', 'B-'].includes(grade)) return 'text-blue-400';
  if (['C+', 'C', 'C-'].includes(grade)) return 'text-yellow-400';
  if (['D+', 'D', 'D-', 'F'].includes(grade)) return 'text-red-400';
  return 'text-zinc-400';
}

function ImpactBar({ impact, maxAbs }: { impact: number; maxAbs: number }) {
  const pct = maxAbs > 0 ? Math.abs(impact) / maxAbs : 0;
  const barWidth = `${Math.round(pct * 100)}%`;
  const isPositive = impact >= 0;
  const label = `${isPositive ? '+' : ''}${impact.toFixed(4)}`;

  return (
    <div className="flex items-center gap-2">
      {/* Centered split bar */}
      <div className="relative flex h-2 w-24 items-center">
        <div className="absolute inset-0 rounded-full bg-zinc-700" />
        {/* Center tick */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-zinc-500" />
        {isPositive ? (
          <div
            className="absolute left-1/2 h-full rounded-r-full bg-green-500 transition-all"
            style={{ width: `calc(${barWidth} / 2)` }}
          />
        ) : (
          <div
            className="absolute right-1/2 h-full rounded-l-full bg-red-500 transition-all"
            style={{ width: `calc(${barWidth} / 2)` }}
          />
        )}
      </div>
      <span className={`text-xs font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {label}
      </span>
    </div>
  );
}

function InfoTip({ text }: { text: string }) {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  return (
    <span className="relative inline-block ml-1 align-middle">
      <button
        onMouseEnter={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setAnchor({ x: r.left + r.width / 2, y: r.top });
        }}
        onMouseLeave={() => setAnchor(null)}
        onFocus={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setAnchor({ x: r.left + r.width / 2, y: r.top });
        }}
        onBlur={() => setAnchor(null)}
        className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-600 text-[9px] text-zinc-300 hover:bg-zinc-500"
      >
        ?
      </button>
      {anchor && createPortal(
        <div
          style={{
            position: 'fixed',
            left: anchor.x,
            top: anchor.y - 8,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
          }}
          className="w-56 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 shadow-xl leading-relaxed pointer-events-none"
        >
          {text}
        </div>,
        document.body
      )}
    </span>
  );
}

export default function CourseTable({ courses, totalUnits, cumulativeGPA, majorIds, onRemove, onToggleMajor, onExport }: Props) {
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<'impact' | 'grade' | null>(null);

  const termMap = useMemo(() => groupByTerm(courses), [courses]);

  // Build cumulative GPA at end of each term for the header
  const cumulativeByTerm = useMemo(() => {
    const points = buildGPATimeline(courses);
    return new Map(points.map((p) => [p.term, p.cumulativeGPA]));
  }, [courses]);

  const termOrder = useMemo(() => [...cumulativeByTerm.keys()], [cumulativeByTerm]);

  const maxAbsImpact = useMemo(() => {
    let max = 0;
    for (const c of courses) {
      const impact = Math.abs(courseGPAImpact(c, totalUnits, cumulativeGPA));
      if (impact > max) max = impact;
    }
    return max;
  }, [courses, totalUnits, cumulativeGPA]);

  const toggleTerm = (term: string) => {
    setExpandedTerms((prev) => {
      const next = new Set(prev);
      if (next.has(term)) next.delete(term);
      else next.add(term);
      return next;
    });
  };

  const expandAll = () => setExpandedTerms(new Set(termOrder));
  const collapseAll = () => setExpandedTerms(new Set());

  if (courses.length === 0) {
    return (
      <p className="text-center text-zinc-500 py-8">
        No courses yet. Upload your transcript above.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-3">
          <span>{courses.length} courses across {termOrder.length} terms</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-500">
            <span className="inline-block h-2 w-2 rounded-sm bg-blue-500 mr-1 align-middle" />
            M = major course
          </span>
        </div>
        <div className="flex gap-3">
          <button onClick={expandAll} className="hover:text-zinc-200 underline">expand all</button>
          <button onClick={collapseAll} className="hover:text-zinc-200 underline">collapse all</button>
          <button onClick={onExport} className="hover:text-zinc-200 underline">export CSV</button>
        </div>
      </div>

      {termOrder.map((term) => {
        const termCourses = termMap.get(term)!;
        const tGPA = termGPA(termCourses);
        const cumAtEnd = cumulativeByTerm.get(term) ?? 0;
        const isOpen = expandedTerms.has(term);
        const termUnits = termCourses.filter(c => c.countsTowardGPA).reduce((s, c) => s + c.units, 0);
        const isDeansList = tGPA >= 3.5 && termUnits >= 12;

        let displayCourses = [...termCourses];
        if (sortKey === 'impact') {
          displayCourses.sort((a, b) =>
            courseGPAImpact(b, totalUnits, cumulativeGPA) - courseGPAImpact(a, totalUnits, cumulativeGPA)
          );
        } else if (sortKey === 'grade') {
          displayCourses.sort((a, b) => b.gradePoints - a.gradePoints);
        }

        // Color the term header by how the cumulative GPA changed this term
        const prevTerms = termOrder.slice(0, termOrder.indexOf(term));
        const prevCum = prevTerms.length > 0 ? (cumulativeByTerm.get(prevTerms[prevTerms.length - 1]) ?? 0) : 0;
        const cumDelta = cumAtEnd - prevCum;
        const termHeaderGPAColor =
          prevTerms.length === 0 ? 'text-zinc-200' :
          cumDelta > 0.01 ? 'text-green-400' :
          cumDelta < -0.01 ? 'text-red-400' :
          'text-zinc-200';

        return (
          <div key={term} className="rounded-xl border border-zinc-700 overflow-hidden">
            <button
              onClick={() => toggleTerm(term)}
              className="flex w-full items-center justify-between bg-zinc-800 px-4 py-3 text-left hover:bg-zinc-700/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`h-4 w-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-semibold text-zinc-100">{term}</span>
                {isDeansList && (
                  <span className="rounded-full bg-blue-900/50 border border-blue-700/60 px-2 py-0.5 text-[10px] font-medium text-blue-300">
                    Dean&apos;s List
                  </span>
                )}
              </div>
              <div className="flex items-center gap-5 text-sm">
                <span className="text-zinc-500">{termUnits} units</span>
                <div className="text-right">
                  <span className="text-xs text-zinc-500">Term  </span>
                  <span className="font-mono font-semibold text-zinc-300">
                    {tGPA > 0 ? tGPA.toFixed(3) : '—'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-500">Cumulative  </span>
                  <span className={`font-mono font-bold ${termHeaderGPAColor}`}>
                    {cumAtEnd.toFixed(3)}
                  </span>
                  {prevTerms.length > 0 && (
                    <span className={`ml-1.5 font-mono text-xs ${cumDelta > 0.001 ? 'text-green-400' : cumDelta < -0.001 ? 'text-red-400' : 'text-zinc-500'}`}>
                      ({cumDelta > 0 ? '+' : ''}{cumDelta.toFixed(3)})
                    </span>
                  )}
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700 bg-zinc-900/60 text-left text-xs text-zinc-500">
                      <th className="px-4 py-2">Course</th>
                      <th className="px-4 py-2">Title</th>
                      <th className="px-4 py-2 text-right">Units</th>
                      <th
                        className="px-4 py-2 text-right cursor-pointer hover:text-zinc-300"
                        onClick={() => setSortKey(sortKey === 'grade' ? null : 'grade')}
                      >
                        Grade {sortKey === 'grade' ? '↑' : ''}
                      </th>
                      <th
                        className="px-4 py-2 cursor-pointer hover:text-zinc-300 whitespace-nowrap"
                        onClick={() => setSortKey(sortKey === 'impact' ? null : 'impact')}
                      >
                        GPA Impact {sortKey === 'impact' ? '↓' : ''}
                        <InfoTip text="How much this grade moves your cumulative GPA up (+) or down (−). Any grade below your current GPA drags it down, even if it's a B." />
                      </th>
                      <th className="px-4 py-2 text-center">
                        Major
                        <InfoTip text="Tag courses that count toward your major to track your major GPA separately." />
                      </th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {displayCourses.map((course) => {
                      const impact = courseGPAImpact(course, totalUnits, cumulativeGPA);
                      const isMajor = majorIds.has(course.id);
                      return (
                        <tr key={course.id} className="hover:bg-zinc-800/40 transition-colors">
                          <td className="px-4 py-2 font-mono text-zinc-200 whitespace-nowrap">{course.code}</td>
                          <td className="px-4 py-2 text-zinc-400 max-w-xs truncate">{course.title}</td>
                          <td className="px-4 py-2 text-right text-zinc-300">{course.units}</td>
                          <td className={`px-4 py-2 text-right font-bold ${gradeColor(course.grade)}`}>
                            {course.grade}
                          </td>
                          <td className="px-4 py-2">
                            {course.countsTowardGPA ? (
                              <ImpactBar impact={impact} maxAbs={maxAbsImpact} />
                            ) : (
                              <span className="text-xs text-zinc-600">P/NP — not counted</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => onToggleMajor(course.id)}
                              title={isMajor ? 'Remove from major' : 'Mark as major course'}
                              className={`h-5 w-5 rounded transition-colors ${isMajor ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-zinc-500 hover:bg-zinc-600'}`}
                            >
                              <span className="text-[10px] font-bold">M</span>
                            </button>
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => onRemove(course.id)}
                              className="text-zinc-600 hover:text-red-400 transition-colors text-xs"
                              title="Remove course"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
