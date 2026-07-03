const todayReminders = document.querySelector('.js-today-reminders')

function setCurrentDate(){
  const currentDate = document.querySelector('.js-current-date');
  if(!currentDate) return;
  const today = new Date();
  const months = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
  const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  currentDate.textContent = `${weekdays[today.getDay()]}, ${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
}

function renderReminderList() {
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format

  // Filter tasks for today only
  const todaysTasks = todoTasks.filter(task => task.dueDate === today);

  // Further filter: only tasks whose dueTime is still ahead
  const upcomingTasks = todaysTasks.filter(task => {
    const taskDateTime = new Date(`${task.dueDate}T${task.dueTime}`);
    return taskDateTime >= now;
  });

  // If no upcoming tasks for today, hide the reminder bar completely
  if (upcomingTasks.length === 0) {
    todayReminders.style.display = 'none';
    todayReminders.innerHTML = ''; // clear content
    return;
  }

  let reminderItemsHTML = '';

  // Loop only through upcoming tasks
  upcomingTasks.forEach(({ title, dueTime }) => {
    reminderItemsHTML += `<p class="daily-reminders">${title}: ${dueTime}</p>`;
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
  todayReminders.style.display = 'flex'; // show bar if tasks exist

  // Attach close button functionality
  const closeRemindersBtn = document.querySelector('.js-close-reminders');
  closeRemindersBtn.addEventListener('click', () => {
    todayReminders.style.display = 'none';
  });
}


setCurrentDate();
renderReminderList();
