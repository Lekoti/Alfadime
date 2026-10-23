import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import useAuth from "../modules/auth/hooks/useAuth.js";

function Sidebar({ collapsed = false, onToggle }) {
    const navigate = useNavigate();
    const location = useLocation();
    const pathname = location.pathname;

    const [version, setVersion] = useState("");

    const { user, logout } = useAuth();

    useEffect(() => {
        window.alfadime?.app?.getVersion?.()
            .then((value) => setVersion(value || ""))
            .catch(() => setVersion(""));
    }, []);

    const menuItems = [
        { key: "/", label: "Início", icon: "⌂", exact: true },
        { key: "/products", label: "Produtos", icon: "▤" },
        { key: "/product-audit", label: "Auditoria de Produtos", icon: "✓" },
        { key: "/product-corrections", label: "Correções de Produtos", icon: "✎" },
        { key: "/price-pending", label: "Preços e Pendências", icon: "≡" },
        { key: "/purchases", label: "Compras", icon: "↙" },
        { key: "/industry-contacts", label: "Contatos", icon: "☎" },
        { key: "/notifications", label: "Notificações", icon: "!" },
        { key: "/email", label: "E-mail", icon: "✉" }
    ];

    function isActive(item) {
        if (item.key === "/industry-contacts" && pathname === "/contacts/charge-favorites") {
            return true;
        }
        if (item.exact) {
            return pathname === item.key;
        }

        return (
            pathname === item.key ||
            pathname.startsWith(`${item.key}/`)
        );
    }

    const handleLogout = async () => {
        await logout();
    };

    return (
        <aside className="alfadime-sidebar">
            <button
                type="button"
                className="alfadime-sidebar-toggle"
                onClick={onToggle}
                title={collapsed ? "Expandir menu" : "Recolher menu"}
                aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            >
                {collapsed ? "»" : "«"}
            </button>

            <nav className="alfadime-navigation">
                {!collapsed && (
                    <span className="alfadime-navigation-title">
                        Módulos
                    </span>
                )}

                {menuItems.map((item) => (
                    <div key={item.key}>
                        <button
                            type="button"
                            className={
                                isActive(item)
                                    ? "alfadime-menu-item active"
                                    : "alfadime-menu-item"
                            }
                            onClick={() => navigate(item.key)}
                            title={item.label}
                        >
                            <span className="alfadime-menu-icon">
                                {item.icon}
                            </span>

                            {!collapsed && (
                                <span>
                                    {item.label}
                                </span>
                            )}
                        </button>

                        {!collapsed && item.key === "/email" && isActive(item) && (
                            <div className="alfadime-menu-subitems">
                                <button
                                    type="button"
                                    className={
                                        pathname === "/email"
                                            ? "alfadime-menu-item active"
                                            : "alfadime-menu-item"
                                    }
                                    onClick={() => navigate("/email")}
                                >
                                    Campanhas
                                </button>

                                <button
                                    type="button"
                                    className={
                                        pathname === "/email/received"
                                            ? "alfadime-menu-item active"
                                            : "alfadime-menu-item"
                                    }
                                    onClick={() => navigate("/email/received")}
                                >
                                    Recebidos
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </nav>

            <div className="alfadime-sidebar-footer">
                {!collapsed && (
                    <div className="alfadime-sidebar-user">
                        <span className="alfadime-sidebar-user-label">
                            Usuário
                        </span>

                        <span className="alfadime-sidebar-user-name">
                            {user?.display_name || user?.username || "Usuário"}
                        </span>
                    </div>
                )}

                <div className="alfadime-sidebar-footer-actions">
                    {!collapsed && (
                        <small>
                            {version ? `Versão ${version}` : "Carregando versão..."}
                        </small>
                    )}

                    <button
                        type="button"
                        className={
                            pathname.startsWith("/settings")
                                ? "alfadime-settings-button active"
                                : "alfadime-settings-button"
                        }
                        onClick={() => navigate("/settings")}
                        title="Configurações"
                        aria-label="Abrir configurações"
                    >
                        ⚙
                    </button>

                    {!collapsed && (
                        <button
                            type="button"
                            className="alfadime-logout-button"
                            onClick={handleLogout}
                            title="Sair"
                            aria-label="Sair do Alfadime"
                        >
                            Sair
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;

