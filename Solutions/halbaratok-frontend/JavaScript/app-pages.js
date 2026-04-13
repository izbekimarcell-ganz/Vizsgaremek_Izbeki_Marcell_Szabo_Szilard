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
function getCatchCreateModalInstance() {
  const modalElement = $("#catchCreateModal");

  if (!modalElement || typeof bootstrap === "undefined") {
    return null;
  }

  return bootstrap.Modal.getOrCreateInstance(modalElement);
}

function formatCatchCreateSelectedDate(dateKey) {
  if (!dateKey) {
    return "Válassz napot a naptárból.";
  }

  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "Válassz napot a naptárból.";
  }

  return date.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function setCatchCreateSelectedDate(dateKey) {
  const normalizedDateKey =
    typeof normalizeDateKey === "function" ? normalizeDateKey(dateKey) : String(dateKey || "").trim();
  const selectedDateInput = $("#catchSelectedDate");
  const selectedDateLabel = $("#catchSelectedDateLabel");

  if (selectedDateInput) {
    selectedDateInput.value = normalizedDateKey || "";
  }

  if (selectedDateLabel) {
    selectedDateLabel.textContent = normalizedDateKey
      ? `Kiválasztott nap: ${formatCatchCreateSelectedDate(normalizedDateKey)}`
      : "Válassz napot a naptárból.";
  }
}

function getDefaultCatchTimeValue() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

const catchFormState = {
  mode: "create",
  editingCatchId: null,
};

function resetCatchFormState({ preserveSelectedDate = false } = {}) {
  const catchForm = $("#catchForm");
  const selectedDate = preserveSelectedDate ? $("#catchSelectedDate")?.value || "" : "";
  const modalTitle = $("#catchModalTitle");
  const editingIdInput = $("#catchEditingId");
  const existingImageUrlInput = $("#catchExistingImageUrl");
  const catchFormMessage = $("#catchFormMessage");
  const catchTimeInput = $("#catchDateTime");
  const saveCatchButton = $("#saveCatchButton");
  const resetCatchButton = $("#resetCatchButton");

  catchFormState.mode = "create";
  catchFormState.editingCatchId = null;

  if (catchForm) {
    catchForm.reset();
  }

  if (editingIdInput) {
    editingIdInput.value = "";
  }

  if (existingImageUrlInput) {
    existingImageUrlInput.value = "";
  }

  if (modalTitle) {
    modalTitle.textContent = "Új fogás";
  }

  if (saveCatchButton) {
    saveCatchButton.textContent = "Mentés";
  }

  if (resetCatchButton) {
    resetCatchButton.textContent = "Űrlap törlése";
  }

  if (catchFormMessage) {
    catchFormMessage.textContent = "";
    catchFormMessage.className = "small mt-3";
  }

  setCatchCreateSelectedDate(selectedDate);

  if (catchTimeInput && !catchTimeInput.value) {
    catchTimeInput.value = getDefaultCatchTimeValue();
  }
}

function openCatchCreateModal(dateKey) {
  const normalizedDateKey =
    typeof normalizeDateKey === "function" ? normalizeDateKey(dateKey) : String(dateKey || "").trim();

  if (!normalizedDateKey) {
    showAppAlert("Előbb válassz ki egy napot a naptárban.", { title: "Hiányzó nap" });
    return;
  }

  resetCatchFormState();
  setCatchCreateSelectedDate(normalizedDateKey);

  const catchTimeInput = $("#catchDateTime");
  const catchFormMessage = $("#catchFormMessage");

  if (catchTimeInput && !catchTimeInput.value) {
    catchTimeInput.value = getDefaultCatchTimeValue();
  }

  if (catchFormMessage) {
    catchFormMessage.textContent = "";
    catchFormMessage.className = "small mt-3";
  }

  const modalInstance = getCatchCreateModalInstance();
  if (modalInstance) {
    modalInstance.show();
  }
}

window.openCatchCreateModal = openCatchCreateModal;

function populateCatchFormForEdit(fogas) {
  const modalTitle = $("#catchModalTitle");
  const editingIdInput = $("#catchEditingId");
  const existingImageUrlInput = $("#catchExistingImageUrl");
  const waterbodySelect = $("#catchWaterbodyId");
  const speciesSelect = $("#catchSpeciesId");
  const catchTimeInput = $("#catchDateTime");
  const catchWeightInput = $("#catchWeight");
  const catchLengthInput = $("#catchLength");
  const catchNoteInput = $("#catchNote");
  const saveCatchButton = $("#saveCatchButton");
  const resetCatchButton = $("#resetCatchButton");
  const catchDate = new Date(fogas.FogasIdeje);
  const normalizedDateKey = typeof normalizeDateKey === "function"
    ? normalizeDateKey(catchDate)
    : catchDate.toISOString().slice(0, 10);

  catchFormState.mode = "edit";
  catchFormState.editingCatchId = Number(fogas.FogasId);

  if (modalTitle) {
    modalTitle.textContent = "Fogás szerkesztése";
  }

  if (editingIdInput) {
    editingIdInput.value = String(fogas.FogasId);
  }

  if (existingImageUrlInput) {
    existingImageUrlInput.value = fogas.FotoUrl || "";
  }

  if (waterbodySelect) {
    waterbodySelect.value = String(fogas.VizteruletId ?? "");
  }

  if (speciesSelect) {
    speciesSelect.value = String(fogas.HalfajId ?? "");
  }

  setCatchCreateSelectedDate(normalizedDateKey);

  if (catchTimeInput && !Number.isNaN(catchDate.getTime())) {
    catchTimeInput.value = `${String(catchDate.getHours()).padStart(2, "0")}:${String(catchDate.getMinutes()).padStart(2, "0")}`;
  }

  if (catchWeightInput) {
    catchWeightInput.value = fogas.SulyKg ?? "";
  }

  if (catchLengthInput) {
    catchLengthInput.value = fogas.HosszCm ?? "";
  }

  if (catchNoteInput) {
    catchNoteInput.value = fogas.Megjegyzes || "";
  }

  if (saveCatchButton) {
    saveCatchButton.textContent = "Szerkesztés mentése";
  }

  if (resetCatchButton) {
    resetCatchButton.textContent = "Eredeti adatok";
  }
}

async function editCatch(fogasId) {
  const targetId = Number(fogasId);
  const ownCatches = Array.isArray(catchCollections?.own) ? catchCollections.own : [];
  const fogas = ownCatches.find((item) => Number(item.FogasId) === targetId);

  if (!Number.isInteger(targetId) || targetId <= 0 || !fogas) {
    showAppAlert("A kiválasztott fogás nem található.", { title: "Hiba" });
    return;
  }

  resetCatchFormState();
  populateCatchFormForEdit(fogas);

  const modalInstance = getCatchCreateModalInstance();
  if (modalInstance) {
    modalInstance.show();
  }
}

window.editCatch = editCatch;

function prepareCatchLogPage() {
  const catchForm = $("#catchForm");
  const catchListContainer = $("#catchListContainer");
  const catchCreateModal = $("#catchCreateModal");

  if (!isLoggedIn()) {
    setPendingRedirect("fogasnaplo.html");
    window.location.href = "login.html";
    return;
  }

  if (catchForm) {
    catchForm.addEventListener("submit", handleAddCatch);
  }

  if (catchCreateModal && catchCreateModal.dataset.bound !== "true") {
    catchCreateModal.addEventListener("hidden.bs.modal", () => {
      resetCatchFormState();
    });
    catchCreateModal.dataset.bound = "true";
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
  let fotoUrl = $("#catchExistingImageUrl")?.value || null;
  const isEditing = catchFormState.mode === "edit" && Number.isInteger(catchFormState.editingCatchId);

  try {
    const uploadedImage = await getImageDataUrlFromInput(
      form.querySelector("#catchImage"),
      "A fogás képe"
    );
    if (uploadedImage) {
      fotoUrl = uploadedImage;
    }
  } catch (error) {
    showAppAlert(error.message, { title: "Hiba" });
    return;
  }
  
  const selectedDateKey = $("#catchSelectedDate")?.value || "";
  const timeValue = form.querySelector("#catchDateTime")?.value || "";
  const fogasIdeje =
    document.body.dataset.page === "fogasnaplo"
      ? (selectedDateKey && timeValue ? `${selectedDateKey}T${timeValue}` : "")
      : form.querySelector("#catchDateTime")?.value;

  const catchData = {
    halfajId: parseInt(form.querySelector("#catchSpeciesId")?.value),
    vizteruletId: parseInt(form.querySelector("#catchWaterbodyId")?.value),
    fogasIdeje,
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
    await apiRequest(isEditing ? `/fogasnaplo/${catchFormState.editingCatchId}` : "/fogasnaplo", {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(catchData),
    });

    await showAppSuccess(isEditing ? "Fogás sikeresen frissítve!" : "Fogás sikeresen rögzítve!");
    resetCatchFormState();
    const modalInstance = getCatchCreateModalInstance();
    if (modalInstance) {
      modalInstance.hide();
    }
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
                  aria-label="Téma bejelentése"
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
    showAppAlert("A bejelentés küldéséhez be kell jelentkezned.", { title: "Bejelentkezés szükséges" });
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
    showAppAlert("Válassz bejelentési indokot, mielőtt elküldöd a jelentést.", { title: "Hiba" });
    return;
  }

  if (reasonCode === "other" && details.length < 3) {
    showAppAlert("Az Egyéb indoknál add meg a részletezést is.", { title: "Hiba" });
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
    await showAppSuccess("A bejelentés sikeresen elküldve.");
  } catch (error) {
    showAppAlert(error.message || "Nem sikerült elküldeni a bejelentést.", { title: "Hiba" });
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
                  aria-label="Hozzászólás bejelentése"
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

