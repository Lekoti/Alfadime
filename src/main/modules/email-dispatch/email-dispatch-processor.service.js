/**
 * Processador em segundo plano do módulo de e-mail.
 * Responsável por verificar respostas periodicamente.
 */

const service = require("./email-dispatch.service");
const {
    DEFAULT_IMAP_POLL_INTERVAL_MS
} = require("./email-dispatch.constants");

class EmailDispatchProcessor {
    constructor({
        onProcess = () => {},
        onError = () => {}
    } = {}) {
        this.onProcess = onProcess;
        this.onError = onError;
        this.timer = null;
        this.running = false;
        this.started = false;
        this.stopping = false;
    }

    async start() {
        if (this.started) {
            return;
        }

        this.started = true;
        this.stopping = false;

        console.log("Processador de e-mails iniciado.");

        await this.scan();

        if (this.stopping) {
            return;
        }

        this.timer = setInterval(() => {
            this.scan().catch((error) => {
                console.error(
                    "Erro inesperado no ciclo do processador de e-mails:",
                    error.message
                );
            });
        }, DEFAULT_IMAP_POLL_INTERVAL_MS);
    }

    stop() {
        this.stopping = true;
        this.started = false;

        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        console.log("Processador de e-mails encerrado.");
    }

    async scan() {
        if (this.running || this.stopping || !this.started) {
            return;
        }

        this.running = true;

        try {
            const campaigns = service.listCampaigns();

            for (const campaign of campaigns) {
                if (this.stopping) {
                    break;
                }

                try {
                    const result = await service.processIncoming(
                        campaign.id
                    );

                    if (!this.stopping) {
                        this.onProcess(result);
                    }
                } catch (error) {
                    console.error(
                        "Erro ao processar campanha " +
                            campaign.id +
                            ":",
                        error.message
                    );

                    if (!this.stopping) {
                        this.onError(error, campaign);
                    }
                }
            }
        } catch (error) {
            console.error(
                "Erro ao listar campanhas para processamento:",
                error.message
            );

            if (!this.stopping) {
                this.onError(error, null);
            }
        } finally {
            this.running = false;
        }
    }
}

module.exports = {
    EmailDispatchProcessor
};
