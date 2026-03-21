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
  marketplaceModeration: {
    href: "marketplace-admin.html",
    label: "Marketplace moderáció",
    title: "Marketplace moderáció",
    description: "Marketplace hirdetések és reportok moderálása.",
  },
  reports: {
    href: "admin.html#reports",
    label: "Üzenetek",
    title: "Report üzenetek",
    description: "Fórum reportok kezelése és admin válaszok küldése.",
  },
};

const ADMIN_NAV_GROUPS = {
  management: {
    id: "adminManagementNavItem",
    label: "Kezelő felület",
    items: [ADMIN_SHORTCUTS.species, ADMIN_SHORTCUTS.waters],
  },
  moderation: {
    id: "adminModerationNavItem",
    label: "Moderációs felület",
    items: [ADMIN_SHORTCUTS.forum, ADMIN_SHORTCUTS.marketplaceModeration],
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
  viewMode: "list",
  createImageFiles: [],
  createPrimaryImageId: null,
  createMode: "create",
  editingListingId: null,
  activeListing: null,
};

const MARKETPLACE_VIEW_MODE_KEY = "marketplaceViewMode_v2";
const MAX_MARKETPLACE_IMAGES = 5;
let marketplaceDraftImageCounter = 0;

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

  if (page === "marketplace-create") {
    prepareMarketplaceCreatePage();
  }

  if (page === "admin") {
    prepareAdminPage();
  }

  if (page === "marketplace-admin") {
    prepareMarketplaceAdminPage();
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
  const adminDropdownToggles = $all(".admin-nav-group-toggle");
  const adminDropdownItems = $all(".admin-nav-dropdown-menu .dropdown-item");

  navLinks.forEach((link) => link.classList.remove("active"));
  adminDropdownToggles.forEach((toggle) => toggle.classList.remove("active"));
  adminDropdownItems.forEach((item) => item.classList.remove("active"));

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");

    if (
      (page === "index" && href === "index.html") ||
      (page === "baratok" && href === "baratok.html") ||
      (page === "vizteruletek" && href === "vizteruletek.html") ||
      (page === "fogasnaplo" && href === "fogasnaplo.html") ||
      (page === "forum" && href === "forum.html") ||
      (page === "uzenetek" && href === "uzenetek.html") ||
      ((page === "marketplace" || page === "marketplace-detail" || page === "marketplace-create") && href === "marketplace.html") ||
      (page === "marketplace-admin" && href === "marketplace-admin.html") ||
      (page === "admin" && (
        (currentHash && href === `admin.html${currentHash}`) ||
        (!currentHash && href === "admin.html")
      )) ||
      (page === "profil" && href === "profil.html")
    ) {
      link.classList.add("active");
    }
  });

  const managementToggle = $("#adminManagementNavItem .admin-nav-group-toggle");
  const moderationToggle = $("#adminModerationNavItem .admin-nav-group-toggle");
  const speciesDropdownItem = $('#adminManagementNavItem .dropdown-item[href="admin.html#species"]');
  const watersDropdownItem = $('#adminManagementNavItem .dropdown-item[href="admin.html#waters"]');
  const forumDropdownItem = $('#adminModerationNavItem .dropdown-item[href="admin.html#forum"]');
  const marketplaceDropdownItem = $('#adminModerationNavItem .dropdown-item[href="marketplace-admin.html"]');

  if (page === "admin" && currentHash === "#species") {
    managementToggle?.classList.add("active");
    speciesDropdownItem?.classList.add("active");
  }

  if (page === "admin" && currentHash === "#waters") {
    managementToggle?.classList.add("active");
    watersDropdownItem?.classList.add("active");
  }

  if (page === "admin" && currentHash === "#forum") {
    moderationToggle?.classList.add("active");
    forumDropdownItem?.classList.add("active");
  }

  if (page === "marketplace-admin") {
    moderationToggle?.classList.add("active");
    marketplaceDropdownItem?.classList.add("active");
  }
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

function setResponsiveNavItemVisibility(item, show, mobileOnly = false) {
  if (!item) {
    return;
  }

  item.classList.toggle("d-none", !show);

  if (show && mobileOnly) {
    item.classList.add("d-lg-none");
  } else {
    item.classList.remove("d-lg-none");
  }
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

function ensureAdminGroupedNavItem(groupConfig) {
  const adminNavItem = $("#adminNavItem");
  const navbarMenu = $("#navbarMenu");

  if (!adminNavItem || !navbarMenu || !groupConfig) {
    return null;
  }

  let groupedNavItem = document.getElementById(groupConfig.id);

  if (!groupedNavItem) {
    groupedNavItem = document.createElement("li");
    groupedNavItem.className = "nav-item dropdown admin-nav-group d-none";
    groupedNavItem.id = groupConfig.id;
    adminNavItem.insertAdjacentElement("beforebegin", groupedNavItem);
  }

  const dropdownItemsMarkup = groupConfig.items
    .map(
      (item) =>
        `<a class="dropdown-item" href="${item.href}">${item.label}</a>`
    )
    .join("");

  groupedNavItem.innerHTML = `
    <a
      class="nav-link dropdown-toggle admin-nav-group-toggle"
      href="#"
      role="button"
      data-bs-toggle="dropdown"
      aria-expanded="false"
    >
      ${groupConfig.label}
    </a>
    <div class="dropdown-menu admin-nav-dropdown-menu">
      ${dropdownItemsMarkup}
    </div>
  `;

  return groupedNavItem;
}

function ensureAdminManagementNavItem() {
  return ensureAdminGroupedNavItem(ADMIN_NAV_GROUPS.management);
}

function ensureAdminModerationNavItem() {
  return ensureAdminGroupedNavItem(ADMIN_NAV_GROUPS.moderation);
}

function ensureUserMessagesNavItem() {
  const profilNavItem = $("#profilNavItem");
  const navbarMenu = $("#navbarMenu");

  if (!profilNavItem || !navbarMenu) {
    return null;
  }

  let userMessagesNavItem = $("#userMessagesNavItem");

  if (!userMessagesNavItem) {
    userMessagesNavItem = document.createElement("li");
    userMessagesNavItem.className = "nav-item d-none";
    userMessagesNavItem.id = "userMessagesNavItem";
    userMessagesNavItem.innerHTML = '<a class="nav-link" href="uzenetek.html">Üzenetek</a>';
    profilNavItem.insertAdjacentElement("beforebegin", userMessagesNavItem);
  }

  return userMessagesNavItem;
}

function ensureDesktopAccountMenuNavItem() {
  const navbarMenu = $("#navbarMenu");

  if (!navbarMenu) {
    return null;
  }

  let desktopAccountMenuNavItem = $("#desktopAccountMenuNavItem");

  if (!desktopAccountMenuNavItem) {
    desktopAccountMenuNavItem = document.createElement("li");
    desktopAccountMenuNavItem.className = "nav-item ms-lg-2 mt-2 mt-lg-0 desktop-account-menu-nav-item desktop-account-menu-hidden";
    desktopAccountMenuNavItem.id = "desktopAccountMenuNavItem";

    const logoutNavItem = $("#logoutNavItem");
    const desktopThemeToggleNavItem = $("#themeToggleDesktop")?.closest(".nav-item");

    if (logoutNavItem?.parentElement) {
      logoutNavItem.insertAdjacentElement("afterend", desktopAccountMenuNavItem);
    } else if (desktopThemeToggleNavItem?.parentElement) {
      desktopThemeToggleNavItem.parentElement.appendChild(desktopAccountMenuNavItem);
    } else {
      navbarMenu.appendChild(desktopAccountMenuNavItem);
    }
  }

  return desktopAccountMenuNavItem;
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
  DEFAULT_NAV_ITEMS.forEach((item) => {
    const link = findNavigationLink([item.defaultHref, item.adminShortcut.href]);
    if (!link) return;

    link.setAttribute("href", item.defaultHref);
    link.textContent = item.defaultLabel;
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

async function getImageDataUrlFromFile(file, fieldLabel = "A kép") {
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

function generateMarketplaceDraftImageId() {
  marketplaceDraftImageCounter += 1;
  return `marketplace-image-${Date.now()}-${marketplaceDraftImageCounter}`;
}

function createMarketplaceDraftImage({ dataUrl, name, sizeBytes = 0, existingImageId = null }) {
  return {
    clientId: generateMarketplaceDraftImageId(),
    dataUrl,
    name: name || "Kep",
    sizeBytes,
    existingImageId,
  };
}

function getMarketplaceDraftImagesOrdered() {
  const draftImages = Array.isArray(marketplaceState.createImageFiles)
    ? [...marketplaceState.createImageFiles]
    : [];
  const primaryImageId = marketplaceState.createPrimaryImageId;
  const primaryIndex = draftImages.findIndex((image) => image.clientId === primaryImageId);

  if (primaryIndex > 0) {
    const [primaryImage] = draftImages.splice(primaryIndex, 1);
    draftImages.unshift(primaryImage);
  }

  return draftImages;
}

function ensureMarketplaceDraftPrimaryImage() {
  const draftImages = Array.isArray(marketplaceState.createImageFiles) ? marketplaceState.createImageFiles : [];

  if (!draftImages.length) {
    marketplaceState.createPrimaryImageId = null;
    return;
  }

  if (!draftImages.some((image) => image.clientId === marketplaceState.createPrimaryImageId)) {
    marketplaceState.createPrimaryImageId = draftImages[0].clientId;
  }
}

function ensureMarketplaceCreateModal() {
  const pageElement = document.getElementById("marketplaceCreatePage");

  if (pageElement) {
    const form = pageElement.querySelector("#marketplaceCreateForm");
    const imageInput = pageElement.querySelector("#marketplaceCreateImages");
    const imageList = pageElement.querySelector("#marketplaceCreateImageList");

    if (form && form.dataset.bound !== "true") {
      form.addEventListener("submit", handleMarketplaceCreateSubmit);
      form.dataset.bound = "true";
    }

    if (imageInput && imageInput.dataset.bound !== "true") {
      imageInput.addEventListener("change", handleMarketplaceCreateImagesChange);
      imageInput.dataset.bound = "true";
    }

    if (imageList && imageList.dataset.bound !== "true") {
      imageList.addEventListener("change", (event) => {
        const radio = event.target.closest("[data-marketplace-primary-image]");

        if (!radio) {
          return;
        }

        marketplaceState.createPrimaryImageId = radio.value;
        renderMarketplaceCreateImageList();
      });

      imageList.addEventListener("click", (event) => {
        const removeButton = event.target.closest("[data-marketplace-remove-image]");

        if (!removeButton) {
          return;
        }

        marketplaceState.createImageFiles = marketplaceState.createImageFiles.filter(
          (image) => image.clientId !== removeButton.dataset.marketplaceRemoveImage
        );
        ensureMarketplaceDraftPrimaryImage();
        renderMarketplaceCreateImageList();
      });

      imageList.dataset.bound = "true";
    }

    return {
      modalElement: null,
      pageElement,
      form,
      modalTitle: pageElement.querySelector("#marketplaceCreatePageTitle"),
      modalSubtitle: pageElement.querySelector("#marketplaceCreatePageSubtitle"),
      submitButton: pageElement.querySelector("#marketplaceCreateSubmitButton"),
      categorySelect: pageElement.querySelector("#marketplaceCreateCategory"),
      titleInput: pageElement.querySelector("#marketplaceCreateTitle"),
      priceInput: pageElement.querySelector("#marketplaceCreatePrice"),
      cityInput: pageElement.querySelector("#marketplaceCreateCity"),
      descriptionInput: pageElement.querySelector("#marketplaceCreateDescription"),
      imageInput,
      imageList,
      errorElement: pageElement.querySelector("#marketplaceCreateFormError"),
    };
  }

  let modalElement = document.getElementById("marketplaceCreateModal");

  if (!modalElement) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="modal fade" id="marketplaceCreateModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content app-card border-info-subtle">
            <div class="modal-header border-secondary-subtle">
              <h2 id="marketplaceCreateModalTitle" class="modal-title fs-5">Új hirdetés feladása</h2>
              <button type="button" class="btn-close admin-modal-close" data-bs-dismiss="modal" aria-label="Bezárás"></button>
            </div>
            <form id="marketplaceCreateForm">
              <div class="modal-body">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label" for="marketplaceCreateCategory">Kategória</label>
                    <select id="marketplaceCreateCategory" class="form-select app-input" required></select>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label" for="marketplaceCreateCity">Település</label>
                    <input id="marketplaceCreateCity" class="form-control app-input" type="text" maxlength="100" required />
                  </div>
                  <div class="col-md-8">
                    <label class="form-label" for="marketplaceCreateTitle">Hirdetés megnevezése</label>
                    <input id="marketplaceCreateTitle" class="form-control app-input" type="text" maxlength="150" required />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label" for="marketplaceCreatePrice">Ár (Ft)</label>
                    <input id="marketplaceCreatePrice" class="form-control app-input" type="number" min="0" required />
                  </div>
                  <div class="col-12">
                    <label class="form-label" for="marketplaceCreateDescription">Leírás</label>
                    <textarea id="marketplaceCreateDescription" class="form-control app-input" rows="5" maxlength="2000" required></textarea>
                  </div>
                  <div class="col-12">
                    <div class="marketplace-upload-header">
                      <div>
                        <label class="form-label mb-1" for="marketplaceCreateImages">Képek</label>
                        <div class="form-text mb-0">Legfeljebb 5 kép tölthető fel, akár több részletben is.</div>
                      </div>
                      <label for="marketplaceCreateImages" class="btn btn-outline-info btn-sm marketplace-upload-trigger">Képek hozzáadása</label>
                    </div>
                    <input id="marketplaceCreateImages" class="d-none" type="file" accept="image/*" multiple />
                  </div>
                  <div class="col-12">
                    <div id="marketplaceCreateImageList" class="marketplace-upload-list">
                      <div class="marketplace-upload-empty">Még nincs kiválasztott kép.</div>
                    </div>
                  </div>
                  <div id="marketplaceCreateFormError" class="col-12 text-danger small d-none"></div>
                </div>
              </div>
              <div class="modal-footer border-secondary-subtle">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Mégse</button>
                <button id="marketplaceCreateSubmitButton" type="submit" class="btn marketplace-create-button">Hirdetés mentése</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    modalElement = wrapper.firstElementChild;
    document.body.appendChild(modalElement);
  }

  const form = modalElement.querySelector("#marketplaceCreateForm");
  const imageInput = modalElement.querySelector("#marketplaceCreateImages");
  const imageList = modalElement.querySelector("#marketplaceCreateImageList");

  if (form && form.dataset.bound !== "true") {
    form.addEventListener("submit", handleMarketplaceCreateSubmit);
    form.dataset.bound = "true";
  }

  if (imageInput && imageInput.dataset.bound !== "true") {
    imageInput.addEventListener("change", handleMarketplaceCreateImagesChange);
    imageInput.dataset.bound = "true";
  }

  if (imageList && imageList.dataset.bound !== "true") {
    imageList.addEventListener("change", (event) => {
      const radio = event.target.closest("[data-marketplace-primary-image]");

      if (!radio) {
        return;
      }

      marketplaceState.createPrimaryImageId = radio.value;
      renderMarketplaceCreateImageList();
    });

    imageList.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-marketplace-remove-image]");

      if (!removeButton) {
        return;
      }

      marketplaceState.createImageFiles = marketplaceState.createImageFiles.filter(
        (image) => image.clientId !== removeButton.dataset.marketplaceRemoveImage
      );
      ensureMarketplaceDraftPrimaryImage();
      renderMarketplaceCreateImageList();
    });

    imageList.dataset.bound = "true";
  }

  if (modalElement.dataset.bound !== "true") {
    modalElement.addEventListener("hidden.bs.modal", resetMarketplaceCreateForm);
    modalElement.dataset.bound = "true";
  }

  return {
    modalElement,
    form,
    modalTitle: modalElement.querySelector("#marketplaceCreateModalTitle"),
    submitButton: modalElement.querySelector("#marketplaceCreateSubmitButton"),
    categorySelect: modalElement.querySelector("#marketplaceCreateCategory"),
    titleInput: modalElement.querySelector("#marketplaceCreateTitle"),
    priceInput: modalElement.querySelector("#marketplaceCreatePrice"),
    cityInput: modalElement.querySelector("#marketplaceCreateCity"),
    descriptionInput: modalElement.querySelector("#marketplaceCreateDescription"),
    imageInput,
    imageList,
    errorElement: modalElement.querySelector("#marketplaceCreateFormError"),
  };
}

function setMarketplaceCreateFormError(message = "") {
  const { errorElement } = ensureMarketplaceCreateModal();

  if (!errorElement) {
    return;
  }

  errorElement.textContent = message;
  errorElement.classList.toggle("d-none", !message);
}

function populateMarketplaceCreateCategories(selectedCategoryId = null) {
  const { categorySelect } = ensureMarketplaceCreateModal();

  if (!categorySelect) {
    return;
  }

  categorySelect.innerHTML = '<option value="">Válassz kategóriát</option>';

  marketplaceState.categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = String(category.MarketplaceKategoriaId);
    option.textContent = category.Nev;
    option.selected = Number(selectedCategoryId) === Number(category.MarketplaceKategoriaId);
    categorySelect.appendChild(option);
  });
}

function renderMarketplaceCreateImageList() {
  const { imageList } = ensureMarketplaceCreateModal();

  if (!imageList) {
    return;
  }

  ensureMarketplaceDraftPrimaryImage();
  const draftImages = getMarketplaceDraftImagesOrdered();

  if (!draftImages.length) {
    imageList.innerHTML = '<div class="marketplace-upload-empty">Még nincs kiválasztott kép.</div>';
    return;
  }

  imageList.innerHTML = draftImages
    .map((image, index) => {
      const isPrimary = image.clientId === marketplaceState.createPrimaryImageId;
      const sizeLabel =
        image.sizeBytes > 0
          ? `${escapeHtml((image.sizeBytes / 1024 / 1024).toFixed(2))} MB`
          : "Mentett kép";

      return `
        <div class="marketplace-upload-item${isPrimary ? " is-primary" : ""}">
          <div class="marketplace-upload-preview">
            <img src="${escapeHtml(image.dataUrl)}" alt="${escapeHtml(image.name || `Kep ${index + 1}`)}" />
          </div>
          <div class="marketplace-upload-meta">
            <div class="fw-semibold">${escapeHtml(image.name || `Kep ${index + 1}`)}</div>
            <div class="small section-text">${sizeLabel}</div>
          </div>
          <label class="marketplace-upload-primary">
            <input
              class="form-check-input marketplace-upload-radio"
              type="radio"
              name="marketplaceCreateMainImage"
              value="${escapeHtml(image.clientId)}"
              data-marketplace-primary-image
              ${isPrimary ? "checked" : ""}
            />
            <span class="marketplace-upload-badge">${isPrimary ? "Fő kép" : "Legyen fő kép"}</span>
          </label>
          <button type="button" class="btn btn-sm btn-outline-danger marketplace-upload-remove" data-marketplace-remove-image="${escapeHtml(image.clientId)}">
            Törlés
          </button>
        </div>
      `;
    })
    .join("");
}

function resetMarketplaceCreateForm() {
  const { form, imageInput, modalTitle, modalSubtitle, submitButton } = ensureMarketplaceCreateModal();

  if (form) {
    form.reset();
  }

  if (imageInput) {
    imageInput.value = "";
  }

  marketplaceState.createMode = "create";
  marketplaceState.editingListingId = null;
  marketplaceState.createImageFiles = [];
  marketplaceState.createPrimaryImageId = null;

  if (modalTitle) {
    modalTitle.textContent = "Új hirdetés feladása";
  }

  if (modalSubtitle) {
    modalSubtitle.textContent = "Adj fel új hirdetést a piactérre.";
  }

  if (submitButton) {
    submitButton.textContent = "Hirdetés mentése";
  }

  renderMarketplaceCreateImageList();
  populateMarketplaceCreateCategories();
  setMarketplaceCreateFormError("");
}

async function handleMarketplaceCreateImagesChange(event) {
  const nextFiles = Array.from(event.target?.files || []);

  if (!nextFiles.length) {
    return;
  }

  const availableSlots = MAX_MARKETPLACE_IMAGES - marketplaceState.createImageFiles.length;

  if (availableSlots <= 0) {
    event.target.value = "";
    setMarketplaceCreateFormError(`Legfeljebb ${MAX_MARKETPLACE_IMAGES} képet tölthetsz fel.`);
    return;
  }

  const selectedFiles = nextFiles.slice(0, availableSlots);

  try {
    const convertedImages = [];

    for (const file of selectedFiles) {
      const imageDataUrl = await getImageDataUrlFromFile(file, file.name || "Kép");
      convertedImages.push(
        createMarketplaceDraftImage({
          dataUrl: imageDataUrl,
          name: file.name || "Kep",
          sizeBytes: Number(file.size) || 0,
        })
      );
    }

    marketplaceState.createImageFiles = [...marketplaceState.createImageFiles, ...convertedImages];
    ensureMarketplaceDraftPrimaryImage();
    setMarketplaceCreateFormError(
      nextFiles.length > selectedFiles.length
        ? `Legfeljebb ${MAX_MARKETPLACE_IMAGES} képet tölthetsz fel.`
        : ""
    );
  } catch (error) {
    setMarketplaceCreateFormError(error.message || "Nem sikerült feldolgozni a kiválasztott képeket.");
  } finally {
    if (event.target) {
      event.target.value = "";
    }
    renderMarketplaceCreateImageList();
  }
}

function fillMarketplaceCreateFormFromListing(listing) {
  const { titleInput, priceInput, cityInput, descriptionInput, modalTitle, modalSubtitle, submitButton } = ensureMarketplaceCreateModal();

  marketplaceState.createMode = "edit";
  marketplaceState.editingListingId = Number(listing.MarketplaceHirdetesId);
  marketplaceState.createImageFiles = (Array.isArray(listing.Kepek) ? listing.Kepek : []).map((image, index) =>
    createMarketplaceDraftImage({
      dataUrl: image.KepUrl,
      name: `Kep ${index + 1}`,
      existingImageId: image.MarketplaceHirdetesKepId,
    })
  );

  const primaryIndex = (Array.isArray(listing.Kepek) ? listing.Kepek : []).findIndex((image) => image.FoKep);
  marketplaceState.createPrimaryImageId =
    marketplaceState.createImageFiles[primaryIndex >= 0 ? primaryIndex : 0]?.clientId || null;

  populateMarketplaceCreateCategories(listing.MarketplaceKategoriaId);

  if (titleInput) {
    titleInput.value = listing.Cim || "";
  }
  if (priceInput) {
    priceInput.value = Number.isFinite(Number(listing.ArFt)) ? String(Number(listing.ArFt)) : "";
  }
  if (cityInput) {
    cityInput.value = listing.Telepules || "";
  }
  if (descriptionInput) {
    descriptionInput.value = listing.Leiras || "";
  }
  if (modalTitle) {
    modalTitle.textContent = "Hirdetés szerkesztése";
  }
  if (modalSubtitle) {
    modalSubtitle.textContent = "Módosítsd a meglévő hirdetés adatait.";
  }
  if (submitButton) {
    submitButton.textContent = "Hirdetés frissítése";
  }

  renderMarketplaceCreateImageList();
}

async function handleMarketplaceCreateSubmit(event) {
  event.preventDefault();

  const { categorySelect, titleInput, priceInput, cityInput, descriptionInput } = ensureMarketplaceCreateModal();
  const categoryId = Number.parseInt(categorySelect?.value || "", 10);
  const title = titleInput?.value.trim() || "";
  const description = descriptionInput?.value.trim() || "";
  const city = cityInput?.value.trim() || "";
  const price = Number.parseInt(priceInput?.value || "", 10);
  const orderedImages = getMarketplaceDraftImagesOrdered();

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    setMarketplaceCreateFormError("Válassz kategóriát a hirdetéshez.");
    return;
  }

  if (title.length < 3) {
    setMarketplaceCreateFormError("A hirdetés megnevezése legalább 3 karakter legyen.");
    return;
  }

  if (!Number.isInteger(price) || price < 0) {
    setMarketplaceCreateFormError("Adj meg érvényes árat.");
    return;
  }

  if (city.length < 2) {
    setMarketplaceCreateFormError("Add meg a település nevét.");
    return;
  }

  if (orderedImages.length > MAX_MARKETPLACE_IMAGES) {
    setMarketplaceCreateFormError(`Legfeljebb ${MAX_MARKETPLACE_IMAGES} képet tölthetsz fel.`);
    return;
  }

  const payload = {
    marketplaceKategoriaId: categoryId,
    cim: title,
    leiras: description,
    arFt: price,
    telepules: city,
    kepek: orderedImages.map((image, index) => ({
      kepUrl: image.dataUrl,
      foKep: index === 0,
      sorrend: index,
    })),
  };

  try {
    const isEditing = marketplaceState.createMode === "edit" && Number.isInteger(marketplaceState.editingListingId);
    const endpoint = isEditing
      ? `/marketplace/listings/${marketplaceState.editingListingId}`
      : "/marketplace/listings";
    const method = isEditing ? "PUT" : "POST";
    const response = await apiRequest(endpoint, {
      method,
      body: JSON.stringify(payload),
    });
    const listingId = isEditing ? marketplaceState.editingListingId : Number(response?.MarketplaceHirdetesId);

    if (listingId) {
      await showAppSuccess(
        isEditing ? "A hirdetés sikeresen frissítve." : "A hirdetés sikeresen létrehozva."
      );
      window.location.href = `marketplace-reszlet.html?id=${listingId}`;
      return;
    }
  } catch (error) {
    setMarketplaceCreateFormError(error.message || "Nem sikerült menteni a hirdetést.");
  }
}

function openMarketplaceCreateModal() {
  if (!isLoggedIn()) {
    showAppAlert("A hirdetésfeladáshoz be kell jelentkezned.", { title: "Bejelentkezés szükséges" });
    return;
  }

  window.location.href = "hirdetesfeladas.html";
}

function openMarketplaceEditModal() {
  if (!isLoggedIn()) {
    showAppAlert("A hirdetés szerkesztéséhez be kell jelentkezned.", { title: "Bejelentkezés szükséges" });
    return;
  }

  const listing = marketplaceState.activeListing;
  const currentUserId = getCurrentUserId();

  if (!listing || currentUserId !== Number(listing.FelhasznaloId)) {
    return;
  }

  window.location.href = `hirdetesfeladas.html?id=${Number(listing.MarketplaceHirdetesId)}`;
}

function formatMarketplacePrice(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("hu-HU")} Ft`;
}

function formatMarketplaceDate(value) {
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
}

function ensureMarketplaceDetailLightbox() {
  let lightboxElement = document.getElementById("marketplaceLightbox");

  if (!lightboxElement) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div id="marketplaceLightbox" class="marketplace-lightbox" aria-hidden="true">
        <div class="marketplace-lightbox-backdrop" data-marketplace-lightbox-close></div>
        <div class="marketplace-lightbox-dialog" role="dialog" aria-modal="true" aria-label="Marketplace képnézegető">
          <button type="button" class="marketplace-lightbox-close" data-marketplace-lightbox-close aria-label="Bezárás">×</button>
          <button type="button" class="marketplace-lightbox-control is-prev" data-marketplace-lightbox-prev aria-label="Előző kép">&lsaquo;</button>
          <div class="marketplace-lightbox-stage">
            <div id="marketplaceLightboxImage" class="marketplace-lightbox-image"></div>
          </div>
          <button type="button" class="marketplace-lightbox-control is-next" data-marketplace-lightbox-next aria-label="Következő kép">&rsaquo;</button>
          <div id="marketplaceLightboxThumbs" class="marketplace-lightbox-thumbs"></div>
        </div>
      </div>
    `;

    lightboxElement = wrapper.firstElementChild;
    document.body.appendChild(lightboxElement);
  }

  return {
    root: lightboxElement,
    image: lightboxElement.querySelector("#marketplaceLightboxImage"),
    thumbs: lightboxElement.querySelector("#marketplaceLightboxThumbs"),
    prevButton: lightboxElement.querySelector("[data-marketplace-lightbox-prev]"),
    nextButton: lightboxElement.querySelector("[data-marketplace-lightbox-next]"),
    closeButtons: Array.from(lightboxElement.querySelectorAll("[data-marketplace-lightbox-close]")),
  };
}

async function loadMarketplaceCategories() {
  marketplaceState.categories = await apiRequest("/marketplace/categories");
}

async function loadMarketplaceListings() {
  const listingsContainer = $("#marketplaceListings");
  const resultCount = $("#marketplaceResultsCount");
  const emptyState = $("#marketplaceEmptyState");
  const loadingState = $("#marketplaceListingsLoading");

  if (!listingsContainer) {
    return;
  }

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

  if (loadingState) {
    loadingState.classList.remove("d-none");
  }
  listingsContainer.classList.add("d-none");

  try {
    const listings = await apiRequest(endpoint);

    clearElement(listingsContainer);
    listingsContainer.classList.toggle("marketplace-listings-list-view", marketplaceState.viewMode === "list");

    listings.forEach((listing) => {
      const card = document.createElement("article");
      const isFrozen = Boolean(listing.Jegelve);
      card.className = `marketplace-listing-row${isFrozen ? " is-frozen" : ""}`;
      const frozenMetaHtml = isFrozen
        ? `
          <div class="marketplace-listing-frozen-meta">
            <span class="marketplace-listing-price is-frozen">${escapeHtml(formatMarketplacePrice(listing.ArFt))}</span>
            <span class="marketplace-listing-status">${escapeHtml("Jegelve")}</span>
          </div>
        `
        : "";
      const thumbHtml = listing.FoKepUrl
        ? `
          <img
            src="${escapeHtml(listing.FoKepUrl)}"
            alt="${escapeHtml(listing.Cim || "Marketplace hirdetés")}"
            class="marketplace-listing-thumb-image"
          />
        `
        : '<div class="marketplace-listing-thumb-placeholder">Hirdetés</div>';

      if (marketplaceState.viewMode === "list") {
        card.innerHTML = `
          <a class="marketplace-listing-link marketplace-listing-link-list" href="marketplace-reszlet.html?id=${Number(listing.MarketplaceHirdetesId)}" aria-label="${escapeHtml(listing.Cim || "Marketplace hirdetés")}">
            <div class="marketplace-listing-thumb">
              ${thumbHtml}
            </div>
            <div class="marketplace-listing-main marketplace-listing-main-list">
              <h2 class="marketplace-listing-title">${escapeHtml(listing.Cim || "")}</h2>
              ${frozenMetaHtml}
            </div>
          </a>
        `;
      } else {
        card.innerHTML = `
          <a class="marketplace-listing-link" href="marketplace-reszlet.html?id=${Number(listing.MarketplaceHirdetesId)}" aria-label="${escapeHtml(listing.Cim || "Marketplace hirdetés")}">
            <div class="marketplace-listing-thumb">
              ${thumbHtml}
            </div>
            <div class="marketplace-listing-main">
              <h2 class="marketplace-listing-title">${escapeHtml(listing.Cim || "")}</h2>
              ${frozenMetaHtml}
            </div>
          </a>
        `;
      }

      listingsContainer.appendChild(card);
    });

    if (resultCount) {
      resultCount.textContent = `${listings.length} találat`;
    }

    if (emptyState) {
      emptyState.classList.toggle("d-none", listings.length > 0);
    }
  } finally {
    if (loadingState) {
      loadingState.classList.add("d-none");
    }
    listingsContainer.classList.remove("d-none");
  }
}

function prepareMarketplacePage() {
  const searchForm = $("#marketplaceSearchForm");
  const searchInput = $("#marketplaceSearchInput");
  const sortSelect = $("#marketplaceSortSelect");
  const categoriesContainer = $("#marketplaceCategoryGrid");
  const createButton = $("#marketplaceCreateButton");
  const viewToggleButtons = Array.from($all(".marketplace-view-toggle-btn"));

  if (!categoriesContainer) {
    return;
  }

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

  const updateMarketplaceViewToggle = () => {
    viewToggleButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === marketplaceState.viewMode);
    });
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
    createButton.addEventListener("click", openMarketplaceCreateModal);
  }

  viewToggleButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const nextViewMode = button.dataset.view === "list" ? "list" : "grid";

      if (marketplaceState.viewMode === nextViewMode) {
        return;
      }

      marketplaceState.viewMode = nextViewMode;
      localStorage.setItem(MARKETPLACE_VIEW_MODE_KEY, nextViewMode);
      updateMarketplaceViewToggle();
      await loadMarketplaceListings();
    });
  });

  (async () => {
    try {
      marketplaceState.activeCategory = "all";
      marketplaceState.search = "";
      marketplaceState.sort = sortSelect?.value || "featured";
      marketplaceState.viewMode = localStorage.getItem(MARKETPLACE_VIEW_MODE_KEY) === "grid" ? "grid" : "list";

      if (searchInput) {
        searchInput.value = "";
      }

      updateMarketplaceViewToggle();
      await loadMarketplaceCategories();
      renderMarketplaceCategories();
      await loadMarketplaceListings();
    } catch (error) {
      console.error("Marketplace betöltési hiba:", error);
      const resultCount = $("#marketplaceResultsCount");
      const emptyState = $("#marketplaceEmptyState");
      const listingsContainer = $("#marketplaceListings");
      const loadingState = $("#marketplaceListingsLoading");
      if (loadingState) {
        loadingState.classList.add("d-none");
      }
      if (listingsContainer) {
        listingsContainer.classList.remove("d-none");
      }
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

async function prepareMarketplaceCreatePage() {
  const backButton = $("#marketplaceCreateBackButton");
  const pageTitle = $("#marketplaceCreatePageTitle");
  const pageSubtitle = $("#marketplaceCreatePageSubtitle");

  if (!document.getElementById("marketplaceCreatePage")) {
    return;
  }

  if (!isLoggedIn()) {
    showAppAlert("A hirdetésfeladáshoz be kell jelentkezned.", { title: "Bejelentkezés szükséges" });
    window.location.href = "login.html";
    return;
  }

  if (backButton && backButton.dataset.bound !== "true") {
    backButton.addEventListener("click", () => {
      const listingId = getMarketplaceListingId();
      window.location.href = listingId ? `marketplace-reszlet.html?id=${listingId}` : "marketplace.html";
    });
    backButton.dataset.bound = "true";
  }

  resetMarketplaceCreateForm();
  ensureMarketplaceCreateModal();

  try {
    await loadMarketplaceCategories();
    populateMarketplaceCreateCategories();

    const listingId = getMarketplaceListingId();

    if (listingId) {
      const listing = await apiRequest(`/marketplace/listings/${listingId}`);
      const currentUserId = getCurrentUserId();

      if (currentUserId !== Number(listing.FelhasznaloId)) {
        showAppAlert("Csak a saját hirdetésedet szerkesztheted.", { title: "Nincs jogosultság" });
        window.location.href = `marketplace-reszlet.html?id=${listingId}`;
        return;
      }

      marketplaceState.activeListing = listing;
      fillMarketplaceCreateFormFromListing(listing);

      if (pageTitle) {
        pageTitle.textContent = "Hirdetés szerkesztése";
      }
      if (pageSubtitle) {
        pageSubtitle.textContent = "Módosítsd a meglévő hirdetés adatait.";
      }
      document.title = "HalTérkép - Hirdetés szerkesztése";
    } else {
      if (pageTitle) {
        pageTitle.textContent = "Új hirdetés feladása";
      }
      if (pageSubtitle) {
        pageSubtitle.textContent = "Adj fel új hirdetést a piactérre.";
      }
      document.title = "HalTérkép - Hirdetésfeladás";
    }

    renderMarketplaceCreateImageList();
  } catch (error) {
    setMarketplaceCreateFormError(error.message || "Nem sikerült betölteni a hirdetés szerkesztő oldalt.");
  }
}

function ensureMarketplaceMessageModal() {
  let modalElement = document.getElementById("marketplaceMessageModal");

  if (!modalElement) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="modal fade" id="marketplaceMessageModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content app-card border-info-subtle">
            <div class="modal-header border-secondary-subtle">
              <h2 class="modal-title fs-5">Üzenet a hirdetőnek</h2>
              <button type="button" class="btn-close admin-modal-close" data-bs-dismiss="modal" aria-label="Bezárás"></button>
            </div>
            <form id="marketplaceMessageForm">
              <div class="modal-body">
                <p id="marketplaceMessageListingTitle" class="section-text mb-3"></p>
                <label class="form-label" for="marketplaceMessageText">Üzenet</label>
                <textarea id="marketplaceMessageText" class="form-control app-input" rows="5" maxlength="2000" required></textarea>
                <div id="marketplaceMessageError" class="text-danger small mt-3 d-none"></div>
              </div>
              <div class="modal-footer border-secondary-subtle">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Mégse</button>
                <button type="submit" class="btn marketplace-create-button">Küldés</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    modalElement = wrapper.firstElementChild;
    document.body.appendChild(modalElement);
  }

  const form = modalElement.querySelector("#marketplaceMessageForm");

  if (form && form.dataset.bound !== "true") {
    form.addEventListener("submit", handleMarketplaceMessageSubmit);
    form.dataset.bound = "true";
  }

  return {
    modalElement,
    titleElement: modalElement.querySelector("#marketplaceMessageListingTitle"),
    textArea: modalElement.querySelector("#marketplaceMessageText"),
    errorElement: modalElement.querySelector("#marketplaceMessageError"),
  };
}

function setMarketplaceMessageError(message = "") {
  const { errorElement } = ensureMarketplaceMessageModal();

  if (!errorElement) {
    return;
  }

  errorElement.textContent = message;
  errorElement.classList.toggle("d-none", !message);
}

function openMarketplaceMessageModal() {
  if (!isLoggedIn()) {
    showAppAlert("Az üzenetküldéshez be kell jelentkezned.", { title: "Bejelentkezés szükséges" });
    return;
  }

  const listing = marketplaceState.activeListing;

  if (!listing) {
    return;
  }

  const currentUserId = getCurrentUserId();
  if (currentUserId && currentUserId === Number(listing.FelhasznaloId)) {
    showAppAlert("A saját hirdetésedre nem küldhetsz üzenetet.", { title: "Nem elérhető" });
    return;
  }

  const { titleElement, textArea } = ensureMarketplaceMessageModal();

  if (titleElement) {
    titleElement.textContent = `Hirdetés: ${listing.Cim || "-"}`;
  }

  if (textArea) {
    textArea.value = "";
  }

  setMarketplaceMessageError("");
  createModalInstance("marketplaceMessageModal")?.show();
}

async function handleMarketplaceMessageSubmit(event) {
  event.preventDefault();

  const listing = marketplaceState.activeListing;
  const { textArea } = ensureMarketplaceMessageModal();
  const message = textArea?.value.trim() || "";

  if (!listing?.MarketplaceHirdetesId) {
    return;
  }

  if (message.length < 3) {
    setMarketplaceMessageError("Az üzenet legalább 3 karakter legyen.");
    return;
  }

  try {
    await apiRequest(`/marketplace/listings/${Number(listing.MarketplaceHirdetesId)}/messages`, {
      method: "POST",
      body: JSON.stringify({
        uzenet: message,
      }),
    });

    createModalInstance("marketplaceMessageModal")?.hide();
    await showAppSuccess("Az üzenet sikeresen elküldve.");
  } catch (error) {
    setMarketplaceMessageError(error.message || "Nem sikerült elküldeni az üzenetet.");
  }
}

function ensureMarketplaceReportModal() {
  let modalElement = document.getElementById("marketplaceReportModal");

  if (!modalElement) {
    const wrapper = document.createElement("div");
    const reasonOptions = Object.entries(FORUM_REPORT_REASON_LABELS)
      .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
      .join("");

    wrapper.innerHTML = `
      <div class="modal fade" id="marketplaceReportModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content app-card border-danger-subtle">
            <div class="modal-header border-secondary-subtle">
              <h2 class="modal-title fs-5">Hirdetés reportolása</h2>
              <button type="button" class="btn-close admin-modal-close" data-bs-dismiss="modal" aria-label="Bezárás"></button>
            </div>
            <form id="marketplaceReportForm">
              <div class="modal-body">
                <p id="marketplaceReportListingTitle" class="section-text mb-3"></p>
                <label class="form-label" for="marketplaceReportReason">Indok</label>
                <select id="marketplaceReportReason" class="form-select app-input" required>
                  <option value="">Válassz indokot</option>
                  ${reasonOptions}
                </select>
                <div id="marketplaceReportDetailsGroup" class="mt-3 d-none">
                  <label class="form-label" for="marketplaceReportDetails">Részletezés</label>
                  <textarea id="marketplaceReportDetails" class="form-control app-input" rows="4" maxlength="1000"></textarea>
                </div>
                <div id="marketplaceReportError" class="text-danger small mt-3 d-none"></div>
              </div>
              <div class="modal-footer border-secondary-subtle">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Mégse</button>
                <button type="submit" class="btn btn-danger">Report küldése</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    modalElement = wrapper.firstElementChild;
    document.body.appendChild(modalElement);
  }

  const form = modalElement.querySelector("#marketplaceReportForm");
  const reasonSelect = modalElement.querySelector("#marketplaceReportReason");

  if (form && form.dataset.bound !== "true") {
    form.addEventListener("submit", handleMarketplaceReportSubmit);
    form.dataset.bound = "true";
  }

  if (reasonSelect && reasonSelect.dataset.bound !== "true") {
    reasonSelect.addEventListener("change", toggleMarketplaceReportDetailsVisibility);
    reasonSelect.dataset.bound = "true";
  }

  return {
    modalElement,
    titleElement: modalElement.querySelector("#marketplaceReportListingTitle"),
    reasonSelect,
    detailsGroup: modalElement.querySelector("#marketplaceReportDetailsGroup"),
    detailsInput: modalElement.querySelector("#marketplaceReportDetails"),
    errorElement: modalElement.querySelector("#marketplaceReportError"),
  };
}

function setMarketplaceReportError(message = "") {
  const { errorElement } = ensureMarketplaceReportModal();

  if (!errorElement) {
    return;
  }

  errorElement.textContent = message;
  errorElement.classList.toggle("d-none", !message);
}

function toggleMarketplaceReportDetailsVisibility() {
  const { reasonSelect, detailsGroup, detailsInput } = ensureMarketplaceReportModal();

  if (!reasonSelect || !detailsGroup || !detailsInput) {
    return;
  }

  const hasReason = Boolean(reasonSelect.value);
  detailsGroup.classList.toggle("d-none", !hasReason);
  detailsInput.required = reasonSelect.value === "other";
}

function openMarketplaceReportModal() {
  if (!isLoggedIn()) {
    showAppAlert("A report küldéséhez be kell jelentkezned.", { title: "Bejelentkezés szükséges" });
    return;
  }

  const listing = marketplaceState.activeListing;

  if (!listing) {
    return;
  }

  const currentUserId = getCurrentUserId();
  if (currentUserId && currentUserId === Number(listing.FelhasznaloId)) {
    showAppAlert("A saját hirdetésedet nem reportolhatod.", { title: "Nem elérhető" });
    return;
  }

  const { titleElement, reasonSelect, detailsInput, detailsGroup } = ensureMarketplaceReportModal();

  if (titleElement) {
    titleElement.textContent = `Hirdetés: ${listing.Cim || "-"}`;
  }

  if (reasonSelect) {
    reasonSelect.value = "";
  }

  if (detailsInput) {
    detailsInput.value = "";
    detailsInput.required = false;
  }

  if (detailsGroup) {
    detailsGroup.classList.add("d-none");
  }

  setMarketplaceReportError("");
  createModalInstance("marketplaceReportModal")?.show();
}

async function handleMarketplaceReportSubmit(event) {
  event.preventDefault();

  const listing = marketplaceState.activeListing;
  const { reasonSelect, detailsInput } = ensureMarketplaceReportModal();
  const reasonCode = reasonSelect?.value || "";
  const details = detailsInput?.value.trim() || "";

  if (!listing?.MarketplaceHirdetesId) {
    return;
  }

  if (!reasonCode) {
    setMarketplaceReportError("Válassz report indokot.");
    return;
  }

  if (reasonCode === "other" && details.length < 3) {
    setMarketplaceReportError("Az Egyéb indoknál add meg a részletezést is.");
    return;
  }

  try {
    await apiRequest(`/marketplace/listings/${Number(listing.MarketplaceHirdetesId)}/report`, {
      method: "POST",
      body: JSON.stringify({
        reasonCode,
        details,
      }),
    });

    createModalInstance("marketplaceReportModal")?.hide();
    await showAppSuccess("A report sikeresen elküldve.");
  } catch (error) {
    setMarketplaceReportError(error.message || "Nem sikerült elküldeni a reportot.");
  }
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
  const reportButton = $("#marketplaceDetailReportButton");
  const actionsElement = content.querySelector(".marketplace-detail-actions");

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
    marketplaceState.activeListing = listing;
    const images = Array.isArray(listing.Kepek) ? listing.Kepek : [];
    let currentImageIndex = images.findIndex((image) => image.FoKep);
    let lightboxImageIndex = currentImageIndex;

    if (currentImageIndex < 0) {
      currentImageIndex = images.length ? 0 : -1;
    }

    const titleWrapper = titleElement?.parentElement || null;
    let statusElement = document.getElementById("marketplaceDetailStatus");
    if (!statusElement && titleWrapper) {
      statusElement = document.createElement("div");
      statusElement.id = "marketplaceDetailStatus";
      statusElement.className = "marketplace-detail-status d-none";
      titleWrapper.insertBefore(statusElement, titleElement);
    }

    let manageWrapper = document.getElementById("marketplaceDetailManageWrapper");
    let manageButton = document.getElementById("marketplaceDetailManageButton");
    let manageMenu = document.getElementById("marketplaceDetailManageMenu");
    let editButton = document.getElementById("marketplaceDetailEditButton");
    let freezeButton = document.getElementById("marketplaceDetailFreezeButton");
    let deleteButton = document.getElementById("marketplaceDetailDeleteButton");

    if (!manageWrapper && actionsElement) {
      manageWrapper = document.createElement("div");
      manageWrapper.id = "marketplaceDetailManageWrapper";
      manageWrapper.className = "marketplace-detail-manage-wrapper d-none";
      manageWrapper.innerHTML = `
        <button id="marketplaceDetailManageButton" type="button" class="btn marketplace-detail-manage-button">
          + Hirdetés kezelése
        </button>
        <div id="marketplaceDetailManageMenu" class="marketplace-detail-manage-menu">
          <button id="marketplaceDetailEditButton" type="button" class="marketplace-detail-manage-item">Hirdetés szerkesztése</button>
          <button id="marketplaceDetailFreezeButton" type="button" class="marketplace-detail-manage-item">Hirdetés jegelése</button>
          <button id="marketplaceDetailDeleteButton" type="button" class="marketplace-detail-manage-item is-danger d-none">Hirdetés törlése</button>
        </div>
      `;
      actionsElement.appendChild(manageWrapper);
      manageButton = manageWrapper.querySelector("#marketplaceDetailManageButton");
      manageMenu = manageWrapper.querySelector("#marketplaceDetailManageMenu");
      editButton = manageWrapper.querySelector("#marketplaceDetailEditButton");
      freezeButton = manageWrapper.querySelector("#marketplaceDetailFreezeButton");
      deleteButton = manageWrapper.querySelector("#marketplaceDetailDeleteButton");
    } else if (manageWrapper) {
      manageButton = manageWrapper.querySelector("#marketplaceDetailManageButton");
      manageMenu = manageWrapper.querySelector("#marketplaceDetailManageMenu");
      editButton = manageWrapper.querySelector("#marketplaceDetailEditButton");
      freezeButton = manageWrapper.querySelector("#marketplaceDetailFreezeButton");
      deleteButton = manageWrapper.querySelector("#marketplaceDetailDeleteButton");
    }

    const lightbox = ensureMarketplaceDetailLightbox();
    const renderLightbox = () => {
      if (!lightbox.image || !lightbox.thumbs) {
        return;
      }

      if (lightboxImageIndex >= 0 && images[lightboxImageIndex]?.KepUrl) {
        lightbox.image.innerHTML = `
          <img
            src="${escapeHtml(images[lightboxImageIndex].KepUrl)}"
            alt="${escapeHtml(listing.Cim || "Marketplace hirdetés")}"
            class="marketplace-lightbox-image-tag"
          />
        `;
      } else {
        lightbox.image.innerHTML = '<div class="marketplace-lightbox-placeholder">Hirdetés</div>';
      }

      if (images.length <= 1) {
        clearElement(lightbox.thumbs);
        lightbox.thumbs.classList.add("d-none");
      } else {
        lightbox.thumbs.classList.remove("d-none");
        lightbox.thumbs.innerHTML = images
          .map((image, index) => `
            <button
              type="button"
              class="marketplace-lightbox-thumb${index === lightboxImageIndex ? " is-active" : ""}"
              data-marketplace-lightbox-index="${index}"
              aria-label="Kép ${index + 1}"
            >
              <img src="${escapeHtml(image.KepUrl)}" alt="${escapeHtml(listing.Cim || "Marketplace kép")}" />
            </button>
          `)
          .join("");
      }

      const hasMultipleImages = images.length > 1;
      if (lightbox.prevButton) {
        lightbox.prevButton.disabled = !hasMultipleImages;
      }
      if (lightbox.nextButton) {
        lightbox.nextButton.disabled = !hasMultipleImages;
      }
    };

    const openLightbox = () => {
      lightboxImageIndex = currentImageIndex >= 0 ? currentImageIndex : 0;
      renderLightbox();
      lightbox.root.classList.add("is-open");
      lightbox.root.setAttribute("aria-hidden", "false");
      document.body.classList.add("marketplace-lightbox-open");
    };

    const closeLightbox = () => {
      lightbox.root.classList.remove("is-open");
      lightbox.root.setAttribute("aria-hidden", "true");
      document.body.classList.remove("marketplace-lightbox-open");
    };

    const stepGalleryImage = (direction) => {
      if (images.length <= 1) {
        return;
      }

      currentImageIndex = (currentImageIndex + direction + images.length) % images.length;
      renderMainImage();
      renderGallery();
    };

    const stepLightboxImage = (direction) => {
      if (images.length <= 1) {
        return;
      }

      lightboxImageIndex = (lightboxImageIndex + direction + images.length) % images.length;
      renderLightbox();
    };

    const renderMainImage = () => {
      if (!heroImageContainer) {
        return;
      }

      if (currentImageIndex >= 0 && images[currentImageIndex]?.KepUrl) {
        heroImageContainer.innerHTML = `
          <div class="marketplace-detail-stage">
            <button
              type="button"
              class="marketplace-detail-stage-control is-prev${images.length > 1 ? "" : " d-none"}"
              data-marketplace-stage-prev
              aria-label="Előző kép"
            >&lsaquo;</button>
            <div class="marketplace-detail-image-canvas">
              <img
                src="${escapeHtml(images[currentImageIndex].KepUrl)}"
                alt="${escapeHtml(listing.Cim || "Marketplace hirdetés")}"
                class="marketplace-detail-image-tag"
              />
            </div>
            <button
              type="button"
              class="marketplace-detail-stage-control is-next${images.length > 1 ? "" : " d-none"}"
              data-marketplace-stage-next
              aria-label="Következő kép"
            >&rsaquo;</button>
            <button
              type="button"
              class="marketplace-detail-stage-expand"
              data-marketplace-stage-expand
              aria-label="Kép nagyítása"
            >+</button>
          </div>
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

    const isFrozen = Boolean(listing.Jegelve);
    const statusLabels = [];

    if (isFrozen) {
      statusLabels.push("Jegelve");
    }

    if (titleElement) {
      titleElement.textContent = `${statusLabels.length ? `${statusLabels.join(" • ")} - ` : ""}${listing.Cim || "Marketplace hirdetés"}`;
      titleElement.classList.toggle("is-frozen", isFrozen);
    }
    if (statusElement) {
      statusElement.textContent = statusLabels.join(" • ");
      statusElement.classList.toggle("d-none", !statusLabels.length);
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
      priceElement.classList.toggle("is-frozen", isFrozen);
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

    if (heroImageContainer && heroImageContainer.dataset.bound !== "true") {
      heroImageContainer.addEventListener("click", (event) => {
        if (event.target.closest("[data-marketplace-stage-prev]")) {
          stepGalleryImage(-1);
          return;
        }

        if (event.target.closest("[data-marketplace-stage-next]")) {
          stepGalleryImage(1);
          return;
        }

        if (event.target.closest("[data-marketplace-stage-expand]")) {
          openLightbox();
        }
      });
      heroImageContainer.dataset.bound = "true";
    }

    if (lightbox.root.dataset.bound !== "true") {
      lightbox.closeButtons.forEach((button) => {
        button.addEventListener("click", closeLightbox);
      });

      lightbox.prevButton?.addEventListener("click", () => {
        stepLightboxImage(-1);
      });

      lightbox.nextButton?.addEventListener("click", () => {
        stepLightboxImage(1);
      });

      lightbox.thumbs?.addEventListener("click", (event) => {
        const thumbButton = event.target.closest("[data-marketplace-lightbox-index]");

        if (!thumbButton) {
          return;
        }

        lightboxImageIndex = Number(thumbButton.dataset.marketplaceLightboxIndex);
        renderLightbox();
      });

      document.addEventListener("keydown", (event) => {
        if (!lightbox.root.classList.contains("is-open")) {
          return;
        }

        if (event.key === "Escape") {
          closeLightbox();
        } else if (event.key === "ArrowLeft") {
          stepLightboxImage(-1);
        } else if (event.key === "ArrowRight") {
          stepLightboxImage(1);
        }
      });

      lightbox.root.dataset.bound = "true";
    }

    const currentUserId = getCurrentUserId();
    const isOwnListing = currentUserId && currentUserId === Number(listing.FelhasznaloId);

    if (contactButton) {
      contactButton.replaceWith(contactButton.cloneNode(true));
    }

    if (reportButton) {
      reportButton.replaceWith(reportButton.cloneNode(true));
    }

    const reboundContactButton = $("#marketplaceDetailContactButton");
    const reboundReportButton = $("#marketplaceDetailReportButton");

    if (reboundContactButton) {
      reboundContactButton.disabled = Boolean(isOwnListing);

      if (isOwnListing) {
        reboundContactButton.textContent = "Ez a te hirdetésed";
      } else {
        reboundContactButton.textContent = "Üzenet a hirdetőnek";
        reboundContactButton.addEventListener("click", openMarketplaceMessageModal);
      }
    }

    if (reboundReportButton) {
      if (isOwnListing) {
        reboundReportButton.classList.add("d-none");
      } else {
        reboundReportButton.classList.remove("d-none");
        reboundReportButton.addEventListener("click", openMarketplaceReportModal);
      }
    }

    if (manageWrapper && manageButton && manageMenu && editButton && freezeButton && deleteButton) {
      if (isOwnListing) {
        manageWrapper.classList.remove("d-none");
        freezeButton.textContent = listing.Jegelve
          ? "Hirdetés jegelésének megszüntetése"
          : "Hirdetés jegelése";
        deleteButton.classList.toggle("d-none", !listing.Jegelve);

        manageButton.addEventListener("click", () => {
          manageMenu.classList.toggle("is-open");
        });

        document.addEventListener("click", (event) => {
          if (!manageWrapper.contains(event.target)) {
            manageMenu.classList.remove("is-open");
          }
        });

        editButton.addEventListener("click", () => {
          manageMenu.classList.remove("is-open");
          openMarketplaceEditModal();
        });

        freezeButton.addEventListener("click", async () => {
          manageMenu.classList.remove("is-open");

          try {
            await apiRequest(`/marketplace/listings/${Number(listing.MarketplaceHirdetesId)}/freeze`, {
              method: "PATCH",
              body: JSON.stringify({
                frozen: !listing.Jegelve,
              }),
            });

            window.location.reload();
          } catch (error) {
            showAppAlert(error.message || "Nem sikerült módosítani a hirdetés állapotát.");
          }
        });

        deleteButton.addEventListener("click", async () => {
          manageMenu.classList.remove("is-open");

          const confirmed = window.confirm("Biztosan törölni szeretnéd ezt a hirdetést?");
          if (!confirmed) {
            return;
          }

          try {
            await apiRequest(`/marketplace/listings/${Number(listing.MarketplaceHirdetesId)}`, {
              method: "DELETE",
            });

            window.location.href = "marketplace.html";
          } catch (error) {
            showAppAlert(error.message || "Nem sikerült törölni a hirdetést.");
          }
        });
      } else {
        manageWrapper.classList.add("d-none");
        manageMenu.classList.remove("is-open");
      }
    }

    ensureMarketplaceMessageModal();
    ensureMarketplaceReportModal();

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
  activeReportSource: "forum",
};

const marketplaceAdminState = {
  listings: [],
  activeListingId: null,
  activeListingDetail: null,
  activeImageIndex: 0,
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
      "Felhasználói fórum reportok, ügyfélszolgálati levelezések és admin közlemények kezelése."
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
    const isMarketplaceReport = report.Source === "marketplace";
    const reportId = Number(isMarketplaceReport ? report.MarketplaceReportId : report.ForumReportId);
    const typeLabel = isMarketplaceReport
      ? "Marketplace report"
      : report.CelTipus === "reply"
        ? "Hozzaszolas report"
        : "Tema report";
    const title = isMarketplaceReport ? report.HirdetesCim : report.TemaCim;
    const item = document.createElement("div");
    item.className = `app-list-item admin-report-item${report.AdminOlvasva ? "" : " is-unread"}`;
    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div>
          <div class="fw-semibold">${escapeHtml(report.ReportoloFelhasznalonev)}</div>
          <div class="small section-text mb-2">
            ${escapeHtml(formatDateTime(report.Letrehozva))} | ${escapeHtml(typeLabel)}
          </div>
          <div class="admin-forum-item-title">${escapeHtml(title || "-")}</div>
          <div class="small section-text mt-1">${escapeHtml(formatForumReportReason(report.IndokKod))}</div>
        </div>
        <div class="admin-forum-actions">
          <button class="btn btn-sm btn-outline-info" type="button" onclick="openAdminReportModal('${isMarketplaceReport ? "marketplace" : "forum"}', ${reportId})">Megnyitás</button>
          <button class="btn btn-sm btn-outline-danger" type="button" onclick="deleteAdminReport('${isMarketplaceReport ? "marketplace" : "forum"}', ${reportId})">Törlés</button>
        </div>
      </div>
    `;
    reportsList.appendChild(item);
  });
}

async function loadAdminReports() {
  try {
    const [forumReports, marketplaceReports] = await Promise.all([
      apiRequest("/reports/admin"),
      apiRequest("/marketplace/reports/admin"),
    ]);
    adminState.reports = [
      ...(Array.isArray(forumReports) ? forumReports : []).map((report) => ({
        ...report,
        Source: "forum",
      })),
      ...(Array.isArray(marketplaceReports) ? marketplaceReports : []).map((report) => ({
        ...report,
        Source: "marketplace",
      })),
    ].sort((left, right) => {
      if (Boolean(left.AdminOlvasva) !== Boolean(right.AdminOlvasva)) {
        return left.AdminOlvasva ? 1 : -1;
      }

      return new Date(right.Letrehozva || 0).getTime() - new Date(left.Letrehozva || 0).getTime();
    });
    renderAdminReports();
    await openPendingAdminReportFromSession();
  } catch (error) {
    showAdminFeedback(error.message || "Nem sikerult betolteni a reportokat.", "danger");
  }
}

async function openPendingAdminReportFromSession() {
  const rawReportId = sessionStorage.getItem("adminOpenReportId");
  const reportSource = sessionStorage.getItem("adminOpenReportSource") || "forum";

  if (!rawReportId) {
    return;
  }

  sessionStorage.removeItem("adminOpenReportId");
  sessionStorage.removeItem("adminOpenReportSource");
  const reportId = Number.parseInt(rawReportId, 10);

  if (!Number.isInteger(reportId) || reportId <= 0) {
    return;
  }

  await openAdminReportModal(reportSource, reportId);
}

async function openAdminReportModal(reportSource, reportId) {
  const detailBody = $("#adminReportDetailBody");
  const replyText = $("#adminReportReplyText");
  const jumpButton = $("#adminReportJumpButton");

  if (!detailBody || !replyText || !jumpButton) {
    return;
  }

  try {
    const endpoint =
      reportSource === "marketplace"
        ? `/marketplace/reports/admin/${reportId}`
        : `/reports/admin/${reportId}`;
    const report = await apiRequest(endpoint);
    adminState.activeReportId = reportId;
    adminState.activeReportSource = reportSource;

    const reportTitle =
      reportSource === "marketplace"
        ? "Marketplace hirdetés"
        : report.CelTipus === "reply"
          ? "Hozzaszolas"
          : "Tema";
    const targetTitle = reportSource === "marketplace" ? report.HirdetesCim : report.TemaCim;
    const relatedUserLabel =
      reportSource === "marketplace"
        ? `Hirdeto: ${escapeHtml(report.HirdetoFelhasznalonev || "-")}`
        : report.CelFelhasznalonev
          ? `Erintett felhasznalo: ${escapeHtml(report.CelFelhasznalonev)}`
          : "";
    const contentPreview =
      reportSource === "marketplace"
        ? ""
        : report.CelSzoveg
          ? `<div class="mt-3">${escapeHtml(report.CelSzoveg)}</div>`
          : "";

    detailBody.innerHTML = `
      <div class="app-list-item">
        <div class="fw-semibold mb-2">Reportolo felhasznalo</div>
        <div>${escapeHtml(report.ReportoloFelhasznalonev || "-")}</div>
      </div>
      <div class="app-list-item">
        <div class="fw-semibold mb-2">Jelentett tartalom</div>
        <div class="mb-2">${escapeHtml(reportTitle)}</div>
        <div class="fw-semibold">${escapeHtml(targetTitle || "-")}</div>
        ${relatedUserLabel ? `<div class="small section-text mt-1">${relatedUserLabel}</div>` : ""}
        ${contentPreview}
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
  const reportSource = adminState.activeReportSource || "forum";
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
    const endpoint =
      reportSource === "marketplace"
        ? `/marketplace/reports/admin/${reportId}/reply`
        : `/reports/admin/${reportId}/reply`;

    await apiRequest(endpoint, {
      method: "POST",
      body: JSON.stringify({ adminReply }),
    });

    adminState.activeReportId = null;
    adminState.activeReportSource = "forum";
    if (reportModal) {
      reportModal.hide();
    }
    await loadAdminReports();
    await showAppSuccess("Az admin valasz sikeresen elkuldve.");
  } catch (error) {
    showAdminFeedback(error.message || "Nem sikerult elkuldeni a valaszt.", "danger");
  }
}

async function deleteAdminReport(reportSource, reportId) {
  if (!(await showAppConfirm("Biztosan torolni szeretned ezt a reportot?", { confirmLabel: "Torles" }))) {
    return;
  }

  try {
    const endpoint =
      reportSource === "marketplace"
        ? `/marketplace/reports/admin/${reportId}`
        : `/reports/admin/${reportId}`;

    await apiRequest(endpoint, { method: "DELETE" });
    if (adminState.activeReportId === reportId) {
      adminState.activeReportId = null;
      adminState.activeReportSource = "forum";
      createModalInstance("adminReportDetailModal")?.hide();
    }
    await loadAdminReports();
    await showAppSuccess("A report sikeresen torolve.");
  } catch (error) {
    showAdminFeedback(error.message || "Nem sikerult torolni a reportot.", "danger");
  }
}

function showMarketplaceAdminFeedback(message, type = "success") {
  const feedback = $("#marketplaceAdminFeedback");
  if (!feedback) {
    return;
  }

  feedback.className = `alert alert-${type}`;
  feedback.textContent = message;
}

function hideMarketplaceAdminFeedback() {
  const feedback = $("#marketplaceAdminFeedback");
  if (!feedback) {
    return;
  }

  feedback.className = "alert d-none";
  feedback.textContent = "";
}

function setMarketplaceAdminActiveImage(nextIndex) {
  const images = Array.isArray(marketplaceAdminState.activeListingDetail?.Kepek)
    ? marketplaceAdminState.activeListingDetail.Kepek
    : [];

  if (!images.length) {
    marketplaceAdminState.activeImageIndex = 0;
    return;
  }

  const normalizedIndex = Number(nextIndex);
  marketplaceAdminState.activeImageIndex =
    Number.isInteger(normalizedIndex) && normalizedIndex >= 0 && normalizedIndex < images.length
      ? normalizedIndex
      : 0;

  renderMarketplaceAdminListingDetail(marketplaceAdminState.activeListingDetail);
}

function renderMarketplaceAdminListingDetail(listing) {
  const detailBody = $("#adminMarketplaceDetailBody");
  const detailEmpty = $("#adminMarketplaceDetailEmpty");
  const detailCard = $("#adminMarketplaceDetailCard");

  if (!detailBody || !detailEmpty || !detailCard) {
    return;
  }

  if (!listing) {
    clearElement(detailBody);
    detailCard.classList.add("d-none");
    detailEmpty.classList.remove("d-none");
    return;
  }

  marketplaceAdminState.activeListingDetail = listing;
  const images = Array.isArray(listing.Kepek) ? listing.Kepek : [];
  const currentIndex =
    Number.isInteger(marketplaceAdminState.activeImageIndex) && marketplaceAdminState.activeImageIndex >= 0
      ? Math.min(marketplaceAdminState.activeImageIndex, Math.max(images.length - 1, 0))
      : 0;
  marketplaceAdminState.activeImageIndex = currentIndex;
  const activeImage = images[currentIndex] || null;
  const listingId = Number(listing.MarketplaceHirdetesId);
  const freezeLabel = listing.Jegelve ? "Jegelés feloldása" : "Jegelés";

  detailEmpty.classList.add("d-none");
  detailCard.classList.remove("d-none");
  detailBody.innerHTML = `
    <div class="d-grid gap-3">
      <div class="app-list-item">
        <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
          <div>
            <div class="small section-text mb-2">${escapeHtml(listing.KategoriaNev || "-")} | ${escapeHtml(formatMarketplaceDate(listing.Letrehozva))}</div>
            <div class="h5 mb-2 ${listing.Jegelve ? "marketplace-admin-frozen-title" : ""}">
              ${escapeHtml(listing.Cim || "-")}
            </div>
            <div class="section-text">
              Eladó: ${escapeHtml(listing.Felhasznalonev || "-")} | Település: ${escapeHtml(listing.Telepules || "-")}
            </div>
            <div class="small section-text mt-2">
              Állapot:
              ${listing.Jegelve
                ? '<span class="marketplace-admin-status-badge is-frozen">Jegelve</span>'
                : '<span class="marketplace-admin-status-badge">Aktív</span>'}
            </div>
          </div>
          <div class="text-end">
            <div class="fw-semibold ${listing.Jegelve ? "marketplace-admin-frozen-price" : ""}">
              ${escapeHtml(formatMarketplacePrice(listing.ArFt))}
            </div>
            <div class="small section-text mt-1">
              ${listing.AktivReportDb ? `${escapeHtml(String(listing.AktivReportDb))} aktív report` : "Nincs aktív report"}
            </div>
          </div>
        </div>
      </div>
      <div class="app-list-item">
        ${
          activeImage?.KepUrl
            ? `
              <img src="${escapeHtml(activeImage.KepUrl)}" alt="${escapeHtml(listing.Cim || "Marketplace hirdetés")}" class="img-fluid rounded-4 marketplace-admin-detail-image" />
            `
            : '<div class="marketplace-admin-detail-placeholder">Nincs feltöltött kép</div>'
        }
        ${
          images.length > 1
            ? `
              <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap mt-3">
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="setMarketplaceAdminActiveImage(${Math.max(currentIndex - 1, 0)})" ${currentIndex === 0 ? "disabled" : ""}>Előző</button>
                <div class="small section-text">Kép ${currentIndex + 1} / ${images.length}</div>
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="setMarketplaceAdminActiveImage(${Math.min(currentIndex + 1, images.length - 1)})" ${currentIndex >= images.length - 1 ? "disabled" : ""}>Következő</button>
              </div>
              <div class="d-flex gap-2 flex-wrap mt-3">
                ${images
                  .map(
                    (image, index) => `
                      <button
                        type="button"
                        class="btn btn-sm ${index === currentIndex ? "btn-primary" : "btn-outline-secondary"}"
                        onclick="setMarketplaceAdminActiveImage(${index})"
                      >
                        ${index + 1}
                      </button>
                    `
                  )
                  .join("")}
              </div>
            `
            : ""
        }
      </div>
      <div class="app-list-item">
        <div class="fw-semibold mb-2">Leírás</div>
        <div>${escapeHtml(listing.Leiras || "Nincs leírás.")}</div>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <button type="button" class="btn btn-outline-info" onclick="window.open('marketplace-reszlet.html?id=${listingId}', '_blank')">Megnyitás</button>
        <button type="button" class="btn btn-outline-primary" onclick="toggleMarketplaceAdminListingFrozen(${listingId}, ${listing.Jegelve ? "false" : "true"})">${freezeLabel}</button>
        <button type="button" class="btn btn-outline-danger" onclick="deleteMarketplaceAdminListing(${listingId})">Törlés</button>
      </div>
    </div>
  `;
}

function renderMarketplaceAdminListings() {
  const list = $("#adminMarketplaceListingsList");
  const count = $("#adminMarketplaceListingsCount");

  if (!list || !count) {
    return;
  }

  const listings = Array.isArray(marketplaceAdminState.listings) ? marketplaceAdminState.listings : [];
  count.textContent = `${listings.length} hirdetés`;
  clearElement(list);

  if (!listings.length) {
    list.innerHTML = '<div class="section-text">Nincs megjeleníthető hirdetés.</div>';
    renderMarketplaceAdminListingDetail(null);
    return;
  }

  listings.forEach((listing) => {
    const listingId = Number(listing.MarketplaceHirdetesId);
    const item = document.createElement("div");
    item.className = `app-list-item admin-forum-item admin-marketplace-item${marketplaceAdminState.activeListingId === listingId ? " is-active" : ""}`;
    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div>
          <div class="fw-semibold ${listing.Jegelve ? "marketplace-admin-frozen-title" : ""}">${escapeHtml(listing.Cim || "-")}</div>
          <div class="small section-text mt-1">
            ${escapeHtml(listing.Felhasznalonev || "-")} | ${escapeHtml(listing.Telepules || "-")} | ${escapeHtml(listing.KategoriaNev || "-")}
          </div>
          <div class="small section-text mt-1">
            ${escapeHtml(formatMarketplaceDate(listing.Letrehozva))}
            ${listing.AktivReportDb ? ` | ${escapeHtml(String(listing.AktivReportDb))} aktív report` : ""}
          </div>
          <div class="small section-text mt-2">
            ${listing.Jegelve
              ? '<span class="marketplace-admin-status-badge is-frozen">Jegelve</span>'
              : '<span class="marketplace-admin-status-badge">Aktív</span>'}
          </div>
        </div>
        <div class="admin-forum-actions">
          <button class="btn btn-sm btn-outline-info" type="button" onclick="openMarketplaceAdminListing(${listingId})">Megnyitás</button>
          <button class="btn btn-sm btn-outline-primary" type="button" onclick="toggleMarketplaceAdminListingFrozen(${listingId}, ${listing.Jegelve ? "false" : "true"})">
            ${listing.Jegelve ? "Feloldás" : "Jegelés"}
          </button>
          <button class="btn btn-sm btn-outline-danger" type="button" onclick="deleteMarketplaceAdminListing(${listingId})">Törlés</button>
        </div>
      </div>
    `;

    item.addEventListener("click", (event) => {
      if (event.target.closest("button")) {
        return;
      }

      openMarketplaceAdminListing(listingId);
    });

    list.appendChild(item);
  });
}

async function loadMarketplaceAdminListings() {
  try {
    marketplaceAdminState.listings = await apiRequest("/marketplace/admin/listings");
    renderMarketplaceAdminListings();

    if (!marketplaceAdminState.listings.length) {
      marketplaceAdminState.activeListingId = null;
      renderMarketplaceAdminListingDetail(null);
      return;
    }

    const activeExists = marketplaceAdminState.listings.some(
      (listing) => Number(listing.MarketplaceHirdetesId) === marketplaceAdminState.activeListingId
    );
    const nextListingId = activeExists
      ? marketplaceAdminState.activeListingId
      : Number(marketplaceAdminState.listings[0].MarketplaceHirdetesId);

    await openMarketplaceAdminListing(nextListingId);
  } catch (error) {
    showMarketplaceAdminFeedback(error.message || "Nem sikerült betölteni a marketplace hirdetéseket.", "danger");
  }
}

async function openMarketplaceAdminListing(listingId, rerenderList = true) {
  const numericListingId = Number(listingId);

  if (!Number.isInteger(numericListingId) || numericListingId <= 0) {
    return;
  }

  try {
    const listing = await apiRequest(`/marketplace/admin/listings/${numericListingId}`);
    marketplaceAdminState.activeListingId = numericListingId;
    marketplaceAdminState.activeListingDetail = listing;
    marketplaceAdminState.activeImageIndex = 0;
    renderMarketplaceAdminListingDetail(listing);

    if (rerenderList) {
      renderMarketplaceAdminListings();
    }
  } catch (error) {
    showMarketplaceAdminFeedback(error.message || "Nem sikerült betölteni a hirdetés részleteit.", "danger");
  }
}

async function toggleMarketplaceAdminListingFrozen(listingId, frozen) {
  const numericListingId = Number(listingId);

  if (!Number.isInteger(numericListingId) || numericListingId <= 0) {
    return;
  }

  try {
    await apiRequest(`/marketplace/admin/listings/${numericListingId}/freeze`, {
      method: "PATCH",
      body: JSON.stringify({ frozen: Boolean(frozen) }),
    });

    hideMarketplaceAdminFeedback();
    await loadMarketplaceAdminListings();
    await showAppSuccess(Boolean(frozen) ? "A hirdetés jegelve lett." : "A hirdetés jegelése megszűnt.");
  } catch (error) {
    showMarketplaceAdminFeedback(error.message || "Nem sikerült módosítani a hirdetés állapotát.", "danger");
  }
}

async function deleteMarketplaceAdminListing(listingId) {
  const numericListingId = Number(listingId);

  if (!Number.isInteger(numericListingId) || numericListingId <= 0) {
    return;
  }

  if (!(await showAppConfirm("Biztosan törölni szeretnéd ezt a marketplace hirdetést?", { confirmLabel: "Törlés" }))) {
    return;
  }

  try {
    await apiRequest(`/marketplace/admin/listings/${numericListingId}`, {
      method: "DELETE",
    });

    if (marketplaceAdminState.activeListingId === numericListingId) {
      marketplaceAdminState.activeListingId = null;
    }

    hideMarketplaceAdminFeedback();
    await loadMarketplaceAdminListings();
    await loadMarketplaceAdminReports();
    await showAppSuccess("A hirdetés sikeresen törölve.");
  } catch (error) {
    showMarketplaceAdminFeedback(error.message || "Nem sikerült törölni a hirdetést.", "danger");
  }
}

function renderMarketplaceAdminReports() {
  const reportsList = $("#adminMarketplaceReportsList");
  const reportsCount = $("#adminMarketplaceReportsCount");

  if (!reportsList || !reportsCount) {
    return;
  }

  const reports = Array.isArray(marketplaceAdminState.reports) ? marketplaceAdminState.reports : [];
  reportsCount.textContent = `${reports.length} report`;
  clearElement(reportsList);

  if (!reports.length) {
    reportsList.innerHTML = '<div class="section-text">Nincs megjeleníthető marketplace report.</div>';
    return;
  }

  reports.forEach((report) => {
    const reportId = Number(report.MarketplaceReportId);
    const item = document.createElement("div");
    item.className = `app-list-item admin-report-item${report.AdminOlvasva ? "" : " is-unread"}`;
    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div>
          <div class="fw-semibold">${escapeHtml(report.ReportoloFelhasznalonev || "-")}</div>
          <div class="small section-text mb-2">
            ${escapeHtml(formatDateTime(report.Letrehozva))} | Marketplace report
          </div>
          <div class="admin-forum-item-title">${escapeHtml(report.HirdetesCim || "-")}</div>
          <div class="small section-text mt-1">${escapeHtml(formatForumReportReason(report.IndokKod))}</div>
        </div>
        <div class="admin-forum-actions">
          <button class="btn btn-sm btn-outline-info" type="button" onclick="openMarketplaceAdminReportModal(${reportId})">Megnyitás</button>
          <button class="btn btn-sm btn-outline-danger" type="button" onclick="deleteMarketplaceAdminReportEntry(${reportId})">Törlés</button>
        </div>
      </div>
    `;
    reportsList.appendChild(item);
  });
}

async function loadMarketplaceAdminReports() {
  try {
    const reports = await apiRequest("/marketplace/reports/admin");
    marketplaceAdminState.reports = Array.isArray(reports) ? reports : [];
    renderMarketplaceAdminReports();
    await openPendingMarketplaceAdminReportFromSession();
  } catch (error) {
    showMarketplaceAdminFeedback(error.message || "Nem sikerült betölteni a marketplace reportokat.", "danger");
  }
}

async function openPendingMarketplaceAdminReportFromSession() {
  const rawReportId = sessionStorage.getItem("adminOpenReportId");
  const reportSource = sessionStorage.getItem("adminOpenReportSource") || "forum";

  if (!rawReportId || reportSource !== "marketplace") {
    return;
  }

  sessionStorage.removeItem("adminOpenReportId");
  sessionStorage.removeItem("adminOpenReportSource");
  const reportId = Number.parseInt(rawReportId, 10);

  if (!Number.isInteger(reportId) || reportId <= 0) {
    return;
  }

  document.getElementById("marketplaceAdminReportsSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
  await openMarketplaceAdminReportModal(reportId);
}

async function openMarketplaceAdminReportModal(reportId) {
  const detailBody = $("#adminMarketplaceReportDetailBody");
  const replyText = $("#adminMarketplaceReportReplyText");
  const jumpButton = $("#adminMarketplaceReportJumpButton");

  if (!detailBody || !replyText || !jumpButton) {
    return;
  }

  try {
    const report = await apiRequest(`/marketplace/reports/admin/${reportId}`);
    marketplaceAdminState.activeReportId = Number(reportId);

    detailBody.innerHTML = `
      <div class="app-list-item">
        <div class="fw-semibold mb-2">Reportoló felhasználó</div>
        <div>${escapeHtml(report.ReportoloFelhasznalonev || "-")}</div>
      </div>
      <div class="app-list-item">
        <div class="fw-semibold mb-2">Jelentett hirdetés</div>
        <div class="fw-semibold">${escapeHtml(report.HirdetesCim || "-")}</div>
        <div class="small section-text mt-1">Hirdető: ${escapeHtml(report.HirdetoFelhasznalonev || "-")}</div>
      </div>
      <div class="app-list-item">
        <div class="fw-semibold mb-2">Report részletei</div>
        <div class="mb-2">Indok: ${escapeHtml(formatForumReportReason(report.IndokKod))}</div>
        <div>${escapeHtml(report.Reszletezes || "Nincs részletezés.")}</div>
      </div>
    `;

    replyText.value = report.AdminValasz || "";
    jumpButton.disabled = !report.UgrasUrl;
    jumpButton.onclick = () => {
      if (report.UgrasUrl) {
        window.open(report.UgrasUrl, "_blank");
      }
    };

    createModalInstance("adminMarketplaceReportDetailModal")?.show();
    await loadMarketplaceAdminReports();
  } catch (error) {
    showMarketplaceAdminFeedback(error.message || "Nem sikerült megnyitni a marketplace reportot.", "danger");
  }
}

async function sendMarketplaceAdminReportReply() {
  const reportId = marketplaceAdminState.activeReportId;
  const replyText = $("#adminMarketplaceReportReplyText");
  const reportModal = createModalInstance("adminMarketplaceReportDetailModal");

  if (!Number.isInteger(reportId) || !replyText) {
    return;
  }

  const adminReply = replyText.value.trim();

  if (!adminReply) {
    showAppAlert("Adj meg választ a reportoló felhasználónak.", { title: "Hiba" });
    return;
  }

  try {
    await apiRequest(`/marketplace/reports/admin/${reportId}/reply`, {
      method: "POST",
      body: JSON.stringify({ adminReply }),
    });

    marketplaceAdminState.activeReportId = null;
    reportModal?.hide();
    await loadMarketplaceAdminReports();
    await showAppSuccess("Az admin válasz sikeresen elküldve.");
  } catch (error) {
    showMarketplaceAdminFeedback(error.message || "Nem sikerült elküldeni a választ.", "danger");
  }
}

async function deleteMarketplaceAdminReportEntry(reportId) {
  if (!(await showAppConfirm("Biztosan törölni szeretnéd ezt a marketplace reportot?", { confirmLabel: "Törlés" }))) {
    return;
  }

  try {
    await apiRequest(`/marketplace/reports/admin/${reportId}`, { method: "DELETE" });
    if (marketplaceAdminState.activeReportId === Number(reportId)) {
      marketplaceAdminState.activeReportId = null;
      createModalInstance("adminMarketplaceReportDetailModal")?.hide();
    }
    await loadMarketplaceAdminReports();
    await showAppSuccess("A marketplace report sikeresen törölve.");
  } catch (error) {
    showMarketplaceAdminFeedback(error.message || "Nem sikerült törölni a marketplace reportot.", "danger");
  }
}

function prepareMarketplaceAdminPage() {
  const replyButton = $("#adminMarketplaceSendReportReplyButton");

  if (!isLoggedIn()) {
    setPendingRedirect("marketplace-admin.html");
    window.location.href = "login.html";
    return;
  }

  if (!isAdminUser()) {
    window.location.href = "profil.html";
    return;
  }

  hideMarketplaceAdminFeedback();
  loadMarketplaceAdminListings();
  loadMarketplaceAdminReports();

  if (replyButton) {
    replyButton.addEventListener("click", sendMarketplaceAdminReportReply);
  }

  if ((window.location.hash || "").replace(/^#/, "").trim().toLowerCase() === "reports") {
    document.getElementById("marketplaceAdminReportsSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
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

const profileCustomizationState = {
  savedImageUrl: null,
  pendingImageUrl: null,
  removeImage: false,
  isOpen: false,
};

function getProfileDisplayName(user = {}) {
  return user?.username || user?.Felhasznalonev || user?.felhasznalonev || "Horgasz";
}

function getProfileBioValue(user = {}) {
  const bio = user?.bio ?? user?.Bemutatkozas ?? "";
  return typeof bio === "string" ? bio.trim() : "";
}

function getProfileImageValue(user = {}) {
  const imageUrl = user?.profileImageUrl ?? user?.ProfilKepUrl ?? null;
  return typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null;
}

function getProfileInitials(name = "") {
  const normalized = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return normalized || "HT";
}

function getEffectiveProfileImageUrl() {
  if (profileCustomizationState.pendingImageUrl) {
    return profileCustomizationState.pendingImageUrl;
  }

  if (profileCustomizationState.removeImage) {
    return null;
  }

  return profileCustomizationState.savedImageUrl;
}

function renderProfileAvatar(user = {}, imageUrlOverride = getProfileImageValue(user)) {
  const profileAvatar = $("#profileAvatar");

  if (!profileAvatar) {
    return;
  }

  const displayName = getProfileDisplayName(user);
  const imageUrl = imageUrlOverride;

  if (imageUrl) {
    profileAvatar.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(displayName)} profilképe">`;
    return;
  }

  profileAvatar.textContent = getProfileInitials(displayName);
}

function renderProfileBio(user = {}) {
  const profileBio = $("#profileBio");

  if (!profileBio) {
    return;
  }

  const bio = getProfileBioValue(user);
  profileBio.textContent = bio || "Még nincs bemutatkozás.";
}

function syncProfileCustomizationControls(user = {}, options = {}) {
  const { resetFileInput = false, preserveBioInput = false } = options;
  const profileCustomizationSection = $("#profileCustomizationSection");
  const profileCustomizationToggleButton = $("#profileCustomizationToggleButton");
  const profileImageInput = $("#profileImageInput");
  const profileBioInput = $("#profileBioInput");
  const removeProfileImageButton = $("#removeProfileImageButton");

  if (profileCustomizationSection) {
    profileCustomizationSection.classList.toggle("d-none", !profileCustomizationState.isOpen);
  }

  if (profileCustomizationToggleButton) {
    profileCustomizationToggleButton.classList.toggle("d-none", getViewedProfileUserId() !== null);
  }

  if (profileImageInput && resetFileInput) {
    profileImageInput.value = "";
  }

  if (profileBioInput && !preserveBioInput) {
    profileBioInput.value = getProfileBioValue(user);
  }

  if (removeProfileImageButton) {
    removeProfileImageButton.disabled = !getEffectiveProfileImageUrl();
  }
}

function setProfileCustomizationOpen(isOpen) {
  profileCustomizationState.isOpen = Boolean(isOpen) && getViewedProfileUserId() === null;
  syncProfileCustomizationControls(getStoredUser() || {});
}

function resetProfileCustomizationState(user = {}) {
  profileCustomizationState.savedImageUrl = getProfileImageValue(user);
  profileCustomizationState.pendingImageUrl = null;
  profileCustomizationState.removeImage = false;
  syncProfileCustomizationControls(user, { resetFileInput: true });
}

function handleProfileCustomizationOpen() {
  if (getViewedProfileUserId() !== null) {
    return;
  }

  resetProfileCustomizationState(getStoredUser() || {});
  setProfileCustomizationOpen(true);

  const profileCustomizationSection = $("#profileCustomizationSection");
  if (profileCustomizationSection) {
    requestAnimationFrame(() => {
      profileCustomizationSection.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }
}

async function handleProfileImageSelection(event) {
  const input = event?.target;

  if (!input) {
    return;
  }

  try {
    const imageDataUrl = await getImageDataUrlFromInput(input, "A profilkép");

    if (!imageDataUrl) {
      profileCustomizationState.pendingImageUrl = null;
      profileCustomizationState.removeImage = false;
      syncProfileCustomizationControls(getStoredUser() || {}, { preserveBioInput: true });
      return;
    }

    profileCustomizationState.pendingImageUrl = imageDataUrl;
    profileCustomizationState.removeImage = false;
    syncProfileCustomizationControls(getStoredUser() || {}, { preserveBioInput: true });
  } catch (error) {
    input.value = "";
    showAppAlert(error.message || "Nem sikerült beolvasni a profilképet.", { title: "Hiba" });
  }
}

function handleProfileImageRemove() {
  profileCustomizationState.pendingImageUrl = null;
  profileCustomizationState.removeImage = true;
  syncProfileCustomizationControls(getStoredUser() || {}, {
    resetFileInput: true,
    preserveBioInput: true,
  });
}

function handleProfileCustomizationCancel() {
  resetProfileCustomizationState(getStoredUser() || {});
  setProfileCustomizationOpen(false);
}

async function handleProfileCustomizationSave() {
  if (getViewedProfileUserId() !== null) {
    return;
  }

  const saveButton = $("#saveProfileCustomizationButton");
  const cancelButton = $("#cancelProfileCustomizationButton");
  const bioInput = $("#profileBioInput");
  const currentUser = getStoredUser() || {};
  const effectiveImageUrl = profileCustomizationState.pendingImageUrl !== null
    ? profileCustomizationState.pendingImageUrl
    : (profileCustomizationState.removeImage ? "" : profileCustomizationState.savedImageUrl || "");

  if (saveButton) {
    saveButton.disabled = true;
  }
  if (cancelButton) {
    cancelButton.disabled = true;
  }

  try {
    const response = await apiRequest("/users/me/profile", {
      method: "PUT",
      body: JSON.stringify({
        profileImageUrl: effectiveImageUrl,
        bio: bioInput?.value || "",
      }),
    });

    const updatedUser = response?.user || {};
    updateStoredUser(updatedUser);
    resetProfileCustomizationState(updatedUser);
    setProfileCustomizationOpen(false);
    await loadUserProfile();
    await showAppSuccess(response?.message || "A profil sikeresen frissítve.");
  } catch (error) {
    showAppAlert(error.message || "Nem sikerült elmenteni a profil módosításait.", {
      title: "Hiba",
    });
    syncProfileCustomizationControls(currentUser, { preserveBioInput: true });
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
    }
    if (cancelButton) {
      cancelButton.disabled = false;
    }
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

function bindProfileCustomizationControls() {
  const profileCustomizationToggleButton = $("#profileCustomizationToggleButton");
  const profileImageInput = $("#profileImageInput");
  const saveProfileCustomizationButton = $("#saveProfileCustomizationButton");
  const cancelProfileCustomizationButton = $("#cancelProfileCustomizationButton");
  const removeProfileImageButton = $("#removeProfileImageButton");

  if (profileCustomizationToggleButton && profileCustomizationToggleButton.dataset.bound !== "true") {
    profileCustomizationToggleButton.addEventListener("click", handleProfileCustomizationOpen);
    profileCustomizationToggleButton.dataset.bound = "true";
  }

  if (profileImageInput && profileImageInput.dataset.bound !== "true") {
    profileImageInput.addEventListener("change", handleProfileImageSelection);
    profileImageInput.dataset.bound = "true";
  }

  if (saveProfileCustomizationButton && saveProfileCustomizationButton.dataset.bound !== "true") {
    saveProfileCustomizationButton.addEventListener("click", handleProfileCustomizationSave);
    saveProfileCustomizationButton.dataset.bound = "true";
  }

  if (cancelProfileCustomizationButton && cancelProfileCustomizationButton.dataset.bound !== "true") {
    cancelProfileCustomizationButton.addEventListener("click", handleProfileCustomizationCancel);
    cancelProfileCustomizationButton.dataset.bound = "true";
  }

  if (removeProfileImageButton && removeProfileImageButton.dataset.bound !== "true") {
    removeProfileImageButton.addEventListener("click", handleProfileImageRemove);
    removeProfileImageButton.dataset.bound = "true";
  }
}

function prepareProfilePage() {
  const viewedUserId = getViewedProfileUserId();

  bindProfilePrivacyToggle();
  bindProfileCustomizationControls();

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

function getCurrentUserId(user = getStoredUser()) {
  const rawUserId = user?.id ?? user?.FelhasznaloId ?? user?.felhasznaloId;
  const userId = Number(rawUserId);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
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
  const marketplaceNavItem = ensureMarketplaceNavItem();
  const adminNavItem = $("#adminNavItem");
  const adminManagementNavItem = ensureAdminManagementNavItem();
  const adminModerationNavItem = ensureAdminModerationNavItem();
  const reportsNavItem = ensureAdminReportsNavItem();
  const userMessagesNavItem = ensureUserMessagesNavItem();
  const desktopAccountMenuNavItem = ensureDesktopAccountMenuNavItem();
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
  const watersNavItem = findNavigationLink([DEFAULT_NAV_ITEMS[0].defaultHref])?.closest(".nav-item");
  const forumNavItem = findNavigationLink([DEFAULT_NAV_ITEMS[2].defaultHref])?.closest(".nav-item");
  const user = getStoredUser();
  const isAdmin = isAdminUser(user);
  const loggedIn = isLoggedIn();

  updateNavigationShortcuts(user);
  updateHomePageShortcuts(user);

  if (loginNavItem) loginNavItem.classList.toggle("d-none", loggedIn);
  if (registerNavItem) registerNavItem.classList.toggle("d-none", loggedIn);
  setResponsiveNavItemVisibility(marketplaceNavItem, !loggedIn || !isAdmin);
  if (watersNavItem) {
    watersNavItem.classList.toggle("d-none", isAdmin);
  }
  if (forumNavItem) {
    forumNavItem.classList.toggle("d-none", isAdmin);
  }

  if (loggedIn) {
    setResponsiveNavItemVisibility(logoutNavItem, true, true);
    setResponsiveNavItemVisibility(profilNavItem, !isAdmin, true);
    setResponsiveNavItemVisibility(adminNavItem, isAdmin, true);
    setResponsiveNavItemVisibility(adminManagementNavItem, isAdmin);
    setResponsiveNavItemVisibility(adminModerationNavItem, isAdmin);
    setResponsiveNavItemVisibility(reportsNavItem, isAdmin, true);
    setResponsiveNavItemVisibility(userMessagesNavItem, !isAdmin, true);
    setResponsiveNavItemVisibility(friendSearchNav, !isAdmin, true);
    if (desktopAccountMenuNavItem) {
      desktopAccountMenuNavItem.classList.remove("desktop-account-menu-hidden");
    }

    if (desktopAccountMenuNavItem) {
      const menuItems = isAdmin
        ? `
            <a class="dropdown-item" href="admin.html">Admin</a>
            <a class="dropdown-item" href="admin.html#reports">Üzenetek</a>
            <button class="dropdown-item desktop-account-menu-logout" type="button" onclick="handleLogout()">Kijelentkezés</button>
          `
        : `
            <a class="dropdown-item" href="profil.html">Profil</a>
            <a class="dropdown-item" href="uzenetek.html">Üzenetek</a>
            <a class="dropdown-item" href="baratok.html">Barátok</a>
            <button class="dropdown-item desktop-account-menu-logout" type="button" onclick="handleLogout()">Kijelentkezés</button>
          `;

      desktopAccountMenuNavItem.innerHTML = `
        <div class="dropdown">
          <button
            class="desktop-account-menu-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            aria-label="Felhasználói menü"
          >
            <span class="desktop-account-menu-icon">👤</span>
            <span class="desktop-account-menu-label">Menü</span>
          </button>
          <div class="dropdown-menu dropdown-menu-end desktop-account-menu">
            ${menuItems}
          </div>
        </div>
      `;
    }
  } else {
    setResponsiveNavItemVisibility(profilNavItem, false);
    setResponsiveNavItemVisibility(logoutNavItem, false);
    setResponsiveNavItemVisibility(adminNavItem, false);
    setResponsiveNavItemVisibility(adminManagementNavItem, false);
    setResponsiveNavItemVisibility(adminModerationNavItem, false);
    setResponsiveNavItemVisibility(reportsNavItem, false);
    setResponsiveNavItemVisibility(userMessagesNavItem, false);
    setResponsiveNavItemVisibility(friendSearchNav, false);
    if (desktopAccountMenuNavItem) {
      desktopAccountMenuNavItem.classList.add("desktop-account-menu-hidden");
    }
  }

  if (catchLogNavItem) {
    catchLogNavItem.classList.toggle("d-none", !loggedIn || isAdmin);
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
  const profilePrivateNotice = $("#profilePrivateNotice");
  const profileName = $("#profileName");
  const profileEmail = $("#profileEmail");
  const profileEmailSection = $("#profileEmailSection");
  const profileCreated = $("#profileCreated");
  const profileRoles = $("#profileRoles");
  const profileAvatar = $("#profileAvatar");
  const profileDisplayName = $("#profileDisplayName");
  const profileBio = $("#profileBio");
  const profilePrivacySection = $("#profilePrivacySection");
  const profilePrivateToggle = $("#profilePrivateToggle");
  const profileCustomizationSection = $("#profileCustomizationSection");
  const profileCustomizationToggleButton = $("#profileCustomizationToggleButton");
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
    if (profilePrivateNotice) {
      profilePrivateNotice.classList.add("d-none");
      profilePrivateNotice.textContent = "Privát fiók.";
    }

    const user = isExternalProfile
      ? await apiRequest(`/users/${viewedUserId}/profile`)
      : await apiRequest("/users/me/profile");

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
    if (!isExternalProfile) {
      updateStoredUser(user);
    }
    if (profileName) profileName.textContent = getProfileDisplayName(user);
    if (profileDisplayName) profileDisplayName.textContent = getProfileDisplayName(user);
    resetProfileCustomizationState(user);
    renderProfileAvatar(user);
    renderProfileBio(user);
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
    if (profileCustomizationToggleButton) {
      profileCustomizationToggleButton.classList.toggle("d-none", isExternalProfile);
    }
    if (profileCustomizationSection) {
      profileCustomizationSection.classList.toggle(
        "d-none",
        isExternalProfile || !profileCustomizationState.isOpen
      );
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



