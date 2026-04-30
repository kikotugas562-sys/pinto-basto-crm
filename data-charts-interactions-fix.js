/**
 * PINTO BASTO CRM — DADOS REAIS, GRÁFICOS, STATUS EM SHEETS E DETALHE DE INTERAÇÕES
 *
 * Corrige:
 * 1. Dashboard/gráficos com dados calculados.
 * 2. Estado do cliente guarda local + Google Sheets.
 * 3. Interações do CRM ficam clicáveis e mostram detalhe específico.
 */

const PB_CHART_STATUS = ["Ativo","Pendente","Em negociação","Inativo","Novo","Lead","Perdido"];
let PB_selectedInteractionDetailId = null;

function PB_cleanText(v){
  return String(v ?? "").trim();
}

function PB_getClientKey(c){
  return PB_cleanText(c.id || c.name);
}

function PB_getClientStatus(c){
  return PB_cleanText(c.status || "Novo");
}

function PB_getClientType(c){
  return PB_cleanText(c.type || "Cliente atual");
}

function PB_getClientCountry(c){
  return PB_cleanText(c.country || c.pais || "Não definido");
}

function PB_getClientNameFromInteraction(i){
  return PB_cleanText(i.client || i.clientName || i.clientNameText || "");
}

function PB_getInteractionDate(i){
  return i.date || i.createdAt || i.followDate || "";
}

function PB_getInteractionId(i){
  return PB_cleanText(i.id || i.date || i.createdAt || (PB_getClientNameFromInteraction(i)+"-"+PB_getInteractionDate(i)));
}

function PB_enhancedClientsSafe(){
  if(typeof enhancedClients === "function") return enhancedClients();
  if(typeof clients === "function") return clients();
  return [];
}

function PB_interactionsSafe(){
  if(typeof interactions === "function") return interactions();
  return [];
}

function PB_messagesSafe(){
  if(typeof chatMessages === "function") return chatMessages();
  return [];
}

function PB_countBy(items, getter){
  const out = {};
  items.forEach(item => {
    const key = getter(item) || "Não definido";
    out[key] = (out[key] || 0) + 1;
  });
  return out;
}

function PB_updateText(id, value){
  const el = document.getElementById(id);
  if(el) el.textContent = value;
}

function PB_renderBarChart(container, data, labelMap = {}){
  if(!container) return;
  const entries = Object.entries(data).filter(([k,v]) => v > 0);
  const max = Math.max(1, ...entries.map(([,v]) => v));

  container.innerHTML = entries.length ? entries.map(([key, val]) => {
    const pct = Math.max(8, Math.round((val / max) * 100));
    return `
      <p class="real-bar-row">
        <strong>${labelMap[key] || key}</strong>
        <span class="real-bar-track"><i style="width:${pct}%"></i></span>
        <em>${val}</em>
      </p>
    `;
  }).join("") : '<div class="empty">Sem dados suficientes.</div>';
}

function PB_renderAccurateDashboard(){
  const cls = PB_enhancedClientsSafe();
  const ints = PB_interactionsSafe();
  const msgs = PB_messagesSafe();

  PB_updateText("statClients", cls.length);
  PB_updateText("statInteractions", ints.length);
  PB_updateText("statMessages", msgs.length);
  PB_updateText("statUsers", typeof users === "function" ? users().length : 0);

  // Pipeline comercial baseado no estado real dos clientes.
  const byStatus = PB_countBy(cls, PB_getClientStatus);

  // Procura cards/gráficos existentes por título.
  document.querySelectorAll(".panel").forEach(panel => {
    const title = (panel.querySelector("h3")?.textContent || "").toLowerCase();

    if(title.includes("pipeline")){
      let box = panel.querySelector(".real-chart");
      if(!box){
        panel.querySelector(".bars")?.remove();
        box = document.createElement("div");
        box.className = "real-chart bars";
        panel.appendChild(box);
      }
      PB_renderBarChart(box, byStatus);
    }

    if(title.includes("interações por canal")){
      let box = panel.querySelector(".real-chart");
      if(!box){
        panel.querySelector(".bars")?.remove();
        box = document.createElement("div");
        box.className = "real-chart bars";
        panel.appendChild(box);
      }
      const byType = PB_countBy(ints, i => i.channel || i.type || "Interação");
      PB_renderBarChart(box, byType);
    }

    if(title.includes("prioridades")){
      // não mexe nas prioridades admin, só deixa como está.
    }
  });
}

async function PB_saveClientStatusToSheets(client){
  if(typeof SheetsDB === "undefined" || !client) return;

  const payload = {
    id: client.id || "",
    name: client.name || "",
    status: client.status || "",
    type: client.type || "",
    country: client.country || "",
    email: client.email || "",
    phone: client.phone || "",
    contact: client.contact || client.lead || "",
    lead: client.lead || client.contact || "",
    nif: client.nif || "",
    domain: client.domain || "",
    address: client.address || "",
    dynamics: client.dynamics || "",
    alertDays: client.alertDays || 30,
    lastInteraction: client.lastInteraction || "",
    notes: client.notes || "",
    updatedAt: new Date().toISOString()
  };

  try{
    if(client.id){
      await SheetsDB.upsert("Clients", client.id, payload, me?.id || me?.uid || "");
    }else{
      const res = await SheetsDB.list("Clients");
      const existing = (res.data || []).find(c =>
        String(c.name || "").trim().toLowerCase() === String(client.name || "").trim().toLowerCase()
      );
      if(existing?.id) await SheetsDB.update("Clients", existing.id, {...existing, ...payload, id:existing.id}, me?.id || me?.uid || "");
    }
  }catch(err){
    console.warn("Não foi possível guardar estado no Sheets:", err);
    if(typeof toast === "function") toast("Estado guardado localmente. Sheets não respondeu.");
  }
}

function PB_patchStatusSaveToDB(){
  const oldSetStatus = window.PB_setClientStatusFinal;
  window.PB_setClientStatusFinal = async function(status){
    const c = typeof getSelectedPowerClient === "function" ? getSelectedPowerClient() : null;

    if(c){
      c.status = status;
      if(typeof saveEnhancedClient === "function") saveEnhancedClient(c);
      await PB_saveClientStatusToSheets(c);
    }

    if(typeof oldSetStatus === "function"){
      oldSetStatus(status);
    }else{
      const select = document.getElementById("powerEstado");
      if(select) select.value = status;
      if(typeof renderPowerCRM === "function") renderPowerCRM();
      if(typeof renderPowerDetail === "function") renderPowerDetail();
    }

    PB_renderAccurateDashboard();
  };

  const oldSave = typeof savePowerClient === "function" ? savePowerClient : null;
  if(oldSave && !oldSave.__PB_DB_SAVE_PATCH){
    window.savePowerClient = async function(){
      oldSave();
      const c = typeof getSelectedPowerClient === "function" ? getSelectedPowerClient() : null;
      if(c) await PB_saveClientStatusToSheets(c);
      PB_renderAccurateDashboard();
    };
    window.savePowerClient.__PB_DB_SAVE_PATCH = true;
  }
}

function PB_interactionsForClient(client){
  const cname = PB_cleanText(client?.name).toLowerCase();
  const cid = PB_cleanText(client?.id);
  return PB_interactionsSafe().filter(i => {
    const iname = PB_getClientNameFromInteraction(i).toLowerCase();
    const iid = PB_cleanText(i.clientId);
    return (cid && iid && iid === cid) || (cname && iname === cname);
  });
}

function PB_renderInteractionDetailBox(){
  let box = document.getElementById("powerInteractionDetail");
  const historyTab = document.getElementById("powerTabHistory") || document.getElementById("powerTabHistorico");
  if(!historyTab) return null;

  if(!box){
    box = document.createElement("div");
    box.id = "powerInteractionDetail";
    box.className = "interaction-detail-box";
    historyTab.prepend(box);
  }

  return box;
}

function PB_showInteractionDetail(interactionId){
  PB_selectedInteractionDetailId = interactionId;
  const item = PB_interactionsSafe().find(i => PB_getInteractionId(i) === interactionId);
  const box = PB_renderInteractionDetailBox();
  if(!box || !item) return;

  const date = PB_getInteractionDate(item);
  box.innerHTML = `
    <div class="interaction-detail-head">
      <div>
        <strong>${PB_escape(item.type || item.channel || "Interação")}</strong>
        <span>${date ? new Date(date).toLocaleString("pt-PT") : "Sem data"}</span>
      </div>
      <button onclick="PB_closeInteractionDetail()">Fechar</button>
    </div>
    <div class="interaction-detail-grid">
      <p><b>Cliente:</b> ${PB_escape(PB_getClientNameFromInteraction(item) || item.clientId || "-")}</p>
      <p><b>Responsável:</b> ${PB_escape(item.owner || item.ownerName || "-")}</p>
      <p><b>Estado:</b> ${PB_escape(item.status || "-")}</p>
      <p><b>Canal:</b> ${PB_escape(item.channel || item.type || "-")}</p>
      <p><b>Contacto:</b> ${PB_escape(item.contact || "-")}</p>
      <p><b>Origem:</b> ${PB_escape(item.origin || "-")}</p>
    </div>
    <div class="interaction-detail-text">
      <h4>Resumo</h4>
      <p>${PB_escape(item.summary || "Sem resumo.")}</p>
      <h4>Transcrição / notas</h4>
      <p>${PB_escape(item.transcript || item.notes || "Sem transcrição.")}</p>
    </div>
  `;

  document.querySelectorAll(".power-history-card").forEach(card => {
    card.classList.toggle("selected", card.dataset.interactionId === interactionId);
  });
}

function PB_closeInteractionDetail(){
  PB_selectedInteractionDetailId = null;
  const box = document.getElementById("powerInteractionDetail");
  if(box) box.innerHTML = "";
  document.querySelectorAll(".power-history-card").forEach(card => card.classList.remove("selected"));
}

function PB_escape(v){
  return String(v ?? "").replace(/[&<>"']/g, s => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[s]));
}

function PB_patchInteractionHistoryDetail(){
  const oldRenderPowerHistory = typeof renderPowerHistory === "function" ? renderPowerHistory : null;
  if(!oldRenderPowerHistory || oldRenderPowerHistory.__PB_DETAIL_PATCH) return;

  window.renderPowerHistory = function(c){
    const list = PB_interactionsForClient(c);
    const target = document.getElementById("powerHistoryList");
    if(!target) return oldRenderPowerHistory(c);

    PB_renderInteractionDetailBox();

    target.innerHTML = list.length ? list.map(i => {
      const id = PB_getInteractionId(i);
      const date = PB_getInteractionDate(i);
      return `
        <div class="power-history-card interaction-click-card" data-interaction-id="${PB_escape(id)}" onclick="PB_showInteractionDetail('${PB_escape(id)}')">
          <strong>${PB_escape(i.type || i.channel || "Interação")} · ${date ? new Date(date).toLocaleString("pt-PT") : "Sem data"}</strong>
          <span>Origem: ${PB_escape(i.origin || "Pinto Basto CRM")}</span>
          <span>Responsável: ${PB_escape(i.owner || i.ownerName || "-")} · Estado: ${PB_escape(i.status || "-")}</span>
          <p>${PB_escape(i.summary || i.transcript || "Clica para ver os detalhes desta interação.")}</p>
          <button onclick="event.stopPropagation(); deletePowerInteraction('${PB_escape(date)}')">Apagar</button>
        </div>
      `;
    }).join("") : '<div class="empty">Sem interações para este cliente.</div>';

    if(PB_selectedInteractionDetailId){
      setTimeout(() => PB_showInteractionDetail(PB_selectedInteractionDetailId), 0);
    }
  };

  window.renderPowerHistory.__PB_DETAIL_PATCH = true;
}

function PB_patchRenderAllCharts(){
  const oldRenderAll = typeof renderAll === "function" ? renderAll : null;
  if(oldRenderAll && !oldRenderAll.__PB_CHART_PATCH){
    window.renderAll = function(){
      oldRenderAll();
      PB_renderAccurateDashboard();
    };
    window.renderAll.__PB_CHART_PATCH = true;
  }
}

function PB_installDataChartsInteractionsPatch(){
  PB_patchStatusSaveToDB();
  PB_patchInteractionHistoryDetail();
  PB_patchRenderAllCharts();
  PB_renderAccurateDashboard();
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(PB_installDataChartsInteractionsPatch, 500);
  setTimeout(PB_installDataChartsInteractionsPatch, 1500);
  setTimeout(PB_renderAccurateDashboard, 2500);
});
