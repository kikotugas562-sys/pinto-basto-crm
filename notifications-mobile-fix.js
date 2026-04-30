
/**
 * PINTO BASTO CRM — MOBILE NOTIFICATIONS FIX
 * - Adiciona botão X para fechar notificações no telemóvel.
 * - Filtra notificações de mensagens: só mostra se forem para o utilizador atual.
 */

function PB_currentUserIdForNotifications(){
  return String(
    me?.id ||
    me?.uid ||
    JSON.parse(localStorage.getItem("pb_current_user") || "{}")?.id ||
    JSON.parse(localStorage.getItem("pb_current_user") || "{}")?.uid ||
    ""
  );
}

function PB_currentUserEmailForNotifications(){
  return String(
    me?.email ||
    JSON.parse(localStorage.getItem("pb_current_user") || "{}")?.email ||
    ""
  ).toLowerCase();
}

function PB_notificationBelongsToMe(n){
  const currentId = PB_currentUserIdForNotifications();
  const currentEmail = PB_currentUserEmailForNotifications();

  // Notificações normais sem userId continuam visíveis.
  if(!n.userId && !n.receiverId && !n.to && !n.receiverEmail) return true;

  const userId = String(n.userId || n.receiverId || n.to || "");
  const receiverEmail = String(n.receiverEmail || n.toEmail || "").toLowerCase();

  return (currentId && userId === currentId) || (currentEmail && receiverEmail === currentEmail);
}

function PB_filterNotificationsForMe(list){
  return (list || []).filter(n => {
    // Mensagens só aparecem para o destinatário correto.
    if(String(n.type || "").toLowerCase() === "message"){
      return PB_notificationBelongsToMe(n);
    }
    // Outras notificações com userId também têm de pertencer ao user.
    if(n.userId || n.receiverId || n.to || n.receiverEmail){
      return PB_notificationBelongsToMe(n);
    }
    return true;
  });
}

function PB_addNotificationCloseButton(){
  const panel = document.getElementById("notificationPanel");
  if(!panel) return;

  if(!document.getElementById("notificationCloseBtn")){
    const btn = document.createElement("button");
    btn.id = "notificationCloseBtn";
    btn.type = "button";
    btn.className = "notification-close-btn";
    btn.innerHTML = "×";
    btn.title = "Fechar notificações";
    btn.onclick = PB_closeNotificationsPanel;
    panel.prepend(btn);
  }
}

function PB_closeNotificationsPanel(){
  const panel = document.getElementById("notificationPanel");
  if(panel){
    panel.classList.remove("show");
    panel.classList.remove("open");
    panel.style.display = "";
  }
}

function PB_patchNotificationsMobile(){
  if(window.__PB_NOTIFICATIONS_MOBILE_FIX__) return;
  window.__PB_NOTIFICATIONS_MOBILE_FIX__ = true;

  const originalGetNotifications = typeof getNotifications === "function" ? getNotifications : null;
  if(originalGetNotifications){
    window.getNotifications = function(){
      return PB_filterNotificationsForMe(originalGetNotifications());
    };
  }

  const originalRender = typeof renderNotifications === "function" ? renderNotifications : null;
  if(originalRender){
    window.renderNotifications = function(){
      PB_addNotificationCloseButton();
      originalRender();

      // Depois do render, garante contagem só das minhas notificações.
      try{
        const list = typeof getNotifications === "function" ? getNotifications() : [];
        const unread = PB_filterNotificationsForMe(list).filter(n =>
          !(n.read === true || n.read === "true" || n.read === 1 || n.read === "1")
        ).length;
        const badge = document.getElementById("notificationBadge");
        if(badge){
          badge.textContent = unread;
          badge.style.display = unread > 0 ? "inline-flex" : "none";
        }
      }catch(e){}
    };
  }

  const originalToggle = typeof toggleNotifications === "function" ? toggleNotifications : null;
  if(originalToggle){
    window.toggleNotifications = function(){
      originalToggle();
      PB_addNotificationCloseButton();
    };
  }

  const originalAdd = typeof addNotification === "function" ? addNotification : null;
  if(originalAdd){
    window.addNotification = function(type, title, message, targetUserId){
      // Se for notificação de mensagem e tiver alvo, só cria se for para mim.
      if(String(type || "").toLowerCase() === "message" && targetUserId){
        if(String(targetUserId) !== PB_currentUserIdForNotifications()) return;
      }
      originalAdd(type, title, message);
    };
  }

  PB_addNotificationCloseButton();
  if(typeof renderNotifications === "function") renderNotifications();
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(PB_patchNotificationsMobile, 500);
  setTimeout(PB_addNotificationCloseButton, 1200);
});
