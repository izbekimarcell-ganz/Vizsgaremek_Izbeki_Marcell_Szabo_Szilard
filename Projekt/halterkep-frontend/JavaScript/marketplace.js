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
      document.title = "HalBarátok - Hirdetés szerkesztése";
    } else {
      if (pageTitle) {
        pageTitle.textContent = "Új hirdetés feladása";
      }
      if (pageSubtitle) {
        pageSubtitle.textContent = "Adj fel új hirdetést a piactérre.";
      }
      document.title = "HalBarátok - Hirdetésfeladás";
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

          const confirmed = await showAppConfirm("Biztosan törölni szeretnéd ezt a hirdetést?", {
            confirmLabel: "Törlés",
          });
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
