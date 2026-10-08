import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initTheme } from "./shared/theme";
import "./styles/globals.css";
import "./modules/industry-contacts/styles/industry-contacts.css";


initTheme();



window.addEventListener("error", (e) => {
    console.error("[main.jsx] Erro global:", e.error);
});


window.addEventListener("unhandledrejection", (e) => {
    console.error("[main.jsx] Promise rejeitada:", e.reason);
});


try {
    const root = document.getElementById("root");
    
    if (!root) {
        throw new Error("Elemento #root não encontrado!");
    }
    
    const rootInstance = ReactDOM.createRoot(root);
    
    rootInstance.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
    
} catch (error) {
    console.error("[main.jsx] Erro ao renderizar:", error);
    document.body.innerHTML = `<pre style="color: red; padding: 20px;">Erro: ${error.message}\n\n${error.stack}</pre>`;
}