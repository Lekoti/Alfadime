import { useNavigate } from "react-router-dom";


import {
    DollarSign,
    Package,
    ShoppingCart,
    FileEdit,
    History,
    Mail,
    Factory,
    Settings
} from "lucide-react";


import wallpaper from "../../../../../resources/Alfadime.png";


import "../styles/home.css";




const MODULES = [
    {
        path: "/price-pending",
        icon: DollarSign,
        title: "Preços e Pendências",
        description: "Controle de recebimento de preços e pendências por filial."
    },
    {
        path: "/products",
        icon: Package,
        title: "Produtos",
        description: "Cadastro e gerenciamento de produtos do Sirius."
    },
    {
        path: "/purchases",
        icon: ShoppingCart,
        title: "Compras",
        description: "Gestão de compras e curva ABC."
    },
    {
        path: "/industry-contacts",
        icon: Factory,
        title: "Contatos de Indústrias",
        description: "Cadastro e consulta dos contatos dos laboratórios."
    },
    {
        path: "/product-corrections",
        icon: FileEdit,
        title: "Correções",
        description: "Solicitar e acompanhar correções de cadastro."
    },
    {
        path: "/product-audit",
        icon: History,
        title: "Auditoria",
        description: "Histórico de alterações nos produtos."
    },
    {
        path: "/email",
        icon: Mail,
        title: "E-mail",
        description: "Disparo e recebimento de e-mails automáticos."
    },
    {
        path: "/settings",
        icon: Settings,
        title: "Configurações",
        description: "Preferências e configurações do aplicativo."
    }
];




function HomePage() {
    const navigate = useNavigate();




    return (
        <div
            className="home-page"
            style={{
                "--home-wallpaper": `url("${wallpaper}")`
            }}
        >
            <div className="home-grid">
                {MODULES.map((module) => {
                    const Icon =
                        module.icon;


                    return (
                        <button
                            key={module.path}
                            type="button"
                            className="home-card"
                            onClick={() =>
                                navigate(module.path)
                            }
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
                })}
            </div>
        </div>
    );
}




export default HomePage;