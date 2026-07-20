const modal = document.querySelector(".js-modal");
const openBtn = document.querySelector(".js-open-modal");
const closeBtn = document.querySelector(".js-close-modal");
const cancelBtn = document.querySelector(".js-cancel-modal");

const openModal = () => {
  modal.style.display = "block";
};

const closeModal = () => {
  modal.style.display = "none";
  resetForm();
};

const outsideClick = (event) => {
  if (event.target === modal) {
    modal.style.display = "none";
  }
};

// custom categories the user has created
let customCategories =
  JSON.parse(localStorage.getItem("customCategories")) || [];

function saveCustomCategories() {
  localStorage.setItem("customCategories", JSON.stringify(customCategories));
}

let todoTasks = [];
let goals = [];
let nextId = 1;

// editing mode
let editingId = null;
let editingType = null;

// NEW: temporary holding array for milestones while the modal is open.
// This is NOT the real data — it only becomes real when Create/Save is clicked.
let draftMilestones = [];
let draftMilestoneNextId = 1; // separate counter, scoped to milestones within one goal

const titleInput = document.querySelector(".js-title");
const descriptionInput = document.querySelector(".js-description");
const DateInput = document.querySelector(".js-date");
const timeInput = document.querySelector(".js-time");
const categoryInput = document.querySelector(".js-task-category");
const createTaskbtn = document.querySelector(".js-create-task");

const typeTaskRadio = document.querySelector(".js-type-task");
const typeGoalRadio = document.querySelector(".js-type-goal");
const taskOnlyFields = document.querySelector(".js-task-only-fields");

// NEW: milestone-related elements
const goalOnlyFields = document.querySelector(".js-goal-only-fields");
const milestoneListEl = document.querySelector(".js-milestone-list");
const addMilestoneBtn = document.querySelector(".js-add-milestone");

// NEW: priority is now a row of 3 buttons instead of a <select> — the
// screenshot calls for each one to visually take on its priority color
// once selected, using the same red/amber/green pairs as .priority-tag
// in journey.css, so "High" looks the same everywhere in the app.
const priorityButtons = document.querySelectorAll(".js-priority-btn");
let selectedPriority = "medium";

function setPriority(value) {
  selectedPriority = value;
  priorityButtons.forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.priority === value);
  });
}

priorityButtons.forEach((btn) => {
  btn.addEventListener("click", () => setPriority(btn.dataset.priority));
});

function updateFormFieldsForType() {
  if (typeGoalRadio.checked) {
    taskOnlyFields.style.display = "none";
    goalOnlyFields.style.display = "block"; // NEW: show milestones for goals
  } else {
    taskOnlyFields.style.display = "flex"; // flex, not block — sits inside the due-date-time row
    goalOnlyFields.style.display = "none"; // NEW: hide milestones for tasks
  }
}

// NEW: rebuild the milestone input rows from draftMilestones.
// Reuse tip: this is the exact "clear then rebuild" pattern from your task list —
// wipe the container, then loop over the array and create fresh elements.
function renderMilestoneInputs() {
  milestoneListEl.innerHTML = "";

  draftMilestones.forEach((milestone, index) => {
    const row = document.createElement("div");
    row.className = "milestone-row";

    row.innerHTML = `
      <span class="milestone-number">${index + 1}.</span>
      <input
        type="text"
        class="milestone-input js-milestone-input"
        data-id="${milestone.id}"
        placeholder="Describe this milestone..."
        value="${milestone.text}"
      />
      <button type="button" class="milestone-remove js-milestone-remove" data-id="${milestone.id}">&times;</button>
    `;

    milestoneListEl.appendChild(row);
  });
}

// NEW: "+" button adds one empty milestone to the draft array, then re-renders
addMilestoneBtn.addEventListener("click", () => {
  draftMilestones.push({
    id: draftMilestoneNextId++,
    text: "",
    completed: false,
  });
  renderMilestoneInputs();

  // Reuse tip: focus the newest input so the user can start typing immediately
  const inputs = milestoneListEl.querySelectorAll(".js-milestone-input");
  inputs[inputs.length - 1].focus();
});

// NEW: event delegation for typing into ANY milestone input.
// We can't attach a listener to inputs that don't exist yet, so we listen
// on the parent container instead — same trick as your .closest() delegation.
milestoneListEl.addEventListener("input", (event) => {
  if (event.target.classList.contains("js-milestone-input")) {
    const id = Number(event.target.dataset.id);
    const milestone = draftMilestones.find((m) => m.id === id);
    if (milestone) milestone.text = event.target.value;
  }
});

// NEW: event delegation for the "x" remove button on any milestone row
milestoneListEl.addEventListener("click", (event) => {
  if (event.target.classList.contains("js-milestone-remove")) {
    const id = Number(event.target.dataset.id);
    draftMilestones = draftMilestones.filter((m) => m.id !== id);
    renderMilestoneInputs(); // renumbers automatically since numbers are just array position
  }
});

function resetForm() {
  titleInput.value = "";
  descriptionInput.value = "";
  DateInput.value = "";
  timeInput.value = "";
  setPriority("medium");
  categoryInput.value = "work";

  // NEW: default to Goal if we're on the goals page, Task otherwise
  const onGoalsPage = document.querySelector(".js-goal-list") !== null;
  typeGoalRadio.checked = onGoalsPage;
  typeTaskRadio.checked = !onGoalsPage;

  typeTaskRadio.disabled = false;
  typeGoalRadio.disabled = false;
  updateFormFieldsForType();

  // NEW: clear milestone draft
  draftMilestones = [];
  draftMilestoneNextId = 1;
  renderMilestoneInputs();

  editingId = null;
  editingType = null;
  createTaskbtn.textContent = "Create Item";
}

// this is the same clear-then-rebuild pattern as renderMilestoneInputs wipe anything we previously injected, then loop and recreate from the source array
function renderCustomCategories() {
  // remove any custom options we previously added (tagged below with data-custom)
  categoryInput
    .querySelectorAll('option[data-custom="true"]')
    .forEach((opt) => opt.remove());

  const createOptionEl = categoryInput.querySelector(
    'option[value="create-option"]',
  );

  customCategories.forEach((category) => {
    const opt = document.createElement("option");
    opt.value = category;
    opt.textContent = category.charAt(0).toUpperCase() + category.slice(1);
    opt.dataset.custom = "true"; // marks it so we know it's safe to wipe/rebuild
    categoryInput.insertBefore(opt, createOptionEl);
  });
}

renderCustomCategories(); // run once on page load so saved categories show up immediately

categoryInput.addEventListener("change", () => {
  if (categoryInput.value === "create-option") {
    const customCategory = prompt("Name your new category:");

    if (!customCategory || customCategory.trim() === "") {
      categoryInput.value = "work";
      return;
    }

    const newCategoryValue = customCategory.toLowerCase().trim();

    // avoid duplicates - if it already exists, just select it instead of adding again
    if (!customCategories.includes(newCategoryValue)) {
      customCategories.push(newCategoryValue);
      saveCustomCategories();
      renderCustomCategories();
    }

    categoryInput.value = newCategoryValue;
  }
});

function createItem() {
  const title = titleInput.value;
  const description = descriptionInput.value;
  const dueDate = DateInput.value;
  const category = categoryInput.value;

  if (typeGoalRadio.checked) {
    // NEW: build the real milestones array from the draft,
    // dropping any rows the user left blank
    const milestones = draftMilestones
      .filter((m) => m.text.trim() !== "")
      .map((m) => ({ id: m.id, text: m.text, completed: m.completed }));

    const goal = {
      id: nextId++,
      title,
      description,
      dueDate,
      priority: selectedPriority,
      category,
      status: "pending",
      milestones, // NEW: replaces the old manual "progress" field
      updates: [], // for the Journey page, later
    };
    goals.push(goal);
  } else if (typeTaskRadio.checked) {
    const task = {
      id: nextId++,
      title,
      description,
      dueDate,
      dueTime: timeInput.value,
      priority: selectedPriority,
      category,
      status: "pending",
    };
    todoTasks.push(task);
  }
}

function updateItem() {
  const title = titleInput.value;
  const description = descriptionInput.value;
  const dueDate = DateInput.value;
  const category = categoryInput.value;

  if (editingType === "task") {
    const task = todoTasks.find((t) => t.id === editingId);
    if (!task) return;
    task.title = title;
    task.description = description;
    task.dueDate = dueDate;
    task.dueTime = timeInput.value;
    task.priority = selectedPriority;
    task.category = category;
  } else if (editingType === "goal") {
    const goal = goals.find((g) => g.id === editingId);
    if (!goal) return;
    goal.title = title;
    goal.description = description;
    goal.dueDate = dueDate;
    goal.priority = selectedPriority;
    goal.category = category;

    // NEW: rebuild milestones from the draft (completed status is preserved
    // because we loaded the real `id` + `completed` into the draft in openEditModal)
    goal.milestones = draftMilestones
      .filter((m) => m.text.trim() !== "")
      .map((m) => ({ id: m.id, text: m.text, completed: m.completed }));
  }
}

function openEditModal(item, type) {
  editingId = item.id;
  editingType = type;

  titleInput.value = item.title;
  descriptionInput.value = item.description || "";
  DateInput.value = item.dueDate;
  setPriority(item.priority);
  categoryInput.value = item.category;

  if (type === "task") {
    typeTaskRadio.checked = true;
    timeInput.value = item.dueTime || "";
    draftMilestones = [];
  } else {
    typeGoalRadio.checked = true;
    // NEW: load existing milestones into the draft, preserving id + completed
    draftMilestones = (item.milestones || []).map((m) => ({ ...m }));
    const maxId = draftMilestones.reduce((max, m) => Math.max(max, m.id), 0);
    draftMilestoneNextId = maxId + 1;
  }

  renderMilestoneInputs(); // NEW

  typeTaskRadio.disabled = true;
  typeGoalRadio.disabled = true;

  updateFormFieldsForType();
  createTaskbtn.textContent = "Save Changes";
  openModal();
}

createTaskbtn.addEventListener("click", () => {
  if (editingId !== null) {
    updateItem();
  } else {
    createItem();
  }

  if (typeof renderReminderList === "function") renderReminderList();
  if (typeof renderTotalTasks === "function") renderTotalTasks();
  if (typeof renderTaskList === "function") renderTaskList();
  if (typeof renderGoalsList === "function") renderGoalsList();
  if (typeof saveTasks === "function") saveTasks();
  if (typeof saveGoals === "function") saveGoals();

  closeModal();
});

typeTaskRadio.addEventListener("change", updateFormFieldsForType);
typeGoalRadio.addEventListener("change", updateFormFieldsForType);
updateFormFieldsForType();

openBtn.addEventListener("click", () => {
  resetForm();
  openModal();
});
closeBtn.addEventListener("click", closeModal);

// NEW: Cancel button — the screenshot's footer has both Cancel and
// Create Item, but only Create existed before. Cancel just closes
// without saving, same as clicking the X or outside the modal.
if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

window.addEventListener("click", outsideClick);
