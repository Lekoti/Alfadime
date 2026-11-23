const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { BRANCHES, DEFAULT_ROOT, MAX_BYTES, MAX_FILES } = require("./nf-import.constants");
let root = DEFAULT_ROOT;
const entries = new Map();
function getRoot() { return root; }
function setRoot(value) { root = path.resolve(value); entries.clear(); }
async function readXml(filePath) {
    if (path.extname(filePath).toLowerCase() !== ".xml") throw new Error("Selecione um arquivo XML.");
    const handle = await fs.open(filePath, "r");
    try {
        const info = await handle.stat();
        if (!info.isFile() || info.size > MAX_BYTES) throw new Error("Arquivo inválido ou maior que 10 MB.");
        const buffer = Buffer.alloc(MAX_BYTES + 1);
        let size = 0;
        while (size < buffer.length) {
            const result = await handle.read(buffer, size, buffer.length - size, null);
            if (!result.bytesRead) break;
            size += result.bytesRead;
        }
        if (size > MAX_BYTES) throw new Error("XML ultrapassa o limite de 10 MB.");
        const bytes = buffer.subarray(0, size);
        let encoding = "utf-8";
        if ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0x3c && bytes[1] === 0)) encoding = "utf-16le";
        else if ((bytes[0] === 0xfe && bytes[1] === 0xff) || (bytes[0] === 0 && bytes[1] === 0x3c)) encoding = "utf-16be";
        else {
            const declared = bytes.subarray(0, 200).toString("ascii").match(/encoding\s*=\s*["']([^"']+)/i)?.[1]?.toLowerCase();
            if (declared && !["utf-8", "utf8", "us-ascii"].includes(declared)) {
                if (["iso-8859-1", "windows-1252"].includes(declared)) encoding = declared;
                else throw new Error(`Codificação não suportada: ${declared}`);
            }
        }
        return new TextDecoder(encoding, { fatal: true }).decode(bytes);
    } finally { await handle.close(); }
}
async function scanFolders() {
    entries.clear();
    const rows = [], folders = [];
    for (const branch of BRANCHES) {
        const folder = path.join(root, branch.folder, "ComErros");
        try {
            let total = 0, included = 0;
            const directory = await fs.opendir(folder);
            for await (const entry of directory) {
                if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".xml") continue;
                total++;
                if (rows.length >= MAX_FILES) continue;
                const id = crypto.randomUUID();
                entries.set(id, { path: path.join(folder, entry.name), branch });
                rows.push({ id, fileName: entry.name, folderBranch: branch.key, folder });
                included++;
            }
            folders.push({ branch: branch.key, folder, total, included, error: null });
        } catch (error) {
            folders.push({ branch: branch.key, folder, error: `${error.code || "ERRO"}: ${error.message}` });
        }
    }
    return { root, rows, folders, limit: MAX_FILES };
}
async function readEntry(id) {
    const entry = entries.get(id);
    if (!entry) throw new Error("Referência expirada. Atualize as pastas.");
    return { xml: await readXml(entry.path), fileName: path.basename(entry.path), folderBranch: entry.branch.key };
}
module.exports = { getRoot, setRoot, readXml, scanFolders, readEntry };
