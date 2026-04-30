/**
 * PINTO BASTO CRM — FIX ESTADO CLIENTE
 * Garante que o dropdown "Estado Cliente" tem sempre todas as opções,
 * mesmo quando algum render antigo deixa só a opção atual.
 */
const PB_CLIENT_STATUS_OPTIONS = [
  "Lead",
  "Novo",
  "Pendente",
  "Em negociação",
  "Ativo",
  "Inativo",
  "Cliente atual",
  "Cliente antigo",
  "Perdido",
  "Parceiro",
  "Fornecedor"
];

function PB_fixClientStatusSelect(selectedValue){
  const select = document.getElementById("powerEstado");
  if(!select) return;

  const current = selectedValue || select.value || "Pendente";
  const options = [...new Set([current, ...PB_CLIENT_STATUS_OPTIONS].filter(Boolean))];

  select.innerHTML = options.map(v => `<option value="${PB_escapeStatus(v)}">${PB_escapeStatus(v)}</option>`).join("");
  select.value = current;
}

function PB_escapeStatus(v){
  return String(v ?? "").replace(/[&<>"']/g, s => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[s]));
}

function PB_installStatusFix(){
  if(window.__PB_STATUS_FIX__) return;
  window.__PB_STATUS_FIX__ = true;

  const originalRenderPowerDetail = typeof renderPowerDetail === "function" ? renderPowerDetail : null;
  if(originalRenderPowerDetail){
    window.renderPowerDetail = function(){
      originalRenderPowerDetail();
      try{
        const c = typeof getSelectedPowerClient === "function" ? getSelectedPowerClient() : null;
        PB_fixClientStatusSelect(c?.status);
      }catch(e){
        PB_fixClientStatusSelect();
      }
    };
  }

  const originalSavePowerClient = typeof savePowerClient === "function" ? savePowerClient : null;
  if(originalSavePowerClient){
    window.savePowerClient = function(){
      PB_fixClientStatusSelect();
      originalSavePowerClient();
      setTimeout(() => PB_fixClientStatusSelect(), 50);
    };
  }

  PB_fixClientStatusSelect();
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(PB_installStatusFix, 300);
  setTimeout(() => {
    PB_installStatusFix();
    PB_fixClientStatusSelect();
  }, 1200);
});
