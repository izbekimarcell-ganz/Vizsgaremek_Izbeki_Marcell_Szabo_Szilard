/* =========================
   Alap konfiguráció
   ========================= */
const APP_CONFIG = {
  apiBaseUrl: "http://localhost:4000/api"
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
  updateNavbar();
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
          <h5 class="card-title">${fogas.HalfajNev}</h5>
          <p class="card-text">
            <strong>Vízterület:</strong> ${fogas.VizteruletNev}<br>
            <strong>Időpont:</strong> ${new Date(fogas.FogasIdeje).toLocaleString("hu-HU")}<br>
            ${fogas.SulyKg ? `<strong>Súly:</strong> ${fogas.SulyKg} kg<br>` : ""}
            ${fogas.HosszCm ? `<strong>Hossz:</strong> ${fogas.HosszCm} cm<br>` : ""}
            ${fogas.Megjegyzes ? `<strong>Megjegyzés:</strong> ${fogas.Megjegyzes}` : ""}
          </p>
          ${fogas.FotoUrl ? `<img src="${fogas.FotoUrl}" class="img-fluid" alt="Fogás fotó">` : ""}
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
  
  const catchData = {
    halfajId: parseInt(form.querySelector("#catchSpeciesId")?.value),
    vizteruletId: parseInt(form.querySelector("#catchWaterbodyId")?.value),
    fogasIdeje: form.querySelector("#catchDateTime")?.value,
    sulyKg: parseFloat(form.querySelector("#catchWeight")?.value) || null,
    hosszCm: parseInt(form.querySelector("#catchLength")?.value) || null,
    fotoUrl: null,
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
      body: JSON.stringify({ cim, szoveg, kepUrl: null }),
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
      selectedTopicMeta.textContent = `Téma azonosító: ${temaId}`;
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
            ${hz.Felhasznalonev} | ${new Date(hz.Letrehozva).toLocaleString("hu-HU")}
          </div>
          <div>${hz.Szoveg}</div>
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
  const szoveg = form.querySelector("#replyBody")?.value;
  const kepUrl = null;

  if (!temaId || !szoveg) {
    alert("A téma és a szöveg megadása kötelező!");
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

/* =========================
   Admin oldal előkészítés
   ========================= */
function prepareAdminPage() {
  const usersTableBody = $("#adminUsersTableBody");
  const manageSpeciesButton = $("#manageSpeciesButton");
  const manageWatersButton = $("#manageWatersButton");
  const manageRelationsButton = $("#manageRelationsButton");
  const moderateForumButton = $("#moderateForumButton");

  if (!isLoggedIn()) {
    setPendingRedirect("admin.html");
    window.location.href = "login.html";
    return;
  }

  if (!isAdminUser()) {
    window.location.href = "profil.html";
    return;
  }

  if (usersTableBody) {
    clearElement(usersTableBody);
    loadAllUsers();
  }

  const pendingFeatureMessage =
    "Ez a funkció még nincs elkészítve backend oldalon, ezért egyelőre nem használható.";

  if (manageSpeciesButton) {
    manageSpeciesButton.addEventListener("click", () => {
      alert(`Halfajok kezelése\n\n${pendingFeatureMessage}`);
    });
  }

  if (manageWatersButton) {
    manageWatersButton.addEventListener("click", () => {
      alert(`Vízterületek kezelése\n\n${pendingFeatureMessage}`);
    });
  }

  if (manageRelationsButton) {
    manageRelationsButton.addEventListener("click", () => {
      alert(`Kapcsolatok kezelése\n\n${pendingFeatureMessage}`);
    });
  }

  if (moderateForumButton) {
    moderateForumButton.addEventListener("click", () => {
      alert(`Fórum moderáció\n\n${pendingFeatureMessage}`);
    });
  }
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
  try {
    const user = getStoredUser();
    const profileContent = $("#profileContent");
    const profileEmpty = $("#profileEmpty");
    const profileName = $("#profileName");
    const profileEmail = $("#profileEmail");
    const profileCreated = $("#profileCreated");
    const profileRoles = $("#profileRoles");
    const deleteProfileButton = $("#deleteProfileButton");

    if (!user) {
      if (profileContent) profileContent.classList.add("d-none");
      if (profileEmpty) profileEmpty.classList.remove("d-none");
      return;
    }

    if (profileContent) profileContent.classList.remove("d-none");
    if (profileEmpty) profileEmpty.classList.add("d-none");

    if (profileName) profileName.textContent = user.username || "";
    if (profileEmail) profileEmail.textContent = user.email || "";
    if (profileCreated) {
      profileCreated.textContent = user.letrehozva
        ? new Date(user.letrehozva).toLocaleDateString("hu-HU")
        : "-";
    }
    if (profileRoles) {
      profileRoles.textContent = isAdminUser(user) ? "Admin" : "Felhasználó";
    }
    if (deleteProfileButton) {
      deleteProfileButton.classList.toggle("d-none", isAdminUser(user));
    }
  } catch (error) {
    console.error("Profil betöltési hiba:", error);
    const profileError = $("#profileError");
    if (profileError) {
      profileError.classList.remove("d-none");
      profileError.textContent = "Hiba a profil betöltése során!";
    }
  }
}
