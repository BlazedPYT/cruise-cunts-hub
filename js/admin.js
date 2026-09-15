document.addEventListener("DOMContentLoaded", async () => {
  /*
    --------------------------------------------------
    DOM
    --------------------------------------------------
  */

  const userList =
    document.getElementById("user-list");

  const requestList =
    document.getElementById(
      "reservation-request-list"
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
      "Supabase client is not available."
    );

    if (adminMessage) {
      adminMessage.textContent =
        "Could not connect to the member system.";
    }

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
    console.error(
      "ADMIN SESSION ERROR:",
      sessionError
    );

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
    !adminProfile ||
    adminProfile.role !== "admin"
  ) {
    console.error(
      "ADMIN PROFILE ERROR:",
      adminProfileError
    );

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
        "ADMIN NOTIFICATION ERROR:",
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
    try {
      const {
        data: { session },
        error,
      } =
        await window.supabaseClient.auth.getSession();


      if (
        error ||
        !session?.access_token
      ) {
        return {
          error:
            "Could not verify your admin login.",
        };
      }


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
          "EDGE FUNCTION JSON ERROR:",
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
      console.error(
        "ADMIN EDGE FUNCTION ERROR:",
        err
      );


      return {
        error:
          err.message ||
          "Request failed.",
      };
    }
  }


  /*
    --------------------------------------------------
    LOAD RESERVATION REQUESTS
    --------------------------------------------------
  */

  async function loadReservationRequests() {
    if (!requestList) {
      return;
    }


    requestList.innerHTML = `
      <p class="small-text">
        Loading reservation requests...
      </p>
    `;


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
          handled_at,
          handled_by,
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
        "LOAD RESERVATION REQUESTS ERROR:",
        error
      );


      requestList.innerHTML = `
        <p class="small-text">
          Could not load reservation requests.
        </p>
      `;

      return;
    }


    if (
      !data ||
      data.length === 0
    ) {
      requestList.innerHTML = `
        <p class="small-text">
          Nobody has requested the group reservation information yet.
        </p>
      `;

      return;
    }


    requestList.innerHTML =
      data
        .map((request) => {
          const person =
            request.profiles?.display_name ||
            request.profiles?.email ||
            "Member";


          const email =
            request.profiles?.email ||
            "No email available";


          const note =
            request.note ||
            "No note provided.";


          const requestDate =
            new Date(
              request.created_at
            ).toLocaleString();


          let statusLabel =
            request.status;


          if (
            request.status ===
            "pending"
          ) {
            statusLabel =
              "⏳ Pending";
          }


          if (
            request.status ===
            "approved"
          ) {
            statusLabel =
              "✅ Approved — Reservation Number Unlocked";
          }


          if (
            request.status ===
            "completed"
          ) {
            statusLabel =
              "✔ Completed — Reservation Number Unlocked";
          }


          if (
            request.status ===
            "declined"
          ) {
            statusLabel =
              "❌ Declined";
          }


          return `
            <div class="user-item">

              <h3>
                ${escapeHtml(person)}
              </h3>

              <p class="user-meta">
                <strong>
                  Email:
                </strong>

                ${escapeHtml(email)}
              </p>

              <p class="user-meta">
                <strong>
                  Status:
                </strong>

                ${escapeHtml(statusLabel)}
              </p>

              <p class="user-meta">
                <strong>
                  Requested:
                </strong>

                ${escapeHtml(requestDate)}
              </p>

              <p class="user-meta">
                <strong>
                  Who they want to be near / Notes:
                </strong>

                ${escapeHtml(note)}
              </p>


              ${
                request.status ===
                "approved"
                  ? `
                    <div class="notice-box">
                      <strong>
                        Reservation info unlocked.
                      </strong>

                      <p class="small-text">
                        This member can now see the group
                        reservation number on the Current
                        Cruise page.
                      </p>
                    </div>
                  `
                  : ""
              }


              <div class="user-actions">

                ${
                  request.status ===
                  "pending"
                    ? `
                      <button
                        class="btn btn-primary reservation-approve-btn"
                        data-request-id="${request.id}"
                        type="button"
                      >
                        Approve &amp; Unlock
                      </button>


                      <button
                        class="btn btn-danger reservation-decline-btn"
                        data-request-id="${request.id}"
                        type="button"
                      >
                        Decline
                      </button>
                    `
                    : ""
                }


                ${
                  request.status ===
                  "approved"
                    ? `
                      <button
                        class="btn btn-secondary reservation-complete-btn"
                        data-request-id="${request.id}"
                        type="button"
                      >
                        Mark Completed
                      </button>
                    `
                    : ""
                }


                ${
                  request.status ===
                    "declined" ||
                  request.status ===
                    "completed"
                    ? `
                      <button
                        class="btn btn-danger reservation-delete-btn"
                        data-request-id="${request.id}"
                        type="button"
                      >
                        Remove Request
                      </button>
                    `
                    : ""
                }

              </div>

            </div>
          `;
        })
        .join("");


    bindReservationRequestButtons();
  }


  /*
    --------------------------------------------------
    UPDATE RESERVATION REQUEST
    --------------------------------------------------
  */

  async function updateReservationRequest(
    requestId,
    newStatus
  ) {
    if (adminMessage) {
      adminMessage.textContent =
        "Updating reservation request...";
    }


    const {
      error,
    } =
      await window.supabaseClient
        .from(
          "reservation_requests"
        )
        .update({
          status:
            newStatus,

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
      console.error(
        "UPDATE RESERVATION REQUEST ERROR:",
        error
      );


      if (adminMessage) {
        adminMessage.textContent =
          error.message;
      }

      return;
    }


    if (adminMessage) {
      if (
        newStatus ===
        "approved"
      ) {
        adminMessage.textContent =
          "Request approved. The member can now securely view the reservation number.";
      }

      else if (
        newStatus ===
        "completed"
      ) {
        adminMessage.textContent =
          "Reservation request marked completed.";
      }

      else if (
        newStatus ===
        "declined"
      ) {
        adminMessage.textContent =
          "Reservation request declined.";
      }
    }


    await loadReservationRequests();
  }


  /*
    --------------------------------------------------
    DELETE REQUEST
    --------------------------------------------------
  */

  async function deleteReservationRequest(
    requestId
  ) {
    const confirmed =
      confirm(
        "Remove this reservation request?"
      );


    if (!confirmed) {
      return;
    }


    const {
      error,
    } =
      await window.supabaseClient
        .from(
          "reservation_requests"
        )
        .delete()
        .eq(
          "id",
          requestId
        );


    if (error) {
      console.error(
        "DELETE REQUEST ERROR:",
        error
      );


      if (adminMessage) {
        adminMessage.textContent =
          error.message;
      }

      return;
    }


    if (adminMessage) {
      adminMessage.textContent =
        "Reservation request removed.";
    }


    await loadReservationRequests();
  }


  /*
    --------------------------------------------------
    REQUEST BUTTONS
    --------------------------------------------------
  */

  function bindReservationRequestButtons() {
    document
      .querySelectorAll(
        ".reservation-approve-btn"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          async () => {

            await updateReservationRequest(
              button.dataset.requestId,
              "approved"
            );
          }
        );
      });


    document
      .querySelectorAll(
        ".reservation-complete-btn"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          async () => {

            await updateReservationRequest(
              button.dataset.requestId,
              "completed"
            );
          }
        );
      });


    document
      .querySelectorAll(
        ".reservation-decline-btn"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          async () => {

            await updateReservationRequest(
              button.dataset.requestId,
              "declined"
            );
          }
        );
      });


    document
      .querySelectorAll(
        ".reservation-delete-btn"
      )
      .forEach((button) => {

        button.addEventListener(
          "click",
          async () => {

            await deleteReservationRequest(
              button.dataset.requestId
            );
          }
        );
      });
  }


  /*
    --------------------------------------------------
    LOAD MEMBERS
    --------------------------------------------------
  */

  async function loadUsers() {
    if (!userList) {
      return;
    }


    userList.innerHTML = `
      <p class="small-text">
        Loading members...
      </p>
    `;


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
      console.error(
        "LOAD USERS ERROR:",
        error
      );


      userList.innerHTML = `
        <p class="small-text">
          Failed to load members.
        </p>
      `;

      return;
    }


    if (
      !data ||
      data.length === 0
    ) {
      userList.innerHTML = `
        <p class="small-text">
          No members found.
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


          const name =
            member.display_name ||
            "No display name";


          return `
            <div class="user-item">

              <h3>
                ${escapeHtml(name)}
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

            const userId =
              button.dataset.userId;

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
                  userId
                );


            if (error) {
              if (adminMessage) {
                adminMessage.textContent =
                  error.message;
              }

              return;
            }


            if (adminMessage) {
              adminMessage.textContent =
                "Member approval updated.";
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

            const userId =
              button.dataset.userId;

            const currentRole =
              button.dataset.role;


            const newRole =
              currentRole ===
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
                  userId
                );


            if (error) {
              if (adminMessage) {
                adminMessage.textContent =
                  error.message;
              }

              return;
            }


            if (adminMessage) {
              adminMessage.textContent =
                "Member role updated.";
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

            const userId =
              button.dataset.userId;


            const password =
              prompt(
                "Enter the member's new temporary password:"
              );


            if (!password) {
              return;
            }


            if (
              password.length < 6
            ) {
              if (adminMessage) {
                adminMessage.textContent =
                  "Password must be at least 6 characters.";
              }

              return;
            }


            if (adminMessage) {
              adminMessage.textContent =
                "Resetting password...";
            }


            const result =
              await callAdminMemberTools({
                action:
                  "reset_password",

                user_id:
                  userId,

                new_password:
                  password,
              });


            if (result.error) {
              if (adminMessage) {
                adminMessage.textContent =
                  result.error;
              }

              return;
            }


            if (adminMessage) {
              adminMessage.textContent =
                "Password reset successfully.";
            }
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

            const userId =
              button.dataset.userId;


            const confirmed =
              confirm(
                "Permanently delete this user? This cannot be undone."
              );


            if (!confirmed) {
              return;
            }


            if (adminMessage) {
              adminMessage.textContent =
                "Deleting user...";
            }


            const result =
              await callAdminMemberTools({
                action:
                  "delete_user",

                user_id:
                  userId,
              });


            if (result.error) {
              if (adminMessage) {
                adminMessage.textContent =
                  result.error;
              }

              return;
            }


            if (adminMessage) {
              adminMessage.textContent =
                "User deleted successfully.";
            }


            await loadUsers();

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


        if (
          !email ||
          !password
        ) {
          createMemberMessage.textContent =
            "Email and password are required.";

          return;
        }


        if (
          password.length < 6
        ) {
          createMemberMessage.textContent =
            "Temporary password must be at least 6 characters.";

          return;
        }


        createMemberMessage.textContent =
          "Creating member...";


        try {
          const {
            data: { session },
          } =
            await window.supabaseClient.auth.getSession();


          if (
            !session?.access_token
          ) {
            createMemberMessage.textContent =
              "Admin session could not be verified.";

            return;
          }


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


          let result = {};


          try {
            result =
              await response.json();
          } catch (err) {
            console.error(
              "CREATE MEMBER JSON ERROR:",
              err
            );
          }


          if (!response.ok) {
            createMemberMessage.textContent =
              result?.error ||
              `Could not create member. Status ${response.status}`;

            return;
          }


          createMemberMessage.textContent =
            `Account created for ${email}.`;


          createMemberForm.reset();


          await loadUsers();

        } catch (err) {
          console.error(
            "CREATE MEMBER ERROR:",
            err
          );


          createMemberMessage.textContent =
            "Could not create the account.";
        }
      }
    );
  }


  /*
    --------------------------------------------------
    INITIAL LOAD
    --------------------------------------------------
  */

  await loadReservationRequests();

  await loadUsers();
});
