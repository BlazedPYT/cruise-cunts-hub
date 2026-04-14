window.createNotification = async function ({
  type = "general",
  title,
  message,
  link_url = null,
  meta = null,
}) {
  if (!window.supabaseClient || !title || !message) return;

  try {
    const payload = {
      type,
      title,
      message,
      link_url,
      meta,
    };

    const { error } = await window.supabaseClient
      .from("notifications")
      .insert(payload);

    if (error) {
      console.error("CREATE NOTIFICATION ERROR:", error);
    }
  } catch (err) {
    console.error("CREATE NOTIFICATION CRASH:", err);
  }
};

window.setupNotifications = async function (userId) {
  const bell = document.getElementById("notification-bell");
  const countEl = document.getElementById("notification-count");
  const panel = document.getElementById("notification-panel");
  const list = document.getElementById("notification-list");

  if (!bell || !countEl || !panel || !list || !window.supabaseClient || !userId) {
    return;
  }

  async function loadNotifications(markRead = false) {
    const { data: notifications, error } = await window.supabaseClient
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(25);

    if (error) {
      console.error("NOTIFICATIONS LOAD ERROR:", error);
      list.innerHTML = `<p class="small-text">Could not load notifications.</p>`;
      return;
    }

    if (!notifications || notifications.length === 0) {
      list.innerHTML = `<p class="small-text">No notifications yet.</p>`;
      countEl.classList.add("hidden");
      return;
    }

    const ids = notifications.map((n) => n.id);

    const { data: reads, error: readsError } = await window.supabaseClient
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", userId)
      .in("notification_id", ids);

    if (readsError) {
      console.error("NOTIFICATION READS ERROR:", readsError);
    }

    const readIds = new Set((reads || []).map((r) => r.notification_id));
    const unread = notifications.filter((n) => !readIds.has(n.id));

    if (unread.length > 0) {
      countEl.textContent = unread.length > 9 ? "9+" : String(unread.length);
      countEl.classList.remove("hidden");
    } else {
      countEl.classList.add("hidden");
    }

    list.innerHTML = notifications
      .map((item) => {
        const date = new Date(item.created_at);
        const safeTitle = item.title || "Update";
        const safeMessage = item.message || "";
        const safeLink = item.link_url
          ? `<a class="notification-link" href="${item.link_url}">Open</a>`
          : "";

        return `
          <div class="notification-item">
            <div class="notification-item-top">
              <strong>${safeTitle}</strong>
              <span class="small-text">${date.toLocaleString()}</span>
            </div>
            <p>${safeMessage}</p>
            ${safeLink}
          </div>
        `;
      })
      .join("");

    if (markRead && unread.length > 0) {
      const rows = unread.map((n) => ({
        notification_id: n.id,
        user_id: userId,
      }));

      const { error: insertError } = await window.supabaseClient
        .from("notification_reads")
        .upsert(rows, { onConflict: "notification_id,user_id" });

      if (insertError) {
        console.error("MARK READ ERROR:", insertError);
      } else {
        countEl.classList.add("hidden");
      }
    }
  }

  bell.addEventListener("click", async (e) => {
    e.stopPropagation();

    const isHidden = panel.classList.contains("hidden");

    if (isHidden) {
      panel.classList.remove("hidden");
      await loadNotifications(true);
    } else {
      panel.classList.add("hidden");
    }
  });

  panel.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && !bell.contains(e.target)) {
      panel.classList.add("hidden");
    }
  });

  await loadNotifications(false);
};
