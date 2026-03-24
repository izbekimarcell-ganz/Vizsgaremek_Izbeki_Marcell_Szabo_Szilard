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
    description: "Halfajok adatainak, szabályainak és védettségének kezelése.",
  },
  waters: {
    href: "admin.html#waters",
    label: "Vízterületek kezelése",
    title: "Vízterületek kezelése",
    description: "Vízterületek adatainak, megyéinek és halfaj kapcsolatainak kezelése.",
  },
  forum: {
    href: "admin.html#forum",
    label: "Fórum moderáció",
    title: "Fórum moderáció",
    description: "Fórumtémák és hozzászólások áttekintése, kezelése és moderálása.",
  },
  marketplaceModeration: {
    href: "marketplace-admin.html",
    label: "Marketplace moderáció",
    title: "Marketplace moderáció",
    description: "Marketplace hirdetések és kapcsolódó reportok áttekintése, moderálása.",
  },
  reports: {
    href: "admin.html#reports",
    label: "Üzenetek",
    title: "Report üzenetek",
    description: "Beérkezett reportok áttekintése és admin válaszok küldése.",
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
    key: "waters",
    defaultLabel: "01 / Keresés",
    adminLabel: "01 / Halfajok",
    defaultHref: "vizteruletek.html",
    defaultTitle: "Vízterületek",
    defaultDescription: "Keresés megye, víztípus és halfaj alapján, részletes vízterület-adatlappal.",
    adminShortcut: ADMIN_SHORTCUTS.species,
  },
  {
    key: "catchLog",
    defaultLabel: "02 / Naplózás",
    adminLabel: "02 / Vízterületek",
    defaultHref: "fogasnaplo.html",
    defaultTitle: "Fogásnapló",
    defaultDescription: "Fogások rögzítése dátummal, mérettel, képpel és megjegyzéssel, visszanézhető listában.",
    adminShortcut: ADMIN_SHORTCUTS.waters,
  },
  {
    key: "forum",
    defaultLabel: "03 / Közösség",
    adminLabel: "03 / Moderáció",
    defaultHref: "forum.html",
    defaultTitle: "Fórum",
    defaultDescription: "Új témák indítása, hozzászólások írása és horgásztapasztalatok megosztása.",
    adminShortcut: ADMIN_SHORTCUTS.forum,
  },
  {
    key: "marketplace",
    defaultLabel: "04 / Piactér",
    adminLabel: "04 / Piactér",
    defaultHref: "marketplace.html",
    defaultTitle: "Marketplace",
    defaultDescription: "Horgászfelszerelések böngészése kategóriák szerint, kereséssel és saját hirdetés feladásával.",
    adminShortcut: ADMIN_SHORTCUTS.marketplaceModeration,
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
  initializeNavbarScrollBehavior();
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

function initializeNavbarScrollBehavior() {
  const navbar = document.querySelector(".app-navbar");

  if (!navbar) {
    return;
  }
  navbar.classList.remove("navbar-hidden");
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

function createManualModalController(modalElement) {
  let backdropElement = null;

  const show = () => {
    modalElement.style.display = "block";
    modalElement.removeAttribute("aria-hidden");
    modalElement.setAttribute("aria-modal", "true");
    modalElement.classList.add("show");
    document.body.classList.add("modal-open");

    backdropElement = document.createElement("div");
    backdropElement.className = "modal-backdrop fade show";
    document.body.appendChild(backdropElement);
  };

  const hide = () => {
    modalElement.classList.remove("show");
    modalElement.style.display = "none";
    modalElement.setAttribute("aria-hidden", "true");
    modalElement.removeAttribute("aria-modal");
    document.body.classList.remove("modal-open");

    if (backdropElement) {
      backdropElement.remove();
      backdropElement = null;
    }

    modalElement.dispatchEvent(new Event("hidden.bs.modal"));
  };

  return { show, hide };
}

function getModalController(modalElement) {
  if (typeof bootstrap !== "undefined") {
    return bootstrap.Modal.getOrCreateInstance(modalElement);
  }

  return createManualModalController(modalElement);
}

function showAppDialog({
  title = "Üzenet",
  message = "",
  confirmLabel = "Rendben",
  cancelLabel = "Mégse",
  showCancel = false,
  confirmButtonClass = "btn-primary",
}) {
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

  const modalInstance = getModalController(modalElement);

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

  const modalInstance = getModalController(modalElement);

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
    const panel = document.querySelector(`[data-home-shortcut="${item.key}"]`);
    const label = panel?.querySelector("[data-home-shortcut-label]");
    const link = panel?.querySelector("[data-home-shortcut-link]");
    const title = panel?.querySelector("[data-home-shortcut-title]");
    const description = panel?.querySelector("[data-home-shortcut-description]");

    if (!panel || !link) return;

    link.setAttribute("href", isAdmin ? item.adminShortcut.href : item.defaultHref);

    if (label) {
      label.textContent = isAdmin ? item.adminLabel : item.defaultLabel;
    }

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


function renderCatchCards(container, catches, { allowDelete = false } = {}) {
  if (!container) {
    return;
  }

  const allowEditOnPage = allowDelete && document.body?.dataset?.page === "fogasnaplo";
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
          allowEditOnPage
            ? `
              <div class="mt-3 d-flex justify-content-end">
                <button class="btn btn-sm btn-outline-info" type="button" onclick="editCatch(${Number(fogas.FogasId)})">Szerkeszt\u00E9s</button>
              </div>
            `
            : ""
        }
      </div>
    `;
    container.appendChild(card);
  });
}


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

function openProfileByUserId(userId) {
  if (!Number.isInteger(userId) || userId <= 0) {
    return;
  }

  sessionStorage.setItem("viewedProfileUserId", String(userId));
  window.location.href = `profil.html?userId=${userId}`;
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
  const homeHeroActionButton = $("#homeHeroActionButton");
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
            <a class="dropdown-item" href="baratok.html">Ismerősök</a>
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

  if (homeHeroActionButton) {
    homeHeroActionButton.textContent = loggedIn ? "Profil megnyitása" : "Regisztráció";
    homeHeroActionButton.setAttribute("href", loggedIn ? "profil.html" : "register.html");
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
  openProfileByUserId(userId);
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
  const shortcutLabel = $("#accountCardLabel");
  const shortcutLink = $("#accountShortcutLink");
  const shortcutTitle = $("#accountCardTitle");
  const shortcutDescription = $("#accountCardDescription");

  if (!shortcutLink) {
    return;
  }

  if (!user) {
    shortcutLink.setAttribute("href", "profil.html");
    if (shortcutLabel) shortcutLabel.textContent = "05 / Fiók";
    if (shortcutTitle) shortcutTitle.textContent = "Profil";
    if (shortcutDescription) {
      shortcutDescription.textContent = "Belépés, regisztráció, profilbeállítások és saját adatok kezelése.";
    }
    return;
  }

  if (isAdminUser(user)) {
    shortcutLink.setAttribute("href", "admin.html");
    if (shortcutLabel) shortcutLabel.textContent = "05 / Admin";
    if (shortcutTitle) shortcutTitle.textContent = "Admin";
    if (shortcutDescription) {
      shortcutDescription.textContent = "Felhasználók, moderáció és report üzenetek kezelése.";
    }
    return;
  }

  shortcutLink.setAttribute("href", "profil.html");
  if (shortcutLabel) shortcutLabel.textContent = "05 / Fiók";
  if (shortcutTitle) shortcutTitle.textContent = "Profil";
  if (shortcutDescription) {
    shortcutDescription.textContent = "Profiladatok, bemutatkozás, láthatóság és saját beállítások kezelése.";
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
