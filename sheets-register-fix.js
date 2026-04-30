/**
 * PINTO BASTO CRM — FIX REGISTO/LOGIN COM GOOGLE SHEETS
 *
 * Resolve:
 * - criar conta e não aparecer no Sheets
 * - login usar apenas localStorage
 *
 * Este ficheiro deve carregar depois de:
 * - sheets-api.js
 * - local-auth.js / client-auth.js
 * - login.js / cliente-login.js
 */

function PB_authToast(msg) {
  const box = document.getElementById("authError") || document.getElementById("clientAuthError");
  if (box) {
    box.textContent = msg;
    box.style.display = "block";
  } else {
    alert(msg);
  }
}

function PB_now() {
  return new Date().toISOString();
}

async function PB_findUserByEmail(email) {
  const res = await SheetsDB.list("Users");
  const users = res.data || [];
  return users.find(u => String(u.email).trim().toLowerCase() === String(email).trim().toLowerCase());
}

async function PB_createUserIfNotExists(user) {
  const existing = await PB_findUserByEmail(user.email);

  if (existing) {
    throw new Error("Já existe uma conta com este email no Google Sheets.");
  }

  await SheetsDB.create("Users", user, user.id);

  await SheetsDB.create("Settings", {
    userId: user.id,
    theme: "classic",
    density: "comfortable",
    radius: "soft",
    fontSize: "normal",
    notifications: true,
    browserNotifications: false,
    animations: true,
    glass: true,
    shadows: true,
    updatedAt: PB_now()
  }, user.id);

  return user;
}

function PB_saveLocalOperator(user) {
  let users = getUsers();
  if (!users.some(u => String(u.email).toLowerCase() === String(user.email).toLowerCase())) {
    users.push({
      uid: user.id,
      id: user.id,
      type: user.type,
      email: user.email,
      password: user.password,
      name: user.name,
      role: user.role,
      department: user.department,
      appRole: user.appRole || "Colaborador",
      phone: user.phone,
      office: user.office,
      company: user.company,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
    saveUsers(users);
  }
}

function PB_saveLocalClient(user) {
  let users = clientUsers();
  if (!users.some(u => String(u.email).toLowerCase() === String(user.email).toLowerCase())) {
    users.push({
      uid: user.id,
      id: user.id,
      type: "client",
      email: user.email,
      password: user.password,
      name: user.name,
      company: user.company,
      role: user.role,
      phone: user.phone,
      country: user.office,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      theme: "classic",
      notifications: true
    });
    saveClientUsers(users);
  }
}

// LOGIN / REGISTO OPERADOR
if (typeof submitAuth === "function") {
  submitAuth = async function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    if (password.length < 4) {
      PB_authToast("A palavra-passe deve ter pelo menos 4 caracteres.");
      return;
    }

    try {
      if (mode === "login") {
        const res = await SheetsDB.login(email, password, "operator");
        const user = res.user;

        const localUser = {
          ...user,
          uid: user.id,
          password
        };

        PB_saveLocalOperator({ ...localUser, password });
        setSession(localUser);
        location.href = "index.html";
        return;
      }

      const id = "PB-" + Date.now().toString(36).toUpperCase();

      const user = {
        id,
        type: "operator",
        name: document.getElementById("name").value.trim(),
        email,
        password,
        role: document.getElementById("role").value.trim(),
        department: document.getElementById("department").value,
        phone: document.getElementById("phone").value,
        office: document.getElementById("office").value,
        company: "Pinto Basto",
        createdAt: PB_now(),
        updatedAt: PB_now()
      };

      if (!user.name || !user.role) {
        PB_authToast("Preenche nome completo e cargo.");
        return;
      }

      await PB_createUserIfNotExists(user);
      PB_saveLocalOperator(user);

      const session = { ...user, uid: id };
      delete session.password;
      setSession(session);

      location.href = "index.html";
    } catch (err) {
      PB_authToast(err.message);
    }
  };
}

// LOGIN / REGISTO CLIENTE
if (typeof submitClientAuth === "function") {
  submitClientAuth = async function(event) {
    event.preventDefault();

    const email = document.getElementById("clientEmail").value.trim().toLowerCase();
    const password = document.getElementById("clientPassword").value;

    if (password.length < 4) {
      PB_authToast("A palavra-passe deve ter pelo menos 4 caracteres.");
      return;
    }

    try {
      if (clientMode === "login") {
        const res = await SheetsDB.login(email, password, "client");
        const user = res.user;

        const localUser = {
          uid: user.id,
          id: user.id,
          type: "client",
          email: user.email,
          password,
          name: user.name,
          company: user.company,
          role: user.role,
          phone: user.phone,
          country: user.office,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          theme: "classic",
          notifications: true
        };

        PB_saveLocalClient(localUser);
        setClientSession(localUser);
        location.href = "cliente.html";
        return;
      }

      const id = "CLIENT-" + Date.now().toString(36).toUpperCase();

      const user = {
        id,
        type: "client",
        name: document.getElementById("clientName").value.trim(),
        email,
        password,
        role: document.getElementById("clientRole").value || "Cliente",
        department: "",
        phone: document.getElementById("clientPhone").value,
        office: document.getElementById("clientCountry").value,
        company: document.getElementById("clientCompany").value.trim(),
        createdAt: PB_now(),
        updatedAt: PB_now()
      };

      if (!user.name || !user.company) {
        PB_authToast("Preenche nome e empresa.");
        return;
      }

      await PB_createUserIfNotExists(user);
      PB_saveLocalClient(user);

      const session = {
        uid: id,
        id,
        type: "client",
        email: user.email,
        name: user.name,
        company: user.company,
        role: user.role,
        phone: user.phone,
        country: user.office,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        theme: "classic",
        notifications: true
      };

      setClientSession(session);
      location.href = "cliente.html";
    } catch (err) {
      PB_authToast(err.message);
    }
  };
}
