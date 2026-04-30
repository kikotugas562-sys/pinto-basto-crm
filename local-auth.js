
const USERS_KEY = "pb_local_users";
const SESSION_KEY = "pb_current_user";
function getUsers(){ return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); }
function saveUsers(users){ localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
function uid(){ return "PB-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2,7).toUpperCase(); }
function showAuthError(message){ const box = document.getElementById("authError"); if(box){ box.textContent = message; box.style.display = "block"; } else alert(message); }
function setSession(user){ const safeUser = {...user}; delete safeUser.password; localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser)); }
function getSession(){ return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
function clearSession(){ localStorage.removeItem(SESSION_KEY); }
function requireLogin(){ const user = getSession(); if(!user){ location.href = "login.html"; return null; } return user; }
function logout(){ clearSession(); location.href = "login.html"; }


/* ADMIN FIX — conta admin garantida */
function ensureAdminAccount(){
  try{
    let list = getUsers();
    const admin = {
      uid:"PB-ADMIN-001",
      id:"PB-ADMIN-001",
      type:"operator",
      email:"admin@pintobasto.pt",
      password:"1234",
      name:"Admin Pinto Basto",
      role:"Administrador",
      department:"Direção",
      appRole:"Administrador",
      phone:"+351 210 000 999",
      office:"Portugal - Lisboa",
      company:"Pinto Basto",
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };
    const idx = list.findIndex(u => String(u.email).toLowerCase() === admin.email);
    if(idx >= 0){
      list[idx] = {...list[idx], ...admin};
    }else{
      list.push(admin);
    }
    saveUsers(list);
  }catch(e){ console.warn("Admin fix falhou:", e); }
}
document.addEventListener("DOMContentLoaded", ensureAdminAccount);
ensureAdminAccount();
