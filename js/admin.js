document.addEventListener("DOMContentLoaded", async () => {
  const authData = await requireAuth(false);
  if (!authData) return;

  const { profile } = authData;
  const userList = document.getElementById("user-list");
  const adminMessage = document.getElementById("admin-message");
  const logoutBtn = document.getElementById("logout-btn");

  if (profile.role !== "admin") {
    window.location.href = "dashboard.html";
    return;
  }

  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
  });

  async function loadUsers() {
    userList.innerHTML = "Loading users...";

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      userList.innerHTML = "Failed to load users.";
      console.error(error);
      return;
    }

    if (!data || data.length === 0) {
      userList.innerHTML = "No users found.";
      return;
    }

    userList.innerHTML = "";

    data.forEach((user) => {
      const item = document.createElement("div");
      item.className = "user-item";

      item.innerHTML = `
        <h3>${user.display_name || "No display name"}</h3>
        <p class="user-meta"><strong>Email:</strong> ${user.email}</p>
        <p class="user-meta"><strong>Approved:</strong> ${user.approved ? "Yes" : "No"}</p>
        <p class="user-meta"><strong>Role:</strong> ${user.role}</p>
        <div class="user-actions">
          <button class="btn btn-primary approve-btn" data-id="${user.id}" data-approved="${user.approved}">
            ${user.approved ? "Unapprove" : "Approve"}
          </button>
          <button class="btn btn-secondary role-btn" data-id="${user.id}" data-role="${user.role}">
            ${user.role === "admin" ? "Make Member" : "Make Admin"}
          </button>
        </div>
      `;

      userList.appendChild(item);
    });

    bindButtons();
  }

  function bindButtons() {
    document.querySelectorAll(".approve-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const currentApproved = btn.dataset.approved === "true";

        const { error } = await supabase
          .from("profiles")
          .update({ approved: !currentApproved })
          .eq("id", id);

        if (error) {
          adminMessage.textContent = error.message;
          return;
        }

        adminMessage.textContent = "Approval updated.";
        loadUsers();
      });
    });

    document.querySelectorAll(".role-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const currentRole = btn.dataset.role;
        const newRole = currentRole === "admin" ? "member" : "admin";

        const { error } = await supabase
          .from("profiles")
          .update({ role: newRole })
          .eq("id", id);

        if (error) {
          adminMessage.textContent = error.message;
          return;
        }

        adminMessage.textContent = "Role updated.";
        loadUsers();
      });
    });
  }

  loadUsers();
});