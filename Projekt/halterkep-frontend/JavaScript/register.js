const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const email = document.getElementById("registerEmail").value.trim();
    const username = document.getElementById("registerUsername").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("registerPasswordConfirm").value;
    const securityQuestion = document.getElementById("registerSecurityQuestion").value;
    const securityAnswer = document.getElementById("registerSecurityAnswer").value.trim();

    if (!registerForm.checkValidity()) {
      registerForm.classList.add("was-validated");
      return;
    }

    if (password !== confirmPassword) {
      await showAppAlert("A két jelszó nem egyezik.", { title: "Hiba" });
      return;
    }

    try {
      const response = await fetch("http://localhost:4000/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          username,
          password,
          securityQuestion,
          securityAnswer,
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
            : "Hiba tortent regisztracio kozben.",
          { title: "Hiba" }
        );
        return;
      }

      await showAppSuccess("Sikeres regisztracio!");
      window.location.href = "./login.html";
    } catch (error) {
      console.error("Register fetch hiba:", error);
      await showAppAlert("Nem sikerült kapcsolódni a szerverhez.", { title: "Hiba" });
    }
  });
}
