import React from "react";

import {
    HashRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import MainLayout from "./layouts/MainLayout.jsx";
import HomePage from "./modules/home/pages/HomePage.jsx";
import ProductsPage from "./modules/products/pages/ProductsPage.jsx";
import ProductAuditPage from "./modules/product-audit/pages/ProductAuditPage.jsx";
import ProductCorrectionsPage from "./modules/product-corrections/pages/ProductCorrectionsPage.jsx";
import PricePendingPage from "./modules/price-pending/pages/PricePendingPage.jsx";
import PurchasesPage from "./modules/purchases/pages/PurchasesPage.jsx";
import IndustryContactsPage from "./modules/industry-contacts/pages/IndustryContactsPage.jsx";
import NotificationsPage from "./modules/notifications/pages/NotificationsPage.jsx";
import EmailCampaignsPage from "./modules/email-dispatch/pages/EmailCampaignsPage.jsx";
import EmailReceivedPage from "./modules/email-dispatch/pages/EmailReceivedPage.jsx";
import EmailConfigsPage from "./modules/email-dispatch/pages/EmailConfigsPage.jsx";
import SettingsGeneralPage from "./modules/settings/pages/SettingsGeneralPage.jsx";
import SettingsPricePendingPage from "./modules/settings/pages/SettingsPricePendingPage.jsx";
import SettingsContactsPage from "./modules/settings/pages/SettingsContactsPage.jsx";
import SettingsLayout from "./modules/settings/pages/SettingsLayout.jsx";
import LoginPage from "./modules/auth/pages/LoginPage.jsx";
import useAuth from "./modules/auth/hooks/useAuth.js";

function LoadingScreen() {
    return (
        <div className="alfadime-loading-screen">
            <span>Carregando Alfadime...</span>
        </div>
    );
}

function AuthenticatedRoutes() {
    const {
        loading,
        isAuthenticated
    } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated) {
        return <LoginPage />;
    }

    return (
        <HashRouter>
            <Routes>
                <Route
                    path="/"
                    element={<MainLayout />}
                >
                    <Route
                        index
                        element={<HomePage />}
                    />

                    <Route
                        path="products"
                        element={<ProductsPage />}
                    />

                    <Route
                        path="product-audit"
                        element={<ProductAuditPage />}
                    />

                    <Route
                        path="product-corrections"
                        element={<ProductCorrectionsPage />}
                    />

                    <Route
                        path="price-pending"
                        element={<PricePendingPage />}
                    />

                    <Route
                        path="purchases"
                        element={<PurchasesPage />}
                    />

                    <Route
                        path="industry-contacts"
                        element={<IndustryContactsPage />}
                    />

                    <Route
                        path="notifications"
                        element={<NotificationsPage />}
                    />

                    <Route
                        path="email"
                        element={<EmailCampaignsPage />}
                    />

                    <Route
                        path="email/received"
                        element={<EmailReceivedPage />}
                    />

                    <Route
                        path="settings"
                        element={<SettingsLayout />}
                    >
                        <Route
                            index
                            element={<SettingsGeneralPage />}
                        />

                        <Route
                            path="email-configs"
                            element={<EmailConfigsPage />}
                        />

                        <Route
                            path="price-pending"
                            element={<SettingsPricePendingPage />}
                        />

                        <Route
                            path="contacts"
                            element={<SettingsContactsPage />}
                        />
                    </Route>

                    <Route
                        path="*"
                        element={
                            <Navigate
                                to="/"
                                replace
                            />
                        }
                    />
                </Route>
            </Routes>
        </HashRouter>
    );
}

function App() {
    return <AuthenticatedRoutes />;
}

export default App;