document.addEventListener("DOMContentLoaded", async () => {
  const authData = await requireAuth(false);
  if (!authData) return;

  const { profile, user } = authData;
  const logoutBtn = document.getElementById("logout-btn");
  const messageEl = document.getElementById("photos-message");
  const uploadForm = document.getElementById("photo-upload-form");
  const fileInput = document.getElementById("photo-file");
  const captionInput = document.getElementById("photo-caption");
  const photosGrid = document.getElementById("trip-photos-grid");

  const lightbox = document.getElementById("photo-lightbox");
  const lightboxImg = document.getElementById("photo-lightbox-img");
  const lightboxCaption = document.getElementById("photo-lightbox-caption");
  const lightboxClose = document.getElementById("photo-lightbox-close");
  const lightboxX = document.getElementById("photo-lightbox-x");

  const TRIP_SLUG = "western-caribbean-apr-2026";
  const TRIP_NAME = "April 4–11, 2026 — 7 Day Western Caribbean Cruise";
  const BUCKET_NAME = "trip-photos";

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.supabaseClient.auth.signOut();
      window.location.href = "index.html";
    });
  }

  function openLightbox(imageUrl, captionText = "") {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = imageUrl;
    lightboxCaption.textContent = captionText || "";
    lightbox.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox || !lightboxImg) return;
    lightbox.classList.add("hidden");
    lightboxImg.src = "";
    lightboxCaption.textContent = "";
    document.body.style.overflow = "";
  }

  if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
  }

  if (lightboxX) {
    lightboxX.addEventListener("click", closeLightbox);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeLightbox();
    }
  });

  async function loadPhotos() {
    photosGrid.innerHTML = `<p class="small-text">Loading photos...</p>`;

    const { data, error } = await window.supabaseClient
      .from("trip_photos")
      .select(`
        id,
        trip_slug,
        trip_name,
        image_path,
        caption,
        created_at,
        uploaded_by,
        profiles!trip_photos_uploaded_by_fkey (
          display_name,
          email
        )
      `)
      .eq("trip_slug", TRIP_SLUG)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("LOAD PHOTOS ERROR:", error);
      photosGrid.innerHTML = `<p class="small-text">Could not load photos.</p>`;
      return;
    }

    if (!data || data.length === 0) {
      photosGrid.innerHTML = `<p class="small-text">No photos uploaded yet. Be the first messy legend.</p>`;
      return;
    }

    const cards = await Promise.all(
      data.map(async (photo) => {
        const { data: signedData, error: signedError } = await window.supabaseClient
          .storage
          .from(BUCKET_NAME)
          .createSignedUrl(photo.image_path, 3600);

        if (signedError || !signedData?.signedUrl) {
          console.error("SIGNED URL ERROR:", signedError);
          return `
            <article class="photo-card">
              <div class="photo-card-body">
                <p>Could not load image.</p>
              </div>
            </article>
          `;
        }

        const uploader =
          photo.profiles?.display_name ||
          photo.profiles?.email ||
          "Member";

        const canDelete =
          photo.uploaded_by === user.id || profile.role === "admin";

        const safeCaption = (photo.caption || "").replace(/"/g, "&quot;");

        return `
          <article class="photo-card">
            <button
              type="button"
              class="photo-open-btn"
              data-url="${signedData.signedUrl}"
              data-caption="${safeCaption}"
            >
              <img src="${signedData.signedUrl}" alt="Trip photo" class="trip-photo-img" />
            </button>

            <div class="photo-card-body">
              <p class="photo-caption">${photo.caption || "No caption"}</p>
              <p class="small-text">Uploaded by ${uploader}</p>
              <div class="button-row photo-actions">
                <a class="btn btn-secondary" href="${signedData.signedUrl}" download>Download</a>
                ${
                  canDelete
                    ? `<button class="btn btn-danger delete-photo-btn" data-id="${photo.id}" data-path="${photo.image_path}">Delete</button>`
                    : ""
                }
              </div>
            </div>
          </article>
        `;
      })
    );

    photosGrid.innerHTML = cards.join("");

    document.querySelectorAll(".photo-open-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        openLightbox(btn.dataset.url, btn.dataset.caption || "");
      });
    });

    document.querySelectorAll(".delete-photo-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const photoId = btn.dataset.id;
        const imagePath = btn.dataset.path;

        const confirmed = window.confirm("Delete this photo?");
        if (!confirmed) return;

        const { error: storageError } = await window.supabaseClient
          .storage
          .from(BUCKET_NAME)
          .remove([imagePath]);

        if (storageError) {
          console.error("DELETE STORAGE ERROR:", storageError);
          messageEl.textContent = "Could not delete photo file.";
          return;
        }

        const { error: dbError } = await window.supabaseClient
          .from("trip_photos")
          .delete()
          .eq("id", photoId);

        if (dbError) {
          console.error("DELETE PHOTO ROW ERROR:", dbError);
          messageEl.textContent = "Could not delete photo record.";
          return;
        }

        messageEl.textContent = "Photo deleted.";
        loadPhotos();
      });
    });
  }

  if (uploadForm) {
    uploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const files = Array.from(fileInput.files || []);
      const caption = captionInput.value.trim();

      if (files.length === 0) {
        messageEl.textContent = "Pick at least one photo first.";
        return;
      }

      messageEl.textContent = `Uploading ${files.length} photo${files.length > 1 ? "s" : ""}...`;

      const uploadResults = await Promise.all(
        files.map(async (file, index) => {
          const fileExt = file.name.split(".").pop();
          const safeExt = fileExt ? fileExt.toLowerCase() : "jpg";
          const fileName = `${user.id}/${Date.now()}-${index}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;

          const { error: uploadError } = await window.supabaseClient
            .storage
            .from(BUCKET_NAME)
            .upload(fileName, file, {
              upsert: false,
            });

          if (uploadError) {
            console.error("UPLOAD ERROR:", file.name, uploadError);
            return { success: false, step: "upload", file: file.name, error: uploadError };
          }

          const { error: insertError } = await window.supabaseClient
            .from("trip_photos")
            .insert({
              trip_slug: TRIP_SLUG,
              trip_name: TRIP_NAME,
              uploaded_by: user.id,
              image_path: fileName,
              caption,
            });

          if (insertError) {
            console.error("INSERT PHOTO ERROR:", file.name, insertError);
            return { success: false, step: "insert", file: file.name, error: insertError };
          }

          return { success: true, file: file.name };
        })
      );

      const successCount = uploadResults.filter((r) => r.success).length;
      const failedCount = uploadResults.length - successCount;

      uploadForm.reset();

      if (successCount > 0 && failedCount === 0) {
        messageEl.textContent = `${successCount} photo${successCount > 1 ? "s" : ""} uploaded successfully.`;
      } else if (successCount > 0 && failedCount > 0) {
        messageEl.textContent = `${successCount} uploaded, ${failedCount} failed. Check console for details.`;
      } else {
        messageEl.textContent = `No photos uploaded. Check console for details.`;
      }

      loadPhotos();
    });
  }

  loadPhotos();
});
