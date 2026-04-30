let clientMode = "login";

document.addEventListener("DOMContentLoaded", () => {
  if(getClientSession()){
    location.href = "cliente.html";
    return;
  }
  setClientMode("login");
});

function setClientMode(mode){
  clientMode = mode;
  const isRegister = mode === "register";
  clientLoginTab.classList.toggle("active", !isRegister);
  clientRegisterTab.classList.toggle("active", isRegister);
  clientMainBtn.textContent = isRegister ? "Criar acesso" : "Entrar";
  document.querySelectorAll(".register-field").forEach(el => el.classList.toggle("hide", !isRegister));
  clientAuthError.style.display = "none";
}

function submitClientAuth(event){
  event.preventDefault();
  const email = clientEmail.value.trim().toLowerCase();
  const password = clientPassword.value;
  let users = clientUsers();

  if(password.length < 4){
    showClientError("A palavra-passe deve ter pelo menos 4 caracteres.");
    return;
  }

  if(clientMode === "login"){
    const user = users.find(u => u.email === email && u.password === password);
    if(!user){
      showClientError("Email ou palavra-passe incorretos.");
      return;
    }
    user.lastLogin = new Date().toISOString();
    saveClientUsers(users);
    setClientSession(user);
    location.href = "cliente.html";
    return;
  }

  if(users.some(u => u.email === email)){
    showClientError("Este email já tem acesso.");
    return;
  }

  const name = clientName.value.trim();
  const company = clientCompany.value.trim();
  if(!name || !company){
    showClientError("Preenche nome e empresa.");
    return;
  }

  const user = {
    uid:clientUid(),
    email,
    password,
    name,
    company,
    role:clientRole.value || "Cliente",
    phone:clientPhone.value,
    country:clientCountry.value,
    type:clientType.value,
    notifications:true,
    theme:"classic",
    createdAt:new Date().toISOString(),
    lastLogin:new Date().toISOString()
  };

  users.push(user);
  saveClientUsers(users);
  setClientSession(user);
  location.href = "cliente.html";
}

function createDemoClient(){
  let users = clientUsers();
  const demo = {
    uid:"CLIENT-DEMO-001",
    email:"cliente@empresa.pt",
    password:"1234",
    name:"Ana Costa",
    company:"Costa & Filhos Exportação",
    role:"Diretora de Operações",
    phone:"+351 910 000 000",
    country:"Portugal",
    type:"Cliente atual",
    notifications:true,
    theme:"classic",
    createdAt:new Date().toISOString(),
    lastLogin:null
  };
  if(!users.some(u => u.email === demo.email)){
    users.push(demo);
    saveClientUsers(users);
  }
  showClientError("Cliente demo criado: cliente@empresa.pt / 1234");
}

function fillDemoClient(){
  clientEmail.value = "cliente@empresa.pt";
  clientPassword.value = "1234";
}
