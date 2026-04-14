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

  const { data: members, error } = await window.supabaseClient
    .from("profiles")
    .select("id, display_name, email, avatar_url, cruise_status, room_number, bio, ships_sailed, favorite_ship, instagram, hometown")
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
        ? member.avatar_url
        : "https://placehold.co/300x300?text=Cruise+Cunt";

      const ships = member.ships_sailed
        ? member.ships_sailed
            .split(",")
            .map((ship) => ship.trim())
            .filter(Boolean)
            .map((ship) => `<span class="tag">${ship}</span>`)
            .join("")
        : `<span class="tag">No ships added yet</span>`;

      return `
        <article class="member-card">
          <img class="member-avatar" src="${avatar}" alt="${member.display_name || "Member"}" />
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
          </div>
        </article>
      `;
    })
    .join("");
});
