import { supabase } from "./supabase-config.js";

const $ = (selector, root = document) => root.querySelector(selector);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[c]));
const clean = (value) => {
  const v = String(value ?? "").trim();
  return v || null;
};
const todayIso = () => new Date().toISOString().slice(0, 10);
const prettyDate = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric"}) : "";
const prettyTime = (value) => {
  if (!value) return "";
  const [h,m] = value.slice(0,5).split(":").map(Number);
  const d = new Date();
  d.setHours(h,m,0,0);
  return d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});
};
const setText = (el, text, error=false) => {
  if (!el) return;
  el.textContent = text;
  el.style.color = error ? "#b42318" : "var(--navy)";
};

async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function getMyProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("account_type,membership_active")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function isTryoutMember(profile) {
  return profile?.membership_active === true || profile?.account_type === "admin";
}

const searchForm = $("#tryout-search-form");
if (searchForm) {
  const results = $("[data-tryout-results]");
  const status = $("[data-tryout-search-status]");
  const access = $("[data-tryout-access-status]");
  const memberLock = $("[data-tryout-member-lock]");
  const loginLink = $("[data-tryout-login-link]");
  let allowed = false;

  function renderTryouts(rows) {
    if (!rows.length) {
      results.innerHTML = `<div class="tryout-empty"><h3>No upcoming tryouts matched those filters.</h3><p>Try a different date, division, state, or organization.</p></div>`;
      return;
    }
    results.innerHTML = rows.map(row => {
      const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
      const teamName = team?.team_name || "Travel softball team";
      const organization = team?.organization_name || row.organization_name || "";
      const where = [row.location_name, row.city, row.state].filter(Boolean).join(" • ");
      const times = [prettyTime(row.start_time), prettyTime(row.end_time)].filter(Boolean).join(" – ");
      return `<article class="tryout-card">
        <div class="eyebrow">${esc(row.age_division || "Tryout")}</div>
        <h3>${esc(row.title)}</h3>
        <p><strong>${esc(teamName)}</strong>${organization && organization !== teamName ? ` • ${esc(organization)}` : ""}</p>
        <div class="tryout-meta">
          <span class="tryout-pill">${esc(prettyDate(row.tryout_date))}</span>
          ${times ? `<span class="tryout-pill">${esc(times)}</span>` : ""}
          ${row.city || row.state ? `<span class="tryout-pill">${esc([row.city,row.state].filter(Boolean).join(", "))}</span>` : ""}
        </div>
        ${where ? `<p><strong>Location:</strong> ${esc(where)}</p>` : ""}
        ${row.address ? `<p><strong>Address:</strong> ${esc(row.address)}</p>` : ""}
        ${row.details ? `<p>${esc(row.details)}</p>` : ""}
        <div class="tryout-actions">
          ${row.registration_url ? `<a class="btn btn-pink" href="${esc(row.registration_url)}" target="_blank" rel="noopener">Registration / Details</a>` : ""}
          ${row.contact_email ? `<a class="btn btn-outline" href="mailto:${esc(row.contact_email)}">Contact Team</a>` : ""}
        </div>
      </article>`;
    }).join("");
  }

  async function searchTryouts() {
    if (!allowed) {
      memberLock.hidden = false;
      results.innerHTML = "";
      setText(status, "An active membership is required to view tryout listings.", true);
      return;
    }
    setText(status, "Searching upcoming tryouts...");
    results.innerHTML = `<div class="tryout-empty">Loading tryouts...</div>`;
    try {
      const fd = new FormData(searchForm);
      let query = supabase
        .from("tryouts")
        .select("id,title,age_division,tryout_date,start_time,end_time,city,state,location_name,address,details,registration_url,contact_email,organization_name,teams(team_name,organization_name)")
        .eq("active", true)
        .gte("tryout_date", todayIso())
        .order("tryout_date", { ascending: true })
        .limit(100);

      const state = clean(fd.get("state"));
      const age = clean(fd.get("age_division"));
      const date = clean(fd.get("tryout_date"));
      const org = clean(fd.get("organization"));

      if (state) query = query.ilike("state", state.length === 2 ? state.toUpperCase() : `%${state}%`);
      if (age) query = query.eq("age_division", age);
      if (date) query = query.eq("tryout_date", date);

      const { data, error } = await query;
      if (error) throw error;

      let rows = data || [];
      if (org) {
        const needle = org.toLowerCase();
        rows = rows.filter(row => {
          const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
          return [row.organization_name, team?.organization_name, team?.team_name]
            .filter(Boolean).some(v => String(v).toLowerCase().includes(needle));
        });
      }

      renderTryouts(rows);
      setText(status, `${rows.length} upcoming tryout${rows.length === 1 ? "" : "s"} found.`);
    } catch (error) {
      results.innerHTML = "";
      setText(status, error.message || "We could not load tryouts.", true);
    }
  }

  searchForm.addEventListener("submit", async e => {
    e.preventDefault();
    await searchTryouts();
  });

  (async () => {
    try {
      const session = await getSession();
      if (!session) {
        access.textContent = "Log in with an active membership to search the Tryout Directory.";
        memberLock.hidden = false;
        searchForm.querySelector("button[type=submit]").disabled = true;
        return;
      }
      if (loginLink) {
        loginLink.textContent = "Dashboard";
        loginLink.href = "player-dashboard.html";
      }
      const profile = await getMyProfile(session.user.id);
      allowed = isTryoutMember(profile);
      if (!allowed) {
        access.textContent = "Your account is signed in, but an active membership is required for tryout access.";
        memberLock.hidden = false;
        searchForm.querySelector("button[type=submit]").disabled = true;
        return;
      }
      access.textContent = "Membership verified. Search upcoming team tryouts below.";
      memberLock.hidden = true;
      await searchTryouts();
    } catch (error) {
      setText(access, error.message || "We could not verify tryout access.", true);
    }
  })();
}

const postForm = $("#tryout-post-form");
if (postForm) {
  const postStatus = $("[data-tryout-form-status]");
  const list = $("[data-coach-tryout-list]");
  let session = null;
  let team = null;
  let coachProfile = null;

  function renderCoachTryouts(rows) {
    if (!list) return;
    if (!rows.length) {
      list.innerHTML = "<p>No upcoming tryouts posted yet.</p>";
      return;
    }
    list.innerHTML = rows.map(row => `<article class="listing-card">
      <span class="badge">${esc(row.age_division)}</span>
      <h3>${esc(row.title)}</h3>
      <p><strong>${esc(prettyDate(row.tryout_date))}</strong>${row.start_time ? ` • ${esc(prettyTime(row.start_time))}` : ""}</p>
      <p>${esc([row.city,row.state].filter(Boolean).join(", "))}${row.location_name ? ` • ${esc(row.location_name)}` : ""}</p>
      <button class="btn btn-outline" type="button" data-close-tryout="${esc(row.id)}">Close Tryout</button>
    </article>`).join("");

    list.querySelectorAll("[data-close-tryout]").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Close this tryout listing?")) return;
        btn.disabled = true;
        try {
          const { error } = await supabase
            .from("tryouts")
            .update({ active:false })
            .eq("id", btn.dataset.closeTryout)
            .eq("owner_id", session.user.id);
          if (error) throw error;
          await loadCoachTryouts();
        } catch (error) {
          alert(error.message || "Could not close this tryout.");
          btn.disabled = false;
        }
      });
    });
  }

  async function loadCoachTryouts() {
    if (!session || !list) return;
    const { data, error } = await supabase
      .from("tryouts")
      .select("id,title,age_division,tryout_date,start_time,city,state,location_name,active")
      .eq("owner_id", session.user.id)
      .eq("active", true)
      .gte("tryout_date", todayIso())
      .order("tryout_date", { ascending:true });
    if (error) {
      list.innerHTML = `<p>${esc(error.message)}</p>`;
      return;
    }
    renderCoachTryouts(data || []);
  }

  postForm.addEventListener("submit", async e => {
    e.preventDefault();
    const button = postForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setText(postStatus, "Posting tryout...");
    try {
      if (!session) throw new Error("Please log in first.");
      if (!team?.id) throw new Error("Save your team profile before posting a tryout.");
      const canPost = coachProfile?.membership_active === true || coachProfile?.account_type === "admin";
      if (!canPost) throw new Error("An active Softball Ready membership is required to publish a tryout.");

      const fd = new FormData(postForm);
      const tryoutDate = clean(fd.get("tryout_date"));
      if (tryoutDate < todayIso()) throw new Error("Tryout date cannot be in the past.");

      const row = {
        owner_id: session.user.id,
        team_id: team.id,
        title: clean(fd.get("title")),
        organization_name: clean(team.organization_name),
        age_division: clean(fd.get("age_division")) || team.age_division,
        tryout_date: tryoutDate,
        start_time: clean(fd.get("start_time")),
        end_time: clean(fd.get("end_time")),
        city: clean(fd.get("city")),
        state: clean(fd.get("state"))?.toUpperCase(),
        location_name: clean(fd.get("location_name")),
        address: clean(fd.get("address")),
        registration_url: clean(fd.get("registration_url")),
        contact_email: clean(fd.get("contact_email")) || clean(team.email),
        details: clean(fd.get("details")),
        active: true
      };

      const { error } = await supabase.from("tryouts").insert(row);
      if (error) throw error;
      postForm.reset();
      if (team.age_division) postForm.elements.age_division.value = team.age_division;
      if (team.city) postForm.elements.city.value = team.city;
      if (team.state) postForm.elements.state.value = team.state;
      if (team.email) postForm.elements.contact_email.value = team.email;
      setText(postStatus, "Tryout posted successfully.");
      await loadCoachTryouts();
    } catch (error) {
      setText(postStatus, error.message || "We could not post the tryout.", true);
    } finally {
      button.disabled = false;
    }
  });

  (async () => {
    try {
      session = await getSession();
      if (!session) {
        setText(postStatus, "Log in to post a tryout.", true);
        postForm.querySelector('button[type="submit"]').disabled = true;
        return;
      }
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("membership_active,account_type")
        .eq("id", session.user.id)
        .single();
      if (profileError) throw profileError;
      coachProfile = profileData;

      const { data, error } = await supabase
        .from("teams")
        .select("id,team_name,organization_name,age_division,city,state,email")
        .eq("owner_id", session.user.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      team = data;
      if (!team) {
        setText(postStatus, "Save your team profile above before posting a tryout.", true);
        return;
      }
      const canPost = coachProfile?.membership_active === true || coachProfile?.account_type === "admin";
      if (!canPost) {
        setText(postStatus, "Team profile saved. Activate membership to publish tryouts.", true);
        postForm.querySelector('button[type="submit"]').disabled = true;
      }
      if (team.age_division) postForm.elements.age_division.value = team.age_division;
      if (team.city) postForm.elements.city.value = team.city;
      if (team.state) postForm.elements.state.value = team.state;
      if (team.email) postForm.elements.contact_email.value = team.email;
      await loadCoachTryouts();
    } catch (error) {
      setText(postStatus, error.message || "We could not load your tryout tools.", true);
    }
  })();
}
