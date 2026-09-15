document.addEventListener("DOMContentLoaded", async () => {
  const logoutBtn =
    document.getElementById("logout-btn");

  const requestBtn =
    document.getElementById("reservation-request-btn");

  const requestNote =
    document.getElementById("reservation-request-note");

  const requestMessage =
    document.getElementById("reservation-request-message");

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
    SUPABASE CHECK
    --------------------------------------------------
  */

  if (!window.supabaseClient) {
    console.error("Supabase client did not load.");

    if (requestMessage) {
      requestMessage.textContent =
        "Could not connect to the member system.";
    }

    return;
  }


  /*
    --------------------------------------------------
    CURRENT USER
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
        error: userError,
      } =
        await window.supabaseClient.auth.getUser();

      if (userError) {
        console.error(
          "GET USER ERROR:",
          userError
        );
      }

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


  /*
    --------------------------------------------------
    NO ACTIVE SESSION
    --------------------------------------------------
  */

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
          <h1>
            Login Required
          </h1>

          <p class="lead">
            Your login session could not be found.
          </p>

          <p>
            Log back in to view the current cruise.
          </p>

          <div
            class="button-row"
            style="
              justify-content: center;
              margin-top: 1.5rem;
            "
          >
            <a
              class="btn btn-primary"
              href="login.html"
            >
              Go to Login
            </a>
          </div>
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
        "NOTIFICATION SETUP ERROR:",
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

        try {
          await window.supabaseClient.auth.signOut();
        } catch (err) {
          console.error(
            "LOGOUT ERROR:",
            err
          );
        }

        window.location.href =
          "login.html";
      }
    );
  }


  /*
    --------------------------------------------------
    LOAD APPROVED SHARED CABIN INFO
    --------------------------------------------------
  */

  async function loadApprovedReservationInfo() {
    if (!requestMessage) {
      return false;
    }

    try {
      const {
        data,
        error,
      } =
        await window.supabaseClient
          .from("cruise_private_info")
          .select("reservation_number")
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


      /*
        If RLS does not allow the member
        to see this row, there will be no data.
      */

      if (
        !data?.reservation_number
      ) {
        return false;
      }


      const reservationNumber =
        data.reservation_number;


      requestMessage.innerHTML = `
        <div
          class="mini-card"
          style="
            margin-top: 1rem;
            text-align: left;
          "
        >

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
            ${reservationNumber}
          </p>

          <p>
            This reservation number belongs to
            <strong>Daniel and Jonathan's shared stateroom booking</strong>.
          </p>

          <p>
            If you have your own separate reservation,
            contact Norwegian Cruise Line and tell them
            you're traveling with Daniel and Jonathan's
            reservation.
          </p>

          <p class="small-text">
            Ask whether your reservations can be associated
            for traveling together and whether nearby
            stateroom placement is available.
          </p>

          <p class="small-text">
            Nearby cabins are not guaranteed and remain
            subject to NCL availability.
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

    } catch (err) {
      console.error(
        "LOAD PRIVATE RESERVATION INFO CRASH:",
        err
      );

      return false;
    }
  }


  /*
    --------------------------------------------------
    CHECK EXISTING REQUEST
    --------------------------------------------------
  */

  async function checkExistingReservationRequest() {
    if (
      !requestBtn ||
      !requestMessage
    ) {
      return;
    }


    try {
      const {
        data,
        error,
      } =
        await window.supabaseClient
          .from("reservation_requests")
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

        requestMessage.textContent =
          "Reservation request feature is temporarily unavailable.";

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

        requestMessage.textContent =
          "";

        return;
      }


      const latestRequest =
        data[0];


      /*
        APPROVED OR COMPLETED
      */

      if (
        latestRequest.status ===
          "approved" ||
        latestRequest.status ===
          "completed"
      ) {
        const revealed =
          await loadApprovedReservationInfo();


        if (revealed) {
          return;
        }


        requestBtn.disabled =
          true;

        requestBtn.textContent =
          "Approved";

        requestMessage.textContent =
          "Your request was approved, but the shared cabin reservation information could not be loaded. Contact an admin.";

        return;
      }


      /*
        PENDING
      */

      if (
        latestRequest.status ===
        "pending"
      ) {
        requestBtn.disabled =
          true;

        requestBtn.textContent =
          "Request Pending";

        requestMessage.textContent =
          "Your request for Daniel and Jonathan's shared cabin reservation information is waiting for an admin.";

        return;
      }


      /*
        DECLINED
      */

      if (
        latestRequest.status ===
        "declined"
      ) {
        requestBtn.disabled =
          false;

        requestBtn.textContent =
          "Request Group Cabin Reservation Info";

        requestMessage.textContent =
          "Your previous request was declined. You may submit another request.";

        return;
      }

    } catch (err) {
      console.error(
        "RESERVATION REQUEST CHECK CRASH:",
        err
      );

      requestMessage.textContent =
        "Reservation request feature is temporarily unavailable.";
    }
  }


  /*
    --------------------------------------------------
    CREATE REQUEST
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


        try {
          const {
            data: profile,
            error: profileError,
          } =
            await window.supabaseClient
              .from("profiles")
              .select(`
                display_name,
                email
              `)
              .eq(
                "id",
                user.id
              )
              .single();


          if (profileError) {
            console.error(
              "PROFILE LOAD ERROR:",
              profileError
            );
          }


          const {
            error: insertError,
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


          if (insertError) {
            console.error(
              "RESERVATION REQUEST INSERT ERROR:",
              insertError
            );


            if (
              insertError.code ===
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
                `Could not send request: ${insertError.message}`;
            }

            return;
          }


          const person =
            profile?.display_name ||
            profile?.email ||
            user.email ||
            "A member";


          if (
            typeof window.createNotification ===
            "function"
          ) {
            try {
              await window.createNotification({
                type:
                  "reservation_request",

                title:
                  "Group Cabin Info Requested",

                message:
                  `${person} requested Daniel and Jonathan's shared cabin reservation information.` +
                  `${note ? ` Note: ${note}` : ""}`,
              });

            } catch (
              notificationError
            ) {
              console.error(
                "RESERVATION NOTIFICATION ERROR:",
                notificationError
              );
            }
          }


          requestBtn.disabled =
            true;

          requestBtn.textContent =
            "Request Pending";

          requestMessage.textContent =
            "Request sent! An admin can now review it.";

        } catch (err) {
          console.error(
            "RESERVATION REQUEST CRASH:",
            err
          );

          requestBtn.disabled =
            false;

          requestMessage.textContent =
            "Could not send the request.";
        }
      }
    );
  }


  /*
    --------------------------------------------------
    INITIAL LOAD
    --------------------------------------------------
  */

  await checkExistingReservationRequest();
});
