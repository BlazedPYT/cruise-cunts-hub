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
  const form = document.getElementById("profile-form");
  const message = document.getElementById("profile-message");

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.supabaseClient.auth.signOut();
      window.location.href = "login.html";
    });
  }

  const { data: profile, error } = await window.supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    message.textContent = "Could not load your profile.";
    console.error(error);
    return;
  }

  document.getElementById("display_name").value = profile.display_name || "";
  document.getElementById("avatar_url").value = profile.avatar_url || "";
  document.getElementById("cruise_status").value = profile.cruise_status || "interested";
  document.getElementById("room_number").value = profile.room_number || "";
  document.getElementById("favorite_ship").value = profile.favorite_ship || "";
  document.getElementById("hometown").value = profile.hometown || "";
  document.getElementById("instagram").value = profile.instagram || "";
  document.getElementById("ships_sailed").value = profile.ships_sailed || "";
  document.getElementById("bio").value = profile.bio || "";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    message.textContent = "Saving profile...";

    const updates = {
      display_name: document.getElementById("display_name").value.trim(),
      avatar_url: document.getElementById("avatar_url").value.trim(),
      cruise_status: document.getElementById("cruise_status").value,
      room_number: document.getElementById("room_number").value.trim(),
      favorite_ship: document.getElementById("favorite_ship").value.trim(),
      hometown: document.getElementById("hometown").value.trim(),
      instagram: document.getElementById("instagram").value.trim(),
      ships_sailed: document.getElementById("ships_sailed").value.trim(),
      bio: document.getElementById("bio").value.trim(),
    };

    const { error: updateError } = await window.supabaseClient
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (updateError) {
      message.textContent = "Could not save profile.";
      console.error(updateError);
      return;
    }

    message.textContent = "Profile saved.";
  });
});
