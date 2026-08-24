import { getSupabaseClient, isSupabaseConfigured } from "./supabase-client.js";
const DEMO_MODE = new URLSearchParams(window.location.search).get("demo") === "1";
const IMAGE_BUCKET = "equipment-images";
const CONDITION_IMAGE_BUCKET = "rental-condition-photos";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_CONDITION_PHOTOS = 5;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_ROLES = ["owner", "renter"];
const ACTIVE_RENTAL_STATUSES = ["requested", "confirmed", "in_progress"];
const CHAT_ENABLED_STATUSES = ["requested", "confirmed", "in_progress", "completed", "disputed"];
const CONTACT_ENABLED_STATUSES = ["confirmed", "in_progress", "completed", "disputed"];
const CONDITION_VISIBLE_STATUSES = ["confirmed", "in_progress", "completed", "disputed"];

const systemMessage = document.querySelector("[data-marketplace-system-message]");
const systemRetry = document.querySelector("[data-marketplace-retry]");
const ownerRoleRequired = document.querySelector("[data-owner-role-required]");
const renterRoleRequired = document.querySelector("[data-renter-role-required]");
const equipmentFormToggle = document.querySelector("[data-equipment-form-toggle]");
const equipmentFormPanel = document.querySelector("[data-equipment-form-panel]");
const equipmentFormClose = document.querySelector("[data-equipment-form-close]");
const equipmentForm = document.querySelector("[data-equipment-form]");
const equipmentFormMessage = document.querySelector("[data-equipment-form-message]");
const equipmentImageInput = document.querySelector("[data-equipment-image]");
const equipmentImageError = document.querySelector("[data-equipment-image-error]");
const equipmentImagePreview = document.querySelector("[data-equipment-image-preview]");
const equipmentPreviewImage = document.querySelector("[data-equipment-preview-image]");
const equipmentImageRemove = document.querySelector("[data-equipment-image-remove]");
const ownerEquipmentList = document.querySelector("[data-owner-equipment-list]");
const ownerEquipmentEmpty = document.querySelector("[data-owner-equipment-empty]");
const ownerEquipmentStatus = document.querySelector("[data-owner-equipment-status]");
const equipmentReload = document.querySelector("[data-equipment-reload]");
const pilotListings = document.querySelector("[data-pilot-listings]");
const pilotListingsEmpty = document.querySelector("[data-pilot-listings-empty]");
const listingsStatus = document.querySelector("[data-listings-status]");
const listingsReload = document.querySelector("[data-listings-reload]");
const operationsBody = document.querySelector("[data-real-operations-body]");
const operationsWrap = document.querySelector("[data-real-operations-wrap]");
const operationsEmpty = document.querySelector("[data-real-operations-empty]");
const operationsStatus = document.querySelector("[data-operations-status]");
const pendingActions = document.querySelector("[data-marketplace-pending-actions]");
const nextOperationCard = document.querySelector("[data-real-next-operation]");
const nextOperationEmpty = document.querySelector("[data-real-next-empty]");
const nextOperationButton = document.querySelector("[data-real-open-next]");
const nextOperationConditionProgress = document.querySelector("[data-real-next-condition-progress]");
const realOperationCenter = document.querySelector("[data-real-operation-center]");
const realOperationClose = document.querySelector("[data-real-operation-close]");
const realOperationActions = document.querySelector("[data-real-detail-actions]");
const realOperationMessage = document.querySelector("[data-real-operation-message]");
const ownerResponseField = document.querySelector("[data-real-owner-response]");
const ownerResponseMessage = document.querySelector("[data-owner-response-message]");
const realContact = document.querySelector("[data-real-contact]");
const realContactName = document.querySelector("[data-real-contact-name]");
const realContactPhone = document.querySelector("[data-real-contact-phone]");
const chatHistory = document.querySelector("[data-chat-history]");
const chatForm = document.querySelector("[data-chat-form]");
const chatMessage = document.querySelector("[data-chat-message]");
const chatRefresh = document.querySelector("[data-chat-refresh]");
const chatStatus = document.querySelector("[data-chat-status]");
const conditionEvidence = document.querySelector("[data-condition-evidence]");
const conditionSystemStatus = document.querySelector("[data-condition-system-status]");
const conditionForms = [...document.querySelectorAll("[data-condition-form]")];
const conditionFileInputs = [...document.querySelectorAll("[data-condition-files]")];

let supabase = null;
let currentUser = null;
let accountState = null;
let currentRoleFilter = "all";
let rentals = [];
let listings = [];
let ownEquipment = [];
let operationalReady = false;
let initializing = null;
let selectedRentalId = null;
let previewUrl = null;
let collaborationReady = false;
let rentalMessages = [];
let conditionReports = [];
let conditionProgressByRental = new Map();
const conditionPreviewUrls = new Map();

function setHidden(element, hidden) {
    if (element) element.hidden = hidden;
}

function setMessage(element, message = "", type = "info") {
    if (!element) return;
    element.textContent = message;
    element.dataset.type = type;
    element.hidden = !message;
}

function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value ?? "";
}

function createElement(tag, className = "", text = "") {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== "") element.textContent = String(text);
    return element;
}

function normalizeRoles(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((role) => ALLOWED_ROLES.includes(role)))];
}

function formatCurrency(value) {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(Number(value) || 0);
}

function formatDate(value, options = { day: "2-digit", month: "short", year: "numeric" }) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("pt-PT", options).format(new Date(`${value}T12:00:00`));
}

function formatDateRange(startDate, endDate) {
    return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-PT", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function dateInputToday() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

function inclusiveDays(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    const start = new Date(`${startDate}T12:00:00`);
    const end = new Date(`${endDate}T12:00:00`);
    const days = Math.floor((end - start) / 86400000) + 1;
    return Number.isFinite(days) && days > 0 ? days : 0;
}

function getInitials(name) {
    const words = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "CS";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words.at(-1)[0]}`.toUpperCase();
}

function safeImageUrl(value) {
    if (!value) return "";
    try {
        const url = new URL(value, window.location.origin);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}

function appendEquipmentImage(container, url, alt) {
    const safeUrl = safeImageUrl(url);
    if (safeUrl) {
        const image = createElement("img");
        image.src = safeUrl;
        image.alt = alt;
        image.loading = "lazy";
        container.append(image);
        return;
    }
    container.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 14h32v25H8zM14 14V9h20v5M8 25h32"></path><path d="M20 31h8"></path></svg>';
}

function profileReady() {
    const readiness = accountState?.readiness || {};
    return ["email", "name", "phone", "location", "roles"].every((key) => Boolean(readiness[key]));
}

function hasRole(role) {
    return accountState?.roles?.includes(role) || false;
}

function ensureActionReady(messageElement, role) {
    if (!operationalReady) {
        setMessage(messageElement, "Fluxo operacional ainda não preparado na base de dados.", "warning");
        setHidden(systemMessage, false);
        return false;
    }
    if (!hasRole(role)) {
        setMessage(messageElement, `Ative o papel de ${role === "owner" ? "proprietário" : "arrendatário"} no perfil antes de continuar.`, "warning");
        return false;
    }
    if (!profileReady()) {
        setMessage(messageElement, "Complete os cinco requisitos do perfil antes de realizar uma operação piloto.", "warning");
        return false;
    }
    if (!accountState?.canOperate) {
        setMessage(messageElement, "A sua conta ainda não pode realizar operações.", "warning");
        return false;
    }
    return true;
}

function isRpcUnavailable(error) {
    const code = String(error?.code || "");
    const message = String(error?.message || "").toLowerCase();
    return code === "PGRST202" || code === "42883" || message.includes("schema cache") || (message.includes("function") && message.includes("does not exist"));
}

function friendlyOperationError(error) {
    const raw = `${error?.message || ""} ${error?.details || ""}`;
    const messages = {
        LISTING_UNAVAILABLE: "Este anúncio deixou de estar disponível.",
        SELF_RENTAL_NOT_ALLOWED: "Não pode pedir o aluguer do seu próprio equipamento.",
        INVALID_DATES: "Escolha um intervalo de datas válido.",
        START_DATE_IN_PAST: "A data de início não pode estar no passado.",
        RENTAL_DURATION_OUT_OF_RANGE: "A duração escolhida não respeita o mínimo ou máximo do anúncio.",
        RENTAL_DATES_UNAVAILABLE: "O equipamento já tem um pedido incompatível para estas datas.",
        REQUEST_NOT_PENDING: "Este pedido já não aguarda uma resposta.",
        REQUEST_CANNOT_BE_CANCELLED: "Esta operação já não pode ser cancelada neste estado.",
        OWNER_ONLY: "Apenas o proprietário pode realizar esta ação.",
        RENTER_ONLY: "Apenas o arrendatário pode realizar esta ação.",
        RENTAL_PARTICIPANTS_ONLY: "Esta informação só está disponível para os participantes da operação.",
        RENTAL_CHAT_NOT_AVAILABLE: "A conversa já não aceita novas mensagens neste estado.",
        MESSAGE_LENGTH_INVALID: "A mensagem deve ter entre 1 e 1000 caracteres.",
        CONDITION_PHASE_NOT_AVAILABLE: "Esta fase ainda não está disponível para confirmação.",
        CONDITION_REPORT_ALREADY_CONFIRMED: "Já confirmou esta fase; o relatório ficou preservado.",
        PHOTO_COUNT_INVALID: "Selecione entre 1 e 5 fotografias.",
        CONDITION_PHOTO_PATH_INVALID: "Uma fotografia não foi validada pela base de dados.",
        NOTE_TOO_LONG: "A nota não pode exceder 1000 caracteres."
    };
    const key = Object.keys(messages).find((candidate) => raw.includes(candidate));
    return key ? messages[key] : "Não foi possível concluir a ação. Atualize os dados e tente novamente.";
}

function showOperationalUnavailable() {
    operationalReady = false;
    setHidden(systemMessage, false);
    setHidden(operationsWrap, true);
    setHidden(operationsEmpty, false);
    setMessage(operationsStatus);
    setHidden(nextOperationCard, true);
    setHidden(nextOperationEmpty, false);
    renderRoleAccess();
}

function renderRoleAccess() {
    const ownerEnabled = hasRole("owner");
    const renterEnabled = hasRole("renter");
    setHidden(ownerRoleRequired, ownerEnabled);
    setHidden(renterRoleRequired, renterEnabled);
    if (equipmentFormToggle) equipmentFormToggle.disabled = !ownerEnabled || !operationalReady;
    if (equipmentReload) equipmentReload.disabled = !ownerEnabled;
    if (listingsReload) listingsReload.disabled = !renterEnabled || !operationalReady;
    if (!ownerEnabled) setHidden(equipmentFormPanel, true);
    ownerEquipmentList?.toggleAttribute("hidden", !ownerEnabled);
    ownerEquipmentEmpty?.toggleAttribute("hidden", !ownerEnabled || ownEquipment.length > 0);
    pilotListings?.toggleAttribute("hidden", !renterEnabled);
    pilotListingsEmpty?.toggleAttribute("hidden", !renterEnabled || listings.length > 0 || !operationalReady);
}

function updatePendingCount() {
    const count = [...document.querySelectorAll("[data-real-pending-list] .pending-item")].filter((item) => !item.hidden).length;
    setText("[data-pending-count]", String(count));
    setHidden(document.querySelector("[data-real-pending-empty]"), count > 0);
}

function updateOperationsBadge() {
    const count = rentals.filter((rental) => ACTIVE_RENTAL_STATUSES.includes(rental.status)).length;
    const badge = document.querySelector("[data-operations-badge]");
    if (!badge) return;
    badge.textContent = String(count);
    badge.hidden = count === 0;
}

function statusPresentation(rental) {
    if (rental.status === "requested") {
        return rental.role === "owner"
            ? { label: "Pedido recebido", className: "status--new" }
            : { label: "Pedido enviado", className: "status--new" };
    }
    const map = {
        confirmed: { label: "Confirmada", className: "status--attention" },
        rejected: { label: "Rejeitada", className: "status--danger" },
        cancelled: { label: "Cancelada", className: "status--muted" },
        in_progress: { label: "Em utilização", className: "status--active" },
        completed: { label: "Concluída", className: "status--complete" },
        disputed: { label: "Em análise", className: "status--review" }
    };
    return map[rental.status] || { label: rental.status, className: "status--muted" };
}

function filteredRentals() {
    return currentRoleFilter === "all" ? rentals : rentals.filter((rental) => rental.role === currentRoleFilter);
}

function renderFinance() {
    const visible = filteredRentals();
    const active = visible.filter((rental) => ACTIVE_RENTAL_STATUSES.includes(rental.status)).length;
    const pending = visible.filter((rental) => rental.status === "requested").length;
    const title = currentRoleFilter === "owner"
        ? "Atividade como proprietário"
        : currentRoleFilter === "renter" ? "Atividade como arrendatário" : "Atividade piloto";
    setText("[data-finance-title]", title);
    setText('[data-finance-label="0"]', "Pagamentos processados");
    setText('[data-finance-value="0"]', "0,00 €");
    setText('[data-finance-label="1"]', "Operações ativas");
    setText('[data-finance-value="1"]', String(active));
    setText('[data-finance-label="2"]', "Pedidos pendentes");
    setText('[data-finance-value="2"]', String(pending));
}

function makeTableCell(label, content) {
    const cell = createElement("td");
    cell.dataset.label = label;
    if (content instanceof Node) cell.append(content);
    else cell.textContent = String(content ?? "");
    return cell;
}

function renderOperations() {
    if (!operationsBody) return;
    operationsBody.replaceChildren();
    const visible = filteredRentals();
    visible.forEach((rental) => {
        const row = createElement("tr");
        row.dataset.role = rental.role;
        const operation = createElement("div");
        operation.append(createElement("strong", "", `#${rental.rental_reference}`));
        operation.append(createElement("span", "", rental.equipment_title));
        const role = createElement("span", "table-role", rental.role === "owner" ? "Proprietário" : "Arrendatário");
        const value = createElement("strong", "", formatCurrency(rental.total_amount));
        const presentation = statusPresentation(rental);
        const status = createElement("span", `status ${presentation.className}`, presentation.label);
        const actions = createElement("div", "table-actions");
        const open = createElement("button", "text-button", "Ver operação");
        open.type = "button";
        open.addEventListener("click", () => openRealOperation(rental.rental_id, open));
        actions.append(open);
        row.append(
            makeTableCell("Operação", operation),
            makeTableCell("Papel", role),
            makeTableCell("Datas", formatDateRange(rental.start_date, rental.end_date)),
            makeTableCell("Contraparte", rental.counterpart_full_name || "Utilizador CleanShare"),
            makeTableCell("Valor", value),
            makeTableCell("Estado", status),
            makeTableCell("Ação", actions)
        );
        operationsBody.append(row);
    });
    setHidden(operationsWrap, !operationalReady || visible.length === 0);
    setHidden(operationsEmpty, !operationalReady || visible.length > 0);
    if (operationalReady) setMessage(operationsStatus);
    updateOperationsBadge();
    renderFinance();
    renderPendingActions();
    renderNextOperation();
}

function conditionPhaseForRental(rental) {
    if (rental.status === "confirmed") return { key: "handover", label: "Recolha", location: "recolha" };
    if (rental.status === "in_progress") return { key: "return", label: "Devolução", location: "devolução" };
    return null;
}

function summarizeConditionProgress(rental, reports) {
    const phase = conditionPhaseForRental(rental);
    if (!phase) return null;
    const phaseReports = (reports || []).filter((report) => report.phase === phase.key);
    const participantIds = new Set(phaseReports.map((report) => report.user_id).filter(Boolean));
    return {
        phase: phase.key,
        phaseLabel: phase.label,
        location: phase.location,
        count: Math.min(participantIds.size, 2),
        ownConfirmed: participantIds.has(currentUser?.id)
    };
}

function conditionProgressPresentation(rental) {
    const phase = conditionPhaseForRental(rental);
    if (!phase) return null;
    const progress = conditionProgressByRental.get(rental.rental_id);
    if (!progress || progress.phase !== phase.key) {
        return {
            available: false,
            phaseLabel: phase.label,
            title: `Acompanhar estado na ${phase.location}`,
            countLabel: "Progresso indisponível",
            message: "Não foi possível atualizar as confirmações neste momento."
        };
    }
    if (progress.count >= 2) {
        return {
            available: true,
            phaseLabel: progress.phaseLabel,
            title: `Confirmações concluídas na ${progress.location}`,
            countLabel: "2/2 confirmações",
            message: "2/2 confirmações · A atualizar o estado da operação."
        };
    }
    if (progress.ownConfirmed) {
        return {
            available: true,
            phaseLabel: progress.phaseLabel,
            title: `Aguardar confirmação na ${progress.location}`,
            countLabel: `${progress.count}/2 confirmações`,
            message: `${progress.count}/2 confirmações · Aguarda a contraparte`
        };
    }
    return {
        available: true,
        phaseLabel: progress.phaseLabel,
        title: `Confirmar estado na ${progress.location}`,
        countLabel: `${progress.count}/2 confirmações`,
        message: `${progress.count}/2 confirmações · Falta a sua confirmação`
    };
}

async function loadConditionProgress(activeRentals) {
    const targets = activeRentals.filter((rental) => conditionPhaseForRental(rental));
    const results = await Promise.allSettled(targets.map(async (rental) => {
        const { data, error } = await supabase.rpc("list_rental_condition_reports", {
            p_rental_id: rental.rental_id
        });
        if (error) throw error;
        return [rental.rental_id, summarizeConditionProgress(rental, data || [])];
    }));
    const nextProgress = new Map();
    results.forEach((result) => {
        if (result.status !== "fulfilled") return;
        const [rentalId, progress] = result.value;
        if (progress) nextProgress.set(rentalId, progress);
    });
    conditionProgressByRental = nextProgress;
}

function renderPendingActions() {
    if (!pendingActions) return;
    pendingActions.replaceChildren();
    filteredRentals().filter((rental) => ACTIVE_RENTAL_STATUSES.includes(rental.status)).slice(0, 4).forEach((rental) => {
        const item = createElement("article", "pending-item");
        item.dataset.role = rental.role;
        const phase = conditionPhaseForRental(rental);
        const progress = conditionProgressPresentation(rental);
        const priority = createElement("span", `priority ${rental.status === "requested" ? "priority--high" : "priority--medium"}`, rental.status === "requested" ? "Pedido" : phase?.label || "Operação");
        const content = createElement("div", "pending-item__content");
        content.append(createElement("span", "role-label", rental.role === "owner" ? "Como proprietário" : "Como arrendatário"));
        const title = rental.status === "requested"
            ? (rental.role === "owner" ? "Responder ao pedido" : "Acompanhar pedido enviado")
            : progress.title;
        content.append(createElement("h3", "", title));
        content.append(createElement("p", "pending-item__equipment", rental.equipment_title));
        content.append(createElement("small", "pending-item__dates", formatDateRange(rental.start_date, rental.end_date)));
        if (progress) content.append(createElement("p", `pending-item__progress${progress.available ? "" : " pending-item__progress--unavailable"}`, progress.message));
        const button = createElement("button", "button button--secondary button--small", "Abrir");
        button.type = "button";
        button.addEventListener("click", () => openRealOperation(rental.rental_id, button));
        item.append(priority, content, button);
        pendingActions.append(item);
    });
    updatePendingCount();
}

function mostRelevantRental() {
    const priority = { requested: 0, confirmed: 1, in_progress: 2 };
    return filteredRentals()
        .filter((rental) => Object.hasOwn(priority, rental.status))
        .sort((a, b) => priority[a.status] - priority[b.status] || String(a.start_date).localeCompare(String(b.start_date)))[0] || null;
}

function renderNextOperation() {
    const rental = operationalReady ? mostRelevantRental() : null;
    setHidden(nextOperationCard, !rental);
    setHidden(nextOperationEmpty, Boolean(rental));
    if (!rental) return;
    const presentation = statusPresentation(rental);
    const status = document.querySelector("[data-real-next-status]");
    if (status) {
        status.textContent = presentation.label;
        status.className = `status ${presentation.className}`;
    }
    setText("[data-real-next-reference]", `Operação #${rental.rental_reference}`);
    setText("[data-real-next-equipment]", rental.equipment_title);
    setText("[data-real-next-role]", rental.role === "owner" ? "Está como proprietário" : "Está como arrendatário");
    setText("[data-real-next-counterparty-label]", rental.role === "owner" ? "Arrendatário" : "Proprietário");
    setText("[data-real-next-counterparty]", rental.counterpart_full_name || "Utilizador CleanShare");
    setText("[data-real-next-initials]", getInitials(rental.counterpart_full_name));
    setText("[data-real-next-dates]", formatDateRange(rental.start_date, rental.end_date));
    setText("[data-real-next-location]", rental.city || "—");
    setText("[data-real-next-value]", `${formatCurrency(rental.total_amount)} · caução indicativa ${formatCurrency(rental.deposit_amount)}`);
    const progress = conditionProgressPresentation(rental);
    setHidden(nextOperationConditionProgress, !progress);
    if (progress) {
        setText("[data-real-next-condition-phase]", progress.phaseLabel);
        setText("[data-real-next-condition-count]", progress.countLabel);
        setText("[data-real-next-condition-message]", progress.message.replace(/^\d\/2 confirmações · /, ""));
        nextOperationConditionProgress.dataset.available = String(progress.available);
    }
    nextOperationButton.dataset.rentalId = rental.rental_id;
}

function createOwnerEquipmentCard(item) {
    const card = createElement("article", "owner-equipment-card");
    const image = createElement("div", "owner-equipment-card__image");
    appendEquipmentImage(image, item.image_url, `Fotografia de ${item.title}`);
    const body = createElement("div", "owner-equipment-card__body");
    const listingStatus = item.listing?.status || "sem anúncio";
    const statusLabel = { active: "Ativo", paused: "Pausado", draft: "Rascunho", archived: "Arquivado" }[listingStatus] || "Sem anúncio";
    const statusClass = listingStatus === "active" ? "status--complete" : listingStatus === "paused" ? "status--attention" : "status--muted";
    body.append(createElement("span", `status ${statusClass}`, statusLabel));
    body.append(createElement("h4", "", item.title));
    body.append(createElement("p", "equipment-meta", [item.equipment_type, item.brand, item.model].filter(Boolean).join(" · ")));
    const price = createElement("div", "equipment-price");
    price.append(createElement("span", "", item.listing ? "Preço por dia" : "Anúncio não criado"));
    price.append(createElement("strong", "", item.listing ? formatCurrency(item.listing.price_per_day) : "—"));
    body.append(price);
    if (["active", "paused", "draft"].includes(listingStatus)) {
        const actions = createElement("div", "equipment-card-actions");
        actions.append(createElement("span", "equipment-meta", item.listing.city || ""));
        const actionLabel = listingStatus === "active" ? "Pausar" : listingStatus === "draft" ? "Publicar" : "Ativar";
        const toggle = createElement("button", "text-button", actionLabel);
        toggle.type = "button";
        toggle.addEventListener("click", () => toggleListing(item, toggle));
        actions.append(toggle);
        body.append(actions);
    }
    card.append(image, body);
    return card;
}

function renderOwnEquipment() {
    if (!ownerEquipmentList) return;
    ownerEquipmentList.replaceChildren(...ownEquipment.map(createOwnerEquipmentCard));
    setHidden(ownerEquipmentEmpty, !hasRole("owner") || ownEquipment.length > 0);
    renderRoleAccess();
}

async function loadOwnEquipment() {
    if (!hasRole("owner") || !supabase || !currentUser) {
        ownEquipment = [];
        renderOwnEquipment();
        return;
    }
    setMessage(ownerEquipmentStatus, "A carregar equipamentos…");
    const { data: equipmentRows, error: equipmentError } = await supabase
        .from("equipment")
        .select("id, equipment_type, title, brand, model, condition, estimated_value, image_urls, status, created_at")
        .eq("owner_id", currentUser.id)
        .order("created_at", { ascending: false });
    if (equipmentError) {
        setMessage(ownerEquipmentStatus, "Não foi possível carregar os equipamentos. Tente novamente.", "error");
        return;
    }
    const ids = (equipmentRows || []).map((item) => item.id);
    let listingRows = [];
    if (ids.length) {
        const { data, error } = await supabase
            .from("listings")
            .select("id, equipment_id, price_per_day, deposit_amount, minimum_days, maximum_days, city, postal_code, description, status, created_at")
            .in("equipment_id", ids)
            .order("created_at", { ascending: false });
        if (error) {
            setMessage(ownerEquipmentStatus, "Os equipamentos foram lidos, mas não foi possível carregar os anúncios.", "warning");
        } else {
            listingRows = data || [];
        }
    }
    ownEquipment = (equipmentRows || []).map((item) => ({
        ...item,
        image_url: item.image_urls?.[0] || "",
        listing: listingRows.find((listing) => listing.equipment_id === item.id) || null
    }));
    renderOwnEquipment();
    if (!ownerEquipmentStatus?.dataset.type || ownerEquipmentStatus.dataset.type === "info") setMessage(ownerEquipmentStatus);
}

function createPilotListingCard(listing) {
    const card = createElement("article", "pilot-listing-card");
    const image = createElement("div", "pilot-listing-card__image");
    appendEquipmentImage(image, listing.equipment_image_url, `Fotografia de ${listing.equipment_title}`);
    const body = createElement("div", "pilot-listing-card__body");
    body.append(createElement("span", "table-role", listing.equipment_type));
    body.append(createElement("h3", "", listing.equipment_title));
    body.append(createElement("p", "listing-meta", [listing.equipment_brand, listing.equipment_model, listing.city].filter(Boolean).join(" · ")));
    const price = createElement("div", "listing-price");
    price.append(createElement("span", "", `Caução indicativa ${formatCurrency(listing.deposit_amount)}`));
    price.append(createElement("strong", "", `${formatCurrency(listing.price_per_day)}/dia`));
    body.append(price);
    const limits = createElement("p", "listing-meta", `Duração: ${listing.minimum_days}–${listing.maximum_days || "sem limite"} dias`);
    body.append(limits);
    const form = createElement("form", "rental-request-form");
    form.noValidate = true;
    const dates = createElement("div", "rental-date-grid");
    const startLabel = createElement("label", "", "Início");
    const start = createElement("input");
    start.type = "date";
    start.name = "start_date";
    start.min = dateInputToday();
    start.required = true;
    const endLabel = createElement("label", "", "Fim");
    const end = createElement("input");
    end.type = "date";
    end.name = "end_date";
    end.min = dateInputToday();
    end.required = true;
    startLabel.append(start);
    endLabel.append(end);
    dates.append(startLabel, endLabel);
    const messageLabel = createElement("label", "", "Mensagem opcional");
    const message = createElement("textarea");
    message.name = "message";
    message.maxLength = 1000;
    message.placeholder = "Explique brevemente o contexto de utilização.";
    messageLabel.append(message);
    const estimate = createElement("p", "rental-estimate", "Escolha as datas para obter uma estimativa informativa.");
    const feedback = createElement("p", "form-message");
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    const submit = createElement("button", "button button--primary button--wide", "Enviar pedido");
    submit.type = "submit";
    const updateEstimate = () => {
        end.min = start.value || dateInputToday();
        const days = inclusiveDays(start.value, end.value);
        if (!days) {
            estimate.textContent = "Escolha as datas para obter uma estimativa informativa.";
            return;
        }
        const durationLabel = days === 1 ? "1 dia" : `${days} dias`;
        estimate.textContent = `Estimativa informativa: ${durationLabel} × ${formatCurrency(listing.price_per_day)} = ${formatCurrency(days * Number(listing.price_per_day))}. Caução indicativa: ${formatCurrency(listing.deposit_amount)}.`;
    };
    start.addEventListener("change", updateEstimate);
    end.addEventListener("change", updateEstimate);
    form.addEventListener("submit", (event) => requestRental(event, listing, feedback));
    form.append(dates, messageLabel, estimate, feedback, submit);
    body.append(form);
    card.append(image, body);
    return card;
}

function renderListings() {
    if (!pilotListings) return;
    pilotListings.replaceChildren(...listings.map(createPilotListingCard));
    setHidden(pilotListingsEmpty, !hasRole("renter") || !operationalReady || listings.length > 0);
    renderRoleAccess();
}

async function requestRental(event, listing, feedback) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!ensureActionReady(feedback, "renter")) return;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const startDate = String(data.get("start_date") || "");
    const endDate = String(data.get("end_date") || "");
    const days = inclusiveDays(startDate, endDate);
    if (days < Number(listing.minimum_days) || (listing.maximum_days && days > Number(listing.maximum_days))) {
        setMessage(feedback, "A duração escolhida não respeita os limites do anúncio.", "error");
        return;
    }
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = "A enviar…";
    setMessage(feedback, "A validar disponibilidade…");
    try {
        const { error } = await supabase.rpc("request_rental", {
            p_listing_id: listing.listing_id,
            p_start_date: startDate,
            p_end_date: endDate,
            p_message: String(data.get("message") || "").trim() || null
        });
        if (error) throw error;
        form.reset();
        setMessage(feedback, "Pedido enviado. O proprietário já o pode consultar na operação real.", "success");
        await loadOperationalData();
    } catch (error) {
        if (isRpcUnavailable(error)) showOperationalUnavailable();
        setMessage(feedback, isRpcUnavailable(error) ? "Fluxo operacional ainda não preparado na base de dados." : friendlyOperationError(error), "error");
    } finally {
        submit.disabled = false;
        submit.textContent = "Enviar pedido";
    }
}

function validateImage(file) {
    if (!file) return "Escolha uma fotografia do equipamento.";
    if (!IMAGE_TYPES.includes(file.type)) return "Use uma imagem JPEG, PNG ou WebP.";
    if (file.size > MAX_IMAGE_SIZE) return "A fotografia não pode exceder 5 MB.";
    return "";
}

function resetImagePreview(clearInput = true) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    if (clearInput && equipmentImageInput) equipmentImageInput.value = "";
    if (equipmentPreviewImage) equipmentPreviewImage.removeAttribute("src");
    setHidden(equipmentImagePreview, true);
    setMessage(equipmentImageError);
}

function updateImagePreview() {
    const file = equipmentImageInput?.files?.[0];
    const error = validateImage(file);
    if (error) {
        resetImagePreview(false);
        setMessage(equipmentImageError, error, "error");
        return;
    }
    resetImagePreview(false);
    previewUrl = URL.createObjectURL(file);
    equipmentPreviewImage.src = previewUrl;
    setHidden(equipmentImagePreview, false);
}

function setEquipmentFormOpen(open) {
    setHidden(equipmentFormPanel, !open);
    equipmentFormToggle?.setAttribute("aria-expanded", String(open));
    if (open) document.querySelector("#equipmentType")?.focus();
}

function storagePathFor(file) {
    const extensionByType = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    return `${currentUser.id}/${crypto.randomUUID()}.${extensionByType[file.type]}`;
}

async function removeUploadedImage(path) {
    if (!path) return true;
    const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([path]);
    return !error;
}

async function saveEquipment(event) {
    event.preventDefault();
    const submitter = event.submitter;
    const mode = submitter?.dataset.equipmentSubmit;
    if (!mode || !ensureActionReady(equipmentFormMessage, "owner")) return;
    if (!equipmentForm.reportValidity()) return;
    const formData = new FormData(equipmentForm);
    const file = formData.get("image");
    const imageError = validateImage(file);
    if (imageError) {
        setMessage(equipmentImageError, imageError, "error");
        equipmentImageInput?.focus();
        return;
    }
    const minimumDays = Number(formData.get("minimum_days"));
    const maximumDays = Number(formData.get("maximum_days"));
    if (maximumDays < minimumDays) {
        setMessage(equipmentFormMessage, "O máximo de dias tem de ser igual ou superior ao mínimo.", "error");
        return;
    }
    const submitButtons = [...equipmentForm.querySelectorAll("[data-equipment-submit]")];
    submitButtons.forEach((button) => { button.disabled = true; });
    equipmentForm.setAttribute("aria-busy", "true");
    setMessage(equipmentFormMessage, "A guardar fotografia e dados…");
    const path = storagePathFor(file);
    let equipmentId = null;
    let cleanupComplete = true;
    let imageUploaded = false;
    let listingSaved = false;
    try {
        const { error: uploadError } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: false
        });
        if (uploadError) throw uploadError;
        imageUploaded = true;
        const { data: publicUrlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
        const publicUrl = publicUrlData?.publicUrl;
        const equipmentPayload = {
            owner_id: currentUser.id,
            equipment_type: String(formData.get("equipment_type")),
            title: String(formData.get("title")).trim(),
            brand: String(formData.get("brand")).trim(),
            model: String(formData.get("model")).trim(),
            description: String(formData.get("description")).trim(),
            condition: String(formData.get("condition")),
            estimated_value: formData.get("estimated_value") ? Number(formData.get("estimated_value")) : null,
            image_urls: [publicUrl],
            status: mode === "publish" ? "available" : "draft"
        };
        const { data: equipmentRow, error: equipmentError } = await supabase
            .from("equipment")
            .insert(equipmentPayload)
            .select("id")
            .single();
        if (equipmentError) {
            cleanupComplete = await removeUploadedImage(path);
            imageUploaded = false;
            throw equipmentError;
        }
        equipmentId = equipmentRow.id;
        const listingPayload = {
            equipment_id: equipmentId,
            price_per_day: Number(formData.get("price_per_day")),
            deposit_amount: Number(formData.get("deposit_amount")),
            minimum_days: minimumDays,
            maximum_days: maximumDays,
            city: String(formData.get("city")).trim(),
            postal_code: String(formData.get("postal_code")).trim(),
            description: String(formData.get("description")).trim(),
            status: mode === "publish" ? "active" : "draft"
        };
        const { error: listingError } = await supabase.from("listings").insert(listingPayload);
        if (listingError) {
            const { error: equipmentCleanupError } = await supabase.from("equipment").delete().eq("id", equipmentId);
            const imageCleaned = await removeUploadedImage(path);
            cleanupComplete = !equipmentCleanupError && imageCleaned;
            equipmentId = equipmentCleanupError ? equipmentId : null;
            imageUploaded = !imageCleaned;
            throw listingError;
        }
        listingSaved = true;
        equipmentForm.reset();
        resetImagePreview();
        setEquipmentFormOpen(false);
        setMessage(ownerEquipmentStatus, mode === "publish" ? "Equipamento publicado no piloto." : "Rascunho guardado.", "success");
        await Promise.all([loadOwnEquipment(), loadOperationalData()]);
    } catch (error) {
        if (!listingSaved && (equipmentId || imageUploaded)) {
            let equipmentCleaned = true;
            if (equipmentId) {
                const { error: cleanupError } = await supabase.from("equipment").delete().eq("id", equipmentId);
                equipmentCleaned = !cleanupError;
            }
            const imageCleaned = imageUploaded ? await removeUploadedImage(path) : true;
            cleanupComplete = cleanupComplete && equipmentCleaned && imageCleaned;
        }
        const missingStorage = String(error?.message || "").toLowerCase().includes("bucket") || String(error?.statusCode || "") === "404";
        const copy = missingStorage || isRpcUnavailable(error)
            ? "Fluxo operacional ainda não preparado na base de dados. A fotografia e o anúncio não foram publicados."
            : cleanupComplete
                ? "Não foi possível guardar o anúncio. Qualquer fotografia ou registo parcial foi removido."
                : "Não foi possível guardar o anúncio e a limpeza automática ficou incompleta. Não tente novamente antes de contactar o suporte.";
        setMessage(equipmentFormMessage, copy, "error");
        if (missingStorage) showOperationalUnavailable();
    } finally {
        submitButtons.forEach((button) => { button.disabled = false; });
        equipmentForm.setAttribute("aria-busy", "false");
    }
}

async function toggleListing(item, button) {
    if (!item.listing || !ensureActionReady(ownerEquipmentStatus, "owner")) return;
    const publishing = item.listing.status === "draft";
    const activating = publishing || item.listing.status === "paused";
    const confirmation = publishing
        ? "Publicar este rascunho para permitir novos pedidos?"
        : activating
            ? "Ativar novamente este anúncio para novos pedidos?"
        : "Pausar este anúncio e impedir novos pedidos?";
    if (!window.confirm(confirmation)) return;
    button.disabled = true;
    setMessage(ownerEquipmentStatus, publishing ? "A publicar anúncio…" : activating ? "A ativar anúncio…" : "A pausar anúncio…");
    try {
        if (activating) {
            const previousEquipmentStatus = item.status;
            const { error: equipmentError } = await supabase.from("equipment").update({ status: "available" }).eq("id", item.id);
            if (equipmentError) throw equipmentError;
            const { error: listingError } = await supabase.from("listings").update({ status: "active" }).eq("id", item.listing.id);
            if (listingError) {
                const { error: rollbackError } = await supabase.from("equipment").update({ status: previousEquipmentStatus }).eq("id", item.id);
                const activationError = new Error(listingError.message || "LISTING_ACTIVATION_FAILED");
                activationError.rollbackFailed = Boolean(rollbackError);
                throw activationError;
            }
        } else {
            const { error: listingError } = await supabase.from("listings").update({ status: "paused" }).eq("id", item.listing.id);
            if (listingError) throw listingError;
            const { error: equipmentError } = await supabase.from("equipment").update({ status: "unavailable" }).eq("id", item.id);
            if (equipmentError) {
                setMessage(ownerEquipmentStatus, "O anúncio foi pausado, mas o estado do equipamento não foi sincronizado. Atualize antes de nova ação.", "warning");
                await loadOwnEquipment();
                return;
            }
        }
        setMessage(ownerEquipmentStatus, publishing ? "Anúncio publicado." : activating ? "Anúncio ativado." : "Anúncio pausado.", "success");
        await Promise.all([loadOwnEquipment(), loadOperationalData()]);
    } catch (error) {
        const copy = error?.rollbackFailed
            ? "Não foi possível publicar ou ativar o anúncio e o estado anterior do equipamento não pôde ser reposto. Atualize e confirme o estado antes de nova ação."
            : "Não foi possível alterar o anúncio. O estado anterior foi preservado e os dados serão recarregados.";
        setMessage(ownerEquipmentStatus, copy, "error");
        await loadOwnEquipment();
    } finally {
        button.disabled = false;
    }
}

function updateRealTimeline(rental) {
    const steps = [...document.querySelectorAll("[data-real-timeline] li")];
    const progress = { requested: 0, confirmed: 1, in_progress: 2, completed: 4 }[rental.status] ?? 0;
    const terminal = ["rejected", "cancelled", "disputed"].includes(rental.status);
    steps.forEach((step, index) => {
        const marker = step.querySelector(":scope > span");
        const detail = step.querySelector("small");
        const completed = progress === 4 || index < progress;
        const current = !terminal && progress < 4 && index === progress;
        step.classList.toggle("is-complete", completed);
        step.classList.toggle("is-current", current);
        if (marker) marker.textContent = completed ? "✓" : String(index + 1);
        if (detail) detail.textContent = completed ? "Concluído" : current ? "Etapa atual" : "Por iniciar";
    });
    const presentation = statusPresentation(rental);
    setText("[data-real-terminal-state]", terminal ? presentation.label : "");
}

function renderOperationActions(rental) {
    realOperationActions.replaceChildren();
    setHidden(ownerResponseField, !(rental.role === "owner" && rental.status === "requested"));
    if (ownerResponseMessage) ownerResponseMessage.value = rental.owner_response_message || "";
    let title = "Consultar operação";
    let copy = "Não existem ações disponíveis para este estado.";
    const addAction = (label, action, className = "button--secondary") => {
        const button = createElement("button", `button ${className}`, label);
        button.type = "button";
        button.dataset.rentalAction = action;
        button.addEventListener("click", () => performRentalAction(rental, action));
        realOperationActions.append(button);
    };
    if (rental.role === "owner" && rental.status === "requested") {
        title = "Responder ao pedido";
        copy = "Aceite apenas depois de confirmar disponibilidade e condições. Nenhum pagamento ou contrato será criado.";
        addAction("Rejeitar pedido", "reject", "button--secondary");
        addAction("Aceitar pedido", "accept", "button--primary");
    } else if (rental.role === "renter" && ["requested", "confirmed"].includes(rental.status)) {
        title = rental.status === "requested" ? "Pedido enviado" : "Operação confirmada";
        copy = rental.status === "confirmed"
            ? "Registe abaixo o estado observado na recolha. Também pode cancelar enquanto a utilização não começar."
            : "Pode cancelar este pedido piloto. Não existem movimentos financeiros associados.";
        addAction("Cancelar operação", "cancel", "button--secondary");
    } else if (rental.status === "confirmed") {
        title = "Confirmar recolha";
        copy = "Cada participante deve registar abaixo o estado inicial. A utilização começa apenas depois das duas confirmações.";
    } else if (rental.status === "in_progress") {
        title = "Confirmar devolução";
        copy = "Depois da devolução, cada participante regista o estado final. A operação conclui-se com as duas confirmações.";
    } else if (rental.status === "completed") {
        title = "Operação concluída";
        copy = "As confirmações bilaterais e a evidência permanecem disponíveis para consulta.";
    }
    setText("[data-real-detail-action-title]", title);
    setText("[data-real-detail-action-copy]", copy);
    setMessage(realOperationMessage);
}

function renderContact(rental) {
    const mayExposeContact = CONTACT_ENABLED_STATUSES.includes(rental.status) && Boolean(rental.counterpart_phone);
    setHidden(realContact, !mayExposeContact);
    if (!mayExposeContact) {
        if (realContactName) realContactName.textContent = "";
        if (realContactPhone) {
            realContactPhone.textContent = "";
            realContactPhone.removeAttribute("href");
        }
        return;
    }
    if (realContactName) realContactName.textContent = rental.counterpart_full_name || "Utilizador CleanShare";
    if (realContactPhone) {
        const phone = String(rental.counterpart_phone).trim();
        const telephoneTarget = phone.replace(/[^+\d]/g, "");
        realContactPhone.textContent = phone;
        if (telephoneTarget) realContactPhone.href = `tel:${telephoneTarget}`;
        else realContactPhone.removeAttribute("href");
    }
}

function showCollaborationUnavailable() {
    collaborationReady = false;
    rentalMessages = [];
    conditionReports = [];
    renderChatMessages();
    setHidden(chatForm, true);
    setMessage(chatStatus, "Chat e evidência ainda não preparados na base de dados.", "warning");
    setMessage(conditionSystemStatus, "O registo bilateral ficará disponível depois de aplicar a migração incremental.", "warning");
    const rental = rentals.find((item) => item.rental_id === selectedRentalId);
    setHidden(conditionEvidence, !rental || !CONDITION_VISIBLE_STATUSES.includes(rental.status));
    if (rental) renderPhotoDossierUnavailable(rental, "O dossier ficará disponível depois de preparar o fluxo na base de dados.");
    conditionForms.forEach((form) => setHidden(form, true));
}

function renderChatMessages() {
    if (!chatHistory) return;
    chatHistory.replaceChildren();
    if (!rentalMessages.length) {
        chatHistory.append(createElement("p", "rental-chat__empty", "Ainda não existem mensagens."));
        return;
    }
    rentalMessages.forEach((message) => {
        const own = message.sender_id === currentUser?.id;
        const item = createElement("article", `rental-chat-message${own ? " rental-chat-message--own" : ""}`);
        const meta = createElement("div", "rental-chat-message__meta");
        const role = message.sender_role === "owner" ? "Proprietário" : "Arrendatário";
        meta.append(
            createElement("strong", "", own ? `Eu · ${role}` : `${message.sender_full_name} · ${role}`),
            createElement("time", "", formatDateTime(message.created_at))
        );
        item.append(meta, createElement("p", "", message.body));
        chatHistory.append(item);
    });
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function loadRentalMessages(rental) {
    setMessage(chatStatus, "A atualizar a conversa…");
    const { data, error } = await supabase.rpc("list_rental_messages", { p_rental_id: rental.rental_id });
    if (error) throw error;
    if (selectedRentalId !== rental.rental_id) return;
    rentalMessages = data || [];
    renderChatMessages();
    const chatEnabled = CHAT_ENABLED_STATUSES.includes(rental.status);
    setHidden(chatForm, !chatEnabled);
    if (chatRefresh) chatRefresh.disabled = false;
    setMessage(chatStatus, chatEnabled ? "" : "O histórico permanece disponível, mas este estado não aceita novas mensagens.", "warning");
}

async function sendRentalMessage(event) {
    event.preventDefault();
    const rental = rentals.find((item) => item.rental_id === selectedRentalId);
    if (!rental || !chatMessage || !ensureActionReady(chatStatus, rental.role)) return;
    const body = chatMessage.value.trim();
    if (!body || body.length > 1000) {
        setMessage(chatStatus, "A mensagem deve ter entre 1 e 1000 caracteres.", "error");
        return;
    }
    const submit = chatForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    chatMessage.disabled = true;
    setMessage(chatStatus, "A enviar mensagem…");
    try {
        const { error } = await supabase.rpc("send_rental_message", {
            p_rental_id: rental.rental_id,
            p_body: body
        });
        if (error) throw error;
        chatMessage.value = "";
        await loadRentalMessages(rental);
        setMessage(chatStatus, "Mensagem enviada.", "success");
    } catch (error) {
        if (isRpcUnavailable(error)) showCollaborationUnavailable();
        else setMessage(chatStatus, friendlyOperationError(error), "error");
    } finally {
        submit.disabled = false;
        chatMessage.disabled = false;
    }
}

function resetConditionPreview(phase, clearInput = true) {
    const urls = conditionPreviewUrls.get(phase) || [];
    urls.forEach((url) => URL.revokeObjectURL(url));
    conditionPreviewUrls.delete(phase);
    const input = document.querySelector(`[data-condition-files="${phase}"]`);
    const preview = document.querySelector(`[data-condition-preview="${phase}"]`);
    if (clearInput && input) input.value = "";
    preview?.replaceChildren();
    setHidden(preview, true);
}

function validateConditionFiles(files) {
    if (!files.length || files.length > MAX_CONDITION_PHOTOS) return "Selecione entre 1 e 5 fotografias.";
    if (files.some((file) => !IMAGE_TYPES.includes(file.type))) return "Use apenas imagens JPEG, PNG ou WebP.";
    if (files.some((file) => file.size > MAX_IMAGE_SIZE)) return "Cada fotografia pode ter no máximo 5 MB.";
    return "";
}

function updateConditionPreview(input) {
    const phase = input.dataset.conditionFiles;
    const files = [...(input.files || [])];
    const feedback = document.querySelector(`[data-condition-status="${phase}"]`);
    const error = validateConditionFiles(files);
    resetConditionPreview(phase, false);
    if (error) {
        setMessage(feedback, error, "error");
        return;
    }
    const urls = files.map((file) => URL.createObjectURL(file));
    conditionPreviewUrls.set(phase, urls);
    const preview = document.querySelector(`[data-condition-preview="${phase}"]`);
    const image = createElement("img");
    image.src = urls[0];
    image.alt = "Pré-visualização da primeira fotografia selecionada";
    const details = createElement("div");
    details.append(
        createElement("strong", "", files[0].name),
        createElement("span", "", files.length === 1 ? "1 fotografia selecionada" : `${files.length} fotografias selecionadas`)
    );
    preview.append(image, details);
    setHidden(preview, false);
    setMessage(feedback);
}

function conditionStoragePath(rentalId, phase, file) {
    const extensionByType = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    return `${rentalId}/${currentUser.id}/${phase}/${crypto.randomUUID()}.${extensionByType[file.type]}`;
}

async function removeConditionUploads(paths) {
    if (!paths.length) return true;
    const { error } = await supabase.storage.from(CONDITION_IMAGE_BUCKET).remove(paths);
    return !error;
}

function dossierParticipantName(rental, role, report = null) {
    if (report?.author_full_name) return report.author_full_name;
    if (rental.role === role) {
        return currentUser?.user_metadata?.full_name
            || currentUser?.user_metadata?.name
            || "A sua conta";
    }
    return rental.counterpart_full_name || "Participante CleanShare";
}

function photoDossierPhaseLabel(phase) {
    return phase === "handover" ? "Antes da utilização · Recolha" : "Depois da utilização · Devolução";
}

function renderPhotoDossierUnavailable(rental, message = "A carregar o registo interno da operação…") {
    setText("[data-photo-dossier-reference]", rental?.rental_reference ? `operação #${rental.rental_reference}` : "operação atual");
    ["owner", "renter"].forEach((role) => {
        ["handover", "return"].forEach((phase) => {
            const cell = document.querySelector(`[data-photo-dossier-cell="${role}-${phase}"]`);
            if (!cell) return;
            cell.replaceChildren(
                createElement("span", "photo-dossier__mobile-phase", photoDossierPhaseLabel(phase)),
                createElement("strong", "photo-dossier__name", dossierParticipantName(rental || {}, role)),
                createElement("span", "photo-dossier__role", role === "owner" ? "Proprietário" : "Arrendatário"),
                createElement("p", "photo-dossier__placeholder", message)
            );
            cell.dataset.state = "unavailable";
        });
    });
}

function renderPhotoDossier(rental, signedUrls) {
    setText("[data-photo-dossier-reference]", `operação #${rental.rental_reference}`);
    ["owner", "renter"].forEach((role) => {
        ["handover", "return"].forEach((phase) => {
            const cell = document.querySelector(`[data-photo-dossier-cell="${role}-${phase}"]`);
            if (!cell) return;
            const report = conditionReports.find((item) => item.author_role === role && item.phase === phase);
            const locked = phase === "return" && rental.status === "confirmed";
            const participantName = dossierParticipantName(rental, role, report);
            cell.replaceChildren();
            cell.append(
                createElement("span", "photo-dossier__mobile-phase", photoDossierPhaseLabel(phase)),
                createElement("strong", "photo-dossier__name", participantName),
                createElement("span", "photo-dossier__role", role === "owner" ? "Proprietário" : "Arrendatário")
            );
            if (locked) {
                cell.dataset.state = "locked";
                cell.append(
                    createElement("span", "photo-dossier__state", "Ainda indisponível"),
                    createElement("p", "photo-dossier__placeholder", "Disponível após início da utilização")
                );
                return;
            }
            if (!report) {
                cell.dataset.state = "pending";
                cell.append(
                    createElement("span", "photo-dossier__state", "Pendente"),
                    createElement("p", "photo-dossier__placeholder", `A aguardar registo do ${role === "owner" ? "proprietário" : "arrendatário"}`)
                );
                return;
            }
            cell.dataset.state = "confirmed";
            const stateRow = createElement("div", "photo-dossier__state-row");
            stateRow.append(createElement("span", "photo-dossier__state", "Confirmado"));
            const time = createElement("time", "", formatDateTime(report.confirmed_at));
            time.dateTime = report.confirmed_at;
            stateRow.append(time);
            cell.append(stateRow);
            const note = createElement("div", "photo-dossier__note");
            note.append(
                createElement("small", "", "Nota"),
                createElement("p", "", report.note || "Sem nota adicional.")
            );
            cell.append(note);
            const photos = createElement("div", "photo-dossier__photos");
            (report.photo_paths || []).forEach((path, index) => {
                const url = safeImageUrl(signedUrls.get(path));
                if (!url) return;
                const link = createElement("a");
                link.href = url;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.setAttribute("aria-label", `Abrir fotografia ${index + 1}, ${photoDossierPhaseLabel(phase)}, ${role === "owner" ? "do proprietário" : "do arrendatário"}`);
                const image = createElement("img");
                image.src = url;
                image.alt = `Miniatura ${index + 1} do registo ${phase === "handover" ? "antes" : "depois"} da utilização`;
                image.loading = "lazy";
                link.append(image);
                photos.append(link);
            });
            if (photos.childElementCount) cell.append(photos);
            else cell.append(createElement("p", "photo-dossier__photo-warning", "As fotografias privadas não estão disponíveis neste momento."));
        });
    });
}

function renderConditionReports(rental, signedUrls = new Map()) {
    const visible = CONDITION_VISIBLE_STATUSES.includes(rental.status);
    setHidden(conditionEvidence, !visible);
    if (!visible) return;
    renderPhotoDossier(rental, signedUrls);
    ["handover", "return"].forEach((phase) => {
        const card = document.querySelector(`[data-condition-card="${phase}"]`);
        const phaseVisible = phase === "handover" || ["in_progress", "completed", "disputed"].includes(rental.status);
        setHidden(card, !phaseVisible);
        if (!phaseVisible) return;
        const reports = conditionReports.filter((report) => report.phase === phase);
        const progress = document.querySelector(`[data-condition-progress="${phase}"]`);
        if (progress) {
            progress.textContent = `${reports.length}/2 confirmações`;
            progress.dataset.complete = String(reports.length >= 2);
        }
        const list = document.querySelector(`[data-condition-reports="${phase}"]`);
        list.replaceChildren();
        reports.forEach((report) => {
            const own = report.user_id === currentUser?.id;
            const role = report.author_role === "owner" ? "Proprietário" : "Arrendatário";
            const item = createElement("article", "condition-report");
            const heading = createElement("div", "condition-report__heading");
            heading.append(
                createElement("strong", "", own ? `A sua confirmação · ${role}` : `${report.author_full_name} · ${role}`),
                createElement("time", "", formatDateTime(report.confirmed_at))
            );
            item.append(heading);
            if (report.note) item.append(createElement("p", "", report.note));
            const photos = createElement("div", "condition-report__photos");
            (report.photo_paths || []).forEach((path, index) => {
                const url = safeImageUrl(signedUrls.get(path));
                if (!url) return;
                const link = createElement("a");
                link.href = url;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.setAttribute("aria-label", `Abrir fotografia ${index + 1} de ${report.author_full_name}`);
                const image = createElement("img");
                image.src = url;
                image.alt = `Evidência ${phase === "handover" ? "da recolha" : "da devolução"}, fotografia ${index + 1}`;
                image.loading = "lazy";
                link.append(image);
                photos.append(link);
            });
            if (photos.childElementCount) item.append(photos);
            list.append(item);
        });
        const form = document.querySelector(`[data-condition-form="${phase}"]`);
        const ownReport = reports.some((report) => report.user_id === currentUser?.id);
        const phaseOpen = (phase === "handover" && rental.status === "confirmed")
            || (phase === "return" && rental.status === "in_progress");
        form.dataset.submitted = String(ownReport);
        setHidden(form, !phaseOpen || ownReport);
        if (ownReport) {
            const confirmation = createElement("p", "inline-status", "A sua confirmação ficou registada e é imutável.");
            confirmation.dataset.type = "success";
            list.append(confirmation);
        }
    });
}

async function loadConditionReports(rental) {
    setMessage(conditionSystemStatus, "A carregar evidência…");
    const { data, error } = await supabase.rpc("list_rental_condition_reports", { p_rental_id: rental.rental_id });
    if (error) throw error;
    if (selectedRentalId !== rental.rental_id) return;
    conditionReports = data || [];
    const summaryProgress = summarizeConditionProgress(rental, conditionReports);
    if (summaryProgress) conditionProgressByRental.set(rental.rental_id, summaryProgress);
    else conditionProgressByRental.delete(rental.rental_id);
    renderPendingActions();
    renderNextOperation();
    const paths = [...new Set(conditionReports.flatMap((report) => report.photo_paths || []))];
    const signedUrls = new Map();
    let signedUrlWarning = "";
    if (paths.length) {
        const { data: signedData, error: signedError } = await supabase.storage
            .from(CONDITION_IMAGE_BUCKET)
            .createSignedUrls(paths, 300);
        if (signedError) {
            signedUrlWarning = "Os relatórios foram carregados, mas não foi possível abrir as fotografias privadas.";
        } else {
            (signedData || []).forEach((item) => {
                if (item?.signedUrl) signedUrls.set(item.path, item.signedUrl);
            });
            if (signedUrls.size < paths.length) {
                signedUrlWarning = "Os relatórios foram carregados, mas algumas fotografias privadas não puderam ser abertas.";
            }
        }
    }
    renderConditionReports(rental, signedUrls);
    setMessage(conditionSystemStatus, signedUrlWarning, signedUrlWarning ? "warning" : "info");
}

async function loadRentalCollaboration(rental) {
    collaborationReady = false;
    rentalMessages = [];
    conditionReports = [];
    renderChatMessages();
    setMessage(chatStatus, "A carregar conversa…");
    setMessage(conditionSystemStatus, "A carregar evidência…");
    const results = await Promise.allSettled([loadRentalMessages(rental), loadConditionReports(rental)]);
    if (selectedRentalId !== rental.rental_id) return;
    const errors = results.filter((result) => result.status === "rejected").map((result) => result.reason);
    if (!errors.length) {
        collaborationReady = true;
    } else if (errors.some(isRpcUnavailable)) {
        showCollaborationUnavailable();
    } else {
            setMessage(chatStatus, "Não foi possível carregar a conversa. Use Atualizar para tentar novamente.", "error");
            setMessage(conditionSystemStatus, "Não foi possível carregar a evidência desta operação.", "error");
            if (results[1].status === "rejected") {
                renderPhotoDossierUnavailable(rental, "Não foi possível carregar o dossier fotográfico desta operação.");
            }
    }
}

async function submitConditionReport(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const phase = form.dataset.conditionForm;
    const rental = rentals.find((item) => item.rental_id === selectedRentalId);
    const feedback = document.querySelector(`[data-condition-status="${phase}"]`);
    if (!rental || !ensureActionReady(feedback, rental.role)) return;
    if (!collaborationReady) {
        setMessage(feedback, "O registo bilateral ainda não está preparado na base de dados.", "warning");
        return;
    }
    if (!form.reportValidity()) return;
    const fileInput = document.querySelector(`[data-condition-files="${phase}"]`);
    const files = [...(fileInput?.files || [])];
    const validationError = validateConditionFiles(files);
    if (validationError) {
        setMessage(feedback, validationError, "error");
        return;
    }
    const submit = form.querySelector('button[type="submit"]');
    const controls = [...form.querySelectorAll("input, textarea, button")];
    const uploadedPaths = [];
    controls.forEach((control) => { control.disabled = true; });
    form.setAttribute("aria-busy", "true");
    setMessage(feedback, "A carregar e validar fotografias…");
    try {
        for (const file of files) {
            const path = conditionStoragePath(rental.rental_id, phase, file);
            const { error: uploadError } = await supabase.storage.from(CONDITION_IMAGE_BUCKET).upload(path, file, {
                cacheControl: "3600",
                contentType: file.type,
                upsert: false
            });
            if (uploadError) throw uploadError;
            uploadedPaths.push(path);
        }
        const note = document.querySelector(`[data-condition-note="${phase}"]`)?.value.trim() || null;
        const { error: reportError } = await supabase.rpc("submit_rental_condition_report", {
            p_rental_id: rental.rental_id,
            p_phase: phase,
            p_photo_paths: uploadedPaths,
            p_note: note
        });
        if (reportError) throw reportError;
        form.reset();
        resetConditionPreview(phase, false);
        setMessage(feedback, "Estado confirmado. O relatório e as fotografias ficaram preservados.", "success");
        await loadOperationalData();
        const refreshed = rentals.find((item) => item.rental_id === rental.rental_id);
        if (refreshed) openRealOperation(refreshed.rental_id);
    } catch (error) {
        const cleanupComplete = await removeConditionUploads(uploadedPaths);
        if (isRpcUnavailable(error)) showCollaborationUnavailable();
        const base = isRpcUnavailable(error)
            ? "Chat e evidência ainda não preparados na base de dados."
            : friendlyOperationError(error);
        const cleanup = uploadedPaths.length
            ? cleanupComplete
                ? " As fotografias recém-enviadas foram removidas."
                : " A limpeza automática das fotografias ficou incompleta; não tente novamente antes de contactar o suporte."
            : "";
        setMessage(feedback, `${base}${cleanup}`, "error");
    } finally {
        controls.forEach((control) => { control.disabled = false; });
        submit.disabled = false;
        form.setAttribute("aria-busy", "false");
    }
}

function openRealOperation(rentalId, trigger = null) {
    const rental = rentals.find((item) => item.rental_id === rentalId);
    if (!rental || !realOperationCenter) return;
    selectedRentalId = rentalId;
    realOperationCenter.dataset.returnFocus = trigger ? "true" : "false";
    const presentation = statusPresentation(rental);
    setText("[data-real-detail-reference]", `Operação #${rental.rental_reference}`);
    setText("[data-real-detail-equipment]", rental.equipment_title);
    setText("[data-real-detail-status]", presentation.label);
    const status = document.querySelector("[data-real-detail-status]");
    if (status) status.className = `status ${presentation.className}`;
    setText("[data-real-detail-role]", rental.role === "owner" ? "Proprietário" : "Arrendatário");
    setText("[data-real-detail-dates]", formatDateRange(rental.start_date, rental.end_date));
    setText("[data-real-detail-location]", rental.city || "—");
    setText("[data-real-detail-counterparty]", rental.counterpart_full_name || "Utilizador CleanShare");
    setText("[data-real-detail-total]", `${formatCurrency(rental.total_amount)} · não processado`);
    setText("[data-real-detail-deposit]", `${formatCurrency(rental.deposit_amount)} · não bloqueada`);
    setText("[data-real-request-message]", rental.request_message || "Sem mensagem.");
    setText("[data-real-response-message]", rental.owner_response_message || "Ainda sem resposta.");
    renderContact(rental);
    setHidden(chatForm, true);
    setHidden(conditionEvidence, !CONDITION_VISIBLE_STATUSES.includes(rental.status));
    if (CONDITION_VISIBLE_STATUSES.includes(rental.status)) renderPhotoDossierUnavailable(rental);
    conditionForms.forEach((form) => setHidden(form, true));
    updateRealTimeline(rental);
    renderOperationActions(rental);
    setHidden(realOperationCenter, false);
    loadRentalCollaboration(rental);
    realOperationCenter.scrollIntoView({ behavior: "smooth", block: "start" });
    realOperationCenter.focus({ preventScroll: true });
}

function closeRealOperation() {
    setHidden(realOperationCenter, true);
    ["handover", "return"].forEach((phase) => resetConditionPreview(phase));
    selectedRentalId = null;
    collaborationReady = false;
}

async function performRentalAction(rental, action) {
    if (!ensureActionReady(realOperationMessage, rental.role)) return;
    if (["reject", "cancel"].includes(action)) {
        const copy = action === "reject" ? "Rejeitar definitivamente este pedido piloto?" : "Cancelar esta operação piloto?";
        if (!window.confirm(copy)) return;
    }
    const buttons = [...realOperationActions.querySelectorAll("button")];
    buttons.forEach((button) => { button.disabled = true; });
    setMessage(realOperationMessage, "A atualizar a operação…");
    const rpcByAction = {
        accept: ["accept_rental_request", { p_rental_id: rental.rental_id, p_message: ownerResponseMessage?.value.trim() || null }],
        reject: ["reject_rental_request", { p_rental_id: rental.rental_id, p_message: ownerResponseMessage?.value.trim() || null }],
        cancel: ["cancel_rental_request", { p_rental_id: rental.rental_id }]
    };
    try {
        const [rpc, params] = rpcByAction[action];
        const { error } = await supabase.rpc(rpc, params);
        if (error) throw error;
        await loadOperationalData();
        const refreshed = rentals.find((item) => item.rental_id === rental.rental_id);
        if (refreshed) openRealOperation(refreshed.rental_id);
        else closeRealOperation();
        setMessage(realOperationMessage, "Operação atualizada.", "success");
    } catch (error) {
        if (isRpcUnavailable(error)) showOperationalUnavailable();
        setMessage(realOperationMessage, isRpcUnavailable(error) ? "Fluxo operacional ainda não preparado na base de dados." : friendlyOperationError(error), "error");
    } finally {
        buttons.forEach((button) => { button.disabled = false; });
    }
}

async function loadOperationalData() {
    if (!supabase || !currentUser) return;
    setMessage(operationsStatus, "A carregar operações…");
    setMessage(listingsStatus, "A carregar anúncios…");
    const [rentalsResult, listingsResult] = await Promise.all([
        supabase.rpc("list_my_rentals"),
        supabase.rpc("list_active_pilot_listings")
    ]);
    const missingMigration = isRpcUnavailable(rentalsResult.error) || isRpcUnavailable(listingsResult.error);
    if (missingMigration) {
        rentals = [];
        listings = [];
        renderOperations();
        renderListings();
        showOperationalUnavailable();
        setMessage(listingsStatus);
        return;
    }
    if (rentalsResult.error || listingsResult.error) {
        operationalReady = false;
        rentals = [];
        listings = [];
        renderOperations();
        renderListings();
        setMessage(operationsStatus, "Não foi possível carregar as operações. Tente novamente.", "error");
        setMessage(listingsStatus, "Não foi possível carregar o catálogo piloto. Tente novamente.", "error");
        return;
    }
    operationalReady = true;
    rentals = rentalsResult.data || [];
    listings = listingsResult.data || [];
    await loadConditionProgress(rentals);
    setHidden(systemMessage, true);
    setMessage(operationsStatus);
    setMessage(listingsStatus);
    renderOperations();
    renderListings();
    renderRoleAccess();
}

async function loadMarketplace() {
    if (!supabase || !currentUser || !accountState) return;
    renderRoleAccess();
    const city = document.querySelector("#equipmentCity");
    const postalCode = document.querySelector("#equipmentPostalCode");
    if (city && !city.value) city.value = accountState.profileDefaults?.city || "";
    if (postalCode && !postalCode.value) postalCode.value = accountState.profileDefaults?.postalCode || "";
    await Promise.all([loadOwnEquipment(), loadOperationalData()]);
}

async function buildFallbackAccountState(user) {
    const roles = normalizeRoles(user.user_metadata?.roles);
    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, city, postal_code, verification_status")
        .eq("id", user.id)
        .maybeSingle();
    const readiness = {
        email: Boolean(user.email_confirmed_at || user.confirmed_at),
        name: Boolean(String(profile?.full_name || "").trim()),
        phone: Boolean(String(profile?.phone || "").trim()),
        location: Boolean(String(profile?.city || "").trim() && String(profile?.postal_code || "").trim()),
        roles: roles.length > 0
    };
    return {
        userId: user.id,
        roles,
        readiness,
        canOperate: true,
        profileDefaults: { city: profile?.city || "", postalCode: profile?.postal_code || "" }
    };
}

async function initializeMarketplace(detail = null) {
    if (DEMO_MODE) return;
    if (detail) accountState = { ...detail, roles: normalizeRoles(detail.roles) };
    if (initializing) return initializing;
    initializing = (async () => {
        if (!isSupabaseConfigured) return;
        try {
            supabase = await getSupabaseClient();
            const { data, error } = await supabase.auth.getSession();
            if (error || !data.session?.user) return;
            currentUser = data.session.user;
            if (!accountState) accountState = await buildFallbackAccountState(currentUser);
            await loadMarketplace();
        } catch {
            setMessage(operationsStatus, "Não foi possível preparar o fluxo operacional. O perfil continua disponível.", "error");
        }
    })();
    await initializing;
    initializing = null;
}

window.addEventListener("cleanshare:account-ready", (event) => {
    accountState = { ...event.detail, roles: normalizeRoles(event.detail?.roles) };
    if (supabase && currentUser) loadMarketplace();
    else initializeMarketplace(accountState);
});

window.addEventListener("cleanshare:role-filter", (event) => {
    const role = event.detail?.role;
    if (!["all", "owner", "renter"].includes(role)) return;
    currentRoleFilter = role;
    renderOperations();
});

equipmentFormToggle?.addEventListener("click", () => setEquipmentFormOpen(equipmentFormPanel.hidden));
equipmentFormClose?.addEventListener("click", () => setEquipmentFormOpen(false));
equipmentForm?.addEventListener("submit", saveEquipment);
equipmentImageInput?.addEventListener("change", updateImagePreview);
equipmentImageRemove?.addEventListener("click", () => resetImagePreview());
equipmentReload?.addEventListener("click", loadOwnEquipment);
listingsReload?.addEventListener("click", loadOperationalData);
systemRetry?.addEventListener("click", loadMarketplace);
nextOperationButton?.addEventListener("click", () => openRealOperation(nextOperationButton.dataset.rentalId, nextOperationButton));
realOperationClose?.addEventListener("click", closeRealOperation);
chatForm?.addEventListener("submit", sendRentalMessage);
chatRefresh?.addEventListener("click", async () => {
    const rental = rentals.find((item) => item.rental_id === selectedRentalId);
    if (!rental || !supabase) return;
    chatRefresh.disabled = true;
    try {
        await loadRentalMessages(rental);
    } catch (error) {
        if (isRpcUnavailable(error)) showCollaborationUnavailable();
        else setMessage(chatStatus, "Não foi possível atualizar a conversa.", "error");
    } finally {
        chatRefresh.disabled = false;
    }
});
conditionFileInputs.forEach((input) => input.addEventListener("change", () => updateConditionPreview(input)));
conditionForms.forEach((form) => form.addEventListener("submit", submitConditionReport));

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && realOperationCenter && !realOperationCenter.hidden) closeRealOperation();
});

if (!DEMO_MODE) initializeMarketplace();
