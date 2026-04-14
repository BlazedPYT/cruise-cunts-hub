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

  logoutBtn.addEventListener("click", async () => {
    await window.supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });

  async function loadUsers() {
    userList.innerHTML = "Loading users...";

    const { data, error } = await window.supabaseClient
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

        const { error } = await window.supabaseClient
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

        const { error } = await window.supabaseClient
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

  if (createMemberForm) {
    createMemberForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      createMemberMessage.textContent = "Creating account...";

      const display_name = document.getElementById("new-member-name").value.trim();
      const email = document.getElementById("new-member-email").value.trim();
      const password = document.getElementById("new-member-password").value.trim();

      try {
        const {
          data: { session },
        } = await window.supabaseClient.auth.getSession();

        if (!session) {
          createMemberMessage.textContent = "You must be logged in.";
          return;
        }

        const response = await fetch("https://vhpbmkdtlajdohhxawno.supabase.co/functions/v1/create-member", {
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
        });

        const result = await response.json();

        if (!response.ok) {
          createMemberMessage.textContent = result.error || "Could not create account.";
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
