export type Grade =
  | 'A+' | 'A' | 'A-'
  | 'B+' | 'B' | 'B-'
  | 'C+' | 'C' | 'C-'
  | 'D+' | 'D' | 'D-'
  | 'F'
  | 'P' | 'NP'
  | 'S' | 'U'
  | 'I' | 'W';

export interface Course {
  id: string;
  term: string;
  code: string;
  title: string;
  units: number;
  grade: Grade;
  gradePoints: number; // grade point value (e.g. A- = 3.7)
  qualityPoints: number; // units × gradePoints
  countsTowardGPA: boolean;
}

export interface Term {
  name: string;
  courses: Course[];
  termGPA: number;
  termUnits: number;
}

export interface GPAData {
  courses: Course[];
  cumulativeGPA: number;
  totalUnits: number;
  totalQualityPoints: number;
}

export interface HypotheticalCourse {
  id: string;
  code: string;
  units: number;
  grade: Grade;
}
