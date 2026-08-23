import { supabase } from "./supabase-config.js";

const CATEGORIES = [
  "All Discussions",
  "General Softball",
  "Teams & Tryouts",
  "Tournaments",
  "Pickup Players",
  "Recruiting",
  "Coaching",
  "Parents",
  "Equipment"
];

const $ = s => document.querySelector(s);
const els = {
  menu:$("[data-menu]"), nav:$("[data-nav]"), account:$("[data-account-link]"),
  categories:$("[data-categories]"), gate:$("[data-gate]"), member:$("[data-member-status]"),
  toolbar:$("[data-toolbar]"), heading:$("[data-list-heading]"), newTopic:$("[data-new-topic]"),
  list:$("[data-topic-list]"), view:$("[data-topic-view]"), form:$("[data-topic-form]"),
  cancel:$("[data-cancel-topic]"), status:$("[data-topic-status]"),
  name:$("#display-name"), category:$("#category"), title:$("#topic-title"), body:$("#topic-body")
};

let session = null;
let memberActive = false;
let selectedCategory = "All Discussions";
let selectedTopic = null;
let channel = null;

const esc = (v="") => String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const fmt = v => v ? new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(v)) : "";

function notice(el,msg,error=false){
  el.textContent=msg||"";
  el.className=error?"notice error":"notice success";
}

function renderCategories(){
  els.categories.innerHTML=CATEGORIES.map(c=>`<button type="button" class="category-btn ${c===selectedCategory?"active":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  els.category.innerHTML=CATEGORIES.filter(c=>c!=="All Discussions").map(c=>`<option>${esc(c)}</option>`).join("");
  els.categories.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{
    selectedCategory=b.dataset.cat;
    selectedTopic=null;
    renderCategories();
    showList();
    loadTopics();
  });
}

async function loadAuth(){
  const {data,error}=await supabase.auth.getSession();
  if(error) throw error;
  session=data.session;

  if(!session){
    memberActive=false;
    els.gate.hidden=false;
    els.member.hidden=true;
    return;
  }

  const {data:isMember,error:memberError}=await supabase.rpc("community_is_member");
  if(memberError) throw memberError;
  memberActive=isMember===true;

  const fullName=session.user.user_metadata?.full_name || "";
  if(fullName && !els.name.value) els.name.value=fullName;

  els.account.textContent="My Account";
  els.account.href="player-dashboard.html";

  els.gate.hidden=memberActive;
  els.member.hidden=!memberActive;
  if(memberActive) els.member.textContent="Membership active — you can read discussions, start topics, and reply.";
}

function requireMember(){
  if(!session){ location.href="login.html"; return false; }
  if(!memberActive){
    els.gate.hidden=false;
    els.gate.scrollIntoView({behavior:"smooth",block:"center"});
    return false;
  }
  return true;
}

async function loadTopics(){
  els.heading.textContent=selectedCategory==="All Discussions"?"Recent Discussions":selectedCategory;
  els.list.innerHTML=`<div class="empty">Loading Community topics…</div>`;

  const {data,error}=await supabase.rpc("community_list_topics",{
    p_category:selectedCategory==="All Discussions"?null:selectedCategory
  });

  if(error){
    els.list.innerHTML=`<div class="empty">Community could not be loaded. ${esc(error.message)}</div>`;
    return;
  }
  if(!data?.length){
    els.list.innerHTML=`<div class="empty">No discussions here yet. Be the first to start one.</div>`;
    return;
  }

  els.list.innerHTML=data.map(t=>`
    <article class="topic-row" data-topic="${t.id}" tabindex="0" role="button">
      <div>
        <h3 class="topic-title">${t.is_locked?"🔒 ":""}${esc(t.title)}</h3>
        <div class="topic-meta">
          <span>${esc(t.category)}</span>
          <span>Started by ${esc(t.display_name||"Softball Ready Member")}</span>
          <span>Latest ${fmt(t.last_activity_at||t.created_at)}</span>
        </div>
      </div>
      <div class="topic-count">${Number(t.reply_count||0)}<small>${Number(t.reply_count||0)===1?"reply":"replies"}</small></div>
    </article>`).join("");

  els.list.querySelectorAll("[data-topic]").forEach(row=>{
    const open=()=>openTopic(Number(row.dataset.topic));
    row.onclick=open;
    row.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open();}};
  });
}

function showList(){
  selectedTopic=null;
  els.toolbar.hidden=false;
  els.list.hidden=false;
  els.view.hidden=true;
  els.form.hidden=true;
}

async function openTopic(id){
  if(!requireMember()) return;
  selectedTopic=id;
  els.toolbar.hidden=true;
  els.list.hidden=true;
  els.form.hidden=true;
  els.view.hidden=false;
  els.view.innerHTML=`<div class="empty">Loading discussion…</div>`;

  const [{data:topic,error:te},{data:replies,error:re}]=await Promise.all([
    supabase.rpc("community_get_topic",{p_topic_id:id}),
    supabase.rpc("community_get_replies",{p_topic_id:id})
  ]);

  if(te||re){
    els.view.innerHTML=`<button class="back-btn" data-back>← Back to discussions</button><div class="empty">${esc((te||re).message)}</div>`;
    els.view.querySelector("[data-back]").onclick=showList;
    return;
  }

  const t=topic?.[0];
  if(!t){ showList(); await loadTopics(); return; }

  els.view.innerHTML=`
    <button class="back-btn" type="button" data-back>← Back to discussions</button>
    <div class="topic-meta"><span>${esc(t.category)}</span><span>Started ${fmt(t.created_at)}</span></div>
    <h2>${esc(t.title)}</h2>
    <article class="post">
      <div class="post-head"><span class="author">${esc(t.display_name||"Softball Ready Member")}</span> • ${fmt(t.created_at)}</div>
      <div class="post-body">${esc(t.body)}</div>
    </article>
    <div data-replies>
      ${(replies||[]).map(r=>`<article class="post"><div class="post-head"><span class="author">${esc(r.display_name||"Softball Ready Member")}</span> • ${fmt(r.created_at)}</div><div class="post-body">${esc(r.body)}</div></article>`).join("")}
    </div>
    ${t.is_locked?`<div class="gate" style="margin-top:18px"><h3>Discussion locked</h3><p>Replies are closed for this topic.</p></div>`:`
      <form class="form-panel" data-reply-form style="box-shadow:none">
        <h3>Reply to this discussion</h3>
        <label for="reply-name">Display name</label>
        <input id="reply-name" maxlength="50" required value="${esc(els.name.value||session.user.user_metadata?.full_name||"")}">
        <label for="reply-body">Your reply</label>
        <textarea id="reply-body" maxlength="5000" required placeholder="Add to the conversation."></textarea>
        <div class="form-actions"><button class="btn btn-pink" type="submit">Post Reply</button></div>
        <div class="notice" data-reply-status></div>
      </form>`}
  `;

  els.view.querySelector("[data-back]").onclick=async()=>{showList();await loadTopics();};
  const rf=els.view.querySelector("[data-reply-form]");
  if(rf) rf.onsubmit=async e=>{
    e.preventDefault();
    if(!requireMember()) return;
    const btn=rf.querySelector('button[type="submit"]');
    const stat=rf.querySelector("[data-reply-status]");
    const name=rf.querySelector("#reply-name").value.trim();
    const body=rf.querySelector("#reply-body").value.trim();
    btn.disabled=true; notice(stat,"Posting reply…");
    const {error}=await supabase.rpc("community_add_reply",{p_topic_id:id,p_display_name:name,p_body:body});
    btn.disabled=false;
    if(error){notice(stat,error.message,true);return;}
    await openTopic(id);
  };
}

els.newTopic.onclick=()=>{
  if(!requireMember()) return;
  els.toolbar.hidden=true; els.list.hidden=true; els.view.hidden=true; els.form.hidden=false;
  els.form.scrollIntoView({behavior:"smooth",block:"start"});
};
els.cancel.onclick=()=>{els.form.reset();notice(els.status,"");showList();};

els.form.onsubmit=async e=>{
  e.preventDefault();
  if(!requireMember()) return;
  const btn=els.form.querySelector('button[type="submit"]');
  btn.disabled=true; notice(els.status,"Posting topic…");
  const {data,error}=await supabase.rpc("community_create_topic",{
    p_display_name:els.name.value.trim(),
    p_category:els.category.value,
    p_title:els.title.value.trim(),
    p_body:els.body.value.trim()
  });
  btn.disabled=false;
  if(error){notice(els.status,error.message,true);return;}
  const id=Number(data);
  els.form.reset(); notice(els.status,"");
  await openTopic(id);
};

function startRealtime(){
  if(channel) supabase.removeChannel(channel);
  channel=supabase.channel("softball-ready-community-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"community_topics"},()=>selectedTopic?openTopic(selectedTopic):loadTopics())
    .on("postgres_changes",{event:"*",schema:"public",table:"community_replies"},payload=>{
      if(selectedTopic && Number(payload.new?.topic_id||payload.old?.topic_id)===selectedTopic) openTopic(selectedTopic);
      else if(!selectedTopic) loadTopics();
    }).subscribe();
}

els.menu.onclick=()=>els.nav.classList.toggle("open");

(async()=>{
  renderCategories();
  try{
    await loadAuth();
    await loadTopics();
    startRealtime();
  }catch(error){
    console.error(error);
    els.list.innerHTML=`<div class="empty">Community could not be loaded. ${esc(error.message)}</div>`;
  }
})();
