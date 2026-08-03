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
df.addEventListener("submit",async e=>{e.preventDefault();btn.disabled=true;const f=new FormData(df);try{const ses=await getSession();if(!ses)throw Error("Please log in again.");const id=n2n(f.get("player_id"));const row={owner_id:ses.user.id,parent_guardian_name:String(f.get("parent_guardian_name")).trim(),parent_email:String(f.get("parent_email")).trim(),email:String(f.get("parent_email")).trim(),parent_phone:e2n(f.get("parent_phone")),first_name:String(f.get("first_name")).trim(),last_name:String(f.get("last_name")).trim(),age_division:String(f.get("age_division")).trim(),city:String(f.get("city")).trim(),state:String(f.get("state")).trim().toUpperCase(),zip_code:e2n(f.get("zip_code")),primary_position:String(f.get("primary_position")).trim(),secondary_position:e2n(f.get("secondary_position")),birth_year:n2n(f.get("birth_year")),graduation_year:n2n(f.get("graduation_year")),height_text:e2n(f.get("height_text")),bats:e2n(f.get("bats")),throws:e2n(f.get("throws")),jersey_number:e2n(f.get("jersey_number")),current_team:e2n(f.get("current_team")),current_coach:e2n(f.get("current_coach")),gpa:n2n(f.get("gpa")),recruiting_status:e2n(f.get("recruiting_status")),travel_willingness:e2n(f.get("travel_willingness")),max_travel_miles:n2n(f.get("max_travel_miles")),available_immediately:f.get("available_immediately")==="true",looking_for_team:f.get("looking_for_team")==="true",highlight_video_url:e2n(f.get("highlight_video_url")),photo_url:e2n(f.get("photo_url")),coach_notes:e2n(f.get("coach_notes")),bat_speed_mph:n2n(f.get("bat_speed_mph")),exit_velocity_mph:n2n(f.get("exit_velocity_mph")),throwing_velocity_mph:n2n(f.get("throwing_velocity_mph")),pitching_velocity_mph:n2n(f.get("pitching_velocity_mph")),pop_time_seconds:n2n(f.get("pop_time_seconds")),home_to_first_seconds:n2n(f.get("home_to_first_seconds"))};const r=id?await supabase.from("players").update(row).eq("id",id).eq("owner_id",ses.user.id).select("id").single():await supabase.from("players").insert(row).select("id").single();if(r.error)throw r.error;df.elements.player_id.value=r.data.id;setStatus(fs,"Profile changes saved successfully.");setStatus(ps,"Your player profile is current.");}catch(x){setStatus(fs,x.message,true)}finally{btn.disabled=false}});load();}

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
        results.innerHTML = data.map((player) => {
          const completionFields = [
            player.photo_url, player.primary_position, player.graduation_year,
            player.current_team, player.coach_notes, player.highlight_video_url
          ];
          const completion = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);
          return `
            <article class="player-card">
              ${player.photo_url
                ? `<img src="${player.photo_url}" alt="${player.first_name} ${player.last_name}">`
                : `<div style="height:240px;display:grid;place-items:center;background:#f3f5f8;color:#6b7280;font-weight:900">No profile photo</div>`}
              <div class="player-card-body">
                <div class="player-card-badges">
                  <span class="mini-badge">${player.age_division || "Division not entered"}</span>
                  ${player.available_immediately ? `<span class="mini-badge pink">Available Now</span>` : ""}
                  ${player.highlight_video_url ? `<span class="mini-badge pink">Video</span>` : ""}
                </div>
                <h3 class="player-card-name">${player.first_name} ${player.last_name}</h3>
                <p class="player-card-meta"><strong>${player.primary_position || "Position not entered"}</strong>${player.secondary_position ? ` • ${player.secondary_position}` : ""}</p>
                <p class="player-card-meta">${player.city || ""}${player.state ? `, ${player.state}` : ""}${player.graduation_year ? ` • Class of ${player.graduation_year}` : ""}</p>
                <p>${player.coach_notes || "No profile summary has been added yet."}</p>
                <div class="profile-meter">
                  <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Profile strength</span><strong>${completion}%</strong></div>
                  <div class="profile-meter-track"><div style="width:${completion}%"></div></div>
                </div>
                <a class="btn btn-pink" style="margin-top:18px;width:100%" href="player-profile.html?id=${player.id}">View Full Profile</a>
              </div>
            </article>`;
        }).join("");
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

      const allPhotos = photos;
      const completionFields = [
        player.photo_url, player.primary_position, player.graduation_year,
        player.current_team, player.coach_notes, player.skills_summary,
        player.awards_honors, player.tournament_schedule,
        player.highlight_video_url, player.coach_reference_1,
        player.gpa, player.academic_interests
      ];
      const completed = completionFields.filter(Boolean).length;
      const completion = Math.round((completed / completionFields.length) * 100);

      playerProfileView.innerHTML = `
        <section class="profile-hero-card">
          <div>
            ${allPhotos[0]
              ? `<img class="profile-hero-photo" src="${allPhotos[0]}" alt="${player.first_name} ${player.last_name}">`
              : `<div class="profile-hero-photo" style="display:grid;place-items:center;color:#6b7280;font-weight:900">No profile photo</div>`}
          </div>
          <div>
            <div class="eyebrow" style="color:#ff9fc4">Meet the player</div>
            <h1 class="profile-name">${player.first_name} ${player.last_name}</h1>
            <p class="profile-subtitle">
              ${player.graduation_year ? `Class of ${player.graduation_year}` : "Graduation year not entered"}
              • ${player.primary_position || "Position not entered"}
              • ${player.city || ""}${player.state ? `, ${player.state}` : ""}
            </p>
            <div class="badge-row">
              ${player.looking_for_team ? `<span class="profile-badge pink">Looking for Team</span>` : ""}
              ${player.available_immediately ? `<span class="profile-badge">Available Now</span>` : ""}
              ${videos.length ? `<span class="profile-badge soft">Video Available</span>` : ""}
              ${player.recruiting_status ? `<span class="profile-badge soft">${player.recruiting_status}</span>` : ""}
            </div>
            <div style="margin-top:24px">
              <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px">
                <strong>Profile strength</strong><strong>${completion}%</strong>
              </div>
              <div class="profile-progress"><div style="width:${completion}%"></div></div>
            </div>
          </div>
        </section>

        <section class="profile-grid">
          <article class="profile-card">
            <h3>Softball</h3>
            <p><strong>Primary:</strong> ${player.primary_position || "Not entered"}</p>
            <p><strong>Secondary:</strong> ${player.secondary_position || "Not entered"}</p>
            <p><strong>Bats:</strong> ${player.bats || "Not entered"}</p>
            <p><strong>Throws:</strong> ${player.throws || "Not entered"}</p>
            <p><strong>Current team:</strong> ${player.current_team || "Not entered"}</p>
          </article>
          <article class="profile-card">
            <h3>Academics</h3>
            <p><strong>Graduation:</strong> ${player.graduation_year || "Not entered"}</p>
            <p><strong>GPA:</strong> ${player.gpa || "Not entered"}</p>
            <p><strong>Interests:</strong> ${player.academic_interests || "Not entered"}</p>
            <p><strong>Intended major:</strong> ${player.intended_major || "Not entered"}</p>
          </article>
          <article class="profile-card">
            <h3>Opportunity</h3>
            <p><strong>Status:</strong> ${player.looking_for_team ? "Looking for a team" : "Not currently looking"}</p>
            <p><strong>Availability:</strong> ${player.available_immediately ? "Available immediately" : "Not immediate"}</p>
            <p><strong>Travel:</strong> ${player.travel_willingness || "Not entered"}</p>
            <p><strong>Recruiting:</strong> ${player.recruiting_status || "Not entered"}</p>
          </article>
        </section>

        ${allPhotos.length > 1 ? `
          <section class="profile-section">
            <h2>Photo Gallery</h2>
            <div class="profile-gallery">${allPhotos.map((url) => `<img src="${url}" alt="Player photo">`).join("")}</div>
          </section>` : ""}

        ${player.skills_summary ? `<section class="profile-section profile-card"><h2>Skills Summary</h2><p>${player.skills_summary}</p></section>` : ""}
        ${player.coach_notes ? `<section class="profile-section profile-card"><h2>About the Player</h2><p>${player.coach_notes}</p></section>` : ""}
        ${player.awards_honors ? `<section class="profile-section profile-card"><h2>Awards and Honors</h2><p>${player.awards_honors}</p></section>` : ""}
        ${player.tournament_schedule ? `<section class="profile-section profile-card"><h2>Tournament Schedule</h2><p style="white-space:pre-wrap">${player.tournament_schedule}</p></section>` : ""}

        <section class="profile-section">
          <h2>Performance Measurements</h2>
          <div class="profile-grid">
            <article class="profile-card"><div class="profile-stat">${player.exit_velocity_mph ?? "—"}</div><div class="profile-muted">Exit velocity (mph)</div></article>
            <article class="profile-card"><div class="profile-stat">${player.throwing_velocity_mph ?? "—"}</div><div class="profile-muted">Throwing velocity (mph)</div></article>
            <article class="profile-card"><div class="profile-stat">${player.home_to_first_seconds ?? "—"}</div><div class="profile-muted">Home-to-first (sec)</div></article>
          </div>
          <p class="profile-muted"><em>Measurements are family supplied and are not verified by Softball Ready.</em></p>
        </section>

        ${videos.length ? `<section class="profile-section profile-card"><h2>Highlight Videos</h2><div style="display:flex;gap:12px;flex-wrap:wrap">${videos.map((url,index)=>safeLink(url,`Watch Video ${index+1}`)).join("")}</div></section>` : ""}
        ${socials.length ? `<section class="profile-section profile-card"><h2>Social Links</h2><div style="display:flex;gap:12px;flex-wrap:wrap">${socials.map((url,index)=>safeLink(url,`Social Link ${index+1}`)).join("")}</div></section>` : ""}
        ${[player.coach_reference_1,player.coach_reference_2].filter(Boolean).length ? `<section class="profile-section profile-card"><h2>Coach References</h2>${[player.coach_reference_1,player.coach_reference_2].filter(Boolean).map(ref=>`<p>${ref}</p>`).join("")}</section>` : ""}

        <section class="profile-section profile-card">
          <h2>Contact</h2>
          <div class="notice">Private coach-to-family messaging will be added in the messaging build. Family email is never displayed publicly.</div>
        </section>
      `;
    } catch (error) {
      setStatus(accessStatus, error.message || "We could not load this player profile.", true);
      playerProfileView.innerHTML = "<p>This profile is unavailable.</p>";
    }
  }

  loadFullPlayerProfile();
}
