(function initializeHalBaratokConfig() {
  const DEFAULT_LOCAL_API_ORIGIN = "http://localhost:4000";

  // Deploy után ide kell majd beírni az Azure Web App publikus URL-jét.
  const DEPLOYED_API_ORIGIN = "https://halbaratok-api-f9acgnephydefggj.westeurope-01.azurewebsites.net";

  const explicitApiOrigin =
    typeof window.HALBARATOK_API_BASE_URL === "string"
      ? window.HALBARATOK_API_BASE_URL.trim()
      : "";

  const isLocalEnvironment =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  const apiOrigin = normalizeBaseUrl(
    isLocalEnvironment
      ? DEFAULT_LOCAL_API_ORIGIN
      : explicitApiOrigin || DEPLOYED_API_ORIGIN
  );

  function normalizeBaseUrl(value) {
    return String(value || "").trim().replace(/\/+$/, "");
  }

  function buildUrl(baseUrl, pathSuffix = "") {
    if (!baseUrl) {
      return "";
    }

    if (!pathSuffix) {
      return baseUrl;
    }

    return `${baseUrl}${pathSuffix.startsWith("/") ? pathSuffix : `/${pathSuffix}`}`;
  }

  window.HalBaratokConfig = {
    apiOrigin,
    apiBaseUrl: buildUrl(apiOrigin, "/api"),
    buildApiUrl(pathSuffix = "") {
      return buildUrl(apiOrigin, pathSuffix);
    },
    buildApiEndpoint(pathSuffix = "") {
      return buildUrl(buildUrl(apiOrigin, "/api"), pathSuffix);
    },
  };
})();
