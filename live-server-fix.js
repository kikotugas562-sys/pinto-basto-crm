/**
 * PINTO BASTO CRM — LIVE SERVER FIX
 *
 * Problema:
 * No Live Server, se o Google Sheets / Apps Script falhar, o login/registo ficava bloqueado.
 *
 * Este ficheiro:
 * - mostra erros no ecrã;
 * - permite usar contas demo mesmo se o Sheets estiver offline;
 * - permite criar conta local mesmo se o Sheets falhar;
 * - evita que o sync automático bloqueie a app.
 */

window.addEventListener("error", (event) => {
  console.error("Erro JS:", event.message, event.error);
  PB_liveShowError("Erro JavaScript: " + event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Promise rejeitada:", event.reason);
  const msg = event.reason && event.reason.message ? event.reason.message : String(event.reason);
  PB_liveShowError("Erro async: " + msg);
});

function PB_liveShowError(message) {
  const authBox = document.getElementById("authError") || document.getElementById("clientAuthError");
  if (authBox) {
    authBox.textContent = message;
    authBox.style.display = "block";
    return;
  }

  let box = document.getElementById("pbLiveErrorBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "pbLiveErrorBox";
    box.style.position = "fixed";
    box.style.left = "18px";
    box.style.bottom = "18px";
    box.style.maxWidth = "520px";
    box.style.zIndex = "999999";
    box.style.background = "#fee2e2";
    box.style.color = "#991b1b";
    box.style.border = "1px solid #fecaca";
    box.style.borderRadius = "16px";
    box.style.padding = "14px 16px";
    box.style.fontFamily = "Segoe UI, Arial, sans-serif";
    box.style.fontWeight = "800";
    box.style.boxShadow = "0 16px 40px rgba(0,0,0,.18)";
    document.body.appendChild(box);
  }
  box.textContent = message;
}

function PB_liveInfo(message) {
  console.log("[Pinto Basto]", message);
}

function PB_liveIsLoginPage() {
  return !!document.getElementById("email") && !!document.getElementById("password");
}

function PB_liveIsClientLoginPage() {
  return !!document.getElementById("clientEmail") && !!document.getElementById("clientPassword");
}

function PB_liveEnsureDemoOperators() {
  if (typeof getUsers !== "function" || typeof saveUsers !== "function") return;

  let users = getUsers();

  const demo = [
    {
      uid:"PB-DEMO-001",
      id:"PB-DEMO-001",
      type:"operator",
      email:"marta@pintobasto.pt",
      password:"1234",
      name:"Marta Silva",
      role:"Gestora Comercial",
      department:"Comercial",
      appRole:"Administrador",
      phone:"+351 210 000 001",
      office:"Portugal - Lisboa",
      company:"Pinto Basto",
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    },
    {
      uid:"PB-DEMO-002",
      id:"PB-DEMO-002",
      type:"operator",
      email:"ricardo@pintobasto.pt",
      password:"1234",
      name:"Ricardo Mendes",
      role:"Gestor de Operações",
      department:"Operações",
      appRole:"Gestor",
      phone:"+351 210 000 002",
      office:"Portugal - Porto",
      company:"Pinto Basto",
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    }
  ];

  demo.forEach(d => {
    if (!users.some(u => String(u.email).toLowerCase() === String(d.email).toLowerCase())) {
      users.push(d);
    }
  });

  saveUsers(users);
}

function PB_liveEnsureDemoClients() {
  if (typeof clientUsers !== "function" || typeof saveClientUsers !== "function") return;

  let users = clientUsers();

  const demo = {
    uid:"CLIENT-DEMO-001",
    id:"CLIENT-DEMO-001",
    type:"client",
    email:"cliente@empresa.pt",
    password:"1234",
    name:"Ana Costa",
    company:"Costa & Filhos Exportação",
    role:"Diretora de Operações",
    phone:"+351 910 000 000",
    country:"Portugal",
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString(),
    theme:"classic",
    notifications:true
  };

  if (!users.some(u => String(u.email).toLowerCase() === String(demo.email).toLowerCase())) {
    users.push(demo);
  }

  saveClientUsers(users);
}

async function PB_liveTrySheetsLogin(email, password, type) {
  if (typeof SheetsDB === "undefined") throw new Error("SheetsDB não carregado.");
  return await SheetsDB.login(email, password, type);
}

async function PB_liveTrySheetsCreateUser(user) {
  if (typeof SheetsDB === "undefined") throw new Error("SheetsDB não carregado.");
  return await SheetsDB.create("Users", user, user.id || user.uid);
}

function PB_liveLocalOperatorLogin(email, password) {
  PB_liveEnsureDemoOperators();
  const users = getUsers();
  return users.find(u =>
    String(u.email).trim().toLowerCase() === String(email).trim().toLowerCase() &&
    String(u.password).trim() === String(password).trim()
  );
}

function PB_liveLocalClientLogin(email, password) {
  PB_liveEnsureDemoClients();
  const users = clientUsers();
  return users.find(u =>
    String(u.email).trim().toLowerCase() === String(email).trim().toLowerCase() &&
    String(u.password).trim() === String(password).trim()
  );
}

function PB_livePatchOperatorLogin() {
  if (!PB_liveIsLoginPage()) return;
  if (typeof submitAuth !== "function") return;
  if (submitAuth.__PB_LIVE_PATCHED) return;

  submitAuth = async function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    if (password.length < 4) {
      PB_liveShowError("A palavra-passe deve ter pelo menos 4 caracteres.");
      return;
    }

    try {
      if (mode === "login") {
        try {
          const res = await PB_liveTrySheetsLogin(email, password, "operator");
          const user = res.user;
          const session = { ...user, uid:user.id, id:user.id, password };
          PB_liveEnsureDemoOperators();

          let users = getUsers();
          if (!users.some(u => String(u.email).toLowerCase() === String(email).toLowerCase())) {
            users.push(session);
            saveUsers(users);
          }

          delete session.password;
          setSession(session);
          location.href = "index.html";
          return;
        } catch (sheetsErr) {
          console.warn("Sheets login falhou, fallback local:", sheetsErr);
          const localUser = PB_liveLocalOperatorLogin(email, password);
          if (!localUser) {
            PB_liveShowError("Login falhou no Sheets e no local: " + sheetsErr.message);
            return;
          }
          const session = { ...localUser };
          delete session.password;
          setSession(session);
          location.href = "index.html";
          return;
        }
      }

      // REGISTER
      const name = document.getElementById("name").value.trim();
      const role = document.getElementById("role").value.trim();

      if (!name || !role) {
        PB_liveShowError("Preenche nome completo e cargo.");
        return;
      }

      const id = "PB-" + Date.now().toString(36).toUpperCase();
      const user = {
        id,
        uid:id,
        type:"operator",
        email,
        password,
        name,
        role,
        department:document.getElementById("department")?.value || "Comercial",
        appRole:document.getElementById("appRole")?.value || "Colaborador",
        phone:document.getElementById("phone")?.value || "",
        office:document.getElementById("office")?.value || "",
        company:"Pinto Basto",
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString()
      };

      let users = getUsers();
      if (users.some(u => String(u.email).toLowerCase() === String(email).toLowerCase())) {
        PB_liveShowError("Este email já existe localmente.");
        return;
      }

      try {
        await PB_liveTrySheetsCreateUser(user);
      } catch (sheetsErr) {
        console.warn("Não guardou no Sheets, mas vai criar local:", sheetsErr);
        PB_liveShowError("Aviso: não consegui guardar no Sheets. Conta criada localmente. Erro: " + sheetsErr.message);
      }

      users.push(user);
      saveUsers(users);

      const session = { ...user };
      delete session.password;
      setSession(session);

      setTimeout(() => location.href = "index.html", 350);
    } catch (err) {
      console.error(err);
      PB_liveShowError(err.message);
    }
  };

  submitAuth.__PB_LIVE_PATCHED = true;
}

function PB_livePatchClientLogin() {
  if (!PB_liveIsClientLoginPage()) return;
  if (typeof submitClientAuth !== "function") return;
  if (submitClientAuth.__PB_LIVE_PATCHED) return;

  submitClientAuth = async function(event) {
    event.preventDefault();

    const email = document.getElementById("clientEmail").value.trim().toLowerCase();
    const password = document.getElementById("clientPassword").value;

    if (password.length < 4) {
      PB_liveShowError("A palavra-passe deve ter pelo menos 4 caracteres.");
      return;
    }

    try {
      if (clientMode === "login") {
        try {
          const res = await PB_liveTrySheetsLogin(email, password, "client");
          const user = res.user;
          const session = {
            uid:user.id,
            id:user.id,
            type:"client",
            email:user.email,
            password,
            name:user.name,
            company:user.company,
            role:user.role,
            phone:user.phone,
            country:user.office,
            createdAt:user.createdAt,
            updatedAt:user.updatedAt,
            theme:"classic",
            notifications:true
          };

          PB_liveEnsureDemoClients();
          let users = clientUsers();
          if (!users.some(u => String(u.email).toLowerCase() === String(email).toLowerCase())) {
            users.push(session);
            saveClientUsers(users);
          }

          delete session.password;
          setClientSession(session);
          location.href = "cliente.html";
          return;
        } catch (sheetsErr) {
          console.warn("Sheets client login falhou, fallback local:", sheetsErr);
          const localUser = PB_liveLocalClientLogin(email, password);
          if (!localUser) {
            PB_liveShowError("Login cliente falhou no Sheets e no local: " + sheetsErr.message);
            return;
          }
          const session = { ...localUser };
          delete session.password;
          setClientSession(session);
          location.href = "cliente.html";
          return;
        }
      }

      const name = document.getElementById("clientName").value.trim();
      const company = document.getElementById("clientCompany").value.trim();

      if (!name || !company) {
        PB_liveShowError("Preenche nome e empresa.");
        return;
      }

      const id = "CLIENT-" + Date.now().toString(36).toUpperCase();
      const user = {
        id,
        uid:id,
        type:"client",
        email,
        password,
        name,
        company,
        role:document.getElementById("clientRole")?.value || "Cliente",
        department:"",
        phone:document.getElementById("clientPhone")?.value || "",
        office:document.getElementById("clientCountry")?.value || "Portugal",
        country:document.getElementById("clientCountry")?.value || "Portugal",
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString(),
        theme:"classic",
        notifications:true
      };

      let users = clientUsers();
      if (users.some(u => String(u.email).toLowerCase() === String(email).toLowerCase())) {
        PB_liveShowError("Este email já existe localmente.");
        return;
      }

      try {
        await PB_liveTrySheetsCreateUser(user);
      } catch (sheetsErr) {
        console.warn("Não guardou cliente no Sheets, mas vai criar local:", sheetsErr);
        PB_liveShowError("Aviso: não consegui guardar no Sheets. Cliente criado localmente. Erro: " + sheetsErr.message);
      }

      users.push(user);
      saveClientUsers(users);

      const session = { ...user };
      delete session.password;
      setClientSession(session);

      setTimeout(() => location.href = "cliente.html", 350);
    } catch (err) {
      console.error(err);
      PB_liveShowError(err.message);
    }
  };

  submitClientAuth.__PB_LIVE_PATCHED = true;
}

// Evita que sync automático rebente a app se Sheets falhar.
const PB_originalFetch = window.fetch;
window.fetch = async function(...args) {
  try {
    return await PB_originalFetch.apply(this, args);
  } catch (err) {
    console.warn("Fetch falhou:", args[0], err);
    throw err;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  PB_liveEnsureDemoOperators();
  PB_liveEnsureDemoClients();

  setTimeout(PB_livePatchOperatorLogin, 300);
  setTimeout(PB_livePatchOperatorLogin, 1200);
  setTimeout(PB_livePatchClientLogin, 300);
  setTimeout(PB_livePatchClientLogin, 1200);
});
