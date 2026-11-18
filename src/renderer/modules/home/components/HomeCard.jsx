function HomeCard({ module, onOpen }) {
    const Icon = module.icon;

    return (
        <button
            type="button"
            className="home-card"
            onClick={() => onOpen(module.path)}
        >
            <span className="home-card-icon">
                <Icon
                    size={22}
                    strokeWidth={1.8}
                />
            </span>

            <span className="home-card-title">
                {module.title}
            </span>

            <span className="home-card-description">
                {module.description}
            </span>
        </button>
    );
}

export default HomeCard;
