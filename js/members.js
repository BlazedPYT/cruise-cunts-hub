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
  const membersGrid = document.getElementById("members-grid");
  const membersMessage = document.getElementById("members-message");

  if (typeof window.setupNotifications === "function") {
    await window.setupNotifications(user.id);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.supabaseClient.auth.signOut();
      window.location.href = "login.html";
    });
  }

  membersMessage.textContent = "Loading members...";

  const { data: myProfile, error: myProfileError } = await window.supabaseClient
    .from("profiles")
    .select("id, role, approved")
    .eq("id", user.id)
    .single();

  if (myProfileError || !myProfile || !myProfile.approved) {
    console.error("PROFILE LOAD ERROR:", myProfileError);
    window.location.href = "login.html";
    return;
  }

  const isAdmin = myProfile.role === "admin";

  const { data: members, error } = await window.supabaseClient
    .from("profiles")
    .select("id, display_name, email, avatar_url, cruise_status, room_number, bio, ships_sailed, favorite_ship, instagram, hometown, approved")
    .eq("approved", true)
    .order("display_name", { ascending: true });

  if (error) {
    membersMessage.textContent = "Could not load members.";
    console.error("MEMBERS LOAD ERROR:", error);
    return;
  }

  if (!members || members.length === 0) {
    membersMessage.textContent = "No approved members found yet.";
    return;
  }

  membersMessage.textContent = "";

  membersGrid.innerHTML = members
    .map((member) => {
      const avatar =
        member.avatar_url && member.avatar_url.trim() !== ""
          ? `<img class="member-avatar" src="${member.avatar_url}" alt="${member.display_name || "Member"}" />`
          : `<div class="member-avatar member-avatar-empty">No Photo Yet</div>`;

      const ships = member.ships_sailed
        ? member.ships_sailed
            .split(",")
            .map((ship) => ship.trim())
            .filter(Boolean)
            .map((ship) => `<span class="ship-pill">${ship}</span>`)
            .join("")
        : `<span class="small-text">No ships added yet</span>`;

      const adminButton = isAdmin
        ? `<a class="btn btn-secondary" href="profile.html?user=${member.id}">Edit Member</a>`
        : "";

      return `
        <article class="member-card">
          ${avatar}
          <div class="member-card-body">
            <h3>${member.display_name || "Unnamed Member"}</h3>
            <p><strong>Status:</strong> ${member.cruise_status || "interested"}</p>
            <p><strong>Room:</strong> ${member.room_number || "Not added yet"}</p>
            <p><strong>Favorite Ship:</strong> ${member.favorite_ship || "Not added yet"}</p>
            <p><strong>Hometown:</strong> ${member.hometown || "Not added yet"}</p>
            <p><strong>Bio:</strong> ${member.bio || "No bio yet."}</p>
            <p><strong>Instagram:</strong> ${member.instagram || "Not added yet"}</p>
            <div class="ship-pill-row">${ships}</div>
            <div class="button-row" style="margin-top: 1rem;">
              ${adminButton}
            </div>
          </div>
        </article>
      `;
    })
    .join("");
});
