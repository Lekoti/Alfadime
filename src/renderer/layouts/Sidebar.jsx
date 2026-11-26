import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Bell,
    Boxes,
    ClipboardCheck,
    FilePen,
    FileUp,
    Home,
    ListChecks,
    Mail,
    Package,
    Phone,
    Settings,
    ShoppingCart
} from "lucide-react";

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
        { key: "/", label: "Início", icon: Home, exact: true },
        { key: "/product-audit", label: "Auditoria de Produtos", icon: ClipboardCheck },
        { key: "/purchases", label: "Compras", icon: ShoppingCart },
        { key: "/merchandise-purchases", label: "Compras de Mercadorias", icon: Boxes },
        { key: "/industry-contacts", label: "Contatos", icon: Phone },
        { key: "/product-corrections", label: "Correções de Produtos", icon: FilePen },
        { key: "/email", label: "E-mail", icon: Mail },
        { key: "/nf-import", label: "Importação NF", icon: FileUp },
        { key: "/notifications", label: "Notificações", icon: Bell },
        { key: "/price-pending", label: "Preços e Pendências", icon: ListChecks },
        { key: "/products", label: "Produtos", icon: Package }
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

                {menuItems.map((item) => {
                    const Icon = item.icon;

                    return (
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
                                    <Icon size={18} strokeWidth={2} />
                                </span>

                                {!collapsed && (
                                    <span>
                                        {item.label}
                                    </span>
                                )}
                            </button>

                            {!collapsed && item.key === "/industry-contacts" && isActive(item) && (
                                <div className="alfadime-menu-subitems">
                                    <button
                                        type="button"
                                        className={pathname === "/industry-contacts"
                                            ? "alfadime-menu-item active" : "alfadime-menu-item"}
                                        onClick={() => navigate("/industry-contacts")}
                                    >
                                        Contatos
                                    </button>
                                    <button
                                        type="button"
                                        className={pathname === "/contacts/charge-favorites"
                                            ? "alfadime-menu-item active" : "alfadime-menu-item"}
                                        onClick={() => navigate("/contacts/charge-favorites")}
                                    >
                                        Favoritos de cobrança
                                    </button>
                                </div>
                            )}

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
                    );
                })}
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
                        <Settings size={18} strokeWidth={2} />
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
