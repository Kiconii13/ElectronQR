// load-partials.js

async function loadPartial(name) {
    const container = document.getElementById("content");

    const html = await fetch(`partials/${name}.html`).then(res => res.text());
    container.innerHTML = html;

    // After loading, attach event handlers if defined
    if (window.attachHandlers) {
        attachHandlers(name);
    }
}

// tab buttons
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        loadPartial(btn.dataset.tab);
    });
});
