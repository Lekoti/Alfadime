import { useCallback, useEffect, useState } from "react";

import useAuth from "./useAuth";


function buildEmptyPermissions() {
    return {
        modules: [],
        functions: []
    };
}


export default function usePermissions() {
    const {
        user
    } = useAuth();

    const [
        permissions,
        setPermissions
    ] = useState(
        buildEmptyPermissions()
    );

    const [
        isLoading,
        setIsLoading
    ] = useState(true);

    const loadPermissions =
        useCallback(
            async () => {
                if (
                    !user?.id
                ) {
                    setPermissions(
                        buildEmptyPermissions()
                    );

                    setIsLoading(
                        false
                    );

                    return;
                }

                setIsLoading(
                    true
                );

                const response =
                    await window.alfadime.permissions.getForUser(
                        user.id
                    );

                if (
                    response?.success
                ) {
                    setPermissions({
                        modules:
                            response.data?.modules ||
                            [],
                        functions:
                            response.data?.functions ||
                            []
                    });
                } else {
                    setPermissions(
                        buildEmptyPermissions()
                    );
                }

                setIsLoading(
                    false
                );
            },
            [
                user?.id
            ]
        );

    useEffect(
        () => {
            loadPermissions();
        },
        [
            loadPermissions
        ]
    );

    const moduleMap =
        new Map(
            permissions.modules.map((item) => [
                item.module_key,
                item
            ])
        );

    const functionMap =
        new Map(
            permissions.functions.map((item) => [
                `${item.module_key}:${item.function_key}`,
                item
            ])
        );

    const canAccessModule =
        useCallback(
            (moduleKey) => {
                const permission =
                    moduleMap.get(
                        moduleKey
                    );

                return Boolean(
                    permission?.can_view
                );
            },
            [
                moduleMap
            ]
        );

    const can =
        useCallback(
            (moduleKey, action) => {
                const permission =
                    moduleMap.get(
                        moduleKey
                    );

                return Boolean(
                    permission?.[
                        action
                    ]
                );
            },
            [
                moduleMap
            ]
        );

    const canFunction =
        useCallback(
            (moduleKey, functionKey, action = "can_execute") => {
                const permission =
                    functionMap.get(
                        `${moduleKey}:${functionKey}`
                    );

                return Boolean(
                    permission?.[
                        action
                    ]
                );
            },
            [
                functionMap
            ]
        );

    const canViewFunction =
        useCallback(
            (moduleKey, functionKey) => {
                return canFunction(
                    moduleKey,
                    functionKey,
                    "can_view"
                );
            },
            [
                canFunction
            ]
        );

    const canEditFunction =
        useCallback(
            (moduleKey, functionKey) => {
                return canFunction(
                    moduleKey,
                    functionKey,
                    "can_edit"
                );
            },
            [
                canFunction
            ]
        );

    return {
        user,
        permissions,
        isLoading,
        canAccessModule,
        can,
        canFunction,
        canViewFunction,
        canEditFunction,
        reload: loadPermissions
    };
}