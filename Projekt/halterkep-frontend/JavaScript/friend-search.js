const FRIENDS_CONFIG = {
  apiBaseUrl: "http://localhost:4000/api",
};

const friendsFeatureState = {
  overview: null,
  notifications: [],
};

function getFriendsAuthHeaders() {
  if (typeof getAuthHeaders === "function") {
    return getAuthHeaders();
  }

  const token =
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function friendsApiRequest(endpoint, options = {}) {
  const response = await fetch(`${FRIENDS_CONFIG.apiBaseUrl}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...getFriendsAuthHeaders(),
      ...(options.headers || {}),
    },
    body: options.body,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(
      typeof data === "object" && data?.message ? data.message : "Hiba történt a kérés során."
    );
  }

  return data;
}

function escapeFriendsHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getCurrentUserInfo() {
  if (typeof getStoredUser === "function") {
    return getStoredUser();
  }

  const rawUser = localStorage.getItem("authUser") || sessionStorage.getItem("authUser");

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    return null;
  }
}

function openFriendProfile(userId) {
  const numericUserId = Number(userId);

  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    return;
  }

  sessionStorage.setItem("viewedProfileUserId", String(numericUserId));
  window.location.href = `profil.html?userId=${numericUserId}`;
}

function renderFriendsNav() {
  const navItem = document.querySelector(".friend-search-nav");

  if (!navItem) {
    return;
  }

  const user = getCurrentUserInfo();
  const isAdmin = typeof isAdminUser === "function" ? isAdminUser(user) : false;
  const loggedIn = typeof isLoggedIn === "function" ? isLoggedIn() : Boolean(user);

  if (isAdmin || !loggedIn) {
    navItem.classList.add("d-none");
    const notificationItem = document.getElementById("friendNotificationsNav");
    if (notificationItem) {
      notificationItem.remove();
    }
    return;
  }

  navItem.classList.remove("d-none");
  navItem.innerHTML = `
    <a class="nav-link" href="baratok.html">Barátok</a>
  `;

  let notificationItem = document.getElementById("friendNotificationsNav");
  if (notificationItem) {
    notificationItem.remove();
  }

  notificationItem = document.createElement("li");
  notificationItem.className = `nav-item ms-lg-2 mt-2 mt-lg-0 friend-notification-nav${loggedIn ? "" : " d-none"}`;
  notificationItem.id = "friendNotificationsNav";
  notificationItem.innerHTML = `
    <div class="dropdown" data-bs-auto-close="outside">
      <button
        class="btn btn-outline-light btn-sm friend-notification-toggle"
        id="friendNotificationsToggle"
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        aria-label="Értesítések"
      >
        <span class="friend-notification-icon">🔔</span>
        <span id="friendNotificationsCount" class="friend-notification-count d-none">0</span>
      </button>
      <div class="dropdown-menu dropdown-menu-end friend-notification-menu p-0" aria-labelledby="friendNotificationsToggle">
        <div class="friend-notification-header">Értesítések</div>
        <div id="friendNotificationsList" class="friend-notification-list">
          <div class="friend-notification-empty">Még nincs értesítésed.</div>
        </div>
      </div>
    </div>
  `;

  const logoutNavItem = document.getElementById("logoutNavItem");
  const navbarMenu = document.getElementById("navbarMenu");

  if (logoutNavItem?.parentElement) {
    logoutNavItem.parentElement.insertBefore(notificationItem, logoutNavItem);
  } else if (navbarMenu) {
    navbarMenu.appendChild(notificationItem);
  } else {
    navItem.insertAdjacentElement("afterend", notificationItem);
  }

  const toggleButton = notificationItem.querySelector("#friendNotificationsToggle");
  if (toggleButton) {
    toggleButton.addEventListener("click", () => {
      loadFriendNotifications();
    });
  }

  const list = notificationItem.querySelector("#friendNotificationsList");
  if (list) {
    list.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-request-id][data-action]");

      if (!button) {
        return;
      }

      const requestId = Number(button.dataset.requestId);
      const action = button.dataset.action;

      if (!Number.isInteger(requestId) || !action) {
        return;
      }

      const confirmMessage =
        action === "accept"
          ? "Biztosan elfogadod ezt a barátkérelmet?"
          : "Biztosan elutasítod ezt a barátkérelmet?";

      const isConfirmed =
        typeof showAppConfirm === "function"
          ? await showAppConfirm(confirmMessage, {
              confirmLabel: action === "accept" ? "Elfogadás" : "Elutasítás",
              confirmButtonClass: action === "accept" ? "btn-success" : "btn-danger",
            })
          : window.confirm(confirmMessage);

      if (!isConfirmed) {
        return;
      }

      try {
        await friendsApiRequest(`/friends/requests/${requestId}/respond`, {
          method: "PUT",
          body: JSON.stringify({ action }),
        });

        if (typeof showAppSuccess === "function") {
          await showAppSuccess(
            action === "accept"
              ? "A barátkérelem sikeresen elfogadva."
              : "A barátkérelem sikeresen elutasítva."
          );
        }

        await Promise.all([loadFriendNotifications(), refreshFriendsOverviewIfNeeded()]);
      } catch (error) {
        if (typeof showAppAlert === "function") {
          showAppAlert(error.message || "Nem sikerült feldolgozni a barátkérelmet.", {
            title: "Hiba",
          });
        }
      }
    });
  }

  if (typeof setActiveNavLink === "function") {
    setActiveNavLink();
  }
}

function renderFriendNotifications(notifications) {
  const list = document.getElementById("friendNotificationsList");
  const count = document.getElementById("friendNotificationsCount");

  if (!list || !count) {
    return;
  }

  const items = Array.isArray(notifications) ? notifications : [];
  const pendingCount = items.length;

  count.textContent = String(pendingCount);
  count.classList.toggle("d-none", pendingCount === 0);

  if (!pendingCount) {
    list.innerHTML = `<div class="friend-notification-empty">Még nincs értesítésed.</div>`;
    return;
  }

  list.innerHTML = items
    .map(
      (item) => `
        <div class="friend-notification-item">
          <div class="fw-semibold">${escapeFriendsHtml(item.Felhasznalonev)}</div>
          <div class="section-text small mb-3">barátkérelmet küldött neked.</div>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-sm btn-success" type="button" data-request-id="${Number(item.BaratKerelemId)}" data-action="accept">
              Elfogadás
            </button>
            <button class="btn btn-sm btn-outline-danger" type="button" data-request-id="${Number(item.BaratKerelemId)}" data-action="reject">
              Elutasítás
            </button>
          </div>
        </div>
      `
    )
    .join("");
}

async function loadFriendNotifications() {
  const notificationNav = document.getElementById("friendNotificationsNav");

  if (!notificationNav || (typeof isLoggedIn === "function" && !isLoggedIn())) {
    return;
  }

  try {
    const notifications = await friendsApiRequest("/friends/notifications");
    friendsFeatureState.notifications = Array.isArray(notifications) ? notifications : [];
    renderFriendNotifications(friendsFeatureState.notifications);
  } catch (error) {
    renderFriendNotifications([]);
  }
}

function filterUsersByQuery(users, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();

  if (!normalizedQuery) {
    return Array.isArray(users) ? users : [];
  }

  return (Array.isArray(users) ? users : []).filter((user) =>
    String(user.Felhasznalonev || "").toLowerCase().includes(normalizedQuery)
  );
}

function renderFriendsPageLists() {
  if (document.body.dataset.page !== "baratok") {
    return;
  }

  const nonFriendsList = document.getElementById("friendsNonFriendsList");
  const friendsList = document.getElementById("friendsList");
  const nonFriendsCount = document.getElementById("friendsNonFriendsCount");
  const friendsCount = document.getElementById("friendsListCount");
  const searchInput = document.getElementById("friendsSearchInputPage");

  if (!nonFriendsList || !friendsList || !nonFriendsCount || !friendsCount) {
    return;
  }

  const overview = friendsFeatureState.overview || {};
  const query = searchInput?.value || "";
  const filteredNonFriends = filterUsersByQuery(overview.nonFriends, query);
  const filteredFriends = filterUsersByQuery(overview.friends, query);
  const pendingSentIds = new Set(overview.pendingSentUserIds || []);
  const pendingReceivedIds = new Set(overview.pendingReceivedUserIds || []);

  nonFriendsCount.textContent = String(filteredNonFriends.length);
  friendsCount.textContent = String(filteredFriends.length);

  if (!filteredNonFriends.length) {
    nonFriendsList.innerHTML = `
      <div class="friend-list-empty">
        Nincs megjeleníthető felhasználó ebben a listában.
      </div>
    `;
  } else {
    nonFriendsList.innerHTML = filteredNonFriends
      .map((user) => {
        const userId = Number(user.FelhasznaloId);
        const hasPendingSent = pendingSentIds.has(userId);
        const hasPendingReceived = pendingReceivedIds.has(userId);

        let buttonLabel = "Jelölés";
        let buttonClass = "btn-outline-info";
        let disabledAttr = "";

        if (hasPendingSent) {
          buttonLabel = "Kérelem elküldve";
          buttonClass = "btn-secondary";
          disabledAttr = "disabled";
        } else if (hasPendingReceived) {
          buttonLabel = "Kérelem érkezett";
          buttonClass = "btn-secondary";
          disabledAttr = "disabled";
        }

        return `
          <div class="friend-user-card">
            <div class="fw-semibold">${escapeFriendsHtml(user.Felhasznalonev)}</div>
            <div class="d-flex gap-2 flex-wrap">
              <button
                class="btn btn-sm btn-outline-light"
                type="button"
                data-open-profile-id="${userId}"
              >
                Megnyitás
              </button>
              <button
                class="btn btn-sm ${buttonClass}"
                type="button"
                data-target-user-id="${userId}"
                ${disabledAttr}
              >
                ${buttonLabel}
              </button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  if (!filteredFriends.length) {
    friendsList.innerHTML = `
      <div class="friend-list-empty">
        Még nincs elfogadott barátod.
      </div>
    `;
  } else {
    friendsList.innerHTML = filteredFriends
      .map(
        (user) => `
          <div class="friend-user-card is-friend">
            <div class="fw-semibold">${escapeFriendsHtml(user.Felhasznalonev)}</div>
            <div class="d-flex gap-2 flex-wrap">
              <button
                class="btn btn-sm btn-outline-light"
                type="button"
                data-open-profile-id="${Number(user.FelhasznaloId)}"
              >
                Megnyitás
              </button>
              <button
                class="btn btn-sm btn-outline-danger"
                type="button"
                data-remove-friend-id="${Number(user.FelhasznaloId)}"
              >
                Törlés
              </button>
            </div>
          </div>
        `
      )
      .join("");
  }
}

async function loadFriendsOverview() {
  if (typeof isLoggedIn === "function" && !isLoggedIn()) {
    return;
  }

  try {
    const overview = await friendsApiRequest("/friends/overview");
    friendsFeatureState.overview = overview;
    renderFriendsPageLists();
    renderFriendNotifications(overview.pendingReceived || friendsFeatureState.notifications);
  } catch (error) {
    if (document.body.dataset.page === "baratok" && typeof showAppAlert === "function") {
      showAppAlert(error.message || "Nem sikerült betölteni a barátok adatait.", {
        title: "Hiba",
      });
    }
  }
}

async function refreshFriendsOverviewIfNeeded() {
  await loadFriendsOverview();
}

function initializeFriendsPage() {
  if (document.body.dataset.page !== "baratok") {
    return;
  }

  const user = getCurrentUserInfo();
  const isAdmin = typeof isAdminUser === "function" ? isAdminUser(user) : false;

  if (isAdmin) {
    window.location.href = "admin.html";
    return;
  }

  if (typeof isLoggedIn === "function" && !isLoggedIn()) {
    if (typeof setPendingRedirect === "function") {
      setPendingRedirect("baratok.html");
    }
    window.location.href = "login.html";
    return;
  }

  const searchInput = document.getElementById("friendsSearchInputPage");
  const nonFriendsList = document.getElementById("friendsNonFriendsList");
  const friendsList = document.getElementById("friendsList");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderFriendsPageLists();
    });
  }

  if (nonFriendsList) {
    nonFriendsList.addEventListener("click", async (event) => {
      const openProfileButton = event.target.closest("[data-open-profile-id]");

      if (openProfileButton) {
        openFriendProfile(openProfileButton.dataset.openProfileId);
        return;
      }

      const button = event.target.closest("[data-target-user-id]");

      if (!button || button.disabled) {
        return;
      }

      const targetUserId = Number(button.dataset.targetUserId);

      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return;
      }

      try {
        await friendsApiRequest("/friends/requests", {
          method: "POST",
          body: JSON.stringify({ targetUserId }),
        });

        if (typeof showAppSuccess === "function") {
          await showAppSuccess("A barátkérelem sikeresen elküldve.");
        }

        await Promise.all([loadFriendsOverview(), loadFriendNotifications()]);
      } catch (error) {
        if (typeof showAppAlert === "function") {
          showAppAlert(error.message || "Nem sikerült elküldeni a barátkérelmet.", {
            title: "Hiba",
          });
        }
      }
    });
  }

  if (friendsList) {
    friendsList.addEventListener("click", async (event) => {
      const openProfileButton = event.target.closest("[data-open-profile-id]");

      if (openProfileButton) {
        openFriendProfile(openProfileButton.dataset.openProfileId);
        return;
      }

      const removeButton = event.target.closest("[data-remove-friend-id]");

      if (!removeButton) {
        return;
      }

      const targetUserId = Number(removeButton.dataset.removeFriendId);

      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return;
      }

      const confirmed =
        typeof showAppConfirm === "function"
          ? await showAppConfirm("Biztosan törölni szeretnéd ezt a barátot?", {
              confirmLabel: "Törlés",
            })
          : window.confirm("Biztosan törölni szeretnéd ezt a barátot?");

      if (!confirmed) {
        return;
      }

      try {
        await friendsApiRequest(`/friends/relations/${targetUserId}`, {
          method: "DELETE",
        });

        if (typeof showAppSuccess === "function") {
          await showAppSuccess("A barát sikeresen törölve lett.");
        }

        await Promise.all([loadFriendsOverview(), loadFriendNotifications()]);
      } catch (error) {
        if (typeof showAppAlert === "function") {
          showAppAlert(error.message || "Nem sikerült törölni a barátot.", {
            title: "Hiba",
          });
        }
      }
    });
  }

  loadFriendsOverview();
}

function initializeFriendsFeature() {
  renderFriendsNav();
  initializeFriendsPage();

  if (typeof isLoggedIn === "function" && isLoggedIn()) {
    loadFriendNotifications();
  }
}

document.addEventListener("DOMContentLoaded", initializeFriendsFeature);

