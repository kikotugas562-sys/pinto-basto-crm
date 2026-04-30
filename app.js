
let me = null, selectedUser = null, audioBlob = null, recorder = null, chunks = [], speaker = "Operador";
const POWER_STATUS_OPTIONS = ["Lead","Novo","Pendente","Em negociação","Ativo","Inativo","Cliente atual","Cliente antigo","Perdido","Parceiro","Fornecedor"];
const CLIENTS_KEY = "pb_clients_local_premium", INTERACTIONS_KEY = "pb_interactions_local_premium", MESSAGES_KEY = "pb_unified_messages", PRIORITIES_KEY = "pb_admin_priorities";
let defaultClients = [
{name:"Atlântico Logistics", status:"Ativo", country:"Portugal", email:"geral@atlantico.pt", contact:"João Ferreira", notes:"Cliente estratégico com operações regulares de importação e transporte marítimo."},
{name:"Costa & Filhos Exportação", status:"Em negociação", country:"Espanha", email:"ana@costafilhos.es", contact:"Ana Costa", notes:"Potencial cliente para armazenagem e operação internacional."},
{name:"Santos Marine Services", status:"Pendente", country:"Angola", email:"miguel@santosmarine.ao", contact:"Miguel Santos", notes:"A aguardar documentação para parceria regional."},
{name:"Madeira Cargo Solutions", status:"Ativo", country:"Portugal", email:"cargo@madeira.pt", contact:"Sofia Almeida", notes:"Envios regulares para ilhas e acompanhamento mensal."},
{name:"Maputo Trade Hub", status:"Ativo", country:"Moçambique", email:"hub@maputotrade.mz", contact:"Carlos Muchanga", notes:"Fornecedor local para apoio operacional."}
];
document.addEventListener("DOMContentLoaded", () => { me = requireLogin(); if(!me) return; ensureData(); fillProfile(); renderAll(); });
function ensureData(){ if(!localStorage.getItem(CLIENTS_KEY)) localStorage.setItem(CLIENTS_KEY, JSON.stringify(defaultClients)); if(!localStorage.getItem(INTERACTIONS_KEY)) localStorage.setItem(INTERACTIONS_KEY, JSON.stringify([])); if(!localStorage.getItem(MESSAGES_KEY)) localStorage.setItem(MESSAGES_KEY, JSON.stringify([])); if(!localStorage.getItem(PRIORITIES_KEY)) localStorage.setItem(PRIORITIES_KEY, JSON.stringify(["Enviar proposta Atlântico Logistics","Confirmar documentação Santos Marine","Agendar chamada Costa & Filhos"])); }
function users(){ return getUsers(); } function clients(){ return JSON.parse(localStorage.getItem(CLIENTS_KEY)||"[]"); } function saveClients(v){ localStorage.setItem(CLIENTS_KEY,JSON.stringify(v)); } function interactions(){ return JSON.parse(localStorage.getItem(INTERACTIONS_KEY)||"[]"); } function saveInteractions(v){ localStorage.setItem(INTERACTIONS_KEY,JSON.stringify(v)); } function chatMessages(){ return JSON.parse(localStorage.getItem(MESSAGES_KEY)||"[]"); } function saveChatMessages(v){ localStorage.setItem(MESSAGES_KEY,JSON.stringify(v)); }
function showPage(id){ document.querySelectorAll(".page").forEach(p=>p.classList.remove("active")); document.getElementById(id).classList.add("active"); if(id==="chat") renderUsers(); window.scrollTo({top:0,behavior:"smooth"}); }
function toggleNav(){ nav.classList.toggle("show"); } function toast(msg){ const t=toastEl(); t.textContent=msg; t.style.display="block"; setTimeout(()=>t.style.display="none",2400); } function toastEl(){return document.getElementById("toast")}
function fillProfile(){ userLine.textContent = `${me.name} · ${me.role} · ID ${me.uid}`; meetingOwner.value = me.name; setName.value = me.name; setRole.value = me.role; setDepartment.value = me.department; setPhone.value = me.phone || ""; setOffice.value = me.office || ""; setAppRole.value = me.appRole || "Colaborador"; }
function renderAll(){ renderClients(); fillMeetingClients(); renderUsers(); renderPriorities(); statClients.textContent=clients().length; statInteractions.textContent=interactions().length; statMessages.textContent=chatMessages().length; statUsers.textContent=users().length; }
function renderClients(){ const q=(clientSearch?.value||"").toLowerCase(); clientGrid.innerHTML = clients().filter(c=>Object.values(c).join(" ").toLowerCase().includes(q)).map(c=>`<article class="client-card"><h3>${c.name}</h3><p><b>Estado:</b> ${c.status}</p><p><b>País:</b> ${c.country}</p><p><b>Email:</b> ${c.email}</p><p><b>Contacto:</b> ${c.contact}</p><p>${c.notes}</p><button onclick="startMeeting('${c.name}')">Nova interação</button></article>`).join(""); }
function addClient(){ const name=prompt("Nome do cliente:"); if(!name) return; const list=clients(); list.push({name,status:"Novo",country:"Portugal",email:"-",contact:"-",notes:"Criado manualmente."}); saveClients(list); renderAll(); toast("Cliente criado."); }
function fillMeetingClients(){ meetingClient.innerHTML = clients().map(c=>`<option>${c.name}</option>`).join(""); } function startMeeting(name){ showPage("reuniao"); meetingClient.value=name; }
async function startRecording(){ try{ const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}}); recorder=new MediaRecorder(stream); chunks=[]; recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)}; recorder.onstop=()=>{audioBlob=new Blob(chunks,{type:"audio/webm"}); audio.src=URL.createObjectURL(audioBlob); stream.getTracks().forEach(t=>t.stop()); audioInfo.textContent="Áudio pronto para ouvir."; recordStatus.textContent="Gravado";}; recorder.start(); recordStatus.textContent="A gravar..."; }catch(e){toast("Permite o microfone no Chrome.")} }
function stopRecording(){ if(recorder&&recorder.state!=="inactive") recorder.stop(); } function playAudio(){ if(!audio.src)return toast("Ainda não existe áudio."); audio.currentTime=0; audio.play(); }
function setSpeaker(s){ speaker=s; operatorBtn.classList.toggle("selected",s==="Operador"); clientBtn.classList.toggle("selected",s==="Cliente"); } function addManualLine(){ const t=prompt("O que foi dito?"); if(t) transcript.value += `${speaker}: ${t}\n`; }
function generateSummary(){ const t=transcript.value.toLowerCase(); let topics=[]; if(t.includes("preço")||t.includes("orçamento")) topics.push("preços/orçamento"); if(t.includes("envio")||t.includes("transporte")) topics.push("envio/transporte"); if(!topics.length) topics.push("acompanhamento comercial"); summary.value=`Resumo da reunião:\n- Cliente: ${meetingClient.value}\n- Tipo: ${meetingType.value}\n- Temas: ${topics.join(", ")}\n- Estado: ${meetingStatus.value}\n- Próximo passo: acompanhar o cliente.`; }
function saveInteraction(){ const list=interactions(); list.unshift({date:new Date().toISOString(),client:meetingClient.value,type:meetingType.value,owner:meetingOwner.value,status:meetingStatus.value,summary:summary.value,audio:!!audioBlob}); saveInteractions(list); renderAll(); toast("Interação guardada."); }
function exportTXT(){ const blob=new Blob([transcript.value+"\n\n"+summary.value],{type:"text/plain"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="reuniao-pinto-basto.txt"; a.click(); }
function renderUsers(){ const list=users().filter(u=>u.uid!==me.uid); usersList.innerHTML=list.length?list.map(u=>`<div class="user-item ${selectedUser&&selectedUser.uid===u.uid?'active':''}" onclick="selectUser('${u.uid}')"><strong>${u.name}</strong><span>${u.role} · ${u.department}</span><small>ID: ${u.uid}</small><small>${u.email}</small></div>`).join(""):'<div class="empty">Cria outra conta para testar.</div>'; }
function selectUser(uid){ selectedUser=users().find(u=>u.uid===uid); chatName.textContent=selectedUser.name; chatMeta.textContent=selectedUser.email+" · ID "+selectedUser.uid; renderUsers(); renderMessages(); } function convId(a,b){return [a,b].sort().join("_")}
function renderMessages(){ if(!selectedUser){messages.innerHTML='<div class="empty">Seleciona um utilizador.</div>';return} const id=convId(me.uid,selectedUser.uid); const list=chatMessages().filter(m=>m.conv===id); messages.innerHTML=list.length?list.map(m=>`<div class="message ${m.sender===me.uid?'mine':'other'}"><strong>${m.senderName}</strong><p>${escapeHtml(m.text)}</p><small>${new Date(m.date).toLocaleString("pt-PT")}</small></div>`).join(""):'<div class="empty">Sem mensagens.</div>'; messages.scrollTop=messages.scrollHeight; }
function sendMessage(){ if(!selectedUser)return toast("Seleciona um utilizador."); const text=messageText.value.trim(); if(!text)return; const list=chatMessages(); list.push({conv:convId(me.uid,selectedUser.uid),sender:me.uid,senderName:me.name,receiver:selectedUser.uid,text,date:new Date().toISOString()}); saveChatMessages(list); messageText.value=""; renderMessages(); renderAll(); }
function saveSettings(){ let all=users(); const idx=all.findIndex(u=>u.uid===me.uid); me={...me,name:setName.value,role:setRole.value,department:setDepartment.value,phone:setPhone.value,office:setOffice.value,appRole:setAppRole.value}; if(idx>=0)all[idx]={...all[idx],...me}; saveUsers(all); setSession(me); fillProfile(); toast("Definições guardadas."); }
function escapeHtml(s){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")}




/* ===========================
   INTERAÇÕES + ÁUDIO PRO
   =========================== */

let speechRecognition = null;
let isSpeechRunning = false;
let activeSpeaker = "Pessoa 1";
let speechItems = [];
let lastSpeechTime = 0;
let speakerIndex = 1;
let maxAutoSpeakers = 3;
let timerInterval = null;
let startedAt = null;
let audioContext = null;
let analyser = null;
let meterAnimation = null;

function setSpeaker(s){
  activeSpeaker = s;
  speaker = s;
  if(document.getElementById("operatorBtn")) operatorBtn.classList.toggle("selected",s==="Operador");
  if(document.getElementById("clientBtn")) clientBtn.classList.toggle("selected",s==="Cliente");
  if(document.getElementById("speakerState")) speakerState.textContent = s;
}

function setupSpeechRecognition(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;

  const rec = new SR();
  rec.lang = "pt-PT";
  rec.continuous = true;
  rec.interimResults = false;

  rec.onstart = () => {
    isSpeechRunning = true;
    if(document.getElementById("speechState")) speechState.textContent = "Ativa";
  };

  rec.onend = () => {
    isSpeechRunning = false;
    if(document.getElementById("speechState")) speechState.textContent = "Parada";
    if(recorder && recorder.state === "recording" && document.getElementById("autoTranscribe")?.checked){
      try { rec.start(); } catch(e){}
    }
  };

  rec.onerror = () => {
    if(document.getElementById("speechState")) speechState.textContent = "Erro";
  };

  rec.onresult = (event) => {
    for(let i=event.resultIndex; i<event.results.length; i++){
      if(event.results[i].isFinal){
        const text = event.results[i][0].transcript.trim();
        if(text) addSpeechLine(autoDetectSpeaker(), text, "voz");
      }
    }
  };

  return rec;
}

function autoDetectSpeaker(){
  if(!document.getElementById("autoSpeaker")?.checked){
    return activeSpeaker;
  }

  const now = Date.now();
  const pause = now - lastSpeechTime;

  if(lastSpeechTime && pause > 2300){
    speakerIndex++;
    if(speakerIndex > maxAutoSpeakers) speakerIndex = 1;
  }

  lastSpeechTime = now;
  activeSpeaker = "Pessoa " + speakerIndex;
  speaker = activeSpeaker;
  if(document.getElementById("speakerState")) speakerState.textContent = activeSpeaker;
  return activeSpeaker;
}

function addSpeechLine(who, text, type="manual"){
  const item = {
    id: Date.now() + Math.random(),
    time: new Date().toLocaleTimeString("pt-PT"),
    speaker: who,
    text,
    type
  };

  speechItems.push(item);
  renderSpeechItems();
  updateTranscriptFromSpeech();
}

function renderSpeechItems(){
  const box = document.getElementById("speechCards");
  const table = document.getElementById("sessionTable");
  if(!box || !table) return;

  if(!speechItems.length){
    box.innerHTML = '<div class="empty">As falas vão aparecer aqui automaticamente.</div>';
    table.innerHTML = "";
    return;
  }

  box.innerHTML = speechItems.map(item => `
    <div class="speech-card">
      <div>
        <strong>${escapeHtml(item.speaker)}</strong>
        <small>${item.time}</small>
      </div>
      <p>${escapeHtml(item.text)}</p>
      <select onchange="changeSpeechSpeaker('${item.id}', this.value)">
        ${["Operador","Cliente","Pessoa 1","Pessoa 2","Pessoa 3","Pessoa 4"].map(s => `<option ${s===item.speaker?'selected':''}>${s}</option>`).join("")}
      </select>
    </div>
  `).join("");

  table.innerHTML = speechItems.map(item => `
    <tr>
      <td>${item.time}</td>
      <td><b>${escapeHtml(item.speaker)}</b></td>
      <td>${escapeHtml(item.text)}</td>
      <td>${item.type}</td>
    </tr>
  `).join("");

  box.scrollTop = box.scrollHeight;
}

function changeSpeechSpeaker(id, value){
  const item = speechItems.find(x => String(x.id) === String(id));
  if(item){
    item.speaker = value;
    renderSpeechItems();
    updateTranscriptFromSpeech();
  }
}

function updateTranscriptFromSpeech(){
  const area = document.getElementById("transcript");
  if(area){
    area.value = speechItems.map(i => `${i.speaker}: ${i.text}`).join("\\n");
  }
}

function addManualLine(){
  const t = prompt("O que foi dito?");
  if(t) addSpeechLine(activeSpeaker || speaker || "Operador", t, "manual");
}

async function startRecording(){
  try{
    const stream = await navigator.mediaDevices.getUserMedia({
      audio:{
        echoCancellation:true,
        noiseSuppression:true,
        autoGainControl:true,
        channelCount:1,
        sampleRate:48000
      }
    });

    const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? {mimeType:"audio/webm;codecs=opus", audioBitsPerSecond:128000}
      : {audioBitsPerSecond:128000};

    recorder = new MediaRecorder(stream, options);
    chunks = [];
    audioBlob = null;
    startedAt = Date.now();
    lastSpeechTime = 0;
    speakerIndex = 1;
    setSpeaker("Pessoa 1");

    setupAudioMeter(stream);
    startTimer();

    recorder.ondataavailable = e => {
      if(e.data && e.data.size) chunks.push(e.data);
    };

    recorder.onstop = () => {
      audioBlob = new Blob(chunks,{type:recorder.mimeType || "audio/webm"});
      audio.src = URL.createObjectURL(audioBlob);
      audio.load();
      stream.getTracks().forEach(t=>t.stop());
      stopAudioMeter();
      stopTimer();
      stopSpeechAuto();
      audioInfo.textContent = "Áudio pronto para ouvir · " + (audioBlob.size/1024).toFixed(1) + " KB";
      recordStatus.textContent = "Gravado";

      if(document.getElementById("autoSummary")?.checked){
        generateSummary();
      }
    };

    recorder.start(500);
    recordStatus.textContent = "A gravar...";
    audioInfo.textContent = "Gravação ativa. Fala perto do microfone.";

    if(document.getElementById("autoTranscribe")?.checked){
      startSpeechAuto();
    }
  }catch(e){
    toast("Erro no microfone. Usa Chrome + Live Server e permite o microfone.");
  }
}

function pauseRecording(){
  if(recorder && recorder.state === "recording"){
    recorder.pause();
    recordStatus.textContent = "Pausado";
    stopSpeechAuto();
  }
}

function resumeRecording(){
  if(recorder && recorder.state === "paused"){
    recorder.resume();
    recordStatus.textContent = "A gravar...";
    if(document.getElementById("autoTranscribe")?.checked) startSpeechAuto();
  }
}

function stopRecording(){
  if(recorder && recorder.state !== "inactive") recorder.stop();
  else toast("Não há gravação ativa.");
}

function startSpeechAuto(){
  if(!speechRecognition) speechRecognition = setupSpeechRecognition();
  if(!speechRecognition){
    speechState.textContent = "Indisponível";
    toast("Transcrição automática não disponível neste browser. Usa Chrome.");
    return;
  }
  try{
    speechRecognition.start();
    speechState.textContent = "Ativa";
  }catch(e){}
}

function stopSpeechAuto(){
  if(speechRecognition && isSpeechRunning){
    try{ speechRecognition.stop(); }catch(e){}
  }
  if(document.getElementById("speechState")) speechState.textContent = "Parada";
}

function playAudio(){
  if(!audio.src) return toast("Ainda não existe áudio.");
  audio.volume = 1;
  audio.currentTime = 0;
  audio.play().catch(()=>toast("Carrega no play do leitor de áudio."));
}

function startTimer(){
  clearInterval(timerInterval);
  timerInterval = setInterval(()=>{
    const s = Math.floor((Date.now()-startedAt)/1000);
    if(document.getElementById("timer")){
      timer.textContent = String(Math.floor(s/60)).padStart(2,"0") + ":" + String(s%60).padStart(2,"0");
    }
  },500);
}

function stopTimer(){
  clearInterval(timerInterval);
}

function setupAudioMeter(stream){
  const canvas = document.getElementById("audioMeter");
  if(!canvas) return;

  const ctx = canvas.getContext("2d");
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(stream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);

  function draw(){
    meterAnimation = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(data);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "#071f3d";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    const barWidth = canvas.width / data.length;
    for(let i=0;i<data.length;i++){
      const h = (data[i]/255)*canvas.height;
      ctx.fillStyle = i%3===0 ? "#87884f" : "#60a5fa";
      ctx.fillRect(i*barWidth, canvas.height-h, Math.max(1,barWidth-1), h);
    }
  }
  draw();
}

function stopAudioMeter(){
  if(meterAnimation) cancelAnimationFrame(meterAnimation);
  if(audioContext) audioContext.close();
}

function generateSummary(){
  const text = transcript.value.trim();
  if(!text){
    summary.value = "Ainda não existe texto suficiente para resumir.";
    return;
  }

  const lower = text.toLowerCase();
  const speakers = [...new Set(speechItems.map(i => i.speaker))];
  const topics = [];
  const risks = [];
  const actions = [];

  if(lower.includes("preço") || lower.includes("orçamento")) topics.push("preços/orçamento");
  if(lower.includes("envio") || lower.includes("transporte") || lower.includes("carga")) topics.push("envios e logística");
  if(lower.includes("prazo") || lower.includes("data")) topics.push("prazos");
  if(lower.includes("documento") || lower.includes("fatura")) topics.push("documentação");
  if(lower.includes("problema") || lower.includes("atraso")) risks.push("possível atraso/problema operacional");

  if(lower.includes("orçamento") || lower.includes("preço")) actions.push("enviar proposta/orçamento ao cliente");
  if(lower.includes("prazo")) actions.push("confirmar prazo previsto");
  if(lower.includes("documento") || lower.includes("fatura")) actions.push("validar documentação/faturação");
  if(!actions.length) actions.push("agendar seguimento e confirmar próximos passos");

  const client = meetingClient.value;
  const type = meetingType.value;
  const status = meetingStatus.value;

  summary.value =
`Resumo profissional da interação

Cliente: ${client}
Tipo de interação: ${type}
Estado: ${status}
Participantes detetados: ${speakers.length ? speakers.join(", ") : "não identificado"}
Total de falas registadas: ${speechItems.length}

Temas principais:
- ${(topics.length ? topics : ["acompanhamento comercial"]).join("\\n- ")}

Decisões / conclusões:
- A interação foi registada e deve ficar associada ao histórico do cliente.
- O cliente deve receber resposta clara com os pontos tratados.
- A equipa interna deve manter acompanhamento até fecho do tema.

Riscos ou alertas:
- ${(risks.length ? risks : ["sem riscos críticos detetados automaticamente"]).join("\\n- ")}

Próximos passos:
- ${actions.join("\\n- ")}

Responsável interno: ${meetingOwner.value}
Follow-up recomendado: ${document.getElementById("followDate")?.value || "por definir"}`;

  const bullets = document.getElementById("summaryBullets");
  if(bullets){
    bullets.innerHTML = `
      <li><b>Participantes:</b> ${speakers.length || 1}</li>
      <li><b>Falas:</b> ${speechItems.length}</li>
      <li><b>Temas:</b> ${(topics.length ? topics : ["acompanhamento"]).join(", ")}</li>
      <li><b>Ações:</b> ${actions.length}</li>
    `;
  }
}

function saveInteraction(){
  const list = interactions();
  const item = {
    date:new Date().toISOString(),
    client:meetingClient.value,
    type:meetingType.value,
    owner:meetingOwner.value,
    status:meetingStatus.value,
    contact:document.getElementById("meetingContact")?.value || "",
    channel:document.getElementById("meetingChannel")?.value || "",
    follow:document.getElementById("followDate")?.value || "",
    summary:summary.value,
    transcript:transcript.value,
    speechItems:speechItems,
    audio:!!audioBlob
  };
  list.unshift(item);
  saveInteractions(list);
  renderAll();
  toast("Interação estruturada guardada.");
}

function exportStructuredJSON(){
  const data = {
    client: meetingClient.value,
    type: meetingType.value,
    owner: meetingOwner.value,
    status: meetingStatus.value,
    transcript: transcript.value,
    summary: summary.value,
    speechItems,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "interacao-estruturada-pinto-basto.json";
  a.click();
}

function clearInteraction(){
  if(!confirm("Limpar esta interação?")) return;
  speechItems = [];
  transcript.value = "";
  summary.value = "";
  if(document.getElementById("summaryBullets")) summaryBullets.innerHTML = "<li>Ainda sem dados suficientes.</li>";
  renderSpeechItems();
  toast("Interação limpa.");
}




/* ===========================
   SETTINGS + NOTIFICATIONS PRO
   =========================== */
const SETTINGS_KEY = "pb_professional_settings";
const NOTIFICATIONS_KEY = "pb_real_notifications";

const defaultProfessionalSettings = {
  theme:"classic",
  density:"comfortable",
  radius:"soft",
  fontSize:"normal",
  animations:true,
  glass:true,
  shadows:true,
  hover:true,
  reduceMotion:false,
  notifications:true,
  browserNotifications:false,
  notifyTasks:true,
  notifyInteractions:true,
  notifyMessages:true,
  autoSave:true,
  autoSummary:true,
  confirmDelete:true,
  rememberLastPage:true
};

function getProfessionalSettings(){
  return {...defaultProfessionalSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")};
}
function setProfessionalSettings(s){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function getNotifications(){
  return JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]");
}
function saveNotifications(list){
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
}
function addNotification(type,title,message){
  const s = getProfessionalSettings();
  if(!s.notifications) return;

  const list = getNotifications();
  const item = {
    id: Date.now() + Math.random(),
    type,
    title,
    message,
    date:new Date().toISOString(),
    read:false
  };
  list.unshift(item);
  saveNotifications(list.slice(0,50));
  renderNotifications();

  if(s.browserNotifications && "Notification" in window && Notification.permission === "granted"){
    new Notification(title,{body:message});
  }
}

function notificationIcon(type){
  if(type === "message") return "💬";
  if(type === "interaction") return "📌";
  if(type === "audio") return "🎤";
  if(type === "task") return "✅";
  if(type === "settings") return "⚙️";
  if(type === "client") return "🏢";
  return "🔔";
}

function renderNotifications(){
  const list = getNotifications();
  const unread = list.filter(n=>!n.read).length;
  const badge = document.getElementById("notificationBadge");
  const box = document.getElementById("notificationList");
  if(badge) badge.textContent = unread;
  if(!box) return;

  if(!list.length){
    box.innerHTML = '<div class="empty">Sem notificações reais ainda.</div>';
    return;
  }

  box.innerHTML = list.map(n=>`
    <div class="notification-item ${n.read ? "" : "unread"}">
      <div class="notification-icon">${notificationIcon(n.type)}</div>
      <div>
        <strong>${escapeHtml(n.title)}</strong>
        <p>${escapeHtml(n.message)}</p>
        <small>${new Date(n.date).toLocaleString("pt-PT")}</small>
      </div>
    </div>
  `).join("");
}

function toggleNotifications(){
  const panel = document.getElementById("notificationPanel");
  if(panel) panel.classList.toggle("show");
  renderNotifications();
}

function markNotificationsRead(){
  const list = getNotifications().map(n=>({...n,read:true}));
  saveNotifications(list);
  renderNotifications();
}

function createTestNotification(){
  addNotification("settings","Notificação de teste","O sistema de notificações está ativo e funcional.");
  toast("Notificação criada.");
}

async function requestBrowserNotifications(){
  if(!("Notification" in window)){
    toast("O browser não suporta notificações.");
    return;
  }
  const permission = await Notification.requestPermission();
  const s = getProfessionalSettings();
  s.browserNotifications = permission === "granted";
  setProfessionalSettings(s);
  applyProfessionalSettings();
  toast(permission === "granted" ? "Notificações do browser ativadas." : "Permissão recusada.");
}

function applyProfessionalSettings(){
  const s = getProfessionalSettings();
  document.body.classList.remove("theme-premium","theme-light","theme-ocean","theme-gold");
  if(s.theme !== "classic") document.body.classList.add("theme-"+s.theme);

  document.body.classList.remove("density-compact","density-spacious");
  if(s.density !== "comfortable") document.body.classList.add("density-"+s.density);

  document.body.classList.remove("radius-sharp","radius-round");
  if(s.radius !== "soft") document.body.classList.add("radius-"+s.radius);

  document.body.classList.remove("font-large","font-small");
  if(s.fontSize !== "normal") document.body.classList.add("font-"+s.fontSize);

  document.body.classList.toggle("no-animations", !s.animations);
  document.body.classList.toggle("glass-nav", !!s.glass);
  document.body.classList.toggle("no-shadows", !s.shadows);
  document.body.classList.toggle("no-hover", !s.hover);
  document.body.classList.toggle("reduce-motion", !!s.reduceMotion);
}

function loadSettingsUI(){
  const s = getProfessionalSettings();
  const map = {
    setTheme:s.theme,
    setDensity:s.density,
    setRadius:s.radius,
    setFontSize:s.fontSize
  };
  Object.entries(map).forEach(([id,val])=>{ const el=document.getElementById(id); if(el) el.value=val; });

  const checks = {
    setAnimations:s.animations,
    setGlass:s.glass,
    setShadows:s.shadows,
    setHover:s.hover,
    setReduceMotion:s.reduceMotion,
    setNotifications:s.notifications,
    setBrowserNotifications:s.browserNotifications,
    setNotifyTasks:s.notifyTasks,
    setNotifyInteractions:s.notifyInteractions,
    setNotifyMessages:s.notifyMessages,
    setAutoSave:s.autoSave,
    setAutoSummary:s.autoSummary,
    setConfirmDelete:s.confirmDelete,
    setRememberLastPage:s.rememberLastPage
  };
  Object.entries(checks).forEach(([id,val])=>{ const el=document.getElementById(id); if(el) el.checked=!!val; });
  updateHealthStats();
}

function previewSettings(){
  const s = readSettingsFromUI();
  setProfessionalSettings(s);
  applyProfessionalSettings();
}

function readSettingsFromUI(){
  const current = getProfessionalSettings();
  return {
    ...current,
    theme:document.getElementById("setTheme")?.value || current.theme,
    density:document.getElementById("setDensity")?.value || current.density,
    radius:document.getElementById("setRadius")?.value || current.radius,
    fontSize:document.getElementById("setFontSize")?.value || current.fontSize,
    animations:document.getElementById("setAnimations")?.checked ?? current.animations,
    glass:document.getElementById("setGlass")?.checked ?? current.glass,
    shadows:document.getElementById("setShadows")?.checked ?? current.shadows,
    hover:document.getElementById("setHover")?.checked ?? current.hover,
    reduceMotion:document.getElementById("setReduceMotion")?.checked ?? current.reduceMotion,
    notifications:document.getElementById("setNotifications")?.checked ?? current.notifications,
    browserNotifications:document.getElementById("setBrowserNotifications")?.checked ?? current.browserNotifications,
    notifyTasks:document.getElementById("setNotifyTasks")?.checked ?? current.notifyTasks,
    notifyInteractions:document.getElementById("setNotifyInteractions")?.checked ?? current.notifyInteractions,
    notifyMessages:document.getElementById("setNotifyMessages")?.checked ?? current.notifyMessages,
    autoSave:document.getElementById("setAutoSave")?.checked ?? current.autoSave,
    autoSummary:document.getElementById("setAutoSummary")?.checked ?? current.autoSummary,
    confirmDelete:document.getElementById("setConfirmDelete")?.checked ?? current.confirmDelete,
    rememberLastPage:document.getElementById("setRememberLastPage")?.checked ?? current.rememberLastPage
  };
}

function updateHealthStats(){
  const ids = {
    healthUsers: users().length,
    healthClients: clients().length,
    healthInteractions: interactions().length,
    healthMessages: chatMessages().length,
    healthNotifications: getNotifications().length
  };
  Object.entries(ids).forEach(([id,val])=>{ const el=document.getElementById(id); if(el) el.textContent = val; });
}

function exportAllData(){
  const data = {
    users:getUsers(),
    currentUser:me,
    clients:clients(),
    interactions:interactions(),
    messages:chatMessages(),
    settings:getProfessionalSettings(),
    notifications:getNotifications(),
    exportedAt:new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "backup-pinto-basto-crm.json";
  a.click();
  addNotification("settings","Backup exportado","Foi exportado um backup JSON dos dados locais.");
}

function importDataPrompt(){
  alert("Para segurança, esta demo usa exportação direta. Se quiseres, posso adicionar importação por ficheiro no próximo ZIP.");
}

function clearLocalData(){
  const s = getProfessionalSettings();
  if(s.confirmDelete && !confirm("Tens a certeza que queres limpar dados locais da app?")) return;
  localStorage.removeItem(CLIENTS_KEY);
  localStorage.removeItem(INTERACTIONS_KEY);
  localStorage.removeItem(MESSAGES_KEY);
  localStorage.removeItem(NOTIFICATIONS_KEY);
  ensureData();
  renderAll();
  renderNotifications();
  updateHealthStats();
  toast("Dados locais limpos.");
}

const originalShowPage = showPage;
showPage = function(id){
  originalShowPage(id);
  const s = getProfessionalSettings();
  if(s.rememberLastPage) localStorage.setItem("pb_last_page", id);
  if(id === "settings") {
    loadSettingsUI();
  }
};

const originalRenderAll = renderAll;
renderAll = function(){
  originalRenderAll();
  renderNotifications();
  updateHealthStats();
};

const originalAddClient = addClient;
addClient = function(){
  const before = clients().length;
  originalAddClient();
  if(clients().length > before) addNotification("client","Novo cliente criado","Foi adicionado um novo cliente à base de dados.");
};

const originalSaveInteraction = saveInteraction;
saveInteraction = function(){
  originalSaveInteraction();
  const s = getProfessionalSettings();
  if(s.notifyInteractions) addNotification("interaction","Interação guardada","Foi registada uma nova interação no histórico.");
};

const originalSendMessage = sendMessage;
sendMessage = function(){
  const before = chatMessages().length;
  originalSendMessage();
  const s = getProfessionalSettings();
  if(chatMessages().length > before && s.notifyMessages) addNotification("message","Mensagem enviada","Foi enviada uma nova mensagem no chat interno.");
};

const originalStartRecording = startRecording;
startRecording = function(){
  originalStartRecording();
  addNotification("audio","Gravação iniciada","Foi iniciada uma gravação de áudio na interação.");
};

const originalSaveSettings = saveSettings;
saveSettings = function(){
  originalSaveSettings();
  const s = readSettingsFromUI();
  setProfessionalSettings(s);
  applyProfessionalSettings();
  loadSettingsUI();
  addNotification("settings","Definições atualizadas","As preferências da aplicação foram guardadas.");
};

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    applyProfessionalSettings();
    loadSettingsUI();
    renderNotifications();

    const s = getProfessionalSettings();
    const lastPage = localStorage.getItem("pb_last_page");
    if(s.rememberLastPage && lastPage && document.getElementById(lastPage)){
      originalShowPage(lastPage);
    }

    if(getNotifications().length === 0){
      addNotification("settings","Bem-vindo às notificações","As notificações mostram eventos reais como mensagens, interações, gravações e alterações.");
    }
  }, 200);
});




/* CLIENT PORTAL INTEGRATION: show client accounts in internal chat */
function allChatContacts(){
  const employees = typeof getUsers === "function" ? getUsers() : [];
  const clients = JSON.parse(localStorage.getItem("pb_client_users") || "[]").map(c => ({
    ...c,
    role: c.company || "Cliente",
    department: "Cliente",
    isClient:true
  }));
  return [...employees, ...clients].filter(u => u.uid !== me.uid);
}

const originalRenderUsersClientPortal = renderUsers;
renderUsers = function(){
  const list = allChatContacts();
  usersList.innerHTML = list.length ? list.map(u=>`
    <div class="user-item ${selectedUser&&selectedUser.uid===u.uid?'active':''}" onclick="selectUser('${u.uid}')">
      <strong>${u.name}</strong>
      <span>${u.isClient ? 'Cliente · ' + (u.company || '') : (u.role + ' · ' + u.department)}</span>
      <small>ID: ${u.uid}</small>
      <small>${u.email}</small>
    </div>
  `).join("") : '<div class="empty">Sem contactos para chat.</div>';
}

selectUser = function(uid){
  selectedUser = allChatContacts().find(u=>u.uid===uid);
  chatName.textContent = selectedUser.name;
  chatMeta.textContent = selectedUser.email + " · ID " + selectedUser.uid;
  renderUsers();
  renderMessages();
}




/* ===========================
   CHAT INTERLIGADO OPERADOR <-> CLIENTE
   =========================== */
const UNIFIED_MESSAGES_KEY = "pb_unified_messages";

function unifiedMessages(){
  return JSON.parse(localStorage.getItem(UNIFIED_MESSAGES_KEY) || "[]");
}
function saveUnifiedMessages(list){
  localStorage.setItem(UNIFIED_MESSAGES_KEY, JSON.stringify(list));
}
function clientAccountsForChat(){
  return JSON.parse(localStorage.getItem("pb_client_users") || "[]").map(c => ({
    uid:c.uid,
    name:c.name,
    email:c.email,
    role:c.company || "Cliente",
    department:"Cliente",
    company:c.company,
    phone:c.phone,
    isClient:true
  }));
}
function employeeAccountsForChat(){
  return getUsers().map(u => ({...u, isClient:false}));
}
function allOperatorChatContacts(){
  return [...employeeAccountsForChat(), ...clientAccountsForChat()].filter(u => u.uid !== me.uid);
}
function chatConvId(a,b){
  return [a,b].sort().join("__");
}

renderUsers = function(){
  const list = allOperatorChatContacts();
  const el = document.getElementById("usersList");
  if(!el) return;

  el.innerHTML = list.length ? list.map(u=>`
    <div class="user-item ${selectedUser&&selectedUser.uid===u.uid?'active':''}" onclick="selectUser('${u.uid}')">
      <strong>${u.name}</strong>
      <span>${u.isClient ? 'Cliente · ' + (u.company || u.role || '') : (u.role + ' · ' + u.department)}</span>
      <small>ID: ${u.uid}</small>
      <small>${u.email}</small>
    </div>
  `).join("") : '<div class="empty">Ainda não há clientes ou operadores para conversar.</div>';
}

selectUser = function(uid){
  selectedUser = allOperatorChatContacts().find(u=>u.uid===uid);
  if(!selectedUser) return;
  chatName.textContent = selectedUser.name;
  chatMeta.textContent = (selectedUser.isClient ? "Cliente · " : "Equipa · ") + selectedUser.email + " · ID " + selectedUser.uid;
  renderUsers();
  renderMessages();
}

renderMessages = function(){
  if(!selectedUser){
    messages.innerHTML='<div class="empty">Seleciona um utilizador.</div>';
    return;
  }
  const id = chatConvId(me.uid, selectedUser.uid);
  const list = unifiedMessages().filter(m => m.conv === id);

  messages.innerHTML = list.length ? list.map(m=>`
    <div class="message ${m.sender===me.uid?'mine':'other'}">
      <strong>${escapeHtml(m.senderName)}</strong>
      <p>${escapeHtml(m.text)}</p>
      <small>${new Date(m.date).toLocaleString("pt-PT")}</small>
    </div>
  `).join("") : '<div class="empty">Sem mensagens. Escreve a primeira.</div>';

  messages.scrollTop = messages.scrollHeight;
}

sendMessage = function(){
  if(!selectedUser) return toast("Seleciona um utilizador.");
  const input = document.getElementById("messageText");
  const text = input.value.trim();
  if(!text) return;

  const list = unifiedMessages();
  list.push({
    id: Date.now() + "-" + Math.random().toString(36).slice(2),
    conv: chatConvId(me.uid, selectedUser.uid),
    sender: me.uid,
    senderName: me.name,
    senderType: "operator",
    receiver: selectedUser.uid,
    receiverName: selectedUser.name,
    receiverType: selectedUser.isClient ? "client" : "operator",
    text,
    date: new Date().toISOString(),
    read:false
  });
  saveUnifiedMessages(list);
  input.value = "";
  renderMessages();
  renderAll();
  if(typeof addNotification === "function") addNotification("message","Mensagem enviada","Mensagem enviada para " + selectedUser.name + ".");
}

const _renderAllBeforeUnifiedChat = renderAll;
renderAll = function(){
  _renderAllBeforeUnifiedChat();
  const stat = document.getElementById("statMessages");
  if(stat) stat.textContent = unifiedMessages().length;
  renderUsers();
}


/* ===========================
   POWER APPS STYLE CRM FEATURES
   =========================== */
let selectedPowerClientId = null;

function enhancedClients(){
  return clients().map((c, index) => ({
    id: c.id || ("C-" + index),
    name: c.name || "Cliente",
    status: c.status || c.estado || "Ativo",
    type: c.type || c.tipo || "Cliente atual",
    country: c.country || c.pais || "Portugal",
    email: c.email || "-",
    contact: c.contact || c.lead || "-",
    notes: c.notes || "",
    lead: c.lead || c.contact || "-",
    nif: c.nif || c.tax || "PT000000000",
    domain: c.domain || ((c.email || "").includes("@") ? (c.email || "").split("@")[1] : "-"),
    address: c.address || c.morada || "Morada não indicada",
    dynamics: c.dynamics || ("DYN-" + String(index + 1).padStart(5,"0")),
    alertDays: Number(c.alertDays || 30),
    users: c.users || [{name:c.contact || "Contacto principal", role:"Contacto", email:c.email || "-"}],
    lastInteraction: c.lastInteraction || getLastInteractionForClient(c.name),
    rawIndex:index
  }));
}

function getLastInteractionForClient(name){
  const list = interactions().filter(i => i.client === name);
  if(!list.length) return "";
  return list[0].date || "";
}

function saveEnhancedClient(ec){
  const list = clients();
  const idx = ec.rawIndex;
  list[idx] = {...list[idx], id:ec.id, name:ec.name, status:ec.status, type:ec.type, country:ec.country, email:ec.email, contact:ec.contact, notes:ec.notes, lead:ec.lead, nif:ec.nif, domain:ec.domain, address:ec.address, dynamics:ec.dynamics, alertDays:ec.alertDays, users:ec.users, lastInteraction:ec.lastInteraction};
  saveClients(list);
}

function fillPowerFilters(){
  const list = enhancedClients();
  const clientSel = document.getElementById("powerClientFilter");
  const countrySel = document.getElementById("powerCountryFilter");
  if(!clientSel || !countrySel) return;
  const selectedClient = clientSel.value;
  const selectedCountry = countrySel.value;
  clientSel.innerHTML = '<option value="">Todos</option>' + [...new Set(list.map(c=>c.name))].map(v=>`<option>${v}</option>`).join("");
  countrySel.innerHTML = '<option value="">Todos</option>' + [...new Set(list.map(c=>c.country))].map(v=>`<option>${v}</option>`).join("");
  clientSel.value = selectedClient;
  countrySel.value = selectedCountry;
}

function renderPowerCRM(){
  fillPowerFilters();
  const q = (document.getElementById("powerSearch")?.value || "").toLowerCase();
  const cf = document.getElementById("powerClientFilter")?.value || "";
  const pf = document.getElementById("powerCountryFilter")?.value || "";
  const sf = document.getElementById("powerStatusFilter")?.value || "";
  const tf = document.getElementById("powerTypeFilter")?.value || "";
  const list = enhancedClients().filter(c => {
    const text = Object.values(c).join(" ").toLowerCase();
    return (!q || text.includes(q)) && (!cf || c.name === cf) && (!pf || c.country === pf) && (!sf || c.status === sf) && (!tf || c.type === tf);
  });
  const box = document.getElementById("powerClientList");
  if(!box) return;
  box.innerHTML = list.map(c => `
    <div class="power-client-row ${selectedPowerClientId===c.id?'active':''}" onclick="selectPowerClient('${c.id}')">
      <span class="power-dot ${powerStatusClass(c.status)}"></span>
      <div><strong>${escapeHtml(c.name)}</strong><span>${escapeHtml(c.lead)} · ${escapeHtml(c.country)}</span></div>
      <button class="power-delete" onclick="event.stopPropagation(); deletePowerClient('${c.id}')">×</button>
    </div>
  `).join("") || '<div class="empty">Sem clientes encontrados.</div>';
  if(selectedPowerClientId) renderPowerDetail();
}

function powerStatusClass(status){
  if(status === "Ativo") return "";
  if(status === "Pendente" || status === "Em negociação" || status === "Novo") return "yellow";
  if(status === "Inativo") return "red";
  return "gray";
}

function selectPowerClient(id){ selectedPowerClientId = id; renderPowerCRM(); renderPowerDetail(); }
function getSelectedPowerClient(){ return enhancedClients().find(c => c.id === selectedPowerClientId) || enhancedClients()[0]; }

function renderPowerDetail(){
  const c = getSelectedPowerClient();
  if(!c) return;
  selectedPowerClientId = c.id;
  powerEmpty.classList.add("hidden");
  powerDetailContent.classList.remove("hidden");
  powerClientName.textContent = c.name;
  powerClientSub.textContent = `${c.type} · ${c.country} · ${c.email}`;
  powerStatusDot.className = "power-dot " + powerStatusClass(c.status);
  powerLead.value = c.lead;
  if(typeof PB_fixClientStatusSelect === "function") PB_fixClientStatusSelect(c.status);
  else if(powerEstado) powerEstado.innerHTML = [...new Set([c.status, ...(typeof POWER_STATUS_OPTIONS!=="undefined"?POWER_STATUS_OPTIONS:["Lead","Novo","Pendente","Em negociação","Ativo","Inativo"])])].filter(Boolean).map(s=>`<option value="${s}">${s}</option>`).join("");
  powerEstado.value = c.status;
  powerTipo.value = c.type; powerNif.value = c.nif; powerPais.value = c.country; powerDominio.value = c.domain; powerMorada.value = c.address; powerDynamics.value = c.dynamics; powerAlertDays.value = c.alertDays;
  powerLastInteraction.value = c.lastInteraction ? new Date(c.lastInteraction).toLocaleString("pt-PT") : "Sem interação";
  renderPowerUsers(c); renderPowerAlerts(c); renderPowerHistory(c);
}

function setPowerTab(tab, btn){
  document.querySelectorAll(".power-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".power-tabs button").forEach(b => b.classList.remove("active"));
  document.getElementById("powerTab" + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add("active");
  btn.classList.add("active");
}

function renderPowerUsers(c){
  powerUsersList.innerHTML = (c.users || []).map((u, idx) => `
    <div class="power-user-card"><strong>${escapeHtml(u.name)}</strong><span>${escapeHtml(u.role || "-")} · ${escapeHtml(u.email || "-")}</span><button onclick="removePowerUser(${idx})">Remover</button></div>
  `).join("") || '<div class="empty">Sem utilizadores associados.</div>';
}

function addPowerUser(){
  const c = getSelectedPowerClient();
  c.users = c.users || [];
  c.users.push({name:powerUserName.value || "Novo contacto", role:powerUserRole.value || "-", email:powerUserEmail.value || "-"});
  saveEnhancedClient(c);
  powerUserName.value = ""; powerUserRole.value = ""; powerUserEmail.value = "";
  renderPowerDetail(); toast("Utilizador associado ao cliente.");
}

function removePowerUser(idx){ const c = getSelectedPowerClient(); c.users.splice(idx,1); saveEnhancedClient(c); renderPowerDetail(); }

function renderPowerAlerts(c){
  const last = c.lastInteraction ? new Date(c.lastInteraction) : null;
  const days = last ? Math.floor((Date.now() - last.getTime()) / (1000*60*60*24)) : 999;
  const limit = Number(c.alertDays || 30);
  let html = "";
  if(!last) html += `<div class="power-alert-card danger"><strong>Sem interação registada</strong><span>Este cliente ainda não tem histórico de interação.</span></div>`;
  else if(days > limit) html += `<div class="power-alert-card danger"><strong>Alerta de inatividade</strong><span>${days} dias sem interação. Limite configurado: ${limit} dias.</span></div>`;
  else if(days > Math.floor(limit * 0.7)) html += `<div class="power-alert-card warning"><strong>Atenção</strong><span>${days} dias sem interação. Aproxima-se do limite de ${limit} dias.</span></div>`;
  else html += `<div class="power-alert-card"><strong>Cliente acompanhado</strong><span>Última interação há ${days} dias.</span></div>`;
  html += `<div class="power-alert-card"><strong>Próxima ação sugerida</strong><span>Confirmar estado do cliente e registar nova interação se necessário.</span></div>`;
  powerAlertsBox.innerHTML = html;
}

function renderPowerHistory(c){
  const list = interactions().filter(i => i.client === c.name);
  powerHistoryList.innerHTML = list.length ? list.map(i => `
    <div class="power-history-card"><strong>${escapeHtml(i.type || "Interação")} · ${new Date(i.date).toLocaleString("pt-PT")}</strong><span>Origem: ${escapeHtml(i.origin || "Power Apps CRM / Pinto Basto CRM")}</span><span>Responsável: ${escapeHtml(i.owner || "-")} · Estado: ${escapeHtml(i.status || "-")}</span><p>${escapeHtml(i.summary || i.transcript || "Sem resumo")}</p><button onclick="deletePowerInteraction('${i.date}')">Apagar</button></div>
  `).join("") : '<div class="empty">Sem interações para este cliente.</div>';
}

function deletePowerInteraction(date){ saveInteractions(interactions().filter(i => i.date !== date)); renderPowerDetail(); renderAll(); }

function savePowerClient(){
  const c = getSelectedPowerClient();
  c.lead = powerLead.value; c.status = powerEstado.value; c.type = powerTipo.value; c.nif = powerNif.value; c.country = powerPais.value; c.domain = powerDominio.value; c.address = powerMorada.value; c.dynamics = powerDynamics.value; c.alertDays = Number(powerAlertDays.value || 30);
  saveEnhancedClient(c); renderAll(); renderPowerCRM(); renderPowerDetail(); toast("Cliente guardado.");
}

function deletePowerClient(id){
  const c = id ? enhancedClients().find(x=>x.id===id) : getSelectedPowerClient();
  if(!c) return;
  if(!confirm("Apagar cliente " + c.name + "?")) return;
  const list = clients();
  list.splice(c.rawIndex,1);
  saveClients(list);
  selectedPowerClientId = null;
  renderAll(); renderPowerCRM();
  if(document.getElementById("powerEmpty")) powerEmpty.classList.remove("hidden");
  if(document.getElementById("powerDetailContent")) powerDetailContent.classList.add("hidden");
}

function openPowerClientNew(){
  const name = prompt("Nome do cliente:");
  if(!name) return;
  const list = clients();
  const newClient = {id:"C-" + Date.now(), name, status:"Novo", type:"Potencial cliente", country:"Portugal", email:"-", contact:"-", notes:"Cliente criado na vista CRM.", lead:"-", nif:"PT000000000", domain:"-", address:"-", dynamics:"DYN-" + Date.now(), alertDays:30, users:[]};
  list.push(newClient);
  saveClients(list);
  renderAll();
  selectedPowerClientId = newClient.id;
  renderPowerCRM(); renderPowerDetail();
}

function startPowerInteraction(){ const c = getSelectedPowerClient(); showPage("reuniao"); if(document.getElementById("meetingClient")) meetingClient.value = c.name; if(document.getElementById("quickClient")) quickClient.value = c.name; }

function clearPowerFilters(){ ["powerSearch","powerClientFilter","powerCountryFilter","powerStatusFilter","powerTypeFilter"].forEach(id=>{ const el = document.getElementById(id); if(el) el.value = ""; }); renderPowerCRM(); }

function fillQuickClients(){ const q = document.getElementById("quickClient"); if(!q) return; q.innerHTML = clients().map(c => `<option>${c.name}</option>`).join(""); }

function saveQuickInteraction(){
  const client = quickClient.value;
  const type = quickType.value;
  const text = quickText.value.trim();
  if(!client || !type){ toast("Cliente e tipo são obrigatórios."); return; }
  const list = interactions();
  list.unshift({date:new Date().toISOString(), client, type, owner:me?.name || "Operador", status:"Concluída", summary:text || "Interação rápida registada.", transcript:text, origin:"Power Apps CRM"});
  saveInteractions(list);
  const c = enhancedClients().find(x => x.name === client);
  if(c){ c.lastInteraction = new Date().toISOString(); saveEnhancedClient(c); }
  quickText.value = "";
  renderAll(); renderPowerCRM(); toast("Interação rápida guardada.");
}

const __renderAllBeforePowerCRM = renderAll;
renderAll = function(){ __renderAllBeforePowerCRM(); fillQuickClients(); renderPowerCRM(); }

document.addEventListener("DOMContentLoaded", () => { setTimeout(() => { fillQuickClients(); renderPowerCRM(); }, 300); });


/* ===========================
   PRIORIDADES ADMIN ONLY
   =========================== */
function isAdmin(){
  const roleText = [
    me?.appRole,
    me?.role,
    me?.department,
    me?.type
  ].filter(Boolean).join(" ").toLowerCase();

  return roleText.includes("admin") ||
         roleText.includes("administrador") ||
         roleText.includes("administrator") ||
         roleText.includes("gestor principal");
}

function priorities(){
  return JSON.parse(localStorage.getItem(PRIORITIES_KEY) || "[]");
}

function savePriorities(list){
  localStorage.setItem(PRIORITIES_KEY, JSON.stringify(list));
}

function renderPriorities(){
  const listEl = document.getElementById("priorityList");
  if(!listEl) return;

  const admin = isAdmin();
  const list = priorities();

  const adminBox = document.getElementById("priorityAdminBox");
  const readOnly = document.getElementById("priorityReadOnly");
  const badge = document.getElementById("priorityAdminBadge");

  if(adminBox) adminBox.style.display = admin ? "grid" : "none";
  if(readOnly) readOnly.style.display = admin ? "none" : "block";
  if(badge) {
    badge.textContent = admin ? "Admin ativo" : "Leitura";
    badge.classList.toggle("readonly", !admin);
  }

  listEl.innerHTML = list.map((text, index) => `
    <li class="priority-item">
      <span>${escapeHtml(text)}</span>
      ${admin ? `
        <div class="priority-actions">
          <button onclick="editPriority(${index})" title="Editar">Editar</button>
          <button onclick="removePriority(${index})" title="Remover">Remover</button>
        </div>
      ` : ""}
    </li>
  `).join("") || `<li class="priority-item"><span>Sem prioridades definidas.</span></li>`;
}

function addPriority(){
  if(!isAdmin()) return toast("Só o administrador pode adicionar prioridades.");
  const input = document.getElementById("priorityInput");
  const value = (input?.value || "").trim();
  if(!value) return toast("Escreve uma prioridade.");
  const list = priorities();
  list.push(value);
  savePriorities(list);
  input.value = "";
  renderPriorities();
  toast("Prioridade adicionada.");
}

function editPriority(index){
  if(!isAdmin()) return toast("Só o administrador pode editar prioridades.");
  const list = priorities();
  const current = list[index];
  const next = prompt("Editar prioridade:", current);
  if(next === null) return;
  const value = next.trim();
  if(!value) return toast("A prioridade não pode ficar vazia.");
  list[index] = value;
  savePriorities(list);
  renderPriorities();
  toast("Prioridade atualizada.");
}

function removePriority(index){
  if(!isAdmin()) return toast("Só o administrador pode remover prioridades.");
  const list = priorities();
  if(!confirm("Remover esta prioridade?")) return;
  list.splice(index, 1);
  savePriorities(list);
  renderPriorities();
  toast("Prioridade removida.");
}

function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, s => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[s]));
}
