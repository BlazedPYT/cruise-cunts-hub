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

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.supabaseClient.auth.signOut();
      window.location.href = "login.html";
    });
  }

  const membersGrid = document.getElementById("members-grid");
  const membersMessage = document.getElementById("members-message");

  membersMessage.textContent = "Loading members...";

  const user = session.user;

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
    console.error(error);
    return;
  }

  if (!members || members.length === 0) {
    membersMessage.textContent = "No approved members found yet.";
    return;
  }

  membersMessage.textContent = "";

  membersGrid.innerHTML = members
    .map((member) => {
      const avatar = member.avatar_url && member.avatar_url.trim() !== ""
        ? `<img class="member-avatar" src="${member.avatar_url}" alt="${member.display_name || "Member"}" />`
        : `<div class="member-avatar member-avatar-empty">No Photo Yet</div>`;

      const ships = member.ships_sailed
        ? member.ships_sailed
            .split(",")
            .map((ship) => ship.trim())
            .filter(Boolean)
            .map((ship) => `<span class="tag">${ship}</span>`)
            .join("")
        : `<span class="tag">No ships added yet</span>`;

      const adminButton = isAdmin
        ? `<div class="button-row" style="margin-top: 1rem;">
             <a class="btn btn-secondary" href="admin-edit-member.html?id=${member.id}">Edit Member</a>
           </div>`
        : "";

      return `
        <article class="member-card">
          ${avatar}
          <div class="member-content">
            <h3>${member.display_name || "Unnamed Member"}</h3>
            <p class="member-status"><strong>Status:</strong> ${member.cruise_status || "interested"}</p>
            <p><strong>Room:</strong> ${member.room_number || "Not added yet"}</p>
            <p><strong>Favorite Ship:</strong> ${member.favorite_ship || "Not added yet"}</p>
            <p><strong>Hometown:</strong> ${member.hometown || "Not added yet"}</p>
            <p><strong>Bio:</strong> ${member.bio || "No bio yet."}</p>
            <p><strong>Instagram:</strong> ${member.instagram || "Not added yet"}</p>
            <div class="tag-row">
              ${ships}
            </div>
            ${adminButton}
          </div>
        </article>
      `;
    })
    .join("");
});
