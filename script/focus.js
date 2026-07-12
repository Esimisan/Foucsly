/* ============================================================
   FOCUS PAGE
   This page doesn't load tasks.js or goals.js — those files call
   querySelector on elements that only exist on tasks.html/goals.html
   and would throw on load here. Instead we read the SAME localStorage
   keys ("todoTasks" and "goals") directly, read-only — this page never
   creates, edits or deletes a task/goal, only references one by id.
   ============================================================ */

const stageEl = document.querySelector(".js-focus-stage");
const historyEl = document.querySelector(".js-focus-history");
const accumulatorValueEl = document.querySelector(".js-accumulator-value");

let todoTasks = [];
let goals = [];
let focusSessions = [];
let nextSessionId = 1;

// ---------- state machine ----------
// stage: "idle" -> "picking" -> "duration" -> "running" -> "ended"
let stage = "idle";
let pickType = null; // "task" | "goal"
let searchQuery = "";
let selectedItem = null; // { id, title, type, category }
let plannedSeconds = 0;
let secondsRemaining = 0;
let timerInterval = null;
let sessionStartedAt = null;
let selectedPresetMinutes = null;

const DURATION_PRESETS = [15, 30, 60, 120]; // minutes

// history is grouped into these buckets, most recent first — a bucket's
// header only renders if it actually has sessions in it (checked in renderHistory)
const HISTORY_GROUPS = [
  { label: "Last week", minDays: 0, maxDays: 7 },
  { label: "Last 2 weeks", minDays: 7, maxDays: 14 },
  { label: "Last month", minDays: 14, maxDays: 30 },
  { label: "Last 2 months", minDays: 30, maxDays: 60 },
];

/* ---------- loading (read-only for tasks/goals) ---------- */
function loadTasks() {
  const stored = localStorage.getItem("todoTasks");
  todoTasks = stored ? JSON.parse(stored) : [];
}

function loadGoals() {
  const stored = localStorage.getItem("goals");
  goals = stored ? JSON.parse(stored) : [];
}

function loadFocusSessions() {
  const stored = localStorage.getItem("focusSessions");
  if (stored) {
    focusSessions = JSON.parse(stored);
    const highestId = focusSessions.reduce((max, s) => Math.max(max, s.id), 0);
    nextSessionId = highestId + 1;
  } else {
    focusSessions = [];
    nextSessionId = 1;
  }
}

function saveFocusSessions() {
  localStorage.setItem("focusSessions", JSON.stringify(focusSessions));
}

/* ---------- weekly accumulator (derived, never stored) ---------- */
// Monday–Sunday, calendar week
function getWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? 6 : day - 1;

  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

function getWeekTotalSeconds() {
  const { monday, sunday } = getWeekRange();
  return focusSessions
    .filter((s) => {
      const ended = new Date(s.endedAt);
      return ended >= monday && ended <= sunday;
    })
    .reduce((sum, s) => sum + s.actualSeconds, 0);
}

function formatDurationLong(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatCountdown(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

function formatHistoryDate(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function renderAccumulator() {
  accumulatorValueEl.textContent = formatDurationLong(getWeekTotalSeconds());
}

/* ---------- session logging ----------
   Every session — natural completion OR ended early — becomes its own
   new entry. Restarting never mutates an old session, same as how
   Redo Task never mutates a completed task in tasks.js. Category is
   copied onto the session itself so history stays accurate even if the
   original task/goal is later edited or deleted. */
function logSession(actualSeconds, completedNaturally) {
  focusSessions.push({
    id: nextSessionId++,
    refType: selectedItem.type,
    refId: selectedItem.id,
    refTitle: selectedItem.title,
    refCategory: selectedItem.category,
    plannedSeconds,
    actualSeconds,
    startedAt: sessionStartedAt,
    endedAt: new Date().toISOString(),
    completedNaturally,
  });
  saveFocusSessions();
  renderAccumulator();
  renderHistory();
}

function deleteSession(id) {
  focusSessions = focusSessions.filter((s) => s.id !== id);
  saveFocusSessions();
  renderAccumulator();
  renderHistory();
}

/* ============================================================
   STARTER CARD RENDERING — "clear then rebuild" pattern, same as
   task/goal lists. One render function dispatches to the right
   sub-render for whatever `stage` currently is.
   ============================================================ */
function renderStage() {
  stageEl.innerHTML = "";

  if (stage === "idle") renderIdle();
  else if (stage === "picking") renderPicking();
  else if (stage === "duration") renderDuration();
  else if (stage === "running") renderRunning();
  else if (stage === "ended") renderEnded();
}

function renderIdle() {
  const wrap = document.createElement("div");
  wrap.className = "focus-idle-row";
  wrap.innerHTML = `
    <button class="focus-choice-btn js-pick-task">
      <i class="fa-solid fa-plus"></i> Pick a task to focus on
    </button>
    <button class="focus-choice-btn js-pick-goal">
      <i class="fa-solid fa-plus"></i> Pick a goal to focus on
    </button>
  `;
  stageEl.appendChild(wrap);

  wrap.querySelector(".js-pick-task").addEventListener("click", () => {
    pickType = "task";
    searchQuery = "";
    stage = "picking";
    renderStage();
  });

  wrap.querySelector(".js-pick-goal").addEventListener("click", () => {
    pickType = "goal";
    searchQuery = "";
    stage = "picking";
    renderStage();
  });
}

function renderPicking() {
  const wrap = document.createElement("div");
  wrap.className = "focus-picker";

  const label = pickType === "task" ? "task" : "goal";
  wrap.innerHTML = `
    <div class="focus-picker-header">
      <button class="focus-back-btn js-picker-back">
        <i class="fa-solid fa-arrow-left"></i> Back
      </button>
      <h2>Pick a ${label}</h2>
      <span></span>
    </div>
    <input
      type="text"
      class="focus-search-input js-picker-search"
      placeholder="Search your ${label}s..."
    />
    <div class="focus-item-list js-picker-list"></div>
  `;
  stageEl.appendChild(wrap);

  wrap.querySelector(".js-picker-back").addEventListener("click", () => {
    stage = "idle";
    renderStage();
  });

  const searchInput = wrap.querySelector(".js-picker-search");
  searchInput.value = searchQuery;
  searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value;
    renderPickerList();
  });

  renderPickerList();
  searchInput.focus();
}

// only re-renders the list portion, so typing doesn't steal focus from the search box
function renderPickerList() {
  const listEl = document.querySelector(".js-picker-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  const query = searchQuery.trim().toLowerCase();
  let source =
    pickType === "task"
      ? todoTasks.filter((t) => t.status !== "completed")
      : goals;

  if (query) {
    source = source.filter((item) => item.title.toLowerCase().includes(query));
  }

  if (source.length === 0) {
    listEl.innerHTML = `<div class="focus-item-empty">No ${pickType}s found. ${
      pickType === "task"
        ? "Create a task on My Tasks first."
        : "Create a goal on My Goals first."
    }</div>`;
    return;
  }

  source.forEach((item) => {
    const option = document.createElement("button");
    option.className = "focus-item-option js-item-option";
    option.dataset.id = item.id;

    if (pickType === "task") {
      option.innerHTML = `
        <span class="focus-item-option-title">${item.title}</span>
        <span class="tag">${item.category}</span>
      `;
    } else {
      const total = (item.milestones || []).length;
      const completed = (item.milestones || []).filter(
        (m) => m.completed,
      ).length;
      option.innerHTML = `
        <span class="focus-item-option-title">${item.title}</span>
        <span class="tag">${completed}/${total} milestones</span>
      `;
    }

    option.addEventListener("click", () => {
      selectedItem = {
        id: item.id,
        title: item.title,
        type: pickType,
        category: item.category,
      };
      selectedPresetMinutes = null;
      stage = "duration";
      renderStage();
    });

    listEl.appendChild(option);
  });
}

function renderDuration() {
  const wrap = document.createElement("div");
  wrap.className = "focus-duration-panel";
  wrap.innerHTML = `
    <div class="focus-selected-label">Focusing on</div>
    <div class="focus-selected-title">${selectedItem.title}</div>
    <div class="focus-selected-label">How long do you plan to focus?</div>
    <div class="focus-duration-grid js-duration-grid">
      ${DURATION_PRESETS.map(
        (mins) =>
          `<button class="focus-duration-btn js-duration-preset" data-mins="${mins}">${
            mins >= 60 ? mins / 60 + "hr" : mins + "min"
          }</button>`,
      ).join("")}
      <button class="focus-duration-btn js-duration-custom-btn">Custom</button>
    </div>
    <div class="focus-custom-duration js-custom-duration-row" style="display: none;">
      <span>minutes:</span>
      <input type="number" min="1" class="js-custom-minutes" placeholder="e.g. 45" />
    </div>
    <button class="focus-start-btn js-start-focus" disabled>Start Focus</button>
  `;
  stageEl.appendChild(wrap);

  const startBtn = wrap.querySelector(".js-start-focus");
  const customRow = wrap.querySelector(".js-custom-duration-row");
  const customInput = wrap.querySelector(".js-custom-minutes");

  function selectPreset(mins) {
    selectedPresetMinutes = mins;
    customInput.value = "";
    wrap
      .querySelectorAll(".js-duration-preset")
      .forEach((btn) =>
        btn.classList.toggle("selected", Number(btn.dataset.mins) === mins),
      );
    wrap.querySelector(".js-duration-custom-btn").classList.remove("selected");
    customRow.style.display = "none";
    startBtn.disabled = false;
  }

  wrap.querySelectorAll(".js-duration-preset").forEach((btn) => {
    btn.addEventListener("click", () => selectPreset(Number(btn.dataset.mins)));
  });

  wrap
    .querySelector(".js-duration-custom-btn")
    .addEventListener("click", () => {
      selectedPresetMinutes = null;
      wrap
        .querySelectorAll(".js-duration-preset")
        .forEach((btn) => btn.classList.remove("selected"));
      wrap.querySelector(".js-duration-custom-btn").classList.add("selected");
      customRow.style.display = "flex";
      startBtn.disabled = true;
      customInput.focus();
    });

  customInput.addEventListener("input", () => {
    const val = Number(customInput.value);
    startBtn.disabled = !(val > 0);
  });

  startBtn.addEventListener("click", () => {
    const minutes = selectedPresetMinutes || Number(customInput.value);
    if (!(minutes > 0)) return;
    startFocusSession(minutes);
  });
}

function startFocusSession(minutes) {
  plannedSeconds = Math.round(minutes * 60);
  secondsRemaining = plannedSeconds;
  sessionStartedAt = new Date().toISOString();
  stage = "running";
  renderStage();

  timerInterval = setInterval(() => {
    secondsRemaining -= 1;
    updateCountdownDisplay();

    if (secondsRemaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      logSession(plannedSeconds, true);
      stage = "ended";
      renderStage();
    }
  }, 1000);
}

function renderRunning() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="focus-active-label">Focusing on</div>
    <div class="focus-active-title">${selectedItem.title}</div>
    <div class="focus-timer-row">
      <span class="focus-countdown js-countdown">${formatCountdown(secondsRemaining)}</span>
      <button class="focus-end-btn js-end-focus">End Focus</button>
    </div>
  `;
  stageEl.appendChild(wrap);

  wrap.querySelector(".js-end-focus").addEventListener("click", endFocusEarly);
}

// updates just the countdown number every second, instead of re-rendering
// the whole panel — avoids losing button hover state / re-attaching listeners every tick
function updateCountdownDisplay() {
  const el = document.querySelector(".js-countdown");
  if (el) el.textContent = formatCountdown(secondsRemaining);
}

function endFocusEarly() {
  clearInterval(timerInterval);
  timerInterval = null;

  const actualSeconds = plannedSeconds - secondsRemaining;
  logSession(actualSeconds, false);

  // ending early goes straight back to idle — no restart prompt,
  // since restarting only makes sense after a session actually finished
  stage = "idle";
  selectedItem = null;
  renderStage();
}

function renderEnded() {
  const wrap = document.createElement("div");
  wrap.className = "focus-ended-panel";
  wrap.innerHTML = `
    <div class="focus-ended-icon"><i class="fa-solid fa-circle-check"></i></div>
    <div class="focus-ended-title">Session complete</div>
    <div class="focus-ended-sub">You focused on "${selectedItem.title}" for ${formatDurationLong(plannedSeconds)}.</div>
    <div class="focus-ended-actions">
      <button class="focus-restart-btn js-restart-focus">Restart Focus</button>
      <button class="focus-done-btn js-done-focus">Done</button>
    </div>
  `;
  stageEl.appendChild(wrap);

  // restart keeps the same selectedItem, just reopens the duration picker
  wrap.querySelector(".js-restart-focus").addEventListener("click", () => {
    selectedPresetMinutes = null;
    stage = "duration";
    renderStage();
  });

  wrap.querySelector(".js-done-focus").addEventListener("click", () => {
    selectedItem = null;
    stage = "idle";
    renderStage();
  });
}

/* ============================================================
   FOCUS HISTORY — grouped by recency, newest group first.
   A group header only appears if it actually has sessions in it.
   ============================================================ */
function getDaysAgo(isoStr) {
  const then = new Date(isoStr);
  const now = new Date();
  return (now - then) / (1000 * 60 * 60 * 24);
}

function getGroupLabelForSession(session) {
  const days = getDaysAgo(session.endedAt);
  const group = HISTORY_GROUPS.find(
    (g) => days >= g.minDays && days < g.maxDays,
  );
  return group ? group.label : null; // older than 2 months — not shown
}

function renderHistory() {
  historyEl.innerHTML = "";

  const sorted = [...focusSessions].sort(
    (a, b) => new Date(b.endedAt) - new Date(a.endedAt),
  );

  // bucket sessions by group label
  const buckets = {};
  HISTORY_GROUPS.forEach((g) => (buckets[g.label] = []));
  sorted.forEach((session) => {
    const label = getGroupLabelForSession(session);
    if (label) buckets[label].push(session);
  });

  const hasAnyHistory = HISTORY_GROUPS.some((g) => buckets[g.label].length > 0);

  if (!hasAnyHistory) {
    historyEl.innerHTML = `<div class="focus-history-empty">No focus sessions yet. Once you complete or end a session, it'll show up here.</div>`;
    return;
  }

  const heading = document.createElement("div");
  heading.className = "focus-history-heading";
  heading.textContent = "Focus History";
  historyEl.appendChild(heading);

  HISTORY_GROUPS.forEach((group) => {
    const sessionsInGroup = buckets[group.label];
    if (sessionsInGroup.length === 0) return; // hide empty groups entirely

    const groupEl = document.createElement("div");
    groupEl.className = "focus-history-group";
    groupEl.innerHTML = `
      <div class="section-header">
        <span class="status-dot"></span>
        <h2>${group.label}</h2>
      </div>
      <div class="focus-history-list"></div>
    `;
    historyEl.appendChild(groupEl);

    const listEl = groupEl.querySelector(".focus-history-list");
    sessionsInGroup.forEach((session) => {
      listEl.appendChild(buildHistoryCard(session));
    });
  });
}

function buildHistoryCard(session) {
  const card = document.createElement("div");
  card.className = "focus-history-card";
  card.dataset.id = session.id;

  const isGoal = session.refType === "goal";
  const icon = isGoal ? "fa-solid fa-bullseye" : "fa-regular fa-square-check";

  card.innerHTML = `
    <div class="focus-history-icon ${isGoal ? "goal" : "task"}"><i class="${icon}"></i></div>
    <div class="focus-history-info">
      <div class="focus-history-title">${session.refTitle}</div>
      <div class="focus-history-meta">
        <span class="tag">${session.refCategory || "uncategorized"}</span>
        <span class="focus-history-date">${formatHistoryDate(session.endedAt)}</span>
      </div>
    </div>
    <div class="focus-history-duration">${formatDurationLong(session.actualSeconds)}</div>
    <button class="focus-history-delete js-delete-session" title="Remove from history">
      <i class="fa-solid fa-trash"></i>
    </button>
  `;

  card.querySelector(".js-delete-session").addEventListener("click", () => {
    deleteSession(session.id);
  });

  return card;
}

/* ---------- init ---------- */
loadTasks();
loadGoals();
loadFocusSessions();
renderAccumulator();
renderStage();
renderHistory();
