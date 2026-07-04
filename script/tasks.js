const totalTaskCount = document.querySelector(".task-count-label");

function renderTotalTasks() {
  let totalTasks = todoTasks.length;
  totalTaskCount.textContent = `${totalTasks} items total`;
}

renderTotalTasks();
