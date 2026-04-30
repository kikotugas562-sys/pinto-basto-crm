/**
 * PINTO BASTO CRM — SHEETS API BIDIRECIONAL
 * Já tem o URL da tua Web App.
 */

const SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbxMSH6VLQnIvncxUBNUVM45uH_FBSCvjWVHNmKeYp9fkxqCVTGEbsHGXPvnK0N0Lt46/exec";

async function sheetsRequest(payload) {
  const response = await fetch(SHEETS_API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.error || "Erro no Google Sheets.");
  }

  return data;
}

const SheetsDB = {
  setup() {
    return sheetsRequest({ action: "setup" });
  },

  syncPull(since = "") {
    return sheetsRequest({ action: "syncPull", since });
  },

  syncPush(changes, userId = "") {
    return sheetsRequest({ action: "syncPush", changes, userId });
  },

  list(table, filters = {}) {
    return sheetsRequest({ action: "list", table, filters });
  },

  get(table, id) {
    return sheetsRequest({ action: "get", table, id });
  },

  create(table, data, userId = "") {
    return sheetsRequest({ action: "create", table, data, userId });
  },

  upsert(table, id, data, userId = "") {
    return sheetsRequest({ action: "upsert", table, id, data, userId });
  },

  update(table, id, data, userId = "") {
    return sheetsRequest({ action: "update", table, id, data, userId });
  },

  delete(table, id, userId = "") {
    return sheetsRequest({ action: "delete", table, id, userId });
  },

  login(email, password, type = "") {
    return sheetsRequest({ action: "login", email, password, type });
  },

  messages(userId) {
    return sheetsRequest({ action: "messages", userId });
  },

  sendMessage(message) {
    return sheetsRequest({ action: "sendMessage", data: message });
  },

  notifications(userId) {
    return sheetsRequest({ action: "notifications", userId });
  },

  markNotificationRead(notificationId) {
    return sheetsRequest({ action: "markNotificationRead", notificationId });
  },

  operatorDashboard(userId) {
    return sheetsRequest({ action: "operatorDashboard", userId });
  },

  clientDashboard(clientId) {
    return sheetsRequest({ action: "clientDashboard", clientId });
  }
};
