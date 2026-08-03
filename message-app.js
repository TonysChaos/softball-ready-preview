import { supabase } from "./supabase-config.js";

const pageStatus = document.querySelector("[data-messages-page-status]");
const conversationList = document.querySelector("[data-conversation-list]");
const conversationSearch = document.querySelector("[data-conversation-search]");
const threadTitle = document.querySelector("[data-thread-title]");
const threadSubtitle = document.querySelector("[data-thread-subtitle]");
const threadAvatar = document.querySelector("[data-thread-avatar]");
const threadBody = document.querySelector("[data-thread-body]");
const messageForm = document.querySelector("[data-message-form]");
const messageInput = messageForm?.elements.body;
const sendButton = messageForm?.querySelector('button[type="submit"]');
const messageStatus = document.querySelector("[data-message-status]");
const characterCount = document.querySelector("[data-character-count]");
const logoutButton = document.querySelector("[data-message-logout]");
const messagesShell = document.querySelector("[data-messages-shell]");
const mobileBack = document.querySelector("[data-mobile-back]");
const summaryTotal = document.querySelector("[data-summary-total]");
const summaryUnread = document.querySelector("[data-summary-unread]");
const summaryActive = document.querySelector("[data-summary-active]");

let currentUser = null;
let activeConversationId = null;
let conversations = [];
let filteredConversations = [];
let realtimeChannel = null;

function setPageStatus(message, error = false) {
  if (!pageStatus) return;
  pageStatus.textContent = message;
  pageStatus.style.color = error ? "#b42318" : "var(--navy)";
}

function setMessageStatus(message, error = false) {
  if (!messageStatus) return;
  messageStatus.textContent = message;
  messageStatus.style.color = error ? "#b42318" : "var(--navy)";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayDate(value, includeTime = true) {
  if (!value) return "";
  const date = new Date(value);
  return includeTime
    ? date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString();
}

function initials(value) {
  const words = String(value || "Softball Ready").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "SR";
}

async function requireSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) {
    window.location.href = "login.html";
    return null;
  }
  currentUser = data.session.user;
  return data.session;
}

function updateSummary() {
  const unread = conversations.reduce((sum, conversation) => sum + Number(conversation.unread_count || 0), 0);
  if (summaryTotal) summaryTotal.textContent = String(conversations.length);
  if (summaryUnread) summaryUnread.textContent = String(unread);
  if (summaryActive) {
    const active = conversations.find((conversation) => conversation.id === activeConversationId);
    summaryActive.textContent = active ? (active.player_name || "Open") : "—";
  }
}

function filterConversationList() {
  const query = conversationSearch?.value.trim().toLowerCase() || "";
  filteredConversations = query
    ? conversations.filter((conversation) => {
        const haystack = [
          conversation.subject,
          conversation.player_name,
          conversation.last_message
        ].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(query);
      })
    : [...conversations];

  renderConversationList();
}

function renderConversationList() {
  if (!conversationList) return;

  if (!filteredConversations.length) {
    conversationList.innerHTML = `
      <div class="empty-state">
        <div>
          <div class="empty-icon">💬</div>
          <h3 style="color:#17345f">${conversations.length ? "No conversations match" : "No messages yet"}</h3>
          <p>${conversations.length ? "Try a different search." : "Coaches can begin a private conversation from an eligible player profile."}</p>
        </div>
      </div>`;
    updateSummary();
    return;
  }

  conversationList.innerHTML = filteredConversations.map((conversation) => `
    <button type="button"
      class="conversation-item ${conversation.id === activeConversationId ? "active" : ""}"
      data-conversation-id="${conversation.id}">
      <div class="conversation-line">
        <div style="min-width:0;flex:1">
          <div class="conversation-title">${escapeHtml(conversation.subject || "Softball Ready Conversation")}</div>
          <div class="conversation-preview">${escapeHtml(conversation.last_message || "Conversation started")}</div>
        </div>
        ${Number(conversation.unread_count || 0) > 0 ? `<span class="unread-badge">${conversation.unread_count}</span>` : ""}
      </div>
      <div class="conversation-meta">
        <span>${escapeHtml(conversation.player_name || "Private conversation")}</span>
        <span>${displayDate(conversation.last_message_at || conversation.created_at)}</span>
      </div>
    </button>
  `).join("");

  conversationList.querySelectorAll("[data-conversation-id]").forEach((button) => {
    button.addEventListener("click", () => openConversation(button.dataset.conversationId));
  });

  updateSummary();
}

async function loadConversations(preferredConversation = null) {
  const { data, error } = await supabase.rpc("get_my_conversations");
  if (error) throw error;

  conversations = data || [];
  filterConversationList();

  const selected = preferredConversation ||
    activeConversationId ||
    new URLSearchParams(window.location.search).get("conversation");

  if (selected && conversations.some((item) => item.id === selected)) {
    await openConversation(selected);
  } else if (conversations.length && !activeConversationId) {
    await openConversation(conversations[0].id);
  }
}

function subscribeToConversation(conversationId) {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);

  realtimeChannel = supabase
    .channel(`conversation-${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`
      },
      async () => {
        await loadMessages(conversationId);
        await loadConversations(conversationId);
      }
    )
    .subscribe();
}

async function loadMessages(conversationId) {
  const { data, error } = await supabase
    .from("messages")
    .select("id,sender_id,body,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  if (!data.length) {
    threadBody.innerHTML = '<div class="empty-state"><div><div class="empty-icon">💬</div><p>No messages have been sent yet.</p></div></div>';
  } else {
    threadBody.innerHTML = data.map((message) => {
      const mine = message.sender_id === currentUser.id;
      return `
        <div class="message-row ${mine ? "mine" : ""}">
          <div class="message-bubble">
            <span class="message-author">${mine ? "You" : "Other participant"}</span>
            ${escapeHtml(message.body)}
            <span class="message-time">${displayDate(message.created_at)}</span>
          </div>
        </div>`;
    }).join("");
    threadBody.scrollTop = threadBody.scrollHeight;
  }

  await supabase.rpc("mark_conversation_read", { target_conversation_id: conversationId });
}

async function openConversation(conversationId) {
  activeConversationId = conversationId;
  const conversation = conversations.find((item) => item.id === conversationId);

  threadTitle.textContent = conversation?.subject || "Softball Ready Conversation";
  threadSubtitle.textContent = conversation?.player_name
    ? `Private conversation about ${conversation.player_name}`
    : "Private Softball Ready conversation";
  if (threadAvatar) threadAvatar.textContent = initials(conversation?.player_name || conversation?.subject);

  messageInput.disabled = false;
  sendButton.disabled = false;
  setMessageStatus("");
  messagesShell?.classList.add("thread-open");

  filterConversationList();
  await loadMessages(conversationId);
  subscribeToConversation(conversationId);

  const url = new URL(window.location.href);
  url.searchParams.set("conversation", conversationId);
  window.history.replaceState({}, "", url);
}

messageInput?.addEventListener("input", () => {
  if (characterCount) characterCount.textContent = `${messageInput.value.length} / 5000`;
});

conversationSearch?.addEventListener("input", filterConversationList);

mobileBack?.addEventListener("click", () => {
  messagesShell?.classList.remove("thread-open");
});

messageForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activeConversationId) return;

  const body = messageInput.value.trim();
  if (!body) {
    setMessageStatus("Please enter a message.", true);
    return;
  }

  sendButton.disabled = true;
  setMessageStatus("Sending message...");

  try {
    const { error } = await supabase.from("messages").insert({
      conversation_id: activeConversationId,
      sender_id: currentUser.id,
      body
    });
    if (error) throw error;

    messageInput.value = "";
    if (characterCount) characterCount.textContent = "0 / 5000";
    setMessageStatus("Message sent.");
    await loadMessages(activeConversationId);
    await loadConversations(activeConversationId);
  } catch (error) {
    setMessageStatus(error.message || "The message could not be sent.", true);
  } finally {
    sendButton.disabled = false;
    messageInput.focus();
  }
});

logoutButton?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "login.html";
});

window.addEventListener("beforeunload", () => {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
});

(async function initializeMessages() {
  try {
    const session = await requireSession();
    if (!session) return;
    setPageStatus("Your private inbox is ready.");
    await loadConversations();
  } catch (error) {
    setPageStatus(error.message || "Your messages could not be loaded.", true);
  }
})();