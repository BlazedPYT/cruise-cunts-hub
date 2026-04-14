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
  const photoPreview = document.getElementById("profile-photo-preview");
  const noPhotoBox = document.getElementById("no-photo-box");
  const avatarFileInput = document.getElementById("avatar_file");

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.supabaseClient.auth.signOut();
      window.location.href = "login.html";
    });
  }

  function setPhoto(url) {
    if (url && url.trim() !== "") {
      photoPreview.src = url;
      photoPreview.classList.remove("hidden");
      noPhotoBox.classList.add("hidden");
    } else {
      photoPreview.classList.add("hidden");
      noPhotoBox.classList.remove("hidden");
    }
  }

  avatarFileInput.addEventListener("change", () => {
    const file = avatarFileInput.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setPhoto(previewUrl);
  });

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
  document.getElementById("cruise_status").value = profile.cruise_status || "interested";
  document.getElementById("room_number").value = profile.room_number || "";
  document.getElementById("favorite_ship").value = profile.favorite_ship || "";
  document.getElementById("hometown").value = profile.hometown || "";
  document.getElementById("instagram").value = profile.instagram || "";
  document.getElementById("ships_sailed").value = profile.ships_sailed || "";
  document.getElementById("bio").value = profile.bio || "";

  setPhoto(profile.avatar_url || "");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    message.textContent = "Saving profile...";

    let avatarUrl = profile.avatar_url || "";
    const file = avatarFileInput.files[0];

    if (file) {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/profile-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await window.supabaseClient.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("UPLOAD ERROR:", uploadError);
        message.textContent = "Could not upload profile photo.";
        return;
      }

      const { data: publicUrlData } = window.supabaseClient.storage
        .from("avatars")
        .getPublicUrl(filePath);

      avatarUrl = publicUrlData.publicUrl;
    }

    const updates = {
      display_name: document.getElementById("display_name").value.trim(),
      avatar_url: avatarUrl,
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
      console.error("PROFILE UPDATE ERROR:", updateError);
      message.textContent = "Could not save profile.";
      return;
    }

    message.textContent = "Profile saved.";
    setPhoto(avatarUrl);
  });
});
