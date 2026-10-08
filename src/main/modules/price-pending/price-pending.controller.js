const {
    listRows,
    createRow,
    updateCell,
    removeRow,
    getRowById,
    EDITABLE_COLUMNS,
    updateEmailReceiptStatus
} = require("./price-pending.repository");

const {
    exportToExcel,
    exportToExcelByLaboratory
} = require("./price-pending-export.service");

const path = require("node:path");

function listPricePendingRows(req, res) {
    try {
        const rows = listRows();

        return res.json({
            success: true,
            rows
        });
    } catch (error) {
        console.error(
            "[PricePending] Erro ao listar linhas:",
            error.message
        );

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

function getPricePendingRow(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "ID obrigatório."
            });
        }

        const row = getRowById(id);

        if (!row) {
            return res.status(404).json({
                success: false,
                error: "Registro não encontrado."
            });
        }

        return res.json({
            success: true,
            row
        });
    } catch (error) {
        console.error(
            "[PricePending] Erro ao buscar linha:",
            error.message
        );

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

function createPricePendingRow(req, res) {
    try {
        const data = req.body || {};

        const row = createRow(data);

        return res.status(201).json({
            success: true,
            row
        });
    } catch (error) {
        console.error(
            "[PricePending] Erro ao criar linha:",
            error.message
        );

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

function updatePricePendingCell(req, res) {
    try {
        const { id, column } = req.params;
        const { value } = req.body;

        if (!id || !column) {
            return res.status(400).json({
                success: false,
                error: "ID e coluna obrigatórios."
            });
        }

        if (!EDITABLE_COLUMNS.includes(column)) {
            return res.status(400).json({
                success: false,
                error: `Coluna não permitida: ${column}`
            });
        }

        const row = updateCell(id, column, value);

        return res.json({
            success: true,
            row
        });
    } catch (error) {
        console.error(
            "[PricePending] Erro ao atualizar célula:",
            error.message
        );

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

function deletePricePendingRow(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "ID obrigatório."
            });
        }

        const result = removeRow(id);

        return res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error(
            "[PricePending] Erro ao remover linha:",
            error.message
        );

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

function updatePricePendingEmailReceipt(req, res) {
    try {
        const {
            laboratory,
            branch,
            type,
            processedAt
        } = req.body;

        const result = updateEmailReceiptStatus({
            laboratory,
            branch,
            type,
            processedAt: processedAt ? new Date(processedAt) : new Date()
        });

        if (!result.success) {
            return res.status(404).json({
                success: false,
                ...result
            });
        }

        return res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error(
            "[PricePending] Erro ao atualizar recebimento:",
            error.message
        );

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

function exportPricePendingExcel(req, res) {
    try {
        const { laboratory } = req.query;
        const fileName = `precos-pendencias-${new Date().toISOString().slice(0, 10)}.xlsx`;
        const filePath = path.join(
            __dirname,
            "..",
            "..",
            "..",
            "exports",
            fileName
        );

        let result;

        if (laboratory) {
            result = exportToExcelByLaboratory({
                filePath,
                laboratory
            });
        } else {
            result = exportToExcel({
                filePath
            });
        }

        return res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error(
            "[PricePending] Erro ao exportar Excel:",
            error.message
        );

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

module.exports = {
    listPricePendingRows,
    getPricePendingRow,
    createPricePendingRow,
    updatePricePendingCell,
    deletePricePendingRow,
    updatePricePendingEmailReceipt,
    exportPricePendingExcel
};