document.addEventListener("DOMContentLoaded", async () => {
  const logoutBtn =
    document.getElementById("logout-btn");

  const requestBtn =
    document.getElementById("reservation-request-btn");

  const requestNote =
    document.getElementById("reservation-request-note");

  const requestMessage =
    document.getElementById("reservation-request-message");

  const memberReservationInput =
    document.getElementById("member-reservation-number");

  const memberReservationSubmitBtn =
    document.getElementById("member-reservation-submit-btn");

  const memberReservationStatus =
    document.getElementById("member-reservation-status");

  const tabButtons =
    document.querySelectorAll(".tab-btn");

  const tabPanels =
    document.querySelectorAll(".tab-panel");


  /*
    --------------------------------------------------
    TABS
    --------------------------------------------------
  */

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

      const targetPanel =
        document.getElementById(target);

      if (targetPanel) {
        targetPanel.classList.add("active");
      }
    });
  });


  /*
    --------------------------------------------------
    SUPABASE
    --------------------------------------------------
  */

  if (!window.supabaseClient) {
    console.error("Supabase client did not load.");
    return;
  }


  /*
    --------------------------------------------------
    AUTH
    --------------------------------------------------
  */

  let currentUser = null;

  try {
    const {
      data: { session },
      error: sessionError,
    } =
      await window.supabaseClient.auth.getSession();

    if (sessionError) {
      console.error(
        "SESSION ERROR:",
        sessionError
      );
    }

    if (session?.user) {
      currentUser =
        session.user;
    }
  } catch (err) {
    console.error(
      "GET SESSION CRASH:",
      err
    );
  }


  if (!currentUser) {
    try {
      const {
        data: { user },
      } =
        await window.supabaseClient.auth.getUser();

      if (user) {
        currentUser =
          user;
      }
    } catch (err) {
      console.error(
        "GET USER CRASH:",
        err
      );
    }
  }


  if (!currentUser) {
    const main =
      document.querySelector("main");

    if (main) {
      main.innerHTML = `
        <section
          class="card"
          style="
            max-width: 720px;
            margin: 2rem auto;
            text-align: center;
          "
        >
          <h1>Login Required</h1>

          <p>
            Log back in to view the current cruise.
          </p>

          <a
            class="btn btn-primary"
            href="login.html"
          >
            Go to Login
          </a>
        </section>
      `;
    }

    return;
  }


  const user =
    currentUser;


  /*
    --------------------------------------------------
    NOTIFICATIONS
    --------------------------------------------------
  */

  if (
    typeof window.setupNotifications ===
    "function"
  ) {
    try {
      await window.setupNotifications(
        user.id
      );
    } catch (err) {
      console.error(
        "NOTIFICATION ERROR:",
        err
      );
    }
  }


  /*
    --------------------------------------------------
    LOGOUT
    --------------------------------------------------
  */

  if (logoutBtn) {
    logoutBtn.addEventListener(
      "click",
      async () => {

        await window.supabaseClient.auth.signOut();

        window.location.href =
          "login.html";
      }
    );
  }


  /*
    --------------------------------------------------
    MY RESERVATION
    --------------------------------------------------
  */

  async function loadMyReservation() {
    if (
      !memberReservationStatus ||
      !memberReservationSubmitBtn
    ) {
      return;
    }


    const {
      data,
      error,
    } =
      await window.supabaseClient
        .from("member_reservations")
        .select(`
          id,
          reservation_number,
          status,
          created_at,
          reviewed_at
        `)
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(1);


    if (error) {
      console.error(
        "LOAD MEMBER RESERVATION ERROR:",
        error
      );

      memberReservationStatus.textContent =
        "Could not load your reservation status.";

      return;
    }


    if (
      !data ||
      data.length === 0
    ) {
      memberReservationStatus.innerHTML = `
        <p class="small-text">
          You have not submitted a reservation yet.
        </p>
      `;

      memberReservationSubmitBtn.disabled =
        false;

      memberReservationSubmitBtn.textContent =
        "Submit My Reservation";

      if (memberReservationInput) {
        memberReservationInput.disabled =
          false;
      }

      return;
    }


    const reservation =
      data[0];


    if (
      memberReservationInput
    ) {
      memberReservationInput.value =
        reservation.reservation_number || "";
    }


    if (
      reservation.status ===
      "pending"
    ) {
      memberReservationStatus.innerHTML = `
        <div class="mini-card">
          <h3>
            ⏳ Reservation Pending Approval
          </h3>

          <p>
            <strong>
              Reservation Number:
            </strong>
            ${reservation.reservation_number}
          </p>

          <p class="small-text">
            An admin still needs to review your booking.
          </p>
        </div>
      `;

      memberReservationSubmitBtn.disabled =
        true;

      memberReservationSubmitBtn.textContent =
        "Pending Approval";

      if (memberReservationInput) {
        memberReservationInput.disabled =
          true;
      }

      return;
    }


    if (
      reservation.status ===
      "approved"
    ) {
      memberReservationStatus.innerHTML = `
        <div class="mini-card">
          <h3>
            ✅ Reservation Approved
          </h3>

          <p>
            <strong>
              Your Reservation Number:
            </strong>
            ${reservation.reservation_number}
          </p>

          <p class="small-text">
            You're confirmed as booked on the current group cruise.
          </p>
        </div>
      `;

      memberReservationSubmitBtn.disabled =
        true;

      memberReservationSubmitBtn.textContent =
        "Reservation Approved";

      if (memberReservationInput) {
        memberReservationInput.disabled =
          true;
      }

      return;
    }


    if (
      reservation.status ===
      "declined"
    ) {
      memberReservationStatus.innerHTML = `
        <div class="mini-card">
          <h3>
            ❌ Reservation Not Approved
          </h3>

          <p class="small-text">
            Your previous reservation submission was declined.
            You can submit another reservation number below.
          </p>
        </div>
      `;

      memberReservationSubmitBtn.disabled =
        false;

      memberReservationSubmitBtn.textContent =
        "Submit Another Reservation";

      if (memberReservationInput) {
        memberReservationInput.disabled =
          false;

        memberReservationInput.value =
          "";
      }
    }
  }


  /*
    --------------------------------------------------
    SUBMIT MY RESERVATION
    --------------------------------------------------
  */

  if (
    memberReservationSubmitBtn &&
    memberReservationInput
  ) {
    memberReservationSubmitBtn.addEventListener(
      "click",
      async () => {

        const reservationNumber =
          memberReservationInput.value.trim();


        if (!reservationNumber) {
          memberReservationStatus.innerHTML = `
            <p>
              Enter your NCL reservation number first.
            </p>
          `;

          return;
        }


        memberReservationSubmitBtn.disabled =
          true;

        memberReservationSubmitBtn.textContent =
          "Submitting...";


        const {
          error,
        } =
          await window.supabaseClient
            .from("member_reservations")
            .insert({
              user_id:
                user.id,

              reservation_number:
                reservationNumber,

              status:
                "pending",
            });


        if (error) {
          console.error(
            "SUBMIT MEMBER RESERVATION ERROR:",
            error
          );


          if (
            error.code ===
            "23505"
          ) {
            memberReservationStatus.innerHTML = `
              <p>
                You already have a pending or approved reservation.
              </p>
            `;
          } else {
            memberReservationStatus.innerHTML = `
              <p>
                Could not submit reservation: ${error.message}
              </p>
            `;
          }


          memberReservationSubmitBtn.disabled =
            false;

          memberReservationSubmitBtn.textContent =
            "Submit My Reservation";

          return;
        }


        /*
          CREATE NOTIFICATION
        */

        if (
          typeof window.createNotification ===
          "function"
        ) {
          try {
            const {
              data: profile,
            } =
              await window.supabaseClient
                .from("profiles")
                .select(
                  "display_name,email"
                )
                .eq(
                  "id",
                  user.id
                )
                .single();


            const person =
              profile?.display_name ||
              profile?.email ||
              user.email ||
              "A member";


            await window.createNotification({
              type:
                "member_reservation",

              title:
                "Cruise Reservation Submitted",

              message:
                `${person} submitted a cruise reservation for approval.`,
            });

          } catch (err) {
            console.error(
              "RESERVATION NOTIFICATION ERROR:",
              err
            );
          }
        }


        await loadMyReservation();
      }
    );
  }


  /*
    --------------------------------------------------
    GROUP CABIN PRIVATE INFO
    --------------------------------------------------
  */

  async function loadApprovedReservationInfo() {
    if (!requestMessage) {
      return false;
    }


    const {
      data,
      error,
    } =
      await window.supabaseClient
        .from(
          "cruise_private_info"
        )
        .select(
          "reservation_number"
        )
        .eq(
          "id",
          "current_cruise"
        )
        .maybeSingle();


    if (error) {
      console.error(
        "PRIVATE CRUISE INFO ERROR:",
        error
      );

      return false;
    }


    if (
      !data?.reservation_number
    ) {
      return false;
    }


    requestMessage.innerHTML = `
      <div class="mini-card">

        <h3>
          ✅ Group Cabin Reservation Info Unlocked
        </h3>

        <p>
          <strong>
            Shared Reservation:
          </strong>
          Daniel Murphy &amp; Jonathan Morris
        </p>

        <p>
          <strong>
            Reservation Number:
          </strong>
        </p>

        <p
          style="
            font-size: 1.4rem;
            font-weight: 700;
            letter-spacing: 0.05em;
          "
        >
          ${data.reservation_number}
        </p>

        <p>
          This reservation number belongs to
          <strong>
            Daniel and Jonathan's shared stateroom booking.
          </strong>
        </p>

        <p class="small-text">
          Contact Norwegian Cruise Line and tell them
          you're traveling with this reservation.
          Ask whether your reservations can be associated
          and whether nearby stateroom placement is available.
        </p>

      </div>
    `;


    if (requestBtn) {
      requestBtn.disabled =
        true;

      requestBtn.textContent =
        "Group Cabin Info Unlocked";
    }


    if (requestNote) {
      requestNote.disabled =
        true;
    }


    return true;
  }


  /*
    --------------------------------------------------
    CHECK GROUP CABIN REQUEST
    --------------------------------------------------
  */

  async function checkExistingReservationRequest() {
    if (
      !requestBtn ||
      !requestMessage
    ) {
      return;
    }


    const {
      data,
      error,
    } =
      await window.supabaseClient
        .from(
          "reservation_requests"
        )
        .select(`
          id,
          status,
          note,
          created_at
        `)
        .eq(
          "user_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(1);


    if (error) {
      console.error(
        "RESERVATION REQUEST LOAD ERROR:",
        error
      );

      return;
    }


    if (
      !data ||
      data.length === 0
    ) {
      requestBtn.disabled =
        false;

      requestBtn.textContent =
        "Request Group Cabin Reservation Info";

      return;
    }


    const latest =
      data[0];


    if (
      latest.status ===
        "approved" ||
      latest.status ===
        "completed"
    ) {
      const revealed =
        await loadApprovedReservationInfo();


      if (!revealed) {
        requestBtn.disabled =
          true;

        requestBtn.textContent =
          "Approved";

        requestMessage.textContent =
          "Your request is approved, but the shared cabin reservation information could not be loaded.";
      }

      return;
    }


    if (
      latest.status ===
      "pending"
    ) {
      requestBtn.disabled =
        true;

      requestBtn.textContent =
        "Request Pending";

      requestMessage.textContent =
        "Your request is waiting for an admin.";

      return;
    }


    if (
      latest.status ===
      "declined"
    ) {
      requestBtn.disabled =
        false;

      requestBtn.textContent =
        "Request Group Cabin Reservation Info";

      requestMessage.textContent =
        "Your previous request was declined. You may submit another request.";
    }
  }


  /*
    --------------------------------------------------
    CREATE GROUP CABIN REQUEST
    --------------------------------------------------
  */

  if (requestBtn) {
    requestBtn.addEventListener(
      "click",
      async () => {

        requestBtn.disabled =
          true;

        requestMessage.textContent =
          "Sending request...";


        const note =
          requestNote?.value?.trim() ||
          "";


        const {
          error,
        } =
          await window.supabaseClient
            .from(
              "reservation_requests"
            )
            .insert({
              user_id:
                user.id,

              note:
                note || null,

              status:
                "pending",
            });


        if (error) {
          console.error(
            "GROUP RESERVATION REQUEST ERROR:",
            error
          );


          if (
            error.code ===
            "23505"
          ) {
            requestBtn.disabled =
              true;

            requestBtn.textContent =
              "Request Pending";

            requestMessage.textContent =
              "You already have a pending request.";
          } else {
            requestBtn.disabled =
              false;

            requestMessage.textContent =
              error.message;
          }

          return;
        }


        requestBtn.textContent =
          "Request Pending";

        requestMessage.textContent =
          "Request sent! An admin can now review it.";
      }
    );
  }


  /*
    --------------------------------------------------
    INITIAL LOAD
    --------------------------------------------------
  */

  await loadMyReservation();

  await checkExistingReservationRequest();
});
