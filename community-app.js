import { supabase } from "./supabase-config.js";

const CATEGORIES = [
  "All Topics",
  "General Travel Softball",
  "Parents Corner",
  "Coaches Corner",
  "Teams & Tryouts",
  "Pickup Players",
  "Tournaments",
  "Training & Development",
  "College Recruiting"
];

const els = {
  categories: document.querySelector("[data-categories]"),
  topicList: document.querySelector("[data-topic-list]"),
  topicView: document.querySelector("[data-topic-view]"),
  newTopic: document.querySelector("[data-new-topic]"),
  topicForm: document.querySelector("[data-topic-form]"),
  cancelTopic: document.querySelector("[data-cancel-topic]"),
  gate: document.querySelector("[data-gate]"),
  memberStatus: document.querySelector("[data-member-status]"),
  listHeading: document.querySelector("[data-list-heading]"),
  accountLink: document.querySelector("[data-account-link]"),
  formStatus: document.querySelector("[data-topic-form-status]"),
  categorySelect: document.querySelector("#category")
};

let session = null;
let profile = null;
let isMember = false;
let activeCategory = "All Topics";
let selectedTopicId = null;

function escapeText(value) {
  return String(value ?? "");
}

function fmtDate(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function renderCategories() {
  els.categories.innerHTML = "";
  els.categorySelect.innerHTML = "";
  CATEGORIES.forEach((category, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-btn" + (category === activeCategory ? " active" : "");
    btn.textContent = category;
    btn.addEventListener("click", () => {
      activeCategory = category;
      selectedTopicId = null;
      els.topicView.hidden = true;
      els.topicList.hidden = false;
      els.topicForm.hidden = true;
      renderCategories();
      loadTopicPreviews();
    });
    els.categories.appendChild(btn);

    if (index > 0) {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      els.categorySelect.appendChild(option);
    }
  });
}

async function loadAuth() {
  const { data } = await supabase.auth.getSession();
  session = data?.session || null;

  if (!session) {
    isMember = false;
    els.gate.hidden = false;
    els.newTopic.disabled = true;
    els.newTopic.title = "Membership required";
    return;
  }

  const { data: p } = await supabase
    .from("profiles")
    .select("account_type,membership_active")
    .eq("id", session.user.id)
    .maybeSingle();

  profile = p || {};
  const role = String(profile.account_type || "").toLowerCase();
  isMember = profile.membership_active === true || role === "admin";

  if (els.accountLink) {
    els.accountLink.textContent = role === "admin" ? "Owner Dashboard" : "Dashboard";
    els.accountLink.href = role === "admin" ? "owner-dashboard.html" : role === "coach" ? "coach-dashboard.html" : "player-dashboard.html";
  }

  if (isMember) {
    els.gate.hidden = true;
    els.memberStatus.hidden = false;
    els.memberStatus.textContent = "Membership active — you can open discussions, start topics, and reply.";
    els.newTopic.disabled = false;
  } else {
    els.gate.hidden = false;
    els.newTopic.disabled = true;
    els.newTopic.title = "Active membership required";
  }
}

async function loadTopicPreviews() {
  els.listHeading.textContent = activeCategory === "All Topics" ? "Recent Discussions" : activeCategory;
  els.topicList.innerHTML = '<div class="empty">Loading Community topics…</div>';

  let query = supabase
    .from("community_topic_previews")
    .select("id,title,category,created_at,reply_count")
    .order("created_at", { ascending: false })
    .limit(100);

  if (activeCategory !== "All Topics") query = query.eq("category", activeCategory);

  const { data, error } = await query;
  if (error) {
    els.topicList.innerHTML = '<div class="empty">Community setup is not finished yet. Run the included community SQL in Supabase, then refresh this page.</div>';
    return;
  }

  if (!data?.length) {
    els.topicList.innerHTML = '<div class="empty">No topics here yet. The first member conversation can start here.</div>';
    return;
  }

  els.topicList.innerHTML = "";
  data.forEach(topic => {
    const row = document.createElement("article");
    row.className = "topic-row";
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute("aria-label", `Open topic: ${topic.title}`);

    const left = document.createElement("div");
    const title = document.createElement("div");
    title.className = "topic-title";
    title.textContent = topic.title;
    const meta = document.createElement("div");
    meta.className = "topic-meta";
    const cat = document.createElement("span");
    cat.textContent = topic.category;
    const date = document.createElement("span");
    date.textContent = fmtDate(topic.created_at);
    meta.append(cat, date);
    left.append(title, meta);

    const count = document.createElement("div");
    count.className = "topic-count";
    count.textContent = String(topic.reply_count || 0);
    const small = document.createElement("small");
    small.textContent = Number(topic.reply_count || 0) === 1 ? "reply" : "replies";
    count.appendChild(small);

    row.append(left, count);
    const open = () => openTopic(topic.id);
    row.addEventListener("click", open);
    row.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    els.topicList.appendChild(row);
  });
}

async function openTopic(topicId) {
  if (!isMember) {
    els.gate.hidden = false;
    els.gate.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  selectedTopicId = topicId;
  els.topicList.hidden = true;
  els.topicForm.hidden = true;
  els.topicView.hidden = false;
  els.topicView.innerHTML = '<div class="empty">Opening discussion…</div>';

  const [{ data: topic, error: topicError }, { data: replies, error: replyError }] = await Promise.all([
    supabase.from("community_topics").select("id,title,category,body,display_name,created_at,is_locked").eq("id", topicId).single(),
    supabase.from("community_replies").select("id,body,display_name,created_at").eq("topic_id", topicId).order("created_at", { ascending: true })
  ]);

  if (topicError || replyError || !topic) {
    els.topicView.innerHTML = '<div class="empty">This discussion could not be opened.</div>';
    return;
  }

  els.topicView.innerHTML = "";

  const back = document.createElement("button");
  back.type = "button";
  back.className = "back-btn";
  back.textContent = "← Back to Community topics";
  back.addEventListener("click", () => {
    selectedTopicId = null;
    els.topicView.hidden = true;
    els.topicList.hidden = false;
    loadTopicPreviews();
  });

  const h2 = document.createElement("h2");
  h2.textContent = topic.title;
  const meta = document.createElement("div");
  meta.className = "topic-meta";
  meta.textContent = `${topic.category} • ${fmtDate(topic.created_at)}`;

  const original = document.createElement("article");
  original.className = "post";
  const originalHead = document.createElement("div");
  originalHead.className = "post-head";
  const author = document.createElement("span");
  author.className = "author";
  author.textContent = topic.display_name || "SoftballReady Member";
  originalHead.append(author);
  const originalBody = document.createElement("div");
  originalBody.className = "post-body";
  originalBody.textContent = topic.body;
  original.append(originalHead, originalBody);

  els.topicView.append(back, h2, meta, original);

  (replies || []).forEach(reply => {
    const post = document.createElement("article");
    post.className = "post";
    const head = document.createElement("div");
    head.className = "post-head";
    const name = document.createElement("span");
    name.className = "author";
    name.textContent = reply.display_name || "SoftballReady Member";
    const when = document.createTextNode(` • ${fmtDate(reply.created_at)}`);
    head.append(name, when);
    const body = document.createElement("div");
    body.className = "post-body";
    body.textContent = reply.body;
    post.append(head, body);
    els.topicView.appendChild(post);
  });

  if (!topic.is_locked) {
    const replyForm = document.createElement("form");
    replyForm.className = "form-panel";
    replyForm.style.boxShadow = "none";
    replyForm.style.border = "0";
    replyForm.style.padding = "22px 0 0";
    const heading = document.createElement("h3");
    heading.textContent = "Reply to this discussion";
    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Display name";
    const nameInput = document.createElement("input");
    nameInput.maxLength = 50;
    nameInput.required = true;
    nameInput.placeholder = "How you want your name shown";
    const bodyLabel = document.createElement("label");
    bodyLabel.textContent = "Your reply";
    const bodyInput = document.createElement("textarea");
    bodyInput.maxLength = 5000;
    bodyInput.required = true;
    bodyInput.placeholder = "Add to the conversation";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn btn-pink";
    submit.textContent = "Post Reply";
    const status = document.createElement("div");
    status.className = "notice";

    replyForm.append(heading, nameLabel, nameInput, bodyLabel, bodyInput, submit, status);
    replyForm.addEventListener("submit", async e => {
      e.preventDefault();
      submit.disabled = true;
      status.className = "notice";
      status.textContent = "Posting reply…";
      const { error } = await supabase.from("community_replies").insert({
        topic_id: topic.id,
        author_id: session.user.id,
        display_name: nameInput.value.trim(),
        body: bodyInput.value.trim()
      });
      if (error) {
        status.className = "notice error";
        status.textContent = error.message;
        submit.disabled = false;
        return;
      }
      status.className = "notice success";
      status.textContent = "Reply posted.";
      await openTopic(topic.id);
    });
    els.topicView.appendChild(replyForm);
  }
}

els.newTopic.addEventListener("click", () => {
  if (!isMember) return;
  els.topicList.hidden = true;
  els.topicView.hidden = true;
  els.topicForm.hidden = false;
});

els.cancelTopic.addEventListener("click", () => {
  els.topicForm.reset();
  els.topicForm.hidden = true;
  els.topicList.hidden = false;
});

els.topicForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (!isMember || !session) return;

  const displayName = document.querySelector("#display-name").value.trim();
  const category = document.querySelector("#category").value;
  const title = document.querySelector("#topic-title").value.trim();
  const body = document.querySelector("#topic-body").value.trim();

  els.formStatus.className = "notice";
  els.formStatus.textContent = "Posting topic…";

  const { data, error } = await supabase
    .from("community_topics")
    .insert({ author_id: session.user.id, display_name: displayName, category, title, body })
    .select("id")
    .single();

  if (error) {
    els.formStatus.className = "notice error";
    els.formStatus.textContent = error.message;
    return;
  }

  els.formStatus.className = "notice success";
  els.formStatus.textContent = "Topic posted.";
  els.topicForm.reset();
  await openTopic(data.id);
});

document.querySelector(".menu")?.addEventListener("click", () => {
  document.querySelector(".nav-links")?.classList.toggle("open");
});

renderCategories();
await loadAuth();
await loadTopicPreviews();

supabase
  .channel("softballready-community-live")
  .on("postgres_changes", { event: "*", schema: "public", table: "community_topics" }, () => {
    if (!selectedTopicId) loadTopicPreviews();
  })
  .on("postgres_changes", { event: "*", schema: "public", table: "community_replies" }, payload => {
    if (selectedTopicId && Number(payload.new?.topic_id || payload.old?.topic_id) === Number(selectedTopicId)) {
      openTopic(selectedTopicId);
    } else if (!selectedTopicId) {
      loadTopicPreviews();
    }
  })
  .subscribe();
