import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/settings.css";



const MODULE_COLUMNS = [
    {
        key: "can_view",
        label: "Ver"
    },
    {
        key: "can_edit",
        label: "Editar"
    },
    {
        key: "can_delete",
        label: "Excluir"
    },
    {
        key: "can_approve",
        label: "Aprovar"
    },
    {
        key: "can_export",
        label: "Exportar"
    },
    {
        key: "can_sync",
        label: "Sincronizar"
    }
];


const FUNCTION_COLUMNS = [
    {
        key: "can_view",
        label: "Ver"
    },
    {
        key: "can_edit",
        label: "Editar"
    },
    {
        key: "can_execute",
        label: "Executar"
    }
];


const ROLES = [
    {
        value: "creator",
        label: "Criador"
    },
    {
        value: "admin",
        label: "Administrador"
    },
    {
        value: "editor",
        label: "Editor"
    },
    {
        value: "viewer",
        label: "Visualizador"
    },
    {
        value: "pending",
        label: "Pendente"
    }
];



function buildInitialState() {
    return {
        target_type: "role",
        target_value: "creator",
        module_permissions: [],
        function_permissions: []
    };
}



export default function SettingsPermissionsPage() {
    const navigate =
        useNavigate();


    const [
        users,
        setUsers
    ] = useState([]);


    const [
        modules,
        setModules
    ] = useState([]);


    const [
        functions,
        setFunctions
    ] = useState([]);


    const [
        permissions,
        setPermissions
    ] = useState(
        buildInitialState()
    );


    const [
        selectedModule,
        setSelectedModule
    ] = useState("");


    const [
        isLoading,
        setIsLoading
    ] = useState(true);


    const [
        isSaving,
        setIsSaving
    ] = useState(false);


    const [
        message,
        setMessage
    ] = useState("");


    const [
        error,
        setError
    ] = useState("");


    const loadUsers =
        useCallback(
            async () => {
                const response =
                    await window.alfadime.users.list();


                if (
                    response?.success
                ) {
                    setUsers(
                        response.data ||
                        []
                    );
                }
            },
            []
        );


    const loadModules =
        useCallback(
            async () => {
                const response =
                    await window.alfadime.permissions.listModules();


                if (
                    response?.success
                ) {
                    setModules(
                        response.data ||
                        []
                    );
                }
            },
            []
        );


    const loadPermissions =
        useCallback(
            async (targetType, targetValue) => {
                if (
                    targetType ===
                    "user" &&
                    !targetValue
                ) {
                    setPermissions(
                        buildInitialState()
                    );


                    return;
                }


                setIsLoading(
                    true
                );


                setError("");


                const response =
                    targetType ===
                    "user"
                        ? await window.alfadime.permissions.getForUser(
                            targetValue
                        )
                        : await window.alfadime.permissions.getForRole(
                            targetValue
                        );


                if (
                    response?.success
                ) {
                    setPermissions({
                        target_type: targetType,
                        target_value: targetValue,
                        module_permissions:
                            response.data?.modules ||
                            [],
                        function_permissions:
                            response.data?.functions ||
                            []
                    });
                } else {
                    setError(
                        response?.error ||
                        "Não foi possível carregar as permissões."
                    );
                }


                setIsLoading(
                    false
                );
            },
            []
        );


    useEffect(
        () => {
            const initialize =
                async () => {
                    await Promise.all(
                        [
                            loadUsers(),
                            loadModules()
                        ]
                    );


                    await loadPermissions(
                        "role",
                        "creator"
                    );
                };


            initialize();
        },
        [
            loadUsers,
            loadModules,
            loadPermissions
        ]
    );


    const moduleFunctions =
        useMemo(
            () =>
                functions.filter(
                    (item) =>
                        item.module_key ===
                        selectedModule
                ),
            [
                functions,
                selectedModule
            ]
        );


    const handleTargetTypeChange =
        (value) => {
            const nextValue =
                value ===
                "role"
                    ? "creator"
                    : "";


            setPermissions(
                buildInitialState()
            );


            loadPermissions(
                value,
                nextValue
            );
        };


    const handleTargetValueChange =
        (value) => {
            setPermissions(
                buildInitialState()
            );


            loadPermissions(
                permissions.target_type,
                value
            );
        };


    const handleModuleSelect =
        async (moduleKey) => {
            setSelectedModule(
                moduleKey
            );


            if (
                !moduleKey
            ) {
                return;
            }


            const response =
                await window.alfadime.permissions.listFunctions(
                    moduleKey
                );


            if (
                response?.success
            ) {
                setFunctions(
                    response.data ||
                    []
                );
            }
        };


    const updateModulePermission =
        (moduleKey, action, value) => {
            setPermissions(
                (current) => ({
                    ...current,
                    module_permissions:
                        current.module_permissions.map(
                            (item) =>
                                item.module_key ===
                                moduleKey
                                    ? {
                                        ...item,
                                        [action]:
                                            value
                                    }
                                    : item
                        )
                })
            );
        };


    const updateFunctionPermission =
        (moduleKey, functionKey, action, value) => {
            setPermissions(
                (current) => ({
                    ...current,
                    function_permissions:
                        current.function_permissions.map(
                            (item) =>
                                item.module_key ===
                                moduleKey &&
                                item.function_key ===
                                functionKey
                                    ? {
                                        ...item,
                                        [action]:
                                            value
                                    }
                                    : item
                        )
                })
            );
        };


    const handleSave =
        async () => {
            setIsSaving(
                true
            );


            setMessage("");


            setError("");


            const response =
                await window.alfadime.permissions.save(
                    permissions
                );


            if (
                response?.success
            ) {
                setMessage(
                    "Permissões salvas com sucesso."
                );


                await loadPermissions(
                    permissions.target_type,
                    permissions.target_value
                );
            } else {
                setError(
                    response?.error ||
                    "Não foi possível salvar as permissões."
                );
            }


            setIsSaving(
                false
            );
        };


    const handleClearOverrides =
        async () => {
            if (
                permissions.target_type !==
                "user"
            ) {
                return;
            }


            setIsSaving(
                true
            );


            const response =
                await window.alfadime.permissions.clearUserOverrides(
                    permissions.target_value
                );


            if (
                response?.success
            ) {
                setMessage(
                    "Overrides removidos. O usuário voltou a seguir as permissões do perfil."
                );


                await loadPermissions(
                    "user",
                    permissions.target_value
                );
            } else {
                setError(
                    response?.error ||
                    "Não foi possível remover os overrides."
                );
            }


            setIsSaving(
                false
            );
        };


    return (
        <section className="settings-general-page">
            <header className="settings-general-header">
                <div>
                    <span className="settings-general-eyebrow">
                        Controle de acesso
                    </span>


                    <h1>
                        Permissões granulares
                    </h1>


                    <p>
                        Configure o acesso por perfil, usuário, módulo, coluna e ação.
                    </p>
                </div>
            </header>


            {error && (
                <div className="settings-db-message settings-db-message-error">
                    {error}
                </div>
            )}


            {message && (
                <div className="settings-db-message settings-db-message-success">
                    {message}
                </div>
            )}


            <div className="settings-general-card">
                <h2>
                    Destino das permissões
                </h2>


                <div className="settings-permissions-filters">
                    <div className="settings-general-field">
                        <label>
                            Configurar por
                        </label>


                        <select
                            value={
                                permissions.target_type
                            }
                            onChange={(
                                event
                            ) =>
                                handleTargetTypeChange(
                                    event.target.value
                                )
                            }
                        >
                            <option value="role">
                                Perfil
                            </option>


                            <option value="user">
                                Usuário
                            </option>
                        </select>
                    </div>


                    {permissions.target_type ===
                        "role" ? (
                        <div className="settings-general-field">
                            <label>
                                Perfil
                            </label>


                            <select
                                value={
                                    permissions.target_value
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleTargetValueChange(
                                        event.target.value
                                    )
                                }
                            >
                                {ROLES.map(
                                    (
                                        role
                                    ) => (
                                        <option
                                            key={
                                                role.value
                                            }
                                            value={
                                                role.value
                                            }
                                        >
                                            {
                                                role.label
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    ) : (
                        <div className="settings-general-field">
                            <label>
                                Usuário
                            </label>


                            <select
                                value={
                                    permissions.target_value
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleTargetValueChange(
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">
                                    Selecione
                                </option>


                                {users.map(
                                    (
                                        user
                                    ) => (
                                        <option
                                            key={
                                                user.id
                                            }
                                            value={
                                                user.id
                                            }
                                        >
                                            {
                                                user.display_name ||
                                                user.username
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    )}


                    <div className="settings-permissions-actions">
                        <button
                            type="button"
                            className="settings-db-button settings-db-button-primary"
                            disabled={
                                isSaving ||
                                isLoading
                            }
                            onClick={
                                handleSave
                            }
                        >
                            {isSaving
                                ? "Salvando..."
                                : "Salvar permissões"}
                        </button>


                        {permissions.target_type ===
                            "user" && (
                            <button
                                type="button"
                                className="settings-db-button"
                                disabled={
                                    isSaving ||
                                    isLoading
                                }
                                onClick={
                                    handleClearOverrides
                                }
                            >
                                Remover overrides
                            </button>
                        )}


                        <button
                            type="button"
                            className="settings-db-button"
                            onClick={() =>
                                navigate(
                                    "/settings"
                                )
                            }
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            </div>


            <div className="settings-general-card">
                <h2>
                    Permissões por módulo
                </h2>


                {isLoading ? (
                    <p>
                        Carregando permissões...
                    </p>
                ) : (
                    <div className="settings-permissions-table-wrapper">
                        <table className="settings-permissions-table">
                            <thead>
                                <tr>
                                    <th>
                                        Módulo
                                    </th>


                                    {MODULE_COLUMNS.map(
                                        (
                                            column
                                        ) => (
                                            <th
                                                key={
                                                    column.key
                                                }
                                            >
                                                {
                                                    column.label
                                                }
                                            </th>
                                        )
                                    )}
                                </tr>
                            </thead>


                            <tbody>
                                {permissions.module_permissions.map(
                                    (
                                        permission
                                    ) => (
                                        <tr
                                            key={
                                                permission.module_key
                                            }
                                        >
                                            <td>
                                                {
                                                    permission.module_label
                                                }
                                            </td>


                                            {MODULE_COLUMNS.map(
                                                (
                                                    column
                                                ) => (
                                                    <td
                                                        key={
                                                            column.key
                                                        }
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                Boolean(
                                                                    permission[
                                                                        column
                                                                            .key
                                                                    ]
                                                                )
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                updateModulePermission(
                                                                    permission.module_key,
                                                                    column.key,
                                                                    event
                                                                        .target
                                                                        .checked
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                )
                                            )}
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>


            <div className="settings-general-card">
                <h2>
                    Colunas e ações
                </h2>


                <div className="settings-permissions-filters">
                    <div className="settings-general-field">
                        <label>
                            Módulo
                        </label>


                        <select
                            value={
                                selectedModule
                            }
                            onChange={(
                                event
                            ) =>
                                handleModuleSelect(
                                    event.target.value
                                )
                            }
                        >
                            <option value="">
                                Selecione
                            </option>


                            {modules.map(
                                (
                                    module
                                ) => (
                                    <option
                                        key={
                                            module.module_key
                                        }
                                        value={
                                            module.module_key
                                        }
                                    >
                                        {
                                            module.module_label
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    </div>
                </div>


                {selectedModule &&
                    moduleFunctions.length >
                        0 && (
                        <div className="settings-permissions-table-wrapper">
                            <table className="settings-permissions-table">
                                <thead>
                                    <tr>
                                        <th>
                                            Item
                                        </th>


                                        {FUNCTION_COLUMNS.map(
                                            (
                                                column
                                            ) => (
                                                <th
                                                    key={
                                                        column.key
                                                    }
                                                >
                                                    {
                                                        column.label
                                                    }
                                                </th>
                                            )
                                        )}
                                    </tr>
                                </thead>


                                <tbody>
                                    {moduleFunctions.map(
                                        (
                                            permissionFunction
                                        ) => {
                                            const permission =
                                                permissions.function_permissions.find(
                                                    (item) =>
                                                        item.module_key ===
                                                        permissionFunction.module_key &&
                                                        item.function_key ===
                                                        permissionFunction.function_key
                                                );


                                            return (
                                                <tr
                                                    key={
                                                        permissionFunction.function_key
                                                    }
                                                >
                                                    <td>
                                                        {
                                                            permissionFunction.function_label
                                                        }
                                                    </td>


                                                    {FUNCTION_COLUMNS.map(
                                                        (
                                                            column
                                                        ) => (
                                                            <td
                                                                key={
                                                                    column.key
                                                                }
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        Boolean(
                                                                            permission?.[
                                                                                column.key
                                                                            ]
                                                                        )
                                                                    }
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        updateFunctionPermission(
                                                                            permissionFunction.module_key,
                                                                            permissionFunction.function_key,
                                                                            column.key,
                                                                            event
                                                                                .target
                                                                                .checked
                                                                        )
                                                                    }
                                                                />
                                                            </td>
                                                        )
                                                    )}
                                                </tr>
                                            );
                                        }
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}


                {selectedModule &&
                    moduleFunctions.length ===
                        0 && (
                        <p>
                            Nenhuma coluna ou ação configurada para este módulo.
                        </p>
                    )}
            </div>
        </section>
    );
}