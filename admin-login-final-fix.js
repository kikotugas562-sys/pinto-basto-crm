
/* ADMIN LOGIN + UI CLEANUP FINAL */
function PBFinalCleanLoginUI(){
  const buttons = Array.from(document.querySelectorAll("button"));
  let enterAccountSeen = false;

  buttons.forEach(btn=>{
    const txt = (btn.textContent || "").trim().toLowerCase();

    if(txt === "entrar em conta"){
      if(enterAccountSeen){
        btn.remove();
      }else{
        enterAccountSeen = true;
      }
    }

    if(txt.includes("criar demo") || txt.includes("criar 2 contas demo") || txt.includes("preencher demo")){
      if(!btn.parentElement.classList.contains("demo-center")){
        const wrap = document.createElement("div");
        wrap.className = "demo-center";
        btn.parentElement.insertBefore(wrap, btn);
        wrap.appendChild(btn);
      }
    }
  });
}

function PBFinalEnsureAdmin(){
  if(typeof ensureAdminAccount === "function") ensureAdminAccount();
}

function PBFinalPatchAdminLogin(){
  const form = document.querySelector("form");
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  if(!form || !emailEl || !passEl || form.__pbAdminFinal) return;

  form.addEventListener("submit", function(e){
    const email = String(emailEl.value || "").trim().toLowerCase();
    const pass = String(passEl.value || "").trim();

    if(email === "admin@pintobasto.pt" && pass === "1234"){
      e.preventDefault();
      PBFinalEnsureAdmin();
      const admin = getUsers().find(u => String(u.email).toLowerCase() === "admin@pintobasto.pt");
      const session = {...admin};
      delete session.password;
      if(typeof setSession === "function") setSession(session);
      else localStorage.setItem("pb_current_user", JSON.stringify(session));
      location.href = "index.html";
    }
  }, true);

  form.__pbAdminFinal = true;
}

document.addEventListener("DOMContentLoaded", ()=>{
  PBFinalEnsureAdmin();
  PBFinalCleanLoginUI();
  PBFinalPatchAdminLogin();
  setTimeout(PBFinalCleanLoginUI, 500);
  setTimeout(PBFinalPatchAdminLogin, 500);
});
