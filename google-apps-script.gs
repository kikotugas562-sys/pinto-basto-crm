/**
 * Pinto Basto CRM — Google Sheets API
 * Cola este código em Extensões > Apps Script.
 *
 * PASSOS:
 * 1. Cria/abre o Google Sheets da base de dados.
 * 2. Copia o ID do ficheiro Google Sheets.
 * 3. Cola o ID na variável SHEET_ID.
 * 4. Apps Script > Implementar > Nova implementação > Aplicação Web.
 * 5. Executar como: Eu.
 * 6. Quem tem acesso: Qualquer pessoa com o link.
 * 7. Copia o URL da Web App para SHEETS_API_URL no ficheiro sheets-api.js da app.
 */

const SHEET_ID = "COLOCA_AQUI_O_ID_DO_GOOGLE_SHEETS";

const TABLES = {
  Users: [
    "id","type","name","email","password","role","department","phone","office",
    "company","createdAt","updatedAt"
  ],

  Clients: [
    "id","name","status","type","country","email","phone","contact","lead",
    "nif","domain","address","dynamics","alertDays","lastInteraction",
    "notes","createdAt","updatedAt"
  ],

  ClientUsers: [
    "id","clientId","name","role","email","phone","createdAt"
  ],

  Interactions: [
    "id","clientId","clientName","type","ownerId","ownerName","status",
    "channel","contact","followDate","summary","transcript","audioUrl",
    "origin","createdAt"
  ],

  Messages: [
    "id","conversationId","senderId","senderName","senderType","receiverId",
    "receiverName","receiverType","text","read","createdAt"
  ],

  Notifications: [
    "id","userId","type","title","message","read","createdAt"
  ],

  Settings: [
    "userId","theme","density","radius","fontSize","notifications",
    "browserNotifications","animations","glass","shadows","updatedAt"
  ],

  Videos: [
    "id","title","description","url","type","createdAt"
  ],

  AuditLog: [
    "id","userId","action","tableName","recordId","createdAt"
  ]
};

function doGet(e) {
  return jsonResponse({
    ok: true,
    app: "Pinto Basto CRM API",
    message: "API online",
    actions: [
      "setup",
      "list",
      "get",
      "create",
      "update",
      "delete",
      "login",
      "messages",
      "sendMessage",
      "markMessageRead",
      "notifications",
      "markNotificationRead"
    ]
  });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const action = body.action;

    if (action === "setup") return setup();
    if (action === "list") return list(body.table, body.filters);
    if (action === "get") return getById(body.table, body.id);
    if (action === "create") return create(body.table, body.data, body.userId);
    if (action === "update") return update(body.table, body.id, body.data, body.userId);
    if (action === "delete") return remove(body.table, body.id, body.userId);

    if (action === "login") return login(body.email, body.password, body.type);
    if (action === "messages") return getMessages(body.userId);
    if (action === "sendMessage") return sendMessage(body.data);
    if (action === "markMessageRead") return markMessageRead(body.messageId);

    if (action === "notifications") return getNotifications(body.userId);
    if (action === "markNotificationRead") return markNotificationRead(body.notificationId);
    if (action === "createNotification") return create("Notifications", body.data, body.userId);

    if (action === "clientDashboard") return clientDashboard(body.clientId);
    if (action === "operatorDashboard") return operatorDashboard(body.userId);

    return jsonResponse({ ok: false, error: "Ação inválida: " + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

/**
 * Cria todas as abas com cabeçalhos.
 * Atenção: limpa as abas existentes.
 */
function setup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  Object.keys(TABLES).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);

    sheet.clear();
    sheet.appendRow(TABLES[name]);
    styleHeader(sheet);
  });

  return jsonResponse({ ok: true, message: "Tabelas criadas/atualizadas." });
}

function list(table, filters) {
  const sheet = getSheet(table);
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift();

  let data = rows
    .filter(row => row.some(cell => cell !== ""))
    .map(row => rowToObject(headers, row));

  if (filters && typeof filters === "object") {
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== undefined && value !== null && value !== "") {
        data = data.filter(item => String(item[key]).toLowerCase() === String(value).toLowerCase());
      }
    });
  }

  return jsonResponse({ ok: true, table, data });
}

function getById(table, id) {
  const sheet = getSheet(table);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf("id");

  if (idCol === -1) return jsonResponse({ ok: false, error: "Tabela sem coluna id." });

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      return jsonResponse({ ok: true, data: rowToObject(headers, values[i]) });
    }
  }

  return jsonResponse({ ok: false, error: "Registo não encontrado." });
}

function create(table, data, userId) {
  validateTable(table);

  const sheet = getSheet(table);
  const headers = TABLES[table];

  if (!data) data = {};
  if (headers.includes("id") && !data.id) data.id = makeId(table);
  if (headers.includes("createdAt") && !data.createdAt) data.createdAt = nowIso();
  if (headers.includes("updatedAt")) data.updatedAt = nowIso();

  sheet.appendRow(headers.map(h => data[h] !== undefined ? data[h] : ""));

  audit(userId || data.userId || data.senderId || "", "CREATE", table, data.id || data.userId || "");

  return jsonResponse({ ok: true, table, data });
}

function update(table, id, data, userId) {
  validateTable(table);

  const sheet = getSheet(table);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  const idField = table === "Settings" ? "userId" : "id";
  const idCol = headers.indexOf(idField);

  if (idCol === -1) return jsonResponse({ ok: false, error: "Tabela sem coluna " + idField });

  let rowIndex = -1;

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return jsonResponse({ ok: false, error: "Registo não encontrado." });
  }

  if (headers.includes("updatedAt")) data.updatedAt = nowIso();

  headers.forEach((h, colIndex) => {
    if (data[h] !== undefined) {
      sheet.getRange(rowIndex, colIndex + 1).setValue(data[h]);
    }
  });

  audit(userId || "", "UPDATE", table, id);

  return jsonResponse({ ok: true, table, id, data });
}

function remove(table, id, userId) {
  validateTable(table);

  const sheet = getSheet(table);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  const idCol = headers.indexOf("id");
  if (idCol === -1) return jsonResponse({ ok: false, error: "Tabela sem coluna id." });

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      audit(userId || "", "DELETE", table, id);
      return jsonResponse({ ok: true, table, id });
    }
  }

  return jsonResponse({ ok: false, error: "Registo não encontrado." });
}

function login(email, password, type) {
  const users = readTable("Users");

  const user = users.find(u =>
    String(u.email).toLowerCase() === String(email).toLowerCase() &&
    String(u.password) === String(password) &&
    (!type || String(u.type) === String(type))
  );

  if (!user) {
    return jsonResponse({ ok: false, error: "Email ou palavra-passe incorretos." });
  }

  delete user.password;

  audit(user.id, "LOGIN", "Users", user.id);

  return jsonResponse({ ok: true, user });
}

function getMessages(userId) {
  const messages = readTable("Messages")
    .filter(m => String(m.senderId) === String(userId) || String(m.receiverId) === String(userId))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return jsonResponse({ ok: true, data: messages });
}

function sendMessage(data) {
  if (!data) data = {};

  if (!data.senderId || !data.receiverId || !data.text) {
    return jsonResponse({ ok: false, error: "Mensagem incompleta." });
  }

  data.id = makeId("MSG");
  data.conversationId = data.conversationId || makeConversationId(data.senderId, data.receiverId);
  data.read = false;
  data.createdAt = nowIso();

  const result = create("Messages", data, data.senderId);

  create("Notifications", {
    id: makeId("NOTIF"),
    userId: data.receiverId,
    type: "message",
    title: "Nova mensagem",
    message: data.senderName + " enviou uma mensagem.",
    read: false,
    createdAt: nowIso()
  }, data.senderId);

  return result;
}

function markMessageRead(messageId) {
  return update("Messages", messageId, { read: true }, "");
}

function getNotifications(userId) {
  const notifications = readTable("Notifications")
    .filter(n => String(n.userId) === String(userId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return jsonResponse({ ok: true, data: notifications });
}

function markNotificationRead(notificationId) {
  return update("Notifications", notificationId, { read: true }, "");
}

function clientDashboard(clientId) {
  const clients = readTable("Clients");
  const interactions = readTable("Interactions");
  const contacts = readTable("ClientUsers");

  const client = clients.find(c => String(c.id) === String(clientId));
  if (!client) return jsonResponse({ ok: false, error: "Cliente não encontrado." });

  return jsonResponse({
    ok: true,
    client,
    contacts: contacts.filter(c => String(c.clientId) === String(clientId)),
    interactions: interactions.filter(i => String(i.clientId) === String(clientId))
  });
}

function operatorDashboard(userId) {
  const clients = readTable("Clients");
  const interactions = readTable("Interactions");
  const messages = readTable("Messages");
  const notifications = readTable("Notifications");

  return jsonResponse({
    ok: true,
    kpis: {
      clients: clients.length,
      activeClients: clients.filter(c => c.status === "Ativo").length,
      pendingInteractions: interactions.filter(i =>
        ["Pendente","A acompanhar","Requer resposta"].includes(String(i.status))
      ).length,
      unreadMessages: messages.filter(m => String(m.receiverId) === String(userId) && String(m.read) !== "true").length,
      unreadNotifications: notifications.filter(n => String(n.userId) === String(userId) && String(n.read) !== "true").length
    }
  });
}

function readTable(table) {
  const sheet = getSheet(table);
  const rows = sheet.getDataRange().getValues();

  if (rows.length <= 1) return [];

  const headers = rows.shift();

  return rows
    .filter(row => row.some(cell => cell !== ""))
    .map(row => rowToObject(headers, row));
}

function getSheet(table) {
  validateTable(table);

  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(table);

  if (!sheet) {
    sheet = ss.insertSheet(table);
    sheet.appendRow(TABLES[table]);
    styleHeader(sheet);
  }

  return sheet;
}

function validateTable(table) {
  if (!TABLES[table]) {
    throw new Error("Tabela inválida: " + table);
  }
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((h, i) => obj[h] = row[i]);
  return obj;
}

function makeConversationId(a, b) {
  return [String(a), String(b)].sort().join("__");
}

function makeId(prefix) {
  return String(prefix).toUpperCase() + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function nowIso() {
  return new Date().toISOString();
}

function audit(userId, action, tableName, recordId) {
  try {
    const sheet = getSheet("AuditLog");
    const headers = TABLES.AuditLog;
    const data = {
      id: makeId("AUDIT"),
      userId: userId || "",
      action,
      tableName,
      recordId,
      createdAt: nowIso()
    };
    sheet.appendRow(headers.map(h => data[h] !== undefined ? data[h] : ""));
  } catch (err) {
    // Não bloquear a app por erro de audit log.
  }
}

function styleHeader(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol <= 0) return;

  const range = sheet.getRange(1, 1, 1, lastCol);
  range.setFontWeight("bold");
  range.setBackground("#0B376D");
  range.setFontColor("#FFFFFF");
  sheet.setFrozenRows(1);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
