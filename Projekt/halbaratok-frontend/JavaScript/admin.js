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
    reportsList.innerHTML = `<div class="section-text">Nincs megjeleníthető report.</div>`;
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
    showAdminFeedback(error.message || "Nem sikerült betölteni a reportokat.", "danger");
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
          ? "Hozzászólás"
          : "Téma";
    const targetTitle = reportSource === "marketplace" ? report.HirdetesCim : report.TemaCim;
    const relatedUserLabel =
      reportSource === "marketplace"
        ? `Hirdető: ${escapeHtml(report.HirdetoFelhasznalonev || "-")}`
        : report.CelFelhasznalonev
          ? `Érintett felhasználó: ${escapeHtml(report.CelFelhasznalonev)}`
          : "";
    const contentPreview =
      reportSource === "marketplace"
        ? ""
        : report.CelSzoveg
          ? `<div class="mt-3">${escapeHtml(report.CelSzoveg)}</div>`
          : "";

    detailBody.innerHTML = `
      <div class="app-list-item">
        <div class="fw-semibold mb-2">Reportoló felhasználó</div>
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
        <div class="fw-semibold mb-2">Report részletei</div>
        <div class="mb-2">Indok: ${escapeHtml(formatForumReportReason(report.IndokKod))}</div>
        <div>${escapeHtml(report.Reszletezes || "Nincs részletezés.")}</div>
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
    showAdminFeedback(error.message || "Nem sikerült megnyitni a reportot.", "danger");
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
    showAppAlert("Adj meg választ a reportoló felhasználónak.", { title: "Hiba" });
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
    await showAppSuccess("Az admin válasz sikeresen elküldve.");
  } catch (error) {
    showAdminFeedback(error.message || "Nem sikerült elküldeni a választ.", "danger");
  }
}

async function deleteAdminReport(reportSource, reportId) {
  if (!(await showAppConfirm("Biztosan törölni szeretnéd ezt a reportot?", { confirmLabel: "Törlés" }))) {
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
    await showAppSuccess("A report sikeresen törölve.");
  } catch (error) {
    showAdminFeedback(error.message || "Nem sikerült törölni a reportot.", "danger");
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
