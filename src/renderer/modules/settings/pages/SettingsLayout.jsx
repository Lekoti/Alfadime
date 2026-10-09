import {
    NavLink,
    Outlet
} from "react-router-dom";


import useAuth from
    "../../auth/hooks/useAuth";


import "../styles/settings.css";



function SettingsLayout() {
    const {
        isCreator,
        isAdmin
    } = useAuth();


    const canManageUsers =
        isCreator || isAdmin;



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


                {
                    canManageUsers && (
                        <NavLink
                            to="/settings/users"
                            className={({ isActive }) =>
                                isActive
                                    ? "settings-tab active"
                                    : "settings-tab"
                            }
                        >
                            Usuários e permissões
                        </NavLink>
                    )
                }


                {
                    canManageUsers && (
                        <NavLink
                            to="/settings/permissions"
                            className={({ isActive }) =>
                                isActive
                                    ? "settings-tab active"
                                    : "settings-tab"
                            }
                        >
                            Permissões granulares
                        </NavLink>
                    )
                }
            </nav>


            <Outlet />
        </div>
    );
}



export default SettingsLayout;