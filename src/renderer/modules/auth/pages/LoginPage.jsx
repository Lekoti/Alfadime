import React, {
    useState
} from "react";

import {
    useAuth
} from "../hooks/useAuth";

import "./LoginPage.css";


export default function LoginPage() {
    const [
        username,
        setUsername
    ] = useState("");

    const [
        isPersistent,
        setIsPersistent
    ] = useState(false);

    const [
        loggingIn,
        setLoggingIn
    ] = useState(false);

    const [
        error,
        setError
    ] = useState("");

    const {
        login
    } = useAuth();


    const handleSubmit =
        async (event) => {
            event.preventDefault();

            if (loggingIn) {
                return;
            }

            setError("");

            const normalizedUsername =
                username.trim();

            if (!normalizedUsername) {
                setError(
                    "Digite seu nome de usuário."
                );

                return;
            }

            setLoggingIn(true);

            try {
                const result =
                    await login(
                        normalizedUsername,
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
                setLoggingIn(false);
            }
        };


    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <h1>Alfadime</h1>

                    <p>
                        Sistema de Gestão Empresarial
                    </p>
                </div>

                <form
                    className="login-form"
                    onSubmit={handleSubmit}
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
                            disabled={loggingIn}
                            autoFocus
                            autoComplete="username"
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
                                disabled={loggingIn}
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
                        disabled={loggingIn}
                    >
                        {
                            loggingIn
                                ? "Entrando..."
                                : "Entrar"
                        }
                    </button>
                </form>
            </div>
        </div>
    );
}