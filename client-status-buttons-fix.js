/**
 * PINTO BASTO CRM — STATUS CLIENTE FIX DEFINITIVO
 *
 * O select nativo estava a ficar preso/sem mostrar opções.
 * Agora há botões visíveis para mudar o estado do cliente.
 */

const PB_STATUS_VALUES_FINAL = [
  "Lead",
  "Novo",
  "Pendente",
  "Em negociação",
  "Ativo",
  "Inativo",
  "Perdido"
];

function PB_statusEscapeFinal(v){
  return String(v ?? "").replace(/[&<>"']/g, s => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[s]));
}

function PB_statusClassFinal(v){
  const s = String(v || "").toLowerCase();
  if(s.includes("ativo")) return "green";
  if(s.includes("negociação") || s.includes("pendente") || s.includes("lead") || s.includes("novo")) return "yellow";
  if(s.includes("inativo") || s.includes("perdido")) return "red";
  return "";
}

function PB_ensureStatusUIFinal(){
  const select = document.getElementById("powerEstado");
  if(!select) return;

  const current = select.value || "Pendente";
  const options = [...new Set([current, ...PB_STATUS_VALUES_FINAL].filter(Boolean))];

  // Reconstrói o select sempre com todas as opções.
  select.innerHTML = options.map(v => `<option value="${PB_statusEscapeFinal(v)}">${PB_statusEscapeFinal(v)}</option>`).join("");
  select.value = current;

  // O dropdown fica escondido. Os botões são a única forma visível de mudar estado.
  select.classList.add("hidden-status-select");
  select.setAttribute("tabindex", "-1");
  select.setAttribute("aria-hidden", "true");

  let box = document.getElementById("powerEstadoButtons");
  if(!box){
    box = document.createElement("div");
    box.id = "powerEstadoButtons";
    box.className = "status-buttons";
    select.insertAdjacentElement("afterend", box);
  }

  box.innerHTML = PB_STATUS_VALUES_FINAL.map(v => `
    <button type="button"
      class="status-choice ${PB_statusClassFinal(v)} ${v === current ? "active" : ""}"
      onclick="PB_setClientStatusFinal('${PB_statusEscapeFinal(v)}')">
      ${PB_statusEscapeFinal(v)}
    </button>
  `).join("");
}

function PB_setClientStatusFinal(status){
  const select = document.getElementById("powerEstado");
  if(!select) return;

  select.value = status;
  PB_ensureStatusUIFinal();

  // Atualiza imediatamente o cliente selecionado na memória local.
  try{
    if(typeof getSelectedPowerClient === "function" && typeof saveEnhancedClient === "function"){
      const c = getSelectedPowerClient();
      if(c){
        c.status = status;
        saveEnhancedClient(c);
        if(typeof renderPowerCRM === "function") renderPowerCRM();
        if(typeof renderPowerDetail === "function") renderPowerDetail();
      }
    }
  }catch(e){
    console.warn("Status auto-save aviso:", e);
  }

  if(typeof toast === "function") toast("Estado alterado para: " + status);
}

function PB_installStatusFinalFix(){
  if(window.__PB_STATUS_FINAL_FIX__) return;
  window.__PB_STATUS_FINAL_FIX__ = true;

  const originalRenderPowerDetail = typeof renderPowerDetail === "function" ? renderPowerDetail : null;
  if(originalRenderPowerDetail){
    window.renderPowerDetail = function(){
      originalRenderPowerDetail();
      setTimeout(PB_ensureStatusUIFinal, 0);
    };
  }

  const originalSavePowerClient = typeof savePowerClient === "function" ? savePowerClient : null;
  if(originalSavePowerClient){
    window.savePowerClient = function(){
      PB_ensureStatusUIFinal();
      originalSavePowerClient();
      setTimeout(PB_ensureStatusUIFinal, 50);
    };
  }

  PB_ensureStatusUIFinal();
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(PB_installStatusFinalFix, 300);
  setTimeout(PB_installStatusFinalFix, 1300);
  setTimeout(PB_ensureStatusUIFinal, 2000);
});
