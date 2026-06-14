// ╔══════════════════════════════════════════════════════════════════════╗
// ║  UI PRIMITIVES — tiny vanilla replacements for the Materialize        ║
// ║  components the dashboard used: toasts and modal dialogs.             ║
// ║  Modals are native <dialog> elements (showModal/close + ::backdrop).  ║
// ╚══════════════════════════════════════════════════════════════════════╝

// ── Toast ───────────────────────────────────────────────────────────────
function toast(message, duration = 2600) {
    let holder = document.getElementById("toast-holder");
    if (!holder) {
        holder = document.createElement("div");
        holder.id = "toast-holder";
        document.body.appendChild(holder);
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.textContent = message;
    holder.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
        el.classList.remove("show");
        setTimeout(() => el.remove(), 300);
    }, duration);
}

// ── Dialogs (native <dialog>) ───────────────────────────────────────────
function openDialog(id) {
    const dlg = document.getElementById(id);
    if (dlg && typeof dlg.showModal === "function" && !dlg.open) dlg.showModal();
}

function closeDialog(id) {
    document.getElementById(id)?.close();
}

// Wire close buttons + backdrop light-dismiss for every <dialog> on the page.
function initDialogs() {
    document.querySelectorAll("dialog").forEach((dlg) => {
        dlg.querySelectorAll("[data-dialog-close]").forEach((btn) => {
            btn.addEventListener("click", (e) => { e.preventDefault(); dlg.close(); });
        });
        // Click on the backdrop (the <dialog> element itself, not its children) closes.
        dlg.addEventListener("click", (e) => {
            if (e.target === dlg) dlg.close();
        });
    });
}
