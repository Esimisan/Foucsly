const modal = document.querySelector(".js-modal");
const openBtn = document.querySelector(".js-open-modal");
const closeBtn = document.querySelector(".js-close-modal");

const openModal = () => {
  modal.style.display = "block";
};

const closeModal = () => {
  modal.style.display = "none";
};

const outsideClick = (event) => {
  if (event.target === modal) {
    modal.style.display = "none";
  }
};

let todoTasks = [];
let goals = [];
let nextId = 1; // simple counter we increase every time something new is created, so every task/goal gets a unique id

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

// Shows the Due Time + Priority fields only when "Task" is selected,
// since goals don't need those.
function updateFormFieldsForType() {
  if (typeGoalRadio.checked) {
    taskOnlyFields.style.display = "none";
  } else {
    taskOnlyFields.style.display = "block";
  }
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

createTaskbtn.addEventListener("click", () => {
  createItem();

  if (typeof renderReminderList === "function") {
    renderReminderList();
  }

  if (typeof renderTotalTasks === "function") {
    renderTotalTasks();
  }
});

typeTaskRadio.addEventListener("change", updateFormFieldsForType);
typeGoalRadio.addEventListener("change", updateFormFieldsForType);
updateFormFieldsForType();

openBtn.addEventListener("click", openModal);
closeBtn.addEventListener("click", closeModal);
window.addEventListener("click", outsideClick);
