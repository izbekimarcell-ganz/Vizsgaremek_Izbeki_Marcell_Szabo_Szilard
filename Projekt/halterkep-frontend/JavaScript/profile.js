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

function getFishingCalendarPageMode() {
  return document.body.dataset.page === "fogasnaplo" ? "catch-log" : "profile";
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

window.HalBaratokShared = {
  apiRequest,
  escapeHtml,
  formatForumReportReason,
  getAuthHeaders,
  getStoredUser,
  openProfileByUserId,
  showAppAlert,
  showAppConfirm,
  showAppSuccess,
  showAppTextPrompt,
};

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
  const calendarMode = getFishingCalendarPageMode();
  const allowDayMenu = calendarMode === "catch-log" && Boolean(isOwnProfile);
  const showDayDetails = calendarMode === "profile";

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
    profileCalendarState.selectedDateKey = showDayDetails
      ? monthMarkedKeys[0] || ""
      : `${profileCalendarState.currentMonth.getFullYear()}-${String(profileCalendarState.currentMonth.getMonth() + 1).padStart(2, "0")}-01`;
  } else if (!hasSelectedDateInCurrentMonth) {
    profileCalendarState.selectedDateKey = showDayDetails
      ? monthMarkedKeys[0] || ""
      : `${profileCalendarState.currentMonth.getFullYear()}-${String(profileCalendarState.currentMonth.getMonth() + 1).padStart(2, "0")}-01`;
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

    if (allowDayMenu) {
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

      const createCatchButton = document.createElement("button");
      createCatchButton.type = "button";
      createCatchButton.className = "profile-calendar-day-menu-action";
      createCatchButton.textContent = "Új fogás";
      createCatchButton.addEventListener("click", (event) => {
        event.stopPropagation();
        profileCalendarState.selectedDateKey = dateKey;
        profileCalendarState.menuOpenDateKey = "";

        if (typeof window.openCatchCreateModal === "function") {
          window.openCatchCreateModal(dateKey);
        }

        renderProfileFishingCalendar(profileCalendarState.catches, profileCalendarState.manualDays, {
          isOwnProfile: profileCalendarState.isOwnProfile,
          keepMonth: true,
        });
      });

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

      panel.appendChild(createCatchButton);
      panel.appendChild(actionButton);
      panel.appendChild(noteButton);
      menu.appendChild(toggleButton);
      menu.appendChild(panel);
      dayWrapper.appendChild(menu);
    }

    grid.appendChild(dayWrapper);
  }

  if (showDayDetails) {
    renderProfileCalendarDayDetails(
      profileCalendarState.selectedDateKey ? catchesByDate.get(profileCalendarState.selectedDateKey) || [] : [],
      profileCalendarState.selectedDateKey,
      Boolean(profileCalendarState.selectedDateKey) &&
        manualDayKeys.has(profileCalendarState.selectedDateKey) &&
        !(catchesByDate.get(profileCalendarState.selectedDateKey) || []).length,
      manualDaysByDate.get(profileCalendarState.selectedDateKey)?.Megjegyzes || ""
    );
  } else {
    renderProfileCalendarDayDetails([], "", false, "");
  }
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
    renderProfileFishingCalendar(filtered, profileCalendarState.manualDays, {
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

  if (context !== "profile") {
    renderCatchCards(elements.list, filtered, { allowDelete });
  }
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

    const [data, fishingDays] = await Promise.all([
      apiRequest("/fogasnaplo/sajat"),
      apiRequest("/horgasznapok/sajat"),
    ]);
    catchCollections.own = Array.isArray(data) ? data : [];
    profileCalendarState.manualDays = normalizeFishingDayEntries(fishingDays);
    profileCalendarState.isOwnProfile = true;
    syncCatchFilterOptions("own", catchCollections.own);
    applyCatchFilters("own", {
      allowDelete: true,
      emptyMessage: "Még nincs rögzített fogásod.",
      filteredEmptyMessage: "Nincs a szűrésnek megfelelő fogás.",
    });
    bindProfileFishingCalendarControls();
    renderProfileFishingCalendar(catchCollections.own, profileCalendarState.manualDays, {
      isOwnProfile: true,
      keepMonth: true,
    });
  } catch (error) {
    console.error("Fog\u00E1sok bet\u00F6lt\u00E9si hiba:", error);
    clearElement(catchListContainer);
    catchCollections.own = [];
    profileCalendarState.manualDays = [];
    catchFilterPanelState.own = false;
    updateCatchFiltersVisibility("own");
    clearProfileFishingCalendar();
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



