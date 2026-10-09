import { Navigate } from "react-router-dom";

import usePermissions from "../hooks/usePermissions";


export default function PermissionRoute({
    moduleKey,
    children
}) {
    const {
        isLoading,
        canAccessModule
    } = usePermissions();


    if (
        isLoading
    ) {
        return (
            <div className="page-loading">
                Carregando permissões...
            </div>
        );
    }


    if (
        !canAccessModule(
            moduleKey
        )
    ) {
        return (
            <Navigate
                to="/"
                replace
            />
        );
    }


    return children;
}