import { useNavigate } from "react-router-dom";

import {
    Bell,
    Boxes,
    ClipboardCheck,
    FilePen,
    FileUp,
    ListChecks,
    Mail,
    Package,
    Phone,
    Settings,
    ShoppingCart
} from "lucide-react";

import usePermissions from "../../auth/hooks/usePermissions";
import MODULES from "../constants/homeModules";
import HomeCard from "../components/HomeCard";
import HomeState from "../components/HomeState";

import "../styles/home.css";

const MODULE_ICONS = {
    Bell,
    Boxes,
    ClipboardCheck,
    FilePen,
    FileUp,
    ListChecks,
    Mail,
    Package,
    Phone,
    Settings,
    ShoppingCart
};

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
                <HomeState
                    isLoading={isLoading}
                    isEmpty={!isLoading && visibleModules.length === 0}
                />

                {!isLoading &&
                    visibleModules.map((module) => (
                        <HomeCard
                            key={module.path}
                            module={{
                                ...module,
                                icon: MODULE_ICONS[module.icon]
                            }}
                            onOpen={navigate}
                        />
                    ))}
            </div>
        </div>
    );
}

export default HomePage;
