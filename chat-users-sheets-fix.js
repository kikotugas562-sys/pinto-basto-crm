
/**
 * PINTO BASTO CRM — FIX CHAT USERS FROM SHEETS
 * Carrega utilizadores reais da aba Users no Google Sheets para o chat.
 */

const PB_CHAT_USERS_CACHE_KEY = "pb_chat_users_from_sheets";

async function PB_loadUsersFromSheetsForChat(){
  try{
    if(typeof SheetsDB === "undefined" || typeof SheetsDB.list !== "function"){
      return typeof getUsers === "function" ? getUsers() : [];
    }

    const res = await SheetsDB.list("Users");
    const currentId = String(me?.id || me?.uid || "");
    const currentEmail = String(me?.email || "").toLowerCase();

    const users = (res.data || [])
      .filter(u => String(u.id || u.uid || "").trim() || String(u.email || "").trim())
      .map(u => ({
        ...u,
        uid: u.id || u.uid,
        id: u.id || u.uid,
        name: u.name || u.email || "Utilizador",
        role: u.role || u.type || "-",
        department: u.department || "",
        email: u.email || "",
        type: u.type || "operator"
      }))
      .filter(u => {
        const uid = String(u.id || u.uid || "");
        const email = String(u.email || "").toLowerCase();
        return uid !== currentId && email !== currentEmail;
      });

    localStorage.setItem(PB_CHAT_USERS_CACHE_KEY, JSON.stringify(users));

    try{
      if(typeof saveUsers === "function"){
        const local = typeof getUsers === "function" ? getUsers() : [];
        const merged = [...local];

        users.forEach(u => {
          const idx = merged.findIndex(x =>
            String(x.email || "").toLowerCase() === String(u.email || "").toLowerCase() ||
            String(x.uid || x.id || "") === String(u.uid || u.id || "")
          );
          if(idx >= 0) merged[idx] = {...merged[idx], ...u};
          else merged.push(u);
        });

        saveUsers(merged);
      }
    }catch(e){}

    return users;
  }catch(err){
    console.warn("Falha ao carregar Users do Sheets:", err);
    try{
      return JSON.parse(localStorage.getItem(PB_CHAT_USERS_CACHE_KEY) || "[]");
    }catch(e){
      return typeof getUsers === "function" ? getUsers() : [];
    }
  }
}

function PB_findChatUsersBox(){
  return document.getElementById("userList") ||
         document.getElementById("chatUsers") ||
         document.getElementById("chatUserList") ||
         document.querySelector(".chat-users") ||
         document.querySelector(".users-list");
}

function PB_renderChatUsersList(usersList){
  const box = PB_findChatUsersBox();
  if(!box) return false;

  if(!usersList.length){
    box.innerHTML = '<div class="empty">Não há outros utilizadores disponíveis. Confirma a aba Users no Google Sheets.</div>';
    return true;
  }

  box.innerHTML = usersList.map(u => `
    <div class="user-row chat-user-row ${selectedUser && String((selectedUser.id||selectedUser.uid))===String((u.id||u.uid)) ? "active" : ""}"
      onclick="PB_selectChatUserFromSheets('${PB_escapeAttr(u.id || u.uid)}')">
      <strong>${PB_escapeHtml(u.name || "Utilizador")}</strong>
      <span>${PB_escapeHtml(u.role || u.type || "-")} · ${PB_escapeHtml(u.department || "")}</span>
      <small>ID: ${PB_escapeHtml(u.id || u.uid || "-")}</small>
      <small>${PB_escapeHtml(u.email || "")}</small>
    </div>
  `).join("");

  return true;
}

async function PB_renderUsersFromSheets(){
  const users = await PB_loadUsersFromSheetsForChat();
  const ok = PB_renderChatUsersList(users);

  if(!ok && typeof renderUsers === "function" && renderUsers.__PB_ORIGINAL_RENDER_USERS){
    renderUsers.__PB_ORIGINAL_RENDER_USERS();
  }
}

function PB_selectChatUserFromSheets(uid){
  let list = [];
  try{
    list = JSON.parse(localStorage.getItem(PB_CHAT_USERS_CACHE_KEY) || "[]");
  }catch(e){}

  const user = list.find(u => String(u.id || u.uid) === String(uid));
  if(!user) return;

  selectedUser = user;

  const title = document.getElementById("chatWithName") ||
                document.getElementById("selectedUserName") ||
                document.getElementById("chatTitle");

  if(title) title.textContent = user.name || user.email || "Utilizador";

  const sub = document.getElementById("chatWithMeta") ||
              document.getElementById("selectedUserMeta") ||
              document.getElementById("chatSub");

  if(sub) sub.textContent = `${user.role || user.type || "-"} · ${user.email || ""} · ID ${user.id || user.uid || "-"}`;

  if(typeof renderChat === "function") renderChat();
  PB_renderChatUsersList(list);
}

function PB_patchChatUsersFromSheets(){
  if(window.__PB_CHAT_USERS_SHEETS_FIX__) return;
  window.__PB_CHAT_USERS_SHEETS_FIX__ = true;

  if(typeof renderUsers === "function"){
    const original = renderUsers;
    window.renderUsers = function(){
      PB_renderUsersFromSheets();
    };
    window.renderUsers.__PB_ORIGINAL_RENDER_USERS = original;
  }

  if(typeof showPage === "function"){
    const oldShowPage = showPage;
    window.showPage = function(id){
      oldShowPage(id);
      if(id === "chat"){
        setTimeout(PB_renderUsersFromSheets, 150);
      }
    };
  }

  setTimeout(PB_renderUsersFromSheets, 500);
}

function PB_escapeHtml(v){
  return String(v ?? "").replace(/[&<>"']/g, s => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[s]));
}

function PB_escapeAttr(v){
  return PB_escapeHtml(v).replace(/`/g, "&#096;");
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(PB_patchChatUsersFromSheets, 500);
  setTimeout(PB_renderUsersFromSheets, 1400);
});
