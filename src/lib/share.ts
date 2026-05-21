import { buildCourse } from './gpa';
import type { Course } from './types';

interface ShareData {
  v: 1;
  c: Array<[string, string, string, number, string]>; // [term, code, title, units, grade]
  m: number[]; // indices into c[] that are major courses
}

export function encodeShareUrl(courses: Course[], majorIds: Set<string>): string {
  const data: ShareData = {
    v: 1,
    c: courses.map((c) => [c.term, c.code, c.title, c.units, c.grade as string]),
    m: courses.reduce<number[]>((acc, c, i) => {
      if (majorIds.has(c.id)) acc.push(i);
      return acc;
    }, []),
  };
  const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
  return `${window.location.origin}${window.location.pathname}#share=${encoded}`;
}

export function decodeShareHash(hash: string): { courses: Course[]; majorIndices: number[] } | null {
  try {
    const encoded = hash.replace(/^#?share=/, '');
    if (!encoded) return null;
    const json = decodeURIComponent(atob(encoded));
    const data = JSON.parse(json) as ShareData;
    if (data.v !== 1 || !Array.isArray(data.c)) return null;
    const courses = data.c.map(([term, code, title, units, grade], i) =>
      buildCourse(`shared-${i}`, term, code, title, units, grade)
    );
    return { courses, majorIndices: Array.isArray(data.m) ? data.m : [] };
  } catch {
    return null;
  }
}
