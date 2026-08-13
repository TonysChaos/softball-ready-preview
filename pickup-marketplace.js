import { supabase } from "./supabase-config.js";

const form = document.querySelector("#pickup-marketplace-form");
const accessStatus = document.querySelector("[data-pickup-access-status]");
const formStatus = form?.querySelector("[data-form-status]");
const results = document.querySelector("[data-pickup-results]");
const summary = document.querySelector("[data-pickup-summary]");
const clearButton = document.querySelector("[data-pickup-clear]");
const authLink = document.querySelector("[data-pickup-auth-link]") || document.querySelector('header a[href="login.html"].btn');

let session = null;
let accessAllowed = false;

function setStatus(el, msg, error = false) {
  if (!el) return;
  el.textContent = msg;
  el.style.color = error ? "#b42318" : "var(--navy)";
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function positionText(value) {
  if (Array.isArray(value)) return value.join(", ");
  return String(value || "");
}

function teamName(need) {
  const team = Array.isArray(need.teams) ? need.teams[0] : need.teams;
  return team?.team_name || team?.organization_name || "Travel softball team";
}

function applyAuthButton() {
  if (!authLink) return;
  if (session) {
    authLink.textContent = "Log Out";
    authLink.href = "#";
    authLink.style.background = "#d7d9dd";
    authLink.style.color = "#17345f";
    authLink.style.border = "0";
    authLink.onclick = async (event) => {
      event.preventDefault();
      await supabase.auth.signOut();
      location.href = "login.html";
    };
  } else {
    authLink.textContent = "Log In";
    authLink.href = "login.html";
    authLink.onclick = null;
  }
}

function renderCards(rows) {
  if (!rows.length) {
    results.innerHTML = `<div class="pickup-empty"><h3>No pickup opportunities matched those filters.</h3><p>Try clearing the filters or check back as coaches post tournament needs.</p></div>`;
    summary.textContent = "No active opportunities found.";
    return;
  }

  results.innerHTML = rows.map((need) => {
    const start = formatDate(need.tournament_start_date);
    const end = formatDate(need.tournament_end_date);
    const dates = start && end && start !== end ? `${start} – ${end}` : (start || end || "Date not entered");
    const loc = [need.tournament_city, need.tournament_state].filter(Boolean).join(", ")
      || [need.city, need.state].filter(Boolean).join(", ")
      || "Location not entered";
    const positions = positionText(need.positions_needed) || "Any position";

    return `<article class="pickup-card">
      <div class="pickup-card-top">
        <div class="pickup-badges">
          <span class="pickup-badge pink">Pickup Player</span>
          <span class="pickup-badge">${esc(need.age_division || "Age not entered")}</span>
        </div>
        <h3>${esc(need.title || "Tournament player needed")}</h3>
        <p>${esc(teamName(need))}</p>
      </div>
      <div class="pickup-card-body">
        <div class="pickup-meta">
          <div><strong>Tournament:</strong> ${esc(need.tournament_name || "Not entered")}</div>
          <div><strong>Dates:</strong> ${esc(dates)}</div>
          <div><strong>Location:</strong> ${esc(loc)}</div>
          <div><strong>Position needed:</strong> ${esc(positions)}</div>
          ${need.start_date ? `<div><strong>Player needed by:</strong> ${esc(formatDate(need.start_date))}</div>` : ""}
        </div>
        <div class="pickup-details">${esc(need.details || "Contact the team through SoftballReady.net for additional tournament details.")}</div>
        <div class="pickup-card-footer">
          <button class="btn btn-pink" type="button" data-interest="${esc(need.id)}">I'm Interested</button>
          <p data-interest-status="${esc(need.id)}" style="font-weight:800;margin:10px 0 0"></p>
        </div>
      </div>
    </article>`;
  }).join("");

  summary.textContent = `${rows.length} active pickup opportunit${rows.length === 1 ? "y" : "ies"} found.`;

  results.querySelectorAll("[data-interest]").forEach((button) => {
    button.addEventListener("click", async () => {
      const needId = button.dataset.interest;
      const status = results.querySelector(`[data-interest-status="${CSS.escape(needId)}"]`);
      const message = prompt(
        "Send the coach a private note:",
        "Hello, my player is interested and available. Please contact us through SoftballReady.net."
      );
      if (message === null) return;
      if (!message.trim()) return setStatus(status, "Please enter a message before sending.", true);

      button.disabled = true;
      setStatus(status, "Sending your interest...");
      try {
        const { data: player, error: playerError } = await supabase
          .from("players")
          .select("id")
          .eq("owner_id", session.user.id)
          .limit(1)
          .maybeSingle();
        if (playerError) throw playerError;
        if (!player) throw new Error("Create and save a player profile before responding.");

        const { error } = await supabase.from("pickup_interests").upsert({
          team_need_id: needId,
          player_id: player.id,
          player_owner_id: session.user.id,
          message: message.trim(),
          status: "new"
        }, { onConflict: "team_need_id,player_id" });
        if (error) throw error;

        button.textContent = "Interest Sent";
        setStatus(status, "Interest sent privately to the coach.");
      } catch (error) {
        setStatus(status, error.message || "Your interest could not be sent.", true);
      } finally {
        button.disabled = false;
      }
    });
  });
}

async function verifyAccess() {
  const { data: authData, error: authError } = await supabase.auth.getSession();
  if (authError) throw authError;
  session = authData.session;
  applyAuthButton();

  if (!session) {
    accessAllowed = false;
    accessStatus.innerHTML = `Please <a href="login.html">log in</a> to view pickup-player opportunities.`;
    results.innerHTML = `<div class="pickup-empty">Log in to browse tournament pickup needs.</div>`;
    summary.textContent = "Log in required.";
    return false;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("membership_active")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error) throw error;

  accessAllowed = profile?.membership_active === true;
  if (!accessAllowed) {
    accessStatus.innerHTML = `Pickup Player Marketplace access requires an active SoftballReady.net membership. <a href="membership.html">Activate membership</a>.`;
    results.innerHTML = `<div class="pickup-empty">Activate membership to browse current tournament opportunities.</div>`;
    summary.textContent = "Membership required.";
    return false;
  }

  accessStatus.textContent = "Your membership is active. Current tournament pickup opportunities are unlocked.";
  return true;
}

async function searchMarketplace() {
  if (!accessAllowed) {
    setStatus(formStatus, "An active membership is required before searching.", true);
    return;
  }

  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  setStatus(formStatus, "Searching pickup opportunities...");
  results.innerHTML = `<div class="pickup-empty">Loading tournament needs...</div>`;

  try {
    const fd = new FormData(form);
    const age = String(fd.get("age_division") || "").trim();
    const state = String(fd.get("state") || "").trim().toUpperCase();
    const position = String(fd.get("position") || "").trim().toLowerCase();
    const dateFrom = String(fd.get("date_from") || "").trim();

    const { data, error } = await supabase
      .from("team_needs")
      .select("*,teams(team_name,organization_name,coach_name)")
      .eq("need_type", "pickup_tournament")
      .eq("active", true)
      .order("tournament_start_date", { ascending: true, nullsFirst: false })
      .limit(100);

    if (error) throw error;

    const rows = (data || []).filter((need) => {
      if (age && String(need.age_division || "") !== age) return false;

      const needState = String(need.tournament_state || need.state || "").trim().toUpperCase();
      if (state && needState !== state) return false;

      if (position) {
        const haystack = positionText(need.positions_needed).toLowerCase();
        if (!haystack.includes(position)) return false;
      }

      if (dateFrom) {
        const tournamentDate = String(need.tournament_start_date || "");
        if (!tournamentDate || tournamentDate < dateFrom) return false;
      }
      return true;
    });

    renderCards(rows);
    setStatus(formStatus, "Search complete.");
  } catch (error) {
    setStatus(formStatus, error.message || "The pickup search could not be completed.", true);
    results.innerHTML = `<div class="pickup-error"><strong>Pickup opportunities could not be loaded.</strong><br>${esc(error.message || "Please try again.")}</div>`;
    summary.textContent = "Search unavailable.";
  } finally {
    submit.disabled = false;
  }
}

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    searchMarketplace();
  });
}

if (clearButton) {
  clearButton.addEventListener("click", () => {
    form.reset();
    searchMarketplace();
  });
}

try {
  if (await verifyAccess()) {
    await searchMarketplace();
  }
} catch (error) {
  setStatus(accessStatus, error.message || "The marketplace could not be opened.", true);
  results.innerHTML = `<div class="pickup-error">The marketplace could not be opened. ${esc(error.message || "")}</div>`;
  summary.textContent = "Marketplace unavailable.";
}
