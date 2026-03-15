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
  // Itt később API-ból tölthetjük be, most statikus
  const countySelect = $("#county");
  const typeSelect = $("#type");
  
  if (countySelect) {
    const counties = [
      "Budapest", "Bács-Kiskun", "Baranya", "Békés", "Borsod-Abaúj-Zemplén",
      "Csongrád-Csanád", "Fejér", "Győr-Moson-Sopron", "Hajdú-Bihar", "Heves",
      "Jász-Nagykun-Szolnok", "Komárom-Esztergom", "Nógrád", "Pest", "Somogy",
      "Szabolcs-Szatmár-Bereg", "Tolna", "Vas", "Veszprém", "Zala"
    ];
    
    counties.forEach(county => {
      const option = document.createElement("option");
      option.value = county;
      option.textContent = county;
      countySelect.appendChild(option);
    });
  }
  
  if (typeSelect) {
    const types = ["Folyó", "Tó", "Víztározó", "Holtág", "Csatorna"];
    
    types.forEach(type => {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      typeSelect.appendChild(option);
    });
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
    
    // Egyszerű alert formátumban
    let details = `Vízterület: ${data.vizterulet.Nev}\n`;
    details += `Típus: ${data.vizterulet.VizTipusNev}\n\n`;
    
  
  // Dropdown-ok betöltése
  loadCatchFormOptions();
    if (data.halfajok.length > 0) {
      details += `Halfajok:\n`;
      data.halfajok.forEach(h => {
        details += `- ${h.MagyarNev}${h.Vedett ? " (Védett)" : ""}\n`;
      });
    }
    
    if (data.megyek.length > 0) {
      details += `\nMegyék:\n`;
      data.megyek.forEach(m => {
        details += `- ${m.Nev}\n`;
      });
    }
    
    alert(details);
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

  if (catchForm) {
    catchForm.addEventListener("submit", handleAddCatch);
  }

  if (catchListContainer) {
    clearElement(catchListContainer);
    if (isLoggedIn()) {
      loadSajatFogasok();
    }
  }
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
    fotoUrl: form.querySelector("#catchImage")?.value || null,
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
      body: JSON.stringify({ cim }),
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
    
    let replies = `Hozzászólások:\n\n`;
    
    if (data.length === 0) {
      replies += "Még nincs hozzászólás.";
    } else {
      data.forEach((hz) => {
        replies += `${hz.Felhasznalonev} (${new Date(hz.Letrehozva).toLocaleString("hu-HU")}):\n`;
        replies += `${hz.Szoveg}\n\n`;
      });
    }
    
    alert(replies);
    
    // Beállítjuk az aktuális témát a hozzászólás formhoz
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
  const kepUrl = form.querySelector("#replyImage")?.value || null;

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
  } catch (error) {
    alert(error.message || "Hiba a hozzászólás létrehozása során!");
  }
}

/* =========================
   Admin oldal előkészítés
   ========================= */
function prepareAdminPage() {
  const usersTableBody = $("#adminUsersTableBody");

  if (!isLoggedIn()) {
    alert("Admin jogosultság szükséges!");
    window.location.href = "index.html";
    return;
  }

  if (usersTableBody) {
    clearElement(usersTableBody);
    loadAllUsers();
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
  // Ha van token, töltsük be a profilt
  if (isLoggedIn()) {
    loadUserProfile();
  } else {
    // Ha nincs bejelentkezve, átirányítás a login oldalra
    window.location.href = "login.html";
  }
}

/* =========================
   Login oldal előkészítése
   ========================= */
function prepareLoginPage() {
  const loginForm = $("#loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }
}

/* =========================
   Register oldal előkészítése
   ========================= */
function prepareRegisterPage() {
  const registerForm = $("#registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }
}

/* =========================
   JWT Token kezelés
   ========================= */
function getToken() {
  return localStorage.getItem("authToken");
}

function setToken(token) {
  localStorage.setItem("authToken", token);
}

function removeToken() {
  localStorage.removeItem("authToken");
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

  if (isLoggedIn()) {
    // Felhasználó be van jelentkezve
    try {
      const profile = await apiRequest("/users/profile");
      
      // Elrejti login/register, megjeleníti profil/logout
      if (loginNavItem) loginNavItem.classList.add("d-none");
      if (registerNavItem) registerNavItem.classList.add("d-none");
      if (profilNavItem) profilNavItem.classList.remove("d-none");
      if (logoutNavItem) logoutNavItem.classList.remove("d-none");

      // Admin fül megjelenítése, ha van Admin szerepkör
      const isAdmin = profile.szerepkorok && profile.szerepkorok.some(role => role.Nev === "Admin");
      if (adminNavItem) {
        if (isAdmin) {
          adminNavItem.classList.remove("d-none");
        } else {
          adminNavItem.classList.add("d-none");
        }
      }
    } catch (error) {
      console.error("Nem sikerült betölteni a profil adatokat:", error);
      // Ha hiba van, kijelentkeztetjük
      removeToken();
      updateNavbar();
    }
  } else {
    // Felhasználó nincs bejelentkezve
    if (loginNavItem) loginNavItem.classList.remove("d-none");
    if (registerNavItem) registerNavItem.classList.remove("d-none");
    if (profilNavItem) profilNavItem.classList.add("d-none");
    if (logoutNavItem) logoutNavItem.classList.add("d-none");
    if (adminNavItem) adminNavItem.classList.add("d-none");
  }
}

/* =========================
   Kijelentkezés
   ========================= */
function handleLogout() {
  removeToken();
  window.location.href = "index.html";
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
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Hiba történt a kérés során.");
    }

    return data;
  } catch (error) {
    console.error("API hiba:", error);
    throw error;
  }
}

/* =========================
   Autentikáció - Login
   ========================= */
async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const identifier = form.querySelector("#loginIdentifier")?.value;
  const password = form.querySelector("#loginPassword")?.value;

  if (!identifier || !password) {
    alert("Minden mező kitöltése kötelező!");
    return;
  }

  try {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });

    setToken(data.token);
    alert("Sikeres bejelentkezés!");
    window.location.href = "index.html";
  } catch (error) {
    alert(error.message || "Bejelentkezési hiba!");
  }
}

/* =========================
   Autentikáció - Register
   ========================= */
async function handleRegister(event) {
  event.preventDefault();
  const form = event.target;
  const email = form.querySelector("#registerEmail")?.value;
  const felhasznalonev = form.querySelector("#registerUsername")?.value;
  const password = form.querySelector("#registerPassword")?.value;
  const passwordConfirm = form.querySelector("#registerPasswordConfirm")?.value;

  if (!email || !felhasznalonev || !password || !passwordConfirm) {
    alert("Minden mező kitöltése kötelező!");
    return;
  }

  if (password !== passwordConfirm) {
    alert("A jelszavak nem egyeznek!");
    return;
  }

  try {
    await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, felhasznalonev, password }),
    });

    alert("Sikeres regisztráció! Most már bejelentkezhetsz.");
    form.reset();
  } catch (error) {
    alert(error.message || "Regisztrációs hiba!");
  }
}

/* =========================
   Profil betöltése
   ========================= */
async function loadUserProfile() {
  try {
    const data = await apiRequest("/users/profile");
    
    // Profil adatok megjelenítése
    const profileContent = $("#profileContent");
    const profileEmpty = $("#profileEmpty");
    const profileName = $("#profileName");
    const profileEmail = $("#profileEmail");
    const profileCreated = $("#profileCreated");
    const profileRoles = $("#profileRoles");
    
    if (profileContent) profileContent.classList.remove("d-none");
    if (profileEmpty) profileEmpty.classList.add("d-none");
    
    if (profileName) profileName.textContent = data.felhasznalo.Felhasznalonev;
    if (profileEmail) profileEmail.textContent = data.felhasznalo.Email;
    if (profileCreated) {
      profileCreated.textContent = new Date(data.felhasznalo.Letrehozva).toLocaleDateString("hu-HU");
    }
    if (profileRoles) {
      const roles = data.szerepkorok && data.szerepkorok.length > 0 
        ? data.szerepkorok.map(sz => sz.Nev).join(", ") 
        : "Felhasználó";
      profileRoles.textContent = roles;
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

/* =========================
   Kijelentkezés
   ========================= */
function handleLogout() {
  removeToken();
  alert("Sikeresen kijelentkeztél!");
  window.location.href = "index.html";
}