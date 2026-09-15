document.addEventListener("DOMContentLoaded", async () => {
  const userList =
    document.getElementById("user-list");

  const reservationRequestList =
    document.getElementById(
      "reservation-request-list"
    );

  const memberReservationList =
    document.getElementById(
      "member-reservation-list"
    );

  const adminMessage =
    document.getElementById(
      "admin-message"
    );

  const logoutBtn =
    document.getElementById(
      "logout-btn"
    );

  const createMemberForm =
    document.getElementById(
      "create-member-form"
    );

  const createMemberMessage =
    document.getElementById(
      "create-member-message"
    );


  /*
    --------------------------------------------------
    SUPABASE
    --------------------------------------------------
  */

  if (!window.supabaseClient) {
    console.error(
      "Supabase client unavailable."
    );

    return;
  }


  /*
    --------------------------------------------------
    AUTH
    --------------------------------------------------
  */

  const {
    data: { session },
    error: sessionError,
  } =
    await window.supabaseClient.auth.getSession();


  if (
    sessionError ||
    !session?.user
  ) {
    window.location.href =
      "login.html";

    return;
  }


  const user =
    session.user;


  /*
    --------------------------------------------------
    VERIFY ADMIN
    --------------------------------------------------
  */

  const {
    data: adminProfile,
    error: adminProfileError,
  } =
    await window.supabaseClient
      .from("profiles")
      .select(`
        id,
        role,
        display_name,
        email
      `)
      .eq(
        "id",
        user.id
      )
      .single();


  if (
    adminProfileError ||
    adminProfile?.role !==
      "admin"
  ) {
    window.location.href =
      "dashboard.html";

    return;
  }


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
    ESCAPE HTML
    --------------------------------------------------
  */

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  /*
    --------------------------------------------------
    ADMIN EDGE FUNCTION
    --------------------------------------------------
  */

  async function callAdminMemberTools(
    payload
  ) {
    const {
      data: { session },
    } =
      await window.supabaseClient.auth.getSession();


    if (!session?.access_token) {
      return {
        error:
          "Admin session could not be verified.",
      };
    }


    try {
      const response =
        await fetch(
          "https://vhpbmkdtlajdohhxawno.supabase.co/functions/v1/admin-member-tools",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify(payload),
          }
        );


      let result = {};


      try {
        result =
          await response.json();
      } catch (err) {
        console.error(
          "EDGE JSON ERROR:",
          err
        );
      }


      if (!response.ok) {
        return {
          error:
            result?.error ||
            `Request failed with status ${response.status}`,
        };
      }


      return result;

    } catch (err) {
      return {
        error:
          err.message ||
          "Request failed.",
      };
    }
  }


  /*
    --------------------------------------------------
    MEMBER RESERVATIONS
    --------------------------------------------------
  */

  async function loadMemberReservations() {
    if (!memberReservationList) {
      return;
    }


    memberReservationList.innerHTML = `
      <p class="small-text">
        Loading member reservations...
      </p>
    `;


    const {
      data,
      error,
    } =
      await window.supabaseClient
        .from(
          "member_reservations"
        )
        .select(`
          id,
          user_id,
          reservation_number,
          status,
          created_at,
          reviewed_at,
          reviewed_by,
          profiles!member_reservations_user_id_fkey (
            display_name,
            email
          )
        `)
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );


    if (error) {
      console.error(
        "LOAD MEMBER RESERVATIONS ERROR:",
        error
      );

      memberReservationList.innerHTML = `
        <p class="small-text">
          Could not load member reservations.
        </p>
      `;

      return;
    }


    if (
      !data ||
      data.length === 0
    ) {
      memberReservationList.innerHTML = `
        <p class="small-text">
          Nobody has submitted a cruise reservation yet.
        </p>
      `;

      return;
    }


    memberReservationList.innerHTML =
      data
        .map((reservation) => {
          const name =
            reservation.profiles?.display_name ||
            reservation.profiles?.email ||
            "Member";


          const email =
            reservation.profiles?.email ||
            "";


          let statusText =
            reservation.status;


          if (
            reservation.status ===
            "pending"
          ) {
            statusText =
              "⏳ Pending";
          }


          if (
            reservation.status ===
            "approved"
          ) {
            statusText =
              "✅ Approved";
          }


          if (
            reservation.status ===
            "declined"
          ) {
            statusText =
              "❌ Declined";
          }


          return `
            <div class="user-item">

              <h3>
                ${escapeHtml(name)}
              </h3>

              <p class="user-meta">
                <strong>
                  Email:
                </strong>
                ${escapeHtml(email)}
              </p>

              <p class="user-meta">
                <strong>
                  Reservation Number:
                </strong>
                ${escapeHtml(reservation.reservation_number)}
              </p>

              <p class="user-meta">
                <strong>
                  Status:
                </strong>
                ${escapeHtml(statusText)}
              </p>

              <p class="user-meta">
                <strong>
                  Submitted:
                </strong>
                ${escapeHtml(
                  new Date(
                    reservation.created_at
                  ).toLocaleString()
                )}
              </p>


              <div class="user-actions">

                ${
                  reservation.status ===
                  "pending"
                    ? `
                      <button
                        class="btn btn-primary member-reservation-approve-btn"
                        data-id="${reservation.id}"
                        data-user-id="${reservation.user_id}"
                        type="button"
                      >
                        Approve Booking
                      </button>

                      <button
                        class="btn btn-danger member-reservation-decline-btn"
                        data-id="${reservation.id}"
                        data-user-id="${reservation.user_id}"
                        type="button"
                      >
                        Decline
                      </button>
                    `
                    : ""
                }


                ${
                  reservation.status ===
                    "approved" ||
                  reservation.status ===
                    "declined"
                    ? `
                      <button
                        class="btn btn-danger member-reservation-delete-btn"
                        data-id="${reservation.id}"
                        type="button"
                      >
                        Remove Submission
                      </button>
                    `
                    : ""
                }

              </div>

            </div>
          `;
        })
        .join("");


    bindMemberReservationButtons();
  }


  /*
    --------------------------------------------------
    APPROVE MEMBER RESERVATION
    --------------------------------------------------
  */

  async function approveMemberReservation(
    reservationId,
    userId
  ) {
    if (adminMessage) {
      adminMessage.textContent =
        "Approving reservation...";
    }


    const {
      error: reservationError,
    } =
      await window.supabaseClient
        .from(
          "member_reservations"
        )
        .update({
          status:
            "approved",

          reviewed_at:
            new Date().toISOString(),

          reviewed_by:
            user.id,
        })
        .eq(
          "id",
          reservationId
        );


    if (reservationError) {
      adminMessage.textContent =
        reservationError.message;

      return;
    }


    const {
      error: profileError,
    } =
      await window.supabaseClient
        .from("profiles")
        .update({
          cruise_status:
            "booked",
        })
        .eq(
          "id",
          userId
        );


    if (profileError) {
      console.error(
        "UPDATE CRUISE STATUS ERROR:",
        profileError
      );

      adminMessage.textContent =
        "Reservation was approved, but cruise status could not be updated.";

      return;
    }


    adminMessage.textContent =
      "Reservation approved. Member is now marked as booked.";


    await loadMemberReservations();

    await loadUsers();
  }


  /*
    --------------------------------------------------
    DECLINE MEMBER RESERVATION
    --------------------------------------------------
  */

  async function declineMemberReservation(
    reservationId
  ) {
    const {
      error,
    } =
      await window.supabaseClient
        .from(
          "member_reservations"
        )
        .update({
          status:
            "declined",

          reviewed_at:
            new Date().toISOString(),

          reviewed_by:
            user.id,
        })
        .eq(
          "id",
          reservationId
        );


    if (error) {
      adminMessage.textContent =
        error.message;

      return;
    }


    adminMessage.textContent =
      "Reservation submission declined.";


    await loadMemberReservations();
  }


  /*
    --------------------------------------------------
    DELETE MEMBER RESERVATION
    --------------------------------------------------
  */

  async function deleteMemberReservation(
    reservationId
  ) {
    const confirmed =
      confirm(
        "Remove this reservation submission?"
      );


    if (!confirmed) {
      return;
    }


    const {
      error,
    } =
      await window.supabaseClient
        .from(
          "member_reservations"
        )
        .delete()
        .eq(
          "id",
          reservationId
        );


    if (error) {
      adminMessage.textContent =
        error.message;

      return;
    }


    adminMessage.textContent =
      "Reservation submission removed.";


    await loadMemberReservations();
  }


  function bindMemberReservationButtons() {
    document
      .querySelectorAll(
        ".member-reservation-approve-btn"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          async () => {

            await approveMemberReservation(
              button.dataset.id,
              button.dataset.userId
            );
          }
        );
      });


    document
      .querySelectorAll(
        ".member-reservation-decline-btn"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          async () => {

            await declineMemberReservation(
              button.dataset.id
            );
          }
        );
      });


    document
      .querySelectorAll(
        ".member-reservation-delete-btn"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          async () => {

            await deleteMemberReservation(
              button.dataset.id
            );
          }
        );
      });
  }


  /*
    --------------------------------------------------
    GROUP CABIN REQUESTS
    --------------------------------------------------
  */

  async function loadReservationRequests() {
    if (!reservationRequestList) {
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
          user_id,
          note,
          status,
          created_at,
          profiles!reservation_requests_user_id_fkey (
            display_name,
            email
          )
        `)
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );


    if (error) {
      console.error(
        "LOAD CABIN REQUESTS ERROR:",
        error
      );

      reservationRequestList.innerHTML = `
        <p class="small-text">
          Could not load requests.
        </p>
      `;

      return;
    }


    if (
      !data ||
      data.length === 0
    ) {
      reservationRequestList.innerHTML = `
        <p class="small-text">
          No group cabin information requests yet.
        </p>
      `;

      return;
    }


    reservationRequestList.innerHTML =
      data
        .map((request) => {
          const name =
            request.profiles?.display_name ||
            request.profiles?.email ||
            "Member";


          return `
            <div class="user-item">

              <h3>
                ${escapeHtml(name)}
              </h3>

              <p class="user-meta">
                <strong>Status:</strong>
                ${escapeHtml(request.status)}
              </p>

              <p class="user-meta">
                <strong>Who they want to be near:</strong>
                ${escapeHtml(request.note || "No note")}
              </p>


              <div class="user-actions">

                ${
                  request.status ===
                  "pending"
                    ? `
                      <button
                        class="btn btn-primary cabin-approve-btn"
                        data-id="${request.id}"
                        type="button"
                      >
                        Approve &amp; Unlock
                      </button>

                      <button
                        class="btn btn-danger cabin-decline-btn"
                        data-id="${request.id}"
                        type="button"
                      >
                        Decline
                      </button>
                    `
                    : ""
                }

              </div>

            </div>
          `;
        })
        .join("");


    bindCabinButtons();
  }


  async function updateCabinRequest(
    requestId,
    status
  ) {
    const {
      error,
    } =
      await window.supabaseClient
        .from(
          "reservation_requests"
        )
        .update({
          status,

          handled_at:
            new Date().toISOString(),

          handled_by:
            user.id,
        })
        .eq(
          "id",
          requestId
        );


    if (error) {
      adminMessage.textContent =
        error.message;

      return;
    }


    adminMessage.textContent =
      status === "approved"
        ? "Group cabin info unlocked for member."
        : "Request declined.";


    await loadReservationRequests();
  }


  function bindCabinButtons() {
    document
      .querySelectorAll(
        ".cabin-approve-btn"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          async () => {

            await updateCabinRequest(
              button.dataset.id,
              "approved"
            );
          }
        );
      });


    document
      .querySelectorAll(
        ".cabin-decline-btn"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          async () => {

            await updateCabinRequest(
              button.dataset.id,
              "declined"
            );
          }
        );
      });
  }


  /*
    --------------------------------------------------
    LOAD USERS
    --------------------------------------------------
  */

  async function loadUsers() {
    if (!userList) {
      return;
    }


    const {
      data,
      error,
    } =
      await window.supabaseClient
        .from("profiles")
        .select(`
          id,
          email,
          display_name,
          approved,
          role,
          cruise_status,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );


    if (error) {
      userList.innerHTML = `
        <p class="small-text">
          Failed to load members.
        </p>
      `;

      return;
    }


    userList.innerHTML =
      data
        .map((member) => {
          const isSelf =
            member.id ===
            user.id;


          return `
            <div class="user-item">

              <h3>
                ${escapeHtml(
                  member.display_name ||
                  "No display name"
                )}
              </h3>

              <p class="user-meta">
                <strong>Email:</strong>
                ${escapeHtml(member.email || "")}
              </p>

              <p class="user-meta">
                <strong>Approved:</strong>
                ${member.approved ? "Yes" : "No"}
              </p>

              <p class="user-meta">
                <strong>Role:</strong>
                ${escapeHtml(member.role || "member")}
              </p>

              <p class="user-meta">
                <strong>Cruise Status:</strong>
                ${escapeHtml(member.cruise_status || "interested")}
              </p>


              <div class="user-actions">

                <button
                  class="btn btn-primary approve-user-btn"
                  data-user-id="${member.id}"
                  data-approved="${member.approved}"
                  type="button"
                >
                  ${
                    member.approved
                      ? "Unapprove"
                      : "Approve"
                  }
                </button>


                <button
                  class="btn btn-secondary role-user-btn"
                  data-user-id="${member.id}"
                  data-role="${escapeHtml(member.role || "member")}"
                  type="button"
                  ${isSelf ? "disabled" : ""}
                >
                  ${
                    member.role === "admin"
                      ? "Make Member"
                      : "Make Admin"
                  }
                </button>


                <button
                  class="btn btn-secondary reset-password-btn"
                  data-user-id="${member.id}"
                  type="button"
                >
                  Reset Password
                </button>


                <button
                  class="btn btn-danger delete-user-btn"
                  data-user-id="${member.id}"
                  type="button"
                  ${isSelf ? "disabled" : ""}
                >
                  Delete User
                </button>

              </div>

            </div>
          `;
        })
        .join("");


    bindMemberButtons();
  }


  /*
    --------------------------------------------------
    MEMBER BUTTONS
    --------------------------------------------------
  */

  function bindMemberButtons() {
    document
      .querySelectorAll(
        ".approve-user-btn"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          async () => {

            const currentlyApproved =
              button.dataset.approved ===
              "true";


            const {
              error,
            } =
              await window.supabaseClient
                .from("profiles")
                .update({
                  approved:
                    !currentlyApproved,
                })
                .eq(
                  "id",
                  button.dataset.userId
                );


            if (error) {
              adminMessage.textContent =
                error.message;

              return;
            }


            await loadUsers();
          }
        );
      });


    document
      .querySelectorAll(
        ".role-user-btn"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          async () => {

            const newRole =
              button.dataset.role ===
              "admin"
                ? "member"
                : "admin";


            const {
              error,
            } =
              await window.supabaseClient
                .from("profiles")
                .update({
                  role:
                    newRole,
                })
                .eq(
                  "id",
                  button.dataset.userId
                );


            if (error) {
              adminMessage.textContent =
                error.message;

              return;
            }


            await loadUsers();
          }
        );
      });


    document
      .querySelectorAll(
        ".reset-password-btn"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          async () => {

            const password =
              prompt(
                "Enter the member's new temporary password:"
              );


            if (!password) {
              return;
            }


            const result =
              await callAdminMemberTools({
                action:
                  "reset_password",

                user_id:
                  button.dataset.userId,

                new_password:
                  password,
              });


            adminMessage.textContent =
              result.error ||
              "Password reset successfully.";
          }
        );
      });


    document
      .querySelectorAll(
        ".delete-user-btn"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          async () => {

            if (
              !confirm(
                "Permanently delete this user?"
              )
            ) {
              return;
            }


            const result =
              await callAdminMemberTools({
                action:
                  "delete_user",

                user_id:
                  button.dataset.userId,
              });


            if (result.error) {
              adminMessage.textContent =
                result.error;

              return;
            }


            adminMessage.textContent =
              "User deleted.";


            await loadUsers();

            await loadMemberReservations();

            await loadReservationRequests();
          }
        );
      });
  }


  /*
    --------------------------------------------------
    CREATE MEMBER
    --------------------------------------------------
  */

  if (createMemberForm) {
    createMemberForm.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();


        const displayName =
          document
            .getElementById(
              "new-member-name"
            )
            ?.value.trim() ||
          "";


        const email =
          document
            .getElementById(
              "new-member-email"
            )
            ?.value.trim() ||
          "";


        const password =
          document
            .getElementById(
              "new-member-password"
            )
            ?.value ||
          "";


        createMemberMessage.textContent =
          "Creating member...";


        const {
          data: { session },
        } =
          await window.supabaseClient.auth.getSession();


        const response =
          await fetch(
            "https://vhpbmkdtlajdohhxawno.supabase.co/functions/v1/swift-endpoint",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${session.access_token}`,
              },

              body:
                JSON.stringify({
                  display_name:
                    displayName,

                  email,

                  password,
                }),
            }
          );


        const result =
          await response.json();


        if (!response.ok) {
          createMemberMessage.textContent =
            result?.error ||
            "Could not create member.";

          return;
        }


        createMemberMessage.textContent =
          `Account created for ${email}.`;


        createMemberForm.reset();

        await loadUsers();
      }
    );
  }


  /*
    --------------------------------------------------
    INITIAL LOAD
    --------------------------------------------------
  */

  await loadMemberReservations();

  await loadReservationRequests();

  await loadUsers();
});
