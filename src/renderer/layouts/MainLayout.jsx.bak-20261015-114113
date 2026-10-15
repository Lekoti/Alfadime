import {
    Outlet
} from "react-router-dom";

import Sidebar from "./Sidebar";
import AppUpdater from
    "../components/app-updater/AppUpdater";

import "./MainLayout.css";


function MainLayout() {
    return (
        <div className="alfadime-shell">
            <Sidebar />

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