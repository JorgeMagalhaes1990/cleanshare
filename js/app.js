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
/* FIM DO APP.JS */
/* ========================= */
