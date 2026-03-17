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
      (page === "vizteruletek" && href === "vizteruletek.html") ||
      (page === "fogasnaplo" && href === "fogasnaplo.html") ||
      (page === "forum" && href === "forum.html") ||
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

/* =========================
   Vízterületek oldal előkészítés
   ========================= */
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
async function showVizteruletDetails(vizteruletId) {
  try {
    const data = await apiRequest(`/vizteruletek/${vizteruletId}`);

    const detailsCard = $("#waterDetailsCard");
    const nameElement = $("#waterDetailName");
    const typeElement = $("#waterDetailType");
    const countiesElement = $("#waterDetailCounties");
    const descriptionElement = $("#waterDetailDescription");
    const speciesElement = $("#waterDetailSpecies");

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

      if (!data.halfajok.length) {
        speciesElement.innerHTML = '<span class="section-text">Nincs rögzített halfaj.</span>';
      } else {
        data.halfajok.forEach((halfaj) => {
          const badge = document.createElement("span");
          badge.className = `badge ${halfaj.Vedett ? "bg-warning text-dark" : "bg-info text-dark"}`;
          badge.textContent = halfaj.MagyarNev;
          speciesElement.appendChild(badge);
        });
      }
    }
  } catch (error) {
    alert("Hiba a részletek betöltése során!");
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
    alert(error.message);
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
    alert("A halfaj, vízterület és időpont megadása kötelező!");
    return;
  }

  try {
    await apiRequest("/fogasnaplo", {
      method: "POST",
      body: JSON.stringify(catchData),
    });

    alert("Fogás sikeresen rögzítve!");
    form.reset();
    loadSajatFogasok();
  } catch (error) {
    alert(error.message || "Hiba a fogás rögzítése során!");
  }
}

/* =========================
   Fórum oldal előkészítés
   ========================= */
function prepareForumPage() {
  const topicForm = $("#forumTopicForm");
  const replyForm = $("#forumReplyForm");
  const topicsList = $("#forumTopicsList");

  if (topicForm) {
    topicForm.addEventListener("submit", handleCreateTopic);
  }

  if (replyForm) {
    replyForm.addEventListener("submit", handleCreateReply);
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
      card.innerHTML = `
        <div class="card-body">
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
    alert(error.message);
    return;
  }

  if (!cim) {
    alert("A téma címe kötelező!");
    return;
  }

  if (!isLoggedIn()) {
    alert("A művelethez be kell jelentkezned!");
    return;
  }

  try {
    await apiRequest("/forum/tema", {
      method: "POST",
      body: JSON.stringify({ cim, szoveg, kepUrl }),
    });

    alert("Téma sikeresen létrehozva!");
    form.reset();
    loadForumTopics();
  } catch (error) {
    alert(error.message || "Hiba a téma létrehozása során!");
  }
}

/* =========================
   Téma hozzászólásainak betöltése
   ========================= */
async function loadTopicReplies(temaId) {
  try {
    const data = await apiRequest(`/forum/tema/${temaId}/hozzaszolasok`);

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
        item.className = "border rounded p-3 mb-3";
        item.innerHTML = `
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
  } catch (error) {
    alert("Hiba a hozzászólások betöltése során!");
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
    alert(error.message);
    return;
  }

  if (!temaId || (!szoveg.trim() && !kepUrl)) {
    alert("A téma mellett legalább szöveg vagy kép megadása kötelező!");
    return;
  }

  if (!isLoggedIn()) {
    alert("A művelethez be kell jelentkezned!");
    return;
  }

  try {
    await apiRequest("/forum/hozzaszolas", {
      method: "POST",
      body: JSON.stringify({ temaId, szoveg, kepUrl }),
    });

    alert("Hozzászólás sikeresen létrehozva!");
    form.reset();
    await loadTopicReplies(temaId);
  } catch (error) {
    alert(error.message || "Hiba a hozzászólás létrehozása során!");
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
  setText(panels.title, title);
  setText(panels.description, description);

  if (panelName === "species") showElement(panels.species);
  if (panelName === "waters") showElement(panels.waters);
  if (panelName === "forum") showElement(panels.forum);
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

  closeAdminPanel();
  if (syncHash) updateAdminLocationHash("");
}

async function handleAdminTargetChange() {
  if (document.body.dataset.page !== "admin") {
    return;
  }

  const usersSection = $("#adminUsersSection");
  const target = getAdminTargetFromLocation();

  if (!target || !["species", "waters", "forum"].includes(target)) {
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
  if (!window.confirm("Biztosan törölni szeretnéd ezt a fogást?")) {
    return;
  }

  try {
    await apiRequest(`/fogasnaplo/${fogasId}`, { method: "DELETE" });
    await loadSajatFogasok();
    alert("A fogás sikeresen törölve.");
  } catch (error) {
    alert(error.message || "Nem sikerült törölni a fogást.");
  }
}

function renderMultiSelect(container, options, selectedValues = []) {
  if (!container) return;

  const uniqueSelected = [...new Set(selectedValues.map((value) => Number(value)).filter((value) => !Number.isNaN(value)))];
  const isSingleSelect = container.dataset.singleSelect === "true";

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
    showAdminFeedback("A halfaj sikeresen mentve.");
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
    showAdminFeedback("A halfaj sikeresen módosítva.");
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
  if (!window.confirm("Biztosan törölni szeretnéd ezt a halfajt?")) {
    return;
  }

  try {
    await apiRequest(`/halfajok/${speciesId}`, { method: "DELETE" });
    await loadSpeciesAdminData();
    showAdminFeedback("A halfaj sikeresen törölve.");
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
  if (!payload.nev || Number.isNaN(payload.vizTipusId) || payload.megyeIds.length !== 1) {
    setWaterFormError("A név, a víztípus és pontosan egy megye megadása kötelező.");
    return;
  }

  try {
    await apiRequest("/vizteruletek", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    resetWaterForm();
    await loadWatersAdminData();
    showAdminFeedback("A vízterület sikeresen mentve.");
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

  if (!payload.nev || Number.isNaN(payload.vizTipusId) || payload.megyeIds.length !== 1) {
    setWaterFormError("A név, a víztípus és pontosan egy megye megadása kötelező.", true);
    return;
  }

  try {
    await apiRequest(`/vizteruletek/${waterId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    createModalInstance("waterEditModal")?.hide();
    await loadWatersAdminData();
    showAdminFeedback("A vízterület sikeresen módosítva.");
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
  if (!window.confirm("Biztosan törölni szeretnéd ezt a vízterületet?")) {
    return;
  }

  try {
    await apiRequest(`/vizteruletek/${waterId}`, { method: "DELETE" });
    await loadWatersAdminData();
    showAdminFeedback("A vízterület sikeresen törölve.");
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
  if (!window.confirm("Biztosan törölni szeretnéd ezt a fórum témát?")) {
    return;
  }

  try {
    await apiRequest(`/forum/admin/tema/${topicId}`, { method: "DELETE" });
    delete adminState.forumRepliesByTopic[topicId];
    await loadForumAdminData();
    showAdminFeedback("A fórum téma sikeresen törölve.");
  } catch (error) {
    showAdminFeedback(error.message || "Nem sikerült törölni a témát.", "danger");
  }
}

async function deleteForumReply(replyId, topicId) {
  if (!window.confirm("Biztosan törölni szeretnéd ezt a hozzászólást?")) {
    return;
  }

  try {
    await apiRequest(`/forum/admin/hozzaszolas/${replyId}`, { method: "DELETE" });
    await loadForumAdminData();
    if (topicId) {
      await loadForumRepliesAdmin(topicId);
    }
    showAdminFeedback("A hozzászólás sikeresen törölve.");
  } catch (error) {
    showAdminFeedback(error.message || "Nem sikerült törölni a hozzászólást.", "danger");
  }
}

/* =========================
   Admin oldal előkészítés
   ========================= */
function prepareAdminPage() {
  const usersTableBody = $("#adminUsersTableBody");
  const manageSpeciesButton = $("#manageSpeciesButton");
  const manageWatersButton = $("#manageWatersButton");
  const moderateForumButton = $("#moderateForumButton");
  const closePanelButton = $("#closeAdminMasterDataSection");
  const speciesForm = $("#speciesForm");
  const speciesResetButton = $("#speciesFormResetButton");
  const speciesEditForm = $("#speciesEditForm");
  const waterForm = $("#waterForm");
  const waterResetButton = $("#waterFormResetButton");
  const waterEditForm = $("#waterEditForm");

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

  if (manageSpeciesButton) {
    manageSpeciesButton.addEventListener("click", async () => {
      await openAdminTarget("species");
    });
  }

  if (manageWatersButton) {
    manageWatersButton.addEventListener("click", async () => {
      await openAdminTarget("waters");
    });
  }

  if (moderateForumButton) {
    moderateForumButton.addEventListener("click", async () => {
      await openAdminTarget("forum");
    });
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
  if (!confirm("Biztosan módosítod a felhasználó állapotát?")) {
    return;
  }

  try {
    await apiRequest(`/users/${userId}/toggle-active`, {
      method: "PUT",
    });

    alert("Felhasználó állapota módosítva!");
    loadAllUsers();
  } catch (error) {
    alert(error.message || "Hiba történt a művelet során!");
  }
}

/* =========================
   Profil oldal előkészítés
   ========================= */
function prepareProfilePage() {
  const viewedUserId = getViewedProfileUserId();

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

function isAdminUser(user = getStoredUser()) {
  return Boolean(user && (user.admin === true || user.Admin === true));
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
  const adminNavItem = $("#adminNavItem");
  const profilNavItem = $("#profilNavItem");
  const loginNavItem = $("#loginNavItem");
  const registerNavItem = $("#registerNavItem");
  const logoutNavItem = $("#logoutNavItem");
  const user = getStoredUser();
  const isAdmin = isAdminUser(user);

  updateNavigationShortcuts(user);
  updateHomePageShortcuts(user);

  if (isLoggedIn()) {
    if (loginNavItem) loginNavItem.classList.add("d-none");
    if (registerNavItem) registerNavItem.classList.add("d-none");
    if (logoutNavItem) logoutNavItem.classList.remove("d-none");
    if (profilNavItem) profilNavItem.classList.toggle("d-none", isAdmin);
    if (adminNavItem) adminNavItem.classList.toggle("d-none", !isAdmin);
  } else {
    if (loginNavItem) loginNavItem.classList.remove("d-none");
    if (registerNavItem) registerNavItem.classList.remove("d-none");
    if (profilNavItem) profilNavItem.classList.add("d-none");
    if (logoutNavItem) logoutNavItem.classList.add("d-none");
    if (adminNavItem) adminNavItem.classList.add("d-none");
  }

  updateAccountShortcut(user);
  setActiveNavLink();
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

  const confirmed = window.confirm(
    "Biztosan törölni akarod a profilodat? Ha törlöd a profilt, utána már nem lehet visszahozni."
  );

  if (!confirmed) {
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

    alert("A profil sikeresen törölve lett.");
    clearAuthSession();
    window.location.href = "index.html";
  } catch (error) {
    console.error("Profil törlési hiba:", error);
    alert(error.message || "Nem sikerült törölni a profilt.");
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
      throw new Error(
        typeof data === "object" && data?.message
          ? data.message
          : "Hiba történt a kérés során."
      );
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
      ? await apiRequest(`/users/${viewedUserId}/profile`, { headers: {} })
      : getStoredUser();

    if (!user) {
      if (profileLoading) profileLoading.classList.add("d-none");
      if (profileContent) profileContent.classList.add("d-none");
      if (profileEmpty) profileEmpty.classList.remove("d-none");
      return;
    }

    if (profileLoading) profileLoading.classList.add("d-none");
    if (profileContent) profileContent.classList.remove("d-none");
    if (profileEmpty) profileEmpty.classList.add("d-none");

    if (profilePageTitle) {
      profilePageTitle.textContent = isExternalProfile ? "Felhasznaloi profil" : "Profil";
    }
    if (profilePageDescription) {
      profilePageDescription.textContent = isExternalProfile
        ? "A kivalasztott felhasznalo nyilvanos profilja."
        : "Profilinformaciok es beallitasok.";
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
  } catch (error) {
    console.error("Profil betöltési hiba:", error);
    if (profileLoading) {
      profileLoading.classList.add("d-none");
    }
    if (profileContent) {
      profileContent.classList.add("d-none");
    }
    if (profileError) {
      profileError.classList.remove("d-none");
      profileError.textContent = "Hiba a profil betöltése során!";
    }
  }
}
