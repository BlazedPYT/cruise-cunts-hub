const form = document.getElementById("login-form");
const message = document.getElementById("message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  message.textContent = "Logging in...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      message.textContent = error.message;
      console.error("LOGIN ERROR:", error);
      return;
    }

    const user = data.user;

    const { data: profile, error: profileError } = await window.supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    console.log("LOGGED IN USER:", user);
    console.log("PROFILE RESULT:", profile, profileError);

    if (profileError) {
      message.textContent = `Profile error: ${profileError.message}`;
      return;
    }

    if (!profile) {
      message.textContent = "No profile row found for this account.";
      return;
    }

    if (!profile.approved) {
      window.location.href = "pending.html";
      return;
    }

    window.location.href = "dashboard.html";
  } catch (err) {
    console.error("LOGIN CRASH:", err);
    message.textContent = "Login crashed. Check browser console.";
  }
});
