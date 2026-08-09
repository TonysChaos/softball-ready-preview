import { supabase } from "./supabase-config.js";

const state = { profiles: [], players: [], teams: [], needs: [], interests: [] };
const statusEl = document.querySelector("[data-owner-status]");
const activityEl = document.querySelector("[data-owner-activity]");
const toastEl = document.querySelector("[data-toast]");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[ch]));
}
function setStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b42318" : "var(--navy)";
}
function toast(message, isError = false) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.toggle("error", isError);
  toastEl.style.display = "block";
  clearTimeout(toastEl._timer);
  toastEl._timer = setTimeout(() => toastEl.style.display = "none", 3300);
}
function setMetric(name, value) {
  const el = document.querySelector(`[data-metric="${name}"]`);
  if (el) el.textContent = Number(value || 0).toLocaleString();
}
function setAlert(name, value) {
  const el = document.querySelector(`[data-alert="${name}"]`);
  if (el) el.textContent = Number(value || 0).toLocaleString();
}
function yesNo(value) { return value ? "Yes" : "No"; }
function badge(text, kind = "") { return `<span class="badge ${kind}">${escapeHtml(text)}</span>`; }
function formatDate(value, withTime = false) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return escapeHtml(value);
  const opts = withTime
    ? { month:"short", day:"numeric", year:"numeric", hour:"numeric", minute:"2-digit" }
    : { month:"short", day:"numeric", year:"numeric" };
  return d.toLocaleString(undefined, opts);
}
function todayIso() { return new Date().toISOString().slice(0,10); }
function searchableText(...values) { return values.filter(Boolean).join(" ").toLowerCase(); }

async function exactCount(table, filter) {
  let q = supabase.from(table).select("*", { count:"exact", head:true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}
async function verifyOwner() {
  const { data:{ session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session) { location.href = "login.html"; return null; }
  const { data:profile, error:pe } = await supabase.from("profiles").select("account_type").eq("id", session.user.id).single();
  if (pe) throw pe;
  if (profile.account_type !== "admin") throw new Error("This page is restricted to the SoftballReady.net owner account.");
  return session;
}

async function loadCounts() {
  const [accounts,players,teams,memberships,pickupNeeds,pickupInterests,seasonNeeds,messages] = await Promise.all([
    exactCount("profiles"),
    exactCount("players"),
    exactCount("teams"),
    exactCount("profiles", q => q.eq("membership_active", true)),
    exactCount("team_needs", q => q.eq("need_type","pickup_tournament").eq("active",true)),
    exactCount("pickup_interests"),
    exactCount("team_needs", q => q.eq("need_type","season_roster").eq("active",true)),
    exactCount("messages")
  ]);
  [["accounts",accounts],["players",players],["teams",teams],["memberships",memberships],["pickupNeeds",pickupNeeds],["pickupInterests",pickupInterests],["seasonNeeds",seasonNeeds],["messages",messages]].forEach(([k,v])=>setMetric(k,v));
}

async function loadData() {
  const [profilesR, playersR, teamsR, needsR, interestsR] = await Promise.all([
    supabase.from("profiles").select("id,full_name,email,account_type,membership_active").order("full_name",{ascending:true}),
    supabase.from("players").select("id,owner_id,first_name,last_name,age_division,primary_position,city,state,searchable_by_coaches,membership_active").order("last_name",{ascending:true}),
    supabase.from("teams").select("id,owner_id,team_name,organization_name,coach_name,age_division,city,state").order("team_name",{ascending:true}),
    supabase.from("team_needs").select("id,owner_id,title,need_type,age_division,positions_needed,city,state,active,tournament_name,tournament_start_date,tournament_end_date,start_date,details,created_at").order("created_at",{ascending:false}),
    supabase.from("pickup_interests").select("id,status,created_at,player_id,team_need_id,players(first_name,last_name,age_division,primary_position),team_needs(title,tournament_name)").order("created_at",{ascending:false})
  ]);
  for (const r of [profilesR,playersR,teamsR,needsR,interestsR]) if (r.error) throw r.error;
  state.profiles = profilesR.data || [];
  state.players = playersR.data || [];
  state.teams = teamsR.data || [];
  state.needs = needsR.data || [];
  state.interests = interestsR.data || [];
}

function renderAccounts(filter="") {
  const tbody = document.querySelector('[data-table="accounts"]');
  const q = filter.trim().toLowerCase();
  const rows = state.profiles.filter(p => !q || searchableText(p.full_name,p.email,p.account_type,p.membership_active?"active":"inactive").includes(q));
  tbody.innerHTML = rows.length ? rows.map(p => `<tr>
    <td><strong>${escapeHtml(p.full_name || "Unnamed account")}</strong></td>
    <td>${escapeHtml(p.email || "—")}</td>
    <td>${badge(p.account_type || "parent", p.account_type==="admin"?"pink":"gray")}</td>
    <td>${p.membership_active ? badge("Active","green") : badge("Inactive","gray")}</td>
    <td><div class="actions">
      <button class="owner-btn ${p.membership_active?"warn":"primary"}" data-membership-toggle="${escapeHtml(p.id)}" data-current="${p.membership_active?"1":"0"}">${p.membership_active?"Deactivate":"Activate"}</button>
    </div></td>
  </tr>`).join("") : `<tr><td colspan="5" class="empty">No accounts match that search.</td></tr>`;
}

function renderPlayers(filter="") {
  const tbody = document.querySelector('[data-table="players"]');
  const q = filter.trim().toLowerCase();
  const rows = state.players.filter(p => !q || searchableText(p.first_name,p.last_name,p.age_division,p.primary_position,p.city,p.state).includes(q));
  tbody.innerHTML = rows.length ? rows.map(p => `<tr>
    <td><strong>${escapeHtml([p.first_name,p.last_name].filter(Boolean).join(" ") || "Unnamed player")}</strong></td>
    <td>${escapeHtml(p.age_division || "—")}</td>
    <td>${escapeHtml(p.primary_position || "—")}</td>
    <td>${escapeHtml([p.city,p.state].filter(Boolean).join(", ") || "—")}</td>
    <td>${p.searchable_by_coaches ? badge("Yes","green") : badge("No","gray")}</td>
    <td><a class="owner-btn light" href="player-profile.html?id=${encodeURIComponent(p.id)}">Open Profile</a></td>
  </tr>`).join("") : `<tr><td colspan="6" class="empty">No players match that search.</td></tr>`;
}

function renderTeams(filter="") {
  const tbody = document.querySelector('[data-table="teams"]');
  const q = filter.trim().toLowerCase();
  const rows = state.teams.filter(t => !q || searchableText(t.team_name,t.coach_name,t.organization_name,t.age_division,t.city,t.state).includes(q));
  tbody.innerHTML = rows.length ? rows.map(t => `<tr>
    <td><strong>${escapeHtml(t.team_name || "Unnamed team")}</strong></td>
    <td>${escapeHtml(t.coach_name || "—")}</td>
    <td>${escapeHtml(t.age_division || "—")}</td>
    <td>${escapeHtml([t.city,t.state].filter(Boolean).join(", ") || "—")}</td>
    <td>${escapeHtml(t.organization_name || "—")}</td>
  </tr>`).join("") : `<tr><td colspan="5" class="empty">No teams match that search.</td></tr>`;
}

function renderNeeds(filter="") {
  const tbody = document.querySelector('[data-table="needs"]');
  const q = filter.trim().toLowerCase();
  const rows = state.needs.filter(n => !q || searchableText(n.title,n.need_type,n.age_division,Array.isArray(n.positions_needed)?n.positions_needed.join(" "):n.positions_needed,n.city,n.state,n.tournament_name).includes(q));
  tbody.innerHTML = rows.length ? rows.map(n => {
    const type = n.need_type === "pickup_tournament" ? "Pickup" : "Season";
    const name = n.tournament_name || n.title || (Array.isArray(n.positions_needed) ? n.positions_needed.join(", ") : n.positions_needed) || "Team need";
    const date = n.tournament_start_date || n.start_date;
    const expired = n.need_type==="pickup_tournament" && n.active && date && date < todayIso();
    return `<tr>
      <td>${badge(type, n.need_type==="pickup_tournament"?"pink":"gray")}</td>
      <td><strong>${escapeHtml(name)}</strong><br><span class="metric-note">${escapeHtml(Array.isArray(n.positions_needed) ? n.positions_needed.join(", ") : (n.positions_needed || ""))}</span></td>
      <td>${escapeHtml(n.age_division || "—")}</td>
      <td>${escapeHtml([n.city,n.state].filter(Boolean).join(", ") || "—")}<br><span class="metric-note">${formatDate(date)}</span></td>
      <td>${n.active ? badge(expired?"Active • Past Date":"Active", expired?"gold":"green") : badge("Closed","gray")}</td>
      <td><button class="owner-btn ${n.active?"warn":"primary"}" data-need-toggle="${escapeHtml(n.id)}" data-current="${n.active?"1":"0"}">${n.active?"Close Listing":"Reopen"}</button></td>
    </tr>`;
  }).join("") : `<tr><td colspan="6" class="empty">No team needs match that search.</td></tr>`;
}

function renderInterests(filter="") {
  const tbody = document.querySelector('[data-table="interests"]');
  const q = filter.trim().toLowerCase();
  const rows = state.interests.filter(i => {
    const p = Array.isArray(i.players)?i.players[0]:i.players;
    const n = Array.isArray(i.team_needs)?i.team_needs[0]:i.team_needs;
    return !q || searchableText(p?.first_name,p?.last_name,p?.age_division,p?.primary_position,n?.title,n?.tournament_name,i.status).includes(q);
  });
  tbody.innerHTML = rows.length ? rows.map(i => {
    const p = Array.isArray(i.players)?i.players[0]:i.players;
    const n = Array.isArray(i.team_needs)?i.team_needs[0]:i.team_needs;
    const player = [p?.first_name,p?.last_name].filter(Boolean).join(" ") || "Player";
    const opp = n?.tournament_name || n?.title || "Pickup opportunity";
    return `<tr>
      <td><strong>${escapeHtml(player)}</strong><br><span class="metric-note">${escapeHtml([p?.age_division,p?.primary_position].filter(Boolean).join(" • "))}</span></td>
      <td>${escapeHtml(opp)}</td>
      <td>${formatDate(i.created_at,true)}</td>
      <td>${badge(i.status || "new", i.status==="new"?"pink":i.status==="reviewed"?"gold":"gray")}</td>
      <td><div class="actions">
        <button class="owner-btn light" data-interest-status="${escapeHtml(i.id)}" data-status="new">New</button>
        <button class="owner-btn primary" data-interest-status="${escapeHtml(i.id)}" data-status="reviewed">Reviewed</button>
        <button class="owner-btn warn" data-interest-status="${escapeHtml(i.id)}" data-status="closed">Closed</button>
      </div></td>
    </tr>`;
  }).join("") : `<tr><td colspan="5" class="empty">No pickup interests match that search.</td></tr>`;
}

function renderActivity() {
  const recent = state.interests.slice(0,8);
  activityEl.innerHTML = recent.length ? recent.map(i => {
    const p = Array.isArray(i.players)?i.players[0]:i.players;
    const n = Array.isArray(i.team_needs)?i.team_needs[0]:i.team_needs;
    return `<article class="activity-item"><strong>${escapeHtml([p?.first_name,p?.last_name].filter(Boolean).join(" ") || "Player")} → ${escapeHtml(n?.tournament_name || n?.title || "Pickup opportunity")}</strong><span>${escapeHtml([p?.age_division,p?.primary_position].filter(Boolean).join(" • ") || "Player")} • ${escapeHtml(i.status || "new")} • ${formatDate(i.created_at,true)}</span></article>`;
  }).join("") : "<p>No pickup interest activity yet.</p>";
}

function renderAlerts() {
  const expiredPickup = state.needs.filter(n => n.need_type==="pickup_tournament" && n.active && (n.tournament_start_date || n.start_date) && (n.tournament_start_date || n.start_date) < todayIso()).length;
  const newInterests = state.interests.filter(i => (i.status || "new")==="new").length;
  const nonMembers = state.profiles.filter(p => !p.membership_active).length;
  setAlert("expiredPickup",expiredPickup); setAlert("newInterests",newInterests); setAlert("nonMembers",nonMembers);
}

function renderAll() {
  renderAccounts(document.querySelector('[data-search="accounts"]')?.value || "");
  renderPlayers(document.querySelector('[data-search="players"]')?.value || "");
  renderTeams(document.querySelector('[data-search="teams"]')?.value || "");
  renderNeeds(document.querySelector('[data-search="needs"]')?.value || "");
  renderInterests(document.querySelector('[data-search="interests"]')?.value || "");
  renderActivity(); renderAlerts();
}

async function reloadDashboard(message) {
  await Promise.all([loadCounts(),loadData()]);
  renderAll();
  if (message) toast(message);
}

document.addEventListener("click", async e => {
  const tab = e.target.closest("[data-owner-tab]");
  if (tab) {
    document.querySelectorAll("[data-owner-tab]").forEach(x=>x.classList.toggle("active",x===tab));
    document.querySelectorAll("[data-owner-section]").forEach(x=>x.classList.toggle("active",x.dataset.ownerSection===tab.dataset.ownerTab));
    return;
  }

  const membership = e.target.closest("[data-membership-toggle]");
  if (membership) {
    const next = membership.dataset.current !== "1";
    const verb = next ? "activate" : "deactivate";
    if (!confirm(`Are you sure you want to ${verb} membership access for this account?`)) return;
    membership.disabled = true;
    const { error } = await supabase.from("profiles").update({membership_active:next}).eq("id",membership.dataset.membershipToggle);
    membership.disabled = false;
    if (error) return toast(error.message,true);
    await reloadDashboard(`Membership ${next?"activated":"deactivated"}.`);
    return;
  }

  const need = e.target.closest("[data-need-toggle]");
  if (need) {
    const next = need.dataset.current !== "1";
    if (!confirm(next ? "Reopen this team need?" : "Close this team need? It will disappear from active opportunity results.")) return;
    need.disabled = true;
    const { error } = await supabase.from("team_needs").update({active:next}).eq("id",need.dataset.needToggle);
    need.disabled = false;
    if (error) return toast(error.message,true);
    await reloadDashboard(next?"Listing reopened.":"Listing closed.");
    return;
  }

  const interest = e.target.closest("[data-interest-status]");
  if (interest) {
    const status = interest.dataset.status;
    const { error } = await supabase.from("pickup_interests").update({status}).eq("id",interest.dataset.interestStatus);
    if (error) return toast(error.message,true);
    await reloadDashboard(`Pickup interest marked ${status}.`);
  }
});

document.querySelectorAll("[data-search]").forEach(input => input.addEventListener("input", () => {
  const type = input.dataset.search;
  if (type==="accounts") renderAccounts(input.value);
  if (type==="players") renderPlayers(input.value);
  if (type==="teams") renderTeams(input.value);
  if (type==="needs") renderNeeds(input.value);
  if (type==="interests") renderInterests(input.value);
}));

document.querySelector("[data-owner-logout]")?.addEventListener("click", async () => {
  await supabase.auth.signOut(); location.href="login.html";
});

(async function init() {
  try {
    const session = await verifyOwner();
    if (!session) return;
    await Promise.all([loadCounts(),loadData()]);
    renderAll();
    setStatus("Owner access verified. Dashboard v2 is live.");
  } catch (error) {
    setStatus(error.message || "Owner Dashboard could not be loaded.", true);
    toast(error.message || "Dashboard load failed.", true);
  }
})();
