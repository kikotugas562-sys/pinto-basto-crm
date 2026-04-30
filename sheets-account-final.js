/**
 * PINTO BASTO CRM — GUARDA CONTA SEM DUPLICAR
 *
 * Este é o ÚNICO ficheiro de fix de conta que deve ficar ativo.
 * Remove do HTML:
 * - sheets-save-fix.js
 * - sheets-replace-fix.js
 * - sheets-account-patch.js
 *
 * Este ficheiro:
 * - procura a conta por email no Google Sheets;
 * - atualiza essa linha existente;
 * - NUNCA cria nova conta ao editar definições;
 * - se não encontrar a conta, mostra erro e pede para criares a conta primeiro no Sheets.
 */

function PB_accountToast(message) {
  if (typeof toast === "function") toast(message);
  else if (typeof clientToast === "function") clientToast(message);
  else alert(message);
}

function PB_operatorSession() {
  if (typeof me !== "undefined" && me) return me;
  return JSON.parse(localStorage.getItem("pb_current_user") || "null");
}

function PB_clientSession() {
  if (typeof clientMe !== "undefined" && clientMe) return clientMe;
  return JSON.parse(localStorage.getItem("pb_client_session") || "null");
}

async function PB_findSheetUserByEmail(email) {
  if (!email) throw new Error("A conta não tem email.");
  const result = await SheetsDB.list("Users");
  const users = result.data || [];
  return users.find(u => String(u.email).trim().toLowerCase() === String(email).trim().toLowerCase());
}

async function PB_updateUserByEmailOnly(payload) {
  const existing = await PB_findSheetUserByEmail(payload.email);

  if (!existing) {
    throw new Error("Esta conta ainda não existe no Sheets. Cria primeiro a linha na aba Users com este email: " + payload.email);
  }

  const id = existing.id;

  const finalPayload = {
    ...existing,
    ...payload,
    id,
    email: existing.email,
    password: existing.password || payload.password || "",
    createdAt: existing.createdAt || payload.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Usa UPDATE, não CREATE, não UPSERT.
  await SheetsDB.update("Users", id, finalPayload, id);

  return finalPayload;
}

async function PB_saveSettingsByUserId(userId, payload) {
  const settingsResult = await SheetsDB.list("Settings");
  const allSettings = settingsResult.data || [];
  const existing = allSettings.find(s => String(s.userId) === String(userId));

  const finalSettings = {
    ...(existing || {}),
    ...payload,
    userId,
    updatedAt: new Date().toISOString()
  };

  if (existing) {
    await SheetsDB.update("Settings", userId, finalSettings, userId);
  } else {
    // Settings pode ser criado se ainda não existir, porque não é uma conta duplicada.
    await SheetsDB.create("Settings", finalSettings, userId);
  }

  return finalSettings;
}

async function PB_saveOperatorAccountNoDuplicate() {
  if (typeof SheetsDB === "undefined") {
    throw new Error("SheetsDB não está carregado. Confirma se sheets-api.js está no HTML.");
  }

  const session = PB_operatorSession();
  if (!session) throw new Error("Sem sessão de operador.");

  const payload = {
    type: "operator",
    name: document.getElementById("setName")?.value || session.name || "",
    email: session.email || "",
    role: document.getElementById("setRole")?.value || session.role || "",
    department: document.getElementById("setDepartment")?.value || session.department || "",
    phone: document.getElementById("setPhone")?.value || session.phone || "",
    office: document.getElementById("setOffice")?.value || session.office || "",
    company: session.company || "Pinto Basto"
  };

  const savedUser = await PB_updateUserByEmailOnly(payload);

  const settingsPayload = {
    theme: document.getElementById("setTheme")?.value || "classic",
    density: document.getElementById("setDensity")?.value || "comfortable",
    radius: document.getElementById("setRadius")?.value || "soft",
    fontSize: document.getElementById("setFontSize")?.value || "normal",
    notifications: document.getElementById("setNotifications")?.checked ?? true,
    browserNotifications: document.getElementById("setBrowserNotifications")?.checked ?? false,
    animations: document.getElementById("setAnimations")?.checked ?? true,
    glass: document.getElementById("setGlass")?.checked ?? true,
    shadows: document.getElementById("setShadows")?.checked ?? true
  };

  await PB_saveSettingsByUserId(savedUser.id, settingsPayload);

  const newSession = {
    ...session,
    ...savedUser,
    uid: savedUser.id,
    id: savedUser.id
  };
  delete newSession.password;

  localStorage.setItem("pb_current_user", JSON.stringify(newSession));
  if (typeof me !== "undefined") me = newSession;

  PB_accountToast("Conta editada no Google Sheets sem criar duplicados.");
}

async function PB_saveClientAccountNoDuplicate() {
  if (typeof SheetsDB === "undefined") {
    throw new Error("SheetsDB não está carregado. Confirma se sheets-api.js está no HTML.");
  }

  const session = PB_clientSession();
  if (!session) throw new Error("Sem sessão de cliente.");

  const payload = {
    type: "client",
    name: document.getElementById("setClientName")?.value || session.name || "",
    email: session.email || "",
    role: document.getElementById("setClientRole")?.value || session.role || "",
    department: "",
    phone: document.getElementById("setClientPhone")?.value || session.phone || "",
    office: document.getElementById("setClientCountry")?.value || session.country || "",
    company: document.getElementById("setClientCompany")?.value || session.company || ""
  };

  const savedUser = await PB_updateUserByEmailOnly(payload);

  const settingsPayload = {
    theme: document.getElementById("setClientTheme")?.value || session.theme || "classic",
    density: "comfortable",
    radius: "soft",
    fontSize: "normal",
    notifications: document.getElementById("setClientNotifications")?.checked ?? true,
    browserNotifications: false,
    animations: true,
    glass: true,
    shadows: true
  };

  await PB_saveSettingsByUserId(savedUser.id, settingsPayload);

  const newSession = {
    ...session,
    uid: savedUser.id,
    id: savedUser.id,
    name: savedUser.name,
    email: savedUser.email,
    company: savedUser.company,
    role: savedUser.role,
    phone: savedUser.phone,
    country: savedUser.office,
    theme: settingsPayload.theme,
    notifications: settingsPayload.notifications
  };
  delete newSession.password;

  localStorage.setItem("pb_client_session", JSON.stringify(newSession));
  if (typeof clientMe !== "undefined") clientMe = newSession;

  PB_accountToast("Conta do cliente editada no Google Sheets sem criar duplicados.");
}

function PB_installNoDuplicateAccountSave() {
  if (typeof saveSettings === "function" && !saveSettings.__PB_NO_DUPLICATE_FINAL) {
    const originalSaveSettings = saveSettings;

    saveSettings = async function () {
      try {
        // Guarda localmente primeiro para manter UI e localStorage.
        originalSaveSettings();
      } catch (err) {
        console.warn("Aviso na gravação local:", err);
      }

      try {
        await PB_saveOperatorAccountNoDuplicate();
      } catch (err) {
        console.error(err);
        PB_accountToast("Erro ao editar conta no Sheets: " + err.message);
      }
    };

    saveSettings.__PB_NO_DUPLICATE_FINAL = true;
  }

  if (typeof saveClientSettings === "function" && !saveClientSettings.__PB_NO_DUPLICATE_FINAL) {
    const originalSaveClientSettings = saveClientSettings;

    saveClientSettings = async function () {
      try {
        originalSaveClientSettings();
      } catch (err) {
        console.warn("Aviso na gravação local do cliente:", err);
      }

      try {
        await PB_saveClientAccountNoDuplicate();
      } catch (err) {
        console.error(err);
        PB_accountToast("Erro ao editar conta do cliente no Sheets: " + err.message);
      }
    };

    saveClientSettings.__PB_NO_DUPLICATE_FINAL = true;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(PB_installNoDuplicateAccountSave, 1500);
  setTimeout(PB_installNoDuplicateAccountSave, 3500);
});

window.PB_saveOperatorAccountNoDuplicate = PB_saveOperatorAccountNoDuplicate;
window.PB_saveClientAccountNoDuplicate = PB_saveClientAccountNoDuplicate;
