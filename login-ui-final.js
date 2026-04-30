
function fillDemo(){
  const email = document.getElementById("email");
  const pass = document.getElementById("password");
  if(email) email.value = "admin@pintobasto.pt";
  if(pass) pass.value = "1234";
}

function fillClientDemo(){
  const email = document.getElementById("clientEmail");
  const pass = document.getElementById("clientPassword");
  if(email) email.value = "cliente@empresa.pt";
  if(pass) pass.value = "1234";
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("button").forEach(btn => {
    const txt = (btn.textContent || "").trim().toLowerCase();
    if(txt === "entrar em conta" || txt === "entrada"){
      btn.remove();
    }
  });
});
