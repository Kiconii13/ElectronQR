// load-partials.js

async function loadPartial(name) {
    const container = document.getElementById("content");

    const html = await fetch(`partials/${name}.html`).then(res => res.text());
    container.innerHTML = html;

    // nakon učitavanja partial-a, povezujemo event handlere iz renderer.js
    if (window.attachHandlers) {
        attachHandlers(name);
    }
}

// tab dugmad
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        loadPartial(btn.dataset.tab);
    });
});
