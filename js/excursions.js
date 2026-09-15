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
  const message = document.getElementById("excursions-message");
  const wrap = document.getElementById("excursions-wrap");
  const logoutBtn = document.getElementById("logout-btn");

  if (typeof window.setupNotifications === "function") {
    await window.setupNotifications(user.id);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.supabaseClient.auth.signOut();
      window.location.href = "login.html";
    });
  }

  message.textContent = "Loading excursions...";

  const { data: myProfile, error: myProfileError } =
    await window.supabaseClient
      .from("profiles")
      .select("id, approved, display_name, email")
      .eq("id", user.id)
      .single();

  if (myProfileError || !myProfile || !myProfile.approved) {
    window.location.href = "pending.html";
    return;
  }

  /*
    New cruise itinerary:

    Jan 3  - Miami
    Jan 4  - Great Stirrup Cay
    Jan 5  - Sea Day
    Jan 6  - Cabo Rojo
    Jan 7  - Oranjestad
    Jan 8  - Willemstad
    Jan 9  - Sea Day
    Jan 10 - Falmouth
    Jan 11 - George Town
    Jan 12 - Sea Day
    Jan 13 - Miami
  */

  const portInfo = {
    "Great Stirrup Cay, Bahamas": {
      order: 1,
      label: "Tue, Jan 4"
    },

    "Great Stirrup Cay": {
      order: 1,
      label: "Tue, Jan 4"
    },

    "Cabo Rojo, Dominican Republic": {
      order: 2,
      label: "Thu, Jan 6"
    },

    "Cabo Rojo": {
      order: 2,
      label: "Thu, Jan 6"
    },

    "Oranjestad, Aruba": {
      order: 3,
      label: "Fri, Jan 7"
    },

    "Oranjestad": {
      order: 3,
      label: "Fri, Jan 7"
    },

    "Willemstad, Curaçao": {
      order: 4,
      label: "Sat, Jan 8"
    },

    "Willemstad, Curacao": {
      order: 4,
      label: "Sat, Jan 8"
    },

    "Willemstad": {
      order: 4,
      label: "Sat, Jan 8"
    },

    "Falmouth, Jamaica": {
      order: 5,
      label: "Mon, Jan 10"
    },

    "Falmouth": {
      order: 5,
      label: "Mon, Jan 10"
    },

    "George Town, Grand Cayman": {
      order: 6,
      label: "Tue, Jan 11"
    },

    "George Town": {
      order: 6,
      label: "Tue, Jan 11"
    }
  };

  function getPortInfo(portName) {
    return (
      portInfo[portName] || {
        order: 999,
        label: "Port Day"
      }
    );
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function loadExcursions() {
    message.textContent = "Loading excursions...";

    const { data: excursions, error: excursionsError } =
      await window.supabaseClient
        .from("excursions")
        .select("*")
        .order("sort_order", { ascending: true });

    if (excursionsError) {
      console.error("EXCURSIONS LOAD ERROR:", excursionsError);
      message.textContent = "Could not load excursions.";
      return;
    }

    const { data: selections, error: selectionsError } =
      await window.supabaseClient
        .from("member_excursions")
        .select(`
          id,
          user_id,
          excursion_id,
          booked,
          booked_time,
          notes,
          profiles!member_excursions_user_id_fkey (
            display_name,
            email
          )
        `);

    if (selectionsError) {
      console.error("SELECTIONS LOAD ERROR:", selectionsError);
      message.textContent = "Could not load excursion selections.";
      return;
    }

    const mySelections = {};
    const groupedSelections = {};

    (selections || []).forEach((row) => {
      if (!groupedSelections[row.excursion_id]) {
        groupedSelections[row.excursion_id] = [];
      }

      groupedSelections[row.excursion_id].push(row);

      if (row.user_id === user.id) {
        mySelections[row.excursion_id] = row;
      }
    });

    const groupedByPort = {};

    (excursions || []).forEach((excursion) => {
      if (!groupedByPort[excursion.port_name]) {
        groupedByPort[excursion.port_name] = [];
      }

      groupedByPort[excursion.port_name].push(excursion);
    });

    const sortedPorts = Object.entries(groupedByPort).sort(
      ([portA], [portB]) => {
        const orderA = getPortInfo(portA).order;
        const orderB = getPortInfo(portB).order;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return portA.localeCompare(portB);
      }
    );

    wrap.innerHTML = sortedPorts
      .map(([portName, items]) => {
        const itineraryInfo = getPortInfo(portName);

        const excursionCards = items
          .map((excursion) => {
            const mine = mySelections[excursion.id];

            const bookedBy = (
              groupedSelections[excursion.id] || []
            ).filter((entry) => entry.booked);

            const excursionName = escapeHtml(
              excursion.excursion_name || "Excursion"
            );

            const details = escapeHtml(
              excursion.details || "No details added yet."
            );

            const duration = escapeHtml(
              excursion.duration_text || "Not listed"
            );

            const activityLevel = escapeHtml(
              excursion.activity_level || "Not listed"
            );

            const bookedTimeValue = escapeHtml(
              mine?.booked_time || ""
            );

            const notesValue = escapeHtml(
              mine?.notes || ""
            );

            return `
              <article
                class="card excursion-card"
                data-excursion-id="${excursion.id}"
                data-port-name="${escapeHtml(portName)}"
              >

                <span class="pill">
                  ${escapeHtml(itineraryInfo.label)}
                </span>

                <h3>${excursionName}</h3>

                <p class="excursion-meta">
                  <strong>Price:</strong>
                  ${
                    excursion.price_adult
                      ? `$${Number(excursion.price_adult).toFixed(2)} adult`
                      : "Check listing"
                  }
                  ${
                    excursion.price_child
                      ? ` / $${Number(excursion.price_child).toFixed(2)} child`
                      : ""
                  }
                </p>

                <p class="excursion-meta">
                  <strong>Duration:</strong>
                  ${duration}
                </p>

                <p class="excursion-meta">
                  <strong>Activity Level:</strong>
                  ${activityLevel}
                </p>

                <p class="excursion-meta">
                  <strong>Details:</strong>
                  ${details}
                </p>

                <div class="excursion-booking-box">

                  <label class="checkbox-row">
                    <input
                      type="checkbox"
                      class="booked-checkbox"
                      ${mine?.booked ? "checked" : ""}
                    />
                    <span>I booked this</span>
                  </label>

                  <label>Time</label>

                  <input
                    type="text"
                    class="booked-time-input"
                    placeholder="10:30 AM"
                    value="${bookedTimeValue}"
                  />

                  <label>Notes</label>

                  <textarea
                    class="excursion-notes-input"
                    rows="3"
                    placeholder="Meeting at the pier, beach day, tequila plans..."
                  >${notesValue}</textarea>

                  <div
                    class="button-row"
                    style="margin-top: 1rem;"
                  >
                    <button
                      type="button"
                      class="btn btn-primary save-excursion-btn"
                    >
                      Save
                    </button>
                  </div>

                </div>

                <div class="excursion-booked-by">

                  <h4>Booked By</h4>

                  ${
                    bookedBy.length
                      ? bookedBy
                          .map((entry) => {
                            const person = escapeHtml(
                              entry.profiles?.display_name ||
                                entry.profiles?.email ||
                                "Member"
                            );

                            const time = entry.booked_time
                              ? ` — ${escapeHtml(entry.booked_time)}`
                              : "";

                            const notes = entry.notes
                              ? `
                                <div class="small-text">
                                  ${escapeHtml(entry.notes)}
                                </div>
                              `
                              : "";

                            return `
                              <div class="dashboard-mini-item">
                                <strong>${person}</strong>${time}
                                ${notes}
                              </div>
                            `;
                          })
                          .join("")
                      : `
                        <p class="small-text">
                          Nobody has marked this one yet.
                        </p>
                      `
                  }

                </div>

              </article>
            `;
          })
          .join("");

        return `
          <section
            class="card excursion-port-section"
            data-port-name="${escapeHtml(portName)}"
          >

            <span class="pill">
              ${escapeHtml(itineraryInfo.label)}
            </span>

            <h2>${escapeHtml(portName)}</h2>

            <div class="excursion-grid">
              ${excursionCards}
            </div>

          </section>
        `;
      })
      .join("");

    message.textContent = "";

    document
      .querySelectorAll(".save-excursion-btn")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          const card = button.closest(".excursion-card");

          if (!card) {
            return;
          }

          const excursionId = card.dataset.excursionId;
          const portName =
            card.dataset.portName || "a port";

          const booked =
            card.querySelector(".booked-checkbox").checked;

          const bookedTime =
            card
              .querySelector(".booked-time-input")
              .value.trim();

          const notes =
            card
              .querySelector(".excursion-notes-input")
              .value.trim();

          const existingRow =
            mySelections[excursionId] || null;

          const wasBooked =
            !!existingRow?.booked;

          message.textContent =
            "Saving excursion...";

          if (existingRow) {
            const { error: updateError } =
              await window.supabaseClient
                .from("member_excursions")
                .update({
                  booked,
                  booked_time: bookedTime || null,
                  notes: notes || null
                })
                .eq("id", existingRow.id);

            if (updateError) {
              console.error(
                "UPDATE EXCURSION ERROR:",
                updateError
              );

              message.textContent =
                "Could not save excursion.";

              return;
            }
          } else {
            const { error: insertError } =
              await window.supabaseClient
                .from("member_excursions")
                .insert({
                  user_id: user.id,
                  excursion_id: excursionId,
                  booked,
                  booked_time: bookedTime || null,
                  notes: notes || null
                });

            if (insertError) {
              console.error(
                "INSERT EXCURSION ERROR:",
                insertError
              );

              message.textContent =
                "Could not save excursion.";

              return;
            }
          }

          if (
            booked &&
            !wasBooked &&
            typeof window.createNotification === "function"
          ) {
            const excursionName =
              card
                .querySelector("h3")
                ?.textContent
                ?.trim() || "an excursion";

            const person =
              myProfile.display_name ||
              myProfile.email ||
              "A member";

            await window.createNotification({
              type: "excursion_booked",

              title: "New Excursion Booked",

              message:
                `${person} booked ${excursionName} in ${portName}` +
                `${bookedTime ? ` at ${bookedTime}` : ""}.`,

              link_url: "excursions.html",

              meta: {
                excursion_id: excursionId,
                booked_time: bookedTime || null,
                port_name: portName
              }
            });
          }

          message.textContent =
            "Excursion saved.";

          await loadExcursions();
        });
      });
  }

  await loadExcursions();
});
