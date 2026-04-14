document.addEventListener("DOMContentLoaded", async () => {
  const bookedAlreadyEl = document.getElementById("booked-already");
  const welcomeTitle = document.getElementById("welcome-title");
  const logoutBtn = document.getElementById("logout-btn");
  const adminLink = document.getElementById("admin-link");
  const dashboardExcursionsList = document.getElementById("dashboard-excursions-list");

  try {
    if (!window.supabaseClient) {
      window.location.href = "login.html";
      return;
    }

    const {
      data: { session },
      error: sessionError,
    } = await window.supabaseClient.auth.getSession();

    if (sessionError) {
      console.error("SESSION ERROR:", sessionError);
      if (bookedAlreadyEl) bookedAlreadyEl.textContent = "Session error";
      return;
    }

    if (!session) {
      window.location.href = "login.html";
      return;
    }

    const user = session.user;

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await window.supabaseClient.auth.signOut();
        window.location.href = "login.html";
      });
    }

    const { data: myProfile, error: myProfileError } = await window.supabaseClient
      .from("profiles")
      .select("id, display_name, email, approved, role")
      .eq("id", user.id)
      .single();

    if (myProfileError) {
      console.error("MY PROFILE ERROR:", myProfileError);
      if (bookedAlreadyEl) bookedAlreadyEl.textContent = "Profile error";
      return;
    }

    if (!myProfile) {
      if (bookedAlreadyEl) bookedAlreadyEl.textContent = "No profile found";
      return;
    }

    if (!myProfile.approved) {
      window.location.href = "pending.html";
      return;
    }

    if (welcomeTitle) {
      welcomeTitle.textContent = `Welcome, ${myProfile.display_name || myProfile.email || "Member"}`;
    }

    if (adminLink && myProfile.role === "admin") {
      adminLink.classList.remove("hidden");
    }

    if (bookedAlreadyEl) {
      bookedAlreadyEl.textContent = "Checking booked members...";
    }

    const { data: bookedMembers, error: bookedError } = await window.supabaseClient
      .from("profiles")
      .select("display_name, email")
      .eq("approved", true)
      .eq("cruise_status", "booked");

    if (bookedError) {
      console.error("BOOKED MEMBERS ERROR:", bookedError);
      if (bookedAlreadyEl) bookedAlreadyEl.textContent = "Could not load booked members";
    } else if (!bookedMembers || bookedMembers.length === 0) {
      if (bookedAlreadyEl) bookedAlreadyEl.textContent = "Nobody yet";
    } else {
      const names = bookedMembers.map((member) => {
        if (member.display_name && member.display_name.trim() !== "") {
          return member.display_name.trim();
        }
        return member.email || "Unnamed Member";
      });

      if (bookedAlreadyEl) {
        bookedAlreadyEl.textContent = names.join(", ");
      }
    }

    if (dashboardExcursionsList) {
      dashboardExcursionsList.innerHTML = `<p class="small-text">Loading excursions...</p>`;
    }

const { data: excursionRows, error: excursionError } = await window.supabaseClient
  .from("member_excursions")
  .select(`
    booked,
    booked_time,
    notes,
    excursions (
      excursion_name,
      port_name
    ),
    profiles (
      display_name,
      email
    )
  `)
  .eq("booked", true);

    if (excursionError) {
      console.error("DASHBOARD EXCURSIONS ERROR:", excursionError);
      if (dashboardExcursionsList) {
        dashboardExcursionsList.innerHTML = `<p class="small-text">Could not load excursion activity.</p>`;
      }
      return;
    }

    if (!excursionRows || excursionRows.length === 0) {
      if (dashboardExcursionsList) {
        dashboardExcursionsList.innerHTML = `<p class="small-text">No excursions marked yet.</p>`;
      }
      return;
    }

    const sortedRows = excursionRows.sort((a, b) => {
      const nameA = (a.profiles?.display_name || a.profiles?.email || "").toLowerCase();
      const nameB = (b.profiles?.display_name || b.profiles?.email || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });

    if (dashboardExcursionsList) {
      dashboardExcursionsList.innerHTML = sortedRows
        .map((row) => {
          const person = row.profiles?.display_name || row.profiles?.email || "Member";
          const excursion = row.excursions?.excursion_name || "Excursion";
          const port = row.excursions?.port_name || "";
          const time = row.booked_time ? ` — ${row.booked_time}` : "";
          return `
            <div class="dashboard-mini-item">
              <strong>${person}</strong> — ${excursion}${time}
              <div class="small-text">${port}</div>
            </div>
          `;
        })
        .join("");
    }
  } catch (err) {
    console.error("DASHBOARD CRASH:", err);
    if (bookedAlreadyEl) bookedAlreadyEl.textContent = "Dashboard error";
  }
});
