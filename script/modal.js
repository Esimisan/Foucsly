const modal = document.querySelector('.js-modal');
const openBtn = document.querySelector('.js-open-modal');
const closeBtn = document.querySelector('.js-close-modal')

const openModal = () => {
  modal.style.display = "block";
}

const closeModal = () => {
  modal.style.display = "none";
}

const outsideClick = (event) => {
if (event.target === modal){
  modal.style.display = "none";
}
};

let todoTasks = [];

const titleInput = document.querySelector('.js-title');
const descriptionInput = document.querySelector('.js-description');
const DateInput = document.querySelector('.js-date');
const timeInput = document.querySelector('.js-time');
const priorityInput = document.querySelector('.js-priority');
const categoryInput = document.querySelector('.js-task-category');
const durationInput = document.querySelector('.js-task-duration');
const createTaskbtn = document.querySelector('.js-create-task')

function addTask(){
  const title = titleInput.value;
  const description = descriptionInput.value;
  const dueDate = DateInput.value;
  const dueTime = timeInput.value;
  const priority = priorityInput.value;
  const category = categoryInput.value;
  const duration = durationInput.value;

  const tasks = {
    title,
    description,
    dueDate,
    dueTime,
    priority,
    category,
    duration
  };
  todoTasks.push(tasks);
}

createTaskbtn.addEventListener('click', () => {
  addTask();
  renderReminderList();
})









openBtn.addEventListener('click', openModal);
closeBtn.addEventListener('click', closeModal);
window.addEventListener('click', outsideClick)