(() => {
  "use strict";

  const form = document.getElementById("loginForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const identifier = document.getElementById("loginIdentifier").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
      const response = await fetch("http://localhost:4000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        await showAppAlert(
          typeof data === "object" && data?.message
            ? data.message
            : "Hibás bejelentkezés.",
          { title: "Hiba" }
        );
        return;
      }

      if (typeof setAuthSession === "function") {
        setAuthSession(data.token, data.user, false);
      } else {
        sessionStorage.setItem("authToken", data.token);
        sessionStorage.setItem("authUser", JSON.stringify(data.user));
      }

      await showAppSuccess("Sikeres bejelentkezés!");
      const pendingRedirect =
        typeof consumePendingRedirect === "function" ? consumePendingRedirect() : null;
      const target = pendingRedirect || "./index.html";
      window.location.href = target;
    } catch (error) {
      console.error("Login fetch hiba:", error);
      await showAppAlert("Nem sikerült kapcsolódni a szerverhez.", { title: "Hiba" });
    }

    form.classList.add("was-validated");
  });
})();
