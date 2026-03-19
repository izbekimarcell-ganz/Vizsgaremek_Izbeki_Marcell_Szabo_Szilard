(() => {
  "use strict";

  const form = document.getElementById("loginForm");
  const forgotToggle = document.getElementById("forgotPasswordToggle");
  const forgotPanel = document.getElementById("forgotPasswordPanel");
  const forgotLookupForm = document.getElementById("forgotLookupForm");
  const forgotResetForm = document.getElementById("forgotResetForm");
  const forgotIdentifierInput = document.getElementById("forgotIdentifier");
  const forgotQuestionText = document.getElementById("forgotQuestionText");
  const forgotSecurityAnswer = document.getElementById("forgotSecurityAnswer");
  const forgotNewPassword = document.getElementById("forgotNewPassword");
  const forgotNewPasswordConfirm = document.getElementById("forgotNewPasswordConfirm");
  const loginIdentifierInput = document.getElementById("loginIdentifier");

  let loadedForgotIdentifier = "";

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

    const identifier = loginIdentifierInput.value.trim();
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
          typeof data === "object" && data?.message ? data.message : "Hibas bejelentkezes.",
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

      await showAppSuccess("Sikeres bejelentkezes!");
      const pendingRedirect =
        typeof consumePendingRedirect === "function" ? consumePendingRedirect() : null;
      const target = pendingRedirect || "./index.html";
      window.location.href = target;
    } catch (error) {
      console.error("Login fetch hiba:", error);
      await showAppAlert("Nem sikerult kapcsolodni a szerverhez.", { title: "Hiba" });
    }

    form.classList.add("was-validated");
  });

  if (!forgotToggle || !forgotPanel || !forgotLookupForm || !forgotResetForm) {
    return;
  }

  const resetForgotFlow = () => {
    loadedForgotIdentifier = "";
    forgotLookupForm.classList.remove("was-validated");
    forgotResetForm.classList.remove("was-validated");
    forgotResetForm.reset();
    forgotResetForm.classList.add("d-none");
    forgotQuestionText.textContent = "";
  };

  forgotToggle.addEventListener("click", () => {
    const isHidden = forgotPanel.classList.toggle("d-none");

    if (isHidden) {
      resetForgotFlow();
      return;
    }

    if (loginIdentifierInput && !forgotIdentifierInput.value.trim()) {
      forgotIdentifierInput.value = loginIdentifierInput.value.trim();
    }
  });

  forgotLookupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!forgotLookupForm.checkValidity()) {
      forgotLookupForm.classList.add("was-validated");
      return;
    }

    const identifier = forgotIdentifierInput.value.trim();

    try {
      const response = await fetch("http://localhost:4000/auth/forgot-password/question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        resetForgotFlow();
        await showAppAlert(
          typeof data === "object" && data?.message
            ? data.message
            : "Nem sikerult betolteni a biztonsagi kerdest.",
          { title: "Hiba" }
        );
        return;
      }

      loadedForgotIdentifier = identifier;
      forgotQuestionText.textContent = data.question;
      forgotResetForm.classList.remove("d-none");
      forgotSecurityAnswer.focus();
    } catch (error) {
      console.error("Forgot password question hiba:", error);
      await showAppAlert("Nem sikerult kapcsolodni a szerverhez.", { title: "Hiba" });
    }

    forgotLookupForm.classList.add("was-validated");
  });

  forgotResetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!forgotResetForm.checkValidity()) {
      forgotResetForm.classList.add("was-validated");
      return;
    }

    if (!loadedForgotIdentifier) {
      await showAppAlert("Elobb toltsd be a biztonsagi kerdest.", { title: "Hiba" });
      return;
    }

    const securityAnswer = forgotSecurityAnswer.value.trim();
    const newPassword = forgotNewPassword.value;
    const confirmPassword = forgotNewPasswordConfirm.value;

    if (newPassword !== confirmPassword) {
      await showAppAlert("A ket uj jelszo nem egyezik.", { title: "Hiba" });
      return;
    }

    try {
      const response = await fetch("http://localhost:4000/auth/forgot-password/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: loadedForgotIdentifier,
          securityAnswer,
          newPassword,
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
            : "Nem sikerult uj jelszot beallitani.",
          { title: "Hiba" }
        );
        return;
      }

      const lastIdentifier = loadedForgotIdentifier;

      await showAppSuccess("A jelszo sikeresen modositva lett. Most mar az uj jelszoval tudsz belepni.");
      forgotPanel.classList.add("d-none");
      resetForgotFlow();
      form.reset();
      form.classList.remove("was-validated");
      loginIdentifierInput.value = lastIdentifier;
    } catch (error) {
      console.error("Forgot password reset hiba:", error);
      await showAppAlert("Nem sikerult kapcsolodni a szerverhez.", { title: "Hiba" });
    }

    forgotResetForm.classList.add("was-validated");
  });
})();
