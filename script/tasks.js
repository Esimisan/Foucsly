const priorityColors = {
  high: "priority-high",
  medium: "priority-medium",
  low: "priority-low",
};

const taskListContainer = document.querySelector(".js-task-list");
const totalTaskCount = document.querySelector(".task-count-label");

// for checked tasks that hasnt been locked in yet
let pendingCompletedIds = new Set();

function saveTasks() {
  localStorage.setItem("todoTasks", JSON.stringify(todoTasks));
}

function loadTasks() {
  const stored = localStorage.getItem("todoTasks");

  if (stored) {
    todoTasks = JSON.parse(stored);

    //makes sure new tasks are created and never reuse an old id
    const highestId = todoTasks.reduce((max, t) => Math.max(max, t.id), 0);
    nextId = Math.max(nextId, highestId + 1);
  } else {
    // no seed data — a brand new user just starts with an empty list
    todoTasks = [];
    nextId = 1;
  }
}

//checks if a task's due date/time has already passed
function isTaskOverdue(task) {
  if (!task.dueDate) return false;

  const dueDateTime = new Date(`${task.dueDate}T${task.dueTime || "23:59"}`);
  return dueDateTime.getTime() < Date.now();
}

function renderTaskList() {
  taskListContainer.innerHTML = "";

  todoTasks.forEach((task) => {
    const isPendingComplete = pendingCompletedIds.has(task.id);
    // checking if task is completed or still pending
    const isCompleted = task.status === "completed" || isPendingComplete;

    //a task only counts as overdue if it's still active — checked or deleted tasks don't qualify
    const overdue = !isCompleted && isTaskOverdue(task);

    //this row holds the card and the overdue badge side by side, so the badge sits outside the card, not inside it
    const row = document.createElement("div");
    row.className = "task-row";

    //building each card as a real DOM elemennt
    const card = document.createElement("div");
    card.className = "task-card" + (isCompleted ? " completed" : "");
    card.dataset.id = task.id;
    card.innerHTML = `
            <div class="task-check ${isCompleted ? "done" : ""}"></div>
            <div class="task-info">
              <p class="task-name js-task-name">
              <span class="priority-dot ${priorityColors[task.priority]}"></span> ${task.title} 
              </p>
              <div class="task-meta">
                <span class="tag js-task-category">${task.category}</span>
                <span class="due-date js-task-due-date">${task.dueDate}</span>
              </div>
            </div>
            <button class="task-more js-task-options">&#8250;</button>
            <div class="task-menu">
              ${
                //completed tasks get "Redo Task" instead of "Edit"
                isCompleted
                  ? `<button class="redo-option js-redo-option">Redo Task</button>`
                  : `<button class="edit-option js-edit-option">Edit</button>`
              }
              <button class="delete-option js-delete-option">Delete</button>
            </div>
    `;

    row.appendChild(card);

    //only add the badge next to the card if the task is actually overdue
    if (overdue) {
      const badge = document.createElement("div");
      badge.className = "overdue-badge";
      badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Task overdue`;
      row.appendChild(badge);
    }

    taskListContainer.appendChild(row);
  });
}

function renderTotalTasks() {
  if (!totalTaskCount) return;

  // what makes the task count drop when you check a task as completed
  const activeCount = todoTasks.filter(
    (task) => task.status !== "completed" && !pendingCompletedIds.has(task.id),
  ).length;

  totalTaskCount.textContent = `${activeCount} task${activeCount === 1 ? "" : "s"} remaining`;
}

// One listener on the container handles clicks for EVERY card
// listen on the parent, then use event.target.closest() to identify what was clicked.
taskListContainer.addEventListener("click", (event) => {
  const card = event.target.closest(".task-card");
  if (!card) return;

  const id = Number(card.dataset.id);
  const task = todoTasks.find((t) => t.id === id);
  if (!task) return;

  if (event.target.closest(".task-check")) {
    toggleTaskCheck(task);
    return;
  }

  if (event.target.closest(".js-task-options")) {
    const menu = card.querySelector(".task-menu");
    const isOpen = menu.classList.contains("open");
    closeAllMenus();
    if (!isOpen) menu.classList.add("open");
    return;
  }

  if (event.target.closest(".js-edit-option")) {
    closeAllMenus();
    openEditModal(task, "task");
    return;
  }

  if (event.target.closest(".js-redo-option")) {
    //reschedule a checked task and make it active again
    closeAllMenus();
    openRedoModal(task);
    return;
  }

  if (event.target.closest(".js-delete-option")) {
    closeAllMenus();
    deleteTask(id);
    return;
  }
});

function closeAllMenus() {
  document
    .querySelectorAll(".task-menu.open")
    .forEach((menu) => menu.classList.remove("open"));
}

//standard 'click outside and close' for any dropdown, menu or popover, if the user click anywhere outside the task card
window.addEventListener("click", (event) => {
  if (!event.target.closest(".task-card")) {
    closeAllMenus();
  }
});

// incase a user checks the task complete mistakenly
function toggleTaskCheck(task) {
  if (pendingCompletedIds.has(task.id)) {
    pendingCompletedIds.delete(task.id);
  } else {
    pendingCompletedIds.add(task.id);
    showCompletionToast(task);
  }

  renderTaskList();
  renderTotalTasks();
}

//where the check complete finally becomes permanent, when the tab is closed, refreshed or the user navigates to another page
function commitPendingCompletions() {
  if (pendingCompletedIds.size === 0) return;

  todoTasks.forEach((task) => {
    if (pendingCompletedIds.has(task.id)) {
      task.status = "completed";
    }
  });

  saveTasks();
}

window.addEventListener("beforeunload", commitPendingCompletions);

//delete the task by using .filter() to remove by id
function deleteTask(id) {
  todoTasks = todoTasks.filter((task) => task.id !== id);
  pendingCompletedIds.delete(id);
  saveTasks();
  renderTaskList();
  renderTotalTasks();
}

// checked/completed tasks show "Redo Task" instead of "Edit" in their menu
// this modal only asks for a new date and time, nothing else about the task changes
const redoModal = document.querySelector(".js-redo-modal");
const closeRedoBtn = document.querySelector(".js-close-redo-modal");
const redoDateInput = document.querySelector(".js-redo-date");
const redoTimeInput = document.querySelector(".js-redo-time");
const saveRedoBtn = document.querySelector(".js-save-redo");

// keeps track of which task the redo modal is currently open for
let redoTaskId = null;

function openRedoModal(task) {
  redoTaskId = task.id;
  redoDateInput.value = task.dueDate || "";
  redoTimeInput.value = task.dueTime || "";
  redoModal.style.display = "block";
}

function closeRedoModal() {
  redoModal.style.display = "none";
  redoTaskId = null;
}

saveRedoBtn.addEventListener("click", () => {
  const task = todoTasks.find((t) => t.id === redoTaskId);
  if (!task) return;

  //give it a new date and time
  task.dueDate = redoDateInput.value;
  task.dueTime = redoTimeInput.value;

  //bring it back to active, whether it was only checked or already locked in as completed
  task.status = "pending";
  pendingCompletedIds.delete(task.id);

  saveTasks();
  renderTaskList();
  renderTotalTasks();
  closeRedoModal();
});

closeRedoBtn.addEventListener("click", closeRedoModal);

//closes the redo modal if you click outside it
window.addEventListener("click", (event) => {
  if (event.target === redoModal) {
    closeRedoModal();
  }
});

// the mark as completed toast/popup(reusable block of code)
function showCompletionToast(task) {
  //remove any popup on the screen so it doesnt stack up
  document.querySelectorAll(".task-toast").forEach((toast) => toast.remove());

  const toast = document.createElement("div");
  toast.className = "task-toast";
  toast.innerHTML = `
  <p>“${task.title}” was marked as completed. You can delete it now or keep it in your list.</p>
    <div class="task-toast-actions">
      <button class="js-toast-delete">Delete now</button>
      <button class="js-toast-dismiss">Keep it</button>
    </div>
  `;

  toast.querySelector(".js-toast-delete").addEventListener("click", () => {
    deleteTask(task.id);
    toast.remove();
  });

  toast.querySelector(".js-toast-dismiss").addEventListener("click", () => {
    toast.remove();
  });

  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 6000);
}

loadTasks();
renderTaskList();
renderTotalTasks();
