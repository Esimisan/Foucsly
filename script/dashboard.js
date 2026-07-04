const todayReminders = document.querySelector(".js-today-reminders");

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

function renderReminderList() {
  const now = new Date();
  const today = now.toISOString().split("T")[0]; // YYYY-MM-DD format

  // --- TASKS: filter for today, then only ones whose dueTime hasn't passed yet ---
  const todaysTasks = todoTasks.filter((task) => task.dueDate === today);

  const upcomingTasks = todaysTasks.filter((task) => {
    const taskDateTime = new Date(`${task.dueDate}T${task.dueTime}`);
    return taskDateTime >= now;
  });

  // --- GOALS: filter for today only. No dueTime exists, so no time check needed ---
  const todaysGoals = goals.filter((goal) => goal.dueDate === today);

  // If nothing to remind about today, hide the reminder bar completely
  if (upcomingTasks.length === 0 && todaysGoals.length === 0) {
    todayReminders.style.display = "none";
    todayReminders.innerHTML = ""; // clear content
    return;
  }

  let reminderItemsHTML = "";

  // Tasks show their title + due time
  upcomingTasks.forEach(({ title, dueTime }) => {
    reminderItemsHTML += `<p class="daily-reminders">${title}: ${dueTime}</p>`;
  });

  // Goals show just their title, since there's no specific time attached
  todaysGoals.forEach(({ title }) => {
    reminderItemsHTML += `<p class="daily-reminders">${title}</p>`;
  });

  const reminderListHTML = `
    <i class="fa-regular fa-bell icon-bell"></i>
    <h4>Today Reminders:</h4>
    <div class="reminder-list">
      ${reminderItemsHTML}
    </div>
    <span class="close-reminders-btn js-close-reminders">&times;</span>
  `;

  todayReminders.innerHTML = reminderListHTML;
  todayReminders.style.display = "flex"; // show bar if there's anything to show

  const closeRemindersBtn = document.querySelector(".js-close-reminders");
  closeRemindersBtn.addEventListener("click", () => {
    todayReminders.style.display = "none";
  });
}

setCurrentDate();
renderReminderList();
