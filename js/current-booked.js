document.addEventListener("DOMContentLoaded", async () => {
  const logoutBtn = document.getElementById("logout-btn");

  const requestBtn = document.getElementById("reservation-request-btn");
  const requestNote = document.getElementById("reservation-request-note");
  const requestMessage = document.getElementById("reservation-request-message");

  // Make sure Supabase loaded
  if (!window.supabaseClient) {
    console.error("Supabase client is not available.");
    return;
  }

  // Get current session
  const {
    data: { session },
    error: sessionError,
  } = await window.supabaseClient.auth.getSession();

  if (sessionError) {
    console.error("SESSION ERROR:", sessionError);
    return;
  }

  // Only redirect if the person truly is not logged in
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  const user = session.user;

  // Notifications
  if (typeof window.setupNotifications === "function") {
    try {
      await window.setupNotifications(user.id);
    } catch (err) {
      console.error("NOTIFICATION SETUP ERROR:", err);
    }
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.supabaseClient.auth.signOut();
      window.location.href = "login.html";
    });
  }

  // Tabs
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.tab;

      tabButtons.forEach((btn) => {
        btn.classList.remove("active");
      });

      tabPanels.forEach((panel) => {
        panel.classList.remove("active");
      });

      button.classList.add("active");

      const targetPanel = document.getElementById(target);

      if (targetPanel) {
        targetPanel.classList.add("active");
      }
    });
  });

  // Reservation request system
  async function checkExistingRequest() {
    if (!requestBtn || !requestMessage) {
      return;
    }

    try {
      const { data, error } = await window.supabaseClient
        .from("reservation_requests")
        .select("id, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("RESERVATION REQUEST LOAD ERROR:", error);

        requestMessage.textContent =
          "Reservation request system is temporarily unavailable.";

        return;
      }

      if (!data || data.length === 0) {
        return;
      }

      const request = data[0];

      if (request.status === "pending") {
        requestBtn.disabled = true;
        requestBtn.textContent = "Request Pending";

        requestMessage.textContent =
          "Your reservation information request is waiting for an admin.";
      } else if (request.status === "approved") {
        requestMessage.textContent =
          "Your request was approved. Contact an admin for the group reservation information.";
      } else if (request.status === "completed") {
        requestMessage.textContent =
          "Your reservation information request was completed.";
      } else if (request.status === "declined") {
        requestMessage.textContent =
          "Your previous request was declined. You may submit another request.";
      }
    } catch (err) {
      console.error("RESERVATION REQUEST CHECK CRASH:", err);
    }
  }

  if (requestBtn) {
    requestBtn.addEventListener("click", async () => {
      requestBtn.disabled = true;

      requestMessage.textContent =
        "Sending request...";

      const note = requestNote?.value.trim() || "";

      try {
        const { data: profile, error: profileError } =
          await window.supabaseClient
            .from("profiles")
            .select("display_name, email")
            .eq("id", user.id)
            .single();

        if (profileError) {
          console.error("PROFILE LOAD ERROR:", profileError);
        }

        const { error: insertError } =
          await window.supabaseClient
            .from("reservation_requests")
            .insert({
              user_id: user.id,
              note: note || null,
              status: "pending",
            });

        if (insertError) {
          console.error(
            "RESERVATION REQUEST INSERT ERROR:",
            insertError
          );

          if (insertError.code === "23505") {
            requestMessage.textContent =
              "You already have a pending request.";

            requestBtn.textContent =
              "Request Pending";
          } else {
            requestMessage.textContent =
              "Could not send your request.";

            requestBtn.disabled = false;
          }

          return;
        }

        const person =
          profile?.display_name ||
          profile?.email ||
          "A member";

        if (typeof window.createNotification === "function") {
          try {
            await window.createNotification({
              type: "reservation_request",
              title: "Reservation Info Requested",
              message:
                `${person} requested the group reservation information.` +
                `${note ? ` Note: ${note}` : ""}`,
            });
          } catch (notificationError) {
            console.error(
              "RESERVATION NOTIFICATION ERROR:",
              notificationError
            );
          }
        }

        requestBtn.textContent =
          "Request Pending";

        requestMessage.textContent =
          "Request sent! An admin can now review it.";
      } catch (err) {
        console.error(
          "RESERVATION REQUEST CRASH:",
          err
        );

        requestMessage.textContent =
          "Could not send the request.";

        requestBtn.disabled = false;
      }
    });
  }

  await checkExistingRequest();
});
