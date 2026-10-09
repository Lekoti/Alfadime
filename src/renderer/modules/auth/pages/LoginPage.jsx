import React, {
    useState
} from "react";


import {
    useAuth
} from "../hooks/useAuth";


import wallpaper from "../../../../../resources/Alfadime.png";


import "./LoginPage.css";




export default function LoginPage() {
    const [
        mode,
        setMode
    ] = useState("login");


    const [
        username,
        setUsername
    ] = useState("");


    const [
        displayName,
        setDisplayName
    ] = useState("");


    const [
        password,
        setPassword
    ] = useState("");


    const [
        confirmPassword,
        setConfirmPassword
    ] = useState("");


    const [
        isPersistent,
        setIsPersistent
    ] = useState(false);


    const [
        submitting,
        setSubmitting
    ] = useState(false);


    const [
        error,
        setError
    ] = useState("");


    const {
        login,
        register
    } = useAuth();




    const resetForm = () => {
        setUsername("");
        setDisplayName("");
        setPassword("");
        setConfirmPassword("");
        setError("");
    };



    const handleLogin =
        async (event) => {
            event.preventDefault();



            if (submitting) {
                return;
            }



            setError("");



            const normalizedUsername =
                username.trim();



            if (!normalizedUsername) {
                setError(
                    "Digite seu usuário."
                );



                return;
            }



            if (!password) {
                setError(
                    "Digite sua senha."
                );



                return;
            }



            setSubmitting(true);



            try {
                const result =
                    await login(
                        normalizedUsername,
                        password,
                        isPersistent
                    );



                if (
                    result?.success
                ) {
                    return;
                }



                setError(
                    result?.error ||
                    "Não foi possível realizar o login."
                );
            } catch (loginError) {
                console.error(
                    "[LOGIN] Erro:",
                    loginError
                );



                setError(
                    loginError?.message ||
                    "Não foi possível realizar o login."
                );
            } finally {
                setSubmitting(false);
            }
        };



    const handleRegister =
        async (event) => {
            event.preventDefault();



            if (submitting) {
                return;
            }



            setError("");



            const normalizedUsername =
                username.trim();



            const normalizedDisplayName =
                displayName.trim();



            if (!normalizedUsername) {
                setError(
                    "Digite um nome de usuário."
                );



                return;
            }



            if (!normalizedDisplayName) {
                setError(
                    "Digite seu nome de exibição."
                );



                return;
            }



            if (password.length < 6) {
                setError(
                    "A senha deve ter pelo menos 6 caracteres."
                );



                return;
            }



            if (
                password !==
                confirmPassword
            ) {
                setError(
                    "As senhas não coincidem."
                );



                return;
            }



            setSubmitting(true);



            try {
                const result =
                    await register({
                        username: normalizedUsername,
                        displayName: normalizedDisplayName,
                        password
                    });



                if (
                    result?.success
                ) {
                    setMode("login");
                    setPassword("");
                    setConfirmPassword("");
                    setError("");
                    return;
                }



                setError(
                    result?.error ||
                    "Não foi possível criar a conta."
                );
            } catch (registerError) {
                console.error(
                    "[REGISTER] Erro:",
                    registerError
                );



                setError(
                    registerError?.message ||
                    "Não foi possível criar a conta."
                );
            } finally {
                setSubmitting(false);
            }
        };




    return (
        <div
            className="login-page"
            style={{
                "--login-wallpaper": `url("${wallpaper}")`
            }}
        >
            <div className="login-container">
                <div className="login-header">
                    <h1>Alfadime</h1>
                </div>



                <div className="login-tabs">
                    <button
                        type="button"
                        className={
                            mode === "login"
                                ? "login-tab active"
                                : "login-tab"
                        }
                        onClick={() => {
                            setMode("login");
                            resetForm();
                        }}
                    >
                        Entrar
                    </button>



                    <button
                        type="button"
                        className={
                            mode === "register"
                                ? "login-tab active"
                                : "login-tab"
                        }
                        onClick={() => {
                            setMode("register");
                            resetForm();
                        }}
                    >
                        Criar conta
                    </button>
                </div>



                {
                    mode === "login" ? (
                        <form
                            className="login-form"
                            onSubmit={handleLogin}
                        >
                            <div className="form-group">
                                <label htmlFor="username">
                                    Usuário
                                </label>



                                <input
                                    type="text"
                                    id="username"
                                    value={username}
                                    onChange={(event) => {
                                        setUsername(
                                            event.target.value
                                        );



                                        if (error) {
                                            setError("");
                                        }
                                    }}
                                    placeholder="Digite seu usuário"
                                    disabled={submitting}
                                    autoFocus
                                    autoComplete="username"
                                />
                            </div>



                            <div className="form-group">
                                <label htmlFor="password">
                                    Senha
                                </label>



                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(event) => {
                                        setPassword(
                                            event.target.value
                                        );



                                        if (error) {
                                            setError("");
                                        }
                                    }}
                                    placeholder="Digite sua senha"
                                    disabled={submitting}
                                    autoComplete="current-password"
                                />
                            </div>



                            <div className="form-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={isPersistent}
                                        onChange={(event) => {
                                            setIsPersistent(
                                                event.target.checked
                                            );
                                        }}
                                        disabled={submitting}
                                    />



                                    <span>
                                        Lembrar neste computador
                                    </span>
                                </label>
                            </div>



                            {
                                error && (
                                    <div
                                        className="error-message"
                                        role="alert"
                                    >
                                        {error}
                                    </div>
                                )
                            }



                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={submitting}
                            >
                                {
                                    submitting
                                        ? "Entrando..."
                                        : "Entrar"
                                }
                            </button>
                        </form>
                    ) : (
                        <form
                            className="login-form"
                            onSubmit={handleRegister}
                        >
                            <div className="form-group">
                                <label htmlFor="register-username">
                                    Usuário
                                </label>



                                <input
                                    type="text"
                                    id="register-username"
                                    value={username}
                                    onChange={(event) => {
                                        setUsername(
                                            event.target.value
                                        );



                                        if (error) {
                                            setError("");
                                        }
                                    }}
                                    placeholder="Escolha um usuário"
                                    disabled={submitting}
                                    autoFocus
                                    autoComplete="username"
                                />
                            </div>



                            <div className="form-group">
                                <label htmlFor="display-name">
                                    Nome de exibição
                                </label>



                                <input
                                    type="text"
                                    id="display-name"
                                    value={displayName}
                                    onChange={(event) => {
                                        setDisplayName(
                                            event.target.value
                                        );



                                        if (error) {
                                            setError("");
                                        }
                                    }}
                                    placeholder="Digite seu nome"
                                    disabled={submitting}
                                />
                            </div>



                            <div className="form-group">
                                <label htmlFor="register-password">
                                    Senha
                                </label>



                                <input
                                    type="password"
                                    id="register-password"
                                    value={password}
                                    onChange={(event) => {
                                        setPassword(
                                            event.target.value
                                        );



                                        if (error) {
                                            setError("");
                                        }
                                    }}
                                    placeholder="Crie uma senha"
                                    disabled={submitting}
                                    autoComplete="new-password"
                                />
                            </div>



                            <div className="form-group">
                                <label htmlFor="confirm-password">
                                    Confirmar senha
                                </label>



                                <input
                                    type="password"
                                    id="confirm-password"
                                    value={confirmPassword}
                                    onChange={(event) => {
                                        setConfirmPassword(
                                            event.target.value
                                        );



                                        if (error) {
                                            setError("");
                                        }
                                    }}
                                    placeholder="Repita a senha"
                                    disabled={submitting}
                                    autoComplete="new-password"
                                />
                            </div>



                            {
                                error && (
                                    <div
                                        className="error-message"
                                        role="alert"
                                    >
                                        {error}
                                    </div>
                                )
                            }



                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={submitting}
                            >
                                {
                                    submitting
                                        ? "Criando..."
                                        : "Criar conta"
                                }
                            </button>
                        </form>
                    )
                }
            </div>
        </div>
    );
}