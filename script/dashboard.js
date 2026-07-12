function setCurrentDate() {
  const currentDate = document.querySelector(".js-current-date");
  if (!currentDate) return;
  const today = new Date();
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  currentDate.textContent = `${weekdays[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
}

/* ============================================================
   DASHBOARD
   IMPORTANT: modal.js (loaded before this file) already declares
   `let todoTasks = []`, `let goals = []`, `let nextId = 1`. We do NOT
   redeclare them here — same rule tasks.js and goals.js follow — we
   just assign into them so modal.js's shared id counter stays correct.

   modal.js also checks `typeof renderTaskList/renderGoalsList/
   saveTasks/saveGoals === "function"` after creating an item. By
   naming our functions exactly that, the existing "+" button on this
   page starts actually persisting and refreshing the dashboard —
   before this file, saveTasks/saveGoals didn't exist here at all, so
   anything created from the dashboard was lost on refresh.
   ============================================================ */

let focusSessions = [];

/* ---------- loading (todoTasks/goals: read + write, since the "+" modal lives here too) ---------- */
function loadTasks() {
  const stored = localStorage.getItem("todoTasks");
  if (stored) {
    todoTasks = JSON.parse(stored);
    const highestId = todoTasks.reduce((max, t) => Math.max(max, t.id), 0);
    nextId = Math.max(nextId, highestId + 1);
  } else {
    todoTasks = [];
  }
}

function loadGoals() {
  const stored = localStorage.getItem("goals");
  if (stored) {
    goals = JSON.parse(stored);
    const highestId = goals.reduce((max, g) => Math.max(max, g.id), 0);
    nextId = Math.max(nextId, highestId + 1);
  } else {
    goals = [];
  }
}

function loadFocusSessions() {
  const stored = localStorage.getItem("focusSessions");
  focusSessions = stored ? JSON.parse(stored) : [];
}

function saveTasks() {
  localStorage.setItem("todoTasks", JSON.stringify(todoTasks));
}

function saveGoals() {
  localStorage.setItem("goals", JSON.stringify(goals));
}

/* ---------- shared helpers (own copies — dashboard doesn't load tasks.js/goals.js) ---------- */
function isTaskOverdue(task) {
  if (!task.dueDate) return false;
  const dueDateTime = new Date(`${task.dueDate}T${task.dueTime || "23:59"}`);
  return dueDateTime.getTime() < Date.now();
}

function getGoalProgress(goal) {
  const milestones = goal.milestones || [];
  const total = milestones.length;
  const completed = milestones.filter((m) => m.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}

function todayDateString() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // matches the "YYYY-MM-DD" format <input type="date"> stores
}

function formatDueDate(dateStr) {
  if (!dateStr) return "No due date";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// missing due dates sort to the very end, not the top
function dueDateSortValue(dateStr, timeStr) {
  if (!dateStr) return Infinity;
  const t = new Date(`${dateStr}T${timeStr || "00:00"}`).getTime();
  return isNaN(t) ? Infinity : t;
}

// Monday–Sunday, calendar week — same rule used on the Focus page,
// so "this week" means the same thing everywhere in the app
function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;

  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

function isWithinCurrentWeek(isoStr) {
  if (!isoStr) return false;
  const { monday, sunday } = getWeekRange();
  const d = new Date(isoStr);
  return d >= monday && d <= sunday;
}

function formatDurationLong(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/* ============================================================
   STAT CARDS
   ============================================================ */
function renderStats() {
  const today = todayDateString();

  const dueTodayCount = todoTasks.filter(
    (t) => t.status === "pending" && t.dueDate === today,
  ).length;

  // overdue = not completed, and its due date/time has genuinely passed —
  // covers both tasks still "pending" past their time AND ones already
  // committed to status "overdue" from tasks.js's redo flow
  const overdueCount = todoTasks.filter(
    (t) => t.status !== "completed" && isTaskOverdue(t),
  ).length;

  // "in progress" means not yet at 100% — a finished goal isn't really
  // "in progress" anymore, even though goals.js counts all goals here
  const goalsInProgressCount = goals.filter(
    (g) => getGoalProgress(g).percent < 100,
  ).length;

  // requires task.completedAt, stamped by tasks.js when a task is checked off.
  // tasks completed before that change won't have a timestamp and won't count —
  // that's expected, not a bug, since we can't retroactively know when they finished
  const completedThisWeekCount = todoTasks.filter(
    (t) => t.status === "completed" && isWithinCurrentWeek(t.completedAt),
  ).length;

  const focusedThisWeekSeconds = focusSessions
    .filter((s) => isWithinCurrentWeek(s.endedAt))
    .reduce((sum, s) => sum + s.actualSeconds, 0);

  document.querySelector(".js-due-today-count").textContent = dueTodayCount;
  document.querySelector(".js-overdue-count").textContent = overdueCount;
  document.querySelector(".js-goals-count").textContent = goalsInProgressCount;
  document.querySelector(".js-completed-count").textContent =
    completedThisWeekCount;
  document.querySelector(".js-focus-time").textContent = formatDurationLong(
    focusedThisWeekSeconds,
  );
}

/* ============================================================
   SHORT-TERM TASKS SNIPPET — sorted by nearest due date first,
   no % / no progress bar (tasks don't have a progress concept —
   only pending/completed/overdue status)
   ============================================================ */
function renderTaskSnippets() {
  const listEl = document.querySelector(".js-dashboard-task-list");
  const countEl = document.querySelector(".js-task-snippet-count");
  listEl.innerHTML = "";

  const activeTasks = todoTasks
    .filter((t) => t.status !== "completed")
    .sort(
      (a, b) =>
        dueDateSortValue(a.dueDate, a.dueTime) -
        dueDateSortValue(b.dueDate, b.dueTime),
    );

  countEl.textContent = `(${activeTasks.length})`;

  if (activeTasks.length === 0) {
    listEl.innerHTML = `<div class="dashboard-snippet-empty">No active tasks. Nice and clear!</div>`;
    return;
  }

  activeTasks.forEach((task) => {
    const card = document.createElement("div");
    card.className = "dashboard-task-card";
    card.innerHTML = `
      <span class="dashboard-task-priority-dot priority-${task.priority}"></span>
      <div class="dashboard-task-info">
        <p class="dashboard-task-title">${task.title}</p>
        <div class="dashboard-task-meta">
          <span class="tag">${task.category}</span>
          <span>${formatDueDate(task.dueDate)}</span>
        </div>
      </div>
    `;

    // clicking a snippet takes you to tasks.html, scrolled to and
    // highlighting that exact card — same mechanism the search results use
    card.addEventListener("click", () => {
      window.location.href = `tasks.html?taskId=${task.id}`;
    });

    listEl.appendChild(card);
  });
}

/* ============================================================
   LONG-TERM GOALS SNIPPET — sorted by nearest due date first,
   % + a slim progress bar is enough (no "3 of 7 milestones" text here)
   ============================================================ */
function renderGoalSnippets() {
  const listEl = document.querySelector(".js-dashboard-goal-list");
  const countEl = document.querySelector(".js-goal-snippet-count");
  listEl.innerHTML = "";

  const sortedGoals = [...goals].sort(
    (a, b) => dueDateSortValue(a.dueDate) - dueDateSortValue(b.dueDate),
  );

  countEl.textContent = `(${sortedGoals.length})`;

  if (sortedGoals.length === 0) {
    listEl.innerHTML = `<div class="dashboard-snippet-empty">No goals yet. Start one from My Goals!</div>`;
    return;
  }

  sortedGoals.forEach((goal) => {
    const { percent } = getGoalProgress(goal);

    const card = document.createElement("div");
    card.className = "dashboard-goal-card";
    card.innerHTML = `
      <div class="dashboard-goal-top-row">
        <h5 class="dashboard-goal-title">${goal.title}</h5>
        <button class="dashboard-view-journey-btn js-view-journey">View Journey</button>
      </div>
      <div class="dashboard-goal-meta">
        <span class="tag">${goal.category}</span>
        <span>${formatDueDate(goal.dueDate)}</span>
      </div>
      <div class="dashboard-goal-progress-wrap">
        <div class="dashboard-goal-progress-track">
          <div class="dashboard-goal-progress-fill" style="width: ${percent}%;"></div>
        </div>
        <span class="dashboard-goal-progress-percent">${percent}%</span>
      </div>
    `;

    // "View Journey" is the one real destination for a goal (matches the
    // pattern already used on goals.html) — the actual built page is
    // goal-detail.html, not the goals-progress.html placeholder in goals.js
    card
      .querySelector(".js-view-journey")
      .addEventListener("click", (event) => {
        event.stopPropagation();
        window.location.href = `goals-progress.html?id=${goal.id}`;
      });

    listEl.appendChild(card);
  });
}

/* ============================================================
   SEARCH — matches tasks and goals by title, click takes you to
   exactly where that item lives on its real page
   ============================================================ */
const searchInput = document.querySelector(".js-dashboard-search");
const searchResultsEl = document.querySelector(".js-dashboard-search-results");

function renderSearchResults(query) {
  const q = query.trim().toLowerCase();

  if (!q) {
    searchResultsEl.classList.remove("open");
    searchResultsEl.innerHTML = "";
    return;
  }

  const matchingTasks = todoTasks
    .filter((t) => t.title.toLowerCase().includes(q))
    .map((t) => ({ ...t, resultType: "task" }));

  const matchingGoals = goals
    .filter((g) => g.title.toLowerCase().includes(q))
    .map((g) => ({ ...g, resultType: "goal" }));

  const results = [...matchingTasks, ...matchingGoals].slice(0, 8);

  searchResultsEl.innerHTML = "";

  if (results.length === 0) {
    searchResultsEl.innerHTML = `<div class="dashboard-search-empty">No tasks or goals match "${query}"</div>`;
    searchResultsEl.classList.add("open");
    return;
  }

  results.forEach((item) => {
    const isGoal = item.resultType === "goal";
    const row = document.createElement("div");
    row.className = "dashboard-search-result";
    row.innerHTML = `
      <span class="dashboard-search-result-icon ${isGoal ? "goal" : "task"}">
        <i class="fa-solid ${isGoal ? "fa-bullseye" : "fa-square-check"}"></i>
      </span>
      <span class="dashboard-search-result-title">${item.title}</span>
      <span class="dashboard-search-result-type">${isGoal ? "Goal" : "Task"}</span>
    `;

    row.addEventListener("click", () => {
      if (isGoal) {
        window.location.href = `goals.html?goalId=${item.id}`;
      } else {
        window.location.href = `tasks.html?taskId=${item.id}`;
      }
    });

    searchResultsEl.appendChild(row);
  });

  searchResultsEl.classList.add("open");
}

searchInput.addEventListener("input", (event) => {
  renderSearchResults(event.target.value);
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    searchInput.value = "";
    searchResultsEl.classList.remove("open");
    searchInput.blur();
  }
});

// click-outside closes the results dropdown, same pattern as closeAllMenus in tasks.js
window.addEventListener("click", (event) => {
  if (!event.target.closest(".dashboard-search-wrap")) {
    searchResultsEl.classList.remove("open");
  }
});

/* ============================================================
   INIT / REFRESH
   renderTaskList() and renderGoalsList() are named to match what
   modal.js looks for after creating an item — so the dashboard
   fully refreshes itself automatically after using the "+" button.
   ============================================================ */
function renderTaskList() {
  renderStats();
  renderTaskSnippets();
  renderGoalSnippets();
}

function renderGoalsList() {
  renderStats();
  renderTaskSnippets();
  renderGoalSnippets();
}

loadTasks();
loadGoals();
loadFocusSessions();
setCurrentDate();
renderStats();
renderTaskSnippets();
renderGoalSnippets();
