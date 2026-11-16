const assert = require("node:assert/strict");
const test = require("node:test");
const Database = require("better-sqlite3");

const {
    ensurePricePendingSchema
} = require("../src/main/modules/price-pending/price-pending.database");
const {
    createRepository
} = require("../src/main/modules/price-pending/price-pending-auto-charge.repository");
const {
    createService
} = require("../src/main/modules/price-pending/price-pending-auto-charge.service");


test("priority migration preserves legacy rows and defaults the new field", () => {
    const database = new Database(":memory:");
    database.exec(`
        CREATE TABLE price_pending_rows (
            id TEXT PRIMARY KEY,
            laboratory TEXT NOT NULL DEFAULT ''
        );
        INSERT INTO price_pending_rows(id, laboratory) VALUES ('row-1', 'Indústria');
    `);

    ensurePricePendingSchema(database);

    const row = database.prepare(`
        SELECT id, laboratory, priority
        FROM price_pending_rows
        WHERE id = 'row-1'
    `).get();
    assert.deepEqual(row, {
        id: "row-1",
        laboratory: "Indústria",
        priority: ""
    });
    database.close();
});


test("automatic charge is disabled by default and serializes simulated runs", async () => {
    const database = new Database(":memory:");
    const repository = createRepository({ getDatabase: () => database });
    assert.equal(repository.getConfiguration().enabled, false);
    assert.equal(repository.claimExecution("not-authorized", 48 * 60 * 60 * 1000).reason, "disabled");

    repository.setEnabled(true, "Teste");
    let finishSimulatedSend;
    let simulatedSendCalls = 0;
    const simulatedChargeService = {
        prepareFavoriteCharge: () => ({
            preview_token: "simulation",
            messages: [{ to: "industry@example.test" }]
        }),
        sendFavoriteCharge: () => {
            simulatedSendCalls += 1;
            return new Promise((resolve) => {
                finishSimulatedSend = () => resolve({
                    success: true,
                    run_id: "simulated-run",
                    sent: 1,
                    results: [{ success: true }]
                });
            });
        }
    };
    const service = createService({
        repository,
        chargeService: simulatedChargeService
    });
    const otherComputer = createService({
        repository,
        chargeService: simulatedChargeService
    });

    const activeRun = service.runIfDue();
    assert.equal((await otherComputer.runIfDue()).reason, "busy");
    assert.equal(simulatedSendCalls, 1);
    finishSimulatedSend();
    assert.equal((await activeRun).status, "success");

    const history = repository.listEvents();
    assert.ok(history.some((event) => event.event_type === "activation"));
    assert.ok(history.some((event) => event.event_type === "success"));
    assert.deepEqual(
        history.find((event) => event.event_type === "success").recipients,
        ["industry@example.test"]
    );

    database.exec(`
        CREATE TABLE contact_charge_runs (
            id TEXT PRIMARY KEY,
            favorite_id TEXT
        );
        CREATE TABLE contact_charge_run_items (
            id TEXT PRIMARY KEY,
            run_id TEXT,
            status TEXT,
            sent_at TEXT
        );
    `);
    database.prepare(`
        INSERT INTO contact_charge_runs(id, favorite_id)
        VALUES ('recent-run', 'fixed-prices-pending-outdated')
    `).run();
    database.prepare(`
        INSERT INTO contact_charge_run_items(id, run_id, status, sent_at)
        VALUES ('recent-item', 'recent-run', 'sent', ?)
    `).run(new Date(Date.now() - 60 * 60 * 1000).toISOString());
    assert.equal(
        repository.claimExecution("too-soon", 48 * 60 * 60 * 1000).reason,
        "not_due"
    );

    database.prepare(`
        UPDATE contact_charge_run_items
        SET sent_at = ?
        WHERE id = 'recent-item'
    `).run(new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString());
    const dueClaim = repository.claimExecution("due-now", 48 * 60 * 60 * 1000);
    assert.equal(dueClaim.claimed, true);
    repository.releaseExecution("due-now");
    database.close();
});
