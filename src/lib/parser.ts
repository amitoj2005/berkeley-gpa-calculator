import { buildCourse } from './gpa';
import type { Course } from './types';

let idCounter = 0;
function nextId() {
  return `course-${++idCounter}`;
}

const VALID_GRADES = new Set([
  'A+','A','A-','B+','B','B-','C+','C','C-','D+','D','D-','F',
  'P','NP','S','U','I','W','IP','RD',
]);

// Term patterns: "2023 Fall", "Fall 2023", "Spring 2024", "Summer 2023"
const TERM_PATTERNS = [
  /\b(20\d{2})\s+(Spring|Summer|Fall|Winter)\b/i,
  /\b(Spring|Summer|Fall|Winter)\s+(20\d{2})\b/i,
];

function normalizeTerm(raw: string): string {
  let m = raw.match(TERM_PATTERNS[0]);
  if (m) return `${m[2]} ${m[1]}`;
  m = raw.match(TERM_PATTERNS[1]);
  if (m) return `${m[1]} ${m[2]}`;
  return raw.trim();
}

// Matches Berkeley course codes: COMPSCI 61A, MATH 1A, EECS 16A, MCELLBI W61, ESPM C22AC, AHMA R1B
const COURSE_CODE_RE = /\b([A-Z][A-Z&\s]{0,10}?)\s+([A-Z]?\d{1,3}[A-Z]{0,3})\b/;

// Lines that are definitely not course lines
const SKIP_LINE_RE = /transcript|unofficial|student|campus|units attempted|grade points|cumulative|semester|term gpa|dean|semester totals|page \d|printed|berkeley|^uc |earned:|attempted:|gpa:/i;
// Session suffix continuation lines like "A)" or "B)" that wrap from a class code cell
const SESSION_CONTINUATION_RE = /^[A-Z0-9]{1,3}\)$/;

interface RawCourseCandidate {
  term: string;
  code: string;
  title: string;
  units: number;
  grade: string;
}

/**
 * Main parser: takes raw text extracted from a Berkeley transcript PDF
 * and returns a list of Course objects.
 *
 * Berkeley CalCentral PDF transcript format (typical layout per line):
 *   COURSE_CODE  COURSE_TITLE  UNITS  GRADE  GRADE_POINTS
 * e.g.:
 *   COMPSCI 61A  Structure and Interpretation of Computer Programs  4.0  A  16.0
 */
export function parseTranscript(text: string): Course[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const courses: Course[] = [];
  let currentTerm = 'Unknown';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect term headers
    const termMatch = TERM_PATTERNS[0].exec(line) || TERM_PATTERNS[1].exec(line);
    if (termMatch) {
      currentTerm = normalizeTerm(line);
      continue;
    }

    if (SKIP_LINE_RE.test(line)) continue;
    if (SESSION_CONTINUATION_RE.test(line)) continue;

    // Try to parse a course row
    const candidate = parseCourseRow(line, currentTerm);
    if (candidate) {
      courses.push(
        buildCourse(
          nextId(),
          candidate.term,
          candidate.code,
          candidate.title,
          candidate.units,
          candidate.grade
        )
      );
    }
  }

  return courses;
}

function parseCourseRow(line: string, term: string): RawCourseCandidate | null {
  // Look for a grade (letter grade) somewhere in the line
  // and a units number (e.g. 3.0, 4.0, 1.0)

  // Tokenize — split on 2+ spaces or tabs (transcript columns)
  const tokens = line.split(/\s{2,}|\t/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length < 3) return null;

  // Find grade token
  let gradeIdx = -1;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i].toUpperCase();
    if (VALID_GRADES.has(t)) {
      gradeIdx = i;
      break;
    }
  }
  if (gradeIdx === -1) return null;

  // Find units — typically a float like 3.0 or integer 4 before the grade
  let unitsIdx = -1;
  let units = 0;
  for (let i = gradeIdx - 1; i >= 0; i--) {
    const n = parseFloat(tokens[i]);
    if (!isNaN(n) && n > 0 && n <= 12) {
      unitsIdx = i;
      units = n;
      break;
    }
  }
  if (unitsIdx === -1) return null;

  // First token should contain the course code; strip any "(Session X)" suffix
  const firstToken = tokens[0].replace(/\s*\(Session[^)]*\)?/i, '').trim();
  const codeMatch = COURSE_CODE_RE.exec(firstToken);
  if (!codeMatch) return null;

  const code = `${codeMatch[1].trim()} ${codeMatch[2]}`;
  // Everything between course code and units is the title
  const titleParts = tokens.slice(1, unitsIdx);
  const title = titleParts.join(' ') || code;

  return { term, code, title, units, grade: tokens[gradeIdx] };
}

/**
 * Parser for CalCentral "Grades" page screenshots.
 *
 * Layout (from OCR of the table):
 *   Fall 2025 →          ← term header (→ or > from OCR)
 *   INDENG 150  Production Systems Analysis  3.0  A
 *   INDENG 153  Logistics Network Design and  3.0  A-
 *   Supply Chain Management                         ← title continuation — no units/grade
 *
 * Strategy: scan for lines that START with a course code AND END with units+grade.
 * Lines that don't match (continuation titles, empty, headers) are skipped.
 */
export function parseGradesPage(text: string): Course[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const courses: Course[] = [];
  let currentTerm = 'Unknown';

  // Term header: "Fall 2025 →", "Fall 2025 >", "Fall 2025", "2025 Fall"
  const termHeaderRe = /\b((?:Spring|Summer|Fall|Winter)\s+20\d{2}|20\d{2}\s+(?:Spring|Summer|Fall|Winter))\b/i;

  // A line that IS a course row: starts with DEPT NNN, ends with UNITS GRADE
  // e.g. "INDENG 150  Production Systems Analysis  3.0  A"
  // Allow single-space separated tokens (OCR sometimes collapses spacing)
  const courseRowRe =
    /^([A-Z][A-Z&]{1,12}\s+[A-Z]?\d{1,3}[A-Z]{0,3})\s+(.+?)\s+([\d]+(?:\.\d+)?)\s+(A\+|A-|A|B\+|B-|B|C\+|C-|C|D\+|D-|D|F|NP|P|S|U|I|W)\s*$/i;

  for (const line of lines) {
    // Term header detection
    const tm = termHeaderRe.exec(line);
    if (tm) {
      currentTerm = normalizeTerm(line);
      continue;
    }

    const m = courseRowRe.exec(line);
    if (!m) continue;
    const units = parseFloat(m[3]);
    if (isNaN(units) || units <= 0 || units > 12) continue;
    courses.push(buildCourse(nextId(), currentTerm, m[1].trim(), m[2].trim(), units, m[4]));
  }

  return courses;
}

/**
 * Fallback line-by-line parser for less structured text (e.g. from OCR).
 * More permissive — tries harder to find course-like patterns.
 */
export function parseTranscriptFuzzy(text: string): Course[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const courses: Course[] = [];
  let currentTerm = 'Unknown';

  // Regex: optionally start with course code, then look for units + grade at end
  // e.g. "COMPSCI 61A   Structure...   4.0   A"
  // or   "61A Structure... 4 A"
  const courseLineRe =
    /([A-Z][A-Z&]{1,10}\s+[A-Z]?\d{1,3}[A-Z]{0,3})\s+(.+?)\s+([\d.]+)\s+(A\+?|A-?|B\+?|B-?|C\+?|C-?|D\+?|D-?|F|P|NP|S|U|I|W)\b/i;

  for (const line of lines) {
    const termMatch = TERM_PATTERNS[0].exec(line) || TERM_PATTERNS[1].exec(line);
    if (termMatch) {
      currentTerm = normalizeTerm(line);
      continue;
    }

    const m = courseLineRe.exec(line);
    if (m) {
      const units = parseFloat(m[3]);
      if (isNaN(units) || units <= 0 || units > 12) continue;
      courses.push(buildCourse(nextId(), currentTerm, m[1].trim(), m[2].trim(), units, m[4]));
    }
  }

  return courses;
}
