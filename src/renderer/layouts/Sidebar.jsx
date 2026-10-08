import {
    useEffect,
    useState
} from "react";

import {
    useLocation,
    useNavigate
} from "react-router-dom";

import useAuth from
    "../modules/auth/hooks/useAuth.js";


function Sidebar() {
    const navigate =
        useNavigate();

    const location =
        useLocation();

    const pathname =
        location.pathname;

    const [
        version,
        setVersion
    ] = useState("");

    const {
        user,
        logout
    } = useAuth();


    useEffect(() => {
        window.alfadime?.app?.getVersion?.()
            .then((value) =>
                setVersion(
                    value || ""
                )
            )
            .catch(() =>
                setVersion("")
            );
    }, []);


    const menuItems = [
        {
            key: "/",
            label: "Início",
            icon: "⌂",
            exact: true
        },
        {
            key: "/products",
            label: "Produtos",
            icon: "▤"
        },
        {
            key: "/product-audit",
            label: "Auditoria de Produtos",
            icon: "✓"
        },
        {
            key: "/product-corrections",
            label: "Correções de Produtos",
            icon: "✎"
        },
        {
            key: "/price-pending",
            label: "Preços e Pendências",
            icon: "▦"
        },
        {
            key: "/purchases",
            label: "Compras",
            icon: "↙"
        },
        {
            key: "/industry-contacts",
            label: "Contatos",
            icon: "☎"
        },
        {
            key: "/notifications",
            label: "Notificações",
            icon: "!"
        },
        {
            key: "/email",
            label: "E-mail",
            icon: "✉"
        }
    ];


    function isActive(item) {
        if (item.exact) {
            return pathname === item.key;
        }

        return (
            pathname === item.key ||
            pathname.startsWith(
                `${item.key}/`
            )
        );
    }


    const handleLogout =
        async () => {
            await logout();
        };


    return (
        <aside className="alfadime-sidebar">
            <nav className="alfadime-navigation">
                <span className="alfadime-navigation-title">
                    Módulos
                </span>

                {
                    menuItems.map((item) => (
                        <div key={item.key}>
                            <button
                                type="button"
                                className={
                                    isActive(item)
                                        ? "alfadime-menu-item active"
                                        : "alfadime-menu-item"
                                }
                                onClick={() =>
                                    navigate(item.key)
                                }
                            >
                                <span className="alfadime-menu-icon">
                                    {item.icon}
                                </span>

                                <span>
                                    {item.label}
                                </span>
                            </button>

                            {
                                item.key === "/email" &&
                                isActive(item) && (
                                    <div
                                        style={{
                                            paddingLeft: 24,
                                            paddingTop: 4
                                        }}
                                    >
                                        <button
                                            type="button"
                                            className={
                                                pathname === "/email"
                                                    ? "alfadime-menu-item active"
                                                    : "alfadime-menu-item"
                                            }
                                            onClick={() =>
                                                navigate("/email")
                                            }
                                            style={{
                                                fontSize: 13
                                            }}
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
                                            onClick={() =>
                                                navigate(
                                                    "/email/received"
                                                )
                                            }
                                            style={{
                                                fontSize: 13
                                            }}
                                        >
                                            Recebidos
                                        </button>
                                    </div>
                                )
                            }
                        </div>
                    ))
                }
            </nav>

            <div className="alfadime-sidebar-footer">
                <div className="alfadime-sidebar-user">
                    <span className="alfadime-sidebar-user-label">
                        Usuário
                    </span>

                    <span className="alfadime-sidebar-user-name">
                        {
                            user?.display_name ||
                            user?.username ||
                            "Usuário"
                        }
                    </span>
                </div>

                <div className="alfadime-sidebar-footer-actions">
                    <small>
                        {
                            version
                                ? `Versão ${version}`
                                : "Carregando versão..."
                        }
                    </small>

                    <button
                        type="button"
                        className={
                            pathname.startsWith(
                                "/settings"
                            )
                                ? "alfadime-settings-button active"
                                : "alfadime-settings-button"
                        }
                        onClick={() =>
                            navigate("/settings")
                        }
                        title="Configurações"
                        aria-label="Abrir configurações"
                    >
                        ⚙
                    </button>

                    <button
                        type="button"
                        className="alfadime-logout-button"
                        onClick={handleLogout}
                        title="Sair"
                        aria-label="Sair do Alfadime"
                    >
                        Sair
                    </button>
                </div>
            </div>
        </aside>
    );
}


export default Sidebar;