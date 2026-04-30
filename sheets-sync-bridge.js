/**
 * PINTO BASTO CRM — SYNC BRIDGE
 *
 * Este ficheiro liga a app ao Google Sheets em modo bidirecional.
 * Resultado:
 * - Ao abrir, puxa dados do Sheets para localStorage.
 * - Ao guardar na app, envia para Sheets.
 * - Se editares no Sheets, ao carregar/sincronizar a app muda também.
 */

const PB_SYNC = {
  lastSyncKey: "pb_last_sheets_sync",
  autoSyncInterval: null,

  localKeys: {
    Users: "pb_local_users",
    Clients: "pb_clients_local_premium",
    Interactions: "pb_interactions_local_premium",
    Messages: "pb_unified_messages",
    Notifications: "pb_real_notifications",
    Settings: "pb_professional_settings",
    Videos: "pb_videos"
  }
};

function getActiveUserForSync() {
  if (typeof me !== "undefined" && me) return me;
  if (typeof clientMe !== "undefined" && clientMe) return clientMe;

  return JSON.parse(
    localStorage.getItem("pb_current_user") ||
    localStorage.getItem("pb_client_session") ||
    "null"
  );
}

function getActiveUserIdForSync() {
  const user = getActiveUserForSync();
  return user ? (user.id || user.uid || user.userId) : "";
}

function normalizeUserForSheets(u) {
  return {
    id: u.id || u.uid,
    type: u.type || ((u.id || u.uid || "").startsWith("CLIENT") ? "client" : "operator"),
    name: u.name || "",
    email: u.email || "",
    password: u.password || "",
    role: u.role || "",
    department: u.department || "",
    phone: u.phone || "",
    office: u.office || u.country || "",
    company: u.company || "Pinto Basto",
    createdAt: u.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function normalizeClientForSheets(c) {
  return {
    id: c.id || ("C-" + Date.now() + "-" + Math.random().toString(36).slice(2,5)),
    name: c.name || "",
    status: c.status || "Novo",
    type: c.type || "Cliente atual",
    country: c.country || "Portugal",
    email: c.email || "",
    phone: c.phone || "",
    contact: c.contact || "",
    lead: c.lead || c.contact || "",
    nif: c.nif || "",
    domain: c.domain || "",
    address: c.address || "",
    dynamics: c.dynamics || "",
    alertDays: c.alertDays || 30,
    lastInteraction: c.lastInteraction || "",
    notes: c.notes || "",
    createdAt: c.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function normalizeInteractionForSheets(i) {
  return {
    id: i.id || ("I-" + Date.now() + "-" + Math.random().toString(36).slice(2,5)),
    clientId: i.clientId || "",
    clientName: i.clientName || i.client || "",
    type: i.type || "",
    ownerId: i.ownerId || getActiveUserIdForSync(),
    ownerName: i.ownerName || i.owner || "",
    status: i.status || "",
    channel: i.channel || "",
    contact: i.contact || "",
    followDate: i.followDate || i.follow || "",
    summary: i.summary || "",
    transcript: i.transcript || "",
    audioUrl: i.audioUrl || "",
    origin: i.origin || "Pinto Basto CRM",
    createdAt: i.createdAt || i.date || new Date().toISOString()
  };
}

function normalizeMessageForSheets(m) {
  return {
    id: m.id || ("MSG-" + Date.now() + "-" + Math.random().toString(36).slice(2,5)),
    conversationId: m.conversationId || m.conv || [m.sender || m.senderId, m.receiver || m.receiverId].sort().join("__"),
    senderId: m.senderId || m.sender,
    senderName: m.senderName || "",
    senderType: m.senderType || "",
    receiverId: m.receiverId || m.receiver,
    receiverName: m.receiverName || "",
    receiverType: m.receiverType || "",
    text: m.text || "",
    read: m.read === true || m.read === "true",
    createdAt: m.createdAt || m.date || new Date().toISOString()
  };
}

function normalizeNotificationForSheets(n) {
  return {
    id: n.id || ("NOTIF-" + Date.now() + "-" + Math.random().toString(36).slice(2,5)),
    userId: n.userId || getActiveUserIdForSync(),
    type: n.type || "info",
    title: n.title || "",
    message: n.message || "",
    read: n.read === true || n.read === "true",
    createdAt: n.createdAt || n.date || new Date().toISOString()
  };
}

function applySheetsDataToLocalStorage(data) {
  if (!data) return;

  if (data.Users) {
    const users = data.Users.map(u => ({
      uid: u.id,
      id: u.id,
      type: u.type,
      name: u.name,
      email: u.email,
      password: u.password,
      role: u.role,
      department: u.department,
      phone: u.phone,
      office: u.office,
      company: u.company,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }));
    localStorage.setItem("pb_local_users", JSON.stringify(users));

    const clients = users.filter(u => u.type === "client").map(u => ({
      uid: u.id,
      id: u.id,
      email: u.email,
      password: u.password,
      name: u.name,
      company: u.company,
      role: u.role,
      phone: u.phone,
      country: u.office,
      type: "Cliente atual",
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }));
    localStorage.setItem("pb_client_users", JSON.stringify(clients));
  }

  if (data.Clients) {
    const clients = data.Clients.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      type: c.type,
      country: c.country,
      email: c.email,
      phone: c.phone,
      contact: c.contact,
      lead: c.lead,
      nif: c.nif,
      domain: c.domain,
      address: c.address,
      dynamics: c.dynamics,
      alertDays: c.alertDays,
      lastInteraction: c.lastInteraction,
      notes: c.notes,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));
    localStorage.setItem("pb_clients_local_premium", JSON.stringify(clients));
    localStorage.setItem("pb_clients_local", JSON.stringify(clients));
  }

  if (data.Interactions) {
    const interactions = data.Interactions.map(i => ({
      id: i.id,
      clientId: i.clientId,
      client: i.clientName,
      clientName: i.clientName,
      type: i.type,
      ownerId: i.ownerId,
      owner: i.ownerName,
      ownerName: i.ownerName,
      status: i.status,
      channel: i.channel,
      contact: i.contact,
      followDate: i.followDate,
      summary: i.summary,
      transcript: i.transcript,
      audioUrl: i.audioUrl,
      origin: i.origin,
      date: i.createdAt,
      createdAt: i.createdAt
    }));
    localStorage.setItem("pb_interactions_local_premium", JSON.stringify(interactions));
    localStorage.setItem("pb_interactions_local", JSON.stringify(interactions));
  }

  if (data.Messages) {
    const messages = data.Messages.map(m => ({
      id: m.id,
      conv: m.conversationId,
      conversationId: m.conversationId,
      sender: m.senderId,
      senderId: m.senderId,
      senderName: m.senderName,
      senderType: m.senderType,
      receiver: m.receiverId,
      receiverId: m.receiverId,
      receiverName: m.receiverName,
      receiverType: m.receiverType,
      text: m.text,
      read: m.read === true || m.read === "true",
      date: m.createdAt,
      createdAt: m.createdAt
    }));
    localStorage.setItem("pb_unified_messages", JSON.stringify(messages));
  }

  if (data.Notifications) {
    const notifications = data.Notifications.map(n => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read === true || n.read === "true",
      date: n.createdAt,
      createdAt: n.createdAt
    }));
    localStorage.setItem("pb_real_notifications", JSON.stringify(notifications));
  }

  if (data.Settings) {
    const activeId = getActiveUserIdForSync();
    const s = data.Settings.find(x => String(x.userId) === String(activeId));
    if (s) {
      const settings = {
        theme: s.theme || "classic",
        density: s.density || "comfortable",
        radius: s.radius || "soft",
        fontSize: s.fontSize || "normal",
        notifications: s.notifications === true || s.notifications === "true",
        browserNotifications: s.browserNotifications === true || s.browserNotifications === "true",
        animations: s.animations !== false && s.animations !== "false",
        glass: s.glass !== false && s.glass !== "false",
        shadows: s.shadows !== false && s.shadows !== "false"
      };
      localStorage.setItem("pb_professional_settings", JSON.stringify(settings));
    }
  }
}

async function syncPullFromSheets() {
  if (typeof SheetsDB === "undefined") throw new Error("SheetsDB não carregado.");

  const result = await SheetsDB.syncPull("");
  applySheetsDataToLocalStorage(result.data);
  localStorage.setItem(PB_SYNC.lastSyncKey, result.timestamp || new Date().toISOString());

  if (typeof renderAll === "function") renderAll();
  if (typeof renderPowerCRM === "function") renderPowerCRM();
  if (typeof renderNotifications === "function") renderNotifications();
  if (typeof renderTeam === "function") renderTeam();
  if (typeof renderClientTeamList === "function") renderClientTeamList();

  return result;
}

async function pushCurrentLocalDataToSheets() {
  const userId = getActiveUserIdForSync();

  const users = JSON.parse(localStorage.getItem("pb_local_users") || "[]").map(normalizeUserForSheets);
  const clientUsers = JSON.parse(localStorage.getItem("pb_client_users") || "[]").map(c => normalizeUserForSheets({ ...c, type:"client", office:c.country, company:c.company }));
  const allUsers = [...users];

  clientUsers.forEach(c => {
    if (!allUsers.some(u => u.id === c.id)) allUsers.push(c);
  });

  const clients = JSON.parse(localStorage.getItem("pb_clients_local_premium") || localStorage.getItem("pb_clients_local") || "[]").map(normalizeClientForSheets);
  const interactions = JSON.parse(localStorage.getItem("pb_interactions_local_premium") || localStorage.getItem("pb_interactions_local") || "[]").map(normalizeInteractionForSheets);
  const messages = JSON.parse(localStorage.getItem("pb_unified_messages") || "[]").map(normalizeMessageForSheets);
  const notifications = JSON.parse(localStorage.getItem("pb_real_notifications") || "[]").map(normalizeNotificationForSheets);

  const settings = [];
  const localSettings = JSON.parse(localStorage.getItem("pb_professional_settings") || "{}");
  if (userId) {
    settings.push({
      userId,
      theme: localSettings.theme || "classic",
      density: localSettings.density || "comfortable",
      radius: localSettings.radius || "soft",
      fontSize: localSettings.fontSize || "normal",
      notifications: localSettings.notifications !== false,
      browserNotifications: localSettings.browserNotifications === true,
      animations: localSettings.animations !== false,
      glass: localSettings.glass !== false,
      shadows: localSettings.shadows !== false,
      updatedAt: new Date().toISOString()
    });
  }

  const changes = {
    Users: { update: allUsers },
    Clients: { update: clients },
    Interactions: { update: interactions },
    Messages: { update: messages },
    Notifications: { update: notifications },
    Settings: { update: settings }
  };

  return SheetsDB.syncPush(changes, userId);
}

async function saveRecordToSheets(table, data) {
  if (typeof SheetsDB === "undefined") return;
  const userId = getActiveUserIdForSync();
  const id = data.id || data.userId || data.uid;
  return SheetsDB.upsert(table, id, data, userId);
}

async function deleteRecordFromSheets(table, id) {
  if (typeof SheetsDB === "undefined") return;
  const userId = getActiveUserIdForSync();
  return SheetsDB.delete(table, id, userId);
}

function showSyncToast(message) {
  if (typeof toast === "function") toast(message);
  else if (typeof clientToast === "function") clientToast(message);
  else console.log(message);
}

function installSheetsSyncPatches() {
  // saveSettings operador
  if (typeof saveSettings === "function" && !saveSettings.__sheetsPatched) {
    const original = saveSettings;
    saveSettings = async function() {
      original();

      try {
        const user = getActiveUserForSync();
        if (user) await saveRecordToSheets("Users", normalizeUserForSheets(user));

        const settings = JSON.parse(localStorage.getItem("pb_professional_settings") || "{}");
        await saveRecordToSheets("Settings", {
          userId: getActiveUserIdForSync(),
          ...settings,
          updatedAt: new Date().toISOString()
        });

        showSyncToast("Definições guardadas na app e no Google Sheets.");
      } catch (err) {
        showSyncToast("Erro Sheets: " + err.message);
      }
    };
    saveSettings.__sheetsPatched = true;
  }

  // saveClientSettings cliente
  if (typeof saveClientSettings === "function" && !saveClientSettings.__sheetsPatched) {
    const original = saveClientSettings;
    saveClientSettings = async function() {
      original();

      try {
        const user = getActiveUserForSync();
        if (user) await saveRecordToSheets("Users", normalizeUserForSheets({ ...user, type:"client", office:user.country, company:user.company }));

        showSyncToast("Conta do cliente guardada na app e no Google Sheets.");
      } catch (err) {
        showSyncToast("Erro Sheets: " + err.message);
      }
    };
    saveClientSettings.__sheetsPatched = true;
  }

  // savePowerClient / saveEnhancedClient
  if (typeof savePowerClient === "function" && !savePowerClient.__sheetsPatched) {
    const original = savePowerClient;
    savePowerClient = async function() {
      original();
      try {
        const c = typeof getSelectedPowerClient === "function" ? getSelectedPowerClient() : null;
        if (c) await saveRecordToSheets("Clients", normalizeClientForSheets(c));
        showSyncToast("Cliente guardado na app e no Google Sheets.");
      } catch (err) {
        showSyncToast("Erro Sheets: " + err.message);
      }
    };
    savePowerClient.__sheetsPatched = true;
  }

  // saveInteraction
  if (typeof saveInteraction === "function" && !saveInteraction.__sheetsPatched) {
    const original = saveInteraction;
    saveInteraction = async function() {
      original();
      try {
        const list = JSON.parse(localStorage.getItem("pb_interactions_local_premium") || localStorage.getItem("pb_interactions_local") || "[]");
        const last = list[0];
        if (last) await saveRecordToSheets("Interactions", normalizeInteractionForSheets(last));
        showSyncToast("Interação guardada na app e no Google Sheets.");
      } catch (err) {
        showSyncToast("Erro Sheets: " + err.message);
      }
    };
    saveInteraction.__sheetsPatched = true;
  }

  // saveQuickInteraction
  if (typeof saveQuickInteraction === "function" && !saveQuickInteraction.__sheetsPatched) {
    const original = saveQuickInteraction;
    saveQuickInteraction = async function() {
      original();
      try {
        const list = JSON.parse(localStorage.getItem("pb_interactions_local_premium") || localStorage.getItem("pb_interactions_local") || "[]");
        const last = list[0];
        if (last) await saveRecordToSheets("Interactions", normalizeInteractionForSheets(last));
        showSyncToast("Interação rápida guardada na app e no Google Sheets.");
      } catch (err) {
        showSyncToast("Erro Sheets: " + err.message);
      }
    };
    saveQuickInteraction.__sheetsPatched = true;
  }

  // sendMessage operador
  if (typeof sendMessage === "function" && !sendMessage.__sheetsPatched) {
    const original = sendMessage;
    sendMessage = async function() {
      const before = JSON.parse(localStorage.getItem("pb_unified_messages") || "[]").length;
      original();

      try {
        const list = JSON.parse(localStorage.getItem("pb_unified_messages") || "[]");
        if (list.length > before) {
          const last = normalizeMessageForSheets(list[list.length - 1]);
          await SheetsDB.sendMessage(last);
          showSyncToast("Mensagem enviada e guardada no Google Sheets.");
        }
      } catch (err) {
        showSyncToast("Erro Sheets: " + err.message);
      }
    };
    sendMessage.__sheetsPatched = true;
  }

  // sendClientMessage cliente
  if (typeof sendClientMessage === "function" && !sendClientMessage.__sheetsPatched) {
    const original = sendClientMessage;
    sendClientMessage = async function() {
      const before = JSON.parse(localStorage.getItem("pb_unified_messages") || "[]").length;
      original();

      try {
        const list = JSON.parse(localStorage.getItem("pb_unified_messages") || "[]");
        if (list.length > before) {
          const last = normalizeMessageForSheets(list[list.length - 1]);
          await SheetsDB.sendMessage(last);
          showSyncToast("Mensagem enviada e guardada no Google Sheets.");
        }
      } catch (err) {
        showSyncToast("Erro Sheets: " + err.message);
      }
    };
    sendClientMessage.__sheetsPatched = true;
  }
}

async function startSheetsSync() {
  if (typeof SheetsDB === "undefined") {
    console.warn("SheetsDB não encontrado.");
    return;
  }

  installSheetsSyncPatches();

  try {
    await syncPullFromSheets();
    showSyncToast("Dados carregados do Google Sheets.");
  } catch (err) {
    console.warn("Não foi possível puxar dados do Sheets:", err);
    showSyncToast("Sheets não sincronizou: " + err.message);
  }

  clearInterval(PB_SYNC.autoSyncInterval);
  PB_SYNC.autoSyncInterval = setInterval(async () => {
    try {
      await syncPullFromSheets();
    } catch (err) {
      console.warn("Auto-sync falhou:", err.message);
    }
  }, 30000);
}

window.PintoBastoSheetsSync = {
  pull: syncPullFromSheets,
  push: pushCurrentLocalDataToSheets,
  start: startSheetsSync
};

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(startSheetsSync, 800);
});
