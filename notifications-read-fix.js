/**
 * PINTO BASTO CRM — FIX NOTIFICAÇÕES LIDAS
 *
 * Problema corrigido:
 * - Lias uma notificação, contador ia para 0.
 * - Quando chegava nova notificação, as antigas voltavam a contar.
 *
 * Solução:
 * - Guarda IDs de notificações lidas em `pb_read_notification_ids`.
 * - O contador só conta read === false.
 * - Ao sincronizar/receber nova notificação, antigas lidas continuam lidas.
 */

const PB_READ_NOTIFICATIONS_KEY = "pb_read_notification_ids";

function PB_getReadNotificationIds(){
  try {
    return JSON.parse(localStorage.getItem(PB_READ_NOTIFICATIONS_KEY) || "[]");
  } catch(e) {
    return [];
  }
}

function PB_saveReadNotificationIds(ids){
  localStorage.setItem(PB_READ_NOTIFICATIONS_KEY, JSON.stringify([...new Set(ids.map(String))]));
}

function PB_isNotificationRead(n){
  const readIds = PB_getReadNotificationIds();
  return n.read === true ||
         n.read === "true" ||
         n.read === 1 ||
         n.read === "1" ||
         readIds.includes(String(n.id));
}

function PB_normalizeNotificationsReadState(){
  if(typeof getNotifications !== "function" || typeof saveNotifications !== "function") return [];

  const readIds = PB_getReadNotificationIds();
  const list = getNotifications().map(n => ({
    ...n,
    read: PB_isNotificationRead(n)
  }));

  const newReadIds = [
    ...readIds,
    ...list.filter(n => n.read).map(n => String(n.id))
  ];

  PB_saveReadNotificationIds(newReadIds);
  saveNotifications(list);

  return list;
}

function PB_unreadNotifications(){
  const list = PB_normalizeNotificationsReadState();
  return list.filter(n => !PB_isNotificationRead(n));
}

function PB_patchNotificationsReadFix(){
  if(window.__PB_NOTIFICATIONS_READ_FIX__) return;
  window.__PB_NOTIFICATIONS_READ_FIX__ = true;

  const originalRender = typeof renderNotifications === "function" ? renderNotifications : null;
  const originalMarkRead = typeof markNotificationsRead === "function" ? markNotificationsRead : null;
  const originalAdd = typeof addNotification === "function" ? addNotification : null;

  window.renderNotifications = function(){
    const list = PB_normalizeNotificationsReadState();
    const unread = list.filter(n => !PB_isNotificationRead(n)).length;

    const badge = document.getElementById("notificationBadge");
    const box = document.getElementById("notificationList");

    if(badge){
      badge.textContent = unread;
      badge.style.display = unread > 0 ? "inline-flex" : "none";
    }

    if(!box) return;

    if(!list.length){
      box.innerHTML = '<div class="empty">Sem notificações reais ainda.</div>';
      return;
    }

    box.innerHTML = list.map(n => {
      const isRead = PB_isNotificationRead(n);
      return `
        <div class="notification-item ${isRead ? "read" : "unread"}">
          <div class="notification-icon">${typeof notificationIcon === "function" ? notificationIcon(n.type) : "🔔"}</div>
          <div>
            <strong>${typeof escapeHtml === "function" ? escapeHtml(n.title) : n.title}</strong>
            <p>${typeof escapeHtml === "function" ? escapeHtml(n.message) : n.message}</p>
            <small>${new Date(n.date || n.createdAt || Date.now()).toLocaleString("pt-PT")}</small>
          </div>
        </div>
      `;
    }).join("");
  };

  window.markNotificationsRead = function(){
    const list = getNotifications();
    const ids = PB_getReadNotificationIds();

    list.forEach(n => {
      n.read = true;
      if(n.id !== undefined && n.id !== null) ids.push(String(n.id));
    });

    PB_saveReadNotificationIds(ids);
    saveNotifications(list);
    renderNotifications();

    // tenta também guardar no Sheets, sem bloquear a app
    if(typeof SheetsDB !== "undefined" && typeof SheetsDB.markNotificationRead === "function"){
      list.forEach(n => {
        if(n.id) {
          SheetsDB.markNotificationRead(n.id).catch(()=>{});
        }
      });
    }

    if(typeof toast === "function") toast("Notificações marcadas como lidas.");
  };

  window.addNotification = function(type, title, message){
    // Antes de adicionar nova, preserva estado lido das antigas.
    PB_normalizeNotificationsReadState();

    if(originalAdd){
      originalAdd(type, title, message);
    }else{
      const list = getNotifications();
      list.unshift({
        id: Date.now() + "-" + Math.random().toString(36).slice(2,7),
        type,
        title,
        message,
        date:new Date().toISOString(),
        read:false
      });
      saveNotifications(list.slice(0,50));
    }

    // Depois de adicionar, volta a garantir que só a nova fica unread.
    const readIds = PB_getReadNotificationIds();
    const list = getNotifications().map(n => ({
      ...n,
      read: readIds.includes(String(n.id)) ? true : (n.read === true || n.read === "true")
    }));
    saveNotifications(list);
    renderNotifications();
  };

  // Se houver sync do Sheets a sobrescrever localStorage, re-aplica estado lido depois.
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, value){
    originalSetItem(key, value);

    if(key === "pb_real_notifications"){
      setTimeout(() => {
        try {
          PB_normalizeNotificationsReadState();
          if(typeof renderNotifications === "function") renderNotifications();
        } catch(e){}
      }, 0);
    }
  };

  PB_normalizeNotificationsReadState();
  renderNotifications();
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(PB_patchNotificationsReadFix, 300);
  setTimeout(PB_patchNotificationsReadFix, 1300);
});
