async function getCurrentUser() {
  const { data, error } = await window.supabaseClient.auth.getUser();

  if (error) {
    console.error(error);
    return null;
  }

  return data.user;
}

async function getProfile(userId) {
  const { data, error } = await window.supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Profile fetch error:", error);
    return null;
  }

  return data;
}

async function requireAuth(allowPending = false) {
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = "login.html";
    return null;
  }

  const profile = await getProfile(user.id);

  if (!profile) {
    window.location.href = "login.html";
    return null;
  }

  if (!allowPending && !profile.approved) {
    window.location.href = "pending.html";
    return null;
  }

  return { user, profile };
}
