/**
 * PINTO BASTO CRM — MODO PRIVADO / SEM CRIAR CONTA
 *
 * Esta app é privada.
 * Utilizadores só podem entrar se já existirem no Google Sheets / base de dados.
 *
 * Bloqueia:
 * - criar conta operador
 * - criar conta cliente
 * - register
 * - create Users pelo frontend
 */

function PB_privateAuthMessage(message) {
  const box = document.getElementById("authError") || document.getElementById("clientAuthError");
  if (box) {
    box.textContent = message;
    box.style.display = "block";
  } else {
    alert(message);
  }
}

function PB_hideRegisterUI() {
  // Botões/tabs comuns
  document.querySelectorAll("button, a, .tab, .auth-tab").forEach(el => {
    const txt = (el.textContent || "").toLowerCase();
    if (
      txt.includes("criar") ||
      txt.includes("registar") ||
      txt.includes("registrar") ||
      txt.includes("nova conta") ||
      txt.includes("cliente novo")
    ) {
      el.style.display = "none";
      el.disabled = true;
    }
  });

  // Esconde campos normalmente usados apenas em registo.
  const registerOnlyIds = [
    "name","role","department","phone","office","appRole",
    "clientName","clientCompany","clientRole","clientPhone","clientCountry"
  ];

  registerOnlyIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const wrap = el.closest("label") || el.parentElement;
    if (wrap) wrap.style.display = "none";
  });

  // Garante títulos em modo login.
  const titles = document.querySelectorAll("h1,h2,h3,p");
  titles.forEach(el => {
    if ((el.textContent || "").toLowerCase().includes("criar conta")) {
      el.textContent = "Acesso privado";
    }
  });
}

function PB_forceLoginMode() {
  try {
    if (typeof mode !== "undefined") mode = "login";
    if (typeof clientMode !== "undefined") clientMode = "login";

    if (typeof setMode === "function") {
      try { setMode("login"); } catch(e) {}
    }

    if (typeof setClientMode === "function") {
      try { setClientMode("login"); } catch(e) {}
    }
  } catch(e) {}
}

async function PB_privateSheetsLogin(email, password, type) {
  if (typeof SheetsDB === "undefined") {
    throw new Error("Ligação ao Google Sheets não encontrada. Confirma sheets-api.js.");
  }
  return await SheetsDB.login(email, password, type);
}

function PB_saveOperatorSessionFromSheet(user, password) {
  const session = {
    ...user,
    uid: user.id || user.uid,
    id: user.id || user.uid,
    type: "operator"
  };
  delete session.password;

  if (typeof setSession === "function") {
    setSession(session);
  } else {
    localStorage.setItem("pb_current_user", JSON.stringify(session));
  }

  // Guarda cache local sem permitir criar novas contas.
  if (typeof getUsers === "function" && typeof saveUsers === "function") {
    let users = getUsers();
    const idx = users.findIndex(u => String(u.email).toLowerCase() === String(user.email).toLowerCase());
    const local = { ...user, uid: session.uid, id: session.id, password };
    if (idx >= 0) users[idx] = { ...users[idx], ...local };
    else users.push(local); // cache local de conta já existente no Sheets
    saveUsers(users);
  }
}

function PB_saveClientSessionFromSheet(user, password) {
  const session = {
    uid: user.id || user.uid,
    id: user.id || user.uid,
    type: "client",
    email: user.email,
    name: user.name,
    company: user.company,
    role: user.role,
    phone: user.phone,
    country: user.office || user.country,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    theme: "classic",
    notifications: true
  };

  if (typeof setClientSession === "function") {
    setClientSession(session);
  } else {
    localStorage.setItem("pb_client_session", JSON.stringify(session));
  }

  // Guarda cache local sem permitir criar novas contas.
  if (typeof clientUsers === "function" && typeof saveClientUsers === "function") {
    let users = clientUsers();
    const idx = users.findIndex(u => String(u.email).toLowerCase() === String(user.email).toLowerCase());
    const local = { ...session, password };
    if (idx >= 0) users[idx] = { ...users[idx], ...local };
    else users.push(local); // cache local de conta já existente no Sheets
    saveClientUsers(users);
  }
}

function PB_patchPrivateOperatorLogin() {
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  if (!emailEl || !passEl) return;

  if (typeof submitAuth === "function" && !submitAuth.__PB_PRIVATE) {
    submitAuth = async function(event) {
      event.preventDefault();
      PB_forceLoginMode();

      const email = emailEl.value.trim().toLowerCase();
      const password = passEl.value;

      if (!email || !password) {
        PB_privateAuthMessage("Preenche email e palavra-passe.");
        return;
      }

      try {
        const res = await PB_privateSheetsLogin(email, password, "operator");
        PB_saveOperatorSessionFromSheet(res.user, password);
        location.href = "index.html";
      } catch (err) {
        try{
          if(typeof ensureAdminAccount === "function") ensureAdminAccount();
          const local = typeof getUsers === "function" ? getUsers().find(u =>
            String(u.email).trim().toLowerCase() === email &&
            String(u.password).trim() === String(password).trim()
          ) : null;
          if(local){
            const session = {...local};
            delete session.password;
            if(typeof setSession === "function") setSession(session);
            else localStorage.setItem("pb_current_user", JSON.stringify(session));
            location.href = "index.html";
            return;
          }
        }catch(localErr){}
        PB_privateAuthMessage("Acesso negado. A conta tem de existir na base de dados ou ser a conta admin local. " + err.message);
      }
    };

    submitAuth.__PB_PRIVATE = true;
  }
}

function PB_patchPrivateClientLogin() {
  const emailEl = document.getElementById("clientEmail");
  const passEl = document.getElementById("clientPassword");
  if (!emailEl || !passEl) return;

  if (typeof submitClientAuth === "function" && !submitClientAuth.__PB_PRIVATE) {
    submitClientAuth = async function(event) {
      event.preventDefault();
      PB_forceLoginMode();

      const email = emailEl.value.trim().toLowerCase();
      const password = passEl.value;

      if (!email || !password) {
        PB_privateAuthMessage("Preenche email e palavra-passe.");
        return;
      }

      try {
        const res = await PB_privateSheetsLogin(email, password, "client");
        PB_saveClientSessionFromSheet(res.user, password);
        location.href = "cliente.html";
      } catch (err) {
        PB_privateAuthMessage("Acesso negado. A conta de cliente tem de existir na base de dados. " + err.message);
      }
    };

    submitClientAuth.__PB_PRIVATE = true;
  }
}

// Bloqueio extra: impede create Users pelo frontend.
function PB_patchSheetsCreateUsersBlock() {
  if (typeof SheetsDB === "undefined") return;
  if (SheetsDB.__PB_PRIVATE_BLOCK) return;

  const originalCreate = SheetsDB.create.bind(SheetsDB);
  const originalUpsert = SheetsDB.upsert ? SheetsDB.upsert.bind(SheetsDB) : null;

  SheetsDB.create = function(table, data, userId = "") {
    if (table === "Users") {
      return Promise.reject(new Error("Criação de utilizadores desativada. Adiciona utilizadores no Google Sheets."));
    }
    return originalCreate(table, data, userId);
  };

  if (originalUpsert) {
    SheetsDB.upsert = function(table, id, data, userId = "") {
      if (table === "Users") {
        return Promise.reject(new Error("Criação/edição automática de utilizadores bloqueada neste modo privado."));
      }
      return originalUpsert(table, id, data, userId);
    };
  }

  SheetsDB.__PB_PRIVATE_BLOCK = true;
}

document.addEventListener("DOMContentLoaded", () => {
  PB_forceLoginMode();
  PB_hideRegisterUI();

  setTimeout(() => {
    PB_forceLoginMode();
    PB_hideRegisterUI();
    PB_patchPrivateOperatorLogin();
    PB_patchPrivateClientLogin();
    PB_patchSheetsCreateUsersBlock();
  }, 300);

  setTimeout(() => {
    PB_forceLoginMode();
    PB_hideRegisterUI();
    PB_patchPrivateOperatorLogin();
    PB_patchPrivateClientLogin();
    PB_patchSheetsCreateUsersBlock();
  }, 1300);
});
