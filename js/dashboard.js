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
  const welcomeTitle = document.getElementById("welcome-title");
  const logoutBtn = document.getElementById("logout-btn");
  const adminLink = document.getElementById("admin-link");
  const bookedAlreadyEl = document.getElementById("booked-already");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.supabaseClient.auth.signOut();
      window.location.href = "login.html";
    });
  }

  const { data: myProfile, error: myProfileError } = await window.supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (myProfileError || !myProfile) {
    console.error("PROFILE LOAD ERROR:", myProfileError);
    window.location.href = "login.html";
    return;
  }

  if (!myProfile.approved) {
    window.location.href = "pending.html";
    return;
  }

  if (welcomeTitle) {
    welcomeTitle.textContent = `Welcome, ${myProfile.display_name || user.email}`;
  }

  if (adminLink && myProfile.role === "admin") {
    adminLink.classList.remove("hidden");
  }

  if (bookedAlreadyEl) {
    const { data: bookedMembers, error: bookedError } = await window.supabaseClient
      .from("profiles")
      .select("display_name, email")
      .eq("approved", true)
      .eq("cruise_status", "booked")
      .order("display_name", { ascending: true });

    if (bookedError) {
      console.error("BOOKED MEMBERS ERROR:", bookedError);
      bookedAlreadyEl.textContent = "Could not load booked members";
      return;
    }

    if (!bookedMembers || bookedMembers.length === 0) {
      bookedAlreadyEl.textContent = "Nobody yet";
      return;
    }

    const names = bookedMembers.map((member) => {
      return member.display_name && member.display_name.trim() !== ""
        ? member.display_name
        : member.email;
    });

    bookedAlreadyEl.textContent = names.join(", ");
  }
});
