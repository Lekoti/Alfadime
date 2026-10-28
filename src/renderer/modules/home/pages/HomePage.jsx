import { useNavigate } from "react-router-dom";

import {
    Home,
    Package,
    ClipboardCheck,
    FilePen,
    ListChecks,
    ShoppingCart,
    Phone,
    Bell,
    Mail,
    Settings
} from "lucide-react";

import usePermissions from "../../auth/hooks/usePermissions";

import "../styles/home.css";

const MODULES = [
    {
        path: "/",
        moduleKey: "home",
        icon: Home,
        title: "Início",
        description: "Acesso rápido aos módulos do Alfadime.",
        exact: true
    },
    {
        path: "/products",
        moduleKey: "products",
        icon: Package,
        title: "Produtos",
        description: "Cadastro e gerenciamento de produtos do Sirius."
    },
    {
        path: "/product-audit",
        moduleKey: "product-audit",
        icon: ClipboardCheck,
        title: "Auditoria de Produtos",
        description: "Histórico de alterações nos produtos."
    },
    {
        path: "/product-corrections",
        moduleKey: "product-corrections",
        icon: FilePen,
        title: "Correções de Produtos",
        description: "Solicitar e acompanhar correções de cadastro."
    },
    {
        path: "/price-pending",
        moduleKey: "price-pending",
        icon: ListChecks,
        title: "Preços e Pendências",
        description: "Controle de recebimento de preços e pendências por filial."
    },
    {
        path: "/purchases",
        moduleKey: "purchases",
        icon: ShoppingCart,
        title: "Compras",
        description: "Gestão de compras e curva ABC."
    },
    {
        path: "/merchandise-purchases",
        moduleKey: "purchases",
        icon: ShoppingCart,
        title: "Compras de Mercadorias",
        description: "Simulação de compras por empresa e laboratório, com filtros, gráficos e exportação Excel."
    },
    {
        path: "/industry-contacts",
        moduleKey: "industry-contacts",
        icon: Phone,
        title: "Contatos",
        description: "Cadastro e consulta dos contatos dos laboratórios."
    },
    {
        path: "/notifications",
        moduleKey: "notifications",
        icon: Bell,
        title: "Notificações",
        description: "Acompanhe alertas e comunicados do sistema."
    },
    {
        path: "/email",
        moduleKey: "email",
        icon: Mail,
        title: "E-mail",
        description: "Disparo e recebimento de e-mails automáticos."
    },
    {
        path: "/settings",
        moduleKey: "settings",
        icon: Settings,
        title: "Configurações",
        description: "Preferências e configurações do aplicativo."
    }
];

function HomePage() {
    const navigate = useNavigate();

    const {
        isLoading,
        canAccessModule
    } = usePermissions();

    const visibleModules = MODULES.filter(
        (module) => canAccessModule(module.moduleKey)
    );

    return (
        <div className="home-page">
            <div className="home-grid">
                {isLoading ? (
                    <p>Carregando módulos...</p>
                ) : (
                    visibleModules.map((module) => {
                        const Icon = module.icon;

                        return (
                            <button
                                key={module.path}
                                type="button"
                                className="home-card"
                                onClick={() => navigate(module.path)}
                            >
                                <span className="home-card-icon">
                                    <Icon
                                        size={22}
                                        strokeWidth={1.8}
                                    />
                                </span>

                                <span className="home-card-title">
                                    {module.title}
                                </span>

                                <span className="home-card-description">
                                    {module.description}
                                </span>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default HomePage;
