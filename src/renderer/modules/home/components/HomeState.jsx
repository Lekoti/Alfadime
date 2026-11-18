function HomeState({ isLoading, isEmpty }) {
    if (isLoading) {
        return (
            <p className="home-state">
                Carregando módulos...
            </p>
        );
    }

    if (isEmpty) {
        return (
            <p className="home-state">
                Nenhum módulo disponível para o seu usuário.
            </p>
        );
    }

    return null;
}

export default HomeState;
