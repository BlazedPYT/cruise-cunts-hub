// js/auth.js

async function requireAuth(redirectToPending = false) {
  if (!window.supabaseClient) {
    window.location.href = "login.html";
    return null;
  }

  const {
    data: { session },
    error: sessionError,
  } = await window.supabaseClient.auth.getSession();

  if (sessionError) {
    console.error("SESSION ERROR:", sessionError);
    window.location.href = "login.html";
    return null;
  }

  if (!session) {
    window.location.href = "login.html";
    return null;
  }

  const user = session.user;

  const { data: profile, error: profileError } = await window.supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("PROFILE ERROR:", profileError);
    window.location.href = "login.html";
    return null;
  }

  if (!profile) {
    window.location.href = "login.html";
    return null;
  }

  if (redirectToPending && !profile.approved) {
    window.location.href = "pending.html";
    return null;
  }

  return { user, profile, session };
}
