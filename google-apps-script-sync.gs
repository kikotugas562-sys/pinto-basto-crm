/**
 * PINTO BASTO CRM — GOOGLE SHEETS API BIDIRECIONAL
 *
 * Este código permite:
 * - ler tudo do Google Sheets para a app
 * - criar registos
 * - atualizar registos
 * - apagar registos
 * - sincronizar alterações feitas diretamente no Sheets
 * - sincronizar alterações feitas na app
 *
 * Depois de colar este código:
 * Apps Script > Implementar > Gerir implementações > Editar > Nova versão > Implementar
 */

const SHEET_ID = "1jx3V9DLmg75ZQJeg0r79VrjJ67KajsUBZ4wtgDyPhP0";

const TABLES = {
  Users: ["id","type","name","email","password","role","department","phone","office","company","createdAt","updatedAt"],
  Clients: ["id","name","status","type","country","email","phone","contact","lead","nif","domain","address","dynamics","alertDays","lastInteraction","notes","createdAt","updatedAt"],
  ClientUsers: ["id","clientId","name","role","email","phone","createdAt"],
  Interactions: ["id","clientId","clientName","type","ownerId","ownerName","status","channel","contact","followDate","summary","transcript","audioUrl","origin","createdAt"],
  Messages: ["id","conversationId","senderId","senderName","senderType","receiverId","receiverName","receiverType","text","read","createdAt"],
  Notifications: ["id","userId","type","title","message","read","createdAt"],
  Settings: ["userId","theme","density","radius","fontSize","notifications","browserNotifications","animations","glass","shadows","updatedAt"],
  Videos: ["id","title","description","url","type","createdAt"],
  AuditLog: ["id","userId","action","tableName","recordId","createdAt"]
};

function doGet(e) {
  return jsonResponse({
    ok: true,
    message: "Pinto Basto CRM API bidirecional online",
    sheetId: SHEET_ID,
    timestamp: nowIso()
  });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const action = body.action;

    if (action === "setup") return setup(false);
    if (action === "resetSetup") return setup(true);

    if (action === "syncPull") return syncPull(body.since || "");
    if (action === "syncPush") return syncPush(body.changes || {}, body.userId || "");

    if (action === "list") return list(body.table, body.filters || {});
    if (action === "get") return getById(body.table, body.id);
    if (action === "create") return create(body.table, body.data || {}, body.userId || "");
    if (action === "upsert") return upsert(body.table, body.id, body.data || {}, body.userId || "");
    if (action === "update") return update(body.table, body.id, body.data || {}, body.userId || "");
    if (action === "delete") return remove(body.table, body.id, body.userId || "");

    if (action === "login") return login(body.email, body.password, body.type);
    if (action === "messages") return getMessages(body.userId);
    if (action === "sendMessage") return sendMessage(body.data || {});
    if (action === "notifications") return getNotifications(body.userId);
    if (action === "markNotificationRead") return markNotificationRead(body.notificationId);

    if (action === "operatorDashboard") return operatorDashboard(body.userId);
    if (action === "clientDashboard") return clientDashboard(body.clientId);

    return jsonResponse({ ok: false, error: "Ação inválida: " + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message, stack: String(err.stack || "") });
  }
}

function setup(clearData) {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  Object.keys(TABLES).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);

    if (clearData) {
      sheet.clear();
      sheet.appendRow(TABLES[name]);
    } else {
      ensureHeaders(sheet, name);
    }

    styleHeader(sheet);
  });

  return jsonResponse({ ok: true, message: clearData ? "Tabelas recriadas." : "Tabelas verificadas sem apagar dados." });
}

function syncPull(since) {
  const result = {};

  Object.keys(TABLES).forEach(table => {
    let data = readTable(table);

    if (since) {
      data = data.filter(row => {
        const updated = row.updatedAt || row.createdAt || "";
        return updated && new Date(updated).getTime() > new Date(since).getTime();
      });
    }

    result[table] = data;
  });

  return jsonResponse({
    ok: true,
    timestamp: nowIso(),
    data: result
  });
}

function syncPush(changes, userId) {
  const result = {};

  Object.keys(changes).forEach(table => {
    validateTable(table);

    const tableChanges = changes[table] || {};
    const created = tableChanges.create || [];
    const updated = tableChanges.update || [];
    const deleted = tableChanges.delete || [];

    result[table] = { created: 0, updated: 0, deleted: 0, errors: [] };

    created.forEach(item => {
      try {
        create(table, item, userId);
        result[table].created++;
      } catch (err) {
        result[table].errors.push(err.message);
      }
    });

    updated.forEach(item => {
      try {
        const id = item.id || item.userId;
        upsert(table, id, item, userId);
        result[table].updated++;
      } catch (err) {
        result[table].errors.push(err.message);
      }
    });

    deleted.forEach(id => {
      try {
        remove(table, id, userId);
        result[table].deleted++;
      } catch (err) {
        result[table].errors.push(err.message);
      }
    });
  });

  return jsonResponse({ ok: true, timestamp: nowIso(), result });
}

function list(table, filters) {
  const data = readTable(table).filter(item => {
    return Object.keys(filters || {}).every(key => {
      if (filters[key] === "" || filters[key] === undefined || filters[key] === null) return true;
      return String(item[key]).toLowerCase() === String(filters[key]).toLowerCase();
    });
  });

  return jsonResponse({ ok: true, data });
}

function getById(table, id) {
  const data = readTable(table);
  const key = getKeyField(table);
  const item = data.find(row => String(row[key]) === String(id));

  if (!item) return jsonResponse({ ok: false, error: "Registo não encontrado." });

  return jsonResponse({ ok: true, data: item });
}

function create(table, data, userId) {
  validateTable(table);

  const sheet = getSheet(table);
  const headers = TABLES[table];
  const key = getKeyField(table);

  if (headers.includes("id") && !data.id) data.id = makeId(table);
  if (table === "Settings" && !data.userId) data.userId = userId || makeId("USER");
  if (headers.includes("createdAt") && !data.createdAt) data.createdAt = nowIso();
  if (headers.includes("updatedAt")) data.updatedAt = nowIso();

  const existing = findRow(table, data[key]);
  if (existing.rowIndex !== -1) {
    return update(table, data[key], data, userId);
  }

  sheet.appendRow(headers.map(h => data[h] !== undefined ? data[h] : ""));
  audit(userId, "CREATE", table, data[key]);

  return jsonResponse({ ok: true, data });
}

function update(table, id, data, userId) {
  validateTable(table);

  const sheet = getSheet(table);
  const headers = getHeaders(sheet, table);
  const key = getKeyField(table);
  const found = findRow(table, id);

  if (found.rowIndex === -1) {
    return jsonResponse({ ok: false, error: "Registo não encontrado: " + id });
  }

  if (headers.includes("updatedAt")) data.updatedAt = nowIso();

  headers.forEach((h, colIndex) => {
    if (data[h] !== undefined) {
      sheet.getRange(found.rowIndex, colIndex + 1).setValue(data[h]);
    }
  });

  audit(userId, "UPDATE", table, id);

  return jsonResponse({ ok: true, id, data });
}

function upsert(table, id, data, userId) {
  validateTable(table);
  const key = getKeyField(table);

  if (!id) id = data[key] || data.id || data.userId;
  if (!id) {
    return create(table, data, userId);
  }

  data[key] = id;

  const found = findRow(table, id);
  if (found.rowIndex === -1) {
    return create(table, data, userId);
  }

  return update(table, id, data, userId);
}

function remove(table, id, userId) {
  validateTable(table);

  const sheet = getSheet(table);
  const found = findRow(table, id);

  if (found.rowIndex === -1) {
    return jsonResponse({ ok: false, error: "Registo não encontrado." });
  }

  sheet.deleteRow(found.rowIndex);
  audit(userId, "DELETE", table, id);

  return jsonResponse({ ok: true, id });
}

function login(email, password, type) {
  const users = readTable("Users");

  const user = users.find(u =>
    String(u.email).toLowerCase() === String(email).toLowerCase() &&
    String(u.password) === String(password) &&
    (!type || String(u.type) === String(type))
  );

  if (!user) return jsonResponse({ ok: false, error: "Login inválido." });

  delete user.password;

  return jsonResponse({ ok: true, user });
}

function getMessages(userId) {
  const data = readTable("Messages")
    .filter(m => String(m.senderId) === String(userId) || String(m.receiverId) === String(userId))
    .sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));

  return jsonResponse({ ok: true, data });
}

function sendMessage(data) {
  if (!data.senderId || !data.receiverId || !data.text) {
    return jsonResponse({ ok: false, error: "Mensagem incompleta." });
  }

  data.id = data.id || makeId("MSG");
  data.conversationId = data.conversationId || makeConversationId(data.senderId, data.receiverId);
  data.createdAt = data.createdAt || nowIso();
  data.read = data.read === true || data.read === "true" ? true : false;

  const created = create("Messages", data, data.senderId);

  create("Notifications", {
    id: makeId("NOTIF"),
    userId: data.receiverId,
    type: "message",
    title: "Nova mensagem",
    message: data.senderName + " enviou uma mensagem.",
    read: false,
    createdAt: nowIso()
  }, data.senderId);

  return created;
}

function getNotifications(userId) {
  const data = readTable("Notifications")
    .filter(n => String(n.userId) === String(userId))
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  return jsonResponse({ ok: true, data });
}

function markNotificationRead(notificationId) {
  return update("Notifications", notificationId, { read: true }, "");
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
      pendingInteractions: interactions.filter(i => ["Pendente","A acompanhar","Requer resposta"].includes(String(i.status))).length,
      unreadMessages: messages.filter(m => String(m.receiverId) === String(userId) && String(m.read) !== "true").length,
      unreadNotifications: notifications.filter(n => String(n.userId) === String(userId) && String(n.read) !== "true").length
    }
  });
}

function clientDashboard(clientId) {
  const clients = readTable("Clients");
  const interactions = readTable("Interactions");
  const contacts = readTable("ClientUsers");

  const client = clients.find(c => String(c.id) === String(clientId) || String(c.name) === String(clientId));
  if (!client) return jsonResponse({ ok: false, error: "Cliente não encontrado." });

  return jsonResponse({
    ok: true,
    client,
    contacts: contacts.filter(c => String(c.clientId) === String(client.id)),
    interactions: interactions.filter(i => String(i.clientId) === String(client.id) || String(i.clientName) === String(client.name))
  });
}

function readTable(table) {
  const sheet = getSheet(table);
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) return [];

  const headers = getHeaders(sheet, table);

  return values.slice(1)
    .filter(row => row.some(cell => cell !== ""))
    .map(row => rowToObject(headers, row));
}

function getSheet(table) {
  validateTable(table);

  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(table);

  if (!sheet) {
    sheet = ss.insertSheet(table);
  }

  ensureHeaders(sheet, table);

  return sheet;
}

function ensureHeaders(sheet, table) {
  const expected = TABLES[table];

  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.clear();
    sheet.appendRow(expected);
    styleHeader(sheet);
    return;
  }

  const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), expected.length)).getValues()[0];

  const missing = expected.filter(h => !current.includes(h));

  if (missing.length) {
    missing.forEach(h => {
      const col = sheet.getLastColumn() + 1;
      sheet.getRange(1, col).setValue(h);
    });
  }

  styleHeader(sheet);
}

function getHeaders(sheet, table) {
  ensureHeaders(sheet, table);
  const width = sheet.getLastColumn();
  return sheet.getRange(1, 1, 1, width).getValues()[0].filter(h => h !== "");
}

function findRow(table, id) {
  const sheet = getSheet(table);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const key = getKeyField(table);
  const idCol = headers.indexOf(key);

  if (idCol === -1) throw new Error("Tabela sem coluna " + key);

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      return { rowIndex: i + 1, row: values[i] };
    }
  }

  return { rowIndex: -1, row: null };
}

function getKeyField(table) {
  return table === "Settings" ? "userId" : "id";
}

function validateTable(table) {
  if (!TABLES[table]) throw new Error("Tabela inválida: " + table);
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
    if (tableName === "AuditLog") return;

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
  } catch (err) {}
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
