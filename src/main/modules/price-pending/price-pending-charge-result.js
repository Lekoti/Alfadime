function classifyResult(result = {}, error = null) {
    if (error) return { kind: "falha", success: false, message: String(error.message || error) };
    if (result.error || result.status === "interrupted" || Number(result.uncertain || 0) > 0) {
        return { kind: "falha", success: false,
            message: String(result.error || "Execução interrompida ou com resultado incerto. Confira SMTP e histórico antes de reenviar.") };
    }
    if (result.cancelled === true || result.status === "cancelled") {
        return { kind: "cancelada", success: false,
            message: `Cobrança cancelada. ${Number(result.sent || 0)} enviado(s), ${Number(result.failed || 0)} falha(s). Consulte o histórico; itens não processados não foram enviados.` };
    }
    if (result.success === true && Number(result.failed || 0) === 0 && result.status !== "completed_with_errors") return { kind: "sucesso", success: true, message: "" };
    return { kind: "falha", success: false,
        message: `Cobrança concluída com falhas. ${Number(result.sent || 0)} enviado(s), ${Number(result.failed || 0)} falha(s). Consulte os motivos no histórico.` };
}
module.exports = { classifyResult };
