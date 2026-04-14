// js/current-booked.js

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.supabaseClient) {
    window.location.href = "login.html";
    return;
  }

  const {
    data: { session },
  } = await window.supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  const user = session.user;
  const logoutBtn = document.getElementById("logout-btn");

  if (typeof window.setupNotifications === "function") {
    await window.setupNotifications(user.id);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.supabaseClient.auth.signOut();
      window.location.href = "login.html";
    });
  }

  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.tab;

      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabPanels.forEach((panel) => panel.classList.remove("active"));

      button.classList.add("active");
      const targetPanel = document.getElementById(target);
      if (targetPanel) {
        targetPanel.classList.add("active");
      }
    });
  });
});
