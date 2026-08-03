import { supabase } from "./supabase-config.js";
function setStatus(el,msg,err=false){if(!el)return;el.textContent=msg;el.style.color=err?"#b42318":"var(--navy)";}
async function getSession(){const {data,error}=await supabase.auth.getSession();if(error)throw error;return data.session;}
const e2n=v=>{const t=String(v??"").trim();return t===""?null:t}; const n2n=v=>{const t=String(v??"").trim();return t===""?null:Number(t)};
const sf=document.querySelector("#signup-form");if(sf)sf.addEventListener("submit",async e=>{e.preventDefault();const s=sf.querySelector("[data-form-status]"),b=sf.querySelector('button[type="submit"]'),f=new FormData(sf);b.disabled=true;try{const {error}=await supabase.auth.signUp({email:String(f.get("email")).trim(),password:String(f.get("password")),options:{data:{full_name:String(f.get("full_name")).trim()},emailRedirectTo:`${location.origin}/login.html`}});if(error)throw error;sf.reset();setStatus(s,"Account created. Check your email, confirm your account, then return here to log in.");}catch(x){setStatus(s,x.message,true)}finally{b.disabled=false}});
const lf=document.querySelector("#login-form");if(lf)lf.addEventListener("submit",async e=>{e.preventDefault();const s=lf.querySelector("[data-form-status]"),b=lf.querySelector('button[type="submit"]'),f=new FormData(lf);b.disabled=true;try{const {error}=await supabase.auth.signInWithPassword({email:String(f.get("email")).trim(),password:String(f.get("password"))});if(error)throw error;location.href="player-dashboard.html";}catch(x){setStatus(s,"The email or password is incorrect. Use Forgot Your Password below if needed.",true)}finally{b.disabled=false}});
const ff=document.querySelector("#forgot-password-form");if(ff)ff.addEventListener("submit",async e=>{e.preventDefault();const s=ff.querySelector("[data-form-status]"),f=new FormData(ff);try{const {error}=await supabase.auth.resetPasswordForEmail(String(f.get("email")).trim(),{redirectTo:`${location.origin}/reset-password.html`});if(error)throw error;setStatus(s,"Check your email. Tap the reset link to choose a new password.");}catch(x){setStatus(s,x.message,true)}});
const rf=document.querySelector("#reset-password-form");if(rf)rf.addEventListener("submit",async e=>{e.preventDefault();const s=rf.querySelector("[data-form-status]"),f=new FormData(rf),p=String(f.get("password")),c=String(f.get("confirm_password"));if(p.length<8)return setStatus(s,"Your password must be at least eight characters.",true);if(p!==c)return setStatus(s,"The two passwords do not match.",true);try{const {error}=await supabase.auth.updateUser({password:p});if(error)throw error;setStatus(s,"Password updated. Returning to Log In...");setTimeout(()=>location.href="login.html",800)}catch(x){setStatus(s,x.message,true)}});
document.querySelectorAll("[data-logout]").forEach(b=>b.addEventListener("click",async()=>{await supabase.auth.signOut();location.href="login.html"}));
const pf=document.querySelector("#create-profile");if(pf)pf.addEventListener("submit",async e=>{e.preventDefault();const s=pf.querySelector("[data-form-status]"),f=new FormData(pf);try{const ses=await getSession();if(!ses)throw Error("Please log in first.");const row={owner_id:ses.user.id,parent_guardian_name:String(f.get("parent_guardian_name")).trim(),parent_email:String(f.get("parent_email")).trim(),email:String(f.get("parent_email")).trim(),first_name:String(f.get("first_name")).trim(),last_name:String(f.get("last_name")).trim(),age_division:String(f.get("age_division")).trim(),primary_position:String(f.get("primary_position")).trim(),secondary_position:e2n(f.get("secondary_position")),city:String(f.get("city")).trim(),state:String(f.get("state")).trim().toUpperCase(),coach_notes:e2n(f.get("coach_notes")),looking_for_team:true,searchable_by_coaches:false,membership_active:false};const {data:old,error:oe}=await supabase.from("players").select("id").eq("owner_id",ses.user.id).limit(1).maybeSingle();if(oe)throw oe;const r=old?await supabase.from("players").update(row).eq("id",old.id):await supabase.from("players").insert(row);if(r.error)throw r.error;setStatus(s,old?"Player profile updated successfully.":"Player profile saved successfully.");setTimeout(()=>location.href="player-dashboard.html",600)}catch(x){setStatus(s,x.message,true)}});
const df=document.querySelector("#player-dashboard-form");if(df){const ps=document.querySelector("[data-dashboard-status]"),fs=df.querySelector("[data-form-status]"),btn=df.querySelector('button[type="submit"]');
async function load(){try{const ses=await getSession();if(!ses)return location.href="login.html";const {data:p,error}=await supabase.from("players").select("*").eq("owner_id",ses.user.id).limit(1).maybeSingle();if(error)throw error;if(!p){df.elements.parent_email.value=ses.user.email||"";return setStatus(ps,"No profile exists yet. Complete the required fields and save.");}df.elements.player_id.value=p.id;for(const [k,v] of Object.entries(p)){const el=df.elements[k];if(!el)continue;el.value=typeof v==="boolean"?String(v):(v??"");}setStatus(ps,"Your saved profile is loaded. Update anything and click Save Profile Changes.");}catch(x){setStatus(ps,x.message,true)}}
df.addEventListener("submit",async e=>{e.preventDefault();btn.disabled=true;const f=new FormData(df);try{const ses=await getSession();if(!ses)throw Error("Please log in again.");const id=n2n(f.get("player_id"));const row={owner_id:ses.user.id,parent_guardian_name:String(f.get("parent_guardian_name")).trim(),parent_email:String(f.get("parent_email")).trim(),email:String(f.get("parent_email")).trim(),parent_phone:e2n(f.get("parent_phone")),first_name:String(f.get("first_name")).trim(),last_name:String(f.get("last_name")).trim(),age_division:String(f.get("age_division")).trim(),city:String(f.get("city")).trim(),state:String(f.get("state")).trim().toUpperCase(),zip_code:e2n(f.get("zip_code")),primary_position:String(f.get("primary_position")).trim(),secondary_position:e2n(f.get("secondary_position")),birth_year:n2n(f.get("birth_year")),graduation_year:n2n(f.get("graduation_year")),height_text:e2n(f.get("height_text")),bats:e2n(f.get("bats")),throws:e2n(f.get("throws")),jersey_number:e2n(f.get("jersey_number")),current_team:e2n(f.get("current_team")),current_coach:e2n(f.get("current_coach")),gpa:n2n(f.get("gpa")),recruiting_status:e2n(f.get("recruiting_status")),travel_willingness:e2n(f.get("travel_willingness")),max_travel_miles:n2n(f.get("max_travel_miles")),available_immediately:f.get("available_immediately")==="true",looking_for_team:f.get("looking_for_team")==="true",highlight_video_url:e2n(f.get("highlight_video_url")),photo_url:e2n(f.get("photo_url")),coach_notes:e2n(f.get("coach_notes")),bat_speed_mph:n2n(f.get("bat_speed_mph")),exit_velocity_mph:n2n(f.get("exit_velocity_mph")),throwing_velocity_mph:n2n(f.get("throwing_velocity_mph")),pitching_velocity_mph:n2n(f.get("pitching_velocity_mph")),pop_time_seconds:n2n(f.get("pop_time_seconds")),home_to_first_seconds:n2n(f.get("home_to_first_seconds")),
academic_interests:e2n(f.get("academic_interests")),
intended_major:e2n(f.get("intended_major")),
awards_honors:e2n(f.get("awards_honors")),
skills_summary:e2n(f.get("skills_summary")),
tournament_schedule:e2n(f.get("tournament_schedule")),
social_link_1:e2n(f.get("social_link_1")),
social_link_2:e2n(f.get("social_link_2")),
coach_reference_1:e2n(f.get("coach_reference_1")),
coach_reference_2:e2n(f.get("coach_reference_2")),
photo_url_2:e2n(f.get("photo_url_2")),
photo_url_3:e2n(f.get("photo_url_3")),
photo_url_4:e2n(f.get("photo_url_4")),
photo_url_5:e2n(f.get("photo_url_5")),
highlight_video_url_2:e2n(f.get("highlight_video_url_2")),
highlight_video_url_3:e2n(f.get("highlight_video_url_3")),
highlight_video_url_4:e2n(f.get("highlight_video_url_4")),
highlight_video_url_5:e2n(f.get("highlight_video_url_5"))};const r=id?await supabase.from("players").update(row).eq("id",id).eq("owner_id",ses.user.id).select("id").single():await supabase.from("players").insert(row).select("id").single();if(r.error)throw r.error;df.elements.player_id.value=r.data.id;setStatus(fs,"Profile changes saved successfully.");setStatus(ps,"Your player profile is current.");}catch(x){setStatus(fs,x.message,true)}finally{btn.disabled=false}});load();}

function textOrNull(value) {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
}

async function ensureCoachProfile(session) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();
  if (error) throw error;

  if (profile.account_type !== "coach" && profile.account_type !== "admin") {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ account_type: "coach" })
      .eq("id", session.user.id);
    if (updateError) throw updateError;
    profile.account_type = "coach";
  }
  return profile;
}

const coachProfileForm = document.querySelector("#coach-profile-form");
if (coachProfileForm) {
  const pageStatus = document.querySelector("[data-coach-status]");
  const formStatus = coachProfileForm.querySelector("[data-form-status]");
  const needsForm = document.querySelector("#team-need-form");
  const needsList = document.querySelector("[data-team-needs-list]");

  let currentSession = null;
  let currentTeam = null;

  async function loadNeeds() {
    if (!currentSession || !needsList) return;
    const { data, error } = await supabase
      .from("team_needs")
      .select("*")
      .eq("owner_id", currentSession.user.id)
      .order("created_at", { ascending: false });
    if (error) {
      needsList.innerHTML = `<p>${error.message}</p>`;
      return;
    }
    if (!data.length) {
      needsList.innerHTML = "<p>No roster openings have been posted yet.</p>";
      return;
    }
    needsList.innerHTML = data.map((need) => `
      <article class="listing-card">
        <span class="badge">${need.age_division || "Division not entered"} • ${need.active ? "Active" : "Inactive"}</span>
        <h3>${need.title}</h3>
        <p>${need.details || "No additional details."}</p>
        <div class="listing-meta">${(need.positions_needed || []).join(", ") || "Positions not entered"}</div>
      </article>
    `).join("");
  }

  async function loadCoachDashboard() {
    try {
      currentSession = await getSession();
      if (!currentSession) {
        window.location.href = "login.html";
        return;
      }
      const profile = await ensureCoachProfile(currentSession);

      const { data: team, error } = await supabase
        .from("teams")
        .select("*")
        .eq("owner_id", currentSession.user.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;

      if (team) {
        currentTeam = team;
        coachProfileForm.elements.team_id.value = team.id;
        for (const name of ["coach_name","email","coach_phone","team_name","organization_name","age_division","team_level","city","state","zip_code","travel_schedule","website_url","description"]) {
          if (coachProfileForm.elements[name]) coachProfileForm.elements[name].value = team[name] ?? "";
        }
        setStatus(pageStatus, profile.membership_active
          ? "Your coach account and team profile are ready. Player Search is unlocked."
          : "Your team profile is loaded. Player Search will unlock after membership activation.");
      } else {
        coachProfileForm.elements.email.value = currentSession.user.email || "";
        setStatus(pageStatus, "Create your team profile. Player Search will unlock after membership activation.");
      }
      await loadNeeds();
    } catch (error) {
      setStatus(pageStatus, error.message || "We could not load the coach dashboard.", true);
    }
  }

  coachProfileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = coachProfileForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(formStatus, "Saving team profile...");
    try {
      if (!currentSession) currentSession = await getSession();
      if (!currentSession) throw new Error("Please log in again.");
      await ensureCoachProfile(currentSession);
      const form = new FormData(coachProfileForm);
      const team = {
        owner_id: currentSession.user.id,
        coach_name: String(form.get("coach_name") || "").trim(),
        email: String(form.get("email") || "").trim(),
        coach_phone: textOrNull(form.get("coach_phone")),
        team_name: String(form.get("team_name") || "").trim(),
        organization_name: textOrNull(form.get("organization_name")),
        age_division: String(form.get("age_division") || "").trim(),
        team_level: textOrNull(form.get("team_level")),
        city: String(form.get("city") || "").trim(),
        state: String(form.get("state") || "").trim().toUpperCase(),
        zip_code: textOrNull(form.get("zip_code")),
        travel_schedule: textOrNull(form.get("travel_schedule")),
        website_url: textOrNull(form.get("website_url")),
        description: textOrNull(form.get("description")),
        active: true
      };

      let response;
      if (currentTeam?.id) {
        response = await supabase.from("teams").update(team).eq("id", currentTeam.id).eq("owner_id", currentSession.user.id).select("*").single();
      } else {
        response = await supabase.from("teams").insert(team).select("*").single();
      }
      if (response.error) throw response.error;
      currentTeam = response.data;
      coachProfileForm.elements.team_id.value = currentTeam.id;
      setStatus(formStatus, "Team profile saved successfully.");
    } catch (error) {
      setStatus(formStatus, error.message || "We could not save the team profile.", true);
    } finally {
      button.disabled = false;
    }
  });

  needsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = needsForm.querySelector('button[type="submit"]');
    const status = needsForm.querySelector("[data-form-status]");
    button.disabled = true;
    setStatus(status, "Saving roster need...");
    try {
      if (!currentSession) currentSession = await getSession();
      if (!currentTeam?.id) throw new Error("Save the Team Profile first.");
      const form = new FormData(needsForm);
      const positions = String(form.get("positions_needed_text") || "")
        .split(",").map((value) => value.trim()).filter(Boolean);
      const need = {
        team_id: currentTeam.id,
        owner_id: currentSession.user.id,
        title: String(form.get("title") || "").trim(),
        age_division: textOrNull(form.get("age_division")) || currentTeam.age_division,
        positions_needed: positions,
        city: currentTeam.city,
        state: currentTeam.state,
        start_date: textOrNull(form.get("start_date")),
        details: textOrNull(form.get("details")),
        active: form.get("active") === "true"
      };
      const { error } = await supabase.from("team_needs").insert(need);
      if (error) throw error;
      needsForm.reset();
      setStatus(status, "Roster need saved successfully.");
      await loadNeeds();
    } catch (error) {
      setStatus(status, error.message || "We could not save the roster need.", true);
    } finally {
      button.disabled = false;
    }
  });

  loadCoachDashboard();
}

const playerSearchForm = document.querySelector("#player-search-form");
if (playerSearchForm) {
  const accessStatus = document.querySelector("[data-search-access-status]");
  const formStatus = playerSearchForm.querySelector("[data-form-status]");
  const results = document.querySelector("[data-player-search-results]");
  let accessAllowed = false;

  async function checkSearchAccess() {
    try {
      const session = await getSession();
      if (!session) {
        window.location.href = "login.html";
        return;
      }
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("account_type,membership_active")
        .eq("id", session.user.id)
        .single();
      if (error) throw error;

      accessAllowed = ["coach", "admin"].includes(profile.account_type) && profile.membership_active === true;
      if (accessAllowed) {
        setStatus(accessStatus, "Player Search is unlocked for this coach account.");
      } else {
        setStatus(accessStatus, "Player Search is locked until this account is a coach account with an active membership.", true);
        playerSearchForm.querySelector('button[type="submit"]').disabled = true;
      }
    } catch (error) {
      setStatus(accessStatus, error.message || "We could not verify search access.", true);
    }
  }

  playerSearchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!accessAllowed) return;
    const button = playerSearchForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(formStatus, "Searching eligible profiles...");
    try {
      const form = new FormData(playerSearchForm);
      let query = supabase
        .from("players")
        .select("id,first_name,last_name,age_division,state,city,primary_position,secondary_position,graduation_year,current_team,available_immediately,coach_notes,photo_url,bats,throws,gpa,highlight_video_url,recruiting_status")
        .eq("looking_for_team", true)
        .eq("searchable_by_coaches", true)
        .eq("membership_active", true)
        .order("updated_at", { ascending: false })
        .limit(50);

      const age = textOrNull(form.get("age_division"));
      const state = textOrNull(form.get("state"));
      const position = textOrNull(form.get("primary_position"));
      const city = textOrNull(form.get("city"));
      const grad = textOrNull(form.get("graduation_year"));
      const bats = textOrNull(form.get("bats"));
      const throwsHand = textOrNull(form.get("throws"));
      const minimumGpa = textOrNull(form.get("minimum_gpa"));
      const hasVideo = textOrNull(form.get("has_video"));
      const available = textOrNull(form.get("available_immediately"));

      if (age) query = query.eq("age_division", age);
      if (state) query = query.eq("state", state.toUpperCase());
      if (position) query = query.ilike("primary_position", `%${position}%`);
      if (city) query = query.ilike("city", `%${city}%`);
      if (grad) query = query.eq("graduation_year", Number(grad));
      if (bats) query = query.eq("bats", bats);
      if (throwsHand) query = query.eq("throws", throwsHand);
      if (minimumGpa) query = query.gte("gpa", Number(minimumGpa));
      if (hasVideo === "true") query = query.not("highlight_video_url", "is", null);
      if (hasVideo === "false") query = query.is("highlight_video_url", null);
      if (available) query = query.eq("available_immediately", available === "true");

      const { data, error } = await query;
      if (error) throw error;

      if (!data.length) {
        results.innerHTML = "<p>No eligible player profiles matched those filters.</p>";
      } else {
        results.innerHTML = data.map((player) => `
          <article class="listing-card">
            ${player.photo_url ? `<img src="${player.photo_url}" alt="Player profile" style="width:100%;height:210px;object-fit:cover;border-radius:14px;margin-bottom:14px">` : ""}
            <span class="badge">${player.age_division || "Division not entered"} • ${player.state || "State not entered"}</span>
            <h3>${player.first_name} ${player.last_name}</h3>
            <p><strong>${player.primary_position || "Position not entered"}</strong>${player.secondary_position ? ` • ${player.secondary_position}` : ""}</p>
            <p>${player.city || ""}${player.graduation_year ? ` • Class of ${player.graduation_year}` : ""}</p>
            <p>${player.bats ? `Bats ${player.bats}` : ""}${player.throws ? ` • Throws ${player.throws}` : ""}${player.gpa ? ` • GPA ${player.gpa}` : ""}</p>
            <p>${player.coach_notes || "No additional profile summary."}</p>
            <div class="listing-meta">${player.available_immediately ? "Available immediately" : "Availability not immediate"}${player.highlight_video_url ? " • Video available" : ""}</div>
            <a class="btn btn-outline" style="margin-top:14px" href="player-profile.html?id=${player.id}">View Full Profile</a>
          </article>
        `).join("");
      }
      setStatus(formStatus, `${data.length} eligible profile${data.length === 1 ? "" : "s"} found.`);
    } catch (error) {
      setStatus(formStatus, error.message || "The search could not be completed.", true);
      results.innerHTML = "<p>Search unavailable.</p>";
    } finally {
      button.disabled = false;
    }
  });

  checkSearchAccess();
}

const playerProfileView = document.querySelector("[data-player-profile-view]");
if (playerProfileView) {
  const accessStatus = document.querySelector("[data-profile-access-status]");
  const nameHeading = document.querySelector("[data-profile-name]");
  const summary = document.querySelector("[data-profile-summary]");

  const safeLink = (url, label) => url
    ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
    : "";

  const section = (title, content) => content
    ? `<section style="margin-top:26px"><h2 style="color:var(--navy)">${title}</h2>${content}</section>`
    : "";

  async function loadFullPlayerProfile() {
    try {
      const session = await getSession();
      if (!session) {
        window.location.href = "login.html";
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("account_type,membership_active")
        .eq("id", session.user.id)
        .single();
      if (profileError) throw profileError;

      if (!["coach","admin"].includes(profile.account_type) || !profile.membership_active) {
        throw new Error("A coach membership is required to view complete player profiles.");
      }

      const id = new URLSearchParams(window.location.search).get("id");
      if (!id) throw new Error("No player profile was selected.");

      const { data: player, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;

      nameHeading.textContent = `${player.first_name} ${player.last_name}`;
      summary.textContent = `${player.age_division || ""} ${player.primary_position || ""} • ${player.city || ""}, ${player.state || ""}`;
      setStatus(accessStatus, "Complete eligible player profile loaded.");

      const photos = [player.photo_url, player.photo_url_2, player.photo_url_3, player.photo_url_4, player.photo_url_5].filter(Boolean);
      const videos = [player.highlight_video_url, player.highlight_video_url_2, player.highlight_video_url_3, player.highlight_video_url_4, player.highlight_video_url_5].filter(Boolean);
      const socials = [player.social_link_1, player.social_link_2].filter(Boolean);

      playerProfileView.innerHTML = `
        ${photos.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px">${photos.map((url) => `<img src="${url}" alt="Player" style="width:100%;height:230px;object-fit:cover;border-radius:14px">`).join("")}</div>` : ""}
        ${section("Player Information", `
          <div class="listing-grid">
            <article class="listing-card"><h3>Softball</h3><p>Primary: ${player.primary_position || "Not entered"}</p><p>Secondary: ${player.secondary_position || "Not entered"}</p><p>Bats: ${player.bats || "Not entered"} • Throws: ${player.throws || "Not entered"}</p><p>Current team: ${player.current_team || "Not entered"}</p></article>
            <article class="listing-card"><h3>Academics</h3><p>Graduation year: ${player.graduation_year || "Not entered"}</p><p>GPA: ${player.gpa || "Not entered"}</p><p>Academic interests: ${player.academic_interests || "Not entered"}</p><p>Intended major: ${player.intended_major || "Not entered"}</p></article>
            <article class="listing-card"><h3>Status</h3><p>${player.looking_for_team ? "Looking for a team" : "Not currently looking"}</p><p>${player.available_immediately ? "Available immediately" : "Not immediately available"}</p><p>${player.recruiting_status || "Recruiting status not entered"}</p><p>Travel: ${player.travel_willingness || "Not entered"}</p></article>
          </div>
        `)}
        ${section("Skills Summary", player.skills_summary ? `<p>${player.skills_summary}</p>` : "")}
        ${section("Experience, Strengths, and Goals", player.coach_notes ? `<p>${player.coach_notes}</p>` : "")}
        ${section("Awards and Honors", player.awards_honors ? `<p>${player.awards_honors}</p>` : "")}
        ${section("Tournament Schedule", player.tournament_schedule ? `<p style="white-space:pre-wrap">${player.tournament_schedule}</p>` : "")}
        ${section("Performance Measurements", `
          <div class="listing-grid">
            <article class="listing-card"><h3>Hitting</h3><p>Bat speed: ${player.bat_speed_mph ?? "Not entered"} mph</p><p>Exit velocity: ${player.exit_velocity_mph ?? "Not entered"} mph</p></article>
            <article class="listing-card"><h3>Throwing</h3><p>Throwing velocity: ${player.throwing_velocity_mph ?? "Not entered"} mph</p><p>Pitching velocity: ${player.pitching_velocity_mph ?? "Not entered"} mph</p></article>
            <article class="listing-card"><h3>Timing</h3><p>Pop time: ${player.pop_time_seconds ?? "Not entered"} sec</p><p>Home to first: ${player.home_to_first_seconds ?? "Not entered"} sec</p></article>
          </div>
          <p><em>Measurements are family supplied and are not verified by Softball Ready.</em></p>
        `)}
        ${section("Videos", videos.length ? `<div style="display:flex;gap:12px;flex-wrap:wrap">${videos.map((url, index) => safeLink(url, `Watch Video ${index + 1}`)).join("")}</div>` : "")}
        ${section("Social Links", socials.length ? `<div style="display:flex;gap:12px;flex-wrap:wrap">${socials.map((url, index) => safeLink(url, `Social Link ${index + 1}`)).join("")}</div>` : "")}
        ${section("Coach References", [player.coach_reference_1, player.coach_reference_2].filter(Boolean).map((ref) => `<p>${ref}</p>`).join(""))}
        <section style="margin-top:30px">
          <h2 style="color:var(--navy)">Contact</h2>
          <div class="notice">Private coach-to-family messaging will be added in the messaging build. Family email is not displayed publicly.</div>
        </section>
      `;
    } catch (error) {
      setStatus(accessStatus, error.message || "We could not load this player profile.", true);
      playerProfileView.innerHTML = "<p>This profile is unavailable.</p>";
    }
  }

  loadFullPlayerProfile();
}
