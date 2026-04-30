let clientMe = null;
let selectedEmployee = null;

const CLIENT_MESSAGES_KEY = "pb_client_employee_messages";

document.addEventListener("DOMContentLoaded", () => {
  clientMe = requireClientLogin();
  if(!clientMe) return;
  ensureEmployeeDemoUsers();
  fillClientProfile();
  renderTeam();
  renderClientTeamList();
  applyClientTheme();
});

function ensureEmployeeDemoUsers(){
  let employees = getUsers();
  const demo = [
    {uid:"PB-DEMO-001",email:"marta@pintobasto.pt",password:"1234",name:"Marta Silva",role:"Gestora Comercial",department:"Comercial",appRole:"Administrador",phone:"+351 210 000 001",office:"Portugal - Lisboa"},
    {uid:"PB-DEMO-002",email:"ricardo@pintobasto.pt",password:"1234",name:"Ricardo Mendes",role:"Gestor de Operações",department:"Operações",appRole:"Gestor",phone:"+351 210 000 002",office:"Portugal - Porto"},
    {uid:"PB-DEMO-003",email:"ines@pintobasto.pt",password:"1234",name:"Inês Duarte",role:"Coordenadora de Suporte",department:"Suporte",appRole:"Colaborador",phone:"+351 210 000 003",office:"Portugal - Lisboa"}
  ];
  demo.forEach(d => { if(!employees.some(e => e.uid === d.uid || e.email === d.email)) employees.push(d); });
  saveUsers(employees);
}

function clientMessages(){
  return JSON.parse(localStorage.getItem(CLIENT_MESSAGES_KEY) || "[]");
}
function saveClientMessages(v){
  localStorage.setItem(CLIENT_MESSAGES_KEY, JSON.stringify(v));
}

function showClientPage(id){
  document.querySelectorAll(".client-page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if(id === "equipa") renderTeam();
  if(id === "chat") renderClientTeamList();
}

function clientToast(msg){
  const t = document.getElementById("clientToast");
  t.textContent = msg;
  t.style.display = "block";
  setTimeout(() => t.style.display = "none", 2400);
}

function fillClientProfile(){
  clientLine.textContent = `${clientMe.name} · ${clientMe.company} · ID ${clientMe.uid}`;
  profileClientName.textContent = clientMe.name;
  profileClientCompany.textContent = clientMe.company;
  profileClientId.textContent = clientMe.uid;
  profileClientType.textContent = clientMe.type;
  setClientName.value = clientMe.name;
  setClientCompany.value = clientMe.company;
  setClientRole.value = clientMe.role;
  setClientPhone.value = clientMe.phone || "";
  setClientCountry.value = clientMe.country || "";
  setClientType.value = clientMe.type || "Cliente atual";
  setClientNotifications.checked = clientMe.notifications !== false;
  setClientTheme.value = clientMe.theme || "classic";
}

function team(){
  return getUsers();
}

function renderTeam(){
  const q = (document.getElementById("teamSearch")?.value || "").toLowerCase();
  teamGrid.innerHTML = team().filter(u => Object.values(u).join(" ").toLowerCase().includes(q)).map(u => `
    <article class="team-card">
      <h3>${u.name}</h3>
      <p><b>Cargo:</b> ${u.role}</p>
      <p><b>Departamento:</b> ${u.department}</p>
      <p><b>Email:</b> ${u.email}</p>
      <p><b>Telefone:</b> ${u.phone || "-"}</p>
      <small>ID: ${u.uid}</small>
      <button onclick="selectEmployeeFromCard('${u.uid}')">Enviar mensagem</button>
    </article>
  `).join("");
}

function renderClientTeamList(){
  clientTeamList.innerHTML = team().map(u => `
    <div class="user-item ${selectedEmployee && selectedEmployee.uid === u.uid ? "active" : ""}" onclick="selectEmployee('${u.uid}')">
      <strong>${u.name}</strong>
      <span>${u.role} · ${u.department}</span>
      <small>${u.email}</small>
      <small>ID: ${u.uid}</small>
    </div>
  `).join("");
}

function selectEmployeeFromCard(uid){
  showClientPage("chat");
  selectEmployee(uid);
}

function selectEmployee(uid){
  selectedEmployee = team().find(u => u.uid === uid);
  if(!selectedEmployee) return;
  clientChatName.textContent = selectedEmployee.name;
  clientChatMeta.textContent = `${selectedEmployee.email} · ${selectedEmployee.role}`;
  renderClientTeamList();
  renderClientMessages();
}

function convId(a,b){ return [a,b].sort().join("_"); }

function renderClientMessages(){
  if(!selectedEmployee){
    clientMessages.innerHTML = '<div class="empty">Seleciona alguém da empresa.</div>';
    return;
  }

  const id = convId(clientMe.uid, selectedEmployee.uid);
  const list = clientMessages().filter(m => m.conv === id);

  clientMessages.innerHTML = list.length ? list.map(m => `
    <div class="message ${m.sender === clientMe.uid ? "mine" : "other"}">
      <strong>${m.senderName}</strong>
      <p>${escapeHtml(m.text)}</p>
      <small>${new Date(m.date).toLocaleString("pt-PT")}</small>
    </div>
  `).join("") : '<div class="empty">Sem mensagens. Escreve a primeira.</div>';

  clientMessages.scrollTop = clientMessages.scrollHeight;
}

function sendClientMessage(){
  if(!selectedEmployee) return clientToast("Seleciona uma pessoa da empresa.");
  const text = clientMessageText.value.trim();
  if(!text) return;

  const list = clientMessages();
  list.push({
    conv: convId(clientMe.uid, selectedEmployee.uid),
    sender: clientMe.uid,
    senderName: clientMe.name,
    receiver: selectedEmployee.uid,
    receiverName: selectedEmployee.name,
    text,
    date: new Date().toISOString()
  });
  saveClientMessages(list);
  clientMessageText.value = "";
  renderClientMessages();
  clientToast("Mensagem enviada.");
}

function saveClientSettings(){
  let users = clientUsers();
  const idx = users.findIndex(u => u.uid === clientMe.uid);
  clientMe = {
    ...clientMe,
    name:setClientName.value,
    company:setClientCompany.value,
    role:setClientRole.value,
    phone:setClientPhone.value,
    country:setClientCountry.value,
    type:setClientType.value,
    notifications:setClientNotifications.checked,
    theme:setClientTheme.value
  };
  if(idx >= 0) users[idx] = {...users[idx], ...clientMe};
  saveClientUsers(users);
  setClientSession(clientMe);
  fillClientProfile();
  applyClientTheme();
  clientToast("Definições guardadas.");
}

function applyClientThemePreview(){
  clientMe.theme = setClientTheme.value;
  applyClientTheme();
}

function applyClientTheme(){
  document.body.classList.remove("theme-premium","theme-light");
  if((clientMe.theme || "classic") !== "classic"){
    document.body.classList.add("theme-" + clientMe.theme);
  }
}

function escapeHtml(s){
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}




/* ===========================
   CHAT INTERLIGADO CLIENTE <-> OPERADOR
   =========================== */
const UNIFIED_MESSAGES_KEY_CLIENT = "pb_unified_messages";

function unifiedClientMessages(){
  return JSON.parse(localStorage.getItem(UNIFIED_MESSAGES_KEY_CLIENT) || "[]");
}
function saveUnifiedClientMessages(list){
  localStorage.setItem(UNIFIED_MESSAGES_KEY_CLIENT, JSON.stringify(list));
}
function clientChatConvId(a,b){
  return [a,b].sort().join("__");
}

renderClientTeamList = function(){
  const employees = team();
  const el = document.getElementById("clientTeamList");
  if(!el) return;

  el.innerHTML = employees.length ? employees.map(u => `
    <div class="user-item ${selectedEmployee && selectedEmployee.uid === u.uid ? "active" : ""}" onclick="selectEmployee('${u.uid}')">
      <strong>${u.name}</strong>
      <span>${u.role} · ${u.department}</span>
      <small>${u.email}</small>
      <small>ID: ${u.uid}</small>
    </div>
  `).join("") : '<div class="empty">Ainda não existem contas da empresa.</div>';
}

selectEmployee = function(uid){
  selectedEmployee = team().find(u => u.uid === uid);
  if(!selectedEmployee) return;
  clientChatName.textContent = selectedEmployee.name;
  clientChatMeta.textContent = `${selectedEmployee.email} · ${selectedEmployee.role} · histórico interligado`;
  renderClientTeamList();
  renderClientMessages();
}

renderClientMessages = function(){
  if(!selectedEmployee){
    clientMessages.innerHTML = '<div class="empty">Seleciona alguém da empresa.</div>';
    return;
  }

  const id = clientChatConvId(clientMe.uid, selectedEmployee.uid);
  const list = unifiedClientMessages().filter(m => m.conv === id);

  clientMessages.innerHTML = list.length ? list.map(m => `
    <div class="message ${m.sender === clientMe.uid ? "mine" : "other"}">
      <strong>${escapeHtml(m.senderName)}</strong>
      <p>${escapeHtml(m.text)}</p>
      <small>${new Date(m.date).toLocaleString("pt-PT")}</small>
    </div>
  `).join("") : '<div class="empty">Sem mensagens. Escreve a primeira.</div>';

  clientMessages.scrollTop = clientMessages.scrollHeight;
}

sendClientMessage = function(){
  if(!selectedEmployee) return clientToast("Seleciona uma pessoa da empresa.");
  const input = document.getElementById("clientMessageText");
  const text = input.value.trim();
  if(!text) return;

  const list = unifiedClientMessages();
  list.push({
    id: Date.now() + "-" + Math.random().toString(36).slice(2),
    conv: clientChatConvId(clientMe.uid, selectedEmployee.uid),
    sender: clientMe.uid,
    senderName: clientMe.name,
    senderType: "client",
    receiver: selectedEmployee.uid,
    receiverName: selectedEmployee.name,
    receiverType: "operator",
    text,
    date: new Date().toISOString(),
    read:false
  });
  saveUnifiedClientMessages(list);
  input.value = "";
  renderClientMessages();
  clientToast("Mensagem enviada.");
}
