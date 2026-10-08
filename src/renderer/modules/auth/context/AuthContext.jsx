import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState
} from "react";

import authService from "../services/authService";
import {
    USER_ROLES
} from "../constants/userRoles";


const AuthContext =
    createContext(null);


export function AuthProvider({
    children
}) {
    const [
        session,
        setSession
    ] = useState(null);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        error,
        setError
    ] = useState(null);


    const loadSession =
        useCallback(
            async () => {
                try {
                    setLoading(true);
                    setError(null);

                    const result =
                        await authService
                            .getCurrentSession();

                    if (
                        result?.success &&
                        result?.data
                    ) {
                        setSession(
                            result.data
                        );
                    } else {
                        setSession(null);
                    }
                } catch (loadError) {
                    console.error(
                        "[AUTH] Erro ao carregar sessão:",
                        loadError
                    );

                    setSession(null);
                    setError(
                        loadError?.message ||
                        "Não foi possível carregar a sessão."
                    );
                } finally {
                    setLoading(false);
                }
            },
            []
        );


    const login =
        useCallback(
            async (
                username,
                isPersistent = false
            ) => {
                try {
                    setLoading(true);
                    setError(null);

                    const result =
                        await authService.login(
                            username,
                            isPersistent
                        );

                    if (
                        result?.success &&
                        result?.data
                    ) {
                        setSession(
                            result.data
                        );

                        return {
                            success: true,
                            data: result.data
                        };
                    }

                    setError(
                        result?.error ||
                        "Não foi possível realizar o login."
                    );

                    return {
                        success: false,
                        error:
                            result?.error ||
                            "Não foi possível realizar o login."
                    };
                } catch (loginError) {
                    console.error(
                        "[AUTH] Erro no login:",
                        loginError
                    );

                    const message =
                        loginError?.message ||
                        "Não foi possível realizar o login.";

                    setError(message);

                    return {
                        success: false,
                        error: message
                    };
                } finally {
                    setLoading(false);
                }
            },
            []
        );


    const logout =
        useCallback(
            async () => {
                try {
                    setLoading(true);
                    setError(null);

                    const result =
                        await authService.logout();

                    if (
                        result?.success
                    ) {
                        setSession(null);

                        return {
                            success: true
                        };
                    }

                    setError(
                        result?.error ||
                        "Não foi possível sair."
                    );

                    return {
                        success: false,
                        error:
                            result?.error ||
                            "Não foi possível sair."
                    };
                } catch (logoutError) {
                    const message =
                        logoutError?.message ||
                        "Não foi possível sair.";

                    setError(message);

                    return {
                        success: false,
                        error: message
                    };
                } finally {
                    setLoading(false);
                }
            },
            []
        );


    const hasPermission =
        useCallback(
            (
                moduleKey,
                action = "can_view"
            ) => {
                if (!session?.user) {
                    return false;
                }

                if (
                    session.user.role ===
                    USER_ROLES.CREATOR
                ) {
                    return true;
                }

                const permission =
                    session.permissions?.find(
                        (item) =>
                            item.module_key ===
                            moduleKey
                    );

                return Boolean(
                    permission?.[action]
                );
            },
            [
                session
            ]
        );


    const value =
        useMemo(
            () => ({
                session,
                user: session?.user || null,
                permissions:
                    session?.permissions || [],
                loading,
                error,
                isAuthenticated:
                    Boolean(session),
                isCreator:
                    session?.user?.role ===
                    USER_ROLES.CREATOR,
                isAdmin:
                    session?.user?.role ===
                    USER_ROLES.ADMIN,
                isEditor:
                    session?.user?.role ===
                    USER_ROLES.EDITOR,
                isViewer:
                    session?.user?.role ===
                    USER_ROLES.VIEWER,
                isPending:
                    session?.user?.role ===
                    USER_ROLES.PENDING,
                login,
                logout,
                refreshSession:
                    loadSession,
                hasPermission
            }),
            [
                session,
                loading,
                error,
                login,
                logout,
                loadSession,
                hasPermission
            ]
        );


    useEffect(
        () => {
            loadSession();
        },
        [
            loadSession
        ]
    );


    return (
        <AuthContext.Provider
            value={value}
        >
            {children}
        </AuthContext.Provider>
    );
}


export function useAuthContext() {
    const context =
        useContext(
            AuthContext
        );

    if (!context) {
        throw new Error(
            "useAuthContext deve ser usado dentro de AuthProvider."
        );
    }

    return context;
}