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

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.supabaseClient.auth.signOut();
      window.location.href = "login.html";
    });
  }

  message.textContent = "Loading excursions...";

  const { data: myProfile, error: myProfileError } = await window.supabaseClient
    .from("profiles")
    .select("id, approved")
    .eq("id", user.id)
    .single();

  if (myProfileError || !myProfile || !myProfile.approved) {
    window.location.href = "pending.html";
    return;
  }

  const { data: excursions, error: excursionsError } = await window.supabaseClient
    .from("excursions")
    .select("*")
    .order("port_name", { ascending: true })
    .order("sort_order", { ascending: true });

  if (excursionsError) {
    console.error(excursionsError);
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
    console.error(selectionsError);
    message.textContent = "Could not load excursion selections.";
    return;
  }

  const mySelections = {};
  const groupedSelections = {};

  selections.forEach((row) => {
    if (!groupedSelections[row.excursion_id]) groupedSelections[row.excursion_id] = [];
    groupedSelections[row.excursion_id].push(row);

    if (row.user_id === user.id) {
      mySelections[row.excursion_id] = row;
    }
  });

  const groupedByPort = {};
  excursions.forEach((excursion) => {
    if (!groupedByPort[excursion.port_name]) groupedByPort[excursion.port_name] = [];
    groupedByPort[excursion.port_name].push(excursion);
  });

  wrap.innerHTML = Object.entries(groupedByPort)
    .map(([portName, items]) => {
      return `
        <section class="card" style="margin-top: 1.5rem;">
          <h2>${portName}</h2>
          <div class="members-grid" style="margin-top: 1rem;">
            ${items.map((excursion) => {
              const mine = mySelections[excursion.id];
              const bookedBy = (groupedSelections[excursion.id] || []).filter((x) => x.booked);

              return `
                <article class="member-card">
                  <div class="member-content">
                    <span class="pill">${excursion.day_label || "Port Day"}</span>
                    <h3>${excursion.excursion_name}</h3>
                    <p><strong>Price:</strong> ${excursion.price_adult ? `$${Number(excursion.price_adult).toFixed(2)} adult` : "Check listing"}</p>
                    <p><strong>Duration:</strong> ${excursion.duration_text || "Not listed"}</p>
                    <p><strong>Activity Level:</strong> ${excursion.activity_level || "Not listed"}</p>
                    <p><strong>Details:</strong> ${excursion.details || "No details added yet."}</p>

                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #dce8f5;">
                      <label style="display:block; margin-bottom: 0.5rem;">
                        <input type="checkbox" class="excursion-booked" data-excursion-id="${excursion.id}" ${mine && mine.booked ? "checked" : ""} />
                        I booked this
                      </label>

                      <label style="display:block; margin-bottom: 0.75rem;">
                        Time
                        <input
                          type="text"
                          class="excursion-time"
                          data-excursion-id="${excursion.id}"
                          placeholder="Example: 10:30 AM"
                          value="${mine?.booked_time || ""}"
                        />
                      </label>

                      <label style="display:block; margin-bottom: 0.75rem;">
                        Notes
                        <textarea
                          class="excursion-notes"
                          data-excursion-id="${excursion.id}"
                          rows="3"
                          placeholder="Optional notes"
                        >${mine?.notes || ""}</textarea>
                      </label>

                      <button class="btn btn-primary save-excursion-btn" data-excursion-id="${excursion.id}">
                        Save
                      </button>
                    </div>

                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #dce8f5;">
                      <h4 style="margin-bottom: 0.75rem;">Booked By</h4>
                      ${
                        bookedBy.length
                          ? bookedBy.map((entry) => {
                              const name = entry.profiles?.display_name || entry.profiles?.email || "Member";
                              const time = entry.booked_time ? ` — ${entry.booked_time}` : "";
                              const notes = entry.notes ? `<div class="small-text" style="margin-top: 0.25rem;">${entry.notes}</div>` : "";

                              return `
                                <div class="mini-card" style="margin-bottom: 0.5rem;">
                                  <strong>${name}</strong>${time}
                                  ${notes}
                                </div>
                              `;
                            }).join("")
                          : `<p class="small-text">Nobody has marked this yet.</p>`
                      }
                    </div>
                  </div>
                </article>
              `;
            }).join("")}
          </div>
        </section>
      `;
    })
    .join("");

  message.textContent = "";

  document.querySelectorAll(".save-excursion-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const excursionId = Number(button.dataset.excursionId);
      const booked = document.querySelector(`.excursion-booked[data-excursion-id="${excursionId}"]`).checked;
      const bookedTime = document.querySelector(`.excursion-time[data-excursion-id="${excursionId}"]`).value.trim();
      const notes = document.querySelector(`.excursion-notes[data-excursion-id="${excursionId}"]`).value.trim();

      button.textContent = "Saving...";

      const existing = mySelections[excursionId];

      let error;

      if (existing) {
        const result = await window.supabaseClient
          .from("member_excursions")
          .update({
            booked,
            booked_time: bookedTime || null,
            notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        error = result.error;
      } else {
        const result = await window.supabaseClient
          .from("member_excursions")
          .insert({
            user_id: user.id,
            excursion_id: excursionId,
            booked,
            booked_time: bookedTime || null,
            notes: notes || null,
          })
          .select()
          .single();

        error = result.error;

        if (!error && result.data) {
          mySelections[excursionId] = result.data;
        }
      }

      if (error) {
        console.error("SAVE EXCURSION ERROR:", error);
        button.textContent = "Save";
        alert("Could not save excursion choice.");
        return;
      }

      location.reload();
    });
  });
});
