import { supabase } from "./supabase-config.js";

const statusEl = document.querySelector("[data-owner-status]");
const activityEl = document.querySelector("[data-owner-activity]");

function setStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b42318" : "var(--navy)";
}

function setMetric(name, value) {
  const el = document.querySelector(`[data-metric="${name}"]`);
  if (el) el.textContent = Number(value || 0).toLocaleString();
}

async function exactCount(table, applyFilters) {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (typeof applyFilters === "function") query = applyFilters(query);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

async function verifyOwner() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const session = sessionData.session;
  if (!session) {
    window.location.href = "login.html";
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", session.user.id)
    .single();

  if (profileError) throw profileError;
  if (profile.account_type !== "admin") {
    throw new Error("This page is restricted to the SoftballReady.net owner account.");
  }
  return session;
}

async function loadMetrics() {
  const [
    accounts,
    players,
    teams,
    memberships,
    pickupNeeds,
    pickupInterests,
    seasonNeeds,
    messages
  ] = await Promise.all([
    exactCount("profiles"),
    exactCount("players"),
    exactCount("teams"),
    exactCount("profiles", q => q.eq("membership_active", true)),
    exactCount("team_needs", q => q.eq("need_type", "pickup_tournament").eq("active", true)),
    exactCount("pickup_interests"),
    exactCount("team_needs", q => q.eq("need_type", "season_roster").eq("active", true)),
    exactCount("messages")
  ]);

  setMetric("accounts", accounts);
  setMetric("players", players);
  setMetric("teams", teams);
  setMetric("memberships", memberships);
  setMetric("pickupNeeds", pickupNeeds);
  setMetric("pickupInterests", pickupInterests);
  setMetric("seasonNeeds", seasonNeeds);
  setMetric("messages", messages);
}

async function loadRecentActivity() {
  const { data, error } = await supabase
    .from("pickup_interests")
    .select("id,status,created_at,team_needs(title,tournament_name),players(first_name,last_name,age_division,primary_position)")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) throw error;

  if (!data?.length) {
    activityEl.innerHTML = "<p>No pickup interest activity yet.</p>";
    return;
  }

  activityEl.innerHTML = data.map(item => {
    const player = Array.isArray(item.players) ? item.players[0] : item.players;
    const need = Array.isArray(item.team_needs) ? item.team_needs[0] : item.team_needs;
    const playerName = [player?.first_name, player?.last_name].filter(Boolean).join(" ") || "Player";
    const playerInfo = [player?.age_division, player?.primary_position].filter(Boolean).join(" • ");
    const opportunity = need?.tournament_name || need?.title || "Pickup opportunity";

    return `<article class="activity-item">
      <strong>${playerName} → ${opportunity}</strong>
      <span>${playerInfo || "Player details unavailable"} • ${item.status || "new"} • ${formatDate(item.created_at)}</span>
    </article>`;
  }).join("");
}

document.querySelector("[data-owner-logout]")?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "login.html";
});

(async function initOwnerDashboard() {
  try {
    const session = await verifyOwner();
    if (!session) return;
    await Promise.all([loadMetrics(), loadRecentActivity()]);
    setStatus("Owner access verified. Dashboard data is live.");
  } catch (error) {
    setStatus(error.message || "Owner Dashboard could not be loaded.", true);
    document.querySelectorAll(".metric-value").forEach(el => el.textContent = "—");
    if (activityEl) activityEl.innerHTML = "<p>Owner data is unavailable until admin access is configured.</p>";
  }
})();
