// --- returning visitor check ---
const existingUser = JSON.parse(localStorage.getItem("focusly-user"));
const hasSession = localStorage.getItem("focusly-session");

const registrationCard = document.querySelector(".registration-card");
const welcomeBackCard = document.getElementById("welcome-back-card");
const welcomeBackName = document.getElementById("welcome-back-name");
const continueBtn = document.getElementById("continue-btn");

if (existingUser && hasSession) {
  // already signed in - no reason to sit on the welcome screen
  window.location.replace("dashboard.html");
} else if (existingUser && !hasSession) {
  // we know them, they just signed out - skip the registration form
  registrationCard.classList.add("hidden");
  welcomeBackCard.classList.remove("hidden");
  welcomeBackName.textContent = existingUser.firstName;
}
// else: brand new visitor - registration form stays visible as-is

continueBtn.addEventListener("click", () => {
  localStorage.setItem("focusly-session", "active");
  window.location.replace("dashboard.html");
});

const firstNameInput = document.getElementById("first-name");
const lastNameInput = document.getElementById("last-name");
const emailInput = document.getElementById("email");
const registerBtn = document.getElementById("register-btn");

function showError(inputEl, errorId) {
  inputEl.parentElement.classList.add("error");
  document.getElementById(errorId).classList.remove("hidden");
}

function clearError(inputEl, errorId) {
  inputEl.parentElement.classList.remove("error");
  document.getElementById(errorId).classList.add("hidden");
}

function isValidEmail(email) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

registerBtn.addEventListener("click", () => {
  let valid = true;

  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();
  const email = emailInput.value.trim();

  if (!firstName) {
    showError(firstNameInput, "err-first-name");
    valid = false;
  } else {
    clearError(firstNameInput, "err-first-name");
  }

  if (!lastName) {
    showError(lastNameInput, "err-last-name");
    valid = false;
  } else {
    clearError(lastNameInput, "err-last-name");
  }

  if (!email || !isValidEmail(email)) {
    showError(emailInput, "err-email");
    valid = false;
  } else {
    clearError(emailInput, "err-email");
  }

  if (!valid) return;

  const user = {
    firstName,
    lastName,
    email,
    isNew: true,
  };

  localStorage.setItem("focusly-user", JSON.stringify(user));
  localStorage.setItem("focusly-session", "active"); // <-- add this line
  window.location.replace("dashboard.html");
});

[firstNameInput, lastNameInput, emailInput].forEach((input) => {
  input.addEventListener("input", () => {
    const errId = "err-" + input.id;
    if (document.getElementById(errId)) {
      clearError(input, errId);
    }
  });
});
