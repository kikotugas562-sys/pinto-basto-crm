/**
 * PINTO BASTO CRM — FIX INTERAÇÕES NÃO APARECEM NA APP
 *
 * Problema:
 * - A interação é guardada no Google Sheets.
 * - Mas a CRM Lista/Histórico não mostra.
 *
 * Causas corrigidas:
 * 1. Sheets usa `clientName`, app usa às vezes `client`.
 * 2. Sheets usa `createdAt`, app usa às vezes `date`.
 * 3. Depois de guardar, a app não fazia refresh local/render.
 * 4. Se o cliente já tinha Lead, a associação podia falhar por falta de clientId.
 */

function PB_interactionToast(msg) {
  if (typeof toast === "function") toast(msg);
  else if (typeof clientToast === "function") clientToast(msg);
  else console.log(msg);
}

function PB_getLocalClientsForInteraction() {
  try {
    const a = JSON.parse(localStorage.getItem("pb_clients_local_premium") || "[]");
    if (a.length) return a;
  } catch(e) {}

  try {
    return JSON.parse(localStorage.getItem("pb_clients_local") || "[]");
  } catch(e) {
    return [];
  }
}

function PB_saveLocalClientsForInteraction(clients) {
  localStorage.setItem("pb_clients_local_premium", JSON.stringify(clients));
  localStorage.setItem("pb_clients_local", JSON.stringify(clients));
}

function PB_getLocalInteractions() {
  try {
    const a = JSON.parse(localStorage.getItem("pb_interactions_local_premium") || "[]");
    if (a.length) return a;
  } catch(e) {}

  try {
    return JSON.parse(localStorage.getItem("pb_interactions_local") || "[]");
  } catch(e) {
    return [];
  }
}

function PB_saveLocalInteractions(interactions) {
  localStorage.setItem("pb_interactions_local_premium", JSON.stringify(interactions));
  localStorage.setItem("pb_interactions_local", JSON.stringify(interactions));
}

function PB_normalizeInteractionFromSheets(i) {
  return {
    id: i.id || ("I-" + Date.now()),
    clientId: i.clientId || "",
    client: i.client || i.clientName || "",
    clientName: i.clientName || i.client || "",
    type: i.type || "",
    ownerId: i.ownerId || "",
    owner: i.owner || i.ownerName || "",
    ownerName: i.ownerName || i.owner || "",
    status: i.status || "",
    channel: i.channel || "",
    contact: i.contact || "",
    followDate: i.followDate || "",
    summary: i.summary || "",
    transcript: i.transcript || "",
    audioUrl: i.audioUrl || "",
    origin: i.origin || "Pinto Basto CRM",
    date: i.date || i.createdAt || new Date().toISOString(),
    createdAt: i.createdAt || i.date || new Date().toISOString()
  };
}

function PB_findClientByName(name) {
  const clean = String(name || "").trim().toLowerCase();
  return PB_getLocalClientsForInteraction().find(c => String(c.name || "").trim().toLowerCase() === clean);
}

function PB_updateClientLastInteraction(clientName, date) {
  const clients = PB_getLocalClientsForInteraction();
  const clean = String(clientName || "").trim().toLowerCase();

  const idx = clients.findIndex(c => String(c.name || "").trim().toLowerCase() === clean);
  if (idx >= 0) {
    clients[idx].lastInteraction = date;
    clients[idx].updatedAt = new Date().toISOString();
    PB_saveLocalClientsForInteraction(clients);
  }
}

async function PB_pullInteractionsFromSheetsAndRender() {
  if (typeof SheetsDB === "undefined") return;

  const res = await SheetsDB.list("Interactions");
  const fromSheets = (res.data || []).map(PB_normalizeInteractionFromSheets);

  PB_saveLocalInteractions(fromSheets);

  // Atualiza lastInteraction dos clientes com base no histórico.
  fromSheets.forEach(i => {
    if (i.client || i.clientName) PB_updateClientLastInteraction(i.client || i.clientName, i.date || i.createdAt);
  });

  if (typeof renderAll === "function") renderAll();
  if (typeof renderPowerCRM === "function") renderPowerCRM();
  if (typeof renderPowerDetail === "function" && typeof selectedPowerClientId !== "undefined" && selectedPowerClientId) {
    try { renderPowerDetail(); } catch(e) {}
  }
}

async function PB_saveInteractionToSheetsAndRefresh(localInteraction) {
  if (typeof SheetsDB === "undefined") {
    PB_interactionToast("SheetsDB não carregado.");
    return;
  }

  const clientName =
    localInteraction.clientName ||
    localInteraction.client ||
    document.getElementById("meetingClient")?.value ||
    document.getElementById("quickClient")?.value ||
    "";

  const client = PB_findClientByName(clientName);

  const id = localInteraction.id || ("I-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6));
  const createdAt = localInteraction.createdAt || localInteraction.date || new Date().toISOString();

  const payload = {
    id,
    clientId: localInteraction.clientId || client?.id || "",
    clientName,
    type: localInteraction.type || document.getElementById("meetingType")?.value || document.getElementById("quickType")?.value || "Interação",
    ownerId: localInteraction.ownerId || (typeof me !== "undefined" && me ? (me.id || me.uid) : ""),
    ownerName: localInteraction.ownerName || localInteraction.owner || document.getElementById("meetingOwner")?.value || (typeof me !== "undefined" && me ? me.name : ""),
    status: localInteraction.status || document.getElementById("meetingStatus")?.value || "Concluída",
    channel: localInteraction.channel || document.getElementById("meetingChannel")?.value || "",
    contact: localInteraction.contact || document.getElementById("meetingContact")?.value || "",
    followDate: localInteraction.followDate || document.getElementById("followDate")?.value || "",
    summary: localInteraction.summary || document.getElementById("summary")?.value || document.getElementById("quickText")?.value || "",
    transcript: localInteraction.transcript || document.getElementById("transcript")?.value || document.getElementById("quickText")?.value || "",
    audioUrl: localInteraction.audioUrl || "",
    origin: localInteraction.origin || "Pinto Basto CRM",
    createdAt
  };

  await SheetsDB.upsert("Interactions", id, payload, payload.ownerId);

  // Guarda também localmente imediatamente para aparecer sem esperar refresh.
  const local = PB_normalizeInteractionFromSheets(payload);
  const interactions = PB_getLocalInteractions();
  const idx = interactions.findIndex(i => String(i.id) === String(local.id));
  if (idx >= 0) interactions[idx] = local;
  else interactions.unshift(local);

  PB_saveLocalInteractions(interactions);
  PB_updateClientLastInteraction(clientName, createdAt);

  if (typeof renderAll === "function") renderAll();
  if (typeof renderPowerCRM === "function") renderPowerCRM();
  if (typeof renderPowerDetail === "function" && typeof selectedPowerClientId !== "undefined" && selectedPowerClientId) {
    try { renderPowerDetail(); } catch(e) {}
  }

  PB_interactionToast("Interação guardada e atualizada na app.");
}

function PB_patchInteractionSaves() {
  // Patch guardar interação principal
  if (typeof saveInteraction === "function" && !saveInteraction.__PB_INTERACTION_SHOW_FIX) {
    const original = saveInteraction;

    saveInteraction = async function() {
      let before = PB_getLocalInteractions().length;

      try {
        original();
      } catch(e) {
        console.warn("Aviso saveInteraction local:", e);
      }

      let list = PB_getLocalInteractions();
      let last = list.length > before ? list[0] : {
        client: document.getElementById("meetingClient")?.value || "",
        type: document.getElementById("meetingType")?.value || "Interação",
        owner: document.getElementById("meetingOwner")?.value || "",
        status: document.getElementById("meetingStatus")?.value || "Concluída",
        summary: document.getElementById("summary")?.value || "",
        transcript: document.getElementById("transcript")?.value || "",
        date: new Date().toISOString()
      };

      try {
        await PB_saveInteractionToSheetsAndRefresh(last);
      } catch(err) {
        console.error(err);
        PB_interactionToast("Erro ao guardar interação no Sheets: " + err.message);
      }
    };

    saveInteraction.__PB_INTERACTION_SHOW_FIX = true;
  }

  // Patch interação rápida
  if (typeof saveQuickInteraction === "function" && !saveQuickInteraction.__PB_INTERACTION_SHOW_FIX) {
    const original = saveQuickInteraction;

    saveQuickInteraction = async function() {
      const clientName = document.getElementById("quickClient")?.value || "";
      const type = document.getElementById("quickType")?.value || "Interação";
      const text = document.getElementById("quickText")?.value || "";

      try {
        original();
      } catch(e) {
        console.warn("Aviso saveQuickInteraction local:", e);
      }

      const interaction = {
        id: "I-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        client: clientName,
        clientName,
        type,
        owner: typeof me !== "undefined" && me ? me.name : "",
        ownerName: typeof me !== "undefined" && me ? me.name : "",
        status: "Concluída",
        summary: text || "Interação rápida registada.",
        transcript: text,
        origin: "Power Apps CRM",
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      try {
        await PB_saveInteractionToSheetsAndRefresh(interaction);
      } catch(err) {
        console.error(err);
        PB_interactionToast("Erro ao guardar interação rápida no Sheets: " + err.message);
      }
    };

    saveQuickInteraction.__PB_INTERACTION_SHOW_FIX = true;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(PB_patchInteractionSaves, 1500);
  setTimeout(PB_patchInteractionSaves, 3500);

  // Ao abrir a app, puxa as interações do Sheets para a CRM Lista.
  setTimeout(() => {
    PB_pullInteractionsFromSheetsAndRender().catch(err => console.warn("Pull interactions falhou:", err.message));
  }, 2500);
});

window.PB_pullInteractionsFromSheetsAndRender = PB_pullInteractionsFromSheetsAndRender;
