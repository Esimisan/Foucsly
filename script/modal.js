const modal = document.querySelector(".js-modal");
const openBtn = document.querySelector(".js-open-modal");
const closeBtn = document.querySelector(".js-close-modal");

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

let todoTasks = [];
let goals = [];
let nextId = 1; // simple counter we increase every time something new is created, so every task/goal gets a unique id

//editing mode
let editingId = null;
let editingType = null;

const titleInput = document.querySelector(".js-title");
const descriptionInput = document.querySelector(".js-description");
const DateInput = document.querySelector(".js-date");
const timeInput = document.querySelector(".js-time");
const priorityInput = document.querySelector(".js-priority");
const categoryInput = document.querySelector(".js-task-category");
const createTaskbtn = document.querySelector(".js-create-task");

const typeTaskRadio = document.querySelector(".js-type-task");
const typeGoalRadio = document.querySelector(".js-type-goal");
const taskOnlyFields = document.querySelector(".js-task-only-fields");

function updateFormFieldsForType() {
  if (typeGoalRadio.checked) {
    taskOnlyFields.style.display = "none";
  } else {
    taskOnlyFields.style.display = "block";
  }
}

// using edditing state and resetting form together, stops old edit from leaking into the next create item
function resetForm() {
  titleInput.value = "";
  descriptionInput.value = "";
  DateInput.value = "";
  timeInput.value = "";
  priorityInput.value = "medium";
  categoryInput.value = "work";

  typeTaskRadio.checked = true;
  typeTaskRadio.disabled = false;
  typeGoalRadio.disabled = false;
  updateFormFieldsForType();

  editingId = null;
  editingType = null;
  createTaskbtn.textContent = "Create Task";
}

function createItem() {
  const title = titleInput.value;
  const description = descriptionInput.value;
  const dueDate = DateInput.value;
  const category = categoryInput.value;

  if (typeGoalRadio.checked) {
    // Build a GOAL: no dueTime, but has priority, progress, and an updates log
    const goal = {
      id: nextId++,
      title,
      description,
      dueDate,
      priority: priorityInput.value,
      category,
      status: "pending", // 'pending', 'completed', or 'overdue'
      progress: 0, // percentage, 0-100
      updates: [], // will hold { date, note, progressAtTime } entries later
    };
    goals.push(goal);
  } else if (typeTaskRadio.checked) {
    // Build a TASK: has dueTime + priority, no progress bar
    const task = {
      id: nextId++,
      title,
      description,
      dueDate,
      dueTime: timeInput.value,
      priority: priorityInput.value,
      category,
      status: "pending", // 'pending', 'completed', or 'overdue'
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
    task.priority = priorityInput.value;
    task.category = category;
  } else if (editingType === "goal") {
    const goal = goals.find((g) => g.id === editingId);
    if (!goal) return;
    goal.title = title;
    goal.description = description;
    goal.dueDate = dueDate;
    goal.priority = priorityInput.value;
    goal.category = category;
  }
}

function openEditModal(item, type) {
  editingId = item.id;
  editingType = type;

  titleInput.value = item.title;
  descriptionInput.value = item.description || "";
  DateInput.value = item.dueDate;
  priorityInput.value = item.priority;
  categoryInput.value = item.category;

  if (type === "task") {
    typeTaskRadio.checked = true;
    timeInput.value = item.dueTime || "";
  } else {
    typeGoalRadio.checked = true;
  }

  // Don't let someone turn a task into a goal mid-edit (or vice versa)
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

  // Every one of these is guarded with typeof, because modal.js is shared across pages that may not define all of these functions.

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
window.addEventListener("click", outsideClick);
