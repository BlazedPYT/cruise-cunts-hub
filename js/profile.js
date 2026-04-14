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

  const currentUser = session.user;
  const form = document.getElementById("profile-form");
  const message = document.getElementById("profile-message");
  const photoPreview = document.getElementById("profile-photo-preview");
  const noPhotoBox = document.getElementById("no-photo-box");
  const avatarFileInput = document.getElementById("avatar_file");
  const logoutBtn = document.getElementById("logout-btn");

  if (typeof window.setupNotifications === "function") {
    await window.setupNotifications(currentUser.id);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.supabaseClient.auth.signOut();
      window.location.href = "login.html";
    });
  }

  const params = new URLSearchParams(window.location.search);
  const editingUserId = params.get("user") || currentUser.id;

  const { data: currentProfile, error: currentProfileError } = await window.supabaseClient
    .from("profiles")
    .select("id, role, approved, display_name, email")
    .eq("id", currentUser.id)
    .single();

  if (currentProfileError || !currentProfile || !currentProfile.approved) {
    console.error("CURRENT PROFILE ERROR:", currentProfileError);
    window.location.href = "login.html";
    return;
  }

  const canEditOtherUser = currentProfile.role === "admin";
  const isEditingSelf = editingUserId === currentUser.id;

  if (!isEditingSelf && !canEditOtherUser) {
    window.location.href = "dashboard.html";
    return;
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

  if (avatarFileInput) {
    avatarFileInput.addEventListener("change", () => {
      const file = avatarFileInput.files[0];
      if (!file) return;
      const previewUrl = URL.createObjectURL(file);
      setPhoto(previewUrl);
    });
  }

  const { data: profile, error } = await window.supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", editingUserId)
    .single();

  if (error || !profile) {
    message.textContent = "Could not load profile.";
    console.error("LOAD TARGET PROFILE ERROR:", error);
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

  const originalCruiseStatus = profile.cruise_status || "interested";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    message.textContent = "Saving profile...";

    let avatarUrl = profile.avatar_url || "";
    const file = avatarFileInput?.files?.[0];

    if (file) {
      const fileExt = file.name.split(".").pop() || "jpg";
      const filePath = `${editingUserId}/profile-${Date.now()}.${fileExt}`;

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
      .eq("id", editingUserId);

    if (updateError) {
      console.error("PROFILE UPDATE ERROR:", updateError);
      message.textContent = "Could not save profile.";
      return;
    }

    if (
      updates.cruise_status === "booked" &&
      originalCruiseStatus !== "booked" &&
      typeof window.createNotification === "function"
    ) {
      const nameForNotice =
        updates.display_name ||
        profile.display_name ||
        profile.email ||
        "A member";

      await window.createNotification({
        type: "cruise_status",
        title: "New Cruise Booking",
        message: `${nameForNotice} marked themselves as booked for the current cruise.`,
        link_url: "members.html",
        meta: {
          user_id: editingUserId,
          cruise_status: "booked",
        },
      });
    }

    message.textContent = isEditingSelf
      ? "Profile saved."
      : "Member profile saved.";

    setPhoto(avatarUrl);
  });
});
