/* Fenêtre de saisie commune, centrée dans la partie visible de l’iframe. */
(function(root) {
  "use strict";
  let sequence = 0;
  function open(title, content, focusBack) {
    const trigger = document.activeElement, dialog = document.createElement("dialog");
    dialog.className = "edit-dialog";
    const heading = document.createElement("h2"); heading.id = "edit-dialog-" + ++sequence; heading.textContent = title;
    dialog.setAttribute("aria-labelledby", heading.id);
    const closeButton = document.createElement("button"); closeButton.type = "button"; closeButton.className = "dialog-close button small";
    closeButton.textContent = "×"; closeButton.setAttribute("aria-label", "Fermer sans enregistrer");
    const header = document.createElement("div"); header.className = "dialog-heading"; header.append(heading, closeButton);
    dialog.append(header, content); document.body.append(dialog);
    let parentWindow = null;
    try { if (window.frameElement) parentWindow = window.parent; } catch (_) {}
    function position() {
      let height = window.innerHeight, top = 0;
      try { if (parentWindow) {height = parentWindow.innerHeight; top = window.frameElement.getBoundingClientRect().top;} } catch (_) {}
      dialog.style.maxHeight = Math.max(120, height - 40) + "px";
      dialog.style.top = Math.max(12, (height - dialog.offsetHeight) / 2 - top) + "px";
    }
    const observer = new ResizeObserver(position);
    function close() { if (dialog.open) dialog.close(); }
    dialog.addEventListener("close", () => {
      observer.disconnect(); window.removeEventListener("resize",position); parentWindow?.removeEventListener("scroll",position,true); parentWindow?.removeEventListener("resize",position);
      dialog.remove(); const target = trigger?.isConnected ? trigger : focusBack?.(); target?.focus({preventScroll:true});
    }, {once:true});
    closeButton.addEventListener("click", close);
    dialog.addEventListener("cancel", e => { e.preventDefault();close(); });
    dialog.addEventListener("keydown", e => { if(e.key === "Escape") e.stopPropagation(); });
    position(); dialog.showModal(); position(); observer.observe(dialog);
    window.addEventListener("resize",position);parentWindow?.addEventListener("scroll",position,true);parentWindow?.addEventListener("resize",position);
    content.querySelector("input,textarea,select")?.focus({preventScroll:true});
    return {close};
  }
  root.EditDialog = {open};
})(globalThis);
