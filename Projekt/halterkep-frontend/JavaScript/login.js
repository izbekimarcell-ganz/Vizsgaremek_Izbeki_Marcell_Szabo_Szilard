(() => {
  "use strict";

  const form = document.getElementById("loginForm");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const identifier = document.getElementById("identifier").value.trim();
    const password = document.getElementById("password").value;
    const rememberMe = document.getElementById("rememberMe").checked;

    try {
      const response = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Hibás bejelentkezés.");
        return;
      }

      if (rememberMe) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("user", JSON.stringify(data.user));
      }

      alert("Sikeres bejelentkezés!");
      window.location.href = "./index.html";
    } catch (error) {
      console.error("Login fetch hiba:", error);
      alert("Nem sikerült kapcsolódni a szerverhez.");
    }

    form.classList.add("was-validated");
  });
})();