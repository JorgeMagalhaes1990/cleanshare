import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const PLACEHOLDER_KEY = "__SUPABASE_PUBLISHABLE_KEY__";

const dialog = document.getElementById("authDialog");
const openButtons = document.querySelectorAll("[data-auth-open]");
const closeButton = document.querySelector("[data-auth-close]");
const tabs = [...document.querySelectorAll("[data-auth-tab]")];
const switchButtons = document.querySelectorAll("[data-auth-switch]");
const forms = [...document.querySelectorAll("[data-auth-form]")];
const message = document.querySelector("[data-auth-message]");
const configurationNotice = document.querySelector("[data-auth-config]");
const guestElements = document.querySelectorAll("[data-auth-guest]");
const authenticatedElements = document.querySelectorAll("[data-authenticated]");
const accountLinks = document.querySelectorAll("[data-account-link]");
const sessionLabels = document.querySelectorAll("[data-session-label]");
const logoutButtons = document.querySelectorAll("[data-auth-logout]");
const submitButtons = document.querySelectorAll("[data-auth-submit]");

const configurationReady = Boolean(
    SUPABASE_URL
    && SUPABASE_PUBLISHABLE_KEY
    && SUPABASE_PUBLISHABLE_KEY !== PLACEHOLDER_KEY
);

let supabase = null;
let lastTrigger = null;

function setMessage(text = "", type = "info") {
    if (!message) return;
    message.textContent = text;
    message.dataset.type = type;
}

function setSubmitAvailability(enabled) {
    submitButtons.forEach((button) => {
        button.disabled = !enabled;
    });
}

function setBusy(form, busy) {
    const submit = form.querySelector("[data-auth-submit]");
    if (!submit) return;

    if (!submit.dataset.defaultLabel) {
        submit.dataset.defaultLabel = submit.textContent.trim();
    }

    submit.disabled = busy || !configurationReady;
    submit.textContent = busy ? "A processar…" : submit.dataset.defaultLabel;
    form.setAttribute("aria-busy", String(busy));
}

function friendlyError(error) {
    const technicalMessage = String(error?.message || "").toLowerCase();

    if (technicalMessage.includes("invalid login credentials")) {
        return "Email ou palavra-passe incorretos.";
    }
    if (technicalMessage.includes("email not confirmed")) {
        return "Confirma o teu email antes de iniciares sessão.";
    }
    if (technicalMessage.includes("already registered") || technicalMessage.includes("already been registered")) {
        return "Já existe uma conta associada a este email.";
    }
    if (technicalMessage.includes("password") && technicalMessage.includes("characters")) {
        return "A palavra-passe deve ter pelo menos 8 caracteres.";
    }
    if (technicalMessage.includes("rate limit") || error?.status === 429) {
        return "Foram feitas demasiadas tentativas. Tenta novamente dentro de alguns minutos.";
    }
    if (technicalMessage.includes("fetch") || technicalMessage.includes("network")) {
        return "Não foi possível contactar o serviço. Verifica a ligação e tenta novamente.";
    }

    return "Não foi possível concluir o pedido. Tenta novamente.";
}

function closeMobileMenu() {
    const menu = document.getElementById("primary-navigation");
    const toggle = document.querySelector(".navbar__toggle");

    menu?.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
    toggle?.setAttribute("aria-label", "Abrir menu");
}

function selectMode(mode, focusTab = false) {
    tabs.forEach((tab) => {
        const selected = tab.dataset.authTab === mode;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        if (selected && focusTab) tab.focus();
    });

    forms.forEach((form) => {
        form.hidden = form.dataset.authForm !== mode;
    });

    if (configurationReady) setMessage();
}

function openDialog(event) {
    if (!dialog) return;
    lastTrigger = event.currentTarget;
    closeMobileMenu();
    selectMode("register");

    if (!configurationReady) {
        setMessage("A autenticação ficará disponível assim que a configuração for concluída.", "config");
    }

    if (typeof dialog.showModal === "function") {
        dialog.showModal();
    } else {
        dialog.setAttribute("open", "");
    }

    document.body.classList.add("auth-modal-open");
}

function closeDialog() {
    if (!dialog) return;

    if (typeof dialog.close === "function" && dialog.open) {
        dialog.close();
    } else {
        dialog.removeAttribute("open");
    }

    document.body.classList.remove("auth-modal-open");
}

function updateSession(session) {
    const signedIn = Boolean(session?.user);
    const fullName = session?.user?.user_metadata?.full_name?.trim();
    const firstName = fullName?.split(/\s+/)[0];
    const sessionText = firstName ? `Olá, ${firstName}` : "Sessão ativa";

    guestElements.forEach((element) => {
        element.hidden = signedIn;
    });
    authenticatedElements.forEach((element) => {
        element.hidden = !signedIn;
    });
    accountLinks.forEach((element) => {
        element.hidden = !signedIn;
    });
    sessionLabels.forEach((element) => {
        element.textContent = sessionText;
    });
}

async function initializeSupabase() {
    if (!configurationReady) {
        configurationNotice.hidden = false;
        setSubmitAvailability(false);
        updateSession(null);
        return;
    }

    try {
        const { createClient } = await import(SUPABASE_CDN);
        supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        updateSession(data.session);
        setSubmitAvailability(true);

        supabase.auth.onAuthStateChange((_event, session) => {
            updateSession(session);
        });
    } catch (error) {
        console.warn("CleanShare authentication is temporarily unavailable.");
        configurationNotice.hidden = false;
        configurationNotice.querySelector("strong").textContent = "Autenticação temporariamente indisponível";
        configurationNotice.querySelector("p").textContent = "Tenta novamente mais tarde.";
        setSubmitAvailability(false);
        updateSession(null);
    }
}

openButtons.forEach((button) => {
    button.addEventListener("click", openDialog);
});

closeButton?.addEventListener("click", closeDialog);

dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
});

dialog?.addEventListener("close", () => {
    document.body.classList.remove("auth-modal-open");
    lastTrigger?.focus();
});

tabs.forEach((tab) => {
    tab.addEventListener("click", () => selectMode(tab.dataset.authTab));
    tab.addEventListener("keydown", (event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const currentIndex = tabs.indexOf(tab);
        const nextTab = tabs[(currentIndex + direction + tabs.length) % tabs.length];
        selectMode(nextTab.dataset.authTab, true);
    });
});

switchButtons.forEach((button) => {
    button.addEventListener("click", () => selectMode(button.dataset.authSwitch, true));
});

forms.forEach((form) => {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!configurationReady || !supabase) {
            setMessage("A autenticação ainda não está configurada.", "config");
            return;
        }

        const formData = new FormData(form);
        const email = String(formData.get("email") || "").trim();
        const password = String(formData.get("password") || "");

        if (password.length < 8) {
            setMessage("A palavra-passe deve ter pelo menos 8 caracteres.", "error");
            return;
        }

        setBusy(form, true);
        setMessage();

        try {
            if (form.dataset.authForm === "register") {
                const fullName = String(formData.get("full_name") || "").trim();
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: fullName },
                        emailRedirectTo: `${window.location.origin}/`
                    }
                });

                if (error) throw error;
                form.reset();

                if (data.session) {
                    setMessage("Conta criada e sessão iniciada com sucesso.", "success");
                } else {
                    setMessage("Conta criada. Confirma o link enviado para o teu email.", "success");
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                form.reset();
                setMessage("Sessão iniciada com sucesso.", "success");
                window.setTimeout(closeDialog, 700);
            }
        } catch (error) {
            setMessage(friendlyError(error), "error");
        } finally {
            setBusy(form, false);
        }
    });
});

logoutButtons.forEach((button) => {
    button.addEventListener("click", async () => {
        if (!supabase) return;

        button.disabled = true;
        const { error } = await supabase.auth.signOut();
        button.disabled = false;

        if (error) {
            setMessage("Não foi possível terminar a sessão. Tenta novamente.", "error");
            return;
        }

        updateSession(null);
        closeMobileMenu();
    });
});

initializeSupabase();
