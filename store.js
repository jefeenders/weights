// Data model and persistence. All update functions are pure: they return new data.

const STORAGE_KEY = 'lift-tracker/v1';
const DAY_MS = 24 * 60 * 60 * 1000;

export const emptyData = () => ({ version: 1, exercises: [], sets: [], lastExport: null });

export function normalise(obj) {
  if (!obj || !Array.isArray(obj.exercises) || !Array.isArray(obj.sets)) {
    throw new Error('This file is not a Lift Tracker backup.');
  }
  return { version: 1, exercises: obj.exercises, sets: obj.sets, lastExport: obj.lastExport ?? null };
}

export function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? normalise(JSON.parse(raw)) : emptyData();
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

// Formatting
export const roundKg = (kg) => Math.round(kg * 100) / 100;
export const formatKg = (kg) => (Number.isInteger(kg * 2) ? kg.toFixed(1) : kg.toFixed(2));
export const parseKg = (text) => Number(String(text).trim().replace(',', '.'));

// Exercises
export function addExercise(data, name, baseline, step) {
  const exercise = { id: crypto.randomUUID(), name, baseline: roundKg(baseline), step };
  return { ...data, exercises: [...data.exercises, exercise] };
}

export function removeExercise(data, id) {
  return {
    ...data,
    exercises: data.exercises.filter((e) => e.id !== id),
    sets: data.sets.filter((s) => s.exerciseId !== id),
  };
}

export function moveExercise(data, id, delta) {
  const list = [...data.exercises];
  const from = list.findIndex((e) => e.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= list.length) return data;
  [list[from], list[to]] = [list[to], list[from]];
  return { ...data, exercises: list };
}

// Sets (stored in chronological order)
export function addSet(data, exerciseId, weight, reps, at = new Date()) {
  const set = { exerciseId, weight: roundKg(weight), reps, at: at.toISOString() };
  return { ...data, sets: [...data.sets, set] };
}

export function removeLastSet(data, exerciseId) {
  const index = data.sets.findLastIndex((s) => s.exerciseId === exerciseId);
  return index < 0 ? data : { ...data, sets: data.sets.filter((_, i) => i !== index) };
}

export const setsFor = (data, exerciseId) => data.sets.filter((s) => s.exerciseId === exerciseId);
export const lastSet = (data, exerciseId) => setsFor(data, exerciseId).at(-1) ?? null;
export const lastWeight = (data, exercise) => lastSet(data, exercise.id)?.weight ?? exercise.baseline;

const isSameDay = (a, b) => a.toDateString() === b.toDateString();
export const todaysSets = (data, exerciseId, now = new Date()) =>
  setsFor(data, exerciseId).filter((s) => isSameDay(new Date(s.at), now));

// Consecutive identical sets collapse into one group: 10×5, 10×5, 12.5×4 -> [2 × 10×5, 1 × 12.5×4].
const sameSet = (a, b) => a.weight === b.weight && a.reps === b.reps;
export const groupSets = (sets) =>
  sets.reduce((groups, s) => {
    const last = groups.at(-1);
    return last && sameSet(last, s)
      ? [...groups.slice(0, -1), { ...last, count: last.count + 1 }]
      : [...groups, { weight: s.weight, reps: s.reps, count: 1 }];
  }, []);
export const summariseSets = (sets) =>
  groupSets(sets).map((g) => `${g.count} × ${formatKg(g.weight)} kg × ${g.reps}`).join(', ');

// Weight grid: starts at the last weight, each "lighter" press adds one row below it.
export function weightOptions(last, step, lighterRows, count = 20, columns = 4) {
  const start = Math.max(0, roundKg(last - lighterRows * columns * step));
  return Array.from({ length: count }, (_, i) => roundKg(start + i * step));
}

// Backup reminder
export const markExported = (data, at = new Date()) => ({ ...data, lastExport: at.toISOString() });

export const daysSinceExport = (data, now = new Date()) =>
  data.lastExport ? Math.floor((now - new Date(data.lastExport)) / DAY_MS) : null;

export function isBackupDue(data, maxDays = 3, now = new Date()) {
  if (data.sets.length === 0) return false;
  const days = daysSinceExport(data, now);
  return days === null || days >= maxDays;
}
