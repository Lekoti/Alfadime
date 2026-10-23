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
import SettingsUsersPage from "./modules/settings/pages/SettingsUsersPage.jsx";
import SettingsLayout from "./modules/settings/pages/SettingsLayout.jsx";
import LoginPage from "./modules/auth/pages/LoginPage.jsx";
import useAuth from "./modules/auth/hooks/useAuth.js";
import PermissionRoute from "./modules/auth/components/PermissionRoute.jsx";
import SettingsPermissionsPage from "./modules/settings/pages/SettingsPermissionsPage.jsx";
import AppUpdater from "./components/app-updater/AppUpdater.jsx";
import {
    AuthProvider
} from "./modules/auth/context/AuthContext.jsx";




function LoadingScreen() {
    return (
        <div className="alfadime-loading-screen">
            <span>
                Carregando Alfadime...
            </span>
        </div>
    );
}




function ApplicationRoutes() {
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
                    element={
                        <PermissionRoute moduleKey="products">
                            <ProductsPage />
                        </PermissionRoute>
                    }
                />



                <Route
                    path="product-audit"
                    element={
                        <PermissionRoute moduleKey="product-audit">
                            <ProductAuditPage />
                        </PermissionRoute>
                    }
                />



                <Route
                    path="product-corrections"
                    element={
                        <PermissionRoute moduleKey="product-corrections">
                            <ProductCorrectionsPage />
                        </PermissionRoute>
                    }
                />



                <Route
                    path="price-pending"
                    element={
                        <PermissionRoute moduleKey="price-pending">
                            <PricePendingPage />
                        </PermissionRoute>
                    }
                />



                <Route
                    path="purchases"
                    element={
                        <PermissionRoute moduleKey="purchases">
                            <PurchasesPage />
                        </PermissionRoute>
                    }
                />



                <Route
                    path="industry-contacts"
                    element={
                        <PermissionRoute moduleKey="industry-contacts">
                            <IndustryContactsPage />
                        </PermissionRoute>
                    }
                />



                <Route
                    path="notifications"
                    element={
                        <PermissionRoute moduleKey="notifications">
                            <NotificationsPage />
                        </PermissionRoute>
                    }
                />



                <Route
                    path="email"
                    element={
                        <PermissionRoute moduleKey="email">
                            <EmailCampaignsPage />
                        </PermissionRoute>
                    }
                />



                <Route
                    path="email/received"
                    element={
                        <PermissionRoute moduleKey="email">
                            <EmailReceivedPage />
                        </PermissionRoute>
                    }
                />



                <Route
                    path="settings"
                    element={
                        <PermissionRoute moduleKey="settings">
                            <SettingsLayout />
                        </PermissionRoute>
                    }
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



                    <Route
                        path="users"
                        element={<SettingsUsersPage />}
                    />



                    <Route
                        path="permissions"
                        element={<SettingsPermissionsPage />}
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
    );
}




function App() {
    return (
        <AuthProvider>
            <HashRouter>
                <div className="app-root">
                    <ApplicationRoutes />


                    <AppUpdater />
                </div>
            </HashRouter>
        </AuthProvider>
    );
}




export default App;