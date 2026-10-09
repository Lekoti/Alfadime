import { useCallback, useEffect, useState } from "react";

import useAuth from "../../auth/hooks/useAuth";
import {
    ROLE_LABELS,
    USER_ROLES
} from "../../auth/constants/userRoles";
import settingsUsersService from "../services/settingsUsersService";

import "../styles/settings-users.css";


const EMPTY_FORM = {
    username: "",
    display_name: "",
    role: USER_ROLES.PENDING,
    is_active: 1
};


export default function SettingsUsersPage() {
    const {
        user: currentUser,
        isCreator,
        isAdmin
    } = useAuth();

    const [
        users,
        setUsers
    ] = useState([]);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        error,
        setError
    ] = useState("");

    const [
        saving,
        setSaving
    ] = useState(false);

    const [
        form,
        setForm
    ] = useState(EMPTY_FORM);

    const [
        editingUser,
        setEditingUser
    ] = useState(null);


    const canManageUsers =
        isCreator || isAdmin;


    const loadUsers =
        useCallback(
            async () => {
                try {
                    setLoading(true);
                    setError("");

                    const result =
                        await settingsUsersService.list();

                    if (
                        result?.success
                    ) {
                        setUsers(
                            result.data || []
                        );
                    } else {
                        setError(
                            result?.error ||
                            "Não foi possível carregar os usuários."
                        );
                    }
                } catch (loadError) {
                    console.error(
                        "[USERS] Erro ao carregar:",
                        loadError
                    );

                    setError(
                        loadError?.message ||
                        "Não foi possível carregar os usuários."
                    );
                } finally {
                    setLoading(false);
                }
            },
            []
        );


    useEffect(() => {
        if (canManageUsers) {
            loadUsers();
        }
    }, [
        canManageUsers,
        loadUsers
    ]);


    function resetForm() {
        setForm(EMPTY_FORM);
        setEditingUser(null);
        setError("");
    }


    function handleFormChange(event) {
        const {
            name,
            value
        } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));
    }


    function handleEdit(user) {
        setEditingUser(user);

        setForm({
            username: user.username,
            display_name: user.display_name,
            role: user.role,
            is_active: user.is_active
        });

        setError("");
    }


    async function handleSubmit(event) {
        event.preventDefault();

        if (!canManageUsers) {
            setError(
                "Você não tem permissão para gerenciar usuários."
            );

            return;
        }

        if (
            !form.username.trim() ||
            !form.display_name.trim()
        ) {
            setError(
                "Informe o usuário e o nome de exibição."
            );

            return;
        }

        setSaving(true);

        try {
            const result =
                editingUser
                    ? await settingsUsersService.update(
                        editingUser.id,
                        {
                            username: form.username.trim(),
                            display_name: form.display_name.trim(),
                            role: form.role,
                            is_active: Number(form.is_active)
                        }
                    )
                    : await settingsUsersService.create({
                        username: form.username.trim(),
                        display_name: form.display_name.trim(),
                        role: form.role,
                        is_active: Number(form.is_active)
                    });

            if (
                result?.success
            ) {
                resetForm();
                await loadUsers();

                return;
            }

            setError(
                result?.error ||
                "Não foi possível salvar o usuário."
            );
        } catch (saveError) {
            console.error(
                "[USERS] Erro ao salvar:",
                saveError
            );

            setError(
                saveError?.message ||
                "Não foi possível salvar o usuário."
            );
        } finally {
            setSaving(false);
        }
    }


    async function handleToggleActive(user) {
        if (
            user.id === currentUser?.id
        ) {
            setError(
                "Não é possível desativar o usuário conectado."
            );

            return;
        }

        try {
            const result =
                await settingsUsersService.setActive(
                    user.id,
                    user.is_active ? 0 : 1
                );

            if (
                result?.success
            ) {
                await loadUsers();

                return;
            }

            setError(
                result?.error ||
                "Não foi possível alterar o status."
            );
        } catch (toggleError) {
            console.error(
                "[USERS] Erro ao alterar status:",
                toggleError
            );

            setError(
                toggleError?.message ||
                "Não foi possível alterar o status."
            );
        }
    }


    if (!canManageUsers) {
        return (
            <main className="settings-users-page">
                <header className="settings-users-header">
                    <span className="settings-users-eyebrow">
                        Configurações
                    </span>

                    <h1>
                        Usuários e permissões
                    </h1>

                    <p>
                        Você não tem permissão para acessar esta área.
                    </p>
                </header>
            </main>
        );
    }


    return (
        <main className="settings-users-page">
            <header className="settings-users-header">
                <div>
                    <span className="settings-users-eyebrow">
                        Configurações
                    </span>

                    <h1>
                        Usuários e permissões
                    </h1>

                    <p>
                        Gerencie os usuários, perfis e status de acesso ao Alfadime.
                    </p>
                </div>
            </header>

            {
                error && (
                    <div
                        className="settings-users-error"
                        role="alert"
                    >
                        {error}
                    </div>
                )
            }

            <section className="settings-users-card">
                <h2>
                    {
                        editingUser
                            ? "Editar usuário"
                            : "Novo usuário"
                    }
                </h2>

                <form
                    className="settings-users-form"
                    onSubmit={handleSubmit}
                >
                    <div className="settings-users-field">
                        <label htmlFor="user-username">
                            Usuário
                        </label>

                        <input
                            id="user-username"
                            name="username"
                            value={form.username}
                            onChange={handleFormChange}
                            disabled={
                                saving ||
                                Boolean(editingUser)
                            }
                            placeholder="Ex.: joao.silva"
                        />
                    </div>

                    <div className="settings-users-field">
                        <label htmlFor="user-display-name">
                            Nome de exibição
                        </label>

                        <input
                            id="user-display-name"
                            name="display_name"
                            value={form.display_name}
                            onChange={handleFormChange}
                            disabled={saving}
                            placeholder="Ex.: João Silva"
                        />
                    </div>

                    <div className="settings-users-field">
                        <label htmlFor="user-role">
                            Perfil
                        </label>

                        <select
                            id="user-role"
                            name="role"
                            value={form.role}
                            onChange={handleFormChange}
                            disabled={
                                saving ||
                                !isCreator
                            }
                        >
                            {
                                isCreator && (
                                    <option value={USER_ROLES.CREATOR}>
                                        Criador
                                    </option>
                                )
                            }

                            <option value={USER_ROLES.ADMIN}>
                                Administrador
                            </option>

                            <option value={USER_ROLES.EDITOR}>
                                Editor
                            </option>

                            <option value={USER_ROLES.VIEWER}>
                                Visualizador
                            </option>

                            <option value={USER_ROLES.PENDING}>
                                Pendente
                            </option>
                        </select>
                    </div>

                    <div className="settings-users-field">
                        <label htmlFor="user-status">
                            Status
                        </label>

                        <select
                            id="user-status"
                            name="is_active"
                            value={form.is_active}
                            onChange={handleFormChange}
                            disabled={saving}
                        >
                            <option value={1}>
                                Ativo
                            </option>

                            <option value={0}>
                                Inativo
                            </option>
                        </select>
                    </div>

                    <div className="settings-users-form-actions">
                        <button
                            type="submit"
                            className="settings-users-primary-button"
                            disabled={saving}
                        >
                            {
                                saving
                                    ? "Salvando..."
                                    : editingUser
                                        ? "Salvar alterações"
                                        : "Criar usuário"
                            }
                        </button>

                        {
                            editingUser && (
                                <button
                                    type="button"
                                    className="settings-users-secondary-button"
                                    onClick={resetForm}
                                    disabled={saving}
                                >
                                    Cancelar
                                </button>
                            )
                        }
                    </div>
                </form>
            </section>

            <section className="settings-users-card">
                <h2>
                    Usuários cadastrados
                </h2>

                {
                    loading ? (
                        <p className="settings-users-empty">
                            Carregando usuários...
                        </p>
                    ) : users.length === 0 ? (
                        <p className="settings-users-empty">
                            Nenhum usuário encontrado.
                        </p>
                    ) : (
                        <div className="settings-users-table-wrapper">
                            <table className="settings-users-table">
                                <thead>
                                    <tr>
                                        <th>
                                            Nome
                                        </th>

                                        <th>
                                            Usuário
                                        </th>

                                        <th>
                                            Perfil
                                        </th>

                                        <th>
                                            Status
                                        </th>

                                        <th>
                                            Ações
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {
                                        users.map((user) => (
                                            <tr key={user.id}>
                                                <td>
                                                    {user.display_name}
                                                </td>

                                                <td>
                                                    {user.username}
                                                </td>

                                                <td>
                                                    {
                                                        ROLE_LABELS[
                                                            user.role
                                                        ] ||
                                                        user.role
                                                    }
                                                </td>

                                                <td>
                                                    <span
                                                        className={
                                                            user.is_active
                                                                ? "settings-users-status active"
                                                                : "settings-users-status inactive"
                                                        }
                                                    >
                                                        {
                                                            user.is_active
                                                                ? "Ativo"
                                                                : "Inativo"
                                                        }
                                                    </span>
                                                </td>

                                                <td>
                                                    <div className="settings-users-actions">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleEdit(user)
                                                            }
                                                        >
                                                            Editar
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleToggleActive(user)
                                                            }
                                                            disabled={
                                                                user.id ===
                                                                currentUser?.id
                                                            }
                                                        >
                                                            {
                                                                user.is_active
                                                                    ? "Desativar"
                                                                    : "Ativar"
                                                            }
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    )
                }
            </section>
        </main>
    );
}