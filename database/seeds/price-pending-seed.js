const crypto = require("node:crypto");

const laboratories = [
    "# Cifarma Farma - 39",
    "# Ecofitus - 180",
    "# Ems Marcas - 56",
    "# Ems Genérico - 875",
    "# Eurofarma - 60",
    "# Geolab - 9",
    "# Kley Hertz - 68",
    "# Legrand Genéricos - 4",
    "# Legrand Tarjados - 2",
    "# Maxinutri - 193",
    "# Multilab - 8",
    "# Natulab - 85",
    "# Neo Química Genérico - 5",
    "# Neo Química Smart - 1",
    "# Teuto - 3",
    "# Vitamedic - 118",
    "3B - 778",
    "Infinity / Abelha Rainha - 898",
    "Above - 750",
    "Accumed - 10",
    "Addit - 11",
    "Adv - Lab Tayuyna - 12",
    "Airela - 231",
    "Alphafitus (Creatina) - 882",
    "Amakha Paris - 909",
    "Analitic - 15",
    "Arte Nativa - Veltofarma - 18",
    "Avizor - 873",
    "Avvio - 863",
    "Beira Alta - 868",
    "Belfar - 169",
    "Bellaphytus - 859",
    "Bionatus - 24",
    "Brasterapica - 28",
    "Breyer - 779",
    "Butterfly - 31",
    "C M Hospitalar - 32",
    "Carta Fabril - 742",
    "Catarinense - 34",
    "Catarinense Matacura - 35",
    "Cazi - 36",
    "Ccm - 843",
    "Cellera / Delta - 49",
    "Cifarma Propaganda Médica - 179",
    "Cimed - 40",
    "Cirúrgica Fernandes - 41",
    "Comércio E Distribuidora Delta - 724",
    "Cremer - 44",
    "Dkt - 46",
    "Dacolonia - 893",
    "Dental Clean - 865",
    "Divon - 53",
    "Dorja - 54",
    "Dr Peanut - 889",
    "Drica - 894",
    "E De Sou Tubos Cirur / Rinelc - 61",
    "Equiplex - 57",
    "Escobel - 869",
    "Essity / Fraldas Tena - 160",
    "Farmacê - 784",
    "Farmax - 65",
    "Flopi - 886",
    "Giovanna Baby / Pro Nova - 878",
    "Globo - 122",
    "Greenpharma - 184",
    "Gum / Sunstat - 786",
    "Hadass / Rívica / Trol - 107",
    "Healthy - 832",
    "Hearst - 67",
    "Herbissimo - 913",
    "Ifal - 71",
    "Imec - 72",
    "Inborplas - 73",
    "Incoterm - 74",
    "Injex - 75",
    "Instituto Kroner - 130",
    "Jd Distribuidora - 615",
    "Katigua - 885",
    "Kuka - 864",
    "Labotrat - 860",
    "Labpharma - 903",
    "Lillo - 872",
    "Lolly - 870",
    "Makrofarma - 79",
    "Malavasi - 768",
    "Marjan - 787",
    "Maxtitanium - 890",
    "Medinal - 195",
    "Medix - 80",
    "Medley - 726",
    "Medquímica - 82",
    "Melpoejo - 136",
    "Merheje - 137",
    "Minancora - 199",
    "Missner - 83",
    "Mova / Midian - 735",
    "Multilaser - 201",
    "Natcofarma - 908",
    "Nativita - 405",
    "Natu Hair - 771",
    "Neobem Agaplast - 854",
    "Neopan - 738",
    "Norte Sul - 89",
    "Ntl - 144",
    "Omron - 93",
    "Ora Pro Nobis - 881",
    "Osório De Moraes - 96",
    "Perosul - 97",
    "Pharlab - 147",
    "Pharmascience - 99",
    "Polibrinq (Brinquedos) - 884",
    "Ponteland - 100",
    "Prati - 149",
    "Probiotica - 891",
    "Prolife - 150",
    "Promel - 777",
    "Qualybless - 879",
    "Qualynutri - 905",
    "Ranbaxy - 104",
    "Rioquímica - 106",
    "Rugol - 900",
    "Sanfarma - 109",
    "Sanibras - 110",
    "Sanofi - 727",
    "Sobral - 111",
    "Spk - 823",
    "Turma Da Mônica - 888",
    "Tutticare - 161",
    "Uniphar - J R D - 822",
    "Vca - 880",
    "Vidora - 116",
    "Vitafor - 744",
    "Vitamed - 117",
    "Waldomiro Pereira - 69",
    "Wesp - 119",
    "Ziin Ziin - 167",
    "Zydus - 168",
    "Farmabraz - Passaja - 63",
    "Principia Es - 906",
    "Mcg Indústria Farmacêutica - 929",
    "Mcg Suplemento Alimentar - 930",
    "Mcg Perfumaria - 931"
];

function seedPricePendingRows(database) {
    const now = new Date().toISOString();

    const findStatement = database.prepare(`
        SELECT id
        FROM price_pending_rows
        WHERE laboratory = ?
        LIMIT 1
    `);

    const insertStatement = database.prepare(`
        INSERT INTO price_pending_rows (
            id,
            laboratory,

            env_precos_dpr,
            env_precos_ams,
            env_precos_dmt,
            env_precos_dms,
            env_precos_dsc,

            env_pend_dpr,
            env_pend_ams,
            env_pend_dmt,
            env_pend_dms,
            env_pend_dsc,

            precos_ok_dpr,
            precos_ok_ams,
            precos_ok_dmt,
            precos_ok_dms,
            precos_ok_dsc,

            pendencias_ok_dpr,
            pendencias_ok_ams,
            pendencias_ok_dmt,
            pendencias_ok_dms,
            pendencias_ok_dsc,

            sort_order,
            active,
            created_at,
            updated_at
        ) VALUES (
            @id,
            @laboratory,

            '',
            '',
            '',
            '',
            '',

            '',
            '',
            '',
            '',
            '',

            '',
            '',
            '',
            '',
            '',

            '',
            '',
            '',
            '',
            '',

            @sort_order,
            1,
            @created_at,
            @updated_at
        )
    `);

    let inserted = 0;
    let skipped = 0;

    const insertMany = database.transaction(() => {
        laboratories.forEach((laboratory, index) => {
            const existing = findStatement.get(laboratory);

            if (existing) {
                skipped++;
                return;
            }

            insertStatement.run({
                id: crypto.randomUUID(),
                laboratory,
                sort_order: index,
                created_at: now,
                updated_at: now
            });

            inserted++;
        });
    });

    insertMany();

    return {
        total: laboratories.length,
        inserted,
        skipped
    };
}

module.exports = {
    laboratories,
    seedPricePendingRows
};
