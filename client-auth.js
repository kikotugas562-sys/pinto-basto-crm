
const CLIENT_USERS_KEY = "pb_client_users";
const CLIENT_SESSION_KEY = "pb_client_session";

function clientUsers(){
  return JSON.parse(localStorage.getItem(CLIENT_USERS_KEY) || "[]");
}
function saveClientUsers(users){
  localStorage.setItem(CLIENT_USERS_KEY, JSON.stringify(users));
}
function clientUid(){
  return "CLIENT-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2,7).toUpperCase();
}
function getClientSession(){
  return JSON.parse(localStorage.getItem(CLIENT_SESSION_KEY) || "null");
}
function setClientSession(user){
  const safe = {...user};
  delete safe.password;
  localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(safe));
}
function clearClientSession(){
  localStorage.removeItem(CLIENT_SESSION_KEY);
}
function requireClientLogin(){
  const user = getClientSession();
  if(!user){
    location.href = "cliente-login.html";
    return null;
  }
  return user;
}
function clientLogout(){
  clearClientSession();
  location.href = "cliente-login.html";
}
function showClientError(message){
  const box = document.getElementById("clientAuthError");
  if(box){
    box.textContent = message;
    box.style.display = "block";
  } else alert(message);
}
