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

openBtn.addEventListener('click', openModal);
closeBtn.addEventListener('click', closeModal);
window.addEventListener('click', outsideClick)