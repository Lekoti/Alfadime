import {
    Outlet
} from "react-router-dom";

import Sidebar from "./Sidebar";
import AppUpdater from
    "../components/app-updater/AppUpdater";
import useAuth from
    "../modules/auth/hooks/useAuth.js";

import "./MainLayout.css";

function MainLayout() {
    const {
        user,
        logout
    } = useAuth();

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div className="alfadime-shell">
            <Sidebar />

            <main className="alfadime-content">
                <div className="alfadime-user-bar">
                    <div className="alfadime-user-info">
                        <span className="alfadime-user-label">
                            Usuário:
                        </span>

                        <span className="alfadime-user-name">
                            {user?.display_name || user?.username}
                        </span>
                    </div>

                    <button
                        type="button"
                        className="alfadime-logout-button"
                        onClick={handleLogout}
                    >
                        Sair
                    </button>
                </div>

                <AppUpdater />

                <div className="alfadime-main">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

export default MainLayout;