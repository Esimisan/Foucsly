// settings.js - profile editing, sign out, clear all data

// --- session gate: bounce out immediately if not signed in ---
// this has to run before anything else touches the page
if (!localStorage.getItem("focusly-session")) {
  window.location.replace("index.html");
}

const firstNameInput = document.getElementById("settings-first-name");
const lastNameInput = document.getElementById("settings-last-name");
const saveBtn = document.getElementById("save-profile-btn");
const profileMessage = document.getElementById("profile-message");

const signOutBtn = document.getElementById("sign-out-btn");
const clearDataBtn = document.getElementById("clear-data-btn");

const confirmOverlay = document.getElementById("confirm-overlay");
const confirmTitle = document.getElementById("confirm-title");
const confirmMessage = document.getElementById("confirm-message");
const confirmOkBtn = document.getElementById("confirm-ok-btn");
const confirmCancelBtn = document.getElementById("confirm-cancel-btn");

//fill the name fields with whatever's currently saved
function loadProfile() {
  const user = JSON.parse(localStorage.getItem("focusly-user"));
  if (!user) return;

  firstNameInput.value = user.firstName;
  lastNameInput.value = user.lastName;
}

//small helper to flash a success/error message under the save button
function showProfileMessage(text, isError) {
  profileMessage.textContent = text;
  profileMessage.classList.remove("hidden");
  profileMessage.classList.toggle("error-text", isError);

  //fade it back out after a couple seconds, same idea as your toast pattern
  setTimeout(() => {
    profileMessage.classList.add("hidden");
  }, 2000);
}

saveBtn.addEventListener("click", () => {
  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();

  if (!firstName || !lastName) {
    showProfileMessage("first and last name can't be empty", true);
    return;
  }

  const user = JSON.parse(localStorage.getItem("focusly-user"));
  user.firstName = firstName;
  user.lastName = lastName;
  localStorage.setItem("focusly-user", JSON.stringify(user));

  showProfileMessage("profile updated", false);
});

// --- generic confirm popup ---
// one function, reused for both sign out and clear data, so we're not
// writing two near-identical modals

let pendingConfirmAction = null; //holds whatever function should run if they hit "confirm"

function openConfirm({ title, message, confirmText, danger, onConfirm }) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmOkBtn.textContent = confirmText;
  confirmOkBtn.classList.toggle("danger-btn", !!danger);

  pendingConfirmAction = onConfirm;
  confirmOverlay.classList.remove("hidden");
}

function closeConfirm() {
  confirmOverlay.classList.add("hidden");
  pendingConfirmAction = null;
}

confirmOkBtn.addEventListener("click", () => {
  if (pendingConfirmAction) pendingConfirmAction();
  closeConfirm();
});

confirmCancelBtn.addEventListener("click", closeConfirm);

//clicking the dark backdrop (not the box itself) also cancels
confirmOverlay.addEventListener("click", (e) => {
  if (e.target === confirmOverlay) closeConfirm();
});

// --- sign out ---
signOutBtn.addEventListener("click", () => {
  openConfirm({
    title: "Sign out?",
    message: "You can come back anytime - your tasks and goals stay saved.",
    confirmText: "Sign Out",
    danger: false,
    onConfirm: () => {
      localStorage.removeItem("focusly-session");
      window.location.replace("index.html");
    },
  });
});

// --- clear all data ---
clearDataBtn.addEventListener("click", () => {
  openConfirm({
    title: "Clear all data?",
    message:
      "This deletes everything - tasks, goals, focus history, and your profile. This can't be undone.",
    confirmText: "Clear Everything",
    danger: true,
    onConfirm: () => {
      localStorage.clear(); //nukes every key focusly has stored, session included
      window.location.replace("index.html");
    },
  });
});

loadProfile();
