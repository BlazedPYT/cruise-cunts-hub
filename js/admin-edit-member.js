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
  const form = document.getElementById("admin-member-form");
  const message = document.getElementById("admin-member-message");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.supabaseClient.auth.signOut();
      window.location.href = "login.html";
    });
  }

  const user = session.user;

  const { data: myProfile, error: myProfileError } = await window.supabaseClient
    .from("profiles")
    .select("id, role, approved")
    .eq("id", user.id)
    .single();

  if (myProfileError || !myProfile || !myProfile.approved || myProfile.role !== "admin") {
    console.error("ADMIN ACCESS ERROR:", myProfileError);
    window.location.href = "dashboard.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const memberId = params.get("id");

  if (!memberId) {
    message.textContent = "No member selected.";
    return;
  }

  const { data: member, error: memberError } = await window.supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", memberId)
    .single();

  if (memberError || !member) {
    console.error("MEMBER LOAD ERROR:", memberError);
    message.textContent = "Could not load member.";
    return;
  }

  document.getElementById("display_name").value = member.display_name || "";
  document.getElementById("cruise_status").value = member.cruise_status || "interested";
  document.getElementById("room_number").value = member.room_number || "";
  document.getElementById("favorite_ship").value = member.favorite_ship || "";
  document.getElementById("hometown").value = member.hometown || "";
  document.getElementById("instagram").value = member.instagram || "";
  document.getElementById("ships_sailed").value = member.ships_sailed || "";
  document.getElementById("bio").value = member.bio || "";
  document.getElementById("approved").value = String(member.approved);
  document.getElementById("role").value = member.role || "member";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    message.textContent = "Saving changes...";

    const updates = {
      display_name: document.getElementById("display_name").value.trim(),
      cruise_status: document.getElementById("cruise_status").value,
      room_number: document.getElementById("room_number").value.trim(),
      favorite_ship: document.getElementById("favorite_ship").value.trim(),
      hometown: document.getElementById("hometown").value.trim(),
      instagram: document.getElementById("instagram").value.trim(),
      ships_sailed: document.getElementById("ships_sailed").value.trim(),
      bio: document.getElementById("bio").value.trim(),
      approved: document.getElementById("approved").value === "true",
      role: document.getElementById("role").value,
    };

    const { error: updateError } = await window.supabaseClient
      .from("profiles")
      .update(updates)
      .eq("id", memberId);

    if (updateError) {
      console.error("ADMIN UPDATE ERROR:", updateError);
      message.textContent = "Could not save changes.";
      return;
    }

    message.textContent = "Member updated.";
  });
});
