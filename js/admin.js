document.addEventListener("DOMContentLoaded", async () => {
  const authData = await requireAuth(false);
  if (!authData) return;

  const { profile, user } = authData;
  const userList = document.getElementById("user-list");
  const adminMessage = document.getElementById("admin-message");
  const logoutBtn = document.getElementById("logout-btn");
  const createMemberForm = document.getElementById("create-member-form");
  const createMemberMessage = document.getElementById("create-member-message");

  if (profile.role !== "admin") {
    window.location.href = "dashboard.html";
    return;
  }

  if (typeof window.setupNotifications === "function") {
    await window.setupNotifications(user.id);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.supabaseClient.auth.signOut();
      window.location.href = "index.html";
    });
  }

  async function callAdminMemberTools(payload) {
    const { data, error } = await window.supabaseClient.functions.invoke("admin-member-tools", {
      body: payload,
    });

    if (error) {
      console.error("ADMIN MEMBER TOOLS ERROR:", error);
      return { error: error.message || "Request failed." };
    }

    return data || {};
  }

  async function loadUsers() {
    userList.innerHTML = "Loading users...";

    const { data, error } = await window.supabaseClient
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      userList.innerHTML = "Failed to load users.";
      console.error("LOAD USERS ERROR:", error);
      return;
    }

    if (!data || data.length === 0) {
      userList.innerHTML = "No users found.";
      return;
    }

    userList.innerHTML = "";

    data.forEach((member) => {
      const item = document.createElement("div");
      item.className = "user-item";

      const isSelf = member.id === user.id;
      const memberRole = member.role || "member";

      item.innerHTML = `
        <h3>${member.display_name || "No display name"}</h3>
        <p class="user-meta"><strong>Email:</strong> ${member.email || "No email"}</p>
        <p class="user-meta"><strong>Approved:</strong> ${member.approved ? "Yes" : "No"}</p>
        <p class="user-meta"><strong>Role:</strong> ${memberRole}</p>
        <div class="user-actions">
          <button class="btn btn-primary approve-btn" data-id="${member.id}" data-approved="${member.approved}">
            ${member.approved ? "Unapprove" : "Approve"}
          </button>

          <button class="btn btn-secondary role-btn" data-id="${member.id}" data-role="${memberRole}" ${isSelf ? "disabled" : ""}>
            ${memberRole === "admin" ? "Make Member" : "Make Admin"}
          </button>

          <button class="btn btn-secondary reset-password-btn" data-id="${member.id}">
            Reset Password
          </button>

          <button class="btn btn-danger delete-user-btn" data-id="${member.id}" ${isSelf ? "disabled" : ""}>
            Delete User
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

        const { error } = await window.supabaseClient
          .from("profiles")
          .update({ approved: !currentApproved })
          .eq("id", id);

        if (error) {
          adminMessage.textContent = error.message;
          console.error("APPROVE ERROR:", error);
          return;
        }

        adminMessage.textContent = "Approval updated.";
        loadUsers();
      });
    });

    document.querySelectorAll(".role-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (btn.disabled) return;

        const id = btn.dataset.id;
        const currentRole = btn.dataset.role || "member";
        const newRole = currentRole === "admin" ? "member" : "admin";

        const { error } = await window.supabaseClient
          .from("profiles")
          .update({ role: newRole })
          .eq("id", id);

        if (error) {
          adminMessage.textContent = error.message;
          console.error("ROLE ERROR:", error);
          return;
        }

        adminMessage.textContent = "Role updated.";
        loadUsers();
      });
    });

    document.querySelectorAll(".reset-password-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const newPassword = prompt("Enter a new temporary password for this member:");

        if (!newPassword) return;

        adminMessage.textContent = "Resetting password...";

        const result = await callAdminMemberTools({
          action: "reset_password",
          user_id: id,
          new_password: newPassword,
        });

        if (result.error) {
          adminMessage.textContent = result.error;
          return;
        }

        adminMessage.textContent = "Password reset successfully.";
      });
    });

    document.querySelectorAll(".delete-user-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (btn.disabled) return;

        const id = btn.dataset.id;
        const confirmed = confirm("Are you sure you want to permanently delete this user? This cannot be undone.");

        if (!confirmed) return;

        adminMessage.textContent = "Deleting user...";

        const result = await callAdminMemberTools({
          action: "delete_user",
          user_id: id,
        });

        if (result.error) {
          adminMessage.textContent = result.error;
          return;
        }

        adminMessage.textContent = "User deleted successfully.";
        loadUsers();
      });
    });
  }

  if (createMemberForm) {
    createMemberForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      createMemberMessage.textContent = "Creating account...";

      const display_name = document.getElementById("new-member-name").value.trim();
      const email = document.getElementById("new-member-email").value.trim();
      const password = document.getElementById("new-member-password").value.trim();

      if (!email || !password) {
        createMemberMessage.textContent = "Email and temporary password are required.";
        return;
      }

      try {
        const { data, error } = await window.supabaseClient.functions.invoke("swift-endpoint", {
          body: {
            display_name,
            email,
            password,
          },
        });

        console.log("CREATE MEMBER DATA:", data);
        console.log("CREATE MEMBER ERROR:", error);

        if (error) {
          createMemberMessage.textContent = error.message || "Could not create account.";
          return;
        }

        if (data?.error) {
          createMemberMessage.textContent = data.error;
          return;
        }

        createMemberMessage.textContent = `Account created for ${email}.`;
        createMemberForm.reset();
        loadUsers();
      } catch (err) {
        console.error("CREATE MEMBER ERROR:", err);
        createMemberMessage.textContent = "Something went wrong creating the account.";
      }
    });
  }

  loadUsers();
});
