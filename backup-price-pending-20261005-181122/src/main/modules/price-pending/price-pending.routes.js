const express = require("express");

const {
    listPricePendingRows,
    getPricePendingRow,
    createPricePendingRow,
    updatePricePendingCell,
    deletePricePendingRow,
    updatePricePendingEmailReceipt,
    exportPricePendingExcel
} = require("./price-pending.controller");

const router = express.Router();

router.get(
    "/price-pending/rows",
    listPricePendingRows
);

router.get(
    "/price-pending/rows/:id",
    getPricePendingRow
);

router.post(
    "/price-pending/rows",
    createPricePendingRow
);

router.patch(
    "/price-pending/rows/:id/cells/:column",
    updatePricePendingCell
);

router.delete(
    "/price-pending/rows/:id",
    deletePricePendingRow
);

router.post(
    "/price-pending/email-receipt",
    updatePricePendingEmailReceipt
);

router.get(
    "/price-pending/export",
    exportPricePendingExcel
);

module.exports = router;