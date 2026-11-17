const access = require("./price-pending-access");
const permissions = require("../auth/granularPermissionsDatabaseService");

const EDITOR_ROLES = new Set(["creator", "admin", "editor"]);
const GROUPS = ["env_precos", "env_pend", "precos_ok", "pendencias_ok"];
const BRANCHES = ["dpr", "ams", "dmt", "dms", "dsc"];
const COLUMNS = ["industry_global_code", "laboratory", "observation",
    ...GROUPS.flatMap(group => BRANCHES.map(branch => `${group}_${branch}`))];
const flag = value => value === true || value === 1;

function context() {
    const session = access.requireUser();
    const response = permissions.getPermissionsForUser(session.id);
    if (!response?.success || !response.data?.user || !Array.isArray(response.data.modules) || !Array.isArray(response.data.functions)) {
        throw new Error("Não foi possível verificar suas permissões. A operação foi bloqueada sem alterar dados.");
    }
    const user = response.data.user;
    if (String(user.id) !== String(session.id) || !flag(user.is_active)) {
        throw new Error("Usuário inativo ou sessão inválida. Entre novamente.");
    }
    const modules = new Map(response.data.modules.map(item => [item.module_key, item]));
    const functions = new Map(response.data.functions.map(item => [`${item.module_key}:${item.function_key}`, item]));
    const canModule = (key, action = "can_view") => flag(modules.get(key)?.can_view) && flag(modules.get(key)?.[action]);
    const canFunction = (key, name, action = "can_execute") => canModule(key) && flag(functions.get(`${key}:${name}`)?.[action]);
    function editor() {
        if (!EDITOR_ROLES.has(String(user.role || "").toLowerCase())) throw new Error("Seu perfil não pode executar alterações ou envios.");
        return user;
    }
    function requireModule(key, action = "can_view") {
        if (action !== "can_view") editor();
        if (!canModule(key, action)) throw new Error(`Sem permissão: ${key}/${action}.`);
        return user;
    }
    function requireAnyModule(keys) {
        if (!keys.some(key => canModule(key))) throw new Error("Você não tem permissão para consultar estes dados.");
        return user;
    }
    function requireFunction(key, name, action = "can_execute") {
        editor();
        if (!canFunction(key, name, action)) throw new Error(`Sem permissão: ${key}/${name}/${action}.`);
        return user;
    }
    function canViewColumn(column) {
        if (!COLUMNS.includes(column) || !canFunction("price-pending", column, "can_view")) return false;
        const group = GROUPS.find(key => column.startsWith(key + "_"));
        return !group || canFunction("price-pending", group, "can_view");
    }
    function requireCell(column) {
        editor();
        const alternatives = column === "laboratory" ? ["edit_laboratory", "laboratory"]
            : column === "observation" ? ["edit_observation", "observation"] : null;
        if (alternatives) {
            if (!alternatives.some(key => canFunction("price-pending", key, "can_edit"))) {
                throw new Error(`Sem permissão de edição: ${column}.`);
            }
        } else if (!COLUMNS.includes(column) || column === "industry_global_code" ||
            !canFunction("price-pending", "edit_values", "can_edit") || !canFunction("price-pending", column, "can_edit")) {
            throw new Error(`Sem permissão de edição: ${column}.`);
        }
        if (!canViewColumn(column)) throw new Error(`Sem permissão de visualização: ${column}.`);
        return user;
    }
    function requireCharge() {
        editor();
        if (!canModule("industry-contacts", "can_edit")) {
            throw new Error("Sem permissão para preparar, enviar, cancelar ou reenviar cobranças.");
        }
        return user;
    }
    function requireHistoryControl(run) {
        editor();
        if (!canModule("industry-contacts", "can_edit") &&
            !(canFunction("price-pending", "manage_automatic_charge") && run?.source === "automatic")) {
            throw new Error("Sem permissão para alterar esta execução de cobrança.");
        }
        return user;
    }
    function projectRow(row) {
        if (!row) return row;
        const output = {};
        for (const key of ["id", "sort_order", "active", "created_at", "updated_at", "external_updated_at"]) {
            if (Object.prototype.hasOwnProperty.call(row, key)) output[key] = row[key];
        }
        for (const column of COLUMNS) if (canViewColumn(column) && Object.prototype.hasOwnProperty.call(row, column)) output[column] = row[column];
        if (canViewColumn("laboratory")) output.priority_label = row.priority_label || "";
        for (const key of ["manual_cells", "pending_external_updates"]) {
            let value = row[key];
            if (typeof value === "string") { try { value = JSON.parse(value); } catch (_) { value = {}; } }
            output[key] = Object.fromEntries(Object.entries(value && typeof value === "object" && !Array.isArray(value) ? value : {})
                .filter(([column]) => canViewColumn(column)));
        }
        return output;
    }
    return { user, canModule, canFunction, requireModule, requireAnyModule, requireFunction, requireCell,
        requireCharge, requireHistoryControl, canViewColumn, projectRow, editor };
}

module.exports = { context, COLUMNS };
