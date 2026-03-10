/* =========================
   Alap konfiguráció
   ========================= */
const APP_CONFIG = {
  apiBaseUrl: "http://localhost:3000/api"
};

/* =========================
   Gyors DOM helper-ek
   ========================= */
function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return document.querySelectorAll(selector);
}

/* =========================
   Betöltés után futó logika
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  setActiveNavLink();
  initializeTheme();
  initializePageHooks();
});

/* =========================
   Oldalspecifikus előkészítés
   ========================= */
function initializePageHooks() {
  const page = document.body.dataset.page;

  if (page === "vizteruletek") {
    prepareWatersPage();
  }

  if (page === "fogasnaplo") {
    prepareCatchLogPage();
  }

  if (page === "forum") {
    prepareForumPage();
  }

  if (page === "admin") {
    prepareAdminPage();
  }

  if (page === "profil") {
    prepareProfilePage();
  }
}

/* =========================
   Aktív navbar elem kezelése
   ========================= */
function setActiveNavLink() {
  const page = document.body.dataset.page;
  const navLinks = $all(".nav-link");

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");

    if (
      (page === "index" && href === "index.html") ||
      (page === "vizteruletek" && href === "vizteruletek.html") ||
      (page === "fogasnaplo" && href === "fogasnaplo.html") ||
      (page === "forum" && href === "forum.html") ||
      (page === "admin" && href === "admin.html") ||
      (page === "profil" && href === "profil.html")
    ) {
      link.classList.add("active");
    }
  });
}

/* =========================
   Téma inicializálás
   ========================= */
function initializeTheme() {
  const savedTheme = localStorage.getItem("theme");
  const body = document.body;

  if (savedTheme === "light" || savedTheme === "dark") {
    body.setAttribute("data-theme", savedTheme);
  } else {
    body.setAttribute("data-theme", "dark");
  }

  updateThemeButtons();

  const desktopButton = $("#themeToggleDesktop");
  const mobileButton = $("#themeToggleMobile");

  if (desktopButton) {
    desktopButton.addEventListener("click", toggleTheme);
  }

  if (mobileButton) {
    mobileButton.addEventListener("click", toggleTheme);
  }
}

/* =========================
   Téma váltás
   ========================= */
function toggleTheme() {
  const body = document.body;
  const currentTheme = body.getAttribute("data-theme");

  if (currentTheme === "dark") {
    body.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  } else {
    body.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
  }

  updateThemeButtons();
}

/* =========================
   Téma gomb ikon frissítés
   ========================= */
function updateThemeButtons() {
  const body = document.body;
  const currentTheme = body.getAttribute("data-theme");

  const desktopButton = $("#themeToggleDesktop");
  const mobileButton = $("#themeToggleMobile");

  const icon = currentTheme === "dark" ? "☀️" : "🌙";

  if (desktopButton) {
    const iconSpan = desktopButton.querySelector(".theme-icon");
    if (iconSpan) iconSpan.textContent = icon;
  }

  if (mobileButton) {
    const iconSpan = mobileButton.querySelector(".theme-icon");
    if (iconSpan) iconSpan.textContent = icon;
  }
}

/* =========================
   Közös állapotkezelő helper-ek
   ========================= */
function showElement(element) {
  if (element) element.classList.remove("d-none");
}

function hideElement(element) {
  if (element) element.classList.add("d-none");
}

function setText(element, value = "") {
  if (element) element.textContent = value;
}

function clearElement(element) {
  if (element) element.innerHTML = "";
}

/* =========================
   Vízterületek oldal előkészítés
   ========================= */
function prepareWatersPage() {
  const form = $("#waterFiltersForm");
  const resultsTableBody = $("#waterResultsTableBody");

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      // Később: backend fetch ide
    });
  }

  if (resultsTableBody) {
    clearElement(resultsTableBody);
  }
}

/* =========================
   Fogásnapló oldal előkészítés
   ========================= */
function prepareCatchLogPage() {
  const catchForm = $("#catchForm");
  const catchListContainer = $("#catchListContainer");

  if (catchForm) {
    catchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      // Később: backend fetch ide
    });
  }

  if (catchListContainer) {
    clearElement(catchListContainer);
  }
}

/* =========================
   Fórum oldal előkészítés
   ========================= */
function prepareForumPage() {
  const topicForm = $("#forumTopicForm");
  const replyForm = $("#forumReplyForm");
  const topicsList = $("#forumTopicsList");
  const postsList = $("#forumPostsList");

  if (topicForm) {
    topicForm.addEventListener("submit", (event) => {
      event.preventDefault();
      // Később: backend fetch ide
    });
  }

  if (replyForm) {
    replyForm.addEventListener("submit", (event) => {
      event.preventDefault();
      // Később: backend fetch ide
    });
  }

  if (topicsList) {
    clearElement(topicsList);
  }

  if (postsList) {
    clearElement(postsList);
  }
}

/* =========================
   Admin oldal előkészítés
   ========================= */
function prepareAdminPage() {
  const usersTableBody = $("#adminUsersTableBody");

  if (usersTableBody) {
    clearElement(usersTableBody);
  }
}

/* =========================
   Profil oldal előkészítés
   ========================= */
function prepareProfilePage() {
  const loginForm = $("#loginForm");
  const registerForm = $("#registerForm");

  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      // Később: backend fetch ide
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      // Később: backend fetch ide
    });
  }
}