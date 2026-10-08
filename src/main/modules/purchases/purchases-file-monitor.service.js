const fs = require("node:fs");

const {
    PURCHASES_CURVE_EXCEL_PATH,
    PURCHASES_CURVE_EXCEL_POLLING_INTERVAL,
    PURCHASES_CURVE_EXCEL_STABILITY_CHECK_DELAY
} = require("./purchases.config");

class PurchasesCurveFileMonitor {
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

    getSignature() {
        if (!fs.existsSync(PURCHASES_CURVE_EXCEL_PATH)) {
            return null;
        }

        const stats = fs.statSync(
            PURCHASES_CURVE_EXCEL_PATH
        );

        return [
            stats.size,
            stats.mtimeMs
        ].join("-");
    }

    async isStable() {
        const first = this.getSignature();

        if (!first) {
            return false;
        }

        await new Promise((resolve) => {
            setTimeout(
                resolve,
                PURCHASES_CURVE_EXCEL_STABILITY_CHECK_DELAY
            );
        });

        return first === this.getSignature();
    }

    async scan() {
        if (this.running) {
            return;
        }

        this.running = true;

        try {
            const signature = this.getSignature();

            if (!signature) {
                this.onError(
                    new Error(
                        "Arquivo Curva Compras não encontrado: " +
                        PURCHASES_CURVE_EXCEL_PATH
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

            if (!(await this.isStable())) {
                return;
            }

            const result = await this.onChanged({
                filePath: PURCHASES_CURVE_EXCEL_PATH
            });

            this.lastSignature = this.getSignature();

            return result;
        } catch (error) {
            this.onError(error);
        } finally {
            this.running = false;
        }
    }

    start() {
        if (this.timer) {
            return;
        }

        this.scan();

        this.timer = setInterval(
            () => this.scan(),
            PURCHASES_CURVE_EXCEL_POLLING_INTERVAL
        );
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}

module.exports = {
    PurchasesCurveFileMonitor
};