import * as S from './store.js';
import { exportData, readBackup } from './backup.js';

const root = document.getElementById('app');

let data = S.loadData();
let view = { screen: 'list', exerciseId: null, weight: null, lighterRows: 0 };

// ---------- helpers ----------

const esc = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const icon = (path, size = 20, width = 2) =>
  `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;

const ICONS = {
  plus: icon('M12 5v14M5 12h14', 22, 2.5),
  chevronRight: icon('M9 6l6 6-6 6'),
  chevronLeft: icon('M15 6l-6 6 6 6', 20, 2.2),
  up: icon('M6 15l6-6 6 6'),
  down: icon('M6 9l6 6 6-6'),
  trash: icon('M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3'),
};

const currentExercise = () => data.exercises.find((e) => e.id === view.exerciseId);

function commit(next) {
  data = S.saveData(next);
  render();
}

function go(patch) {
  view = { ...view, ...patch };
  render();
  window.scrollTo(0, 0);
}

function backupLabel() {
  const days = S.daysSinceExport(data);
  if (days === null) return 'Not backed up yet';
  if (days === 0) return 'Last backup today';
  return `Last backup ${days} day${days === 1 ? '' : 's'} ago`;
}

// ---------- pieces ----------

const backButton = (label, action) =>
  `<button class="link back" data-action="${action}">${ICONS.chevronLeft}${label}</button>`;

const backupBanner = () => `
  <div class="banner">
    <p>${backupLabel()}</p>
    <button class="btn btn--accent" data-action="export">Back up now</button>
  </div>`;

function exerciseTile(ex) {
  const last = S.lastSet(data, ex.id);
  const sub = last ? `Last ${S.formatKg(last.weight)} kg × ${last.reps}` : `Start at ${S.formatKg(ex.baseline)} kg`;
  return `
    <button class="tile tile--row" data-action="open" data-id="${ex.id}">
      <span class="tile__text"><span class="tile__title">${esc(ex.name)}</span><span class="tile__sub">${sub}</span></span>
      ${ICONS.chevronRight}
    </button>`;
}

function editRow(ex, index, count) {
  const name = esc(ex.name);
  return `
    <div class="row">
      <span class="row__name">${name}<small>${S.formatKg(ex.step)} kg steps</small></span>
      <button class="icon-btn" data-action="up" data-id="${ex.id}" aria-label="Move ${name} up" ${index === 0 ? 'disabled' : ''}>${ICONS.up}</button>
      <button class="icon-btn" data-action="down" data-id="${ex.id}" aria-label="Move ${name} down" ${index === count - 1 ? 'disabled' : ''}>${ICONS.down}</button>
      <button class="icon-btn icon-btn--danger" data-action="delete" data-id="${ex.id}" aria-label="Delete ${name}">${ICONS.trash}</button>
    </div>`;
}

function todayCard(ex) {
  const sets = S.todaysSets(data, ex.id);
  if (sets.length === 0) return '';
  const rows = sets
    .map((s, i) => `<div class="log-row"><span>Set ${i + 1}</span><span>${S.formatKg(s.weight)} kg × ${s.reps}</span></div>`)
    .join('');
  return `
    <section class="card">
      <div class="card__head"><h2>Today</h2><button class="link link--small" data-action="undo">Undo last set</button></div>
      ${rows}
    </section>`;
}

function todaySummaryRow(ex) {
  const sets = S.todaysSets(data, ex.id);
  return sets.length ? `<div class="log-row"><span>${esc(ex.name)}</span><span>${S.summariseSets(sets)}</span></div>` : '';
}

function todaySummary() {
  const rows = data.exercises.map(todaySummaryRow).join('');
  return rows ? `<section class="card"><h2>Today</h2>${rows}</section>` : '';
}

function repeatButton(ex) {
  const last = S.todaysSets(data, ex.id).at(-1);
  return last
    ? `<button class="btn btn--accent" data-action="repeat">Repeat set: ${S.formatKg(last.weight)} kg × ${last.reps}</button>`
    : '';
}

// ---------- screens ----------

function listScreen() {
  const tiles = data.exercises.map(exerciseTile).join('');
  return `
    <header class="head">
      <h1>Exercises</h1>
      <button class="icon-btn icon-btn--accent" data-action="edit" aria-label="Add or edit exercises">${ICONS.plus}</button>
    </header>
    ${S.isBackupDue(data) ? backupBanner() : ''}
    <div class="stack">${tiles || '<p class="empty">No exercises yet. Tap + to add your first one.</p>'}</div>
    ${todaySummary()}`;
}

function editScreen() {
  const rows = data.exercises.map((ex, i) => editRow(ex, i, data.exercises.length)).join('');
  return `
    <header class="head">
      <h1>Edit exercises</h1>
      <button class="link" data-action="home">Done</button>
    </header>
    <form class="card form" id="add-form">
      <label>Name<input name="name" required autocomplete="off" placeholder="e.g. Incline dumbbell press"></label>
      <div class="pair">
        <label>Baseline (kg)<input name="baseline" required inputmode="decimal" placeholder="20"></label>
        <label>Step
          <select name="step">
            <option value="0.5">0.5 kg</option>
            <option value="1.25">1.25 kg</option>
            <option value="2.5">2.5 kg</option>
          </select>
        </label>
      </div>
      <button class="btn btn--accent" type="submit">Add exercise</button>
    </form>
    <div class="stack">${rows}</div>
    <section class="card">
      <h2>Backup</h2>
      <p>${backupLabel()}</p>
      <div class="pair">
        <button class="btn" data-action="export">Export</button>
        <button class="btn" data-action="import">Import</button>
      </div>
      <input type="file" id="import-file" accept=".json,application/json" hidden>
    </section>`;
}

function weightScreen(ex) {
  const last = S.roundKg(S.lastWeight(data, ex));
  const options = S.weightOptions(last, ex.step, view.lighterRows);
  const tiles = options
    .map((kg) => `<button class="tile tile--num ${kg === last ? 'is-last' : ''}" data-action="weight" data-kg="${kg}">${S.formatKg(kg)}</button>`)
    .join('');
  const lastSet = S.lastSet(data, ex.id);
  const subtitle = lastSet ? `Last set ${S.formatKg(lastSet.weight)} kg × ${lastSet.reps}` : `Baseline ${S.formatKg(ex.baseline)} kg`;
  const hasSetsToday = S.todaysSets(data, ex.id).length > 0;
  return `
    ${backButton('Exercises', 'home')}
    <header class="title"><h1>${esc(ex.name)}</h1><p>${subtitle}</p></header>
    ${repeatButton(ex)}
    <div class="bar">
      <h2>Weight (kg)</h2>
      <button class="chip" data-action="lighter" ${options[0] === 0 ? 'disabled' : ''}>Show lighter</button>
    </div>
    <div class="grid grid--4">${tiles}</div>
    ${todayCard(ex)}
    ${hasSetsToday ? '<button class="btn" data-action="home">Finish exercise</button>' : ''}`;
}

function repsScreen(ex) {
  const lastReps = S.lastSet(data, ex.id)?.reps;
  const tiles = Array.from({ length: 20 }, (_, i) => i + 1)
    .map((r) => `<button class="tile tile--num ${r === lastReps ? 'is-last' : ''}" data-action="reps" data-reps="${r}">${r}</button>`)
    .join('');
  const setNumber = S.todaysSets(data, ex.id).length + 1;
  const subtitle = `Set ${setNumber}${lastReps ? `, last time ${lastReps} reps` : ''}`;
  return `
    ${backButton('Weight', 'to-weight')}
    <header class="title title--split">
      <div><h1>${esc(ex.name)}</h1><p>${subtitle}</p></div>
      <span class="weight-chip">${S.formatKg(view.weight)} kg</span>
    </header>
    <h2>Reps</h2>
    <div class="grid grid--5">${tiles}</div>
    ${todayCard(ex)}`;
}

const SCREENS = { list: listScreen, edit: editScreen, weight: weightScreen, reps: repsScreen };

function render() {
  const ex = currentExercise();
  const needsExercise = view.screen === 'weight' || view.screen === 'reps';
  const screen = needsExercise && !ex ? 'list' : view.screen;
  root.innerHTML = SCREENS[screen](ex);
}

// ---------- actions ----------

async function runExport() {
  try {
    if (await exportData(data)) commit(S.markExported(data));
  } catch (err) {
    alert(`Export failed: ${err.message}`);
  }
}

function deleteExercise(id) {
  const ex = data.exercises.find((e) => e.id === id);
  if (ex && confirm(`Delete ${ex.name} and all its sets?`)) commit(S.removeExercise(data, id));
}

function logSet(reps) {
  data = S.saveData(S.addSet(data, view.exerciseId, view.weight, reps));
  go({ screen: 'weight', lighterRows: 0 });
}

function repeatSet() {
  const last = S.todaysSets(data, view.exerciseId).at(-1);
  if (last) commit(S.addSet(data, view.exerciseId, last.weight, last.reps));
}

const ACTIONS = {
  home: () => go({ screen: 'list', exerciseId: null }),
  edit: () => go({ screen: 'edit' }),
  open: (el) => go({ screen: 'weight', exerciseId: el.dataset.id, lighterRows: 0 }),
  lighter: () => go({ lighterRows: view.lighterRows + 1 }),
  weight: (el) => go({ screen: 'reps', weight: Number(el.dataset.kg) }),
  'to-weight': () => go({ screen: 'weight' }),
  reps: (el) => logSet(Number(el.dataset.reps)),
  repeat: () => repeatSet(),
  undo: () => commit(S.removeLastSet(data, view.exerciseId)),
  up: (el) => commit(S.moveExercise(data, el.dataset.id, -1)),
  down: (el) => commit(S.moveExercise(data, el.dataset.id, 1)),
  delete: (el) => deleteExercise(el.dataset.id),
  export: () => runExport(),
  import: () => document.getElementById('import-file')?.click(),
};

function onClick(event) {
  const el = event.target.closest('[data-action]');
  if (el && !el.disabled) ACTIONS[el.dataset.action]?.(el);
}

function onSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const name = String(form.get('name')).trim();
  const baseline = S.parseKg(form.get('baseline'));
  if (!name || !Number.isFinite(baseline) || baseline < 0) {
    alert('Enter a name and a baseline weight, for example 20 or 22,5.');
    return;
  }
  commit(S.addExercise(data, name, baseline, Number(form.get('step'))));
}

async function onImport(event) {
  if (event.target.id !== 'import-file') return;
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const imported = await readBackup(file);
    const summary = `${imported.exercises.length} exercises and ${imported.sets.length} sets`;
    if (confirm(`Replace all current data with ${summary} from this backup?`)) commit(imported);
  } catch (err) {
    alert(`Import failed: ${err.message}`);
  }
}

// ---------- start ----------

root.addEventListener('click', onClick);
root.addEventListener('submit', onSubmit);
root.addEventListener('change', onImport);
render();

navigator.storage?.persist?.();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
