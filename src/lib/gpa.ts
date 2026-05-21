import type { Grade, Course, GPAData, HypotheticalCourse } from './types';

// Berkeley GPA scale: A+ and A both = 4.0
export const GRADE_POINTS: Record<string, number> = {
  'A+': 4.0,
  'A':  4.0,
  'A-': 3.7,
  'B+': 3.3,
  'B':  3.0,
  'B-': 2.7,
  'C+': 2.3,
  'C':  2.0,
  'C-': 1.7,
  'D+': 1.3,
  'D':  1.0,
  'D-': 0.7,
  'F':  0.0,
};

const NON_GPA_GRADES = new Set(['P', 'NP', 'S', 'U', 'I', 'W', 'IP', 'RD']);

export function getGradePoints(grade: string): number {
  return GRADE_POINTS[grade.toUpperCase()] ?? 0;
}

export function countsTowardGPA(grade: string): boolean {
  return !NON_GPA_GRADES.has(grade.toUpperCase());
}

export function buildCourse(
  id: string,
  term: string,
  code: string,
  title: string,
  units: number,
  grade: string
): Course {
  const upperGrade = grade.toUpperCase() as Grade;
  const gpaEligible = countsTowardGPA(upperGrade);
  const gradePoints = gpaEligible ? getGradePoints(upperGrade) : 0;
  return {
    id,
    term,
    code,
    title,
    units,
    grade: upperGrade,
    gradePoints,
    qualityPoints: gpaEligible ? units * gradePoints : 0,
    countsTowardGPA: gpaEligible,
  };
}

export function calculateGPA(courses: Course[]): GPAData {
  const gpaCourses = courses.filter((c) => c.countsTowardGPA);
  const totalUnits = gpaCourses.reduce((sum, c) => sum + c.units, 0);
  const totalQualityPoints = gpaCourses.reduce((sum, c) => sum + c.qualityPoints, 0);
  const cumulativeGPA = totalUnits > 0 ? totalQualityPoints / totalUnits : 0;
  return { courses, cumulativeGPA, totalUnits, totalQualityPoints };
}

export function calculateProjectedGPA(
  current: GPAData,
  hypothetical: HypotheticalCourse[]
): { projectedGPA: number; projectedUnits: number } {
  const hypoGPACourses = hypothetical.filter((c) => countsTowardGPA(c.grade));
  const addedUnits = hypoGPACourses.reduce((sum, c) => sum + c.units, 0);
  const addedQP = hypoGPACourses.reduce(
    (sum, c) => sum + c.units * getGradePoints(c.grade),
    0
  );
  const totalUnits = current.totalUnits + addedUnits;
  const totalQP = current.totalQualityPoints + addedQP;
  return {
    projectedGPA: totalUnits > 0 ? totalQP / totalUnits : 0,
    projectedUnits: totalUnits,
  };
}

// How much a course shifts the cumulative GPA relative to where it already sits.
// Positive = this grade is above your current GPA (pulling it up).
// Negative = this grade is below your current GPA (dragging it down).
export function courseGPAImpact(course: Course, totalUnits: number, cumulativeGPA: number): number {
  if (!course.countsTowardGPA || totalUnits === 0) return 0;
  return (course.gradePoints - cumulativeGPA) * course.units / totalUnits;
}

export function groupByTerm(courses: Course[]): Map<string, Course[]> {
  const map = new Map<string, Course[]>();
  for (const course of courses) {
    if (!map.has(course.term)) map.set(course.term, []);
    map.get(course.term)!.push(course);
  }
  return map;
}

export function termGPA(courses: Course[]): number {
  const gpaCourses = courses.filter((c) => c.countsTowardGPA);
  const units = gpaCourses.reduce((s, c) => s + c.units, 0);
  const qp = gpaCourses.reduce((s, c) => s + c.qualityPoints, 0);
  return units > 0 ? qp / units : 0;
}

const TERM_ORDER: Record<string, number> = { Spring: 0, Summer: 1, Fall: 2, Winter: 3 };

export function sortTerms(terms: string[]): string[] {
  return [...terms].sort((a, b) => {
    const [seasonA, yearA] = parseTerm(a);
    const [seasonB, yearB] = parseTerm(b);
    if (yearA !== yearB) return yearA - yearB;
    return (TERM_ORDER[seasonA] ?? 0) - (TERM_ORDER[seasonB] ?? 0);
  });
}

function parseTerm(term: string): [string, number] {
  const m = term.match(/(Spring|Summer|Fall|Winter)\s+(\d{4})/i);
  if (m) return [m[1], parseInt(m[2])];
  const m2 = term.match(/(\d{4})\s+(Spring|Summer|Fall|Winter)/i);
  if (m2) return [m2[2], parseInt(m2[1])];
  return [term, 0];
}

export interface TermDataPoint {
  term: string;
  termGPA: number;
  cumulativeGPA: number;
  termUnits: number;
  cumulativeUnits: number;
}

// UC GPA: same courses, but +/- modifiers are ignored (A- = 4.0, B+ = 3.0, etc.)
export const UC_GRADE_POINTS: Record<string, number> = {
  'A+': 4.0, 'A': 4.0, 'A-': 4.0,
  'B+': 3.0, 'B': 3.0, 'B-': 3.0,
  'C+': 2.0, 'C': 2.0, 'C-': 2.0,
  'D+': 1.0, 'D': 1.0, 'D-': 1.0,
  'F':  0.0,
};

export function calculateUCGPA(courses: Course[]): number {
  const gpaCourses = courses.filter((c) => c.countsTowardGPA);
  const totalUnits = gpaCourses.reduce((s, c) => s + c.units, 0);
  const totalQP = gpaCourses.reduce((s, c) => s + c.units * (UC_GRADE_POINTS[c.grade] ?? 0), 0);
  return totalUnits > 0 ? totalQP / totalUnits : 0;
}

export function buildGPATimeline(courses: Course[]): TermDataPoint[] {
  const termMap = groupByTerm(courses);
  const sortedTerms = sortTerms([...termMap.keys()]);

  let runningQP = 0;
  let runningUnits = 0;
  const points: TermDataPoint[] = [];

  for (const term of sortedTerms) {
    const termCourses = termMap.get(term)!;
    const gpaCourses = termCourses.filter((c) => c.countsTowardGPA);
    const tUnits = gpaCourses.reduce((s, c) => s + c.units, 0);
    const tQP = gpaCourses.reduce((s, c) => s + c.qualityPoints, 0);

    runningQP += tQP;
    runningUnits += tUnits;

    points.push({
      term,
      termGPA: tUnits > 0 ? tQP / tUnits : 0,
      cumulativeGPA: runningUnits > 0 ? runningQP / runningUnits : 0,
      termUnits: tUnits,
      cumulativeUnits: runningUnits,
    });
  }

  return points;
}
