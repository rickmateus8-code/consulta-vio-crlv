import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ─── Segurança: Desabilitar Inspeção de Elementos ───────────────────────────────
(function() {
  // Desabilitar menu de contexto (clique direito)
  document.addEventListener("contextmenu", (e) => e.preventDefault(), false);

  // Desabilitar atalhos de teclado para inspeção e Caret Browsing
  document.addEventListener("keydown", (e) => {
    // F7 (Caret Browsing / Navegação por cursor)
    if (e.key === "F7") {
      e.preventDefault();
      return false;
    }
    // F12 (DevTools)
    if (e.key === "F12") {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I (Inspecionar)
    if (e.ctrlKey && e.shiftKey && e.key === "I") {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+C (Inspecionar elemento)
    if (e.ctrlKey && e.shiftKey && e.key === "C") {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && e.key === "J") {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+K (Console - Firefox)
    if (e.ctrlKey && e.shiftKey && e.key === "K") {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+M (Responsive Design Mode)
    if (e.ctrlKey && e.shiftKey && e.key === "M") {
      e.preventDefault();
      return false;
    }
  }, false);

  try {
    document.designMode = "off";
  } catch {}

  // Desabilitar seleção de texto (opcional - comentado por padrão)
  // document.body.style.userSelect = "none";

  // Desabilitar arrasto de imagens
  document.addEventListener("dragstart", (e) => {
    if ((e.target as HTMLElement).tagName === "IMG") {
      e.preventDefault();
      return false;
    }
  }, false);

  // Desabilitar cópia de conteúdo (opcional - comentado por padrão)
  // document.addEventListener("copy", (e) => {
  //   e.preventDefault();
  //   return false;
  // }, false);

  // Detectar abertura de DevTools (método alternativo)
  let devtoolsOpen = false;
  const threshold = 160;

  setInterval(() => {
    if (window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        console.clear();
        console.log("%c⚠️ ACESSO NEGADO", "color: red; font-size: 20px; font-weight: bold;");
        console.log("%cA inspeção de elementos não é permitida nesta aplicação.", "color: red; font-size: 14px;");
      }
    } else {
      devtoolsOpen = false;
    }
  }, 500);
})();

// ─── Inicializar Aplicação ──────────────────────────────────────────────────────
createRoot(document.getElementById("root")!).render(<App />);
