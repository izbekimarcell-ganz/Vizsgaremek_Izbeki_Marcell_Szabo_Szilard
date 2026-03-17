const FRIEND_SEARCH_CONFIG = {
  apiBaseUrl: "http://localhost:4000/api",
  minChars: 1,
  debounceMs: 250,
};

function initializeFriendSearch() {
  const container = document.querySelector("#friendSearchContainer");
  const toggleButton = document.querySelector("#friendSearchToggle");
  const input = document.querySelector("#friendSearchInput");
  const results = document.querySelector("#friendSearchResults");

  if (!container || !toggleButton || !input || !results) {
    return;
  }

  let debounceTimer = null;

  function closeSearch() {
    container.classList.remove("is-open");
    input.value = "";
    clearResults();
  }

  function clearResults() {
    results.innerHTML = "";
    results.classList.add("d-none");
  }

  function openUserProfile(userId) {
    if (!Number.isInteger(userId) || userId <= 0) {
      return;
    }

    sessionStorage.setItem("viewedProfileUserId", String(userId));
    window.location.href = `profil.html?userId=${userId}`;
  }

  function renderPanel(contentHtml) {
    results.innerHTML = contentHtml;
    results.classList.remove("d-none");
  }

  function renderHint() {
    renderPanel('<li class="friend-search-empty">Kezdj el gépelni a kereséshez.</li>');
  }

  function renderEmpty() {
    renderPanel('<li class="friend-search-empty">nincs ilyen felhasznalo</li>');
  }

  function renderUsers(users) {
    if (!Array.isArray(users) || users.length === 0) {
      renderEmpty();
      return;
    }

    const itemsHtml = users
      .map((user) => {
        const userId = Number(user.FelhasznaloId);
        const username = escapeFriendSearchHtml(user.Felhasznalonev || "");

        if (!Number.isFinite(userId)) {
          return `<li class="friend-search-item">${username}</li>`;
        }

        return `
          <li class="friend-search-item">
            <button
              class="friend-search-result-button"
              type="button"
              data-user-id="${userId}"
              aria-label="${username} profiljanak megnyitasa"
            >
              ${username}
            </button>
          </li>
        `;
      })
      .join("");

    renderPanel(itemsHtml);
  }

  async function searchUsers(query) {
    try {
      const endpoint = `${FRIEND_SEARCH_CONFIG.apiBaseUrl}/users/search?query=${encodeURIComponent(query)}`;
      const response = await fetch(endpoint);
      const data = await response.json();

      if (!response.ok) {
        throw new Error("Keresesi hiba.");
      }

      renderUsers(data);
    } catch (error) {
      renderEmpty();
    }
  }

  toggleButton.addEventListener("click", () => {
    container.classList.toggle("is-open");

    if (container.classList.contains("is-open")) {
      input.focus();
      renderHint();
      return;
    }

    closeSearch();
  });

  input.addEventListener("input", () => {
    const query = input.value.trim();

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (query.length < FRIEND_SEARCH_CONFIG.minChars) {
      if (container.classList.contains("is-open")) {
        renderHint();
      } else {
        clearResults();
      }
      return;
    }

    debounceTimer = setTimeout(() => {
      searchUsers(query);
    }, FRIEND_SEARCH_CONFIG.debounceMs);
  });

  document.addEventListener("click", (event) => {
    if (!container.contains(event.target)) {
      closeSearch();
    }
  });

  results.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-user-id]");

    if (!trigger) {
      return;
    }

    const userId = Number(trigger.dataset.userId);
    openUserProfile(userId);
  });
}

function escapeFriendSearchHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

document.addEventListener("DOMContentLoaded", initializeFriendSearch);
