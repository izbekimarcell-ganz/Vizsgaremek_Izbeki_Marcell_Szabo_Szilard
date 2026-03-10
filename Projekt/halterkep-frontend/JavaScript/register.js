const registerForm = document.getElementById("registerForm");

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  event.stopPropagation();

  const email = document.getElementById("email").value.trim();
  const felhasznalonev = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!registerForm.checkValidity()) {
    registerForm.classList.add("was-validated");
    return;
  }

  if (password !== confirmPassword) {
    alert("A két jelszó nem egyezik.");
    return;
  }

  try {
    const response = await fetch("http://localhost:4000/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        felhasznalonev,
        password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Hiba történt regisztráció közben.");
      return;
    }

    alert("Sikeres regisztráció!");
    window.location.href = "./login.html";
  } catch (error) {
    console.error(error);
    alert("Nem sikerült kapcsolódni a szerverhez.");
  }
});