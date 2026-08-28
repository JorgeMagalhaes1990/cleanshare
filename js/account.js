import { getSupabaseClient, isSupabaseConfigured } from "./supabase-client.js";
const PILOT_MODE_ALLOWS_UNVERIFIED_CMD = true;
const DEMO_MODE = new URLSearchParams(window.location.search).get("demo") === "1";
const DEFAULT_DEMO_MESSAGE = "Funcionalidade disponível quando a operação estiver ligada aos dados reais.";
const DEFAULT_REAL_MESSAGE = "Esta secção será ativada à medida que as operações reais forem ligadas à área pessoal.";
const ALLOWED_ROLES = ["owner", "renter"];
const DEFAULT_NOTIFICATIONS = {
    operation_updates: true,
    user_messages: true,
    cleanshare_news: false
};

const roleButtons = [...document.querySelectorAll("[data-role-filter]")];
const pendingItems = [...document.querySelectorAll(".pending-item[data-role]")];
const operationRows = [...document.querySelectorAll(".operations-table tbody tr[data-role]")];
const pendingCount = document.querySelector("[data-pending-count]");
const pendingEmpty = document.querySelector("[data-pending-empty]");
const operationsEmpty = document.querySelector("[data-operations-empty]");
const operationCenter = document.getElementById("operation-center");
const closeOperationButton = document.querySelector("[data-close-operation]");
const toast = document.querySelector("[data-toast]");
const toastMessage = document.querySelector("[data-toast-message]");
const toastClose = document.querySelector("[data-toast-close]");
const accessContent = document.getElementById("access-content");
const loadingPanel = document.querySelector("[data-account-loading]");
const authGate = document.querySelector("[data-auth-gate]");
const profileErrorPanel = document.querySelector("[data-profile-error]");
const profileErrorMessage = document.querySelector("[data-profile-error-message]");
const accountShell = document.querySelector("[data-account-shell]");
const userControls = document.querySelector("[data-user-controls]");
const demoNotice = document.querySelector("[data-demo-notice]");
const pilotNotice = document.querySelector("[data-pilot-notice]");
const demoExit = document.querySelector("[data-demo-exit]");
const realLogout = document.querySelector("[data-real-logout]");
const profileForm = document.querySelector("[data-profile-form]");
const profileMessage = document.querySelector("[data-profile-message]");
const securityMessage = document.querySelector("[data-security-message]");
const profileSaveButton = document.querySelector("[data-profile-save]");
const passwordResetButton = document.querySelector("[data-password-reset]");
const profileRetryButton = document.querySelector("[data-profile-retry]");
const profileNavigation = document.querySelector("[data-profile-nav]");
const skipLink = document.querySelector(".skip-link");
const profilePostalCodeInput = document.querySelector("[data-profile-postal-code]");

let supabase = null;
let currentUser = null;
let currentProfile = null;
let currentRoles = [];
let currentNotifications = { ...DEFAULT_NOTIFICATIONS };
let toastTimer = null;
let lastOperationTrigger = null;

function normalizePostalCode(value) {
    return String(value || "").replace(/\D/g, "").slice(0, 7);
}

const financeByRole = {
    all: {
        title: "Saldo da atividade",
        metrics: [["A receber", "125 €"], ["Cauções em curso", "450 €"], ["Operações do mês", "4"]]
    },
    owner: {
        title: "Atividade como proprietário",
        metrics: [["Ganhos previstos", "125 €"], ["Próximo pagamento", "75 €"], ["Equipamentos ativos", "3"]]
    },
    renter: {
        title: "Atividade como arrendatário",
        metrics: [["Pagamentos", "110 €"], ["Cauções bloqueadas", "300 €"], ["Reservas ativas", "2"]]
    }
};

const realFinanceByRole = {
    all: {
        title: "Atividade real",
        metrics: [["Saldo disponível", "0,00 €"], ["Operações ativas", "0"], ["Movimentos recentes", "Sem movimentos"]]
    },
    owner: {
        title: "Atividade como proprietário",
        metrics: [["Ganhos previstos", "0,00 €"], ["Operações ativas", "0"], ["Movimentos recentes", "Sem movimentos"]]
    },
    renter: {
        title: "Atividade como arrendatário",
        metrics: [["Pagamentos", "0,00 €"], ["Reservas ativas", "0"], ["Movimentos recentes", "Sem movimentos"]]
    }
};

const nextOperationByRole = {
    all: {
        id: "CS-2026-0148", status: "Recolha amanhã", equipment: "Extratora Karcher Puzzi 10/1",
        role: "Está como proprietário", counterpartyLabel: "Arrendatário", counterparty: "Marta Silva",
        dates: "22–24 agosto 2026", location: "Matosinhos", value: "75,00 € + caução 150,00 €"
    },
    owner: {
        id: "CS-2026-0148", status: "Recolha amanhã", equipment: "Extratora Karcher Puzzi 10/1",
        role: "Está como proprietário", counterpartyLabel: "Arrendatário", counterparty: "Marta Silva",
        dates: "22–24 agosto 2026", location: "Matosinhos", value: "75,00 € + caução 150,00 €"
    },
    renter: {
        id: "CS-2026-0149", status: "Em utilização", equipment: "Mala de tejadilho Thule Motion 3",
        role: "Está como arrendatário", counterpartyLabel: "Proprietário", counterparty: "Ricardo Melo",
        dates: "21–24 agosto 2026", location: "Vila Nova de Gaia", value: "100,00 € + caução 300,00 €"
    }
};

const operationDetails = {
    "CS-2026-0148": {
        status: "Recolha amanhã", statusClass: "status--attention", equipment: "Extratora Karcher Puzzi 10/1",
        dates: "22–24 agosto 2026", location: "Matosinhos", counterparty: "Marta Silva", total: "75,00 €",
        deposit: "150,00 €", insurance: "Incluído no período acordado", action: "Combinar horário de recolha",
        actionCopy: "Fale com Marta e confirme o horário antes da recolha de amanhã.",
        message: "“Olá Jorge, consigo estar em Matosinhos amanhã às 10:30. Confirma?”", currentStage: 4
    },
    "CS-2026-0151": {
        status: "Pedido recebido", statusClass: "status--new", equipment: "Lavadora de alta pressão Kärcher",
        dates: "27–28 agosto 2026", location: "Porto", counterparty: "João Costa", total: "40,00 €",
        deposit: "150,00 €", insurance: "A confirmar após aceitação", action: "Responder ao pedido",
        actionCopy: "Reveja as datas e condições propostas por João antes de aceitar o pedido.",
        message: "“Boa tarde, a lavadora está disponível para recolha ao fim do dia 27?”", currentStage: 1
    },
    "CS-2026-0149": {
        status: "Em utilização", statusClass: "status--active", equipment: "Mala de tejadilho Thule Motion 3",
        dates: "21–24 agosto 2026", location: "Vila Nova de Gaia", counterparty: "Ricardo Melo", total: "100,00 €",
        deposit: "300,00 €", insurance: "Incluído no período acordado", action: "Adicionar fotografias da entrega",
        actionCopy: "Registe o estado do equipamento para completar a documentação desta operação.",
        message: "“A mala ficou bem instalada. Enviei também as instruções de abertura.”", currentStage: 5
    },
    "CS-2026-0146": {
        status: "Concluída", statusClass: "status--complete", equipment: "Projetor Epson Full HD",
        dates: "15 agosto 2026", location: "Braga", counterparty: "Inês Rocha", total: "30,00 €",
        deposit: "150,00 € libertada", insurance: "Período terminado", action: "Operação concluída",
        actionCopy: "Este exemplo não tem ações pendentes. Pode consultar os documentos demonstrativos.",
        message: "“Obrigada, o projetor foi devolvido e confirmado sem incidentes.”", currentStage: 9
    }
};

const verificationLabels = {
    unverified: "Não iniciada",
    pending: "Pendente",
    verified: "Verificada",
    rejected: "Rejeitada"
};

function setHidden(element, hidden) {
    if (element) element.hidden = hidden;
}

function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
}

function setAllText(selector, value) {
    document.querySelectorAll(selector).forEach((element) => {
        element.textContent = value;
    });
}

function getInitials(name, fallback = "CS") {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return fallback;
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function getFirstName(name, fallback = "Utilizador") {
    return String(name || "").trim().split(/\s+/)[0] || fallback;
}

function normalizeRoles(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((role) => ALLOWED_ROLES.includes(role)))];
}

function normalizeNotifications(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
        operation_updates: typeof source.operation_updates === "boolean" ? source.operation_updates : true,
        user_messages: typeof source.user_messages === "boolean" ? source.user_messages : true,
        cleanshare_news: typeof source.cleanshare_news === "boolean" ? source.cleanshare_news : false
    };
}

function normalizeVerification(value) {
    return Object.hasOwn(verificationLabels, value) ? value : "unverified";
}

function canOperate(profile = currentProfile) {
    const verification = normalizeVerification(profile?.verification_status);
    return verification === "verified" || PILOT_MODE_ALLOWS_UNVERIFIED_CMD;
}

function getAccessState(profile = currentProfile) {
    const verification = normalizeVerification(profile?.verification_status);
    if (verification === "verified") {
        return { allowed: true, label: "CMD verificada", copy: "A autenticação CMD está verificada." };
    }
    if (PILOT_MODE_ALLOWS_UNVERIFIED_CMD) {
        return { allowed: true, label: "Piloto autorizado", copy: "A CMD não bloqueia operações durante o piloto." };
    }
    return { allowed: false, label: "CMD obrigatória", copy: "Conclua a autenticação CMD antes de realizar operações." };
}

function dispatchAccountState() {
    if (!currentUser) return;
    window.dispatchEvent(new CustomEvent("cleanshare:account-ready", {
        detail: {
            userId: currentUser.id,
            roles: [...currentRoles],
            readiness: getReadiness(),
            canOperate: canOperate(),
            profileDefaults: {
                city: String(currentProfile?.city || "").trim(),
                postalCode: normalizePostalCode(currentProfile?.postal_code)
            }
        }
    }));
}

function showToast(message = DEFAULT_DEMO_MESSAGE) {
    if (!toast || !toastMessage) return;
    window.clearTimeout(toastTimer);
    toastMessage.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 5200);
}

function hideToast() {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.hidden = true;
}

function showAccessState(state, errorCopy = "") {
    const inApp = state === "app";
    setHidden(accessContent, inApp);
    setHidden(loadingPanel, state !== "loading");
    setHidden(authGate, state !== "auth");
    setHidden(profileErrorPanel, state !== "error");
    setHidden(accountShell, !inApp);
    if (profileErrorMessage && errorCopy) profileErrorMessage.textContent = errorCopy;
    if (skipLink) skipLink.href = inApp ? "#account-content" : "#access-content";
}

function showUserControls(fullName, demoMode) {
    const displayName = String(fullName || "").trim() || (demoMode ? "Jorge" : "Utilizador");
    setAllText("[data-account-name]", getFirstName(displayName));
    setAllText("[data-account-initials]", demoMode ? "JM" : getInitials(displayName, "CS"));
    setHidden(userControls, false);
    setHidden(demoExit, !demoMode);
    setHidden(realLogout, demoMode);

    const notificationButton = document.querySelector("[data-notification-button]");
    const notificationCount = document.querySelector("[data-notification-count]");
    if (notificationButton) {
        notificationButton.setAttribute("aria-label", demoMode ? "Notificações: 3 por consultar" : "Sem notificações");
    }
    setHidden(notificationCount, !demoMode);

    const operationsBadge = document.querySelector("[data-operations-badge]");
    if (operationsBadge) {
        operationsBadge.textContent = demoMode ? "3" : "0";
        operationsBadge.hidden = !demoMode;
    }
}

function setRoleFilterState(role) {
    roleButtons.forEach((button) => {
        const selected = button.dataset.roleFilter === role;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-pressed", String(selected));
    });
}

function updateFinance(summary) {
    setText("[data-finance-title]", summary.title);
    summary.metrics.forEach(([label, value], index) => {
        setText(`[data-finance-label="${index}"]`, label);
        setText(`[data-finance-value="${index}"]`, value);
    });
}

function updateNextOperation(role) {
    const operation = nextOperationByRole[role] || nextOperationByRole.all;
    setText("[data-next-status]", operation.status);
    setText("[data-next-id]", `Operação #${operation.id}`);
    setText("[data-next-equipment]", operation.equipment);
    setText("[data-next-role]", operation.role);
    setText("[data-next-counterparty-label]", operation.counterpartyLabel);
    setText("[data-next-counterparty]", operation.counterparty);
    setText("[data-next-counterparty-initials]", getInitials(operation.counterparty));
    setText("[data-next-dates]", operation.dates);
    setText("[data-next-location]", operation.location);
    setText("[data-next-value]", operation.value);
    const openButton = document.querySelector(".next-operation [data-open-operation]");
    if (openButton) openButton.dataset.openOperation = operation.id;
}

function filterDemoByRole(role) {
    setRoleFilterState(role);
    let visiblePending = 0;
    pendingItems.forEach((item) => {
        const visible = role === "all" || item.dataset.role === role || item.dataset.role === "account";
        item.hidden = !visible;
        if (visible) visiblePending += 1;
    });
    let visibleOperations = 0;
    operationRows.forEach((row) => {
        const visible = role === "all" || row.dataset.role === role;
        row.hidden = !visible;
        if (visible) visibleOperations += 1;
    });
    if (pendingCount) pendingCount.textContent = String(visiblePending);
    if (pendingEmpty) pendingEmpty.hidden = visiblePending > 0;
    if (operationsEmpty) operationsEmpty.hidden = visibleOperations > 0;
    updateFinance(financeByRole[role] || financeByRole.all);
    updateNextOperation(role);
}

function filterRealByRole(role) {
    if (role !== "all" && !currentRoles.includes(role)) return;
    setRoleFilterState(role);
    updateFinance(realFinanceByRole[role] || realFinanceByRole.all);
    window.dispatchEvent(new CustomEvent("cleanshare:role-filter", { detail: { role } }));
}

function filterByRole(role) {
    if (DEMO_MODE) filterDemoByRole(role);
    else filterRealByRole(role);
}

function completeIcon() {
    return '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3 3 7-7"></path></svg>';
}

function updateTimeline(currentStage) {
    const steps = [...document.querySelectorAll(".operation-timeline li")];
    steps.forEach((step, index) => {
        const marker = step.querySelector(":scope > span");
        const detail = step.querySelector("small");
        const completed = index < currentStage;
        const current = index === currentStage && currentStage < steps.length;
        step.classList.toggle("is-complete", completed);
        step.classList.toggle("is-current", current);
        if (marker) marker.innerHTML = completed ? completeIcon() : String(index + 1);
        if (detail) detail.textContent = completed ? "Concluído" : current ? "Etapa atual" : "Por iniciar";
    });
}

function openOperation(operationId, trigger) {
    if (!DEMO_MODE || !operationCenter) return;
    const operation = operationDetails[operationId] || operationDetails["CS-2026-0148"];
    lastOperationTrigger = trigger || null;
    setText("[data-detail-id]", `Operação #${operationId}`);
    setText("[data-detail-equipment]", operation.equipment);
    setText("[data-detail-status]", operation.status);
    setText("[data-detail-dates]", operation.dates);
    setText("[data-detail-location]", operation.location);
    setText("[data-detail-counterparty]", operation.counterparty);
    setText("[data-detail-total]", operation.total);
    setText("[data-detail-deposit]", operation.deposit);
    setText("[data-detail-insurance]", operation.insurance);
    setText("[data-detail-action]", operation.action);
    setText("[data-detail-action-copy]", operation.actionCopy);
    setText("[data-detail-counterparty-initials]", getInitials(operation.counterparty));
    setText("[data-detail-counterparty-name]", operation.counterparty);
    setText("[data-detail-message]", operation.message);
    const status = document.querySelector("[data-detail-status]");
    if (status) {
        status.classList.remove("status--new", "status--attention", "status--active", "status--complete");
        status.classList.add(operation.statusClass);
    }
    updateTimeline(operation.currentStage);
    operationCenter.hidden = false;
    window.requestAnimationFrame(() => {
        operationCenter.scrollIntoView({ behavior: "smooth", block: "start" });
        operationCenter.focus({ preventScroll: true });
    });
}

function closeOperation() {
    if (!operationCenter) return;
    operationCenter.hidden = true;
    lastOperationTrigger?.focus();
}

function getRealDisplayName() {
    const profileName = String(currentProfile?.full_name || "").trim();
    const metadataName = String(currentUser?.user_metadata?.full_name || "").trim();
    const emailName = String(currentUser?.email || "").split("@")[0];
    return profileName || metadataName || emailName || "Utilizador";
}

function getReadiness() {
    return {
        email: Boolean(currentUser?.email_confirmed_at || currentUser?.confirmed_at),
        name: Boolean(String(currentProfile?.full_name || "").trim()),
        phone: Boolean(String(currentProfile?.phone || "").trim()),
        location: Boolean(String(currentProfile?.city || "").trim() && String(currentProfile?.postal_code || "").trim()),
        roles: currentRoles.length > 0
    };
}

function updateReadiness() {
    const readiness = getReadiness();
    const completed = Object.values(readiness).filter(Boolean).length;
    const percentage = completed * 20;
    setText("[data-readiness-score]", `${completed} de 5`);
    setText("[data-readiness-label]", `${percentage}% dos requisitos concluídos`);
    const progress = document.querySelector("[data-readiness-progress]");
    const bar = document.querySelector("[data-readiness-bar]");
    progress?.setAttribute("aria-valuenow", String(percentage));
    if (bar) bar.style.width = `${percentage}%`;
    Object.entries(readiness).forEach(([key, complete]) => {
        const item = document.querySelector(`[data-requirement="${key}"]`);
        const icon = item?.querySelector(":scope > span");
        item?.classList.toggle("is-complete", complete);
        if (icon) icon.textContent = complete ? "✓" : "!";
    });
    const verification = normalizeVerification(currentProfile?.verification_status);
    setText("[data-cmd-readiness]", verificationLabels[verification]);
    setText("[data-cmd-pilot-copy]", PILOT_MODE_ALLOWS_UNVERIFIED_CMD ? "Não obrigatória durante o piloto." : "Obrigatória para realizar operações.");
    return readiness;
}

function updatePendingActions(readiness) {
    const profileAction = document.querySelector("[data-real-profile-action]");
    const emailAction = document.querySelector("[data-real-email-action]");
    const realPendingEmpty = document.querySelector("[data-real-pending-empty]");
    const profileIncomplete = !readiness.name || !readiness.phone || !readiness.location || !readiness.roles;
    const emailIncomplete = !readiness.email;
    const count = Number(profileIncomplete) + Number(emailIncomplete);
    setHidden(profileAction, !profileIncomplete);
    setHidden(emailAction, !emailIncomplete);
    setHidden(realPendingEmpty, count > 0);
    if (pendingCount) pendingCount.textContent = String(count);
}

function updateSecurity() {
    const emailConfirmed = Boolean(currentUser?.email_confirmed_at || currentUser?.confirmed_at);
    const verification = normalizeVerification(currentProfile?.verification_status);
    const access = getAccessState();
    setText("[data-security-email]", emailConfirmed ? "Confirmado" : "Não confirmado");
    setText("[data-security-cmd]", verificationLabels[verification]);
    setText("[data-security-access]", access.label);
    setText("[data-security-access-copy]", access.copy);
    setText("[data-operation-access-state]", access.label);
    document.querySelectorAll("[data-security-access], [data-operation-access-state]").forEach((element) => {
        element.dataset.allowed = String(canOperate());
    });
}

function fillProfileForm() {
    const fields = {
        "[data-profile-full-name]": currentProfile?.full_name || "",
        "[data-profile-email]": currentUser?.email || "",
        "[data-profile-phone]": currentProfile?.phone || "",
        "[data-profile-city]": currentProfile?.city || "",
        "[data-profile-postal-code]": normalizePostalCode(currentProfile?.postal_code)
    };
    Object.entries(fields).forEach(([selector, value]) => {
        const field = document.querySelector(selector);
        if (field) field.value = String(value);
    });
    document.querySelectorAll("[data-role-preference]").forEach((input) => {
        input.checked = currentRoles.includes(input.value);
    });
    document.querySelectorAll("[data-notification-preference]").forEach((input) => {
        input.checked = Boolean(currentNotifications[input.dataset.notificationPreference]);
    });
}

function updateRoleButtons() {
    roleButtons.forEach((button) => {
        const role = button.dataset.roleFilter;
        const enabled = role === "all" || currentRoles.includes(role);
        button.disabled = !enabled;
        button.title = enabled ? "" : "Ative este papel em Perfil e segurança.";
        button.setAttribute("aria-disabled", String(!enabled));
    });
}

function applyRealState() {
    showUserControls(getRealDisplayName(), false);
    document.querySelectorAll("[data-real-only]:not([data-marketplace-controlled])").forEach((element) => { element.hidden = false; });
    setText("[data-finance-badge]", "DADOS REAIS ATUAIS");
    fillProfileForm();
    updateRoleButtons();
    const readiness = updateReadiness();
    updatePendingActions(readiness);
    updateSecurity();
    filterRealByRole("all");
    setHidden(pilotNotice, !PILOT_MODE_ALLOWS_UNVERIFIED_CMD);
    showAccessState("app");
    dispatchAccountState();
}

async function fetchRealState() {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("SESSION_UNAVAILABLE");
    currentUser = userData.user;
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, phone, city, postal_code, verification_status")
        .eq("id", currentUser.id)
        .maybeSingle();
    if (profileError) throw new Error("PROFILE_READ_FAILED");
    if (!profile) throw new Error("PROFILE_NOT_FOUND");
    currentProfile = profile;
    currentRoles = normalizeRoles(currentUser.user_metadata?.roles);
    currentNotifications = normalizeNotifications(currentUser.user_metadata?.notifications);
}

function profileLoadMessage(error) {
    if (error?.message === "PROFILE_NOT_FOUND") {
        return "A conta existe, mas o perfil associado ainda não foi criado. Tente novamente; se o problema continuar, contacte o suporte CleanShare.";
    }
    if (error?.message === "SESSION_UNAVAILABLE") {
        return "A sessão deixou de estar disponível. Volte à landing e inicie sessão novamente.";
    }
    return "Não foi possível ler o perfil neste momento. Verifique a ligação e tente novamente.";
}

async function loadAuthenticatedArea() {
    try {
        await fetchRealState();
        applyRealState();
    } catch (error) {
        setHidden(pilotNotice, true);
        setHidden(userControls, true);
        showAccessState("error", profileLoadMessage(error));
    }
}

async function initializeRealMode() {
    document.body.dataset.mode = "real";
    setHidden(demoNotice, true);
    setHidden(pilotNotice, true);
    setHidden(userControls, true);
    showAccessState("loading");
    if (!isSupabaseConfigured) {
        showAccessState("error", "A área pessoal ainda não está ligada ao serviço de autenticação. Tente novamente mais tarde.");
        return;
    }
    try {
        supabase = await getSupabaseClient();
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session?.user) {
            showAccessState("auth");
            return;
        }
        currentUser = data.session.user;
        await loadAuthenticatedArea();
    } catch {
        showAccessState("error", "Não foi possível confirmar a sessão. Verifique a ligação e tente novamente.");
    }
}

function initializeDemoMode() {
    document.body.dataset.mode = "demo";
    setHidden(demoNotice, false);
    setHidden(pilotNotice, true);
    showUserControls("Jorge", true);
    showAccessState("app");
    filterDemoByRole("all");
}

function setProfileMessage(text = "", type = "info") {
    if (!profileMessage) return;
    profileMessage.textContent = text;
    profileMessage.dataset.type = type;
}

function setSecurityMessage(text = "", type = "info") {
    if (!securityMessage) return;
    securityMessage.textContent = text;
    securityMessage.dataset.type = type;
}

function getFormState() {
    const formData = new FormData(profileForm);
    return {
        profile: {
            full_name: String(formData.get("full_name") || "").trim(),
            phone: String(formData.get("phone") || "").trim() || null,
            city: String(formData.get("city") || "").trim() || null,
            postal_code: normalizePostalCode(formData.get("postal_code")) || null
        },
        roles: normalizeRoles(formData.getAll("roles")),
        notifications: {
            operation_updates: Boolean(formData.get("operation_updates")),
            user_messages: Boolean(formData.get("user_messages")),
            cleanshare_news: Boolean(formData.get("cleanshare_news"))
        }
    };
}

function validateProfileForm(state) {
    if (!profileForm.reportValidity()) return false;
    if (state.profile.postal_code && !/^\d{7}$/.test(state.profile.postal_code)) {
        setProfileMessage("Introduza os 7 algarismos do código postal, sem hífen.", "error");
        document.querySelector("[data-profile-postal-code]")?.focus();
        return false;
    }
    if (!state.roles.length) {
        setProfileMessage("Selecione pelo menos uma forma de utilizar a CleanShare.", "error");
        document.querySelector("[data-role-preference]")?.focus();
        return false;
    }
    return true;
}

async function saveProfile(event) {
    event.preventDefault();
    if (DEMO_MODE || !supabase || !currentUser) return;
    const state = getFormState();
    setProfileMessage();
    if (!validateProfileForm(state)) return;
    profileSaveButton.disabled = true;
    profileSaveButton.textContent = "A guardar…";
    profileForm.setAttribute("aria-busy", "true");
    let profileSaved = false;
    let metadataSaved = false;
    let persistedStateReloaded = false;
    try {
        const { error: profileUpdateError } = await supabase.from("profiles").update(state.profile).eq("id", currentUser.id);
        profileSaved = !profileUpdateError;
        const { error: metadataUpdateError } = await supabase.auth.updateUser({
            data: { roles: state.roles, notifications: state.notifications }
        });
        metadataSaved = !metadataUpdateError;
        try {
            await fetchRealState();
            applyRealState();
            persistedStateReloaded = true;
        } catch {
            // Mantém o estado conhecido e apresenta abaixo o resultado confirmado.
        }
        if (!persistedStateReloaded && (profileSaved || metadataSaved)) {
            setProfileMessage("Algumas alterações podem ter sido guardadas, mas não foi possível recarregar o estado persistido. Atualize a página antes de voltar a editar.", "warning");
        } else if (profileSaved && metadataSaved) {
            setProfileMessage("Alterações guardadas com sucesso.", "success");
        } else if (profileSaved) {
            setProfileMessage("Os dados do perfil foram guardados, mas não foi possível guardar as preferências. O formulário mostra o estado que conseguimos confirmar.", "warning");
        } else if (metadataSaved) {
            setProfileMessage("As preferências foram guardadas, mas não foi possível atualizar os dados do perfil. O formulário mostra o estado que conseguimos confirmar.", "warning");
        } else {
            setProfileMessage("Não foi possível guardar as alterações. Reveja os dados e tente novamente.", "error");
        }
    } catch {
        setProfileMessage("A ligação foi interrompida antes de confirmarmos todas as alterações. O formulário mantém o último estado conhecido; tente novamente.", "error");
    } finally {
        profileSaveButton.disabled = false;
        profileSaveButton.textContent = "Guardar alterações";
        profileForm.setAttribute("aria-busy", "false");
    }
}

async function requestPasswordReset() {
    if (DEMO_MODE || !supabase || !currentUser?.email) return;
    passwordResetButton.disabled = true;
    setSecurityMessage("A preparar o email…");
    const redirectTo = `${window.location.origin}/index.html?auth=login&returnTo=area-utilizador.html`;
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, { redirectTo });
        if (error) {
            setSecurityMessage("Não foi possível enviar o email. Tente novamente mais tarde.", "error");
            return;
        }
        setSecurityMessage("Email enviado. Siga a ligação recebida para alterar a palavra-passe.", "success");
    } catch {
        setSecurityMessage("Não foi possível enviar o email. Verifique a ligação e tente novamente.", "error");
    } finally {
        passwordResetButton.disabled = false;
    }
}

async function logoutRealSession() {
    if (DEMO_MODE || !supabase) return;
    realLogout.disabled = true;
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            showToast("Não foi possível terminar a sessão. Tente novamente.");
            return;
        }
        window.location.assign("index.html");
    } catch {
        showToast("Não foi possível terminar a sessão. Tente novamente.");
    } finally {
        realLogout.disabled = false;
    }
}

roleButtons.forEach((button) => {
    button.addEventListener("click", () => filterByRole(button.dataset.roleFilter));
});

document.querySelectorAll("[data-demo-action]").forEach((button) => {
    button.addEventListener("click", () => {
        const message = DEMO_MODE ? button.dataset.demoMessage || DEFAULT_DEMO_MESSAGE : DEFAULT_REAL_MESSAGE;
        showToast(message);
    });
});

document.querySelectorAll("[data-open-operation]").forEach((button) => {
    button.addEventListener("click", () => openOperation(button.dataset.openOperation, button));
});

profileNavigation?.addEventListener("click", (event) => {
    if (!DEMO_MODE) return;
    event.preventDefault();
    showToast(DEFAULT_DEMO_MESSAGE);
});

profileForm?.addEventListener("submit", saveProfile);
profilePostalCodeInput?.addEventListener("input", () => {
    profilePostalCodeInput.value = normalizePostalCode(profilePostalCodeInput.value);
});
passwordResetButton?.addEventListener("click", requestPasswordReset);
profileRetryButton?.addEventListener("click", initializeRealMode);
realLogout?.addEventListener("click", logoutRealSession);
closeOperationButton?.addEventListener("click", closeOperation);
toastClose?.addEventListener("click", hideToast);

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !operationCenter?.hidden) closeOperation();
});

if (DEMO_MODE) initializeDemoMode();
else initializeRealMode();
