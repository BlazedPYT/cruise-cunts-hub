document.addEventListener(
  "DOMContentLoaded",
  async () => {

    const authData =
      await requireAuth(false);

    if (!authData) {
      return;
    }


    const {
      profile,
      user,
    } = authData;


    const userList =
      document.getElementById(
        "user-list"
      );

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


    if (
      profile.role !== "admin"
    ) {
      window.location.href =
        "dashboard.html";

      return;
    }


    if (
      typeof window.setupNotifications ===
      "function"
    ) {
      await window.setupNotifications(
        user.id
      );
    }


    if (logoutBtn) {
      logoutBtn.addEventListener(
        "click",
        async () => {

          await window.supabaseClient.auth.signOut();

          window.location.href =
            "index.html";
        }
      );
    }



    async function callAdminMemberTools(
      payload
    ) {

      try {

        const {
          data: { session },
          error: sessionError,
        } =
          await window.supabaseClient.auth.getSession();


        if (
          sessionError ||
          !session?.access_token
        ) {

          console.error(
            "ADMIN MEMBER TOOLS SESSION ERROR:",
            sessionError
          );

          return {
            error:
              "You must be logged in as an admin.",
          };
        }


        const response =
          await fetch(
            "https://vhpbmkdtlajdohhxawno.supabase.co/functions/v1/admin-member-tools",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${session.access_token}`,
              },

              body:
                JSON.stringify(
                  payload
                ),
            }
          );


        let result = null;


        try {
          result =
            await response.json();
        } catch (jsonError) {
          console.error(
            "ADMIN MEMBER TOOLS JSON ERROR:",
            jsonError
          );
        }


        if (!response.ok) {
          return {
            error:
              result?.error ||
              `Request failed with status ${response.status}`,
          };
        }


        return result || {};

      } catch (err) {

        console.error(
          "ADMIN MEMBER TOOLS CRASH:",
          err
        );


        return {
          error:
            err.message ||
            "Request failed.",
        };
      }
    }



    async function loadReservationRequests() {

      if (!requestList) {
        return;
      }


      requestList.innerHTML =
        "Loading requests...";


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
            profiles!reservation_requests_user_id_fkey (
              display_name,
              email
            )
          `)
          .order(
            "created_at",
            {
              ascending: false,
            }
          );


      if (error) {

        console.error(
          "LOAD RESERVATION REQUESTS ERROR:",
          error
        );

        requestList.innerHTML =
          `<p class="small-text">
            Failed to load reservation requests.
          </p>`;

        return;
      }


      if (
        !data ||
        data.length === 0
      ) {

        requestList.innerHTML =
          `<p class="small-text">
            No reservation information requests yet.
          </p>`;

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
              "No email";


            const note =
              request.note ||
              "No note provided.";


            const created =
              new Date(
                request.created_at
              ).toLocaleString();


            return `
              <div class="user-item">

                <h3>
                  ${person}
                </h3>

                <p class="user-meta">
                  <strong>Email:</strong>
                  ${email}
                </p>

                <p class="user-meta">
                  <strong>Status:</strong>
                  ${request.status}
                </p>

                <p class="user-meta">
                  <strong>Requested:</strong>
                  ${created}
                </p>

                <p class="user-meta">
                  <strong>Near / Notes:</strong>
                  ${note}
                </p>


                <div class="user-actions">

                  ${
                    request.status ===
                    "pending"
                      ? `
                        <button
                          class="btn btn-primary request-approve-btn"
                          data-id="${request.id}"
                        >
                          Approve
                        </button>

                        <button
                          class="btn btn-secondary request-complete-btn"
                          data-id="${request.id}"
                        >
                          Mark Completed
                        </button>

                        <button
                          class="btn btn-danger request-decline-btn"
                          data-id="${request.id}"
                        >
                          Decline
                        </button>
                      `
                      : `
                        <button
                          class="btn btn-secondary request-complete-btn"
                          data-id="${request.id}"
                        >
                          Mark Completed
                        </button>
                      `
                  }

                </div>

              </div>
            `;
          })
          .join("");


      bindReservationRequestButtons();
    }



    function bindReservationRequestButtons() {

      document
        .querySelectorAll(
          ".request-approve-btn"
        )
        .forEach((button) => {

          button.addEventListener(
            "click",
            async () => {

              await updateRequestStatus(
                button.dataset.id,
                "approved"
              );
            }
          );
        });


      document
        .querySelectorAll(
          ".request-complete-btn"
        )
        .forEach((button) => {

          button.addEventListener(
            "click",
            async () => {

              await updateRequestStatus(
                button.dataset.id,
                "completed"
              );
            }
          );
        });


      document
        .querySelectorAll(
          ".request-decline-btn"
        )
        .forEach((button) => {

          button.addEventListener(
            "click",
            async () => {

              await updateRequestStatus(
                button.dataset.id,
                "declined"
              );
            }
          );
        });
    }



    async function updateRequestStatus(
      requestId,
      status
    ) {

      if (adminMessage) {
        adminMessage.textContent =
          "Updating request...";
      }


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

        console.error(
          "UPDATE REQUEST ERROR:",
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
          `Reservation request marked ${status}.`;
      }


      await loadReservationRequests();
    }



    async function loadUsers() {

      if (!userList) {
        return;
      }


      userList.innerHTML =
        "Loading users...";


      const {
        data,
        error,
      } =
        await window.supabaseClient
          .from("profiles")
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          );


      if (error) {

        userList.innerHTML =
          "Failed to load users.";

        console.error(
          "LOAD USERS ERROR:",
          error
        );

        return;
      }


      if (
        !data ||
        data.length === 0
      ) {

        userList.innerHTML =
          "No users found.";

        return;
      }


      userList.innerHTML = "";


      data.forEach(
        (member) => {

          const item =
            document.createElement(
              "div"
            );


          const isSelf =
            member.id === user.id;


          item.className =
            "user-item";


          item.innerHTML = `
            <h3>
              ${
                member.display_name ||
                "No display name"
              }
            </h3>

            <p class="user-meta">
              <strong>Email:</strong>
              ${
                member.email ||
                "No email"
              }
            </p>

            <p class="user-meta">
              <strong>Approved:</strong>
              ${
                member.approved
                  ? "Yes"
                  : "No"
              }
            </p>

            <p class="user-meta">
              <strong>Role:</strong>
              ${
                member.role ||
                "member"
              }
            </p>


            <div class="user-actions">

              <button
                class="btn btn-primary approve-btn"
                data-id="${member.id}"
                data-approved="${member.approved}"
              >
                ${
                  member.approved
                    ? "Unapprove"
                    : "Approve"
                }
              </button>


              <button
                class="btn btn-secondary role-btn"
                data-id="${member.id}"
                data-role="${member.role}"
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
                data-id="${member.id}"
              >
                Reset Password
              </button>


              <button
                class="btn btn-danger delete-user-btn"
                data-id="${member.id}"
                ${isSelf ? "disabled" : ""}
              >
                Delete User
              </button>

            </div>
          `;


          userList.appendChild(
            item
          );
        }
      );


      bindUserButtons();
    }



    function bindUserButtons() {

      document
        .querySelectorAll(
          ".approve-btn"
        )
        .forEach((btn) => {

          btn.addEventListener(
            "click",
            async () => {

              const id =
                btn.dataset.id;

              const currentApproved =
                btn.dataset.approved ===
                "true";


              const {
                error,
              } =
                await window.supabaseClient
                  .from("profiles")
                  .update({
                    approved:
                      !currentApproved,
                  })
                  .eq("id", id);


              if (error) {

                if (adminMessage) {
                  adminMessage.textContent =
                    error.message;
                }

                return;
              }


              if (adminMessage) {
                adminMessage.textContent =
                  "Approval updated.";
              }


              await loadUsers();
            }
          );
        });



      document
        .querySelectorAll(
          ".role-btn"
        )
        .forEach((btn) => {

          btn.addEventListener(
            "click",
            async () => {

              const id =
                btn.dataset.id;

              const currentRole =
                btn.dataset.role;

              const newRole =
                currentRole === "admin"
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
                  .eq("id", id);


              if (error) {

                if (adminMessage) {
                  adminMessage.textContent =
                    error.message;
                }

                return;
              }


              if (adminMessage) {
                adminMessage.textContent =
                  "Role updated.";
              }


              await loadUsers();
            }
          );
        });



      document
        .querySelectorAll(
          ".reset-password-btn"
        )
        .forEach((btn) => {

          btn.addEventListener(
            "click",
            async () => {

              const id =
                btn.dataset.id;


              const newPassword =
                prompt(
                  "Enter a new temporary password for this member:"
                );


              if (!newPassword) {
                return;
              }


              if (
                newPassword.length < 6
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
                    id,

                  new_password:
                    newPassword,
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
        .forEach((btn) => {

          btn.addEventListener(
            "click",
            async () => {

              const id =
                btn.dataset.id;


              const confirmed =
                confirm(
                  "Are you sure you want to permanently delete this user? This cannot be undone."
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
                    id,
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



    if (createMemberForm) {

      createMemberForm.addEventListener(
        "submit",
        async (e) => {

          e.preventDefault();


          if (!createMemberMessage) {
            return;
          }


          createMemberMessage.textContent =
            "Creating account...";


          const display_name =
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
              ?.value.trim() ||
            "";


          try {

            const {
              data: { session },
              error: sessionError,
            } =
              await window.supabaseClient.auth.getSession();


            if (sessionError) {

              createMemberMessage.textContent =
                "Could not verify session.";

              return;
            }


            if (!session) {

              createMemberMessage.textContent =
                "You must be logged in.";

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
                      display_name,
                      email,
                      password,
                    }),
                }
              );


            let result = null;


            try {
              result =
                await response.json();
            } catch (jsonError) {
              console.error(
                "CREATE MEMBER JSON ERROR:",
                jsonError
              );
            }


            if (!response.ok) {

              createMemberMessage.textContent =
                result?.error ||
                `Could not create account. Status: ${response.status}`;

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
              "Something went wrong creating the account.";
          }
        }
      );
    }


    await loadReservationRequests();

    await loadUsers();
  }
);
