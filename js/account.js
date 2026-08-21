import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const PLACEHOLDER_KEY = "__SUPABASE_PUBLISHABLE_KEY__";
const DEFAULT_DEMO_MESSAGE = "Funcionalidade disponível quando a operação estiver ligada aos dados reais.";

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

let toastTimer = null;
let lastOperationTrigger = null;

const financeByRole = {
    all: {
        title: "Saldo da atividade",
        metrics: [
            ["A receber", "125 €"],
            ["Cauções em curso", "450 €"],
            ["Operações do mês", "4"]
        ]
    },
    owner: {
        title: "Atividade como proprietário",
        metrics: [
            ["Ganhos previstos", "125 €"],
            ["Próximo pagamento", "75 €"],
            ["Equipamentos ativos", "3"]
        ]
    },
    renter: {
        title: "Atividade como arrendatário",
        metrics: [
            ["Pagamentos", "110 €"],
            ["Cauções bloqueadas", "300 €"],
            ["Reservas ativas", "2"]
        ]
    }
};

const nextOperationByRole = {
    all: {
        id: "CS-2026-0148",
        status: "Recolha amanhã",
        equipment: "Extratora Karcher Puzzi 10/1",
        role: "Está como proprietário",
        counterpartyLabel: "Arrendatário",
        counterparty: "Marta Silva",
        dates: "22–24 agosto 2026",
        location: "Matosinhos",
        value: "75,00 € + caução 150,00 €"
    },
    owner: {
        id: "CS-2026-0148",
        status: "Recolha amanhã",
        equipment: "Extratora Karcher Puzzi 10/1",
        role: "Está como proprietário",
        counterpartyLabel: "Arrendatário",
        counterparty: "Marta Silva",
        dates: "22–24 agosto 2026",
        location: "Matosinhos",
        value: "75,00 € + caução 150,00 €"
    },
    renter: {
        id: "CS-2026-0149",
        status: "Em utilização",
        equipment: "Mala de tejadilho Thule Motion 3",
        role: "Está como arrendatário",
        counterpartyLabel: "Proprietário",
        counterparty: "Ricardo Melo",
        dates: "21–24 agosto 2026",
        location: "Vila Nova de Gaia",
        value: "100,00 € + caução 300,00 €"
    }
};

const operationDetails = {
    "CS-2026-0148": {
        status: "Recolha amanhã",
        statusClass: "status--attention",
        equipment: "Extratora Karcher Puzzi 10/1",
        dates: "22–24 agosto 2026",
        location: "Matosinhos",
        counterparty: "Marta Silva",
        total: "75,00 €",
        deposit: "150,00 €",
        insurance: "Incluído no período acordado",
        action: "Combinar horário de recolha",
        actionCopy: "Fale com Marta e confirme o horário antes da recolha de amanhã.",
        message: "“Olá Jorge, consigo estar em Matosinhos amanhã às 10:30. Confirma?”",
        currentStage: 4
    },
    "CS-2026-0151": {
        status: "Pedido recebido",
        statusClass: "status--new",
        equipment: "Lavadora de alta pressão Kärcher",
        dates: "27–28 agosto 2026",
        location: "Porto",
        counterparty: "João Costa",
        total: "40,00 €",
        deposit: "150,00 €",
        insurance: "A confirmar após aceitação",
        action: "Responder ao pedido",
        actionCopy: "Reveja as datas e condições propostas por João antes de aceitar o pedido.",
        message: "“Boa tarde, a lavadora está disponível para recolha ao fim do dia 27?”",
        currentStage: 1
    },
    "CS-2026-0149": {
        status: "Em utilização",
        statusClass: "status--active",
        equipment: "Mala de tejadilho Thule Motion 3",
        dates: "21–24 agosto 2026",
        location: "Vila Nova de Gaia",
        counterparty: "Ricardo Melo",
        total: "100,00 €",
        deposit: "300,00 €",
        insurance: "Incluído no período acordado",
        action: "Adicionar fotografias da entrega",
        actionCopy: "Registe o estado do equipamento para completar a documentação desta operação.",
        message: "“A mala ficou bem instalada. Enviei também as instruções de abertura.”",
        currentStage: 5
    },
    "CS-2026-0146": {
        status: "Concluída",
        statusClass: "status--complete",
        equipment: "Projetor Epson Full HD",
        dates: "15 agosto 2026",
        location: "Braga",
        counterparty: "Inês Rocha",
        total: "30,00 €",
        deposit: "150,00 € libertada",
        insurance: "Período terminado",
        action: "Operação concluída",
        actionCopy: "Este exemplo não tem ações pendentes. Pode consultar os documentos demonstrativos.",
        message: "“Obrigada, o projetor foi devolvido e confirmado sem incidentes.”",
        currentStage: 9
    }
};

function getInitials(name) {
    const words = String(name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!words.length) return "JM";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
}

function showToast(message = DEFAULT_DEMO_MESSAGE) {
    if (!toast || !toastMessage) return;

    window.clearTimeout(toastTimer);
    toastMessage.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => {
        toast.hidden = true;
    }, 5200);
}

function hideToast() {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.hidden = true;
}

function updateFinance(role) {
    const summary = financeByRole[role] || financeByRole.all;
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

function filterByRole(role) {
    roleButtons.forEach((button) => {
        const selected = button.dataset.roleFilter === role;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-pressed", String(selected));
    });

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

    updateFinance(role);
    updateNextOperation(role);
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
        if (detail) {
            detail.textContent = completed ? "Concluído" : current ? "Etapa atual" : "Por iniciar";
        }
    });
}

function openOperation(operationId, trigger) {
    const operation = operationDetails[operationId] || operationDetails["CS-2026-0148"];
    if (!operationCenter) return;

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

async function personalizeFromSession() {
    const configurationReady = Boolean(
        SUPABASE_URL
        && SUPABASE_PUBLISHABLE_KEY
        && SUPABASE_PUBLISHABLE_KEY !== PLACEHOLDER_KEY
    );

    if (!configurationReady) return;

    try {
        const { createClient } = await import(SUPABASE_CDN);
        const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false
            }
        });
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session?.user) return;

        const user = data.session.user;
        const metadataName = String(user.user_metadata?.full_name || "").trim();
        const fallbackName = String(user.email || "").split("@")[0];
        const fullName = metadataName || fallbackName || "Jorge";
        const firstName = fullName.split(/\s+/)[0];

        document.querySelectorAll("[data-account-name]").forEach((element) => {
            element.textContent = firstName;
        });
        document.querySelectorAll("[data-account-initials]").forEach((element) => {
            element.textContent = getInitials(fullName);
        });
    } catch {
        // A área continua funcional em modo de demonstração quando o serviço não responde.
    }
}

roleButtons.forEach((button) => {
    button.addEventListener("click", () => filterByRole(button.dataset.roleFilter));
});

document.querySelectorAll("[data-demo-action]").forEach((button) => {
    button.addEventListener("click", () => {
        showToast(button.dataset.demoMessage || DEFAULT_DEMO_MESSAGE);
    });
});

document.querySelectorAll("[data-open-operation]").forEach((button) => {
    button.addEventListener("click", () => openOperation(button.dataset.openOperation, button));
});

closeOperationButton?.addEventListener("click", closeOperation);
toastClose?.addEventListener("click", hideToast);

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !operationCenter?.hidden) closeOperation();
});

filterByRole("all");
personalizeFromSession();
