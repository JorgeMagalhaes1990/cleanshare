/* ===================================================== */
/* CLEANSHARE - APP.JS */
/* ===================================================== */

const equipmentRates = {
    "Lavadora de Alta Pressão": 15,
    "Máquina de Limpeza de Estofos": 20,
    "Aspirador Industrial": 18,
    "Lavadora de Pavimentos": 35,
    "Gerador de Vapor": 30,
    "Extratora": 25,
    "Polidora": 28,
    "Lavadora Compacta": 12
};

const equipment = document.getElementById("equipment");
const daysValue = document.getElementById("daysValue");
const income = document.getElementById("monthlyIncome");

const minus = document.getElementById("minusDays");
const plus = document.getElementById("plusDays");

let days = 15;

function updateIncome() {
    const rate = equipmentRates[equipment.value] || 0;
    daysValue.textContent = days;
    income.textContent = `${rate * days} €`;
}

if (minus) {
    minus.addEventListener("click", () => {
        if (days > 1) {
            days--;
            updateIncome();
        }
    });
}

if (plus) {
    plus.addEventListener("click", () => {
        if (days < 30) {
            days++;
            updateIncome();
        }
    });
}

if (equipment) {
    equipment.addEventListener("change", updateIncome);
}

updateIncome();

/* ========================= */
/* NAVEGAÇÃO MOBILE */
/* ========================= */

const menuToggle = document.querySelector(".navbar__toggle");
const navigation = document.getElementById("primary-navigation");

function closeMenu() {
    if (!menuToggle || !navigation) return;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menu");
    navigation.classList.remove("is-open");
}

if (menuToggle && navigation) {
    menuToggle.addEventListener("click", () => {
        const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
        menuToggle.setAttribute("aria-expanded", String(willOpen));
        menuToggle.setAttribute("aria-label", willOpen ? "Fechar menu" : "Abrir menu");
        navigation.classList.toggle("is-open", willOpen);
    });

    navigation.addEventListener("click", (event) => {
        if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("click", (event) => {
        if (!event.target.closest(".navbar__container")) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeMenu();
            menuToggle.focus();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 960) closeMenu();
    });
}

/* ========================= */
/* FIM DO APP.JS */
/* ========================= */
