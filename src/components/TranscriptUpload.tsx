'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { extractTextFromPDF, extractTextFromImage } from '@/lib/pdfExtract';
import { parseTranscript, parseTranscriptFuzzy, parseGradesPage } from '@/lib/parser';
import type { Course } from '@/lib/types';

interface Props {
  onCoursesFound: (courses: Course[]) => void;
}

// ── File upload (PDF / image) ─────────────────────────────────────────────────

type FileStatus = 'extracting' | 'parsing' | 'done' | 'error';

interface FileJob {
  id: string;
  name: string;
  status: FileStatus;
  message: string;
  courses: number;
}

let jobId = 0;
function mkId() { return `job-${++jobId}`; }

async function processFile(file: File): Promise<{ courses: Course[]; msg: string }> {
  let text: string;
  if (file.type === 'application/pdf') {
    const { extractTextFromPDF: extract } = await import('@/lib/pdfExtract');
    text = await extract(file);
  } else {
    const { extractTextFromImage: ocrExtract } = await import('@/lib/pdfExtract');
    text = await ocrExtract(file);
  }

  // Try most-specific parsers first
  let courses = parseGradesPage(text);
  if (courses.length === 0) courses = parseTranscript(text);
  if (courses.length === 0) courses = parseTranscriptFuzzy(text);

  if (courses.length === 0) {
    throw new Error('No courses found. Check the file is a CalCentral transcript or grades screenshot.');
  }
  return { courses, msg: `${courses.length} course${courses.length !== 1 ? 's' : ''} found` };
}

// ── Paste queue ───────────────────────────────────────────────────────────────

interface PastedImage {
  id: string;
  previewUrl: string;
  blob: Blob;
  status: 'queued' | 'processing' | 'done' | 'error';
  courses: number;
  error?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TranscriptUpload({ onCoursesFound }: Props) {
  const [dragging, setDragging] = useState(false);
  const [fileJobs, setFileJobs] = useState<FileJob[]>([]);
  const [pastedImages, setPastedImages] = useState<PastedImage[]>([]);
  const pasteZoneRef = useRef<HTMLDivElement>(null);

  // ── File handler ────────────────────────────────────────────────────────────
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.type.startsWith('image/')
    );
    if (!arr.length) return;

    const newJobs: FileJob[] = arr.map((f) => ({
      id: mkId(), name: f.name,
      status: 'extracting', message: 'Reading…', courses: 0,
    }));
    setFileJobs((prev) => [...prev, ...newJobs]);

    for (let i = 0; i < arr.length; i++) {
      const job = newJobs[i];
      const file = arr[i];
      try {
        setFileJobs((prev) => prev.map((j) =>
          j.id === job.id ? { ...j, status: 'parsing', message: file.type === 'application/pdf' ? 'Extracting text…' : 'Running OCR…' } : j
        ));
        const { courses, msg } = await processFile(file);
        setFileJobs((prev) => prev.map((j) =>
          j.id === job.id ? { ...j, status: 'done', message: msg, courses: courses.length } : j
        ));
        onCoursesFound(courses);
      } catch (err) {
        setFileJobs((prev) => prev.map((j) =>
          j.id === job.id
            ? { ...j, status: 'error', message: err instanceof Error ? err.message : String(err) }
            : j
        ));
      }
    }
  }, [onCoursesFound]);

  // ── Paste handler ───────────────────────────────────────────────────────────
  const handlePasteEvent = useCallback(async (e: ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items ?? []);
    const imageItems = items.filter((it) => it.type.startsWith('image/'));
    if (!imageItems.length) return;
    e.preventDefault();

    const blobs = imageItems.map((it) => it.getAsFile()).filter(Boolean) as File[];
    const newEntries: PastedImage[] = blobs.map((blob) => ({
      id: mkId(),
      previewUrl: URL.createObjectURL(blob),
      blob,
      status: 'queued',
      courses: 0,
    }));

    setPastedImages((prev) => [...prev, ...newEntries]);

    for (const entry of newEntries) {
      setPastedImages((prev) => prev.map((p) =>
        p.id === entry.id ? { ...p, status: 'processing' } : p
      ));
      try {
        const { courses, msg } = await processFile(
          new File([entry.blob], 'screenshot.png', { type: entry.blob.type })
        );
        setPastedImages((prev) => prev.map((p) =>
          p.id === entry.id ? { ...p, status: 'done', courses: courses.length } : p
        ));
        onCoursesFound(courses);
      } catch (err) {
        setPastedImages((prev) => prev.map((p) =>
          p.id === entry.id
            ? { ...p, status: 'error', error: err instanceof Error ? err.message : String(err) }
            : p
        ));
      }
    }
  }, [onCoursesFound]);

  // Listen for paste globally while mounted
  useEffect(() => {
    document.addEventListener('paste', handlePasteEvent);
    return () => document.removeEventListener('paste', handlePasteEvent);
  }, [handlePasteEvent]);

  const clearPasted = useCallback((id: string) => {
    setPastedImages((prev) => {
      const entry = prev.find((p) => p.id === id);
      if (entry) URL.revokeObjectURL(entry.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  // ── Render helpers ──────────────────────────────────────────────────────────
  const statusIcon = (status: PastedImage['status'] | FileStatus) => {
    if (status === 'queued' || status === 'extracting' || status === 'parsing' || status === 'processing')
      return <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />;
    if (status === 'done') return <span className="text-green-400">✓</span>;
    if (status === 'error') return <span className="text-red-400">✕</span>;
    return null;
  };

  return (
    <div className="space-y-6">

      {/* ── PDF / file drop zone ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Option 1 — Upload transcript PDF
        </p>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors
            ${dragging ? 'border-blue-400 bg-blue-950/30' : 'border-zinc-600 hover:border-zinc-400 bg-zinc-900/40'}`}
        >
          <svg className="h-8 w-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-zinc-300">
            Drop PDF here, or{' '}
            <label className="cursor-pointer text-blue-400 underline hover:text-blue-300">
              browse
              <input
                type="file"
                accept=".pdf,image/*"
                multiple
                className="sr-only"
                onChange={(e) => { handleFiles(e.target.files!); e.target.value = ''; }}
              />
            </label>
          </p>
          <p className="text-xs text-zinc-500">PDF recommended · images also accepted</p>
        </div>

        {fileJobs.length > 0 && (
          <ul className="mt-2 space-y-1">
            {fileJobs.map((j) => (
              <li key={j.id} className="flex items-center gap-2 text-sm">
                {statusIcon(j.status)}
                <span className="text-zinc-400 truncate max-w-xs">{j.name}</span>
                <span className={j.status === 'error' ? 'text-red-400' : j.status === 'done' ? 'text-green-400' : 'text-blue-400'}>
                  {j.message}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Paste screenshot zone ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
          Option 2 — Paste CalCentral grades screenshots
        </p>

        <div
          ref={pasteZoneRef}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-center hover:border-zinc-500 transition-colors cursor-default"
        >
          <div className="flex items-center gap-2 text-zinc-400">
            <kbd className="rounded bg-zinc-700 px-2 py-0.5 text-xs font-mono text-zinc-300">Ctrl+V</kbd>
            <span className="text-sm">to paste a screenshot anywhere on this page</span>
          </div>
          <p className="text-xs text-zinc-500">
            Paste as many screenshots as you need — each term can be a separate image
          </p>
        </div>

        {/* Pasted image queue */}
        {pastedImages.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pastedImages.map((img) => (
              <div
                key={img.id}
                className="relative flex gap-3 rounded-lg border border-zinc-700 bg-zinc-800 p-3"
              >
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.previewUrl}
                  alt="pasted screenshot"
                  className="h-16 w-24 flex-shrink-0 rounded object-cover object-top border border-zinc-700"
                />
                <div className="flex flex-col justify-center gap-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm">
                    {statusIcon(img.status)}
                    <span className={
                      img.status === 'done' ? 'text-green-400' :
                      img.status === 'error' ? 'text-red-400' :
                      'text-blue-400'
                    }>
                      {img.status === 'queued' && 'Queued…'}
                      {img.status === 'processing' && 'Reading with OCR…'}
                      {img.status === 'done' && `${img.courses} course${img.courses !== 1 ? 's' : ''} found`}
                      {img.status === 'error' && 'Failed'}
                    </span>
                  </div>
                  {img.status === 'error' && img.error && (
                    <p className="text-xs text-red-400 leading-tight">{img.error}</p>
                  )}
                </div>
                <button
                  onClick={() => clearPasted(img.id)}
                  className="absolute right-2 top-2 text-zinc-600 hover:text-zinc-300 text-xs"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── How to get transcript ── */}
      <div className="rounded-lg bg-zinc-900 p-4 text-xs text-zinc-400 space-y-3">
        <div>
          <p className="font-semibold text-zinc-300 mb-1">For screenshots (grades page):</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Go to <span className="text-zinc-200">calcentral.berkeley.edu</span> → My Academics → Grades</li>
            <li>Screenshot each semester&apos;s grade table</li>
            <li>Paste directly here with <kbd className="rounded bg-zinc-800 px-1 py-0.5 font-mono">Ctrl+V</kbd></li>
          </ol>
        </div>
        <div>
          <p className="font-semibold text-zinc-300 mb-1">For the PDF (more accurate):</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Go to <span className="text-zinc-200">calcentral.berkeley.edu</span> → My Academics</li>
            <li>Click <span className="text-zinc-200">View Academic Summary</span></li>
            <li>Click <span className="text-zinc-200">Print</span> (top right) → Save as PDF</li>
            <li>Upload the PDF above</li>
          </ol>
        </div>
        <p className="text-zinc-500">Nothing leaves your browser — no server, no uploads.</p>
      </div>
    </div>
  );
}
