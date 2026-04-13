document.addEventListener("DOMContentLoaded", async () => {
  const authData = await requireAuth(false);
  if (!authData) return;

  const { profile } = authData;

  const welcomeTitle = document.getElementById("welcome-title");
  const adminLink = document.getElementById("admin-link");
  const logoutBtn = document.getElementById("logout-btn");

  welcomeTitle.textContent = `Welcome, ${profile.display_name || profile.email}`;

  if (profile.role === "admin") {
    adminLink.classList.remove("hidden");
  }

  logoutBtn.addEventListener("click", async () => {
    await window.supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });
});
