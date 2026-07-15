//hamburger toggle for small screens - opens/closes the side nav
const hamburgerBtn = document.getElementById("hamburgerBtn");
const sideNav = document.querySelector(".side-nav");
const navBackdrop = document.getElementById("navBackdrop");

//guard incase this script loads on a page missing one of these elements
if (hamburgerBtn && sideNav && navBackdrop) {
  hamburgerBtn.addEventListener("click", () => {
    sideNav.classList.toggle("nav-open");
    hamburgerBtn.classList.toggle("active");
    navBackdrop.classList.toggle("active");
  });

  //tapping the dark backdrop closes the nav too
  navBackdrop.addEventListener("click", () => {
    sideNav.classList.remove("nav-open");
    hamburgerBtn.classList.remove("active");
    navBackdrop.classList.remove("active");
  });
}
