'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useGPAStore } from '@/hooks/useGPAStore';
import type { Course } from '@/lib/types';

const GRADE_SCALE: { grade: string; points: number; note?: string }[] = [
  { grade: 'A+', points: 4.0, note: 'same as A at Berkeley' },
  { grade: 'A',  points: 4.0 },
  { grade: 'A-', points: 3.7 },
  { grade: 'B+', points: 3.3 },
  { grade: 'B',  points: 3.0 },
  { grade: 'B-', points: 2.7 },
  { grade: 'C+', points: 2.3 },
  { grade: 'C',  points: 2.0 },
  { grade: 'C-', points: 1.7 },
  { grade: 'D+', points: 1.3 },
  { grade: 'D',  points: 1.0 },
  { grade: 'D-', points: 0.7 },
  { grade: 'F',  points: 0.0 },
  { grade: 'P/NP', points: NaN, note: 'not counted in GPA' },
];

const GRADE_COLOR: Record<string, string> = {
  'A+': '#22c55e', 'A': '#22c55e', 'A-': '#4ade80',
  'B+': '#60a5fa', 'B': '#60a5fa', 'B-': '#93c5fd',
  'C+': '#fbbf24', 'C': '#fbbf24', 'C-': '#fcd34d',
  'D+': '#f87171', 'D': '#f87171', 'D-': '#fca5a5',
  'F': '#ef4444',
  'P/NP': '#71717a',
};

function GradeScale() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 transition-colors"
      >
        <span>Berkeley GPA scale reference</span>
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
            {GRADE_SCALE.map(({ grade, points, note }) => {
              const color = GRADE_COLOR[grade] ?? '#71717a';
              const barWidth = isNaN(points) ? 0 : (points / 4.0) * 100;
              return (
                <div key={grade} className="flex items-center gap-2">
                  <span className="w-10 text-right font-mono text-xs font-bold" style={{ color }}>
                    {grade}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${barWidth}%`, background: color, opacity: 0.75 }}
                    />
                  </div>
                  <span className="w-8 font-mono text-xs text-zinc-400">
                    {isNaN(points) ? '—' : points.toFixed(1)}
                  </span>
                  {note && (
                    <span className="text-[10px] text-zinc-600 hidden sm:inline">{note}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const TranscriptUpload = dynamic(() => import('@/components/TranscriptUpload'), { ssr: false });
const GPADashboard = dynamic(() => import('@/components/GPADashboard'), { ssr: false });
const CourseTable = dynamic(() => import('@/components/CourseTable'), { ssr: false });
const WhatIfSimulator = dynamic(() => import('@/components/WhatIfSimulator'), { ssr: false });
const Insights = dynamic(() => import('@/components/Insights'), { ssr: false });
const GPATarget = dynamic(() => import('@/components/GPATarget'), { ssr: false });
const RetakeSimulator = dynamic(() => import('@/components/RetakeSimulator'), { ssr: false });
const CurrentTermSimulator = dynamic(() => import('@/components/CurrentTermSimulator'), { ssr: false });
const UpcomingCoursesSimulator = dynamic(() => import('@/components/UpcomingCoursesSimulator'), { ssr: false });

type Tab = 'upload' | 'courses' | 'insights' | 'whatif';

export default function Home() {
  const {
    courses, gpaData, hypothetical, setHypothetical,
    majorIds, toggleMajor, majorGPAData,
    addCourses, replaceCourses, removeCourse, clearAll, projected, loaded,
  } = useGPAStore();

  function handleExportCSV() {
    const header = 'Term,Code,Title,Units,Grade,Grade Points,Quality Points,Major\n';
    const rows = courses.map((c) =>
      `"${c.term}","${c.code}","${c.title}",${c.units},${c.grade},${c.gradePoints},${c.qualityPoints.toFixed(3)},${majorIds.has(c.id) ? 'Yes' : 'No'}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'berkeley-gpa.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const [tab, setTab] = useState<Tab>('upload');
  const [importMode, setImportMode] = useState<'add' | 'replace'>('replace');
  const [showImportPrompt, setShowImportPrompt] = useState(false);
  const [pendingCourses, setPendingCourses] = useState<Course[]>([]);

  const hasCourses = courses.length > 0;

  function handleCoursesFound(found: Course[]) {
    if (hasCourses) {
      setPendingCourses(found);
      setShowImportPrompt(true);
    } else {
      replaceCourses(found);
      setTab('courses');
    }
  }

  function confirmImport() {
    if (importMode === 'replace') replaceCourses(pendingCourses);
    else addCourses(pendingCourses);
    setShowImportPrompt(false);
    setPendingCourses([]);
    setTab('courses');
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'upload', label: 'Import Transcript' },
    { key: 'courses', label: `Courses${hasCourses ? ` (${courses.length})` : ''}` },
    { key: 'insights', label: 'Insights' },
    { key: 'whatif', label: 'What-If' },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-1">
          <p
            className="text-3xl font-medium tracking-wide"
            style={{ fontFamily: 'var(--font-eb-garamond)', color: '#FDB515' }}
          >
            UC Berkeley
          </p>
          <h1 className="text-3xl font-bold tracking-tight">GPA Calculator</h1>
          <p className="text-zinc-400 text-sm pt-1">
            Upload your CalCentral transcript — everything runs in your browser, nothing is stored on a server.
          </p>
        </div>

        {/* GPA Summary */}
        {loaded && hasCourses && (
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            <GPADashboard
              gpaData={gpaData}
              majorGPAData={majorGPAData}
              projectedGPA={hypothetical.length > 0 ? projected.projectedGPA : undefined}
              projectedUnits={hypothetical.length > 0 ? projected.projectedUnits : undefined}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-zinc-800">
          <nav className="flex gap-1">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors
                  ${tab === key
                    ? 'bg-zinc-800 text-white border-b-2 border-blue-500'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          {tab === 'upload' && (
            <div className="space-y-4">
              <TranscriptUpload onCoursesFound={handleCoursesFound} />
              {hasCourses && (
                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                  <p className="text-xs text-zinc-500">{courses.length} courses currently loaded</p>
                  <button
                    onClick={() => { if (confirm('Clear all courses?')) clearAll(); }}
                    className="text-xs text-red-500 hover:text-red-400 underline"
                  >
                    Clear all data
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'courses' && (
            <CourseTable
              courses={courses}
              totalUnits={gpaData.totalUnits}
              cumulativeGPA={gpaData.cumulativeGPA}
              majorIds={majorIds}
              onRemove={removeCourse}
              onToggleMajor={toggleMajor}
              onExport={handleExportCSV}
            />
          )}

          {tab === 'insights' && (
            <Insights courses={courses} gpaData={gpaData} />
          )}

          {tab === 'whatif' && (
            <div className="space-y-6">
              <UpcomingCoursesSimulator courses={courses} gpaData={gpaData} />
              <CurrentTermSimulator gpaData={gpaData} courses={courses} />
              <WhatIfSimulator
                hypothetical={hypothetical}
                onChange={setHypothetical}
                currentGPA={gpaData.cumulativeGPA}
                projectedGPA={projected.projectedGPA}
                projectedUnits={projected.projectedUnits}
                currentUnits={gpaData.totalUnits}
              />
              <GPATarget gpaData={gpaData} />
              <RetakeSimulator courses={courses} gpaData={gpaData} />
            </div>
          )}
        </div>

        <GradeScale />

        <p className="text-center text-xs text-zinc-600">
          Built for Cal students · GPA calculated per Berkeley&apos;s 4.0 scale · A+ = 4.0 · P/NP excluded
        </p>
      </div>

      {/* Import mode modal */}
      {showImportPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h2 className="font-semibold text-lg">Import {pendingCourses.length} courses</h2>
            <p className="text-sm text-zinc-400">
              You already have {courses.length} courses loaded. What would you like to do?
            </p>
            <div className="space-y-2">
              {(['replace', 'add'] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value={mode}
                    checked={importMode === mode}
                    onChange={() => setImportMode(mode)}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-zinc-300">
                    {mode === 'replace'
                      ? 'Replace existing courses with new ones'
                      : 'Add to existing courses (skips duplicates)'}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowImportPrompt(false); setPendingCourses([]); }}
                className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmImport}
                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium hover:bg-blue-500 transition-colors"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
