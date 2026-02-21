const STORAGE_KEY = "daily_mission_board_v1";

const defaultState = {
  choices: {
    learn: ["Read 10 minutes", "Math: 1 page", "Earth: watch a short video"],
    create: ["Draw for 10 minutes", "Build with LEGO", "Write 3 sentences"],
    move: ["10 jumping jacks", "Walk outside 5 minutes", "Stretch + breathe"]
  },
  selected: { learn: null, create: null, move: null },
  done: { learn: false, create: false, move: false },
  timers: {
    learn: { seconds: 0, running: false },
    create: { seconds: 0, running: false },
    move: { seconds: 0, running: false }
  }
};

let state = loadState();
let intervals = { learn: null, create: null, move: null };

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);

    return {
      ...structuredClone(defaultState),
      ...parsed,
      choices: { ...defaultState.choices, ...(parsed.choices || {}) },
      selected: { ...defaultState.selected, ...(parsed.selected || {}) },
      done: { ...defaultState.done, ...(parsed.done || {}) },
      timers: { ...defaultState.timers, ...(parsed.timers || {}) }
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return `${mm}:${ss}`;
}

function renderChoices(section) {
  const container = document.getElementById(`choices-${section}`);
  container.innerHTML = "";

  state.choices[section].forEach((text, idx) => {
    const div = document.createElement("div");
    div.className = "choice";
    if (state.selected[section] === idx) div.classList.add("selected");

    const left = document.createElement("div");
    left.textContent = text;

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = state.selected[section] === idx ? "Selected" : `Option ${idx + 1}`;

    div.appendChild(left);
    div.appendChild(badge);

    div.addEventListener("click", () => {
      state.selected[section] = idx;
      state.done[section] = false;
      document.getElementById(`done-${section}`).checked = false;
      saveState();
      renderAll();
    });

    container.appendChild(div);
  });
}

function renderTimer(section) {
  document.getElementById(`timer-${section}`).textContent = formatTime(
    state.timers[section].seconds
  );

  const active = document.getElementById(`active-${section}`);
  const idx = state.selected[section];
  active.textContent = idx === null ? "No mission selected." : `Active: ${state.choices[section][idx]}`;
}

function renderDone(section) {
  const checkbox = document.getElementById(`done-${section}`);
  checkbox.checked = !!state.done[section];
  checkbox.onchange = () => {
    state.done[section] = checkbox.checked;
    saveState();
    renderSummary();
  };
}

function renderSummary() {
  const el = document.getElementById("summaryList");
  el.innerHTML = "";

  ["learn", "create", "move"].forEach((section) => {
    const idx = state.selected[section];
    const task = idx === null ? "Nothing selected" : state.choices[section][idx];
    const status = idx === null ? "-" : (state.done[section] ? "Done" : "In progress");

    const row = document.createElement("div");
    row.className = "summary-item";

    const a = document.createElement("div");
    a.className = "section";
    a.textContent = section.toUpperCase();

    const b = document.createElement("div");
    b.className = "task";
    b.textContent = task;

    const c = document.createElement("div");
    c.className = "status";
    c.textContent = status;

    row.appendChild(a);
    row.appendChild(b);
    row.appendChild(c);

    el.appendChild(row);
  });
}

function renderAll() {
  ["learn", "create", "move"].forEach((s) => {
    renderChoices(s);
    renderTimer(s);
    renderDone(s);
  });
  renderSummary();
}

function stopInterval(section) {
  if (intervals[section]) {
    clearInterval(intervals[section]);
    intervals[section] = null;
  }
  state.timers[section].running = false;
}

function startInterval(section) {
  stopInterval(section);
  state.timers[section].running = true;

  intervals[section] = setInterval(() => {
    state.timers[section].seconds += 1;
    saveState();
    renderTimer(section);
  }, 1000);
}

function resetTimer(section) {
  stopInterval(section);
  state.timers[section].seconds = 0;
  saveState();
  renderTimer(section);
}

function editChoices(section) {
  const current = state.choices[section].join("\n");
  const next = prompt(
    `Edit ${section.toUpperCase()} choices (one per line):`,
    current
  );
  if (next === null) return;

  const lines = next
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  if (lines.length === 0) return;

  state.choices[section] = lines.slice(0, 6);
  state.selected[section] = null;
  state.done[section] = false;
  resetTimer(section);
  saveState();
  renderAll();
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.getAttribute("data-action");
  const card = btn.closest(".card");
  const section = card?.getAttribute("data-section");

  if (action === "edit" && section) editChoices(section);

  const timerSection = btn.getAttribute("data-timer");
  if (action === "start" && timerSection) startInterval(timerSection);
  if (action === "pause" && timerSection) stopInterval(timerSection);
  if (action === "reset" && timerSection) resetTimer(timerSection);
});

document.getElementById("btnPrint").addEventListener("click", () => window.print());

document.getElementById("btnResetDay").addEventListener("click", () => {
  if (!confirm("Reset the entire day? This clears timers, done boxes, and selections.")) return;
  state.selected = { learn: null, create: null, move: null };
  state.done = { learn: false, create: false, move: false };
  ["learn", "create", "move"].forEach((s) => resetTimer(s));
  saveState();
  renderAll();
});

document.getElementById("btnClearAll").addEventListener("click", () => {
  state.selected = { learn: null, create: null, move: null };
  state.done = { learn: false, create: false, move: false };
  saveState();
  renderAll();
});

["learn", "create", "move"].forEach((s) => stopInterval(s));

renderAll();
