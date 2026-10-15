import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import AppUpdater from "../components/app-updater/AppUpdater";

import "./MainLayout.css";

function MainLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    function toggleSidebar() {
        setSidebarCollapsed((current) => !current);
    }

    return (
        <div className={`alfadime-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={toggleSidebar}
            />

            <main className="alfadime-content">
                <AppUpdater />

                <div className="alfadime-main">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

export default MainLayout;
