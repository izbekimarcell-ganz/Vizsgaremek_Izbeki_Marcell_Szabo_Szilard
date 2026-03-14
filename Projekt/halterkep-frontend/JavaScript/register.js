const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const email = document.getElementById("registerEmail").value.trim();
    const username = document.getElementById("registerUsername").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("registerPasswordConfirm").value;

    if (!registerForm.checkValidity()) {
      registerForm.classList.add("was-validated");
      return;
    }

    if (password !== confirmPassword) {
      alert("A ket jelszo nem egyezik.");
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
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        alert(
          typeof data === "object" && data?.message
            ? data.message
            : "Hiba tortent regisztracio kozben."
        );
        return;
      }

      alert("Sikeres regisztracio!");
      window.location.href = "./login.html";
    } catch (error) {
      console.error("Register fetch hiba:", error);
      alert("Nem sikerult kapcsolodni a szerverhez.");
    }
  });
}
