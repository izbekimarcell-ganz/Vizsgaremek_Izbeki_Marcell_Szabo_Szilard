const FRIENDS_CONFIG = {
  apiBaseUrl: "http://localhost:4000/api",
};

const sharedApp = window.HalBaratokShared || {};

const friendsFeatureState = {
  overview: null,
  notifications: [],
  reportNotifications: [],
  friendMessages: [],
  marketplaceMessages: [],
  systemNotifications: [],
  activeMessageContext: null,
};

const getFriendsAuthHeaders = sharedApp.getAuthHeaders || function getFriendsAuthHeadersFallback() {
  const token =
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  return token ? { Authorization: `Bearer ${token}` } : {};
};

const friendsApiRequest = sharedApp.apiRequest || async function friendsApiRequestFallback(endpoint, options = {}) {
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
};

const escapeFriendsHtml = sharedApp.escapeHtml || function escapeFriendsHtmlFallback(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const getCurrentUserInfo = sharedApp.getStoredUser || function getCurrentUserInfoFallback() {
  const rawUser = localStorage.getItem("authUser") || sessionStorage.getItem("authUser");

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    return null;
  }
};

const friendsShowAlert = sharedApp.showAppAlert || function friendsShowAlertFallback() {
  return Promise.resolve(true);
};

const friendsShowSuccess = sharedApp.showAppSuccess || function friendsShowSuccessFallback() {
  return Promise.resolve(true);
};

const friendsShowConfirm = sharedApp.showAppConfirm || function friendsShowConfirmFallback() {
  return Promise.resolve(false);
};

const friendsShowTextPrompt = sharedApp.showAppTextPrompt || function friendsShowTextPromptFallback() {
  return Promise.resolve(null);
};

function openFriendProfile(userId) {
  const numericUserId = Number(userId);

  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    return;
  }

  if (typeof sharedApp.openProfileByUserId === "function") {
    sharedApp.openProfileByUserId(numericUserId);
    return;
  }

  sessionStorage.setItem("viewedProfileUserId", String(numericUserId));
  window.location.href = `profil.html?userId=${numericUserId}`;
}

const getForumReasonLabel = sharedApp.formatForumReportReason || function getForumReasonLabelFallback(reasonCode) {
  const labels = {
    spam: "Spam vagy kéretlen tartalom",
    offensive: "Sértő vagy nem megfelelő tartalom",
    harassment: "Zaklatás vagy személyeskedés",
    misleading: "Félrevezető információ",
    off_topic: "Nem kapcsolódik a témához",
    other: "Egyéb",
  };

  return labels[reasonCode] || "Ismeretlen indok";
};

function ensureUserReportMessageModal() {
  let modalElement = document.getElementById("userReportMessageModal");

  if (!modalElement) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="modal fade" id="userReportMessageModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content app-card border-info-subtle">
            <div class="modal-header border-secondary-subtle">
              <h2 class="modal-title fs-5">Üzenet részletei</h2>
              <button type="button" class="btn-close admin-modal-close" data-bs-dismiss="modal" aria-label="Bezárás"></button>
            </div>
            <div class="modal-body">
              <div id="userReportMessageBody" class="d-grid gap-3"></div>
              <div id="userReportMessageReplySection" class="mt-3 d-none">
                <label class="form-label" for="userReportMessageReplyText">Válasz</label>
                <textarea id="userReportMessageReplyText" class="form-control app-input" rows="4" maxlength="2000"></textarea>
                <div id="userReportMessageError" class="text-danger small mt-2 d-none"></div>
              </div>
            </div>
            <div class="modal-footer border-secondary-subtle">
              <button
                type="button"
                id="userReportMessageReplyButton"
                class="btn btn-primary d-none"
              >
                Válasz küldése
              </button>
              <button
                type="button"
                id="userReportMessageJumpButton"
                class="btn btn-outline-info d-none"
              >
                Hirdetés megnyitása
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    modalElement = wrapper.firstElementChild;
    document.body.appendChild(modalElement);
  }

  const replyButton = modalElement.querySelector("#userReportMessageReplyButton");

  if (replyButton && replyButton.dataset.bound !== "true") {
    replyButton.addEventListener("click", sendActiveConversationReply);
    replyButton.dataset.bound = "true";
  }

  return {
    modalElement,
    bodyElement: modalElement.querySelector("#userReportMessageBody"),
    replySection: modalElement.querySelector("#userReportMessageReplySection"),
    replyText: modalElement.querySelector("#userReportMessageReplyText"),
    errorElement: modalElement.querySelector("#userReportMessageError"),
    replyButton,
    jumpButton: modalElement.querySelector("#userReportMessageJumpButton"),
  };
}

function setUserReportMessageError(message = "") {
  const { errorElement } = ensureUserReportMessageModal();

  if (!errorElement) {
    return;
  }

  errorElement.textContent = message;
  errorElement.classList.toggle("d-none", !message);
}

function renderMarketplaceConversationMarkup(detail) {
  const messages = Array.isArray(detail?.Uzenetek) ? detail.Uzenetek : [];

  return `
    <div class="app-list-item">
      <div class="fw-semibold mb-2">Hirdetés</div>
      <div>${escapeFriendsHtml(detail?.HirdetesCim || "-")}</div>
      <div class="small section-text mt-2">Beszélgetés partner: ${escapeFriendsHtml(detail?.MasikFelhasznalonev || "-")}</div>
    </div>
    <div class="d-grid gap-2">
      ${messages
        .map(
          (message) => `
            <div class="app-list-item${message.SajatUzenet ? " border-primary-subtle" : ""}">
              <div class="d-flex justify-content-between align-items-center gap-2 mb-2 flex-wrap">
                <div class="fw-semibold">${escapeFriendsHtml(message.SajatUzenet ? "Te" : (message.KuldoFelhasznalonev || detail?.MasikFelhasznalonev || "Felhasználó"))}</div>
                <div class="small section-text">${escapeFriendsHtml(new Date(message.Letrehozva).toLocaleString("hu-HU"))}</div>
              </div>
              <div>${escapeFriendsHtml(message.UzenetSzoveg || "-")}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderFriendConversationMarkup(detail) {
  const messages = Array.isArray(detail?.Uzenetek) ? detail.Uzenetek : [];

  return `
    <div class="app-list-item">
      <div class="fw-semibold mb-2">Ismerős beszélgetés</div>
      <div>Beszélgetés partner: ${escapeFriendsHtml(detail?.MasikFelhasznalonev || "-")}</div>
    </div>
    <div class="d-grid gap-2">
      ${messages
        .map(
          (message) => `
            <div class="app-list-item${message.SajatUzenet ? " border-primary-subtle" : ""}">
              <div class="d-flex justify-content-between align-items-center gap-2 mb-2 flex-wrap">
                <div class="fw-semibold">${escapeFriendsHtml(message.SajatUzenet ? "Te" : (message.KuldoFelhasznalonev || detail?.MasikFelhasznalonev || "Felhasználó"))}</div>
                <div class="small section-text">${escapeFriendsHtml(new Date(message.Letrehozva).toLocaleString("hu-HU"))}</div>
              </div>
              <div>${escapeFriendsHtml(message.UzenetSzoveg || "-")}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

async function sendActiveConversationReply() {
  const context = friendsFeatureState.activeMessageContext;
  const { replyText } = ensureUserReportMessageModal();
  const message = replyText?.value.trim() || "";

  if (!context || !["marketplace-message", "friend-message"].includes(context.source)) {
    return;
  }

  if (message.length < 3) {
    setUserReportMessageError("Az üzenet legalább 3 karakter legyen.");
    return;
  }

  try {
    const endpoint =
      context.source === "friend-message"
        ? `/friends/messages/${Number(context.id)}/reply`
        : `/marketplace/messages/${Number(context.id)}/reply`;

    await friendsApiRequest(endpoint, {
      method: "POST",
      body: JSON.stringify({ uzenet: message }),
    });

    await openUserReportMessage(context.id, context.source);
    await loadFriendNotifications();
    await loadUserMessagesPage();
    if (typeof showAppSuccess === "function") {
      await showAppSuccess("Az üzenet sikeresen elküldve.");
    }
  } catch (error) {
    setUserReportMessageError(error.message || "Nem sikerült elküldeni az üzenetet.");
  }
}

async function openAdminReportInbox(reportId, source = "forum") {
  const numericReportId = Number(reportId);

  if (!Number.isInteger(numericReportId) || numericReportId <= 0) {
    return;
  }

  sessionStorage.setItem("adminOpenReportId", String(numericReportId));
  sessionStorage.setItem("adminOpenReportSource", source === "marketplace" ? "marketplace" : "forum");

  if (document.body.dataset.page === "admin") {
    window.location.hash = "reports";
    if (typeof handleAdminTargetChange === "function") {
      await handleAdminTargetChange();
    }
    return;
  }

  window.location.href = "admin.html#reports";
}

async function openUserReportMessage(reportId, source = "forum") {
  const numericReportId = Number(reportId);

  if (!Number.isInteger(numericReportId) || numericReportId <= 0) {
    return;
  }

  try {
    const endpoint =
      source === "marketplace-report"
        ? "/marketplace/reports/messages/" + numericReportId
        : source === "friend-message"
          ? "/friends/messages/" + numericReportId
        : source === "marketplace-message"
          ? "/marketplace/messages/" + numericReportId
          : source === "system-notification"
            ? "/notifications/" + numericReportId
            : "/reports/messages/" + numericReportId;
    const message = await friendsApiRequest(endpoint);
    const {
      bodyElement,
      jumpButton,
      replySection,
      replyText,
      replyButton,
    } = ensureUserReportMessageModal();

    if (!bodyElement) {
      return;
    }

    friendsFeatureState.activeMessageContext = {
      id: numericReportId,
      source,
    };

    if (jumpButton) {
      const jumpUrl = message.UgrasUrl || message.HivatkozasUrl;

      if (jumpUrl) {
        jumpButton.classList.remove("d-none");
        jumpButton.onclick = () => {
          window.location.href = jumpUrl;
        };
      } else {
        jumpButton.classList.add("d-none");
        jumpButton.onclick = null;
      }
    }

    if (replySection && replyText && replyButton) {
      const canReply = source === "marketplace-message" || source === "friend-message";
      replySection.classList.toggle("d-none", !canReply);
      replyButton.classList.toggle("d-none", !canReply);
      replyText.value = "";
      replyText.disabled = !canReply;
      replyButton.disabled = !canReply;
      setUserReportMessageError("");
    }

    if (source === "marketplace-message") {
      bodyElement.innerHTML = renderMarketplaceConversationMarkup(message);
    } else if (source === "friend-message") {
      bodyElement.innerHTML = renderFriendConversationMarkup(message);
    } else if (source === "system-notification") {
      bodyElement.innerHTML =         '<div class="app-list-item">' +
          '<div class="fw-semibold mb-2">' + escapeFriendsHtml(message.Cim || 'Ertesites') + '</div>' +
          '<div>' + escapeFriendsHtml(message.Szoveg || '-') + '</div>' +
          '<div class="small section-text mt-2">' + escapeFriendsHtml(new Date(message.Letrehozva).toLocaleString('hu-HU')) + '</div>' +
        '</div>';
    } else {
      const targetTitle =
        source === "marketplace-report" ? message.HirdetesCim || "-" : getForumReasonLabel(message.IndokKod);
      bodyElement.innerHTML =         '<div class="app-list-item">' +
          '<div class="fw-semibold mb-2">A te bejelentésed</div>' +
          (source === 'marketplace-report'
            ? '<div class="mb-2">Hirdetés: ' + escapeFriendsHtml(targetTitle) + '</div>'
            : '<div class="mb-2">Indok: ' + escapeFriendsHtml(getForumReasonLabel(message.IndokKod)) + '</div>') +
          '<div>' + escapeFriendsHtml(message.Reszletezes || 'Nem adtál meg további részletezést.') + '</div>' +
        '</div>' +
        '<div class="app-list-item">' +
          '<div class="fw-semibold mb-2">Adminisztrátori válasz</div>' +
          '<div>' + escapeFriendsHtml(message.AdminValasz || '-') + '</div>' +
        '</div>';
    }

    if (typeof bootstrap !== "undefined") {
      bootstrap.Modal.getOrCreateInstance(document.getElementById("userReportMessageModal")).show();
    }

    await loadFriendNotifications();
    await loadUserMessagesPage();
  } catch (error) {
    if (typeof showAppAlert === "function") {
      showAppAlert(error.message || "Nem sikerült megnyitni az üzenetet.", {
        title: "Hiba",
      });
    }
  }
}

async function deleteUserReportNotification(reportId, source = "forum") {
  const numericReportId = Number(reportId);

  if (!Number.isInteger(numericReportId) || numericReportId <= 0) {
    return;
  }

  const confirmed = await friendsShowConfirm("Biztosan törölni szeretnéd ezt az üzenetet?", {
    confirmLabel: "Törlés",
  });

  if (!confirmed) {
    return;
  }

  try {
    const endpoint =
      source === "marketplace-report"
        ? "/marketplace/reports/messages/" + numericReportId
        : source === "friend-message"
          ? "/friends/messages/" + numericReportId
        : source === "marketplace-message"
          ? "/marketplace/messages/" + numericReportId
          : source === "system-notification"
            ? "/notifications/" + numericReportId
            : "/reports/messages/" + numericReportId;

    await friendsApiRequest(endpoint, {
      method: "DELETE",
    });
    await loadFriendNotifications();
    await loadUserMessagesPage();
  } catch (error) {
    if (typeof showAppAlert === "function") {
      showAppAlert(error.message || "Nem sikerült törölni az üzenetet.", {
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
    document
      .querySelectorAll(".friend-notification-nav")
      .forEach((notificationItem) => notificationItem.remove());
    return;
  }

  if (isAdmin) {
    navItem.classList.add("d-none");
  } else {
    navItem.classList.remove("d-none");
    navItem.innerHTML = `
      <a class="nav-link" href="baratok.html">Ismerősök</a>
    `;
  }

  document
    .querySelectorAll(".friend-notification-nav")
    .forEach((notificationItem) => notificationItem.remove());

  const notificationMarkup = `
    <div class="dropdown" data-bs-auto-close="outside">
      <button
        class="btn btn-outline-light btn-sm friend-notification-toggle"
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        aria-label="Értesítések"
        data-notification-toggle
      >
        <span class="friend-notification-icon">🔔</span>
        <span class="friend-notification-count d-none" data-notification-count>0</span>
      </button>
      <div class="dropdown-menu dropdown-menu-end friend-notification-menu p-0">
        <div class="friend-notification-header">Értesítések</div>
        <div class="friend-notification-list" data-notification-list>
          <div class="friend-notification-empty">Még nincs értesítésed.</div>
        </div>
      </div>
    </div>
  `;

  const desktopNotificationItem = document.createElement("li");
  desktopNotificationItem.className =
    "nav-item ms-lg-2 mt-2 mt-lg-0 friend-notification-nav d-none d-lg-block";
  desktopNotificationItem.innerHTML = notificationMarkup;

  const mobileNotificationItem = document.createElement("div");
  mobileNotificationItem.className =
    "friend-notification-nav friend-notification-nav-mobile d-lg-none";
  mobileNotificationItem.innerHTML = notificationMarkup;

  const logoutNavItem = document.getElementById("logoutNavItem");
  const navbarMenu = document.getElementById("navbarMenu");
  const mobileActions = document.querySelector(".nav-actions-mobile");
  const mobileThemeToggle = document.getElementById("themeToggleMobile");

  if (logoutNavItem?.parentElement) {
    logoutNavItem.parentElement.insertBefore(desktopNotificationItem, logoutNavItem);
  } else if (navbarMenu) {
    navbarMenu.appendChild(desktopNotificationItem);
  } else {
    navItem.insertAdjacentElement("afterend", desktopNotificationItem);
  }

  if (mobileActions) {
    if (mobileThemeToggle) {
      mobileActions.insertBefore(mobileNotificationItem, mobileThemeToggle);
    } else {
      mobileActions.prepend(mobileNotificationItem);
    }
  }

  document.querySelectorAll("[data-notification-toggle]").forEach((toggleButton) => {
    toggleButton.addEventListener("click", () => {
      loadFriendNotifications();
    });
  });

  document.querySelectorAll("[data-notification-list]").forEach((list) => {
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
            ? "Biztosan elfogadod ezt az ismerősnek jelölést?"
            : "Biztosan elutasítod ezt az ismerősnek jelölést?";

        const isConfirmed = await friendsShowConfirm(confirmMessage, {
          confirmLabel: action === "accept" ? "Elfogadás" : "Elutasítás",
          confirmButtonClass: action === "accept" ? "btn-success" : "btn-danger",
        });

        if (!isConfirmed) {
          return;
        }

        try {
          await friendsApiRequest(`/friends/requests/${requestId}/respond`, {
            method: "PUT",
            body: JSON.stringify({ action }),
          });

          await friendsShowSuccess(
            action === "accept"
              ? "Az ismerősnek jelölés sikeresen elfogadva."
              : "Az ismerősnek jelölés sikeresen elutasítva."
          );

          await Promise.all([loadFriendNotifications(), refreshFriendsOverviewIfNeeded()]);
        } catch (error) {
          friendsShowAlert(error.message || "Nem sikerült feldolgozni az ismerősnek jelölést.", {
            title: "Hiba",
          });
        }

        return;
      }

      if (action === "open-admin-report") {
        await openAdminReportInbox(actionButton.dataset.reportId, actionButton.dataset.reportSource);
        return;
      }

      if (action === "open-user-report-message") {
        await openUserReportMessage(actionButton.dataset.reportId, actionButton.dataset.reportSource);
        return;
      }

      if (action === "delete-user-report-message") {
        await deleteUserReportNotification(actionButton.dataset.reportId, actionButton.dataset.reportSource);
      }
    });
  });

  if (typeof setActiveNavLink === "function") {
    setActiveNavLink();
  }
}

function renderFriendNotifications(friendNotifications, reportNotifications, friendMessages = [], marketplaceMessages = [], systemNotifications = []) {
  const lists = Array.from(document.querySelectorAll("[data-notification-list]"));
  const counts = Array.from(document.querySelectorAll("[data-notification-count]"));
  const user = getCurrentUserInfo();
  const isAdmin = typeof isAdminUser === "function" ? isAdminUser(user) : false;

  if (!lists.length || !counts.length) {
    return;
  }

  const friendItems = Array.isArray(friendNotifications) ? friendNotifications : [];
  const reportItems = Array.isArray(reportNotifications) ? reportNotifications : [];
  const friendMessageItems = Array.isArray(friendMessages) ? friendMessages : [];
  const marketplaceMessageItems = Array.isArray(marketplaceMessages) ? marketplaceMessages : [];
  const systemNotificationItems = Array.isArray(systemNotifications) ? systemNotifications : [];
  const unreadReportCount = isAdmin
    ? reportItems.length
    : reportItems.filter((item) => !item.FelhasznaloOlvastaValaszt).length;
  const unreadFriendMessageCount = friendMessageItems.filter((item) => Number(item.OlvasatlanDb || 0) > 0).length;
  const unreadMarketplaceMessageCount = marketplaceMessageItems.filter((item) => Number(item.OlvasatlanDb || 0) > 0).length;
  const unreadSystemNotificationCount = systemNotificationItems.filter((item) => !item.Olvasva).length;
  const pendingCount = friendItems.length + unreadReportCount + unreadFriendMessageCount + unreadMarketplaceMessageCount + unreadSystemNotificationCount;

  counts.forEach((count) => {
    count.textContent = String(pendingCount);
    count.classList.toggle("d-none", pendingCount === 0);
  });

  if (!friendItems.length && !reportItems.length && !friendMessageItems.length && !marketplaceMessageItems.length && !systemNotificationItems.length) {
    lists.forEach((list) => {
      list.innerHTML = `<div class="friend-notification-empty">Még nincs értesítésed.</div>`;
    });
    return;
  }

  const friendMarkup = friendItems.map(
    (item) => `
      <div class="friend-notification-item">
        <div class="fw-semibold">${escapeFriendsHtml(item.Felhasznalonev)}</div>
        <div class="section-text small mb-3">ismerősnek jelölést küldött neked.</div>
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
          <div class="fw-semibold">${item.Source === "marketplace" ? "Új piactér bejelentés" : "Új fórumbejelentés"}</div>
          <div class="section-text small mb-3">${escapeFriendsHtml(new Date(item.Letrehozva).toLocaleString("hu-HU"))}</div>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-sm btn-outline-info" type="button" data-report-id="${Number(item.Source === "marketplace" ? item.MarketplaceReportId : item.ForumReportId)}" data-report-source="${escapeFriendsHtml(item.Source || "forum")}" data-action="open-admin-report">
              Megnyitás
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="friend-notification-item">
          <div class="fw-semibold">${item.FelhasznaloOlvastaValaszt ? "Üzenet" : "Új üzenet"}</div>
        <div class="section-text small mb-2">${escapeFriendsHtml(item.Source === "marketplace-report" ? (item.HirdetesCim || "Piactér bejelentés") : getForumReasonLabel(item.IndokKod))}</div>
        <div class="section-text small mb-3">${escapeFriendsHtml(new Date(item.AdminValaszLetrehozva || item.Letrehozva).toLocaleString("hu-HU"))}</div>
        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-sm btn-outline-info" type="button" data-report-id="${Number(item.Source === "marketplace-report" ? item.MarketplaceReportId : item.ForumReportId)}" data-report-source="${escapeFriendsHtml(item.Source || "forum")}" data-action="open-user-report-message">
            Megnyitás
          </button>
          <button class="btn btn-sm btn-outline-danger" type="button" data-report-id="${Number(item.Source === "marketplace-report" ? item.MarketplaceReportId : item.ForumReportId)}" data-report-source="${escapeFriendsHtml(item.Source || "forum")}" data-action="delete-user-report-message">
            Törlés
          </button>
        </div>
      </div>
    `;
  });

  const marketplaceMessageMarkup = isAdmin
    ? []
    : marketplaceMessageItems.map((item) => `
        <div class="friend-notification-item">
          <div class="fw-semibold">${Number(item.OlvasatlanDb || 0) > 0 ? "Új piactér üzenet" : "Piactér beszélgetés"}</div>
          <div class="section-text small mb-2">${escapeFriendsHtml(item.HirdetesCim || "-")}</div>
          <div class="section-text small mb-2">${escapeFriendsHtml(item.MasikFelhasznalonev || "-")}</div>
          <div class="section-text small mb-3">${escapeFriendsHtml(new Date(item.Letrehozva).toLocaleString("hu-HU"))}</div>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-sm btn-outline-info" type="button" data-report-id="${Number(item.MarketplaceUzenetId)}" data-report-source="marketplace-message" data-action="open-user-report-message">
              Megnyitás
            </button>
            <button class="btn btn-sm btn-outline-danger" type="button" data-report-id="${Number(item.MarketplaceUzenetId)}" data-report-source="marketplace-message" data-action="delete-user-report-message">
              Törlés
            </button>
          </div>
        </div>
      `);

  const friendMessageMarkup = isAdmin
    ? []
    : friendMessageItems.map((item) => `
        <div class="friend-notification-item">
          <div class="fw-semibold">${Number(item.OlvasatlanDb || 0) > 0 ? "Új ismerős üzenet" : "Ismerős beszélgetés"}</div>
          <div class="section-text small mb-2">${escapeFriendsHtml(item.MasikFelhasznalonev || "-")}</div>
          <div class="section-text small mb-3">${escapeFriendsHtml(new Date(item.Letrehozva).toLocaleString("hu-HU"))}</div>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-sm btn-outline-info" type="button" data-report-id="${Number(item.BaratUzenetId)}" data-report-source="friend-message" data-action="open-user-report-message">
              Megnyitás
            </button>
            <button class="btn btn-sm btn-outline-danger" type="button" data-report-id="${Number(item.BaratUzenetId)}" data-report-source="friend-message" data-action="delete-user-report-message">
              Törlés
            </button>
          </div>
        </div>
      `);

  const systemNotificationMarkup = isAdmin
    ? []
    : systemNotificationItems.map((item) => `
        <div class="friend-notification-item">
          <div class="fw-semibold">${item.Olvasva ? "Értesítés" : "Új értesítés"}</div>
          <div class="section-text small mb-2">${escapeFriendsHtml(item.Cim || "-")}</div>
          <div class="section-text small mb-3">${escapeFriendsHtml(new Date(item.Letrehozva).toLocaleString("hu-HU"))}</div>
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-sm btn-outline-info" type="button" data-report-id="${Number(item.FelhasznaloErtesitesId)}" data-report-source="system-notification" data-action="open-user-report-message">
              Megnyitás
            </button>
            <button class="btn btn-sm btn-outline-danger" type="button" data-report-id="${Number(item.FelhasznaloErtesitesId)}" data-report-source="system-notification" data-action="delete-user-report-message">
              Törlés
            </button>
          </div>
        </div>
      `);

  lists.forEach((list) => {
    list.innerHTML = [...friendMarkup, ...reportMarkup, ...friendMessageMarkup, ...marketplaceMessageMarkup, ...systemNotificationMarkup].join("");
  });
}

async function loadFriendNotifications() {
  const notificationNav = document.querySelector(".friend-notification-nav");
  const user = getCurrentUserInfo();
  const isAdmin = typeof isAdminUser === "function" ? isAdminUser(user) : false;

  if (!notificationNav || (typeof isLoggedIn === "function" && !isLoggedIn())) {
    return;
  }

  try {
    const [
      friendNotifications,
      forumReportNotifications,
      marketplaceReportNotifications,
      friendMessages,
      marketplaceMessages,
      systemNotifications,
    ] = await Promise.all([
      isAdmin ? Promise.resolve([]) : friendsApiRequest("/friends/notifications"),
      isAdmin
        ? friendsApiRequest("/reports/admin/notifications")
        : friendsApiRequest("/reports/messages"),
      isAdmin
        ? friendsApiRequest("/marketplace/reports/admin/notifications")
        : friendsApiRequest("/marketplace/reports/messages"),
      isAdmin ? Promise.resolve([]) : friendsApiRequest("/friends/messages"),
      isAdmin ? Promise.resolve([]) : friendsApiRequest("/marketplace/messages"),
      isAdmin ? Promise.resolve([]) : friendsApiRequest("/notifications"),
    ]);

    friendsFeatureState.notifications = Array.isArray(friendNotifications)
      ? friendNotifications
      : [];
    friendsFeatureState.reportNotifications = [
      ...(Array.isArray(forumReportNotifications) ? forumReportNotifications : []).map((item) => ({
        ...item,
        Source: isAdmin ? "forum" : "forum-report",
      })),
      ...(Array.isArray(marketplaceReportNotifications) ? marketplaceReportNotifications : []).map((item) => ({
        ...item,
        Source: isAdmin ? "marketplace" : "marketplace-report",
      })),
    ];
    friendsFeatureState.friendMessages = Array.isArray(friendMessages)
      ? friendMessages
      : [];
    friendsFeatureState.marketplaceMessages = Array.isArray(marketplaceMessages)
      ? marketplaceMessages
      : [];
    friendsFeatureState.systemNotifications = Array.isArray(systemNotifications)
      ? systemNotifications
      : [];

    renderFriendNotifications(
      friendsFeatureState.notifications,
      friendsFeatureState.reportNotifications,
      friendsFeatureState.friendMessages,
      friendsFeatureState.marketplaceMessages,
      friendsFeatureState.systemNotifications
    );
  } catch (error) {
    renderFriendNotifications([], [], [], [], []);
  }
}

function getCombinedUserMessageItems() {
  const reportItems = (Array.isArray(friendsFeatureState.reportNotifications)
    ? friendsFeatureState.reportNotifications
    : []).map((item) => ({
      id: Number(item.Source === "marketplace-report" ? item.MarketplaceReportId : item.ForumReportId),
      source: item.Source || "forum-report",
      unread: !item.FelhasznaloOlvastaValaszt,
      title: item.FelhasznaloOlvastaValaszt ? "Üzenet" : "Új üzenet",
      subtitle:
        item.Source === "marketplace-report"
          ? item.HirdetesCim || "Piactér bejelentés"
          : getForumReasonLabel(item.IndokKod),
      timestamp: item.AdminValaszLetrehozva || item.Letrehozva,
    }));

  const friendMessages = (Array.isArray(friendsFeatureState.friendMessages)
    ? friendsFeatureState.friendMessages
    : []).map((item) => ({
      id: Number(item.BaratUzenetId),
      source: "friend-message",
      unread: Number(item.OlvasatlanDb || 0) > 0,
      title: Number(item.OlvasatlanDb || 0) > 0 ? "Új ismerős üzenet" : "Ismerős beszélgetés",
      subtitle: item.MasikFelhasznalonev || "-",
      timestamp: item.Letrehozva,
    }));

  const marketplaceMessages = (Array.isArray(friendsFeatureState.marketplaceMessages)
    ? friendsFeatureState.marketplaceMessages
    : []).map((item) => ({
      id: Number(item.MarketplaceUzenetId),
      source: "marketplace-message",
      unread: Number(item.OlvasatlanDb || 0) > 0,
      title: Number(item.OlvasatlanDb || 0) > 0 ? "Új piactér üzenet" : "Piactér beszélgetés",
      subtitle: `${item.MasikFelhasznalonev || "-"} | ${item.HirdetesCim || "-"}`,
      timestamp: item.Letrehozva,
    }));

  const systemNotifications = (Array.isArray(friendsFeatureState.systemNotifications)
    ? friendsFeatureState.systemNotifications
    : []).map((item) => ({
      id: Number(item.FelhasznaloErtesitesId),
      source: "system-notification",
      unread: !item.Olvasva,
      title: !item.Olvasva ? "Új értesítés" : "Értesítés",
      subtitle: item.Cim || "Rendszerüzenet",
      timestamp: item.Letrehozva,
    }));

  return [...reportItems, ...friendMessages, ...marketplaceMessages, ...systemNotifications].sort((left, right) => {
    if (left.unread !== right.unread) {
      return left.unread ? -1 : 1;
    }

    return new Date(right.timestamp || 0).getTime() - new Date(left.timestamp || 0).getTime();
  });
}

function renderUserMessagesPage(messages) {
  if (document.body.dataset.page !== "uzenetek") {
    return;
  }

  const list = document.getElementById("userMessagesList");
  const count = document.getElementById("userMessagesCount");
  const empty = document.getElementById("userMessagesEmpty");
  const error = document.getElementById("userMessagesError");
  const loading = document.getElementById("userMessagesLoading");

  if (!list || !count || !empty || !error || !loading) {
    return;
  }

  const items = Array.isArray(messages) ? messages : [];

  loading.classList.add("d-none");
  error.classList.add("d-none");
  count.textContent = `${items.length} üzenet`;
  list.innerHTML = "";
  empty.classList.toggle("d-none", items.length > 0);

  if (!items.length) {
    return;
  }

  items.forEach((item) => {
    const wrapper = document.createElement("div");
    wrapper.className = `app-list-item user-message-item${item.unread ? " is-unread" : ""}`;
    wrapper.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div>
          <div class="fw-semibold mb-1">${escapeFriendsHtml(item.title)}</div>
          <div class="small section-text user-message-meta mb-2">${escapeFriendsHtml(item.subtitle)}</div>
          <div class="small section-text">
            ${escapeFriendsHtml(new Date(item.timestamp).toLocaleString("hu-HU"))}
          </div>
        </div>
        <div class="d-flex gap-2 flex-wrap user-message-actions">
          <button
            class="btn btn-sm btn-outline-info"
            type="button"
            data-user-message-open="${item.id}"
            data-user-message-source="${escapeFriendsHtml(item.source)}"
          >
            Megnyitás
          </button>
          <button
            class="btn btn-sm btn-outline-danger"
            type="button"
            data-user-message-delete="${item.id}"
            data-user-message-source="${escapeFriendsHtml(item.source)}"
          >
            Törlés
          </button>
        </div>
      </div>
    `;
    list.appendChild(wrapper);
  });
}

async function loadUserMessagesPage() {
  if (document.body.dataset.page !== "uzenetek") {
    return;
  }

  const list = document.getElementById("userMessagesList");
  const count = document.getElementById("userMessagesCount");
  const empty = document.getElementById("userMessagesEmpty");
  const error = document.getElementById("userMessagesError");
  const loading = document.getElementById("userMessagesLoading");

  if (!list || !count || !empty || !error || !loading) {
    return;
  }

  loading.classList.remove("d-none");
  error.classList.add("d-none");
  empty.classList.add("d-none");
  list.innerHTML = "";
  count.textContent = "";

  try {
    const [forumMessages, marketplaceReportMessages, friendMessages, marketplaceMessages, systemNotifications] = await Promise.all([
      friendsApiRequest("/reports/messages"),
      friendsApiRequest("/marketplace/reports/messages"),
      friendsApiRequest("/friends/messages"),
      friendsApiRequest("/marketplace/messages"),
      friendsApiRequest("/notifications"),
    ]);
    friendsFeatureState.reportNotifications = [
      ...(Array.isArray(forumMessages) ? forumMessages : []).map((item) => ({
        ...item,
        Source: "forum-report",
      })),
      ...(Array.isArray(marketplaceReportMessages) ? marketplaceReportMessages : []).map((item) => ({
        ...item,
        Source: "marketplace-report",
      })),
    ];
    friendsFeatureState.friendMessages = Array.isArray(friendMessages) ? friendMessages : [];
    friendsFeatureState.marketplaceMessages = Array.isArray(marketplaceMessages) ? marketplaceMessages : [];
    friendsFeatureState.systemNotifications = Array.isArray(systemNotifications) ? systemNotifications : [];
    renderUserMessagesPage(getCombinedUserMessageItems());
  } catch (loadError) {
    loading.classList.add("d-none");
    error.textContent = loadError.message || "Nem sikerült betölteni az üzeneteket.";
    error.classList.remove("d-none");
  }
}

async function startFriendConversation(targetUserId, username = "") {
  const numericTargetUserId = Number(targetUserId);

  if (!Number.isInteger(numericTargetUserId) || numericTargetUserId <= 0) {
    return;
  }

  const rawMessage = await friendsShowTextPrompt({
    title: "Új ismerős üzenet",
    label: username ? `${username} reszere` : "Uzenet",
    placeholder: "Írd be az üzenetedet...",
    confirmLabel: "Kuldes",
  });

  if (rawMessage == null) {
    return;
  }

  const message = String(rawMessage).trim();

  if (message.length < 3) {
    friendsShowAlert("Az üzenet legalább 3 karakter legyen.", {
      title: "Hiba",
    });
    return;
  }

  await friendsApiRequest("/friends/messages", {
    method: "POST",
    body: JSON.stringify({
      targetUserId: numericTargetUserId,
      uzenet: message,
    }),
  });

  await Promise.all([loadFriendNotifications(), loadUserMessagesPage()]);

  await friendsShowSuccess("Az üzenet sikeresen elküldve.");
}

function initializeUserMessagesPage() {
  if (document.body.dataset.page !== "uzenetek") {
    return;
  }

  const user = getCurrentUserInfo();
  const isAdmin = typeof isAdminUser === "function" ? isAdminUser(user) : false;

  if (typeof isLoggedIn === "function" && !isLoggedIn()) {
    if (typeof setPendingRedirect === "function") {
      setPendingRedirect("uzenetek.html");
    }
    window.location.href = "login.html";
    return;
  }

  if (isAdmin) {
    window.location.href = "admin.html#reports";
    return;
  }

  const list = document.getElementById("userMessagesList");

  if (list && list.dataset.bound !== "true") {
    list.addEventListener("click", async (event) => {
      const openButton = event.target.closest("[data-user-message-open]");

      if (openButton) {
        await openUserReportMessage(
          openButton.dataset.userMessageOpen,
          openButton.dataset.userMessageSource
        );
        await loadUserMessagesPage();
        return;
      }

      const deleteButton = event.target.closest("[data-user-message-delete]");

      if (deleteButton) {
        await deleteUserReportNotification(
          deleteButton.dataset.userMessageDelete,
          deleteButton.dataset.userMessageSource
        );
      }
    });

    list.dataset.bound = "true";
  }

  loadUserMessagesPage();
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

        let buttonLabel = "Jeloles";
        let buttonClass = "btn-outline-info";
        let disabledAttr = "";

        if (hasPendingSent) {
          buttonLabel = "Kérelem elküldve";
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
        Még nincs elfogadott ismerősöd.
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
               <button
                 class="btn btn-sm btn-outline-info"
                 type="button"
                 data-message-friend-id="${Number(user.FelhasznaloId)}"
                 data-message-friend-name="${escapeFriendsHtml(user.Felhasznalonev)}"
               >
                 Üzenet
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
      friendsFeatureState.reportNotifications,
      friendsFeatureState.friendMessages,
      friendsFeatureState.marketplaceMessages,
      friendsFeatureState.systemNotifications
    );
  } catch (error) {
    if (document.body.dataset.page === "baratok" && typeof showAppAlert === "function") {
      showAppAlert(error.message || "Nem sikerült betölteni az ismerősök adatait.", {
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
          await showAppSuccess("Az ismerősnek jelölés sikeresen elküldve.");
        }

        await Promise.all([loadFriendsOverview(), loadFriendNotifications()]);
      } catch (error) {
        if (typeof showAppAlert === "function") {
          showAppAlert(error.message || "Nem sikerült elküldeni az ismerősnek jelölést.", {
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

      const messageButton = event.target.closest("[data-message-friend-id]");

      if (messageButton) {
        const targetUserId = Number(messageButton.dataset.messageFriendId);

        if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
          return;
        }

        try {
          await startFriendConversation(targetUserId, messageButton.dataset.messageFriendName || "");
        } catch (error) {
          if (typeof showAppAlert === "function") {
            showAppAlert(error.message || "Nem sikerült elküldeni az üzenetet.", {
              title: "Hiba",
            });
          }
        }
        return;
      }

      if (!removeButton) {
        return;
      }

      const targetUserId = Number(removeButton.dataset.removeFriendId);

      if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return;
      }

      const confirmed = await friendsShowConfirm("Biztosan törölni szeretnéd ezt az ismerőst?", {
        confirmLabel: "Törlés",
      });

      if (!confirmed) {
        return;
      }

      try {
        await friendsApiRequest(`/friends/relations/${targetUserId}`, {
          method: "DELETE",
        });

        await friendsShowSuccess("Az ismerős sikeresen törölve lett.");

        await Promise.all([loadFriendsOverview(), loadFriendNotifications()]);
      } catch (error) {
        friendsShowAlert(error.message || "Nem sikerült törölni az ismerőst.", {
          title: "Hiba",
        });
      }
    });
  }

  loadFriendsOverview();
}

function initializeFriendsFeature() {
  renderFriendsNav();
  initializeFriendsPage();
  initializeUserMessagesPage();

  if (typeof isLoggedIn === "function" && isLoggedIn()) {
    loadFriendNotifications();
  }
}

document.addEventListener("DOMContentLoaded", initializeFriendsFeature);





