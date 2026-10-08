function AuditPagination({
    pagination,
    onPageChange
}) {
    const {
        page,
        pageSize,
        total,
        totalPages,
        offset
    } = pagination;

    const firstItem = total === 0
        ? 0
        : offset + 1;

    const lastItem = Math.min(
        offset + pageSize,
        total
    );

    return (
        <footer className="audit-pagination">
            <span>
                Exibindo {firstItem}-{lastItem} de {total} pendencias
            </span>

            <div>
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() =>
                        onPageChange(page - 1)
                    }
                >
                    Anterior
                </button>

                <strong>
                    Pagina {page} de {totalPages}
                </strong>

                <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() =>
                        onPageChange(page + 1)
                    }
                >
                    Proxima
                </button>
            </div>
        </footer>
    );
}

export default AuditPagination;
