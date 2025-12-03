export function afficherNotification(message) {
    let toast = document.createElement("div");
    toast.className = "toast-notification";
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add("show"); }, 100);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => { document.body.removeChild(toast); }, 500);
    }, 3000);
}

export function demanderConfirmation(message, couleurBouton, callbackOui) {
    let overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';
    let classeBtn = (couleurBouton === 'rouge') ? 'btn-danger-modal' : 'btn-yes';
    overlay.innerHTML = `
        <div class="custom-modal">
            <p>${message}</p>
            <div class="modal-buttons">
                <button id="modal-btn-no" class="btn-modal btn-no">Annuler</button>
                <button id="modal-btn-yes" class="btn-modal ${classeBtn}">Confirmer</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('modal-btn-yes').onclick = function() { document.body.removeChild(overlay); callbackOui(); };
    document.getElementById('modal-btn-no').onclick = function() { document.body.removeChild(overlay); };
}

export function toggleDisplay(elementId, show, displayType = 'block') {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (show) { el.classList.remove('hidden'); el.style.display = displayType; } 
    else { el.classList.add('hidden'); el.style.display = 'none'; }
}