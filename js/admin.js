document.addEventListener("DOMContentLoaded", async () => {
  const authData = await requireAuth(false);
  if (!authData) return;

  const { profile } = authData;
  const userList = document.getElementById("user-list");
  const adminMessage = document.getElementById("admin-message");
  const logoutBtn = document.getElementById("logout-btn");
  const createMemberForm = document.getElementById("create-member-form");
  const createMemberMessage = document.getElementById("create-member-message");

  if (profile.role !== "admin") {
    window.location.href = "dashboard.html";
    return;
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.supabaseClient.auth.signOut();
      window.location.href = "index.html";
    });
  }

  async function callAdminMemberTools(payload) {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await window.supabaseClient.auth.getSession();

      if (sessionError || !session?.access_token) {
        console.error("ADMIN MEMBER TOOLS SESSION ERROR:", sessionError);
        return {
          error: "You must be logged in as an admin.",
        };
      }

      console.log("ADMIN TOKEN FOUND:", !!session.access_token);
      console.log("ADMIN USER ID:", session.user?.id);

      const response = await fetch(
        "https://vhpbmkdtlajdohhxawno.supabase.co/functions/v1/admin-member-tools",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      let result = null;

      try {
        result = await response.json();
      } catch (jsonError) {
        console.error("ADMIN MEMBER TOOLS JSON PARSE ERROR:", jsonError);
      }

      console.log("ADMIN MEMBER TOOLS STATUS:", response.status);
      console.log("ADMIN MEMBER TOOLS RESPONSE:", result);

      if (!response.ok) {
        return {
          error: result?.error || `Request failed with status ${response.status}`,
        };
      }

      return result || {};
    } catch (err) {
      console.error("ADMIN MEMBER TOOLS CRASH:", err);
      return {
        error: err.message || "Request failed.",
      };
    }
  }

  async function loadUsers() {
    if (!userList) return;

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

    data.forEach((user) => {
      const item = document.createElement("div");
      item.className = "user-item";

      item.innerHTML = `
        <h3>${user.display_name || "No display name"}</h3>
        <p class="user-meta"><strong>Email:</strong> ${user.email || "No email"}</p>
        <p class="user-meta"><strong>Approved:</strong> ${user.approved ? "Yes" : "No"}</p>
        <p class="user-meta"><strong>Role:</strong> ${user.role || "member"}</p>
        <div class="user-actions">
          <button class="btn btn-primary approve-btn" data-id="${user.id}" data-approved="${user.approved}">
            ${user.approved ? "Unapprove" : "Approve"}
          </button>
          <button class="btn btn-secondary role-btn" data-id="${user.id}" data-role="${user.role}">
            ${user.role === "admin" ? "Make Member" : "Make Admin"}
          </button>
          <button class="btn btn-secondary reset-password-btn" data-id="${user.id}">
            Reset Password
          </button>
          <button class="btn btn-danger delete-user-btn" data-id="${user.id}">
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
          if (adminMessage) adminMessage.textContent = error.message;
          console.error("APPROVE ERROR:", error);
          return;
        }

        if (adminMessage) adminMessage.textContent = "Approval updated.";
        loadUsers();
      });
    });

    document.querySelectorAll(".role-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const currentRole = btn.dataset.role;
        const newRole = currentRole === "admin" ? "member" : "admin";

        const { error } = await window.supabaseClient
          .from("profiles")
          .update({ role: newRole })
          .eq("id", id);

        if (error) {
          if (adminMessage) adminMessage.textContent = error.message;
          console.error("ROLE ERROR:", error);
          return;
        }

        if (adminMessage) adminMessage.textContent = "Role updated.";
        loadUsers();
      });
    });

    document.querySelectorAll(".reset-password-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const newPassword = prompt("Enter a new temporary password for this member:");

        if (!newPassword) return;

        if (newPassword.length < 6) {
          if (adminMessage) adminMessage.textContent = "Password must be at least 6 characters.";
          return;
        }

        if (adminMessage) adminMessage.textContent = "Resetting password...";

        const result = await callAdminMemberTools({
          action: "reset_password",
          user_id: id,
          new_password: newPassword,
        });

        console.log("RESET PASSWORD RESULT:", result);

        if (result.error) {
          if (adminMessage) adminMessage.textContent = result.error;
          return;
        }

        if (adminMessage) adminMessage.textContent = "Password reset successfully.";
      });
    });

    document.querySelectorAll(".delete-user-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;

        const confirmed = confirm(
          "Are you sure you want to permanently delete this user? This cannot be undone."
        );

        if (!confirmed) return;

        if (adminMessage) adminMessage.textContent = "Deleting user...";

        const result = await callAdminMemberTools({
          action: "delete_user",
          user_id: id,
        });

        console.log("DELETE USER RESULT:", result);

        if (result.error) {
          if (adminMessage) adminMessage.textContent = result.error;
          return;
        }

        if (adminMessage) adminMessage.textContent = "User deleted successfully.";
        loadUsers();
      });
    });
  }

  if (createMemberForm) {
    createMemberForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!createMemberMessage) return;

      createMemberMessage.textContent = "Creating account...";

      const display_name = document.getElementById("new-member-name")?.value.trim() || "";
      const email = document.getElementById("new-member-email")?.value.trim() || "";
      const password = document.getElementById("new-member-password")?.value.trim() || "";

      try {
        const {
          data: { session },
          error: sessionError,
        } = await window.supabaseClient.auth.getSession();

        if (sessionError) {
          console.error("SESSION ERROR:", sessionError);
          createMemberMessage.textContent = "Could not verify session.";
          return;
        }

        if (!session) {
          createMemberMessage.textContent = "You must be logged in.";
          return;
        }

        const response = await fetch(
          "https://vhpbmkdtlajdohhxawno.supabase.co/functions/v1/swift-endpoint",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              display_name,
              email,
              password,
            }),
          }
        );

        let result = null;

        try {
          result = await response.json();
        } catch (jsonError) {
          console.error("JSON PARSE ERROR:", jsonError);
        }

        console.log("CREATE MEMBER RESPONSE STATUS:", response.status);
        console.log("CREATE MEMBER RESPONSE:", result);

        if (!response.ok) {
          createMemberMessage.textContent =
            result?.error || `Could not create account. Status: ${response.status}`;
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
