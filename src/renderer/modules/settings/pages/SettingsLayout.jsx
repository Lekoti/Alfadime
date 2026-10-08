import { NavLink, Outlet } from "react-router-dom";

import "../styles/settings.css";



function SettingsLayout() {
    return (
        <div className="settings-layout">
            <nav className="settings-tabs">
                <NavLink
                    to="/settings"
                    end
                    className={({ isActive }) =>
                        isActive
                            ? "settings-tab active"
                            : "settings-tab"
                    }
                >
                    Geral
                </NavLink>



                <NavLink
                    to="/settings/email-configs"
                    className={({ isActive }) =>
                        isActive
                            ? "settings-tab active"
                            : "settings-tab"
                    }
                >
                    E-mail - Configurações
                </NavLink>



                <NavLink
                    to="/settings/price-pending"
                    className={({ isActive }) =>
                        isActive
                            ? "settings-tab active"
                            : "settings-tab"
                    }
                >
                    Preços e Pendências
                </NavLink>



                <NavLink
                    to="/settings/contacts"
                    className={({ isActive }) =>
                        isActive
                            ? "settings-tab active"
                            : "settings-tab"
                    }
                >
                    Contatos
                </NavLink>
            </nav>



            <Outlet />
        </div>
    );
}



export default SettingsLayout;