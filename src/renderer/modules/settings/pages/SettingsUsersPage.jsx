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
    password: "",
    confirmPassword: "",
    role: USER_ROLES.VIEWER,
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



    const [
        isModalOpen,
        setIsModalOpen
    ] = useState(false);



    const [
        deletingUser,
        setDeletingUser
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




    function openCreateModal() {
        resetForm();
        setIsModalOpen(true);
    }




    function closeModal() {
        setIsModalOpen(false);
        resetForm();
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
            password: "",
            confirmPassword: "",
            role: user.role,
            is_active: user.is_active
        });



        setError("");
        setIsModalOpen(true);
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



        if (!editingUser) {
            if (form.password.length < 6) {
                setError(
                    "A senha deve ter pelo menos 6 caracteres."
                );



                return;
            }



            if (
                form.password !==
                form.confirmPassword
            ) {
                setError(
                    "As senhas não são iguais."
                );



                return;
            }
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
                        password: form.password,
                        confirmPassword: form.confirmPassword,
                        role: form.role,
                        is_active: Number(form.is_active)
                    });



            if (
                result?.success
            ) {
                closeModal();
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




    async function handleDelete(user) {
        setDeletingUser(user);
    }




    async function confirmDelete() {
        if (!deletingUser) {
            return;
        }



        setSaving(true);



        try {
            const result =
                await settingsUsersService.delete(
                    deletingUser.id
                );



            if (
                result?.success
            ) {
                setDeletingUser(null);
                await loadUsers();



                return;
            }



            setError(
                result?.error ||
                "Não foi possível excluir o usuário."
            );
        } catch (deleteError) {
            console.error(
                "[USERS] Erro ao excluir:",
                deleteError
            );



            setError(
                deleteError?.message ||
                "Não foi possível excluir o usuário."
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



                <button
                    type="button"
                    className="settings-users-primary-button"
                    onClick={openCreateModal}
                >
                    Novo usuário
                </button>
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



                                                        <button
                                                            type="button"
                                                            className="settings-users-danger-button"
                                                            onClick={() =>
                                                                handleDelete(user)
                                                            }
                                                            disabled={
                                                                user.id ===
                                                                    currentUser?.id ||
                                                                user.role ===
                                                                    USER_ROLES.CREATOR
                                                            }
                                                        >
                                                            Excluir
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



            {
                isModalOpen && (
                    <div className="settings-users-modal-overlay">
                        <div className="settings-users-modal">
                            <header className="settings-users-modal-header">
                                <h2>
                                    {
                                        editingUser
                                            ? "Editar usuário"
                                            : "Novo usuário"
                                    }
                                </h2>



                                <button
                                    type="button"
                                    className="settings-users-modal-close"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    ×
                                </button>
                            </header>



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



                                {
                                    !editingUser && (
                                        <>
                                            <div className="settings-users-field">
                                                <label htmlFor="user-password">
                                                    Senha
                                                </label>



                                                <input
                                                    id="user-password"
                                                    name="password"
                                                    type="password"
                                                    value={form.password}
                                                    onChange={handleFormChange}
                                                    disabled={saving}
                                                    placeholder="Mínimo de 6 caracteres"
                                                />
                                            </div>



                                            <div className="settings-users-field">
                                                <label htmlFor="user-confirm-password">
                                                    Confirmar senha
                                                </label>



                                                <input
                                                    id="user-confirm-password"
                                                    name="confirmPassword"
                                                    type="password"
                                                    value={form.confirmPassword}
                                                    onChange={handleFormChange}
                                                    disabled={saving}
                                                    placeholder="Repita a senha"
                                                />
                                            </div>
                                        </>
                                    )
                                }



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
                                                    Staff
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



                                    <button
                                        type="button"
                                        className="settings-users-secondary-button"
                                        onClick={closeModal}
                                        disabled={saving}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }



            {
                deletingUser && (
                    <div className="settings-users-modal-overlay">
                        <div className="settings-users-modal settings-users-confirm-modal">
                            <h2>
                                Excluir usuário
                            </h2>



                            <p>
                                Deseja realmente excluir o usuário <strong>{deletingUser.display_name}</strong>?
                            </p>



                            <div className="settings-users-form-actions">
                                <button
                                    type="button"
                                    className="settings-users-danger-button"
                                    onClick={confirmDelete}
                                    disabled={saving}
                                >
                                    {
                                        saving
                                            ? "Excluindo..."
                                            : "Excluir"
                                    }
                                </button>



                                <button
                                    type="button"
                                    className="settings-users-secondary-button"
                                    onClick={() =>
                                        setDeletingUser(null)
                                    }
                                    disabled={saving}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </main>
    );
}