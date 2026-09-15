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

  const logoutBtn =
    document.getElementById("logout-btn");

  const requestBtn =
    document.getElementById("reservation-request-btn");

  const requestNote =
    document.getElementById("reservation-request-note");

  const requestMessage =
    document.getElementById("reservation-request-message");


  if (typeof window.setupNotifications === "function") {
    await window.setupNotifications(user.id);
  }


  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.supabaseClient.auth.signOut();

      window.location.href =
        "login.html";
    });
  }



  const tabButtons =
    document.querySelectorAll(".tab-btn");

  const tabPanels =
    document.querySelectorAll(".tab-panel");


  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target =
        button.dataset.tab;

      tabButtons.forEach((btn) =>
        btn.classList.remove("active")
      );

      tabPanels.forEach((panel) =>
        panel.classList.remove("active")
      );

      button.classList.add("active");

      const targetPanel =
        document.getElementById(target);

      if (targetPanel) {
        targetPanel.classList.add("active");
      }
    });
  });



  async function checkExistingRequest() {
    if (!requestBtn || !requestMessage) {
      return;
    }

    const {
      data,
      error,
    } = await window.supabaseClient
      .from("reservation_requests")
      .select("id, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(1);

    if (error) {
      console.error(
        "LOAD RESERVATION REQUEST ERROR:",
        error
      );

      return;
    }

    if (!data || data.length === 0) {
      return;
    }

    const request = data[0];

    if (request.status === "pending") {
      requestBtn.disabled = true;

      requestBtn.textContent =
        "Request Pending";

      requestMessage.textContent =
        "Your reservation information request is waiting for an admin.";
    }

    if (request.status === "approved") {
      requestMessage.textContent =
        "Your request was approved. Contact an admin for the group reservation information.";
    }

    if (request.status === "completed") {
      requestMessage.textContent =
        "Your reservation information request was completed.";
    }

    if (request.status === "declined") {
      requestMessage.textContent =
        "Your previous request was declined. You may submit a new request.";
    }
  }



  if (requestBtn) {
    requestBtn.addEventListener(
      "click",
      async () => {

        requestBtn.disabled = true;

        requestMessage.textContent =
          "Sending request...";


        const note =
          requestNote?.value.trim() || "";


        const {
          data: profile,
          error: profileError,
        } = await window.supabaseClient
          .from("profiles")
          .select(
            "display_name, email"
          )
          .eq("id", user.id)
          .single();


        if (profileError) {
          console.error(
            "REQUEST PROFILE ERROR:",
            profileError
          );
        }


        const {
          error,
        } = await window.supabaseClient
          .from("reservation_requests")
          .insert({
            user_id: user.id,
            note: note || null,
            status: "pending",
          });


        if (error) {
          console.error(
            "RESERVATION REQUEST ERROR:",
            error
          );


          if (
            error.code === "23505"
          ) {
            requestMessage.textContent =
              "You already have a pending request.";
          } else {
            requestMessage.textContent =
              "Could not send your request.";
          }


          requestBtn.disabled = false;

          return;
        }


        const person =
          profile?.display_name ||
          profile?.email ||
          "A member";


        if (
          typeof window.createNotification ===
          "function"
        ) {
          await window.createNotification({
            type:
              "reservation_request",

            title:
              "Reservation Info Requested",

            message:
              `${person} requested the group reservation information.` +
              `${note ? ` Note: ${note}` : ""}`,
          });
        }


        requestBtn.textContent =
          "Request Pending";

        requestMessage.textContent =
          "Request sent! An admin can now review it.";
      }
    );
  }


  await checkExistingRequest();
});
