import { useReducer } from "react";
import { initialPurchaseState, purchaseReducer, invoiceIdentity, emptyNote, itemCode, invoiceGroups, reportBlock } from "../services/nfPurchaseMatch.service";
import { parsePurchaseReport, decodeReport } from "../services/nfPurchaseReport.service";
export default function useNfPurchaseSession(invoice) {
    const [state, dispatch] = useReducer(purchaseReducer, initialPurchaseState);
    const id = invoiceIdentity(invoice), note = state.notes[id] || emptyNote();
    return { state, id, note, report: state.report, groups: invoiceGroups(invoice, note.manual), blocked: reportBlock(state.report, invoice),
        getItemCode: (index) => itemCode(invoice, note.manual, index),
        setCode: (index, value) => dispatch({ type: "CODE", invoice, index, value }),
        restoreCode: (index) => dispatch({ type: "CODE", invoice, index, restore: true }),
        clear: () => dispatch({ type: "CLEAR_REPORT" }),
        fail: (message) => dispatch({ type: "ERROR", message }),
        loadText: (text, name, encoding) => {
            try { dispatch({ type: "IMPORT", report: parsePurchaseReport(text, name, encoding) }); }
            catch (error) { dispatch({ type: "ERROR", message: error.message }); }
        },
        decode: decodeReport
    };
}
