/* =========================
   Alap konfiguráció
   ========================= */
const APP_CONFIG = {
  apiBaseUrl: "http://localhost:4000/api"
};

const IMAGE_UPLOAD_MAX_SIZE_BYTES = 5 * 1024 * 1024;

const ADMIN_SHORTCUTS = {
  species: {
    href: "admin.html#species",
    label: "Halfajok kezelése",
    title: "Halfajok kezelése",
    description: "Új halfaj hozzáadása és a meglévő halfajok szerkesztése.",
  },
  waters: {
    href: "admin.html#waters",
    label: "Vízterületek kezelése",
    title: "Vízterületek kezelése",
    description: "Új vízterület létrehozása és a meglévő vízterületek szerkesztése.",
  },
  forum: {
    href: "admin.html#forum",
    label: "Fórum moderáció",
    title: "Fórum moderáció",
    description: "Fórum témák és hozzászólások adminisztrációja.",
  },
  reports: {
    href: "admin.html#reports",
    label: "Üzenetek",
    title: "Report üzenetek",
    description: "Fórum reportok kezelése és admin válaszok küldése.",
  },
};

const DEFAULT_NAV_ITEMS = [
  { defaultHref: "vizteruletek.html", defaultLabel: "Vízterületek", adminShortcut: ADMIN_SHORTCUTS.species },
  { defaultHref: "fogasnaplo.html", defaultLabel: "Fogásnapló", adminShortcut: ADMIN_SHORTCUTS.waters },
  { defaultHref: "forum.html", defaultLabel: "Fórum", adminShortcut: ADMIN_SHORTCUTS.forum },
];

const HOME_PAGE_SHORTCUTS = [
  {
    defaultHref: "vizteruletek.html",
    defaultTitle: "Vízterületek",
    defaultDescription: "Szűrés megye, víztípus és halfaj szerint.",
    adminShortcut: ADMIN_SHORTCUTS.species,
  },
  {
    defaultHref: "fogasnaplo.html",
    defaultTitle: "Fogásnapló",
    defaultDescription: "Saját fogások rögzítése és listázása.",
    adminShortcut: ADMIN_SHORTCUTS.waters,
  },
  {
    defaultHref: "forum.html",
    defaultTitle: "Fórum",
    defaultDescription: "Kérdések, tippek és tapasztalatok megosztása.",
    adminShortcut: ADMIN_SHORTCUTS.forum,
  },
];

const FORUM_REPORT_REASON_LABELS = {
  spam: "Spam vagy kéretlen tartalom",
  offensive: "Sértő vagy nem megfelelő tartalom",
  harassment: "Zaklatás vagy személyeskedés",
  misleading: "Félrevezető információ",
  off_topic: "Nem kapcsolódik a témához",
  other: "Egyéb",
};

const marketplaceState = {
  categories: [],
  activeCategory: "all",
  search: "",
  sort: "featured",
  viewMode: "grid",
};

/* =========================
   Gyors DOM helper-ek
   ========================= */
function $(selector) {
  return document.querySelector(selector);
}

function getViewedProfileUserId() {
  const params = new URLSearchParams(window.location.search);
  const rawUserId = params.get("userId");

  if (!rawUserId) {
    const storedUserId = sessionStorage.getItem("viewedProfileUserId");

    if (!storedUserId) {
      return null;
    }

    sessionStorage.removeItem("viewedProfileUserId");
    const fallbackUserId = Number(storedUserId);
    return Number.isInteger(fallbackUserId) && fallbackUserId > 0 ? fallbackUserId : null;
  }

  sessionStorage.removeItem("viewedProfileUserId");
  const userId = Number(rawUserId);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function getMarketplaceListingId() {
  const params = new URLSearchParams(window.location.search);
  const rawListingId = params.get("id");

  if (!rawListingId) {
    return null;
  }

  const listingId = Number(rawListingId);
  return Number.isInteger(listingId) && listingId > 0 ? listingId : null;
}

function $all(selector) {
  return document.querySelectorAll(selector);
}

/* =========================
   Betöltés után futó logika
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
  updateNavbar();
  setActiveNavLink();
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

  if (page === "marketplace") {
    prepareMarketplacePage();
  }

  if (page === "marketplace-detail") {
    prepareMarketplaceDetailPage();
  }

  if (page === "admin") {
    prepareAdminPage();
  }

  if (page === "profil") {
    prepareProfilePage();
  }

  if (page === "login") {
    prepareLoginPage();
  }

  if (page === "register") {
    prepareRegisterPage();
  }
}

/* =========================
   Aktív navbar elem kezelése
   ========================= */
function setActiveNavLink() {
  const page = document.body.dataset.page;
  const navLinks = $all(".nav-link");
  const currentHash = window.location.hash || "";

  navLinks.forEach((link) => link.classList.remove("active"));

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");

    if (
      (page === "index" && href === "index.html") ||
      (page === "baratok" && href === "baratok.html") ||
      (page === "vizteruletek" && href === "vizteruletek.html") ||
      (page === "fogasnaplo" && href === "fogasnaplo.html") ||
      (page === "forum" && href === "forum.html") ||
      ((page === "marketplace" || page === "marketplace-detail") && href === "marketplace.html") ||
      (page === "admin" && (
        (currentHash && href === `admin.html${currentHash}`) ||
        (!currentHash && href === "admin.html")
      )) ||
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

  const icon = currentTheme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19";

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

function ensureAdminReportsNavItem() {
  const adminNavItem = $("#adminNavItem");
  const navbarMenu = $("#navbarMenu");

  if (!adminNavItem || !navbarMenu) {
    return null;
  }

  let reportsNavItem = $("#reportsNavItem");

  if (!reportsNavItem) {
    reportsNavItem = document.createElement("li");
    reportsNavItem.className = "nav-item d-none";
    reportsNavItem.id = "reportsNavItem";
    reportsNavItem.innerHTML = '<a class="nav-link" href="admin.html#reports">Üzenetek</a>';
    adminNavItem.insertAdjacentElement("beforebegin", reportsNavItem);
  }

  return reportsNavItem;
}

function ensureMarketplaceNavItem() {
  const navbarMenu = $("#navbarMenu");
  if (!navbarMenu) {
    return null;
  }

  let marketplaceNavItem = $("#marketplaceNavItem");

  if (!marketplaceNavItem) {
    const forumLink = findNavigationLink(["forum.html", ADMIN_SHORTCUTS.forum.href]);
    const forumNavItem = forumLink?.closest(".nav-item");

    marketplaceNavItem = document.createElement("li");
    marketplaceNavItem.className = "nav-item";
    marketplaceNavItem.id = "marketplaceNavItem";
    marketplaceNavItem.innerHTML = '<a class="nav-link" href="marketplace.html">Marketplace</a>';

    if (forumNavItem) {
      forumNavItem.insertAdjacentElement("afterend", marketplaceNavItem);
    } else {
      navbarMenu.appendChild(marketplaceNavItem);
    }
  }

  return marketplaceNavItem;
}

function ensureAppDialogElements() {
  let modalElement = document.getElementById("appDialogModal");

  if (!modalElement) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div
        class="modal fade app-dialog-modal"
        id="appDialogModal"
        tabindex="-1"
        aria-labelledby="appDialogTitle"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content app-card">
            <div class="modal-header">
              <h5 class="modal-title" id="appDialogTitle">Üzenet</h5>
            </div>
            <div class="modal-body">
              <p id="appDialogMessage" class="mb-0"></p>
            </div>
            <div class="modal-footer">
              <button type="button" id="appDialogCancelButton" class="btn btn-outline-light d-none">
                Mégse
              </button>
              <button type="button" id="appDialogConfirmButton" class="btn btn-primary">
                Rendben
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    modalElement = wrapper.firstElementChild;
    document.body.appendChild(modalElement);
  }

  return {
    modalElement,
    titleElement: modalElement.querySelector("#appDialogTitle"),
    messageElement: modalElement.querySelector("#appDialogMessage"),
    cancelButton: modalElement.querySelector("#appDialogCancelButton"),
    confirmButton: modalElement.querySelector("#appDialogConfirmButton"),
  };
}

function showAppDialog({
  title = "Üzenet",
  message = "",
  confirmLabel = "Rendben",
  cancelLabel = "Mégse",
  showCancel = false,
  confirmButtonClass = "btn-primary",
}) {
  if (typeof bootstrap === "undefined") {
    if (showCancel) {
      return Promise.resolve(window.confirm(message));
    }

    window.alert(message);
    return Promise.resolve(true);
  }

  const {
    modalElement,
    titleElement,
    messageElement,
    cancelButton,
    confirmButton,
  } = ensureAppDialogElements();

  setText(titleElement, title);
  setText(messageElement, message);
  setText(cancelButton, cancelLabel);
  setText(confirmButton, confirmLabel);

  cancelButton.className = `btn btn-outline-light${showCancel ? "" : " d-none"}`;
  confirmButton.className = `btn ${confirmButtonClass}`;

  const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);

  return new Promise((resolve) => {
    let result = !showCancel;

    const cleanup = () => {
      confirmButton.removeEventListener("click", handleConfirm);
      cancelButton.removeEventListener("click", handleCancel);
      modalElement.removeEventListener("hidden.bs.modal", handleHidden);
    };

    const handleConfirm = () => {
      result = true;
      modalInstance.hide();
    };

    const handleCancel = () => {
      result = false;
      modalInstance.hide();
    };

    const handleHidden = () => {
      cleanup();
      resolve(result);
    };

    confirmButton.addEventListener("click", handleConfirm);
    cancelButton.addEventListener("click", handleCancel);
    modalElement.addEventListener("hidden.bs.modal", handleHidden);
    modalInstance.show();
  });
}

function showAppAlert(message, options = {}) {
  return showAppDialog({
    title: options.title || "Üzenet",
    message,
    confirmLabel: options.confirmLabel || "Rendben",
    confirmButtonClass: options.confirmButtonClass || "btn-primary",
  });
}

function showAppSuccess(message, options = {}) {
  return showAppAlert(message, {
    title: options.title || "Megerősítés",
    confirmLabel: options.confirmLabel || "Rendben",
    confirmButtonClass: options.confirmButtonClass || "btn-success",
  });
}

function showAppConfirm(message, options = {}) {
  return showAppDialog({
    title: options.title || "Megerősítés",
    message,
    confirmLabel: options.confirmLabel || "Igen",
    cancelLabel: options.cancelLabel || "Mégse",
    showCancel: true,
    confirmButtonClass: options.confirmButtonClass || "btn-danger",
  });
}

function showAppTextPrompt({
  title = "Megjegyzés",
  label = "Megjegyzés",
  initialValue = "",
  placeholder = "",
  confirmLabel = "Mentés",
}) {
  if (typeof bootstrap === "undefined") {
    const fallbackValue = window.prompt(label, initialValue);
    return Promise.resolve(fallbackValue === null ? null : String(fallbackValue));
  }

  let modalElement = document.getElementById("appTextPromptModal");

  if (!modalElement) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div
        class="modal fade app-dialog-modal"
        id="appTextPromptModal"
        tabindex="-1"
        aria-labelledby="appTextPromptTitle"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content app-card">
            <div class="modal-header">
              <h5 class="modal-title" id="appTextPromptTitle">Megjegyzés</h5>
            </div>
            <div class="modal-body">
              <label id="appTextPromptLabel" class="form-label" for="appTextPromptInput">Megjegyzés</label>
              <textarea id="appTextPromptInput" class="form-control app-input" rows="4" maxlength="500"></textarea>
            </div>
            <div class="modal-footer">
              <button type="button" id="appTextPromptCancelButton" class="btn btn-outline-light">Mégse</button>
              <button type="button" id="appTextPromptConfirmButton" class="btn btn-primary">Mentés</button>
            </div>
          </div>
        </div>
      </div>
    `;

    modalElement = wrapper.firstElementChild;
    document.body.appendChild(modalElement);
  }

  const titleElement = modalElement.querySelector("#appTextPromptTitle");
  const labelElement = modalElement.querySelector("#appTextPromptLabel");
  const inputElement = modalElement.querySelector("#appTextPromptInput");
  const cancelButton = modalElement.querySelector("#appTextPromptCancelButton");
  const confirmButton = modalElement.querySelector("#appTextPromptConfirmButton");

  setText(titleElement, title);
  setText(labelElement, label);
  setText(confirmButton, confirmLabel);
  inputElement.value = initialValue || "";
  inputElement.placeholder = placeholder || "";

  const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);

  return new Promise((resolve) => {
    let result = null;

    const cleanup = () => {
      confirmButton.removeEventListener("click", handleConfirm);
      cancelButton.removeEventListener("click", handleCancel);
      modalElement.removeEventListener("hidden.bs.modal", handleHidden);
    };

    const handleConfirm = () => {
      result = inputElement.value;
      modalInstance.hide();
    };

    const handleCancel = () => {
      result = null;
      modalInstance.hide();
    };

    const handleHidden = () => {
      cleanup();
      resolve(result);
    };

    confirmButton.addEventListener("click", handleConfirm);
    cancelButton.addEventListener("click", handleCancel);
    modalElement.addEventListener("hidden.bs.modal", handleHidden);
    modalInstance.show();

    setTimeout(() => {
      inputElement.focus();
      inputElement.selectionStart = inputElement.value.length;
      inputElement.selectionEnd = inputElement.value.length;
    }, 50);
  });
}

function findNavigationLink(possibleHrefs = []) {
  const links = Array.from($all("#navbarMenu .nav-link"));
  return links.find((link) => possibleHrefs.includes(link.getAttribute("href"))) || null;
}

function updateNavigationShortcuts(user = getStoredUser()) {
  const isAdmin = isAdminUser(user);

  DEFAULT_NAV_ITEMS.forEach((item) => {
    const link = findNavigationLink([item.defaultHref, item.adminShortcut.href]);
    if (!link) return;

    link.setAttribute("href", isAdmin ? item.adminShortcut.href : item.defaultHref);
    link.textContent = isAdmin ? item.adminShortcut.label : item.defaultLabel;
  });
}

function updateHomePageShortcuts(user = getStoredUser()) {
  if (document.body.dataset.page !== "index") {
    return;
  }

  const isAdmin = isAdminUser(user);

  HOME_PAGE_SHORTCUTS.forEach((item) => {
    const link = Array.from(document.querySelectorAll("main .app-card a.btn-outline-info")).find(
      (anchor) => [item.defaultHref, item.adminShortcut.href].includes(anchor.getAttribute("href"))
    );

    if (!link) return;

    const cardBody = link.closest(".card-body");
    const title = cardBody?.querySelector(".card-title");
    const description = cardBody?.querySelector(".card-text");

    link.setAttribute("href", isAdmin ? item.adminShortcut.href : item.defaultHref);

    if (title) {
      title.textContent = isAdmin ? item.adminShortcut.title : item.defaultTitle;
    }

    if (description) {
      description.textContent = isAdmin
        ? item.adminShortcut.description
        : item.defaultDescription;
    }
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Nem sikerült beolvasni a kiválasztott képet."));
    reader.readAsDataURL(file);
  });
}

async function getImageDataUrlFromInput(input, fieldLabel = "A kép") {
  const file = input?.files?.[0];

  if (!file) {
    return null;
  }

  if (!file.type || !file.type.startsWith("image/")) {
    throw new Error(`${fieldLabel} csak képfájl lehet.`);
  }

  if (file.size > IMAGE_UPLOAD_MAX_SIZE_BYTES) {
    throw new Error(`${fieldLabel} legfeljebb 5 MB méretű lehet.`);
  }

  return readFileAsDataUrl(file);
}

function renderImageHtml(src, alt, className = "img-fluid rounded mt-3") {
  if (!src) {
    return "";
  }

  return `<img src="${escapeHtml(src)}" class="${escapeHtml(className)}" alt="${escapeHtml(alt)}">`;
}

async function loadUserProfile() {
  const profileContent = $("#profileContent");
  const profileEmpty = $("#profileEmpty");
  const profileLoading = $("#profileLoading");
  const profileName = $("#profileName");
  const profileEmail = $("#profileEmail");
  const profileEmailSection = $("#profileEmailSection");
  const profileCreated = $("#profileCreated");
  const profileRoles = $("#profileRoles");
  const profilePageTitle = $("#profilePageTitle");
  const profilePageDescription = document.querySelector("main .container .mb-4 .section-text");
  const profileActions = $("#profileActions");
  const profileActionsDivider = $("#profileActionsDivider");
  const deleteProfileButton = $("#deleteProfileButton");
  const logoutButton = $("#logoutButton");
  const profileError = $("#profileError");
  const profilePrivateNotice = $("#profilePrivateNotice");
  const profilePrivacySection = $("#profilePrivacySection");
  const profilePrivateToggle = $("#profilePrivateToggle");

  try {
    const viewedUserId = getViewedProfileUserId();
    const isExternalProfile = viewedUserId !== null;

    if (profileLoading) profileLoading.classList.remove("d-none");
    if (profileError) {
      profileError.classList.add("d-none");
      profileError.textContent = "";
    }
    if (profilePrivateNotice) {
      profilePrivateNotice.classList.add("d-none");
      profilePrivateNotice.textContent = "Privát fiók.";
    }

    const user = isExternalProfile
      ? await apiRequest(`/users/${viewedUserId}/profile`)
      : getStoredUser();

    if (!user) {
      if (profileLoading) profileLoading.classList.add("d-none");
      if (profileContent) profileContent.classList.add("d-none");
      if (profileEmpty) profileEmpty.classList.remove("d-none");
      hideProfileCatchesSection();
      return;
    }

    if (profileLoading) profileLoading.classList.add("d-none");
    if (profileContent) profileContent.classList.remove("d-none");
    if (profileEmpty) profileEmpty.classList.add("d-none");

    if (profilePageTitle) {
      profilePageTitle.textContent = isExternalProfile ? "Felhaszn\u00E1l\u00F3i profil" : "Profil";
    }
    if (profilePageDescription) {
      profilePageDescription.textContent = isExternalProfile
        ? "A kiv\u00E1lasztott felhaszn\u00E1l\u00F3 nyilv\u00E1nos profilja."
        : "Profilinform\u00E1ci\u00F3k \u00E9s be\u00E1ll\u00EDt\u00E1sok.";
    }
    if (profileName) profileName.textContent = user.username || "";
    if (profileEmail) profileEmail.textContent = isExternalProfile ? "-" : user.email || "";
    if (profileEmailSection) {
      profileEmailSection.classList.toggle("d-none", isExternalProfile);
    }
    if (profileCreated) {
      profileCreated.textContent = user.letrehozva
        ? new Date(user.letrehozva).toLocaleDateString("hu-HU")
        : "-";
    }
    if (profileRoles) {
      profileRoles.textContent = isAdminUser(user) ? "Admin" : "Felhaszn\u00E1l\u00F3";
    }
    if (deleteProfileButton) {
      deleteProfileButton.classList.toggle("d-none", isExternalProfile || isAdminUser(user));
    }
    if (logoutButton) {
      logoutButton.classList.toggle("d-none", isExternalProfile);
    }
    if (profileActions) {
      profileActions.classList.toggle("d-none", isExternalProfile);
    }
    if (profileActionsDivider) {
      profileActionsDivider.classList.toggle("d-none", isExternalProfile);
    }

    await loadProfileCatches(viewedUserId, isExternalProfile);
  } catch (error) {
    console.error("Profil bet\u00F6lt\u00E9si hiba:", error);
    if (profileLoading) {
      profileLoading.classList.add("d-none");
    }
    if (profileContent) {
      profileContent.classList.add("d-none");
    }
    if (profileError) {
      profileError.classList.remove("d-none");
      profileError.textContent = "Hiba a profil bet\u00F6lt\u00E9se sor\u00E1n!";
    }
    hideProfileCatchesSection();
  }
}

async function loadUserProfile() {
  const profileContent = $("#profileContent");
  const profileEmpty = $("#profileEmpty");
  const profileLoading = $("#profileLoading");
  const profileName = $("#profileName");
  const profileEmail = $("#profileEmail");
  const profileEmailSection = $("#profileEmailSection");
  const profileCreated = $("#profileCreated");
  const profileRoles = $("#profileRoles");
  const profilePageTitle = $("#profilePageTitle");
  const profilePageDescription = document.querySelector("main .container .mb-4 .section-text");
  const profileActions = $("#profileActions");
  const profileActionsDivider = $("#profileActionsDivider");
  const deleteProfileButton = $("#deleteProfileButton");
  const logoutButton = $("#logoutButton");
  const profileError = $("#profileError");
  const profilePrivateNotice = $("#profilePrivateNotice");
  const profilePrivacySection = $("#profilePrivacySection");
  const profilePrivateToggle = $("#profilePrivateToggle");

  try {
    const viewedUserId = getViewedProfileUserId();
    const isExternalProfile = viewedUserId !== null;

    if (profileLoading) profileLoading.classList.remove("d-none");
    if (profileError) {
      profileError.classList.add("d-none");
      profileError.textContent = "";
    }
    if (profilePrivateNotice) {
      profilePrivateNotice.classList.add("d-none");
      profilePrivateNotice.textContent = "Privát fiók.";
    }

    const user = isExternalProfile
      ? await apiRequest(`/users/${viewedUserId}/profile`)
      : getStoredUser();

    if (!user) {
      if (profileLoading) profileLoading.classList.add("d-none");
      if (profileContent) profileContent.classList.add("d-none");
      if (profileEmpty) profileEmpty.classList.remove("d-none");
      hideProfileCatchesSection();
      return;
    }

    if (profileLoading) profileLoading.classList.add("d-none");
    if (profileContent) profileContent.classList.remove("d-none");
    if (profileEmpty) profileEmpty.classList.add("d-none");

    if (profilePageTitle) {
      profilePageTitle.textContent = isExternalProfile ? "Felhaszn\u00E1l\u00F3i profil" : "Profil";
    }
    if (profilePageDescription) {
      profilePageDescription.textContent = isExternalProfile
        ? "A kiv\u00E1lasztott felhaszn\u00E1l\u00F3 nyilv\u00E1nos profilja."
        : "Profilinform\u00E1ci\u00F3k \u00E9s be\u00E1ll\u00EDt\u00E1sok.";
    }
    if (profileName) profileName.textContent = user.username || "";
    if (profileEmail) profileEmail.textContent = isExternalProfile ? "-" : user.email || "";
    if (profileEmailSection) {
      profileEmailSection.classList.toggle("d-none", isExternalProfile);
    }
    if (profileCreated) {
      profileCreated.textContent = user.letrehozva
        ? new Date(user.letrehozva).toLocaleDateString("hu-HU")
        : "-";
    }
    if (profileRoles) {
      profileRoles.textContent = isAdminUser(user) ? "Admin" : "Felhaszn\u00E1l\u00F3";
    }
    if (deleteProfileButton) {
      deleteProfileButton.classList.toggle("d-none", isExternalProfile || isAdminUser(user));
    }
    if (logoutButton) {
      logoutButton.classList.toggle("d-none", isExternalProfile);
    }
    if (profileActions) {
      profileActions.classList.toggle("d-none", isExternalProfile);
    }
    if (profileActionsDivider) {
      profileActionsDivider.classList.toggle("d-none", isExternalProfile);
    }

    await loadProfileCatches(viewedUserId, isExternalProfile);
  } catch (error) {
    console.error("Profil bet\u00F6lt\u00E9si hiba:", error);
    if (profileLoading) {
      profileLoading.classList.add("d-none");
    }
    if (profileContent) {
      profileContent.classList.add("d-none");
    }
    if (profileError) {
      profileError.classList.remove("d-none");
      profileError.textContent = "Hiba a profil bet\u00F6lt\u00E9se sor\u00E1n!";
    }
    hideProfileCatchesSection();
  }
}

function renderCatchCards(container, catches, { allowDelete = false } = {}) {
  if (!container) {
    return;
  }

  clearElement(container);

  catches.forEach((fogas) => {
    const card = document.createElement("div");
    card.className = "card mb-3";
    card.innerHTML = `
      <div class="card-body">
        <h5 class="card-title">${escapeHtml(fogas.HalfajNev)}</h5>
        <p class="card-text">
          <strong>V\u00EDzter\u00FClet:</strong> ${escapeHtml(fogas.VizteruletNev)}<br>
          <strong>Id\u0151pont:</strong> ${new Date(fogas.FogasIdeje).toLocaleString("hu-HU")}<br>
          ${fogas.SulyKg ? `<strong>S\u00FAly:</strong> ${escapeHtml(String(fogas.SulyKg))} kg<br>` : ""}
          ${fogas.HosszCm ? `<strong>Hossz:</strong> ${escapeHtml(String(fogas.HosszCm))} cm<br>` : ""}
          ${fogas.Megjegyzes ? `<strong>Megjegyz\u00E9s:</strong> ${escapeHtml(fogas.Megjegyzes)}` : ""}
        </p>
        ${renderImageHtml(fogas.FotoUrl, "Fog\u00E1s fot\u00F3")}
        ${
          allowDelete
            ? `
              <div class="mt-3 d-flex justify-content-end">
                <button class="btn btn-sm btn-outline-danger" type="button" onclick="deleteCatch(${Number(fogas.FogasId)})">T\u00F6rl\u00E9s</button>
              </div>
            `
            : ""
        }
      </div>
    `;
    container.appendChild(card);
  });
}

function prepareMarketplacePage() {
  const searchForm = $("#marketplaceSearchForm");
  const searchInput = $("#marketplaceSearchInput");
  const sortSelect = $("#marketplaceSortSelect");
  const categoriesContainer = $("#marketplaceCategoryGrid");
  const listingsContainer = $("#marketplaceListings");
  const resultCount = $("#marketplaceResultsCount");
  const emptyState = $("#marketplaceEmptyState");
  const loadingState = $("#marketplaceListingsLoading");
  const createButton = $("#marketplaceCreateButton");
  const viewToggleButtons = Array.from($all(".marketplace-view-toggle-btn"));

  if (!listingsContainer || !categoriesContainer) {
    return;
  }

  const formatMarketplacePrice = (value) => {
    const amount = Number(value || 0);
    return `${amount.toLocaleString("hu-HU")} Ft`;
  };

  const formatMarketplaceDate = (value) => {
    if (!value) {
      return "";
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }

    return parsedDate.toLocaleDateString("hu-HU");
  };

  const renderMarketplaceCategories = () => {
    const allCategories = [
      {
        Kod: "all",
        Nev: "Összes",
        HirdetesDb: marketplaceState.categories.reduce(
          (sum, category) => sum + Number(category.HirdetesDb || 0),
          0
        ),
      },
      ...marketplaceState.categories,
    ];

    categoriesContainer.innerHTML = allCategories
      .map((category) => {
        const isActive = marketplaceState.activeCategory === category.Kod;
        const countText =
          category.Kod === "all"
            ? "Minden kategória"
            : `${Number(category.HirdetesDb || 0)} hirdetés`;

        return `
          <button
            class="marketplace-category-card${isActive ? " is-active" : ""}"
            type="button"
            data-category="${escapeHtml(category.Kod)}"
          >
            <span class="marketplace-category-name">${escapeHtml(category.Nev)}</span>
            <span class="marketplace-category-count">${escapeHtml(countText)}</span>
          </button>
        `;
      })
      .join("");
  };

  const renderMarketplaceListings = (listings) => {
    clearElement(listingsContainer);
    listingsContainer.classList.toggle("marketplace-listings-list-view", marketplaceState.viewMode === "list");

    listings.forEach((listing) => {
      const card = document.createElement("article");
      card.className = "marketplace-listing-row";
      const thumbHtml = listing.FoKepUrl
        ? `
          <img
            src="${escapeHtml(listing.FoKepUrl)}"
            alt="${escapeHtml(listing.Cim || "Marketplace hirdetés")}"
            class="marketplace-listing-thumb-image"
          />
        `
        : '<div class="marketplace-listing-thumb-placeholder">Hirdetés</div>';
      const isListView = marketplaceState.viewMode === "list";

      card.innerHTML = isListView
        ? `
          <a class="marketplace-listing-link marketplace-listing-link-list" href="marketplace-reszlet.html?id=${Number(listing.MarketplaceHirdetesId)}" aria-label="${escapeHtml(listing.Cim || "Marketplace hirdetés")}">
            <div class="marketplace-listing-thumb">
              ${thumbHtml}
            </div>
            <div class="marketplace-listing-main marketplace-listing-main-list">
              <h2 class="marketplace-listing-title">${escapeHtml(listing.Cim || "")}</h2>
            </div>
          </a>
        `
        : `
          <a class="marketplace-listing-link" href="marketplace-reszlet.html?id=${Number(listing.MarketplaceHirdetesId)}" aria-label="${escapeHtml(listing.Cim || "Marketplace hirdetés")}">
            <div class="marketplace-listing-thumb">
              ${thumbHtml}
            </div>
            <div class="marketplace-listing-main">
              <h2 class="marketplace-listing-title">${escapeHtml(listing.Cim || "")}</h2>
            </div>
          </a>
        `;
      listingsContainer.appendChild(card);
    });
  };

  const updateMarketplaceViewToggle = () => {
    viewToggleButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === marketplaceState.viewMode);
    });
  };

  const setMarketplaceLoading = (isLoading) => {
    if (loadingState) {
      loadingState.classList.toggle("d-none", !isLoading);
    }

    if (listingsContainer) {
      listingsContainer.classList.toggle("d-none", isLoading);
    }
  };

  const loadMarketplaceCategories = async () => {
    marketplaceState.categories = await apiRequest("/marketplace/categories");
    renderMarketplaceCategories();
  };

  const loadMarketplaceListings = async () => {
    const params = new URLSearchParams();

    if (marketplaceState.activeCategory && marketplaceState.activeCategory !== "all") {
      params.set("category", marketplaceState.activeCategory);
    }

    if (marketplaceState.search) {
      params.set("q", marketplaceState.search);
    }

    if (marketplaceState.sort) {
      params.set("sort", marketplaceState.sort);
    }

    const endpoint = params.toString()
      ? `/marketplace/listings?${params.toString()}`
      : "/marketplace/listings";

    setMarketplaceLoading(true);

    try {
      const listings = await apiRequest(endpoint);
      renderMarketplaceListings(listings);

      if (resultCount) {
        resultCount.textContent = `${listings.length} találat`;
      }

      if (emptyState) {
        emptyState.classList.toggle("d-none", listings.length > 0);
      }
    } finally {
      setMarketplaceLoading(false);
    }
  };

  categoriesContainer.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-category]");

    if (!button) {
      return;
    }

    marketplaceState.activeCategory = button.dataset.category || "all";
    renderMarketplaceCategories();
    await loadMarketplaceListings();
  });

  if (sortSelect) {
    sortSelect.addEventListener("change", async () => {
      marketplaceState.sort = sortSelect.value || "featured";
      await loadMarketplaceListings();
    });
  }

  if (searchForm) {
    searchForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      marketplaceState.search = (searchInput?.value || "").trim();
      await loadMarketplaceListings();
    });
  }

  if (createButton) {
    createButton.addEventListener("click", () => {
      showAppAlert("A hirdetésfeladás funkció a következő lépésekben érkezik.", { title: "Hamarosan" });
    });
  }

  viewToggleButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const nextViewMode = button.dataset.view === "list" ? "list" : "grid";

      if (marketplaceState.viewMode === nextViewMode) {
        return;
      }

      marketplaceState.viewMode = nextViewMode;
      localStorage.setItem("marketplaceViewMode", nextViewMode);
      updateMarketplaceViewToggle();
      await loadMarketplaceListings();
    });
  });

  (async () => {
    try {
      marketplaceState.activeCategory = "all";
      marketplaceState.search = "";
      marketplaceState.sort = sortSelect?.value || "featured";
      marketplaceState.viewMode = localStorage.getItem("marketplaceViewMode") === "list" ? "list" : "grid";

      if (searchInput) {
        searchInput.value = "";
      }

      updateMarketplaceViewToggle();
      await loadMarketplaceCategories();
      await loadMarketplaceListings();
    } catch (error) {
      console.error("Marketplace betöltési hiba:", error);
      setMarketplaceLoading(false);
      if (resultCount) {
        resultCount.textContent = "0 találat";
      }
      if (emptyState) {
        emptyState.classList.remove("d-none");
        emptyState.querySelector(".section-text").textContent =
          error.message || "Nem sikerült betölteni a marketplace hirdetéseket.";
      }
    }
  })();
}

async function prepareMarketplaceDetailPage() {
  const listingId = getMarketplaceListingId();
  const loadingState = $("#marketplaceDetailLoading");
  const errorState = $("#marketplaceDetailError");
  const content = $("#marketplaceDetailContent");
  const titleElement = $("#marketplaceDetailTitle");
  const sellerElement = $("#marketplaceDetailSeller");
  const locationElement = $("#marketplaceDetailLocation");
  const locationDuplicateElement = $("#marketplaceDetailLocationDuplicate");
  const dateElement = $("#marketplaceDetailDate");
  const dateDuplicateElement = $("#marketplaceDetailDateDuplicate");
  const categoryElement = $("#marketplaceDetailCategory");
  const priceElement = $("#marketplaceDetailPrice");
  const descriptionElement = $("#marketplaceDetailDescription");
  const heroImageContainer = $("#marketplaceDetailImage");
  const galleryContainer = $("#marketplaceDetailGallery");
  const backButton = $("#marketplaceDetailBackButton");
  const contactButton = $("#marketplaceDetailContactButton");

  if (!loadingState || !errorState || !content) {
    return;
  }

  const showDetailError = (message) => {
    loadingState.classList.add("d-none");
    content.classList.add("d-none");
    errorState.classList.remove("d-none");
    const textElement = errorState.querySelector(".section-text");
    if (textElement) {
      textElement.textContent = message;
    }
  };

  const formatMarketplacePrice = (value) => {
    const amount = Number(value || 0);
    return `${amount.toLocaleString("hu-HU")} Ft`;
  };

  const formatMarketplaceDate = (value) => {
    if (!value) {
      return "-";
    }

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleString("hu-HU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!listingId) {
    showDetailError("Érvénytelen hirdetés azonosító.");
    return;
  }

  if (backButton) {
    backButton.addEventListener("click", () => {
      window.location.href = "marketplace.html";
    });
  }

  try {
    const listing = await apiRequest(`/marketplace/listings/${listingId}`);
    const images = Array.isArray(listing.Kepek) ? listing.Kepek : [];
    let currentImageIndex = images.findIndex((image) => image.FoKep);

    if (currentImageIndex < 0) {
      currentImageIndex = images.length ? 0 : -1;
    }

    const renderMainImage = () => {
      if (!heroImageContainer) {
        return;
      }

      if (currentImageIndex >= 0 && images[currentImageIndex]?.KepUrl) {
        heroImageContainer.innerHTML = `
          <img
            src="${escapeHtml(images[currentImageIndex].KepUrl)}"
            alt="${escapeHtml(listing.Cim || "Marketplace hirdetés")}"
            class="marketplace-detail-image-tag"
          />
        `;
      } else {
        heroImageContainer.innerHTML = '<div class="marketplace-detail-image-placeholder">Hirdetés</div>';
      }
    };

    const renderGallery = () => {
      if (!galleryContainer) {
        return;
      }

      if (images.length <= 1) {
        galleryContainer.classList.add("d-none");
        clearElement(galleryContainer);
        return;
      }

      galleryContainer.classList.remove("d-none");
      galleryContainer.innerHTML = images
        .map((image, index) => `
          <button
            type="button"
            class="marketplace-detail-thumb${index === currentImageIndex ? " is-active" : ""}"
            data-image-index="${index}"
            aria-label="Kép ${index + 1}"
          >
            <img src="${escapeHtml(image.KepUrl)}" alt="${escapeHtml(listing.Cim || "Marketplace kép")}" />
          </button>
        `)
        .join("");
    };

    if (titleElement) {
      titleElement.textContent = listing.Cim || "Marketplace hirdetés";
    }
    if (sellerElement) {
      sellerElement.textContent = listing.Felhasznalonev || "-";
    }
    if (locationElement) {
      locationElement.textContent = listing.Telepules || "-";
    }
    if (locationDuplicateElement) {
      locationDuplicateElement.textContent = listing.Telepules || "-";
    }
    if (dateElement) {
      dateElement.textContent = formatMarketplaceDate(listing.Letrehozva);
    }
    if (dateDuplicateElement) {
      dateDuplicateElement.textContent = formatMarketplaceDate(listing.Letrehozva);
    }
    if (categoryElement) {
      categoryElement.textContent = listing.KategoriaNev || "-";
    }
    if (priceElement) {
      priceElement.textContent = formatMarketplacePrice(listing.ArFt);
    }
    if (descriptionElement) {
      descriptionElement.textContent = listing.Leiras || "Ehhez a hirdetéshez még nincs részletes leírás.";
    }

    renderMainImage();
    renderGallery();

    if (galleryContainer) {
      galleryContainer.addEventListener("click", (event) => {
        const button = event.target.closest("[data-image-index]");

        if (!button) {
          return;
        }

        currentImageIndex = Number(button.dataset.imageIndex);
        renderMainImage();
        renderGallery();
      });
    }

    if (contactButton) {
      contactButton.addEventListener("click", () => {
        showAppAlert("Az érdeklődés küldése funkció a következő lépésben érkezik.", {
          title: "Hamarosan",
        });
      });
    }

    loadingState.classList.add("d-none");
    errorState.classList.add("d-none");
    content.classList.remove("d-none");
  } catch (error) {
    console.error("Marketplace hirdetés részlet betöltési hiba:", error);
    showDetailError(error.message || "Nem sikerült betölteni a hirdetés részleteit.");
  }
}

function prepareWatersPage() {
  const form = $("#waterFiltersForm");
  const resultsTableBody = $("#waterResultsTableBody");

  if (form) {
    form.addEventListener("submit", handleWaterSearch);
  }

  if (resultsTableBody) {
    clearElement(resultsTableBody);
    loadVizteruletek();
  }

  // Szűrők betöltése
  loadFilterOptions();
}

/* =========================
   Vízterületek betöltése
   ========================= */
async function loadVizteruletek(filters = {}) {
  const resultsTableBody = $("#waterResultsTableBody");
  if (!resultsTableBody) return;

  try {
    // Query paraméterek építése
    const params = new URLSearchParams();
    if (filters.halfaj) params.append("halfaj", filters.halfaj);
    if (filters.megye) params.append("megye", filters.megye);
    if (filters.viztipus) params.append("viztipus", filters.viztipus);

    const queryString = params.toString();
    const endpoint = `/vizteruletek${queryString ? `?${queryString}` : ""}`;
    
    const data = await apiRequest(endpoint);
    
    clearElement(resultsTableBody);
    
    if (data.length === 0) {
      resultsTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center">Nincs találat</td>
        </tr>
      `;
      return;
    }

    data.forEach((viz) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${viz.Nev}</td>
        <td>${viz.VizTipusNev || 'N/A'}</td>
        <td>${viz.MegyeNev || 'N/A'}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="showVizteruletDetails(${viz.VizteruletId})">
            Részletek
          </button>
        </td>
      `;
      resultsTableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Vízterületek betöltési hiba:", error);
    if (resultsTableBody) {
      resultsTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-danger">Hiba történt az adatok betöltése során</td>
        </tr>
      `;
    }
  }
}

/* =========================
   Szűrők betöltése (megyék, víztípusok)
   ========================= */
async function loadFilterOptions() {
  const countySelect = $("#county");
  const typeSelect = $("#type");

  try {
    const [counties, types] = await Promise.all([
      apiRequest("/vizteruletek/megyek"),
      apiRequest("/vizteruletek/viztipusok"),
    ]);

    if (countySelect) {
      countySelect.innerHTML = '<option value="">Összes</option>';
      counties.forEach((county) => {
        const option = document.createElement("option");
        option.value = county.Nev;
        option.textContent = county.Nev;
        countySelect.appendChild(option);
      });
    }

    if (typeSelect) {
      typeSelect.innerHTML = '<option value="">Összes</option>';
      types.forEach((type) => {
        const option = document.createElement("option");
        option.value = type.Nev;
        option.textContent = type.Nev;
        typeSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Szűrő opciók betöltési hiba:", error);
  }
}

/* =========================
   Vízterület keresés
   ========================= */
async function handleWaterSearch(event) {
  event.preventDefault();
  const form = event.target;
  
  const filters = {
    halfaj: form.querySelector("#species")?.value || "",
    megye: form.querySelector("#county")?.value || "",
    viztipus: form.querySelector("#type")?.value || "",
  };

  await loadVizteruletek(filters);
}

/* =========================
   Vízterület részletek
   ========================= */
function renderWaterSpeciesDetails(species) {
  const detailsElement = $("#waterDetailSpeciesInfo");
  if (!detailsElement) return;

  if (!species) {
    detailsElement.innerHTML = "";
    detailsElement.classList.add("d-none");
    return;
  }

  detailsElement.classList.remove("d-none");

  const minimumSize =
    species.MinMeretCm !== null && species.MinMeretCm !== undefined
      ? `${escapeHtml(String(species.MinMeretCm))} cm`
      : "Nincs megadva";
  const dailyLimit =
    species.NapiLimit !== null && species.NapiLimit !== undefined
      ? escapeHtml(String(species.NapiLimit))
      : "Nincs megadva";

  detailsElement.innerHTML = `
    <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
      <div>
        <div class="fw-semibold fs-5">${escapeHtml(species.MagyarNev || "-")}</div>
        <div class="section-text small fst-italic">${escapeHtml(species.LatinNev || "Nincs megadva")}</div>
      </div>
      <span class="badge ${species.Vedett ? "bg-warning text-dark" : "bg-secondary"}">
        ${species.Vedett ? "Védett" : "Nem védett"}
      </span>
    </div>
    <div class="row g-3">
      <div class="col-sm-6">
        <div class="section-text small">Minimum méret</div>
        <div class="fw-semibold">${minimumSize}</div>
      </div>
      <div class="col-sm-6">
        <div class="section-text small">Napi limit</div>
        <div class="fw-semibold">${dailyLimit}</div>
      </div>
      <div class="col-12">
        <div class="section-text small">Megjegyzés</div>
        <div>${escapeHtml(species.Megjegyzes || "Nincs megadva")}</div>
      </div>
    </div>
  `;
}

function setActiveWaterSpeciesButton(activeButton) {
  $all("#waterDetailSpecies .water-species-chip").forEach((button) => {
    const isActive = button === activeButton;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

async function showVizteruletDetails(vizteruletId) {
  try {
    const data = await apiRequest(`/vizteruletek/${vizteruletId}`);

    const detailsCard = $("#waterDetailsCard");
    const nameElement = $("#waterDetailName");
    const typeElement = $("#waterDetailType");
    const countiesElement = $("#waterDetailCounties");
    const descriptionElement = $("#waterDetailDescription");
    const speciesElement = $("#waterDetailSpecies");
    const speciesDetailsElement = $("#waterDetailSpeciesInfo");

    if (detailsCard) {
      detailsCard.classList.remove("d-none");
      detailsCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    setText(nameElement, data.vizterulet.Nev);
    setText(typeElement, data.vizterulet.VizTipusNev || "N/A");
    setText(
      countiesElement,
      data.megyek.length ? data.megyek.map((megye) => megye.Nev).join(", ") : "N/A"
    );
    setText(descriptionElement, data.vizterulet.Leiras || "Nincs további leírás.");

    if (speciesElement) {
      clearElement(speciesElement);
      if (speciesDetailsElement) {
        clearElement(speciesDetailsElement);
      }

      if (!data.halfajok.length) {
        speciesElement.innerHTML = '<span class="section-text">Nincs rögzített halfaj.</span>';
        if (speciesDetailsElement) {
          speciesDetailsElement.classList.add("d-none");
        }
      } else {
        renderWaterSpeciesDetails(null);

        data.halfajok.forEach((halfaj) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "btn btn-sm water-species-chip";
          button.textContent = halfaj.MagyarNev;
          button.setAttribute("aria-pressed", "false");

          if (halfaj.Vedett) {
            button.classList.add("is-protected");
          }

          button.addEventListener("click", () => {
            const isAlreadyActive = button.classList.contains("is-active");

            if (isAlreadyActive) {
              setActiveWaterSpeciesButton(null);
              renderWaterSpeciesDetails(null);
              return;
            }

            setActiveWaterSpeciesButton(button);
            renderWaterSpeciesDetails(halfaj);
          });

          speciesElement.appendChild(button);
        });
      }
    }
  } catch (error) {
    showAppAlert("Hiba a részletek betöltése során!", { title: "Hiba" });
  }
}

/* =========================
   Fogásnapló oldal előkészítés
   ========================= */
function prepareCatchLogPage() {
  const catchForm = $("#catchForm");
  const catchListContainer = $("#catchListContainer");

  if (!isLoggedIn()) {
    setPendingRedirect("fogasnaplo.html");
    window.location.href = "login.html";
    return;
  }

  if (catchForm) {
    catchForm.addEventListener("submit", handleAddCatch);
  }

  if (catchListContainer) {
    clearElement(catchListContainer);
    loadSajatFogasok();
  }

  loadCatchFormOptions();
}

/* =========================
   Saját fogások betöltése
   ========================= */
async function loadSajatFogasok() {
  const catchListContainer = $("#catchListContainer");
  if (!catchListContainer) return;

  try {
    const data = await apiRequest("/fogasnaplo/sajat");
    
    clearElement(catchListContainer);
    
    if (data.length === 0) {
      catchListContainer.innerHTML = `
        <div class="alert alert-info">Még nincs rögzített fogásod.</div>
      `;
      return;
    }

    data.forEach((fogas) => {
      const card = document.createElement("div");
      card.className = "card mb-3";
      card.innerHTML = `
        <div class="card-body">
          <h5 class="card-title">${escapeHtml(fogas.HalfajNev)}</h5>
          <p class="card-text">
            <strong>Vízterület:</strong> ${escapeHtml(fogas.VizteruletNev)}<br>
            <strong>Időpont:</strong> ${new Date(fogas.FogasIdeje).toLocaleString("hu-HU")}<br>
            ${fogas.SulyKg ? `<strong>Súly:</strong> ${escapeHtml(String(fogas.SulyKg))} kg<br>` : ""}
            ${fogas.HosszCm ? `<strong>Hossz:</strong> ${escapeHtml(String(fogas.HosszCm))} cm<br>` : ""}
            ${fogas.Megjegyzes ? `<strong>Megjegyzés:</strong> ${escapeHtml(fogas.Megjegyzes)}` : ""}
          </p>
          ${renderImageHtml(fogas.FotoUrl, "Fogás fotó")}
          <div class="mt-3 d-flex justify-content-end">
            <button class="btn btn-sm btn-outline-danger" type="button" onclick="deleteCatch(${fogas.FogasId})">Törlés</button>
          </div>
        </div>
      `;
      catchListContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Fogások betöltési hiba:", error);
    if (catchListContainer) {
      catchListContainer.innerHTML = `
        <div class="alert alert-danger">Hiba történt az adatok betöltése során</div>
      `;
    }
  }
}

/* =========================
   Fogásnapló dropdown-ok betöltése
   ========================= */
async function loadCatchFormOptions() {
  const waterbodySelect = $("#catchWaterbodyId");
  const speciesSelect = $("#catchSpeciesId");
  
  // Vízterületek betöltése
  if (waterbodySelect) {
    try {
      const vizteruletek = await apiRequest("/vizteruletek");
      waterbodySelect.innerHTML = '<option value="">Válassz vízterületet</option>';
      vizteruletek.forEach(viz => {
        const option = document.createElement("option");
        option.value = viz.VizteruletId;
        option.textContent = viz.Nev;
        waterbodySelect.appendChild(option);
      });
    } catch (error) {
      console.error("Vízterületek betöltési hiba:", error);
    }
  }
  
  // Halfajok betöltése
  if (speciesSelect) {
    try {
      const halfajok = await apiRequest("/halfajok");
      speciesSelect.innerHTML = '<option value="">Válassz halfajt</option>';
      halfajok.forEach(halfaj => {
        const option = document.createElement("option");
        option.value = halfaj.HalfajId;
        option.textContent = halfaj.MagyarNev;
        speciesSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Halfajok betöltési hiba:", error);
    }
  }
}

/* =========================
   Új fogás rögzítése
   ========================= */
async function handleAddCatch(event) {
  event.preventDefault();
  const form = event.target;
  let fotoUrl = null;

  try {
    fotoUrl = await getImageDataUrlFromInput(
      form.querySelector("#catchImage"),
      "A fogás képe"
    );
  } catch (error) {
    showAppAlert(error.message, { title: "Hiba" });
    return;
  }
  
  const catchData = {
    halfajId: parseInt(form.querySelector("#catchSpeciesId")?.value),
    vizteruletId: parseInt(form.querySelector("#catchWaterbodyId")?.value),
    fogasIdeje: form.querySelector("#catchDateTime")?.value,
    sulyKg: parseFloat(form.querySelector("#catchWeight")?.value) || null,
    hosszCm: parseInt(form.querySelector("#catchLength")?.value) || null,
    fotoUrl,
    megjegyzes: form.querySelector("#catchNote")?.value || null,
  };

  if (!catchData.halfajId || !catchData.vizteruletId || !catchData.fogasIdeje) {
    showAppAlert("A halfaj, vízterület és időpont megadása kötelező!", { title: "Hiányzó adat" });
    return;
  }

  try {
    await apiRequest("/fogasnaplo", {
      method: "POST",
      body: JSON.stringify(catchData),
    });

    await showAppSuccess("Fogás sikeresen rögzítve!");
    form.reset();
    loadSajatFogasok();
  } catch (error) {
    showAppAlert(error.message || "Hiba a fogás rögzítése során!", { title: "Hiba" });
  }
}

/* =========================
   Fórum oldal előkészítés
   ========================= */
const forumState = {
  selectedTopicId: null,
  pendingJumpTopicId: null,
  pendingJumpReplyId: null,
  reportTargetType: "",
  reportTargetId: null,
};

function prepareForumPage() {
  const topicForm = $("#forumTopicForm");
  const replyForm = $("#forumReplyForm");
  const topicsList = $("#forumTopicsList");
  const reportForm = $("#forumReportForm");
  const reportReason = $("#forumReportReason");
  updateForumAuthUi();

  const params = new URLSearchParams(window.location.search);
  const jumpTopicId = Number.parseInt(params.get("temaId"), 10);
  const jumpReplyId = Number.parseInt(params.get("hozzaszolasId"), 10);
  forumState.pendingJumpTopicId = Number.isInteger(jumpTopicId) && jumpTopicId > 0 ? jumpTopicId : null;
  forumState.pendingJumpReplyId = Number.isInteger(jumpReplyId) && jumpReplyId > 0 ? jumpReplyId : null;

  if (topicForm) {
    topicForm.addEventListener("submit", handleCreateTopic);
  }

  if (replyForm) {
    replyForm.addEventListener("submit", handleCreateReply);
  }

  if (reportForm) {
    reportForm.addEventListener("submit", handleForumReportSubmit);
  }

  if (reportReason) {
    reportReason.addEventListener("change", handleForumReportReasonChange);
  }

  if (topicsList) {
    clearElement(topicsList);
    loadForumTopics();
  }
}

/* =========================
   Fórum témák betöltése
   ========================= */
async function loadForumTopics() {
  const topicsList = $("#forumTopicsList");
  if (!topicsList) return;

  try {
    const data = await apiRequest("/forum/temak");
    
    clearElement(topicsList);
    
    if (data.length === 0) {
      topicsList.innerHTML = `
        <div class="alert alert-info">Még nincs fórum téma.</div>
      `;
      return;
    }

    data.forEach((tema) => {
      const card = document.createElement("div");
      card.className = "card mb-3";
      const canReport = isLoggedIn();
      card.innerHTML = `
        <div class="card-body forum-reportable-card">
          ${
            canReport
              ? `<button
                  class="btn btn-sm forum-report-button"
                  type="button"
                  aria-label="Téma reportolása"
                  onclick="openForumReportModal('topic', ${tema.TemaId})"
                >🚩</button>`
              : ""
          }
          <h5 class="card-title">${tema.Cim}</h5>
          <p class="card-text">
            <small class="text-muted">
              Létrehozva: ${new Date(tema.Letrehozva).toLocaleString("hu-HU")} | 
              Szerző: ${tema.Felhasznalonev} | 
              Hozzászólások: ${tema.HozzaszolasokSzama}
            </small>
          </p>
          <button class="btn btn-sm btn-primary" onclick="loadTopicReplies(${tema.TemaId})">
            Megnyitás
          </button>
        </div>
      `;
      topicsList.appendChild(card);
    });

    if (forumState.pendingJumpTopicId) {
      const pendingTopicId = forumState.pendingJumpTopicId;
      const pendingReplyId = forumState.pendingJumpReplyId;
      forumState.pendingJumpTopicId = null;
      forumState.pendingJumpReplyId = null;
      await loadTopicReplies(pendingTopicId, pendingReplyId);
    }
  } catch (error) {
    console.error("Témák betöltési hiba:", error);
    if (topicsList) {
      topicsList.innerHTML = `
        <div class="alert alert-danger">Hiba történt az adatok betöltése során</div>
      `;
    }
  }
}

/* =========================
   Új téma létrehozása
   ========================= */
async function handleCreateTopic(event) {
  event.preventDefault();
  const form = event.target;
  
  const cim = form.querySelector("#topicTitle")?.value;
  const szoveg = form.querySelector("#topicBody")?.value || "";
  let kepUrl = null;

  try {
    kepUrl = await getImageDataUrlFromInput(
      form.querySelector("#topicImage"),
      "A témához feltöltött kép"
    );
  } catch (error) {
    showAppAlert(error.message, { title: "Hiba" });
    return;
  }

  if (!cim) {
    showAppAlert("A téma címe kötelező!", { title: "Hiányzó adat" });
    return;
  }

  if (!isLoggedIn()) {
    showAppAlert("A művelethez be kell jelentkezned!", { title: "Bejelentkezés szükséges" });
    return;
  }

  try {
    await apiRequest("/forum/tema", {
      method: "POST",
      body: JSON.stringify({ cim, szoveg, kepUrl }),
    });

    await showAppSuccess("Téma sikeresen létrehozva!");
    form.reset();
    loadForumTopics();
  } catch (error) {
    showAppAlert(error.message || "Hiba a téma létrehozása során!", { title: "Hiba" });
  }
}

function handleForumReportReasonChange() {
  const reasonSelect = $("#forumReportReason");
  const detailsGroup = $("#forumReportDetailsGroup");
  const detailsInput = $("#forumReportDetails");

  if (!reasonSelect || !detailsGroup || !detailsInput) {
    return;
  }

  const hasReason = Boolean(reasonSelect.value);
  detailsGroup.classList.toggle("d-none", !hasReason);
  detailsInput.required = reasonSelect.value === "other";
}

function openForumReportModal(targetType, targetId) {
  if (!isLoggedIn()) {
    showAppAlert("A report kuldesehez be kell jelentkezned.", { title: "Bejelentkezes szukseges" });
    return;
  }

  const modalElement = document.getElementById("forumReportModal");
  const targetTypeInput = $("#forumReportTargetType");
  const targetIdInput = $("#forumReportTargetId");
  const reasonSelect = $("#forumReportReason");
  const detailsInput = $("#forumReportDetails");
  const detailsGroup = $("#forumReportDetailsGroup");

  if (!modalElement || !targetTypeInput || !targetIdInput || !reasonSelect || !detailsInput || !detailsGroup) {
    return;
  }

  forumState.reportTargetType = targetType;
  forumState.reportTargetId = Number(targetId);
  targetTypeInput.value = targetType;
  targetIdInput.value = String(targetId);
  reasonSelect.value = "";
  detailsInput.value = "";
  detailsInput.required = false;
  detailsGroup.classList.add("d-none");

  const modalInstance = createModalInstance("forumReportModal");
  if (modalInstance) {
    modalInstance.show();
  }
}

async function handleForumReportSubmit(event) {
  event.preventDefault();

  const targetType = $("#forumReportTargetType")?.value || "";
  const targetId = Number.parseInt($("#forumReportTargetId")?.value || "", 10);
  const reasonCode = $("#forumReportReason")?.value || "";
  const details = $("#forumReportDetails")?.value.trim() || "";

  if (!targetType || !Number.isInteger(targetId) || targetId <= 0 || !reasonCode) {
    showAppAlert("Valassz report indokot, mielott elkuldod a jelentest.", { title: "Hiba" });
    return;
  }

  if (reasonCode === "other" && details.length < 3) {
    showAppAlert("Az Egyeb indoknal add meg a reszletezest is.", { title: "Hiba" });
    return;
  }

  try {
    await apiRequest("/reports/forum", {
      method: "POST",
      body: JSON.stringify({
        targetType,
        targetId,
        reasonCode,
        details,
      }),
    });

    createModalInstance("forumReportModal")?.hide();
    await showAppSuccess("A report sikeresen elkuldve.");
  } catch (error) {
    showAppAlert(error.message || "Nem sikerult elkuldeni a reportot.", { title: "Hiba" });
  }
}

function updateForumAuthUi() {
  const topicForm = $("#forumTopicForm");
  const replyForm = $("#forumReplyForm");
  const topicLoginHint = $("#forumTopicLoginHint");
  const replyLoginHint = $("#forumReplyLoginHint");
  const loggedIn = isLoggedIn();

  if (topicForm) {
    topicForm.classList.toggle("d-none", !loggedIn);
  }

  if (replyForm) {
    replyForm.classList.toggle("d-none", !loggedIn);
  }

  if (topicLoginHint) {
    topicLoginHint.classList.toggle("d-none", loggedIn);
  }

  if (replyLoginHint) {
    replyLoginHint.classList.toggle("d-none", loggedIn);
  }
}

/* =========================
   Téma hozzászólásainak betöltése
   ========================= */
async function loadTopicReplies(temaId, highlightReplyId = null) {
  try {
    const data = await apiRequest(`/forum/tema/${temaId}/hozzaszolasok`);
    forumState.selectedTopicId = temaId;

    const selectedTopicCard = $("#forumSelectedTopicCard");
    const postsList = $("#forumPostsList");
    const postsEmpty = $("#forumPostsEmpty");
    const selectedTopicTitle = $("#selectedTopicTitle");
    const selectedTopicMeta = $("#selectedTopicMeta");

    if (selectedTopicCard) {
      selectedTopicCard.classList.remove("d-none");
      selectedTopicCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (selectedTopicTitle) {
      const topicCard = document.querySelector(
        `button[onclick="loadTopicReplies(${temaId})"]`
      )?.closest(".card-body");
      selectedTopicTitle.textContent =
        topicCard?.querySelector(".card-title")?.textContent || "Kiválasztott téma";
    }

    if (selectedTopicMeta) {
      selectedTopicMeta.textContent = "";
      selectedTopicMeta.classList.add("d-none");
    }

    if (postsList) {
      clearElement(postsList);
    }

    if (postsEmpty) {
      postsEmpty.classList.toggle("d-none", data.length !== 0);
    }

    if (postsList && data.length) {
      data.forEach((hz) => {
        const item = document.createElement("div");
        item.className = "border rounded p-3 mb-3 forum-reportable-card";
        item.dataset.replyId = String(hz.HozzaszolasId);
        item.innerHTML = `
          ${
            isLoggedIn()
              ? `<button
                  class="btn btn-sm forum-report-button"
                  type="button"
                  aria-label="Hozzászólás reportolása"
                  onclick="openForumReportModal('reply', ${hz.HozzaszolasId})"
                >🚩</button>`
              : ""
          }
          <div class="small section-text mb-2">
            ${escapeHtml(hz.Felhasznalonev)} | ${escapeHtml(new Date(hz.Letrehozva).toLocaleString("hu-HU"))}
          </div>
          ${hz.Szoveg ? `<div>${escapeHtml(hz.Szoveg)}</div>` : ""}
          ${renderImageHtml(hz.KepUrl, "Fórum kép", "img-fluid rounded mt-3")}
        `;
        postsList.appendChild(item);
      });
    }

    const replyForm = $("#forumReplyForm");
    if (replyForm) {
      const temaIdInput = replyForm.querySelector("#replyTopicId");
      if (temaIdInput) temaIdInput.value = temaId;
    }

    if (highlightReplyId) {
      const targetReply = postsList?.querySelector(`[data-reply-id="${Number(highlightReplyId)}"]`);
      if (targetReply) {
        targetReply.classList.add("forum-highlighted-reply");
        targetReply.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => {
          targetReply.classList.remove("forum-highlighted-reply");
        }, 2200);
      }
    }
  } catch (error) {
    showAppAlert("Hiba a hozzászólások betöltése során!", { title: "Hiba" });
  }
}

/* =========================
   Új hozzászólás létrehozása
   ========================= */
async function handleCreateReply(event) {
  event.preventDefault();
  const form = event.target;
  
  const temaId = parseInt(form.querySelector("#replyTopicId")?.value);
  const szoveg = form.querySelector("#replyBody")?.value || "";
  let kepUrl = null;

  try {
    kepUrl = await getImageDataUrlFromInput(
      form.querySelector("#replyImage"),
      "A hozzászólás képe"
    );
  } catch (error) {
    showAppAlert(error.message, { title: "Hiba" });
    return;
  }

  if (!temaId || (!szoveg.trim() && !kepUrl)) {
    showAppAlert("A téma mellett legalább szöveg vagy kép megadása kötelező!", { title: "Hiányzó adat" });
    return;
  }

  if (!isLoggedIn()) {
    showAppAlert("A művelethez be kell jelentkezned!", { title: "Bejelentkezés szükséges" });
    return;
  }

  try {
    await apiRequest("/forum/hozzaszolas", {
      method: "POST",
      body: JSON.stringify({ temaId, szoveg, kepUrl }),
    });

    await showAppSuccess("Hozzászólás sikeresen létrehozva!");
    form.reset();
    await loadTopicReplies(temaId);
  } catch (error) {
    showAppAlert(error.message || "Hiba a hozzászólás létrehozása során!", { title: "Hiba" });
  }
}

const adminState = {
  activePanel: null,
  species: [],
  waters: [],
  counties: [],
  waterTypes: [],
  forumTopics: [],
  forumRepliesByTopic: {},
  reports: [],
  activeReportId: null,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getAdminPanelElements() {
  return {
    section: $("#adminMasterDataSection"),
    title: $("#adminMasterDataTitle"),
    description: $("#adminMasterDataDescription"),
    feedback: $("#adminMasterDataFeedback"),
    species: $("#adminSpeciesPanel"),
    waters: $("#adminWatersPanel"),
    forum: $("#adminForumPanel"),
    reports: $("#adminReportsPanel"),
  };
}

function hideAdminFeedback() {
  const feedback = $("#adminMasterDataFeedback");
  if (!feedback) return;
  feedback.className = "alert d-none";
  feedback.textContent = "";
}

function showAdminFeedback(message, type = "success") {
  const feedback = $("#adminMasterDataFeedback");
  if (!feedback) return;
  feedback.className = `alert alert-${type}`;
  feedback.textContent = message;
}

function closeAdminPanel() {
  const panels = getAdminPanelElements();
  adminState.activePanel = null;
  hideElement(panels.section);
  hideElement(panels.species);
  hideElement(panels.waters);
  hideElement(panels.forum);
  hideElement(panels.reports);
  hideAdminFeedback();
}

function openAdminPanel(panelName, title, description) {
  const panels = getAdminPanelElements();
  adminState.activePanel = panelName;
  showElement(panels.section);
  hideAdminFeedback();
  hideElement(panels.species);
  hideElement(panels.waters);
  hideElement(panels.forum);
  hideElement(panels.reports);
  setText(panels.title, title);
  setText(panels.description, description);

  if (panelName === "species") showElement(panels.species);
  if (panelName === "waters") showElement(panels.waters);
  if (panelName === "forum") showElement(panels.forum);
  if (panelName === "reports") showElement(panels.reports);
}

function updateAdminLocationHash(target = "") {
  if (document.body.dataset.page !== "admin" || !window.history?.replaceState) {
    return;
  }

  const nextHash = target ? `#${target}` : "";
  const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
  window.history.replaceState(null, "", nextUrl);
  setActiveNavLink();
}

function getAdminTargetFromLocation() {
  return (window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
}

async function openAdminTarget(target, syncHash = true) {
  if (target === "species") {
    openAdminPanel(
      "species",
      "Halfajok kezelése",
      "Új halfaj hozzáadása és a meglévő halfajok szerkesztése."
    );
    if (syncHash) updateAdminLocationHash("species");
    await loadSpeciesAdminData();
    return;
  }

  if (target === "waters") {
    openAdminPanel(
      "waters",
      "Vízterületek kezelése",
      "Új vízterület létrehozása és a meglévő vízterületek szerkesztése."
    );
    if (syncHash) updateAdminLocationHash("waters");
    if (!adminState.species.length) {
      await loadSpeciesAdminData();
    }
    await loadWatersAdminData();
    return;
  }

  if (target === "forum") {
    openAdminPanel(
      "forum",
      "Fórum moderáció",
      "Fórum témák és hozzászólások adminisztrációja."
    );
    if (syncHash) updateAdminLocationHash("forum");
    await loadForumAdminData();
    return;
  }

  if (target === "reports") {
    openAdminPanel(
      "reports",
      "Report üzenetek",
      "Felhasználói forum reportok kezelese es admin valaszok kuldese."
    );
    if (syncHash) updateAdminLocationHash("reports");
    await loadAdminReports();
    return;
  }

  closeAdminPanel();
  if (syncHash) updateAdminLocationHash("");
}

async function handleAdminTargetChange() {
  if (document.body.dataset.page !== "admin") {
    return;
  }

  const usersSection = $("#adminUsersSection");
  const target = getAdminTargetFromLocation();

  if (!target || !["species", "waters", "forum", "reports"].includes(target)) {
    showElement(usersSection);
    closeAdminPanel();
    setActiveNavLink();
    return;
  }

  hideElement(usersSection);
  await openAdminTarget(target, false);
  setActiveNavLink();
}

function normalizeNumberInput(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? NaN : parsed;
}

function formatSpeciesRules(species) {
  const parts = [];

  if (species.MinMeretCm !== null && species.MinMeretCm !== undefined) {
    parts.push(`Min. ${species.MinMeretCm} cm`);
  }

  if (species.NapiLimit !== null && species.NapiLimit !== undefined) {
    parts.push(`Napi limit: ${species.NapiLimit}`);
  }

  if (species.Vedett) {
    parts.push("Védett");
  }

  return parts.length ? parts.join(" | ") : "Nincs megadva";
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString("hu-HU") : "-";
}

function formatForumReportReason(reasonCode) {
  return FORUM_REPORT_REASON_LABELS[reasonCode] || "Ismeretlen indok";
}

function createModalInstance(modalId) {
  const modalElement = document.getElementById(modalId);
  if (!modalElement || typeof bootstrap === "undefined") {
    return null;
  }

  return bootstrap.Modal.getOrCreateInstance(modalElement);
}

function populateSingleSelect(selectElement, options, placeholder, valueKey, labelKey) {
  if (!selectElement) return;

  selectElement.innerHTML = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholder;
  selectElement.appendChild(placeholderOption);

  options.forEach((item) => {
    const option = document.createElement("option");
    option.value = item[valueKey];
    option.textContent = item[labelKey];
    selectElement.appendChild(option);
  });
}

function syncMultiSelectDataset(container, selectedValues) {
  if (!container) return;
  container.dataset.selectedValues = JSON.stringify(selectedValues);
}

function getSelectedValues(container) {
  if (!container) return [];

  try {
    const values = JSON.parse(container.dataset.selectedValues || "[]");
    return Array.isArray(values) ? values.map((value) => Number(value)) : [];
  } catch (error) {
    return [];
  }
}

async function deleteCatch(fogasId) {
  if (!(await showAppConfirm("Biztosan törölni szeretnéd ezt a fogást?", { confirmLabel: "Törlés" }))) {
    return;
  }

  try {
    await apiRequest(`/fogasnaplo/${fogasId}`, { method: "DELETE" });
    await loadSajatFogasok();
    await showAppSuccess("A fogás sikeresen törölve.");
  } catch (error) {
    showAppAlert(error.message || "Nem sikerült törölni a fogást.", { title: "Hiba" });
  }
}

function renderMultiSelect(container, options, selectedValues = []) {
  if (!container) return;

  const uniqueSelected = [...new Set(selectedValues.map((value) => Number(value)).filter((value) => !Number.isNaN(value)))];
  const isSingleSelect = container.dataset.singleSelect === "true";
  const allowsBudapestPair = container.dataset.allowBudapestPair === "true";
  const specialCountyIds = new Set(
    allowsBudapestPair
      ? options
          .filter((item) => ["Pest", "Budapest"].includes(String(item.Nev || "").trim()))
          .map((item) => Number(item.MegyeId ?? item.id ?? item.value))
          .filter((value) => !Number.isNaN(value))
      : []
  );

  clearElement(container);
  syncMultiSelectDataset(container, uniqueSelected);

  if (!options.length) {
    const empty = document.createElement("div");
    empty.className = "multi-select-empty";
    empty.textContent = container.dataset.placeholder || "Nincs adat";
    container.appendChild(empty);
    return;
  }

  options.forEach((item) => {
    const itemId =
      item.MegyeId ?? item.HalfajId ?? item.id ?? item.value ?? item.VizTipusId;
    const label = item.Nev ?? item.MagyarNev ?? item.label ?? item.name ?? "";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "multi-select-option";
    button.textContent = label;

    if (uniqueSelected.includes(Number(itemId))) {
      button.classList.add("is-selected");
    }

    button.addEventListener("click", () => {
      const current = getSelectedValues(container);
      const numericId = Number(itemId);
      const exists = current.includes(numericId);
      let nextValues;

      if (exists) {
        nextValues = current.filter((value) => value !== numericId);
      } else if (isSingleSelect && allowsBudapestPair && specialCountyIds.has(numericId)) {
        const currentSpecialValues = current.filter((value) => specialCountyIds.has(value));

        if (
          current.length === 1 &&
          currentSpecialValues.length === 1 &&
          currentSpecialValues[0] !== numericId
        ) {
          nextValues = [...currentSpecialValues, numericId];
        } else {
          nextValues = [numericId];
        }
      } else if (isSingleSelect) {
        nextValues = [numericId];
      } else {
        nextValues = [...current, numericId];
      }

      renderMultiSelect(container, options, nextValues);
    });

    container.appendChild(button);
  });
}

function populateWaterFormOptions() {
  populateSingleSelect(
    $("#waterTypeId"),
    adminState.waterTypes,
    "Válassz víztípust",
    "VizTipusId",
    "Nev"
  );
  populateSingleSelect(
    $("#editWaterTypeId"),
    adminState.waterTypes,
    "Válassz víztípust",
    "VizTipusId",
    "Nev"
  );
  renderMultiSelect($("#waterCountyIds"), adminState.counties, []);
  renderMultiSelect($("#editWaterCountyIds"), adminState.counties, []);
  renderMultiSelect($("#waterSpeciesIds"), adminState.species, []);
  renderMultiSelect($("#editWaterSpeciesIds"), adminState.species, []);
}

function getSpeciesFormPayload(prefix = "") {
  const isEdit = prefix === "edit";
  const field = (name) => $(`#${prefix}${name}`);
  const hungarianName = field(isEdit ? "SpeciesHungarianName" : "speciesHungarianName");
  const latinName = field(isEdit ? "SpeciesLatinName" : "speciesLatinName");
  const minSize = field(isEdit ? "SpeciesMinSize" : "speciesMinSize");
  const dailyLimit = field(isEdit ? "SpeciesDailyLimit" : "speciesDailyLimit");
  const note = field(isEdit ? "SpeciesNote" : "speciesNote");
  const isProtected = field(isEdit ? "SpeciesProtected" : "speciesProtected");

  return {
    magyarNev: hungarianName?.value.trim() || "",
    latinNev: latinName?.value.trim() || "",
    minMeretCm: normalizeNumberInput(minSize?.value),
    napiLimit: normalizeNumberInput(dailyLimit?.value),
    megjegyzes: note?.value.trim() || "",
    vedett: Boolean(isProtected?.checked),
  };
}

function setSpeciesFormError(message, isEdit = false) {
  const target = isEdit ? $("#editSpeciesFormError") : $("#speciesFormError");
  if (!target) return;
  target.textContent = message;
  target.classList.remove("d-none");
}

function clearSpeciesFormError(isEdit = false) {
  const target = isEdit ? $("#editSpeciesFormError") : $("#speciesFormError");
  if (!target) return;
  target.textContent = "";
  target.classList.add("d-none");
}

function resetSpeciesForm() {
  const form = $("#speciesForm");
  if (form) form.reset();
  const speciesId = $("#speciesId");
  if (speciesId) speciesId.value = "";
  clearSpeciesFormError(false);
}

function fillSpeciesEditForm(species) {
  const editSpeciesId = $("#editSpeciesId");
  const editSpeciesHungarianName = $("#editSpeciesHungarianName");
  const editSpeciesLatinName = $("#editSpeciesLatinName");
  const editSpeciesMinSize = $("#editSpeciesMinSize");
  const editSpeciesDailyLimit = $("#editSpeciesDailyLimit");
  const editSpeciesNote = $("#editSpeciesNote");
  const editSpeciesProtected = $("#editSpeciesProtected");

  if (editSpeciesId) editSpeciesId.value = species.HalfajId;
  if (editSpeciesHungarianName) editSpeciesHungarianName.value = species.MagyarNev || "";
  if (editSpeciesLatinName) editSpeciesLatinName.value = species.LatinNev || "";
  if (editSpeciesMinSize) editSpeciesMinSize.value = species.MinMeretCm ?? "";
  if (editSpeciesDailyLimit) editSpeciesDailyLimit.value = species.NapiLimit ?? "";
  if (editSpeciesNote) editSpeciesNote.value = species.Megjegyzes || "";
  if (editSpeciesProtected) editSpeciesProtected.checked = Boolean(species.Vedett);
  clearSpeciesFormError(true);
}

function renderSpeciesTable() {
  const tableBody = $("#adminSpeciesTableBody");
  if (!tableBody) return;

  clearElement(tableBody);

  if (!adminState.species.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center">Nincs megjeleníthető halfaj.</td>
      </tr>
    `;
    return;
  }

  adminState.species.forEach((species) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div class="fw-semibold">${escapeHtml(species.MagyarNev)}</div>
        <div class="small section-text">${escapeHtml(species.LatinNev || "-")}</div>
      </td>
      <td>
        <div>${escapeHtml(formatSpeciesRules(species))}</div>
        <div class="small section-text">${escapeHtml(species.Megjegyzes || "")}</div>
      </td>
      <td>
        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-sm btn-outline-info" type="button" onclick="editSpecies(${species.HalfajId})">Szerkesztés</button>
          <button class="btn btn-sm btn-outline-danger" type="button" onclick="deleteSpecies(${species.HalfajId})">Törlés</button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

async function loadSpeciesAdminData() {
  const species = await apiRequest("/halfajok");
  adminState.species = Array.isArray(species) ? species : [];
  renderSpeciesTable();
  populateWaterFormOptions();
}

async function handleSpeciesSubmit(event) {
  event.preventDefault();
  clearSpeciesFormError(false);

  const payload = getSpeciesFormPayload();
  if (!payload.magyarNev) {
    setSpeciesFormError("A magyar név megadása kötelező.");
    return;
  }

  if (Number.isNaN(payload.minMeretCm) || Number.isNaN(payload.napiLimit)) {
    setSpeciesFormError("A minimum méret és a napi limit csak szám lehet.");
    return;
  }

  try {
    await apiRequest("/halfajok", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    resetSpeciesForm();
    await loadSpeciesAdminData();
    hideAdminFeedback();
    await showAppSuccess("A halfaj sikeresen mentve.");
  } catch (error) {
    setSpeciesFormError(error.message || "Nem sikerült menteni a halfajt.");
  }
}

async function handleSpeciesEditSubmit(event) {
  event.preventDefault();
  clearSpeciesFormError(true);

  const speciesId = Number($("#editSpeciesId")?.value);
  const payload = getSpeciesFormPayload("edit");

  if (!speciesId) {
    setSpeciesFormError("Hiányzik a halfaj azonosítója.", true);
    return;
  }

  if (!payload.magyarNev) {
    setSpeciesFormError("A magyar név megadása kötelező.", true);
    return;
  }

  if (Number.isNaN(payload.minMeretCm) || Number.isNaN(payload.napiLimit)) {
    setSpeciesFormError("A minimum méret és a napi limit csak szám lehet.", true);
    return;
  }

  try {
    await apiRequest(`/halfajok/${speciesId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    createModalInstance("speciesEditModal")?.hide();
    await loadSpeciesAdminData();
    hideAdminFeedback();
    await showAppSuccess("A halfaj sikeresen módosítva.");
  } catch (error) {
    setSpeciesFormError(error.message || "Nem sikerült módosítani a halfajt.", true);
  }
}

async function editSpecies(speciesId) {
  const species = adminState.species.find((item) => item.HalfajId === Number(speciesId));
  if (!species) {
    showAdminFeedback("A kiválasztott halfaj nem található.", "danger");
    return;
  }

  fillSpeciesEditForm(species);
  createModalInstance("speciesEditModal")?.show();
}

async function deleteSpecies(speciesId) {
  if (!(await showAppConfirm("Biztosan törölni szeretnéd ezt a halfajt?", { confirmLabel: "Törlés" }))) {
    return;
  }

  try {
    await apiRequest(`/halfajok/${speciesId}`, { method: "DELETE" });
    await loadSpeciesAdminData();
    hideAdminFeedback();
    await showAppSuccess("A halfaj sikeresen törölve.");
  } catch (error) {
    showAdminFeedback(error.message || "Nem sikerült törölni a halfajt.", "danger");
  }
}

function getWaterFormPayload(prefix = "") {
  const isEdit = prefix === "edit";
  const name = isEdit ? $("#editWaterName") : $("#waterName");
  const typeId = isEdit ? $("#editWaterTypeId") : $("#waterTypeId");
  const countyIds = isEdit ? $("#editWaterCountyIds") : $("#waterCountyIds");
  const speciesIds = isEdit ? $("#editWaterSpeciesIds") : $("#waterSpeciesIds");

  return {
    nev: name?.value.trim() || "",
    vizTipusId: Number(typeId?.value),
    megyeIds: getSelectedValues(countyIds),
    halfajIds: getSelectedValues(speciesIds),
  };
}

function setWaterFormError(message, isEdit = false) {
  const target = isEdit ? $("#editWaterFormError") : $("#waterFormError");
  if (!target) return;
  target.textContent = message;
  target.classList.remove("d-none");
}

function clearWaterFormError(isEdit = false) {
  const target = isEdit ? $("#editWaterFormError") : $("#waterFormError");
  if (!target) return;
  target.textContent = "";
  target.classList.add("d-none");
}

function resetWaterForm() {
  const form = $("#waterForm");
  if (form) form.reset();
  renderMultiSelect($("#waterCountyIds"), adminState.counties, []);
  renderMultiSelect($("#waterSpeciesIds"), adminState.species, []);
  clearWaterFormError(false);
}

function fillWaterEditForm(water) {
  const editWaterId = $("#editWaterId");
  const editWaterName = $("#editWaterName");
  const editWaterTypeId = $("#editWaterTypeId");

  if (editWaterId) editWaterId.value = water.VizteruletId;
  if (editWaterName) editWaterName.value = water.Nev || "";
  if (editWaterTypeId) editWaterTypeId.value = water.VizTipusId || "";

  renderMultiSelect(
    $("#editWaterCountyIds"),
    adminState.counties,
    (water.megyek || []).map((county) => county.MegyeId)
  );
  renderMultiSelect(
    $("#editWaterSpeciesIds"),
    adminState.species,
    (water.halfajok || []).map((species) => species.HalfajId)
  );

  clearWaterFormError(true);
}

function renderWatersTable() {
  const tableBody = $("#adminWatersTableBody");
  if (!tableBody) return;

  clearElement(tableBody);

  if (!adminState.waters.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center">Nincs megjeleníthető vízterület.</td>
      </tr>
    `;
    return;
  }

  adminState.waters.forEach((water) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(water.Nev)}</td>
      <td>${escapeHtml(water.VizTipusNev || "-")}</td>
      <td>${escapeHtml(water.MegyeNev || "-")}</td>
      <td>
        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-sm btn-outline-info" type="button" onclick="editWater(${water.VizteruletId})">Szerkesztés</button>
          <button class="btn btn-sm btn-outline-danger" type="button" onclick="deleteWater(${water.VizteruletId})">Törlés</button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

async function loadWatersAdminData() {
  const [waters, counties, waterTypes] = await Promise.all([
    apiRequest("/vizteruletek"),
    apiRequest("/vizteruletek/megyek"),
    apiRequest("/vizteruletek/viztipusok"),
  ]);

  adminState.waters = Array.isArray(waters) ? waters : [];
  adminState.counties = Array.isArray(counties) ? counties : [];
  adminState.waterTypes = Array.isArray(waterTypes) ? waterTypes : [];
  renderWatersTable();
  populateWaterFormOptions();
}

async function handleWaterSubmit(event) {
  event.preventDefault();
  clearWaterFormError(false);

  const payload = getWaterFormPayload();
  if (!payload.nev || Number.isNaN(payload.vizTipusId) || !isAllowedWaterCountySelection(payload.megyeIds)) {
    setWaterFormError("A név és a víztípus kötelező. Megyeknél egy megye adható meg, kivételként a Pest és Budapest páros.");
    return;
  }

  try {
    await apiRequest("/vizteruletek", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    resetWaterForm();
    await loadWatersAdminData();
    hideAdminFeedback();
    await showAppSuccess("A vízterület sikeresen mentve.");
  } catch (error) {
    setWaterFormError(error.message || "Nem sikerült menteni a vízterületet.");
  }
}

async function handleWaterEditSubmit(event) {
  event.preventDefault();
  clearWaterFormError(true);

  const waterId = Number($("#editWaterId")?.value);
  const payload = getWaterFormPayload("edit");

  if (!waterId) {
    setWaterFormError("Hiányzik a vízterület azonosítója.", true);
    return;
  }

  if (!payload.nev || Number.isNaN(payload.vizTipusId) || !isAllowedWaterCountySelection(payload.megyeIds)) {
    setWaterFormError("A név és a víztípus kötelező. Megyeknél egy megye adható meg, kivételként a Pest és Budapest páros.", true);
    return;
  }

  try {
    await apiRequest(`/vizteruletek/${waterId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    createModalInstance("waterEditModal")?.hide();
    await loadWatersAdminData();
    hideAdminFeedback();
    await showAppSuccess("A vízterület sikeresen módosítva.");
  } catch (error) {
    setWaterFormError(error.message || "Nem sikerült módosítani a vízterületet.", true);
  }
}

async function editWater(waterId) {
  try {
    const waterRelations = await apiRequest(`/vizteruletek/${waterId}/kapcsolatok`);
    fillWaterEditForm({
      ...waterRelations.water,
      megyek: waterRelations.megyek,
      halfajok: waterRelations.halfajok,
    });
    createModalInstance("waterEditModal")?.show();
  } catch (error) {
    showAdminFeedback(error.message || "Nem sikerült betölteni a vízterület adatait.", "danger");
  }
}

async function deleteWater(waterId) {
  if (!(await showAppConfirm("Biztosan törölni szeretnéd ezt a vízterületet?", { confirmLabel: "Törlés" }))) {
    return;
  }

  try {
    await apiRequest(`/vizteruletek/${waterId}`, { method: "DELETE" });
    await loadWatersAdminData();
    hideAdminFeedback();
    await showAppSuccess("A vízterület sikeresen törölve.");
  } catch (error) {
    showAdminFeedback(error.message || "Nem sikerült törölni a vízterületet.", "danger");
  }
}

function renderForumTopicsAdmin() {
  const topicsList = $("#adminForumTopicsList");
  if (!topicsList) return;

  clearElement(topicsList);

  if (!adminState.forumTopics.length) {
    topicsList.innerHTML = `<div class="section-text">Nincs megjeleníthető téma.</div>`;
    return;
  }

  adminState.forumTopics.forEach((topic) => {
    const card = document.createElement("div");
    card.className = "app-list-item";
    card.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div>
          <div class="fw-semibold admin-forum-item-title">${escapeHtml(topic.Cim)}</div>
          <div class="small section-text">
            ${escapeHtml(topic.Felhasznalonev)} | ${escapeHtml(formatDateTime(topic.Letrehozva))}
          </div>
          <div class="small section-text">${escapeHtml(String(topic.HozzaszolasokSzama || 0))} hozzászólás</div>
        </div>
        <div class="d-flex gap-2 flex-wrap admin-forum-actions">
          <button class="btn btn-sm btn-outline-info" type="button" onclick="loadForumRepliesAdmin(${topic.TemaId})">Megnyitás</button>
          <button class="btn btn-sm btn-outline-danger" type="button" onclick="deleteForumTopic(${topic.TemaId})">Törlés</button>
        </div>
      </div>
    `;
    topicsList.appendChild(card);
  });
}

function renderForumRepliesAdmin(topicId, topicTitle) {
  const title = $("#adminForumRepliesTitle");
  const repliesList = $("#adminForumRepliesList");
  if (title) {
    title.textContent = topicId
      ? `Hozzászólások: ${topicTitle || "kiválasztott téma"}`
      : "Hozzászólások";
  }
  if (!repliesList) return;

  clearElement(repliesList);

  const replies = topicId ? adminState.forumRepliesByTopic[topicId] || [] : [];
  if (!replies.length) {
    repliesList.innerHTML = `<div class="section-text">Nincs megjeleníthető hozzászólás.</div>`;
    return;
  }

  replies.forEach((reply) => {
    const item = document.createElement("div");
    item.className = "app-list-item";
    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div>
          <div class="small section-text">${escapeHtml(reply.Felhasznalonev)} | ${escapeHtml(formatDateTime(reply.Letrehozva))}</div>
          ${reply.Szoveg ? `<div class="admin-forum-item-body mt-2">${escapeHtml(reply.Szoveg)}</div>` : ""}
          ${renderImageHtml(reply.KepUrl, "Fórum kép", "img-fluid rounded mt-3")}
        </div>
        <div class="admin-forum-actions">
          <button class="btn btn-sm btn-outline-danger" type="button" onclick="deleteForumReply(${reply.HozzaszolasId}, ${reply.TemaId})">Törlés</button>
        </div>
      </div>
    `;
    repliesList.appendChild(item);
  });
}

async function loadForumAdminData() {
  const topics = await apiRequest("/forum/admin/temak");
  adminState.forumTopics = Array.isArray(topics) ? topics : [];
  renderForumTopicsAdmin();
  renderForumRepliesAdmin(null, "");
}

async function loadForumRepliesAdmin(topicId) {
  try {
    const replies = await apiRequest(`/forum/admin/tema/${topicId}/hozzaszolasok`);
    adminState.forumRepliesByTopic[topicId] = Array.isArray(replies) ? replies : [];
    const topic = adminState.forumTopics.find((item) => item.TemaId === Number(topicId));
    renderForumRepliesAdmin(topicId, topic?.Cim || "");
  } catch (error) {
    showAdminFeedback(error.message || "Nem sikerült betölteni a hozzászólásokat.", "danger");
  }
}

async function deleteForumTopic(topicId) {
  if (!(await showAppConfirm("Biztosan törölni szeretnéd ezt a fórum témát?", { confirmLabel: "Törlés" }))) {
    return;
  }

  try {
    await apiRequest(`/forum/admin/tema/${topicId}`, { method: "DELETE" });
    delete adminState.forumRepliesByTopic[topicId];
    await loadForumAdminData();
    hideAdminFeedback();
    await showAppSuccess("A fórum téma sikeresen törölve.");
  } catch (error) {
    showAdminFeedback(error.message || "Nem sikerült törölni a témát.", "danger");
  }
}

async function deleteForumReply(replyId, topicId) {
  if (!(await showAppConfirm("Biztosan törölni szeretnéd ezt a hozzászólást?", { confirmLabel: "Törlés" }))) {
    return;
  }

  try {
    await apiRequest(`/forum/admin/hozzaszolas/${replyId}`, { method: "DELETE" });
    await loadForumAdminData();
    if (topicId) {
      await loadForumRepliesAdmin(topicId);
    }
    hideAdminFeedback();
    await showAppSuccess("A hozzászólás sikeresen törölve.");
  } catch (error) {
    showAdminFeedback(error.message || "Nem sikerült törölni a hozzászólást.", "danger");
  }
}

function renderAdminReports() {
  const reportsList = $("#adminReportsList");
  const reportsCount = $("#adminReportsCount");

  if (!reportsList || !reportsCount) {
    return;
  }

  const reports = Array.isArray(adminState.reports) ? adminState.reports : [];
  reportsCount.textContent = `${reports.length} report`;
  clearElement(reportsList);

  if (!reports.length) {
    reportsList.innerHTML = `<div class="section-text">Nincs megjelenitheto report.</div>`;
    return;
  }

  reports.forEach((report) => {
    const item = document.createElement("div");
    item.className = `app-list-item admin-report-item${report.AdminOlvasva ? "" : " is-unread"}`;
    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div>
          <div class="fw-semibold">${escapeHtml(report.ReportoloFelhasznalonev)}</div>
          <div class="small section-text mb-2">
            ${escapeHtml(formatDateTime(report.Letrehozva))} | ${report.CelTipus === "reply" ? "Hozzaszolas report" : "Tema report"}
          </div>
          <div class="admin-forum-item-title">${escapeHtml(report.TemaCim || "-")}</div>
          <div class="small section-text mt-1">${escapeHtml(formatForumReportReason(report.IndokKod))}</div>
        </div>
        <div class="admin-forum-actions">
          <button class="btn btn-sm btn-outline-info" type="button" onclick="openAdminReportModal(${report.ForumReportId})">Megnyitás</button>
          <button class="btn btn-sm btn-outline-danger" type="button" onclick="deleteAdminReport(${report.ForumReportId})">Törlés</button>
        </div>
      </div>
    `;
    reportsList.appendChild(item);
  });
}

async function loadAdminReports() {
  try {
    const reports = await apiRequest("/reports/admin");
    adminState.reports = Array.isArray(reports) ? reports : [];
    renderAdminReports();
    await openPendingAdminReportFromSession();
  } catch (error) {
    showAdminFeedback(error.message || "Nem sikerult betolteni a reportokat.", "danger");
  }
}

async function openPendingAdminReportFromSession() {
  const rawReportId = sessionStorage.getItem("adminOpenForumReportId");

  if (!rawReportId) {
    return;
  }

  sessionStorage.removeItem("adminOpenForumReportId");
  const reportId = Number.parseInt(rawReportId, 10);

  if (!Number.isInteger(reportId) || reportId <= 0) {
    return;
  }

  await openAdminReportModal(reportId);
}

async function openAdminReportModal(reportId) {
  const detailBody = $("#adminReportDetailBody");
  const replyText = $("#adminReportReplyText");
  const jumpButton = $("#adminReportJumpButton");

  if (!detailBody || !replyText || !jumpButton) {
    return;
  }

  try {
    const report = await apiRequest(`/reports/admin/${reportId}`);
    adminState.activeReportId = reportId;

    detailBody.innerHTML = `
      <div class="app-list-item">
        <div class="fw-semibold mb-2">Reportolo felhasznalo</div>
        <div>${escapeHtml(report.ReportoloFelhasznalonev || "-")}</div>
      </div>
      <div class="app-list-item">
        <div class="fw-semibold mb-2">Jelentett tartalom</div>
        <div class="mb-2">${escapeHtml(report.CelTipus === "reply" ? "Hozzaszolas" : "Tema")}</div>
        <div class="fw-semibold">${escapeHtml(report.TemaCim || "-")}</div>
        ${report.CelFelhasznalonev ? `<div class="small section-text mt-1">Erintett felhasznalo: ${escapeHtml(report.CelFelhasznalonev)}</div>` : ""}
        ${report.CelSzoveg ? `<div class="mt-3">${escapeHtml(report.CelSzoveg)}</div>` : ""}
      </div>
      <div class="app-list-item">
        <div class="fw-semibold mb-2">Report reszletei</div>
        <div class="mb-2">Indok: ${escapeHtml(formatForumReportReason(report.IndokKod))}</div>
        <div>${escapeHtml(report.Reszletezes || "Nincs reszletezes.")}</div>
      </div>
    `;

    replyText.value = report.AdminValasz || "";
    jumpButton.disabled = !report.UgrasUrl;
    jumpButton.onclick = () => {
      if (!report.UgrasUrl) {
        return;
      }

      window.open(report.UgrasUrl, "_blank");
    };

    const modalInstance = createModalInstance("adminReportDetailModal");
    if (modalInstance) {
      modalInstance.show();
    }

    await loadAdminReports();
  } catch (error) {
    showAdminFeedback(error.message || "Nem sikerult megnyitni a reportot.", "danger");
  }
}

async function sendAdminReportReply() {
  const reportId = adminState.activeReportId;
  const replyText = $("#adminReportReplyText");
  const reportModal = createModalInstance("adminReportDetailModal");

  if (!Number.isInteger(reportId) || !replyText) {
    return;
  }

  const adminReply = replyText.value.trim();

  if (!adminReply) {
    showAppAlert("Adj meg valaszt a reportolo felhasznalonak.", { title: "Hiba" });
    return;
  }

  try {
    await apiRequest(`/reports/admin/${reportId}/reply`, {
      method: "POST",
      body: JSON.stringify({ adminReply }),
    });

    adminState.activeReportId = null;
    if (reportModal) {
      reportModal.hide();
    }
    await loadAdminReports();
    await showAppSuccess("Az admin valasz sikeresen elkuldve.");
  } catch (error) {
    showAdminFeedback(error.message || "Nem sikerult elkuldeni a valaszt.", "danger");
  }
}

async function deleteAdminReport(reportId) {
  if (!(await showAppConfirm("Biztosan torolni szeretned ezt a reportot?", { confirmLabel: "Torles" }))) {
    return;
  }

  try {
    await apiRequest(`/reports/admin/${reportId}`, { method: "DELETE" });
    if (adminState.activeReportId === reportId) {
      adminState.activeReportId = null;
      createModalInstance("adminReportDetailModal")?.hide();
    }
    await loadAdminReports();
    await showAppSuccess("A report sikeresen torolve.");
  } catch (error) {
    showAdminFeedback(error.message || "Nem sikerult torolni a reportot.", "danger");
  }
}

/* =========================
   Admin oldal előkészítés
   ========================= */
function prepareAdminPage() {
  const usersTableBody = $("#adminUsersTableBody");
  const closePanelButton = $("#closeAdminMasterDataSection");
  const speciesForm = $("#speciesForm");
  const speciesResetButton = $("#speciesFormResetButton");
  const speciesEditForm = $("#speciesEditForm");
  const waterForm = $("#waterForm");
  const waterResetButton = $("#waterFormResetButton");
  const waterEditForm = $("#waterEditForm");
  const adminSendReportReplyButton = $("#adminSendReportReplyButton");

  if (!isLoggedIn()) {
    setPendingRedirect("admin.html");
    window.location.href = "login.html";
    return;
  }

  if (!isAdminUser()) {
    window.location.href = "profil.html";
    return;
  }

  closeAdminPanel();

  if (usersTableBody) {
    clearElement(usersTableBody);
    loadAllUsers();
  }

  if (closePanelButton) {
    closePanelButton.addEventListener("click", () => {
      closeAdminPanel();
      showElement($("#adminUsersSection"));
      updateAdminLocationHash("");
    });
  }

  if (speciesForm) {
    speciesForm.addEventListener("submit", handleSpeciesSubmit);
  }

  if (speciesResetButton) {
    speciesResetButton.addEventListener("click", resetSpeciesForm);
  }

  if (speciesEditForm) {
    speciesEditForm.addEventListener("submit", handleSpeciesEditSubmit);
  }

  if (waterForm) {
    waterForm.addEventListener("submit", handleWaterSubmit);
  }

  if (waterResetButton) {
    waterResetButton.addEventListener("click", resetWaterForm);
  }

  if (waterEditForm) {
    waterEditForm.addEventListener("submit", handleWaterEditSubmit);
  }

  if (adminSendReportReplyButton) {
    adminSendReportReplyButton.addEventListener("click", sendAdminReportReply);
  }

  window.addEventListener("hashchange", handleAdminTargetChange);
  handleAdminTargetChange();
}

/* =========================
   Összes felhasználó betöltése (Admin)
   ========================= */
async function loadAllUsers() {
  const usersTableBody = $("#adminUsersTableBody");
  if (!usersTableBody) return;

  try {
    const data = await apiRequest("/users");
    
    clearElement(usersTableBody);
    
    if (data.length === 0) {
      usersTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center">Nincs felhasználó</td>
        </tr>
      `;
      return;
    }

    data.forEach((user) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${user.Felhasznalonev}</td>
        <td>${user.Email}</td>
        <td>
          <span class="badge ${user.Aktiv ? "bg-success" : "bg-danger"}">
            ${user.Aktiv ? "Aktív" : "Tiltva"}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="toggleUserStatus(${user.FelhasznaloId})">
            ${user.Aktiv ? "Tiltás" : "Aktiválás"}
          </button>
        </td>
      `;
      usersTableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Felhasználók betöltési hiba:", error);
    if (usersTableBody) {
      usersTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-danger">Hiba történt az adatok betöltése során</td>
        </tr>
      `;
    }
  }
}

/* =========================
   Felhasználó aktiválása/tiltása (Admin)
   ========================= */
async function toggleUserStatus(userId) {
  if (!(await showAppConfirm("Biztosan módosítod a felhasználó állapotát?", { confirmLabel: "Módosítás", confirmButtonClass: "btn-warning" }))) {
    return;
  }

  try {
    await apiRequest(`/users/${userId}/toggle-active`, {
      method: "PUT",
    });

    await loadAllUsers();
    await showAppSuccess("Felhasználó állapota módosítva!");
  } catch (error) {
    showAppAlert(error.message || "Hiba történt a művelet során!", { title: "Hiba" });
  }
}

/* =========================
   Profil oldal előkészítés
   ========================= */
async function handleProfilePrivacyToggle(event) {
  const toggle = event?.target;

  if (!toggle || getViewedProfileUserId() !== null) {
    return;
  }

  const previousValue = !toggle.checked;
  toggle.disabled = true;

  try {
    const response = await apiRequest("/users/me/privacy", {
      method: "PUT",
      body: JSON.stringify({
        private: toggle.checked,
      }),
    });

    const updatedUser = response?.user || { private: toggle.checked };
    updateStoredUser(updatedUser);
    await showAppSuccess(response?.message || "A profil láthatósága módosítva.");
  } catch (error) {
    toggle.checked = previousValue;
    showAppAlert(error.message || "Nem sikerült módosítani a profil láthatóságát.", {
      title: "Hiba",
    });
  } finally {
    toggle.disabled = false;
  }
}

function bindProfilePrivacyToggle() {
  const toggle = $("#profilePrivateToggle");

  if (!toggle || toggle.dataset.bound === "true") {
    return;
  }

  toggle.addEventListener("change", handleProfilePrivacyToggle);
  toggle.dataset.bound = "true";
}

function prepareProfilePage() {
  const viewedUserId = getViewedProfileUserId();

  bindProfilePrivacyToggle();

  if (viewedUserId !== null) {
    loadUserProfile();
    return;
  }

  if (!isLoggedIn()) {
    setPendingRedirect("profil.html");
    window.location.href = "login.html";
    return;
  }

  if (isAdminUser()) {
    window.location.href = "admin.html";
    return;
  }

  loadUserProfile();
}

/* =========================
   Login oldal előkészítése
   ========================= */
function prepareLoginPage() {
  if (isLoggedIn()) {
    window.location.href = getDefaultPostLoginTarget();
  }
}

/* =========================
   Register oldal előkészítése
   ========================= */
function prepareRegisterPage() {
  if (isLoggedIn()) {
    window.location.href = getDefaultPostLoginTarget();
  }
}

/* =========================
   JWT Token kezelés
   ========================= */
function getStorageValue(key) {
  return localStorage.getItem(key) || sessionStorage.getItem(key);
}

function removeStorageValue(key) {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

function getToken() {
  return getStorageValue("authToken") || getStorageValue("token");
}

function getStoredUser() {
  const rawUser = getStorageValue("authUser") || getStorageValue("user");

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    console.error("Nem sikerült beolvasni a tárolt felhasználót:", error);
    return null;
  }
}

function updateStoredUser(partialUser = {}) {
  const currentUser = getStoredUser();

  if (!currentUser) {
    return null;
  }

  const updatedUser = {
    ...currentUser,
    ...partialUser,
  };

  if (localStorage.getItem("authUser") || localStorage.getItem("user")) {
    localStorage.setItem("authUser", JSON.stringify(updatedUser));
    localStorage.setItem("user", JSON.stringify(updatedUser));
  }

  if (sessionStorage.getItem("authUser") || sessionStorage.getItem("user")) {
    sessionStorage.setItem("authUser", JSON.stringify(updatedUser));
    sessionStorage.setItem("user", JSON.stringify(updatedUser));
  }

  return updatedUser;
}

function isAdminUser(user = getStoredUser()) {
  return Boolean(user && (user.admin === true || user.Admin === true));
}

function isPrivateProfileEnabled(user = getStoredUser()) {
  return Boolean(
    user &&
    (user.private === true || user.Private === true || user.Privat === true)
  );
}

function getDefaultPostLoginTarget(user = getStoredUser()) {
  return isAdminUser(user) ? "admin.html" : "profil.html";
}

function setPendingRedirect(path) {
  sessionStorage.setItem("pendingRedirect", path);
}

function consumePendingRedirect() {
  const path = sessionStorage.getItem("pendingRedirect");
  sessionStorage.removeItem("pendingRedirect");
  return path;
}

function setAuthSession(token, user, remember = true) {
  const storage = remember ? localStorage : sessionStorage;

  removeStorageValue("authToken");
  removeStorageValue("token");
  removeStorageValue("authUser");
  removeStorageValue("user");

  storage.setItem("authToken", token);
  storage.setItem("token", token);
  storage.setItem("authUser", JSON.stringify(user));
  storage.setItem("user", JSON.stringify(user));
}

function removeToken() {
  removeStorageValue("authToken");
  removeStorageValue("token");
}

function clearAuthSession() {
  removeToken();
  removeStorageValue("authUser");
  removeStorageValue("user");
}

function isLoggedIn() {
  return !!getToken();
}

function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* =========================
   Navbar frissítése bejelentkezési státusz alapján
   ========================= */
async function updateNavbar() {
  ensureMarketplaceNavItem();
  const adminNavItem = $("#adminNavItem");
  const reportsNavItem = ensureAdminReportsNavItem();
  const profilNavItem = $("#profilNavItem");
  const loginNavItem = $("#loginNavItem");
  const registerNavItem = $("#registerNavItem");
  const logoutNavItem = $("#logoutNavItem");
  const friendSearchNav = $(".friend-search-nav");
  const catchLogNavLink = findNavigationLink([
    DEFAULT_NAV_ITEMS[1].defaultHref,
    DEFAULT_NAV_ITEMS[1].adminShortcut.href,
  ]);
  const catchLogNavItem = catchLogNavLink?.closest(".nav-item");
  const user = getStoredUser();
  const isAdmin = isAdminUser(user);
  const loggedIn = isLoggedIn();

  updateNavigationShortcuts(user);
  updateHomePageShortcuts(user);

  if (loggedIn) {
    if (loginNavItem) loginNavItem.classList.add("d-none");
    if (registerNavItem) registerNavItem.classList.add("d-none");
    if (logoutNavItem) logoutNavItem.classList.remove("d-none");
    if (profilNavItem) profilNavItem.classList.toggle("d-none", isAdmin);
    if (adminNavItem) adminNavItem.classList.toggle("d-none", !isAdmin);
    if (reportsNavItem) reportsNavItem.classList.toggle("d-none", !isAdmin);
  } else {
    if (loginNavItem) loginNavItem.classList.remove("d-none");
    if (registerNavItem) registerNavItem.classList.remove("d-none");
    if (profilNavItem) profilNavItem.classList.add("d-none");
    if (logoutNavItem) logoutNavItem.classList.add("d-none");
    if (adminNavItem) adminNavItem.classList.add("d-none");
    if (reportsNavItem) reportsNavItem.classList.add("d-none");
  }

  if (catchLogNavItem) {
    catchLogNavItem.classList.toggle("d-none", !loggedIn);
  }

  if (friendSearchNav) {
    friendSearchNav.classList.toggle("d-none", isAdmin || !loggedIn);
  }

  if (document.body.dataset.page === "forum") {
    updateForumAuthUi();
  }

  updateAccountShortcut(user);
  setActiveNavLink();
}

async function loadAllUsers() {
  const usersTableBody = $("#adminUsersTableBody");
  if (!usersTableBody) return;

  try {
    const data = await apiRequest("/users");

    clearElement(usersTableBody);

    if (data.length === 0) {
      usersTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center">Nincs felhaszn\u00E1l\u00F3</td>
        </tr>
      `;
      return;
    }

    data.forEach((user) => {
      const userId = Number(user.FelhasznaloId);
      const isActive = Boolean(user.Aktiv);
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${escapeHtml(user.Felhasznalonev)}</td>
        <td>${escapeHtml(user.Email)}</td>
        <td>
          <span class="badge ${isActive ? "bg-success" : "bg-danger"}">
            ${isActive ? "Akt\u00EDv" : "Tiltva"}
          </span>
        </td>
        <td>
          <div class="d-flex flex-wrap gap-2 admin-table-actions">
            <button class="btn btn-sm btn-outline-info admin-table-action-btn" onclick="openAdminUserProfile(${userId})">
              Megnyit
            </button>
            <button class="btn btn-sm btn-warning admin-table-action-btn" onclick="toggleUserStatus(${userId})">
              ${isActive ? "Tilt\u00E1s" : "Aktiv\u00E1l\u00E1s"}
            </button>
            <button
              class="btn btn-sm ${isActive ? "btn-secondary" : "btn-danger"} admin-table-action-btn"
              onclick="deleteUserAccount(${userId})"
              ${isActive ? 'disabled title="Csak tiltott fi\u00F3k t\u00F6r\u00F6lhet\u0151."' : ""}
            >
              Fi\u00F3k t\u00F6rl\u00E9se
            </button>
          </div>
        </td>
      `;

      usersTableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Felhasznalok betoltesi hiba:", error);
    usersTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-danger">Hiba t\u00F6rt\u00E9nt az adatok bet\u00F6lt\u00E9se sor\u00E1n</td>
      </tr>
    `;
  }
}

async function toggleUserStatus(userId) {
  if (!Number.isInteger(userId) || userId <= 0) {
    return;
  }

  if (!(await showAppConfirm("Biztosan módosítod a felhasználó állapotát?", { confirmLabel: "Módosítás", confirmButtonClass: "btn-warning" }))) {
    return;
  }

  try {
    await apiRequest(`/users/${userId}/toggle-active`, {
      method: "PUT",
    });

    await loadAllUsers();
    await showAppSuccess("Felhasználó állapota módosítva!");
  } catch (error) {
    showAppAlert(error.message || "Hiba történt a művelet során!", { title: "Hiba" });
  }
}

function openAdminUserProfile(userId) {
  if (!Number.isInteger(userId) || userId <= 0) {
    return;
  }

  sessionStorage.setItem("viewedProfileUserId", String(userId));
  window.location.href = `profil.html?userId=${userId}`;
}

async function deleteUserAccount(userId) {
  if (!Number.isInteger(userId) || userId <= 0) {
    return;
  }

  if (!(await showAppConfirm(
    "Biztosan törölni szeretnéd ezt a fiókot? Ez csak tiltott fióknál engedélyezett, és a művelet nem visszavonható.",
    { confirmLabel: "Törlés" }
  ))) {
    return;
  }

  try {
    await apiRequest(`/users/${userId}`, {
      method: "DELETE",
    });

    await loadAllUsers();
    await showAppSuccess("A fiók sikeresen törölve lett.");
  } catch (error) {
    showAppAlert(error.message || "Nem sikerült törölni a fiókot.", { title: "Hiba" });
  }
}

/* =========================
   Kijelentkezés
   ========================= */
function handleLogout() {
  clearAuthSession();
  sessionStorage.removeItem("pendingRedirect");
  updateNavbar();
  window.location.href = "index.html";
}

async function handleDeleteProfile() {
  const user = getStoredUser();

  if (!user || isAdminUser(user)) {
    return;
  }

  if (!(await showAppConfirm(
    "Biztosan törölni akarod a profilodat? Ha törlöd a profilt, utána már nem lehet visszahozni.",
    { confirmLabel: "Profil törlése" }
  ))) {
    return;
  }

  try {
    const response = await fetch("http://localhost:4000/api/profile/delete", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new Error(
        typeof data === "object" && data?.message
          ? data.message
          : "Nem sikerült törölni a profilt."
      );
    }

    await showAppSuccess("A profil sikeresen törölve lett.");
    clearAuthSession();
    window.location.href = "index.html";
  } catch (error) {
    console.error("Profil törlési hiba:", error);
    showAppAlert(error.message || "Nem sikerült törölni a profilt.", { title: "Hiba" });
  }
}

function updateAccountShortcut(user = getStoredUser()) {
  const shortcutLink = $("#accountShortcutLink");
  const shortcutTitle = $("#accountCardTitle");
  const shortcutDescription = $("#accountCardDescription");

  if (!shortcutLink) {
    return;
  }

  if (!user) {
    shortcutLink.setAttribute("href", "profil.html");
    if (shortcutTitle) shortcutTitle.textContent = "Profil";
    if (shortcutDescription) {
      shortcutDescription.textContent = "Belépés, regisztráció és profilkezelés.";
    }
    return;
  }

  if (isAdminUser(user)) {
    shortcutLink.setAttribute("href", "admin.html");
    if (shortcutTitle) shortcutTitle.textContent = "Admin";
    if (shortcutDescription) {
      shortcutDescription.textContent = "Admin felület és felhasználók kezelése.";
    }
    return;
  }

  shortcutLink.setAttribute("href", "profil.html");
  if (shortcutTitle) shortcutTitle.textContent = "Profil";
  if (shortcutDescription) {
    shortcutDescription.textContent = "Saját fiókod és profiladataid megtekintése.";
  }
}

/* =========================
   API Helper függvények
   ========================= */
async function apiRequest(endpoint, options = {}) {
  const url = `${APP_CONFIG.apiBaseUrl}${endpoint}`;
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const requestError = new Error(
        typeof data === "object" && data?.message
          ? data.message
          : "Hiba történt a kérés során."
      );
      requestError.status = response.status;
      requestError.data = data;
      throw requestError;
    }

    return data;
  } catch (error) {
    console.error("API hiba:", error);
    throw error;
  }
}

/* =========================
   Profil betöltése
   ========================= */
const catchCollections = {
  own: [],
  profile: [],
};

const catchFilterPanelState = {
  own: false,
  profile: false,
};

const profileCalendarState = {
  catches: [],
  manualDays: [],
  currentMonth: null,
  selectedDateKey: "",
  isOwnProfile: false,
  menuOpenDateKey: "",
};

function getCatchDateKey(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getDateFromDateKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`);
}

function isSameMonth(dateA, dateB) {
  return dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth();
}

function formatProfileCalendarMonth(date) {
  return date.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
  });
}

function formatProfileCalendarSelectedDate(dateKey) {
  const date = getDateFromDateKey(dateKey);
  return date.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function normalizeFishingDayEntries(days = []) {
  if (!Array.isArray(days)) {
    return [];
  }

  const entriesByDate = new Map();

  days.forEach((entry) => {
    const dateKey = typeof entry === "string"
      ? normalizeDateKey(entry)
      : normalizeDateKey(entry?.Datum || entry?.datum);

    if (!dateKey) {
      return;
    }

    const note = typeof entry?.Megjegyzes === "string"
      ? entry.Megjegyzes
      : typeof entry?.megjegyzes === "string"
        ? entry.megjegyzes
        : "";

    entriesByDate.set(dateKey, {
      Datum: dateKey,
      Megjegyzes: note.trim(),
    });
  });

  return [...entriesByDate.values()].sort((a, b) => a.Datum.localeCompare(b.Datum, "hu"));
}

function normalizeDateKey(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

function buildProfileCalendarData(catches = [], manualDays = []) {
  const catchesByDate = new Map();
  const normalizedManualDays = normalizeFishingDayEntries(manualDays);
  const manualDaysByDate = new Map(normalizedManualDays.map((entry) => [entry.Datum, entry]));
  const manualDayKeys = new Set(manualDaysByDate.keys());

  catches.forEach((fogas) => {
    const dateKey = getCatchDateKey(fogas.FogasIdeje);

    if (!dateKey) {
      return;
    }

    if (!catchesByDate.has(dateKey)) {
      catchesByDate.set(dateKey, []);
    }

    catchesByDate.get(dateKey).push(fogas);
  });

  const markedDateKeys = [...new Set([...catchesByDate.keys(), ...manualDayKeys])].sort();

  return {
    catchesByDate,
    manualDaysByDate,
    manualDayKeys,
    markedDateKeys,
  };
}

function clearProfileFishingCalendar() {
  const calendar = $("#profileFishingCalendar");
  const monthLabel = $("#profileCalendarMonthLabel");
  const monthEmpty = $("#profileCalendarMonthEmpty");
  const selectedDate = $("#profileCalendarSelectedDate");
  const dayCatches = $("#profileCalendarDayCatches");
  const grid = $("#profileCalendarGrid");
  const prevButton = $("#profileCalendarPrev");
  const nextButton = $("#profileCalendarNext");

  profileCalendarState.catches = [];
  profileCalendarState.manualDays = [];
  profileCalendarState.currentMonth = null;
  profileCalendarState.selectedDateKey = "";
  profileCalendarState.isOwnProfile = false;
  profileCalendarState.menuOpenDateKey = "";

  if (calendar) {
    calendar.classList.add("d-none");
  }
  if (monthLabel) {
    monthLabel.textContent = "";
  }
  if (monthEmpty) {
    monthEmpty.classList.add("d-none");
  }
  if (selectedDate) {
    selectedDate.classList.add("d-none");
    selectedDate.textContent = "";
  }
  if (dayCatches) {
    clearElement(dayCatches);
  }
  if (grid) {
    clearElement(grid);
  }
  if (prevButton) {
    prevButton.disabled = true;
  }
  if (nextButton) {
    nextButton.disabled = true;
  }
}

async function toggleProfileFishingDay(dateKey, removeMark = false) {
  const normalizedDateKey = normalizeDateKey(dateKey);

  if (!normalizedDateKey) {
    return;
  }

  try {
    const response = await apiRequest(`/horgasznapok/${normalizedDateKey}`, {
      method: removeMark ? "DELETE" : "PUT",
    });

    const currentManualDays = new Map(
      (profileCalendarState.manualDays || []).map((entry) => [entry.Datum, entry])
    );
    if (removeMark) {
      currentManualDays.delete(normalizedDateKey);
    } else {
      currentManualDays.set(normalizedDateKey, {
        Datum: normalizedDateKey,
        Megjegyzes: currentManualDays.get(normalizedDateKey)?.Megjegyzes || "",
      });
    }

    profileCalendarState.manualDays = [...currentManualDays.values()].sort((a, b) => a.Datum.localeCompare(b.Datum, "hu"));
    profileCalendarState.selectedDateKey = normalizedDateKey;
    profileCalendarState.menuOpenDateKey = "";
    renderProfileFishingCalendar(profileCalendarState.catches, profileCalendarState.manualDays, {
      isOwnProfile: profileCalendarState.isOwnProfile,
      keepMonth: true,
    });
    await showAppSuccess(
      response?.message || (removeMark ? "A horgásznap jelölése törölve." : "A horgásznap jelölése elmentve.")
    );
  } catch (error) {
    showAppAlert(error.message || "Nem sikerült módosítani a horgásznap jelölését.", {
      title: "Hiba",
    });
  }
}

function getManualFishingDayEntry(dateKey) {
  const normalizedDateKey = normalizeDateKey(dateKey);

  if (!normalizedDateKey) {
    return null;
  }

  return (profileCalendarState.manualDays || []).find((entry) => entry.Datum === normalizedDateKey) || null;
}

async function editProfileFishingDayNote(dateKey) {
  const normalizedDateKey = normalizeDateKey(dateKey);

  if (!normalizedDateKey) {
    return;
  }

  const existingEntry = getManualFishingDayEntry(normalizedDateKey);
  const noteValue = await showAppTextPrompt({
    title: "Megjegyzés",
    label: `${formatProfileCalendarSelectedDate(normalizedDateKey)} megjegyzése`,
    initialValue: existingEntry?.Megjegyzes || "",
    placeholder: "Írj megjegyzést ehhez a naphoz...",
    confirmLabel: "Mentés",
  });

  if (noteValue === null) {
    return;
  }

  try {
    const response = await apiRequest(`/horgasznapok/${normalizedDateKey}/megjegyzes`, {
      method: "PUT",
      body: JSON.stringify({
        megjegyzes: noteValue,
      }),
    });

    const nextManualDays = new Map(
      (profileCalendarState.manualDays || []).map((entry) => [entry.Datum, entry])
    );
    const savedNote = typeof response?.megjegyzes === "string" ? response.megjegyzes.trim() : "";

    if (savedNote) {
      nextManualDays.set(normalizedDateKey, {
        Datum: normalizedDateKey,
        Megjegyzes: savedNote,
      });
    } else {
      nextManualDays.delete(normalizedDateKey);
    }

    profileCalendarState.manualDays = [...nextManualDays.values()].sort((a, b) => a.Datum.localeCompare(b.Datum, "hu"));
    profileCalendarState.selectedDateKey = normalizedDateKey;
    profileCalendarState.menuOpenDateKey = "";
    renderProfileFishingCalendar(profileCalendarState.catches, profileCalendarState.manualDays, {
      isOwnProfile: profileCalendarState.isOwnProfile,
      keepMonth: true,
    });

    await showAppSuccess(response?.message || "A megjegyzés sikeresen mentve.");
  } catch (error) {
    showAppAlert(error.message || "Nem sikerült menteni a megjegyzést.", {
      title: "Hiba",
    });
  }
}

function renderProfileCalendarDayDetails(dayCatches, selectedDateKey, isManualOnly = false, dayNote = "") {
  const selectedDate = $("#profileCalendarSelectedDate");
  const dayCatchesContainer = $("#profileCalendarDayCatches");

  if (!selectedDate || !dayCatchesContainer) {
    return;
  }

  clearElement(dayCatchesContainer);

  if (!selectedDateKey) {
    selectedDate.classList.add("d-none");
    selectedDate.textContent = "";
    return;
  }

  const catches = Array.isArray(dayCatches) ? dayCatches : [];
  selectedDate.classList.remove("d-none");
  selectedDate.textContent = catches.length
    ? `${formatProfileCalendarSelectedDate(selectedDateKey)} - ${catches.length} fogás`
    : isManualOnly
      ? `${formatProfileCalendarSelectedDate(selectedDateKey)} - Horgásznap`
      : formatProfileCalendarSelectedDate(selectedDateKey);

  if (!catches.length && !isManualOnly) {
    const note = document.createElement("div");
    note.className = "profile-calendar-catch-card profile-calendar-manual-note";
    note.innerHTML = `
      <div class="fw-semibold mb-1">Nincs még jelölés</div>
      <div class="small">Ehhez a naphoz még nincs rögzített fogás vagy külön megjelölt horgásznap.</div>
    `;
    dayCatchesContainer.appendChild(note);
    return;
  }

  if (!catches.length && isManualOnly) {
    const note = document.createElement("div");
    note.className = "profile-calendar-catch-card profile-calendar-manual-note";
    note.innerHTML = `
      <div class="fw-semibold mb-1">Horgászattal töltött nap</div>
      ${dayNote ? `<div class="small"><strong>Megjegyzés:</strong> ${escapeHtml(dayNote)}</div>` : ""}
    `;
    dayCatchesContainer.appendChild(note);
    return;
  }

  catches
    .slice()
    .sort((a, b) => new Date(a.FogasIdeje) - new Date(b.FogasIdeje))
    .forEach((fogas) => {
      const card = document.createElement("div");
      card.className = "profile-calendar-catch-card";
      card.innerHTML = `
        <div class="fw-semibold mb-1">${escapeHtml(fogas.HalfajNev || "Ismeretlen halfaj")}</div>
        <div class="profile-calendar-catch-meta mb-2">
          ${new Date(fogas.FogasIdeje).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div class="small">
          <div><strong>Hely:</strong> ${escapeHtml(fogas.VizteruletNev || "-")}</div>
          ${fogas.SulyKg ? `<div><strong>Súly:</strong> ${escapeHtml(String(fogas.SulyKg))} kg</div>` : ""}
          ${fogas.HosszCm ? `<div><strong>Hossz:</strong> ${escapeHtml(String(fogas.HosszCm))} cm</div>` : ""}
          ${fogas.Megjegyzes ? `<div><strong>Megjegyzés:</strong> ${escapeHtml(fogas.Megjegyzes)}</div>` : ""}
        </div>
      `;
      dayCatchesContainer.appendChild(card);
    });

  if (dayNote) {
    const note = document.createElement("div");
    note.className = "profile-calendar-catch-card profile-calendar-manual-note";
    note.innerHTML = `
      <div class="fw-semibold mb-1">Napi megjegyzés</div>
      <div class="small">${escapeHtml(dayNote)}</div>
    `;
    dayCatchesContainer.appendChild(note);
  }
}

function renderProfileFishingCalendar(catches = [], manualDays = [], options = {}) {
  const calendar = $("#profileFishingCalendar");
  const monthLabel = $("#profileCalendarMonthLabel");
  const grid = $("#profileCalendarGrid");
  const monthEmpty = $("#profileCalendarMonthEmpty");
  const prevButton = $("#profileCalendarPrev");
  const nextButton = $("#profileCalendarNext");

  if (!calendar || !monthLabel || !grid || !monthEmpty || !prevButton || !nextButton) {
    return;
  }

  const { isOwnProfile = false, keepMonth = false } = options;

  if (!Array.isArray(catches)) {
    clearProfileFishingCalendar();
    return;
  }

  profileCalendarState.catches = catches.slice();
  profileCalendarState.manualDays = normalizeFishingDayEntries(manualDays);
  profileCalendarState.isOwnProfile = Boolean(isOwnProfile);

  const { catchesByDate, manualDaysByDate, manualDayKeys, markedDateKeys } = buildProfileCalendarData(
    profileCalendarState.catches,
    profileCalendarState.manualDays
  );

  if (!markedDateKeys.length && !profileCalendarState.isOwnProfile) {
    clearProfileFishingCalendar();
    return;
  }

  const todayMonth = getMonthStart(new Date());
  const minMonth = markedDateKeys.length
    ? getMonthStart(getDateFromDateKey(markedDateKeys[0]))
    : new Date(todayMonth);
  const maxMonth = markedDateKeys.length
    ? getMonthStart(getDateFromDateKey(markedDateKeys[markedDateKeys.length - 1]))
    : new Date(todayMonth);

  if (!profileCalendarState.currentMonth || !keepMonth) {
    profileCalendarState.currentMonth = markedDateKeys.length ? new Date(maxMonth) : new Date(todayMonth);
  }

  if (!profileCalendarState.isOwnProfile && profileCalendarState.currentMonth < minMonth) {
    profileCalendarState.currentMonth = new Date(minMonth);
  }

  if (!profileCalendarState.isOwnProfile && profileCalendarState.currentMonth > maxMonth) {
    profileCalendarState.currentMonth = new Date(maxMonth);
  }

  const monthMarkedKeys = markedDateKeys.filter((dateKey) =>
    isSameMonth(getDateFromDateKey(dateKey), profileCalendarState.currentMonth)
  );

  const hasSelectedDateInCurrentMonth = profileCalendarState.selectedDateKey
    && isSameMonth(getDateFromDateKey(profileCalendarState.selectedDateKey), profileCalendarState.currentMonth);

  if (!profileCalendarState.selectedDateKey) {
    profileCalendarState.selectedDateKey = monthMarkedKeys[0] || "";
  } else if (!hasSelectedDateInCurrentMonth) {
    profileCalendarState.selectedDateKey = monthMarkedKeys[0] || "";
  }

  calendar.classList.remove("d-none");
  monthLabel.textContent = formatProfileCalendarMonth(profileCalendarState.currentMonth);
  monthEmpty.classList.toggle("d-none", monthMarkedKeys.length > 0);
  prevButton.disabled = !profileCalendarState.isOwnProfile && profileCalendarState.currentMonth <= minMonth;
  nextButton.disabled = !profileCalendarState.isOwnProfile && profileCalendarState.currentMonth >= maxMonth;

  clearElement(grid);

  const firstDayOfMonth = new Date(
    profileCalendarState.currentMonth.getFullYear(),
    profileCalendarState.currentMonth.getMonth(),
    1
  );
  const firstDayIndex = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
  const daysInMonth = new Date(
    profileCalendarState.currentMonth.getFullYear(),
    profileCalendarState.currentMonth.getMonth() + 1,
    0
  ).getDate();

  for (let index = 0; index < firstDayIndex; index += 1) {
    const placeholder = document.createElement("button");
    placeholder.type = "button";
    placeholder.className = "profile-calendar-day is-empty";
    placeholder.disabled = true;
    placeholder.setAttribute("aria-hidden", "true");
    grid.appendChild(placeholder);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${profileCalendarState.currentMonth.getFullYear()}-${String(profileCalendarState.currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayCatchList = catchesByDate.get(dateKey) || [];
    const manualDayEntry = manualDaysByDate.get(dateKey) || null;
    const isManualDay = manualDayKeys.has(dateKey);
    const isMarkedDay = dayCatchList.length > 0 || isManualDay;
    const dayWrapper = document.createElement("div");
    dayWrapper.className = "profile-calendar-day-wrapper";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "profile-calendar-day";

    if (dayCatchList.length) {
      button.classList.add("has-catches");
    }
    if (isManualDay) {
      button.classList.add("is-manually-marked");
    }
    if (profileCalendarState.selectedDateKey === dateKey) {
      button.classList.add("is-selected");
    }
    if (!profileCalendarState.isOwnProfile && !isMarkedDay) {
      button.disabled = true;
    }

    button.innerHTML = `
      <span class="profile-calendar-day-number">${day}</span>
      ${
        dayCatchList.length
          ? `<span class="profile-calendar-day-count">${dayCatchList.length} fogás</span>`
          : isManualDay
            ? `<span class="profile-calendar-day-count">Horgásznap</span>`
            : ""
      }
    `;

    button.addEventListener("click", () => {
      if (!profileCalendarState.isOwnProfile && !isMarkedDay) {
        return;
      }

      profileCalendarState.selectedDateKey = dateKey;
      profileCalendarState.menuOpenDateKey = "";
      renderProfileFishingCalendar(profileCalendarState.catches, profileCalendarState.manualDays, {
        isOwnProfile: profileCalendarState.isOwnProfile,
        keepMonth: true,
      });
    });

    dayWrapper.appendChild(button);

    if (profileCalendarState.isOwnProfile) {
      const menu = document.createElement("div");
      menu.className = "profile-calendar-day-menu";

      const toggleButton = document.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = "profile-calendar-day-menu-toggle";
      toggleButton.setAttribute("aria-label", `${day}. nap menüje`);
      toggleButton.setAttribute("aria-expanded", String(profileCalendarState.menuOpenDateKey === dateKey));
      toggleButton.textContent = "+";
      toggleButton.addEventListener("click", (event) => {
        event.stopPropagation();
        profileCalendarState.menuOpenDateKey = profileCalendarState.menuOpenDateKey === dateKey ? "" : dateKey;
        renderProfileFishingCalendar(profileCalendarState.catches, profileCalendarState.manualDays, {
          isOwnProfile: profileCalendarState.isOwnProfile,
          keepMonth: true,
        });
      });

      const panel = document.createElement("div");
      panel.className = "profile-calendar-day-menu-panel";
      panel.classList.toggle("d-none", profileCalendarState.menuOpenDateKey !== dateKey);

      const actionButton = document.createElement("button");
      actionButton.type = "button";
      actionButton.className = "profile-calendar-day-menu-action";

      if (dayCatchList.length) {
        actionButton.disabled = true;
        actionButton.textContent = "Fogás miatt automatikus jelölés";
      } else if (isManualDay) {
        actionButton.textContent = "Jelölés törlése";
        actionButton.addEventListener("click", async (event) => {
          event.stopPropagation();
          await toggleProfileFishingDay(dateKey, true);
        });
      } else {
        actionButton.textContent = "Horgásznap jelölése";
        actionButton.addEventListener("click", async (event) => {
          event.stopPropagation();
          await toggleProfileFishingDay(dateKey, false);
        });
      }

      const noteButton = document.createElement("button");
      noteButton.type = "button";
      noteButton.className = "profile-calendar-day-menu-action";

      if (isMarkedDay) {
        noteButton.textContent = manualDayEntry?.Megjegyzes ? "Megjegyzés szerkesztése" : "Megjegyzés hozzáadása";
        noteButton.addEventListener("click", async (event) => {
          event.stopPropagation();
          await editProfileFishingDayNote(dateKey);
        });
      } else {
        noteButton.textContent = "Megjegyzés hozzáadása";
        noteButton.disabled = true;
      }

      panel.appendChild(actionButton);
      panel.appendChild(noteButton);
      menu.appendChild(toggleButton);
      menu.appendChild(panel);
      dayWrapper.appendChild(menu);
    }

    grid.appendChild(dayWrapper);
  }

  renderProfileCalendarDayDetails(
    profileCalendarState.selectedDateKey ? catchesByDate.get(profileCalendarState.selectedDateKey) || [] : [],
    profileCalendarState.selectedDateKey,
    Boolean(profileCalendarState.selectedDateKey) &&
      manualDayKeys.has(profileCalendarState.selectedDateKey) &&
      !(catchesByDate.get(profileCalendarState.selectedDateKey) || []).length,
    manualDaysByDate.get(profileCalendarState.selectedDateKey)?.Megjegyzes || ""
  );
}

function changeProfileCalendarMonth(delta) {
  if (!profileCalendarState.currentMonth) {
    return;
  }

  profileCalendarState.currentMonth = new Date(
    profileCalendarState.currentMonth.getFullYear(),
    profileCalendarState.currentMonth.getMonth() + delta,
    1
  );
  profileCalendarState.menuOpenDateKey = "";

  renderProfileFishingCalendar(profileCalendarState.catches, profileCalendarState.manualDays, {
    isOwnProfile: profileCalendarState.isOwnProfile,
    keepMonth: true,
  });
}

function bindProfileCalendarMenuDismiss() {
  if (document.body.dataset.profileCalendarMenuBound === "true") {
    return;
  }

  document.addEventListener("click", (event) => {
    if (!profileCalendarState.menuOpenDateKey) {
      return;
    }

    if (event.target.closest(".profile-calendar-day-menu")) {
      return;
    }

    profileCalendarState.menuOpenDateKey = "";
    renderProfileFishingCalendar(profileCalendarState.catches, profileCalendarState.manualDays, {
      isOwnProfile: profileCalendarState.isOwnProfile,
      keepMonth: true,
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !profileCalendarState.menuOpenDateKey) {
      return;
    }

    profileCalendarState.menuOpenDateKey = "";
    renderProfileFishingCalendar(profileCalendarState.catches, profileCalendarState.manualDays, {
      isOwnProfile: profileCalendarState.isOwnProfile,
      keepMonth: true,
    });
  });

  document.body.dataset.profileCalendarMenuBound = "true";
}

function bindProfileFishingCalendarControls() {
  const prevButton = $("#profileCalendarPrev");
  const nextButton = $("#profileCalendarNext");

  bindProfileCalendarMenuDismiss();

  if (prevButton && prevButton.dataset.bound !== "true") {
    prevButton.addEventListener("click", () => changeProfileCalendarMonth(-1));
    prevButton.dataset.bound = "true";
  }

  if (nextButton && nextButton.dataset.bound !== "true") {
    nextButton.addEventListener("click", () => changeProfileCalendarMonth(1));
    nextButton.dataset.bound = "true";
  }
}

function getCatchFilterElements(context) {
  if (context === "profile") {
    return {
      wrapper: $("#profileCatchesFilters"),
      toggle: $("#profileCatchesFiltersToggle"),
      water: $("#profileCatchFilterWater"),
      species: $("#profileCatchFilterSpecies"),
      minSize: $("#profileCatchFilterMinSize"),
      maxSize: $("#profileCatchFilterMaxSize"),
      count: $("#profileCatchesCount"),
      empty: $("#profileCatchesEmpty"),
      list: $("#profileCatchesList"),
    };
  }

  return {
    wrapper: $("#catchListFilters"),
    toggle: $("#catchListFiltersToggle"),
    water: $("#catchFilterWater"),
    species: $("#catchFilterSpecies"),
    minSize: $("#catchFilterMinSize"),
    maxSize: $("#catchFilterMaxSize"),
    count: $("#catchListCount"),
    empty: $("#catchListEmpty"),
    list: $("#catchListContainer"),
  };
}

function isAllowedWaterCountySelection(megyeIds = []) {
  if (!Array.isArray(megyeIds)) {
    return false;
  }

  const uniqueIds = [...new Set(megyeIds.map((value) => Number(value)).filter((value) => !Number.isNaN(value)))];
  if (uniqueIds.length === 1) {
    return true;
  }

  if (uniqueIds.length !== 2) {
    return false;
  }

  const selectedCounties = adminState.counties.filter((county) => uniqueIds.includes(Number(county.MegyeId)));
  const selectedNames = new Set(selectedCounties.map((county) => String(county.Nev || "").trim()));

  return selectedNames.size === 2 && selectedNames.has("Pest") && selectedNames.has("Budapest");
}

function populateCatchFilterSelect(selectElement, values, placeholder) {
  if (!selectElement) {
    return;
  }

  const previousValue = selectElement.value;
  const uniqueValues = [...new Set(values.filter((value) => typeof value === "string" && value.trim()))]
    .sort((a, b) => a.localeCompare(b, "hu"));

  selectElement.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = placeholder;
  selectElement.appendChild(defaultOption);

  uniqueValues.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
  });

  selectElement.value = uniqueValues.includes(previousValue) ? previousValue : "";
}

function bindCatchFilters(context, options = {}) {
  const elements = getCatchFilterElements(context);
  if (!elements.wrapper || elements.wrapper.dataset.bound === "true") {
    return;
  }

  const handler = () => applyCatchFilters(context, options);

  [elements.water, elements.species].forEach((element) => {
    if (element) {
      element.addEventListener("change", handler);
    }
  });

  [elements.minSize, elements.maxSize].forEach((element) => {
    if (element) {
      element.addEventListener("input", handler);
    }
  });

  if (elements.toggle) {
    elements.toggle.addEventListener("click", () => {
      toggleCatchFilters(context);
    });
  }

  elements.wrapper.dataset.bound = "true";
}

function getCatchFilters(context) {
  const elements = getCatchFilterElements(context);
  return {
    water: elements.water?.value || "",
    species: elements.species?.value || "",
    minSize: elements.minSize?.value ? Number(elements.minSize.value) : null,
    maxSize: elements.maxSize?.value ? Number(elements.maxSize.value) : null,
  };
}

function hasActiveCatchFilters(filters) {
  return Boolean(filters.water || filters.species || filters.minSize !== null || filters.maxSize !== null);
}

function updateCatchFiltersToggleLabel(context) {
  const { toggle } = getCatchFilterElements(context);
  if (!toggle) {
    return;
  }

  const expanded = Boolean(catchFilterPanelState[context]);
  toggle.setAttribute("aria-expanded", String(expanded));
  toggle.textContent = expanded ? "Szűrők elrejtése" : "Szűrők";
}

function updateCatchFiltersVisibility(context) {
  const elements = getCatchFilterElements(context);
  const source = Array.isArray(catchCollections[context]) ? catchCollections[context] : [];
  const hasData = source.length > 0;

  if (elements.toggle) {
    elements.toggle.classList.toggle("d-none", !hasData);
  }

  if (elements.wrapper) {
    elements.wrapper.classList.toggle("d-none", !hasData || !catchFilterPanelState[context]);
  }

  updateCatchFiltersToggleLabel(context);
}

function toggleCatchFilters(context) {
  const source = Array.isArray(catchCollections[context]) ? catchCollections[context] : [];
  if (!source.length) {
    return;
  }

  catchFilterPanelState[context] = !catchFilterPanelState[context];
  updateCatchFiltersVisibility(context);
}

function filterCatchesByValues(catches, filters) {
  return catches.filter((fogas) => {
    const sizeCm = Number(fogas.HosszCm);
    const hasSize = Number.isFinite(sizeCm);

    if (filters.water && fogas.VizteruletNev !== filters.water) {
      return false;
    }

    if (filters.species && fogas.HalfajNev !== filters.species) {
      return false;
    }

    if (filters.minSize !== null && (!hasSize || sizeCm < filters.minSize)) {
      return false;
    }

    if (filters.maxSize !== null && (!hasSize || sizeCm > filters.maxSize)) {
      return false;
    }

    return true;
  });
}

function applyCatchFilters(context, options = {}) {
  const {
    allowDelete = false,
    emptyMessage = "Még nincs rögzített fogás.",
    filteredEmptyMessage = "Nincs a szűrésnek megfelelő fogás.",
  } = options;
  const elements = getCatchFilterElements(context);
  const source = Array.isArray(catchCollections[context]) ? catchCollections[context] : [];
  const filters = getCatchFilters(context);
  const filtered = filterCatchesByValues(source, filters);

  if (hasActiveCatchFilters(filters)) {
    catchFilterPanelState[context] = true;
  }

  updateCatchFiltersVisibility(context);

  if (context === "profile") {
    bindProfileFishingCalendarControls();
    renderProfileFishingCalendar(source, profileCalendarState.manualDays, {
      isOwnProfile: profileCalendarState.isOwnProfile,
      keepMonth: true,
    });
  }

  if (elements.count) {
    elements.count.textContent = source.length
      ? filtered.length === source.length
        ? `${source.length} fogás`
        : `${filtered.length} / ${source.length} fogás`
      : "";
  }

  if (elements.empty) {
    elements.empty.classList.add("d-none");
    elements.empty.textContent = hasActiveCatchFilters(filters) ? filteredEmptyMessage : emptyMessage;
  }

  if (elements.list) {
    clearElement(elements.list);
  }

  if (!source.length || !filtered.length) {
    if (elements.empty) {
      elements.empty.classList.remove("d-none");
    }
    return;
  }

  renderCatchCards(elements.list, filtered, { allowDelete });
}

function syncCatchFilterOptions(context, catches) {
  const elements = getCatchFilterElements(context);
  populateCatchFilterSelect(
    elements.water,
    catches.map((fogas) => fogas.VizteruletNev),
    "Összes hely"
  );
  populateCatchFilterSelect(
    elements.species,
    catches.map((fogas) => fogas.HalfajNev),
    "Összes halfaj"
  );
}

async function loadSajatFogasok() {
  const catchListContainer = $("#catchListContainer");
  const catchListLoading = $("#catchListLoading");
  const catchListError = $("#catchListError");
  const catchListEmpty = $("#catchListEmpty");
  if (!catchListContainer) return;

  try {
    bindCatchFilters("own", {
      allowDelete: true,
      emptyMessage: "Még nincs rögzített fogásod.",
      filteredEmptyMessage: "Nincs a szűrésnek megfelelő fogás.",
    });
    if (catchListLoading) catchListLoading.classList.remove("d-none");
    if (catchListError) {
      catchListError.classList.add("d-none");
      catchListError.textContent = "";
    }
    if (catchListEmpty) {
      catchListEmpty.classList.add("d-none");
      catchListEmpty.textContent = "Még nincs rögzített fogásod.";
    }

    const data = await apiRequest("/fogasnaplo/sajat");
    catchCollections.own = Array.isArray(data) ? data : [];
    syncCatchFilterOptions("own", catchCollections.own);
    applyCatchFilters("own", {
      allowDelete: true,
      emptyMessage: "Még nincs rögzített fogásod.",
      filteredEmptyMessage: "Nincs a szűrésnek megfelelő fogás.",
    });
  } catch (error) {
    console.error("Fog\u00E1sok bet\u00F6lt\u00E9si hiba:", error);
    clearElement(catchListContainer);
    catchCollections.own = [];
    catchFilterPanelState.own = false;
    updateCatchFiltersVisibility("own");
    if (catchListError) {
      catchListError.classList.remove("d-none");
      catchListError.textContent = "Hiba történt az adatok betöltése során.";
    }
  } finally {
    if (catchListLoading) {
      catchListLoading.classList.add("d-none");
    }
  }
}

function hideProfileCatchesSection() {
  const section = $("#profileCatchesSection");
  const filters = $("#profileCatchesFilters");
  const toggle = $("#profileCatchesFiltersToggle");
  const count = $("#profileCatchesCount");
  const loading = $("#profileCatchesLoading");
  const error = $("#profileCatchesError");
  const empty = $("#profileCatchesEmpty");
  const list = $("#profileCatchesList");

  if (section) section.classList.add("d-none");
  if (filters) filters.classList.add("d-none");
  if (toggle) toggle.classList.add("d-none");
  catchFilterPanelState.profile = false;
  if (count) count.textContent = "";
  if (loading) loading.classList.add("d-none");
  if (error) {
    error.classList.add("d-none");
    error.textContent = "";
  }
  if (empty) {
    empty.classList.add("d-none");
    empty.textContent = "";
  }
  if (list) clearElement(list);
  clearProfileFishingCalendar();
}

async function loadProfileCatches(viewedUserId = null, isExternalProfile = false) {
  const section = $("#profileCatchesSection");
  const title = $("#profileCatchesTitle");
  const count = $("#profileCatchesCount");
  const loading = $("#profileCatchesLoading");
  const error = $("#profileCatchesError");
  const empty = $("#profileCatchesEmpty");
  const list = $("#profileCatchesList");

  if (!section || !loading || !error || !empty || !list) {
    return;
  }

  section.classList.remove("d-none");
  bindCatchFilters("profile", {
    emptyMessage: isExternalProfile
      ? "A felhasználónak még nincs rögzített fogása."
      : "Még nincs rögzített fogásod.",
    filteredEmptyMessage: "Nincs a szűrésnek megfelelő fogás.",
  });
  if (title) {
    title.textContent = isExternalProfile ? "Fog\u00E1sai" : "Saj\u00E1t fog\u00E1sok";
  }
  if (count) {
    count.textContent = "";
  }
  loading.classList.remove("d-none");
  error.classList.add("d-none");
  error.textContent = "";
  empty.classList.add("d-none");
  empty.textContent = isExternalProfile
    ? "A felhaszn\u00E1l\u00F3nak m\u00E9g nincs r\u00F6gz\u00EDtett fog\u00E1sa."
    : "M\u00E9g nincs r\u00F6gz\u00EDtett fog\u00E1sod.";
  clearElement(list);
  clearProfileFishingCalendar();

  try {
    const catchesEndpoint = isExternalProfile && viewedUserId !== null
      ? `/fogasnaplo/felhasznalo/${viewedUserId}`
      : "/fogasnaplo/sajat";
    const fishingDaysEndpoint = isExternalProfile && viewedUserId !== null
      ? `/horgasznapok/felhasznalo/${viewedUserId}`
      : "/horgasznapok/sajat";
    const [catches, fishingDays] = await Promise.all([
      apiRequest(catchesEndpoint),
      apiRequest(fishingDaysEndpoint),
    ]);

    catchCollections.profile = Array.isArray(catches) ? catches : [];
    profileCalendarState.manualDays = normalizeFishingDayEntries(fishingDays);
    profileCalendarState.isOwnProfile = !isExternalProfile;
    syncCatchFilterOptions("profile", catchCollections.profile);
    applyCatchFilters("profile", {
      emptyMessage: isExternalProfile
        ? "A felhasználónak még nincs rögzített fogása."
        : "Még nincs rögzített fogásod.",
      filteredEmptyMessage: "Nincs a szűrésnek megfelelő fogás.",
    });
  } catch (catchError) {
    console.error("Profil fog\u00E1sok bet\u00F6lt\u00E9si hiba:", catchError);
    catchCollections.profile = [];
    profileCalendarState.manualDays = [];
    profileCalendarState.isOwnProfile = !isExternalProfile;
    catchFilterPanelState.profile = false;
    updateCatchFiltersVisibility("profile");
    error.classList.remove("d-none");
    error.textContent = "Hiba t\u00F6rt\u00E9nt a fog\u00E1sok bet\u00F6lt\u00E9se sor\u00E1n.";
  } finally {
    loading.classList.add("d-none");
  }
}

async function loadUserProfile() {
  const profileContent = $("#profileContent");
  const profileEmpty = $("#profileEmpty");
  const profileLoading = $("#profileLoading");
  const profileName = $("#profileName");
  const profileEmail = $("#profileEmail");
  const profileEmailSection = $("#profileEmailSection");
  const profileCreated = $("#profileCreated");
  const profileRoles = $("#profileRoles");
  const profilePageTitle = $("#profilePageTitle");
  const profilePageDescription = document.querySelector("main .container .mb-4 .section-text");
  const profileActions = $("#profileActions");
  const profileActionsDivider = $("#profileActionsDivider");
  const deleteProfileButton = $("#deleteProfileButton");
  const logoutButton = $("#logoutButton");
  const profileError = $("#profileError");

  try {
    const viewedUserId = getViewedProfileUserId();
    const isExternalProfile = viewedUserId !== null;

    if (profileLoading) profileLoading.classList.remove("d-none");
    if (profileError) {
      profileError.classList.add("d-none");
      profileError.textContent = "";
    }

    const user = isExternalProfile
      ? await apiRequest(`/users/${viewedUserId}/profile`)
      : getStoredUser();

    if (!user) {
      if (profileLoading) profileLoading.classList.add("d-none");
      if (profileContent) profileContent.classList.add("d-none");
      if (profileEmpty) profileEmpty.classList.remove("d-none");
      hideProfileCatchesSection();
      return;
    }

    if (profileLoading) profileLoading.classList.add("d-none");
    if (profileContent) profileContent.classList.remove("d-none");
    if (profileEmpty) profileEmpty.classList.add("d-none");

    if (profilePageTitle) {
      profilePageTitle.textContent = isExternalProfile ? "Felhasználói profil" : "Profil";
    }
    if (profilePageDescription) {
      profilePageDescription.textContent = isExternalProfile
        ? "A kiválasztott felhasználó profilja."
        : "Profilinformációk és beállítások.";
    }
    if (profileName) profileName.textContent = user.username || "";
    if (profileEmail) profileEmail.textContent = isExternalProfile ? "-" : user.email || "";
    if (profileEmailSection) {
      profileEmailSection.classList.toggle("d-none", isExternalProfile);
    }
    if (profileCreated) {
      profileCreated.textContent = user.letrehozva
        ? new Date(user.letrehozva).toLocaleDateString("hu-HU")
        : "-";
    }
    if (profileRoles) {
      profileRoles.textContent = isAdminUser(user) ? "Admin" : "Felhasználó";
    }
    if (profilePrivacySection) {
      profilePrivacySection.classList.toggle("d-none", isExternalProfile);
    }
    if (profilePrivateToggle) {
      profilePrivateToggle.checked = !isExternalProfile && isPrivateProfileEnabled(user);
      profilePrivateToggle.disabled = isExternalProfile;
    }
    if (deleteProfileButton) {
      deleteProfileButton.classList.toggle("d-none", isExternalProfile || isAdminUser(user));
    }
    if (logoutButton) {
      logoutButton.classList.toggle("d-none", isExternalProfile);
    }
    if (profileActions) {
      profileActions.classList.toggle("d-none", isExternalProfile);
    }
    if (profileActionsDivider) {
      profileActionsDivider.classList.toggle("d-none", isExternalProfile);
    }
    await loadProfileCatches(viewedUserId, isExternalProfile);
  } catch (error) {
    console.error("Profil betöltési hiba:", error);
    if (profileLoading) {
      profileLoading.classList.add("d-none");
    }
    if (profileContent) {
      profileContent.classList.add("d-none");
    }
    if (profileEmpty) {
      profileEmpty.classList.add("d-none");
    }
    hideProfileCatchesSection();

    if (error?.status === 403 && error?.data?.privateProfile && profilePrivateNotice) {
      if (profilePageTitle) {
        profilePageTitle.textContent = "Felhasználói profil";
      }
      if (profilePageDescription) {
        profilePageDescription.textContent = "A kiválasztott felhasználó profilja.";
      }
      profilePrivateNotice.classList.remove("d-none");
      return;
    }

    if (profileError) {
      profileError.classList.remove("d-none");
      profileError.textContent = "Hiba a profil betöltése során!";
    }
  }
}



