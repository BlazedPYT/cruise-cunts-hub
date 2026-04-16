const signupForm = document.getElementById("signup-form");
const signupMessage = document.getElementById("message");

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    signupMessage.textContent = "Creating account...";

    const display_name = document.getElementById("display_name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!display_name || !email || !password) {
      signupMessage.textContent = "Please fill out all fields.";
      return;
    }

    const { data, error } = await window.supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "https://blazedpyt.github.io/cruise-cunts-hub/login.html",
        data: {
          display_name
        }
      }
    });

    console.log("SIGNUP RESPONSE:", data, error);

    if (error) {
      signupMessage.textContent = error.message;
      return;
    }

    signupMessage.textContent =
      "Account created. Check your email if confirmation is enabled, then wait for admin approval.";
  } catch (err) {
    console.error("Signup crashed:", err);
    signupMessage.textContent =
      "Signup failed. Check browser console for details.";
  }
});
