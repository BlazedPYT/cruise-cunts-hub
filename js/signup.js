const signupForm = document.getElementById("signup-form");
const signupMessage = document.getElementById("message");

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  signupMessage.textContent = "Creating account...";

  const display_name = document.getElementById("display_name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name
      }
    }
  });

  if (error) {
    signupMessage.textContent = error.message;
    return;
  }

  signupMessage.textContent =
    "Account created. If email confirmation is on, check your email first. Then wait for admin approval.";
});