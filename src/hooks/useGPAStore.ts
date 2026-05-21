'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Course, HypotheticalCourse } from '@/lib/types';
import { calculateGPA, calculateProjectedGPA } from '@/lib/gpa';

const COURSES_KEY   = 'berkeley-gpa-courses';
const MAJOR_IDS_KEY = 'berkeley-gpa-major-ids';
const GRAD_UNITS_KEY = 'berkeley-gpa-grad-units';

export function useGPAStore() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [hypothetical, setHypothetical] = useState<HypotheticalCourse[]>([]);
  const [majorIds, setMajorIds] = useState<Set<string>>(new Set());
  const [graduationUnits, setGraduationUnitsState] = useState(120);
  const [loaded, setLoaded] = useState(false);

  // Load everything from localStorage once
  useEffect(() => {
    try {
      const c = localStorage.getItem(COURSES_KEY);
      if (c) setCourses(JSON.parse(c));
      const m = localStorage.getItem(MAJOR_IDS_KEY);
      if (m) setMajorIds(new Set(JSON.parse(m)));
      const g = localStorage.getItem(GRAD_UNITS_KEY);
      if (g) setGraduationUnitsState(parseInt(g));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
  }, [courses, loaded]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(MAJOR_IDS_KEY, JSON.stringify([...majorIds]));
  }, [majorIds, loaded]);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(GRAD_UNITS_KEY, String(graduationUnits));
  }, [graduationUnits, loaded]);

  const addCourses = useCallback((newCourses: Course[]) => {
    setCourses((prev) => {
      const existing = new Set(prev.map((c) => `${c.term}|${c.code}`));
      const toAdd = newCourses.filter((c) => !existing.has(`${c.term}|${c.code}`));
      return [...prev, ...toAdd];
    });
  }, []);

  const replaceCourses = useCallback((newCourses: Course[]) => {
    setCourses(newCourses);
  }, []);

  const removeCourse = useCallback((id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    setMajorIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }, []);

  const toggleMajor = useCallback((id: string) => {
    setMajorIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const setGraduationUnits = useCallback((n: number) => {
    setGraduationUnitsState(n);
  }, []);

  const clearAll = useCallback(() => {
    setCourses([]);
    setHypothetical([]);
    setMajorIds(new Set());
  }, []);

  const loadShare = useCallback((newCourses: Course[], newMajorIds: Set<string>) => {
    setCourses(newCourses);
    setMajorIds(newMajorIds);
    setHypothetical([]);
  }, []);

  const gpaData = calculateGPA(courses);
  const majorCourses = courses.filter((c) => majorIds.has(c.id));
  const majorGPAData = calculateGPA(majorCourses);
  const projected = calculateProjectedGPA(gpaData, hypothetical);

  return {
    courses,
    hypothetical,
    setHypothetical,
    majorIds,
    toggleMajor,
    majorGPAData,
    graduationUnits,
    setGraduationUnits,
    addCourses,
    replaceCourses,
    removeCourse,
    clearAll,
    loadShare,
    gpaData,
    projected,
    loaded,
  };
}
