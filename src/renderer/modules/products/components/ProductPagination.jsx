function ProductPagination({
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

    function getPageNumbers() {
        const pages = [];
        const start = Math.max(
            1,
            page - 2
        );
        const end = Math.min(
            totalPages,
            page + 2
        );

        for (
            let currentPage = start;
            currentPage <= end;
            currentPage++
        ) {
            pages.push(currentPage);
        }

        return pages;
    }

    return (
        <footer className="products-pagination">
            <span className="products-pagination-info">
                Exibindo {firstItem}-{lastItem} de {total} produtos
            </span>

            <div className="products-pagination-actions">
                <button
                    type="button"
                    onClick={() =>
                        onPageChange(1)
                    }
                    disabled={page <= 1}
                >
                    Primeira
                </button>

                <button
                    type="button"
                    onClick={() =>
                        onPageChange(page - 1)
                    }
                    disabled={page <= 1}
                >
                    Anterior
                </button>

                {getPageNumbers().map(
                    (pageNumber) => (
                        <button
                            key={pageNumber}
                            type="button"
                            className={
                                pageNumber === page
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                onPageChange(
                                    pageNumber
                                )
                            }
                        >
                            {pageNumber}
                        </button>
                    )
                )}

                <button
                    type="button"
                    onClick={() =>
                        onPageChange(page + 1)
                    }
                    disabled={
                        page >= totalPages
                    }
                >
                    Proxima
                </button>

                <button
                    type="button"
                    onClick={() =>
                        onPageChange(totalPages)
                    }
                    disabled={
                        page >= totalPages
                    }
                >
                    Ultima
                </button>
            </div>
        </footer>
    );
}

export default ProductPagination;
