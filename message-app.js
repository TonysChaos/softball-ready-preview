import { supabase } from "./supabase-config.js";

const pageStatus = document.querySelector("[data-messages-page-status]");
const conversationList = document.querySelector("[data-conversation-list]");
const threadTitle = document.querySelector("[data-thread-title]");
const threadSubtitle = document.querySelector("[data-thread-subtitle]");
const threadBody = document.querySelector("[data-thread-body]");
const messageForm = document.querySelector("[data-message-form]");
const messageInput = messageForm?.elements.body;
const sendButton = messageForm?.querySelector('button[type="submit"]');
const messageStatus = document.querySelector("[data-message-status]");
const logoutButton = document.querySelector("[data-message-logout]");

let currentUser = null;
let activeConversationId = null;
let conversations = [];
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

function renderConversationList() {
  if (!conversationList) return;

  if (!conversations.length) {
    conversationList.innerHTML = `
      <div class="empty-state">
        <div>
          <h3 style="color:#17345f">No messages yet</h3>
          <p>Coaches can begin a private conversation from an eligible player profile.</p>
        </div>
      </div>`;
    return;
  }

  conversationList.innerHTML = conversations.map((conversation) => `
    <button type="button"
      class="conversation-item ${conversation.id === activeConversationId ? "active" : ""}"
      data-conversation-id="${conversation.id}">
      <div class="conversation-title">${escapeHtml(conversation.subject || "Softball Ready Conversation")}</div>
      <div class="conversation-preview">${escapeHtml(conversation.last_message || "Conversation started")}</div>
      <div class="conversation-meta">
        <span>${displayDate(conversation.last_message_at || conversation.created_at)}</span>
        ${Number(conversation.unread_count || 0) > 0 ? `<span class="unread-badge">${conversation.unread_count}</span>` : ""}
      </div>
    </button>
  `).join("");

  conversationList.querySelectorAll("[data-conversation-id]").forEach((button) => {
    button.addEventListener("click", () => openConversation(button.dataset.conversationId));
  });
}

async function loadConversations(preferredConversation = null) {
  const { data, error } = await supabase.rpc("get_my_conversations");
  if (error) throw error;

  conversations = data || [];
  renderConversationList();

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
    threadBody.innerHTML = '<div class="empty-state">No messages have been sent yet.</div>';
  } else {
    threadBody.innerHTML = data.map((message) => {
      const mine = message.sender_id === currentUser.id;
      return `
        <div class="message-row ${mine ? "mine" : ""}">
          <div class="message-bubble">
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

  messageInput.disabled = false;
  sendButton.disabled = false;
  setMessageStatus("");

  renderConversationList();
  await loadMessages(conversationId);
  subscribeToConversation(conversationId);

  const url = new URL(window.location.href);
  url.searchParams.set("conversation", conversationId);
  window.history.replaceState({}, "", url);
}

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