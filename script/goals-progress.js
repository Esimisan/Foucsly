let goals = [];

// Reuse tip: reading an id out of the URL's query string (?id=3) is how
// you pass "which record am I looking at" between two separate pages.
function getGoalIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("id"));
}

const goalId = getGoalIdFromUrl();

function loadGoals() {
  const stored = localStorage.getItem("goals");
  goals = stored ? JSON.parse(stored) : [];
}

function saveGoals() {
  localStorage.setItem("goals", JSON.stringify(goals));
}

function getGoal() {
  return goals.find((g) => g.id === goalId);
}

// Same calculation as goals.js — progress is never stored, always derived
function getGoalProgress(goal) {
  const milestones = goal.milestones || [];
  const total = milestones.length;
  const completed = milestones.filter((m) => m.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}

function formatDate(dateStr) {
  if (!dateStr) return "No due date";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ---------- Element refs ----------
const headerEl = document.querySelector(".js-journey-header");
const milestonesLabelEl = document.querySelector(".js-milestones-label");
const progressFillEl = document.querySelector(".js-progress-fill");
const progressPercentEl = document.querySelector(".js-progress-percent");
const descriptionEl = document.querySelector(".js-goal-description");
const checklistEl = document.querySelector(".js-milestone-checklist");
const timelineEl = document.querySelector(".js-journey-timeline");

const tabOverviewBtn = document.querySelector(".js-tab-overview");
const tabJourneyBtn = document.querySelector(".js-tab-journey");
const overviewPanel = document.querySelector(".js-overview-panel");
const journeyPanel = document.querySelector(".js-journey-panel");

const toggleAddBtn = document.querySelector(".js-toggle-add-progress");
const newEntryCard = document.querySelector(".js-new-entry-card");
const newEntryInput = document.querySelector(".js-new-entry-input");
const saveEntryBtn = document.querySelector(".js-save-entry");

// ---------- Rendering ----------
function renderHeader(goal) {
  const updateCount = (goal.updates || []).length;
  headerEl.innerHTML = `
    <div class="journey-tags">
      <span class="tag">${goal.category}</span>
      <span class="priority-tag priority-${goal.priority}">
        ${goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)} priority
      </span>
    </div>
    <h1 class="journey-title">${goal.title}</h1>
    <div class="journey-subtitle">
      Due ${formatDate(goal.dueDate)} · ${updateCount} progress ${updateCount === 1 ? "entry" : "entries"}
    </div>
  `;
}

function renderProgressBar(goal) {
  const { completed, total, percent } = getGoalProgress(goal);
  milestonesLabelEl.textContent = `${completed} of ${total} milestones documented`;
  progressFillEl.style.width = `${percent}%`;
  progressPercentEl.textContent = `${percent}% complete`;
}

function renderOverview(goal) {
  descriptionEl.textContent = goal.description || "No description added.";

  // Reuse tip: same "clear then rebuild" pattern used everywhere else
  checklistEl.innerHTML = "";

  (goal.milestones || []).forEach((milestone) => {
    const row = document.createElement("div");
    row.className = "milestone-row-check";
    row.innerHTML = `
      <div
        class="milestone-check ${milestone.completed ? "done" : ""} js-milestone-check"
        data-id="${milestone.id}"
      ></div>
      <span class="milestone-text ${milestone.completed ? "done" : ""}">${milestone.text}</span>
    `;
    checklistEl.appendChild(row);
  });
}

function renderJourneyTimeline(goal) {
  timelineEl.innerHTML = "";
  const updates = goal.updates || [];

  if (updates.length === 0) {
    timelineEl.innerHTML = `<p class="journey-empty">No progress logged yet. Check off a milestone or add a note to get started.</p>`;
    return;
  }

  // Newest entries are at the front of the array (we use unshift when adding),
  // so we can just loop in order — no sorting needed
  updates.forEach((update) => {
    const entry = document.createElement("div");
    entry.className = "journey-entry";
    entry.innerHTML = `
      <div class="journey-entry-date">${formatDate(update.date)} · ${update.progressAtTime}% complete</div>
      <div class="journey-entry-note">${update.note}</div>
    `;
    timelineEl.appendChild(entry);
  });
}

function renderAll() {
  const goal = getGoal();

  if (!goal) {
    document.querySelector(".journey-page").innerHTML =
      `<p>Goal not found. <a href="goals.html">Back to Goals</a></p>`;
    return;
  }

  renderHeader(goal);
  renderProgressBar(goal);
  renderOverview(goal);
  renderJourneyTimeline(goal);
}

// ---------- Milestone toggling ----------
// Event delegation: one listener on the checklist container catches clicks
// on any checkbox, even ones that didn't exist when the page first loaded
checklistEl.addEventListener("click", (event) => {
  const check = event.target.closest(".js-milestone-check");
  if (!check) return;
  toggleMilestone(Number(check.dataset.id));
});

function toggleMilestone(milestoneId) {
  const goal = getGoal();
  const milestone = goal.milestones.find((m) => m.id === milestoneId);
  if (!milestone) return;

  milestone.completed = !milestone.completed;

  // Auto-log this change to the journal, so the Journey tab always shows
  // what actually happened — even if the user never types a manual note
  const { percent } = getGoalProgress(goal);
  goal.updates = goal.updates || [];
  goal.updates.unshift({
    date: new Date().toISOString().slice(0, 10),
    note: milestone.completed
      ? `Completed milestone: "${milestone.text}"`
      : `Marked incomplete: "${milestone.text}"`,
    progressAtTime: percent,
  });

  saveGoals();
  renderAll();
}

// ---------- Manual progress notes ----------
toggleAddBtn.addEventListener("click", () => {
  const isHidden = newEntryCard.style.display === "none";
  newEntryCard.style.display = isHidden ? "block" : "none";
  if (isHidden) newEntryInput.focus();
});

saveEntryBtn.addEventListener("click", () => {
  const note = newEntryInput.value.trim();
  if (!note) return; // don't save empty entries

  const goal = getGoal();
  const { percent } = getGoalProgress(goal);
  goal.updates = goal.updates || [];
  goal.updates.unshift({
    date: new Date().toISOString().slice(0, 10),
    note,
    progressAtTime: percent,
  });

  newEntryInput.value = "";
  newEntryCard.style.display = "none";
  saveGoals();
  renderAll();
});

// ---------- Tabs ----------
function showTab(tab) {
  const isOverview = tab === "overview";
  overviewPanel.classList.toggle("panel-active", isOverview);
  journeyPanel.classList.toggle("panel-active", !isOverview);
  tabOverviewBtn.classList.toggle("journey-tab-active", isOverview);
  tabJourneyBtn.classList.toggle("journey-tab-active", !isOverview);
}

tabOverviewBtn.addEventListener("click", () => showTab("overview"));
tabJourneyBtn.addEventListener("click", () => showTab("journey"));

// ---------- Init ----------
loadGoals();
renderAll();
showTab("journey"); // matches your screenshot — Journey is the default view
