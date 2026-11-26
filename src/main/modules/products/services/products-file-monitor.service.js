const fs = require("node:fs");
const crypto = require("node:crypto");

const {
    PRODUCTS_EXCEL_PATH,
    PRODUCTS_EXCEL_POLLING_INTERVAL,
    PRODUCTS_EXCEL_STABILITY_CHECK_DELAY
} = require("../constants/products.config");

class ProductsFileMonitor {
    constructor({
        onChanged = () => {},
        onError = () => {}
    } = {}) {
        this.onChanged = onChanged;
        this.onError = onError;
        this.timer = null;
        this.running = false;
        this.lastSignature = null;
        this.lastContentHash = null;
        this.consecutiveErrors = 0;
        this.maxConsecutiveErrors = 5;
        this.currentBackoffMs = PRODUCTS_EXCEL_POLLING_INTERVAL;
    }

    start() {
        if (this.timer) {
            return;
        }

        this.scan();

        this.timer = setInterval(() => {
            this.scan();
        }, PRODUCTS_EXCEL_POLLING_INTERVAL);

        console.log(
            "Monitor do Excel de produtos iniciado:",
            PRODUCTS_EXCEL_PATH
        );
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        console.log(
            "Monitor do Excel de produtos encerrado."
        );
    }

    getFileSignature() {
        if (!fs.existsSync(PRODUCTS_EXCEL_PATH)) {
            return null;
        }

        const stats = fs.statSync(
            PRODUCTS_EXCEL_PATH
        );

        return [
            stats.size,
            stats.mtimeMs
        ].join("-");
    }

    getFileContentHash() {
        if (!fs.existsSync(PRODUCTS_EXCEL_PATH)) {
            return null;
        }

        const buffer = fs.readFileSync(
            PRODUCTS_EXCEL_PATH
        );

        return crypto
            .createHash("sha256")
            .update(buffer)
            .digest("hex");
    }

    async isFileStable() {
        const firstSignature =
            this.getFileSignature();

        if (!firstSignature) {
            return false;
        }

        await new Promise((resolve) => {
            setTimeout(
                resolve,
                PRODUCTS_EXCEL_STABILITY_CHECK_DELAY
            );
        });

        const secondSignature =
            this.getFileSignature();

        return Boolean(
            secondSignature &&
            firstSignature === secondSignature
        );
    }

    scheduleNextScan() {
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.timer = setTimeout(() => {
            this.scan();
        }, this.currentBackoffMs);
    }

    async scan() {
        if (this.running) {
            return;
        }

        this.running = true;

        try {
            const signature =
                this.getFileSignature();

            if (!signature) {
                throw new Error(
                    "Arquivo Excel nao encontrado: " +
                    PRODUCTS_EXCEL_PATH
                );
            }

            if (
                this.lastSignature &&
                this.lastSignature === signature
            ) {
                return;
            }

            const stable =
                await this.isFileStable();

            if (!stable) {
                return;
            }

            const stableSignature =
                this.getFileSignature();

            const contentHash =
                this.getFileContentHash();

            if (
                this.lastContentHash &&
                this.lastContentHash === contentHash
            ) {
                this.lastSignature = stableSignature;
                return;
            }

            const result = await this.onChanged({
                filePath: PRODUCTS_EXCEL_PATH,
                signature: stableSignature,
                contentHash
            });

            this.lastSignature = stableSignature;
            this.lastContentHash = contentHash;
            this.consecutiveErrors = 0;
            this.currentBackoffMs =
                PRODUCTS_EXCEL_POLLING_INTERVAL;

            return result;
        } catch (error) {
            console.error(
                "Erro no monitor do Excel de produtos:",
                error
            );

            this.consecutiveErrors++;

            if (
                this.consecutiveErrors >=
                this.maxConsecutiveErrors
            ) {
                this.currentBackoffMs =
                    PRODUCTS_EXCEL_POLLING_INTERVAL * 6;
            } else {
                this.currentBackoffMs =
                    PRODUCTS_EXCEL_POLLING_INTERVAL *
                    this.consecutiveErrors;
            }

            this.onError(error);
        } finally {
            this.running = false;
            this.scheduleNextScan();
        }
    }
}

module.exports = {
    ProductsFileMonitor
};