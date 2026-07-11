const goalListEl = document.querySelector(".js-goal-list");
const goalCountLabel = document.querySelector(".goal-count-label");

// NEW: progress is CALCULATED here, never read from a stored field.
// Reuse tip: this same "count what matches / divide by total" pattern
// works for any "X of Y complete" display anywhere in the app.
function getGoalProgress(goal) {
  const milestones = goal.milestones || [];
  const total = milestones.length;
  const completed = milestones.filter((m) => m.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}

function saveGoals() {
  localStorage.setItem("goals", JSON.stringify(goals));
}

function loadGoals() {
  const stored = localStorage.getItem("goals");

  if (stored) {
    goals = JSON.parse(stored);

    // same trick as loadTasks() — make sure new goals never reuse an old id,
    // since tasks and goals share the same nextId counter
    const highestId = goals.reduce((max, g) => Math.max(max, g.id), 0);
    nextId = Math.max(nextId, highestId + 1);
  } else {
    goals = [];
  }
}

// Reuse tip: "clear then rebuild" — same pattern as renderTaskList.
// Wipe the container, then redraw everything fresh from the goals array.
function renderGoalsList() {
  goalListEl.innerHTML = "";

  goals.forEach((goal) => {
    const { completed, total, percent } = getGoalProgress(goal);

    const card = document.createElement("div");
    card.className = "goal-card";
    card.dataset.id = goal.id; // links this DOM element back to the data

    card.innerHTML = `
      <div class="goal-top-row">
        <h3 class="goal-title">${goal.title}</h3>
        <div class="goal-actions">
          <button class="view-journey-btn js-view-journey">View Journey</button>
          <button class="task-more js-goal-options">&#8942;</button>
          <div class="task-menu">
            <button class="edit-option js-edit-option">Edit</button>
            <button class="delete-option js-delete-option">Delete</button>
          </div>
        </div>
      </div>

      <div class="goal-meta">
        <span class="tag js-goal-category">${goal.category}</span>
        <span>${completed} of ${total} milestones</span>
      </div>

      <div class="goal-progress-wrap">
        <div class="goal-progress-track">
          <div class="goal-progress-fill" style="width: ${percent}%;"></div>
        </div>
        <span class="goal-progress-percent">${percent}%</span>
      </div>
    `;

    goalListEl.appendChild(card);
  });

  if (goalCountLabel) {
    goalCountLabel.textContent = `${goals.length} goal${goals.length === 1 ? "" : "s"} in progress`;
  }
}

// One listener on the container handles clicks for EVERY card —
// same delegation pattern as taskListContainer in tasks.js.
// Reuse tip: closest() finds the nearest matching ancestor, so it still
// works even if the click lands on an icon *inside* the button.
goalListEl.addEventListener("click", (event) => {
  const card = event.target.closest(".goal-card");
  if (!card) return;

  const id = Number(card.dataset.id);
  const goal = goals.find((g) => g.id === id);
  if (!goal) return;

  if (event.target.closest(".js-goal-options")) {
    const menu = card.querySelector(".task-menu");
    const isOpen = menu.classList.contains("open");
    closeAllMenus();
    if (!isOpen) menu.classList.add("open");
    return;
  }

  if (event.target.closest(".js-edit-option")) {
    closeAllMenus();
    openEditModal(goal, "goal");
    return;
  }

  if (event.target.closest(".js-delete-option")) {
    closeAllMenus();
    deleteGoal(id);
    return;
  }

  if (event.target.closest(".js-view-journey")) {
    // Placeholder for now — wired up when we build the Journey page
    window.location.href = `goals-progress.html?id=${id}`;
  }
});

// NEW: goals.html doesn't load tasks.js, so this can't be reused from there —
// it needs its own copy here, same logic as the one in tasks.js.
function closeAllMenus() {
  document
    .querySelectorAll(".task-menu.open")
    .forEach((menu) => menu.classList.remove("open"));
}

// standard "click outside closes the dropdown" — mirrors tasks.js
window.addEventListener("click", (event) => {
  if (!event.target.closest(".goal-card")) {
    closeAllMenus();
  }
});

function deleteGoal(id) {
  goals = goals.filter((goal) => goal.id !== id);
  saveGoals();
  renderGoalsList();
}

loadGoals();
renderGoalsList();
