const fs = require("node:fs");

const {
    PRODUCTS_EXCEL_PATH,
    PRODUCTS_EXCEL_POLLING_INTERVAL,
    PRODUCTS_EXCEL_STABILITY_CHECK_DELAY
} = require("./products.config");

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

    async scan() {
        if (this.running) {
            return;
        }

        this.running = true;

        try {
            const signature =
                this.getFileSignature();

            if (!signature) {
                this.onError(
                    new Error(
                        "Arquivo Excel nao encontrado: " +
                        PRODUCTS_EXCEL_PATH
                    )
                );

                return;
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

            const result = await this.onChanged({
                filePath: PRODUCTS_EXCEL_PATH,
                signature: stableSignature
            });

            this.lastSignature = stableSignature;

            return result;
        } catch (error) {
            console.error(
                "Erro no monitor do Excel de produtos:",
                error
            );

            this.onError(error);
        } finally {
            this.running = false;
        }
    }
}

module.exports = {
    ProductsFileMonitor
};
