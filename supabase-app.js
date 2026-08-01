import { supabase } from "./supabase-config.js";

function setStatus(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.style.color = isError ? "#b42318" : "var(--navy)";
}

async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

const signupForm = document.querySelector("#signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = signupForm.querySelector("[data-form-status]");
    const button = signupForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(status, "Creating your account...");

    const formData = new FormData(signupForm);
    const fullName = String(formData.get("full_name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/login.html`
        }
      });
      if (error) throw error;
      signupForm.reset();
      setStatus(status, "Account created. Check your email and tap the confirmation link, then return here to log in.");
    } catch (error) {
      setStatus(status, error.message || "We could not create the account.", true);
    } finally {
      button.disabled = false;
    }
  });
}

const loginForm = document.querySelector("#login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = loginForm.querySelector("[data-form-status]");
    const button = loginForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(status, "Logging you in...");

    const formData = new FormData(loginForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setStatus(status, "You are logged in. Opening the Player Profile page...");
      window.setTimeout(() => {
        window.location.href = "players.html#create-profile";
      }, 600);
    } catch (error) {
      setStatus(status, error.message || "We could not log you in.", true);
    } finally {
      button.disabled = false;
    }
  });
}

const logoutButton = document.querySelector("[data-logout]");
if (logoutButton) {
  getSession()
    .then((session) => {
      logoutButton.hidden = !session;
    })
    .catch(() => {
      logoutButton.hidden = true;
    });

  logoutButton.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "login.html";
  });
}

const playerForm = document.querySelector("#create-profile");
if (playerForm) {
  const status = playerForm.querySelector("[data-form-status]");
  const accountNotice = document.querySelector("[data-account-notice]");

  getSession()
    .then((session) => {
      if (session) {
        if (accountNotice) {
          accountNotice.innerHTML = "You are logged in and may save a player profile.";
        }
      } else {
        if (accountNotice) {
          accountNotice.innerHTML = 'Please <a href="login.html"><strong>create an account or log in</strong></a> before saving a player profile.';
        }
      }
    })
    .catch((error) => setStatus(status, error.message, true));

  playerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = playerForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(status, "Saving the player profile...");

    try {
      const session = await getSession();
      if (!session) {
        throw new Error("Please create an account or log in before saving a player profile.");
      }

      const formData = new FormData(playerForm);
      const player = {
        owner_id: session.user.id,
        parent_guardian_name: String(formData.get("parent_guardian_name") || "").trim(),
        parent_email: String(formData.get("parent_email") || session.user.email || "").trim(),
        email: String(formData.get("parent_email") || session.user.email || "").trim(),
        first_name: String(formData.get("first_name") || "").trim(),
        last_name: String(formData.get("last_name") || "").trim(),
        age_division: String(formData.get("age_division") || "").trim(),
        primary_position: String(formData.get("primary_position") || "").trim(),
        secondary_position: String(formData.get("secondary_position") || "").trim(),
        city: String(formData.get("city") || "").trim(),
        state: String(formData.get("state") || "").trim().toUpperCase(),
        coach_notes: String(formData.get("coach_notes") || "").trim(),
        looking_for_team: true,
        searchable_by_coaches: false,
        membership_active: false
      };

      const { error } = await supabase.from("players").insert(player);
      if (error) throw error;

      playerForm.reset();
      setStatus(status, "Player profile saved successfully.");
    } catch (error) {
      setStatus(status, error.message || "The profile could not be saved.", true);
    } finally {
      button.disabled = false;
    }
  });
}
