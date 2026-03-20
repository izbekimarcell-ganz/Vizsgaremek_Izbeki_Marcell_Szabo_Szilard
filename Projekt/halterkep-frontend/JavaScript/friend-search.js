const FRIENDS_CONFIG = {
  apiBaseUrl: "http://localhost:4000/api",
};

const friendsFeatureState = {
  overview: null,
  notifications: [],
  reportNotifications: [],
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
      typeof data === "object" && data?.message ? data.message : "Hiba tortent a keres soran."
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

function getForumReasonLabel(reasonCode) {
  if (typeof formatForumReportReason === "function") {
    return formatForumReportReason(reasonCode);
  }

  const labels = {
    spam: "Spam vagy keretlen tartalom",
    offensive: "Serto vagy nem megfelelo tartalom",
    harassment: "Zaklatas vagy szemelyeskedes",
    misleading: "Felrevezeto informacio",
    off_topic: "Nem kapcsolodik a temahoz",
    other: "Egyeb",
  };

  return labels[reasonCode] || "Ismeretlen indok";
}

function ensureUserReportMessageModal() {
  let modalElement = document.getElementById("userReportMessageModal");

  if (!modalElement) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="modal fade" id="userReportMessageModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content app-card border-info-subtle">
            <div class="modal-header border-secondary-subtle">
              <h2 class="modal-title fs-5">Admin valasza</h2>
              <button type="button" class="btn-close admin-modal-close" data-bs-dismiss="modal" aria-label="Bezaras"></button>
            </div>
            <div class="modal-body">
              <div id="userReportMessageBody" class="d-grid gap-3"></div>
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
    bodyElement: modalElement.querySelector("#userReportMessageBody"),
  };
}

async function openAdminReportInbox(reportId) {
  const numericReportId = Number(reportId);

  if (!Number.isInteger(numericReportId) || numericReportId <= 0) {
    return;
  }

  sessionStorage.setItem("adminOpenForumReportId", String(numericReportId));

  if (document.body.dataset.page === "admin") {
    window.location.hash = "reports";
    if (typeof handleAdminTargetChange === "function") {
      await handleAdminTargetChange();
    }
    return;
  }

  window.location.href = "admin.html#reports";
}

async function openUserReportMessage(reportId) {
  const numericReportId = Number(reportId);

  if (!Number.isInteger(numericReportId) || numericReportId <= 0) {
    return;
  }

  try {
    const message = await friendsApiRequest(`/reports/messages/${numericReportId}`);
    const { bodyElement } = ensureUserReportMessageModal();

    if (!bodyElement) {
      return;
    }

    bodyElement.innerHTML = `
      <div class="app-list-item">
        <div class="fw-semibold mb-2">A te reportod</div>
        <div class="mb-2">Indok: ${escapeFriendsHtml(getForumReasonLabel(message.IndokKod))}</div>
        <div>${escapeFriendsHtml(message.Reszletezes || "Nem adtal meg tovabbi reszletezest.")}</div>
      </div>
      <div class="app-list-item">
        <div class="fw-semibold mb-2">Admin valasza</div>
        <div>${escapeFriendsHtml(message.AdminValasz || "-")}</div>
      </div>
    `;

    if (typeof bootstrap !== "undefined") {
      bootstrap.Modal.getOrCreateInstance(document.getElementById("userReportMessageModal")).show();
    }

    await loadFriendNotifications();
  } catch (error) {
    if (typeof showAppAlert === "function") {
      showAppAlert(error.message || "Nem sikerult megnyitni az uzenetet.", {
        title: "Hiba",
      });
    }
  }
}

async function deleteUserReportNotification(reportId) {
  const numericReportId = Number(reportId);

  if (!Number.isInteger(numericReportId) || numericReportId <= 0) {
    return;
  }

  const confirmed =
    typeof showAppConfirm === "function"
      ? await showAppConfirm("Biztosan torolni szeretned ezt az uzenetet?", {
          confirmLabel: "Torles",
        })
      : window.confirm("Biztosan torolni szeretned ezt az uzenetet?");

  if (!confirmed) {
    return;
  }

  try {
    await friendsApiRequest(`/reports/messages/${numericReportId}`, {
      method: "DELETE",
    });
    await loadFriendNotifications();
  } catch (error) {
    if (typeof showAppAlert === "function") {
      showAppAlert(error.message || "Nem sikerult torolni az uzenetet.", {
        title: "Hiba",
      });
    }
  }
}

function renderFriendsNav() {
  const navItem = document.querySelector(".friend-search-nav");

  if (!navItem) {
    return;
  }

  const user = getCurrentUserInfo();
  const isAdmin = typeof isAdminUser === "function" ? isAdminUser(user) : false;
  const loggedIn = typeof isLoggedIn === "function" ? isLoggedIn() : Boolean(user);

  if (!loggedIn) {
    navItem.classList.add("d-none");
    const notificationItem = document.getElementById("friendNotificationsNav");
    if (notificationItem) {
      notificationItem.remove();
    }
    return;
  }

  if (isAdmin) {
    navItem.classList.add("d-none");
  } else {
    navItem.classList.remove("d-none");
    navItem.innerHTML = `
      <a class="nav-link" href="baratok.html">Barátok</a>
    `;
  }

  let notificationItem = document.getElementById("friendNotificationsNav");
  if (notificationItem) {
    notificationItem.remove();
  }

  notificationItem = document.createElement("li");
  notificationItem.className = "nav-item ms-lg-2 mt-2 mt-lg-0 friend-notification-nav";
  notificationItem.id = "friendNotificationsNav";
  notificationItem.innerHTML = `
    <div class="dropdown" data-bs-auto-close="outside">
      <button
        class="btn btn-outline-light btn-sm friend-notification-toggle"
        id="friendNotificationsToggle"
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        aria-label="Ertesitesek"
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
      const actionButton = event.target.closest("[data-action]");

      if (!actionButton) {
        return;
      }

      const action = actionButton.dataset.action;

      if (action === "accept" || action === "reject") {
        const requestId = Number(actionButton.dataset.requestId);

        if (!Number.isInteger(requestId)) {
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
            showAppAlert(error.message || "Nem sikerult feldolgozni a baratkerelmet.", {
              title: "Hiba",
            });
          }
        }

        return;
      }

      if (action === "open-admin-report") {
        await openAdminReportInbox(actionButton.dataset.reportId);
        return;
      }

      if (action === "open-user-report-message") {
        await openUserReportMessage(actionButton.dataset.reportId);
        return;
      }

      if (action === "delete-user-report-message") {
        await deleteUserReportNotification(actionButton.dataset.reportId);
      }
    });
  }

  if (typeof setActiveNavLink === "function") {
    setActiveNavLink();
  }
}

function renderFriendNotifications(friendNotifications, reportNotifications) {
  const list = document.getElementById("friendNotificationsList");
  const count = document.getElementById("friendNotificationsCount");
  const user = getCurrentUserInfo();
  const isAdmin = typeof isAdminUser === "function" ? isAdminUser(user) : false;

  if (!list || !count) {
    return;
  }

  const friendItems = Array.isArray(friendNotifications) ? friendNotifications : [];
  const reportItems = Array.isArray(reportNotifications) ? reportNotifications : [];
  const unreadReportCount = isAdmin
    ? reportItems.length
    : reportItems.filter((item) => !item.FelhasznaloOlvastaValaszt).length;
  const pendingCount = friendItems.length + unreadReportCount;

  count.textContent = String(pendingCount);
  count.classList.toggle("d-none", pendingCount === 0);

  if (!friendItems.length && !reportItems.length) {
    list.innerHTML = `<div class="friend-notification-empty">Még nincs értesítésed.</div>`;
    return;
  }

  const friendMarkup = friendItems.map(
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
  );

  const reportMarkup = reportItems.map((item) => {
    if (isAdmin) {
      return `
        <div class="friend-notification-item">
          <div class="fw-semibold">Új fórum report</div>
          <div class="section-text small mb-3">${escapeFriendsHtml(new Date(item.Letrehozva).toLocaleString("hu-HU"))}</div>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-sm btn-outline-info" type="button" data-report-id="${Number(item.ForumReportId)}" data-action="open-admin-report">
              Megnyitás
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="friend-notification-item">
        <div class="fw-semibold">${item.FelhasznaloOlvastaValaszt ? "Üzenet" : "Új üzenet"}</div>
        <div class="section-text small mb-2">${escapeFriendsHtml(getForumReasonLabel(item.IndokKod))}</div>
        <div class="section-text small mb-3">${escapeFriendsHtml(new Date(item.AdminValaszLetrehozva || item.Letrehozva).toLocaleString("hu-HU"))}</div>
        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-sm btn-outline-info" type="button" data-report-id="${Number(item.ForumReportId)}" data-action="open-user-report-message">
            Megnyitás
          </button>
          <button class="btn btn-sm btn-outline-danger" type="button" data-report-id="${Number(item.ForumReportId)}" data-action="delete-user-report-message">
            Törlés
          </button>
        </div>
      </div>
    `;
  });

  list.innerHTML = [...friendMarkup, ...reportMarkup].join("");
}

async function loadFriendNotifications() {
  const notificationNav = document.getElementById("friendNotificationsNav");
  const user = getCurrentUserInfo();
  const isAdmin = typeof isAdminUser === "function" ? isAdminUser(user) : false;

  if (!notificationNav || (typeof isLoggedIn === "function" && !isLoggedIn())) {
    return;
  }

  try {
    const [friendNotifications, reportNotifications] = await Promise.all([
      isAdmin ? Promise.resolve([]) : friendsApiRequest("/friends/notifications"),
      isAdmin
        ? friendsApiRequest("/reports/admin/notifications")
        : friendsApiRequest("/reports/messages"),
    ]);

    friendsFeatureState.notifications = Array.isArray(friendNotifications)
      ? friendNotifications
      : [];
    friendsFeatureState.reportNotifications = Array.isArray(reportNotifications)
      ? reportNotifications
      : [];

    renderFriendNotifications(
      friendsFeatureState.notifications,
      friendsFeatureState.reportNotifications
    );
  } catch (error) {
    renderFriendNotifications([], []);
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
        Nincs megjelenitheto felhasznalo ebben a listaban.
      </div>
    `;
  } else {
    nonFriendsList.innerHTML = filteredNonFriends
      .map((user) => {
        const userId = Number(user.FelhasznaloId);
        const hasPendingSent = pendingSentIds.has(userId);
        const hasPendingReceived = pendingReceivedIds.has(userId);

        let buttonLabel = "Jeloles";
        let buttonClass = "btn-outline-info";
        let disabledAttr = "";

        if (hasPendingSent) {
          buttonLabel = "Kerelem elkuldve";
          buttonClass = "btn-secondary";
          disabledAttr = "disabled";
        } else if (hasPendingReceived) {
          buttonLabel = "Kerelem erkezett";
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
    renderFriendNotifications(
      overview.pendingReceived || friendsFeatureState.notifications,
      friendsFeatureState.reportNotifications
    );
  } catch (error) {
    if (document.body.dataset.page === "baratok" && typeof showAppAlert === "function") {
      showAppAlert(error.message || "Nem sikerult betolteni a baratok adatait.", {
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
