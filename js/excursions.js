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

  const { data: myProfile, error: myProfileError } = await window.supabaseClient
    .from("profiles")
    .select("id, approved, display_name, email")
    .eq("id", user.id)
    .single();

  if (myProfileError || !myProfile || !myProfile.approved) {
    window.location.href = "pending.html";
    return;
  }

  async function loadExcursions() {
    message.textContent = "Loading excursions...";

    const { data: excursions, error: excursionsError } = await window.supabaseClient
      .from("excursions")
      .select("*")
      .order("port_name", { ascending: true })
      .order("sort_order", { ascending: true });

    if (excursionsError) {
      console.error("EXCURSIONS LOAD ERROR:", excursionsError);
      message.textContent = "Could not load excursions.";
      return;
    }

    const { data: selections, error: selectionsError } = await window.supabaseClient
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

    wrap.innerHTML = Object.entries(groupedByPort)
      .map(([portName, items]) => {
        const excursionCards = items
          .map((excursion) => {
            const mine = mySelections[excursion.id];
            const bookedBy = (groupedSelections[excursion.id] || []).filter((x) => x.booked);

            return `
              <article class="card excursion-card" data-excursion-id="${excursion.id}">
                <span class="pill">${excursion.day_label || "Port Day"}</span>
                <h3>${excursion.excursion_name}</h3>

                <p class="excursion-meta"><strong>Price:</strong> ${
                  excursion.price_adult
                    ? `$${Number(excursion.price_adult).toFixed(2)} adult`
                    : "Check listing"
                }${excursion.price_child ? ` / $${Number(excursion.price_child).toFixed(2)} child` : ""}</p>

                <p class="excursion-meta"><strong>Duration:</strong> ${excursion.duration_text || "Not listed"}</p>
                <p class="excursion-meta"><strong>Activity Level:</strong> ${excursion.activity_level || "Not listed"}</p>
                <p class="excursion-meta"><strong>Details:</strong> ${excursion.details || "No details added yet."}</p>

                <div class="excursion-booking-box">
                  <label class="checkbox-row">
                    <input type="checkbox" class="booked-checkbox" ${mine?.booked ? "checked" : ""} />
                    <span>I booked this</span>
                  </label>

                  <label>Time</label>
                  <input
                    type="text"
                    class="booked-time-input"
                    placeholder="10:30 AM"
                    value="${mine?.booked_time || ""}"
                  />

                  <label>Notes</label>
                  <textarea
                    class="excursion-notes-input"
                    rows="3"
                    placeholder="Meeting at the pier, beach day, tequila plans..."
                  >${mine?.notes || ""}</textarea>

                  <div class="button-row" style="margin-top: 1rem;">
                    <button type="button" class="btn btn-primary save-excursion-btn">Save</button>
                  </div>
                </div>

                <div class="excursion-booked-by">
                  <h4>Booked By</h4>
                  ${
                    bookedBy.length
                      ? bookedBy
                          .map((entry) => {
                            const person =
                              entry.profiles?.display_name ||
                              entry.profiles?.email ||
                              "Member";

                            const time = entry.booked_time ? ` — ${entry.booked_time}` : "";
                            const notes = entry.notes
                              ? `<div class="small-text">${entry.notes}</div>`
                              : "";

                            return `
                              <div class="dashboard-mini-item">
                                <strong>${person}</strong>${time}
                                ${notes}
                              </div>
                            `;
                          })
                          .join("")
                      : `<p class="small-text">Nobody has marked this one yet.</p>`
                  }
                </div>
              </article>
            `;
          })
          .join("");

        return `
          <section class="card">
            <h2>${portName}</h2>
            <div class="excursion-grid">
              ${excursionCards}
            </div>
          </section>
        `;
      })
      .join("");

    message.textContent = "";

    document.querySelectorAll(".save-excursion-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const card = button.closest(".excursion-card");
        const excursionId = card.dataset.excursionId;
        const booked = card.querySelector(".booked-checkbox").checked;
        const bookedTime = card.querySelector(".booked-time-input").value.trim();
        const notes = card.querySelector(".excursion-notes-input").value.trim();

        const existingRow = mySelections[excursionId] || null;
        const wasBooked = !!existingRow?.booked;

        message.textContent = "Saving excursion...";

        if (existingRow) {
          const { error: updateError } = await window.supabaseClient
            .from("member_excursions")
            .update({
              booked,
              booked_time: bookedTime || null,
              notes: notes || null,
            })
            .eq("id", existingRow.id);

          if (updateError) {
            console.error("UPDATE EXCURSION ERROR:", updateError);
            message.textContent = "Could not save excursion.";
            return;
          }
        } else {
          const { error: insertError } = await window.supabaseClient
            .from("member_excursions")
            .insert({
              user_id: user.id,
              excursion_id: excursionId,
              booked,
              booked_time: bookedTime || null,
              notes: notes || null,
            });

          if (insertError) {
            console.error("INSERT EXCURSION ERROR:", insertError);
            message.textContent = "Could not save excursion.";
            return;
          }
        }

        if (booked && !wasBooked && typeof window.createNotification === "function") {
          const excursionName =
            card.querySelector("h3")?.textContent?.trim() || "an excursion";

          const portName =
            card.closest(".card")?.querySelector("h2")?.textContent?.trim() || "a port";

          const person =
            myProfile.display_name || myProfile.email || "A member";

          await window.createNotification({
            type: "excursion_booked",
            title: "New Excursion Booked",
            message: `${person} booked ${excursionName} in ${portName}${bookedTime ? ` at ${bookedTime}` : ""}.`,
            link_url: "excursions.html",
            meta: {
              excursion_id: excursionId,
              booked_time: bookedTime || null,
            },
          });
        }

        message.textContent = "Excursion saved.";
        await loadExcursions();
      });
    });
  }

  await loadExcursions();
});
