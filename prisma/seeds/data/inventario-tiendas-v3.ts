// AUTO-GENERADO por prisma/seeds/data/generate-inventario-tiendas-data.ts — NO editar a mano.
// Fuente: INVENTARIOS TIENDAS.xlsx. Regenerar con:
//   npx ts-node --project prisma/seeds/tsconfig.json prisma/seeds/data/generate-inventario-tiendas-data.ts

export interface TiendaInventoryRow {
  code: string;
  name: string;
  unit: string;
  satCode: string | null;
  price: number;
  departmentName: string | null;
  branchCode: string;
}

export interface AgrisasRefreshRow {
  code: string;
  name: string;
  unit: string;
  satCode: string | null;
  departmentName: string;
  ivaRaw: number;
  iepsRaw: number;
  existencia: number;
  prices: Array<{ tierName: string; value: number; isDefault?: boolean }>;
}

export interface TlaxiacoRawRow {
  tlaxiacoRawCode: number | string;
  name: string;
  unit: string;
  satCode: string | null;
  price: number;
  departmentName: string | null;
  branchCode: "TLAXIACO";
}

export const AGRISAS_REFRESH_DATA: AgrisasRefreshRow[] = [
  {
    "code": "ACTIVA1",
    "name": "ACTIVANE 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRICULTOR",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 16,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1562.64,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1426.76
      }
    ]
  },
  {
    "code": "ENG100",
    "name": "ENGORDONE 100 GRS",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRICULTOR",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 5,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 342.18,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 311.77
      }
    ]
  },
  {
    "code": "ENGOR",
    "name": "ENGORDONE 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRICULTOR",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2812.21,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2567.67
      }
    ]
  },
  {
    "code": "MAXI",
    "name": "MAXIFRUTO 500ML",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRICULTOR",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 4,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1065.11,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 972.49
      }
    ]
  },
  {
    "code": "STEMI1K",
    "name": "STEMICOL 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRICULTOR",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 12,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1114.82,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1017.88
      }
    ]
  },
  {
    "code": "ULTIM",
    "name": "ULTIMITE 1L",
    "unit": "H87",
    "satCode": "10171700",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 11,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1406.15,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1283.88
      }
    ]
  },
  {
    "code": "ABAX",
    "name": "ABAXO FERRO 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 20,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 410.1,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 369.09
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 348.59
      }
    ]
  },
  {
    "code": "ALMX",
    "name": "ALGIMAX 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 81,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 374.38,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 336.94
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 318.22
      }
    ]
  },
  {
    "code": "ALGM500",
    "name": "ALGIMEL 500 GR",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 65,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 581.25,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 523.13
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 494.06
      },
      {
        "tierName": "Precio 4",
        "value": 498.22
      }
    ]
  },
  {
    "code": "AMG",
    "name": "AMINOGREEN 16 1 LT",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 70,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 380.63,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 342.56
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 323.53
      },
      {
        "tierName": "Precio 4",
        "value": 304.5
      }
    ]
  },
  {
    "code": "AMG24",
    "name": "AMINOGREEN 24 1 LT",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 90,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 420,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 378
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 357
      },
      {
        "tierName": "Precio 4",
        "value": 336
      }
    ]
  },
  {
    "code": "BSOL",
    "name": "AMINOGREEN 90  1KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 89,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 778.13,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 700.31
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 661.41
      },
      {
        "tierName": "Precio 4",
        "value": 622.5
      }
    ]
  },
  {
    "code": "AMK",
    "name": "AMINOGREEN K 1LT",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": -1,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 510,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 459
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 433.5
      }
    ]
  },
  {
    "code": "BOR",
    "name": "BOR 1 LT",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 111,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 319.13,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 287.21
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 271.26
      },
      {
        "tierName": "Precio 4",
        "value": 255.3
      }
    ]
  },
  {
    "code": "BUFA1LT",
    "name": "BUFALO 1L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 184.7,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 166.23
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 157
      },
      {
        "tierName": "Precio 4",
        "value": 147.76
      }
    ]
  },
  {
    "code": "BUF20",
    "name": "BUFALO 20 L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 1,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3693.75,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 3324.78
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 3139.69
      }
    ]
  },
  {
    "code": "BUFSO",
    "name": "BUFALO SOLID 5KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 1,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1282.43,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1154.18
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1090.06
      }
    ]
  },
  {
    "code": "CPQ",
    "name": "CUPRIC QUELAT 5KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 4,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1812.5,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1631.25
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1540.63
      },
      {
        "tierName": "Precio 4",
        "value": 1450
      }
    ]
  },
  {
    "code": "ENGY",
    "name": "ENERGY SOIL 1L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 25,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 230,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 207
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 195.5
      }
    ]
  },
  {
    "code": "FIT1",
    "name": "FITASIO 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 40,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 472.22,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 425
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 401.39
      }
    ]
  },
  {
    "code": "FLOR",
    "name": "FLORCUAJE 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 48,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 520.78,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 468.7
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 442.66
      },
      {
        "tierName": "Precio 4",
        "value": 416.62
      }
    ]
  },
  {
    "code": "GRCA",
    "name": "GREEN CABOR 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 12,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 196.31,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 176.68
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 166.87
      },
      {
        "tierName": "Precio 4",
        "value": 157.05
      }
    ]
  },
  {
    "code": "GRCA20",
    "name": "GREEN CABOR 20 L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 4,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3399.5,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 3059.55
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 2889.58
      },
      {
        "tierName": "Precio 4",
        "value": 2719.6
      }
    ]
  },
  {
    "code": "GCZ1",
    "name": "GREEN CALCIO ZINC 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 55,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 196.88,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 177.19
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 167.34
      },
      {
        "tierName": "Precio 4",
        "value": 157.5
      }
    ]
  },
  {
    "code": "GRCR",
    "name": "GREEN COBRE 1L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 91,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 296.63,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 266.96
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 252.13
      }
    ]
  },
  {
    "code": "GP1",
    "name": "GREEN P 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 28,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 490.85,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 441.77
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 417.22
      },
      {
        "tierName": "Precio 4",
        "value": 392.68
      }
    ]
  },
  {
    "code": "GZL",
    "name": "GREEN ZINC 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 74,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 164.06,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 147.66
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 139.45
      },
      {
        "tierName": "Precio 4",
        "value": 131.25
      }
    ]
  },
  {
    "code": "HRMG",
    "name": "HORMOSTING 1L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 33,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1116,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1004.4
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 948.6
      }
    ]
  },
  {
    "code": "HMTG",
    "name": "HORMOSTING 250ML",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 80,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 326.25,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 293.63
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 277.31
      }
    ]
  },
  {
    "code": "MQ",
    "name": "MANGANESSE QUELAT 5KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 8,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1814.06,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1632.66
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1541.95
      },
      {
        "tierName": "Precio 4",
        "value": 1451.25
      }
    ]
  },
  {
    "code": "MAXO",
    "name": "MAX ORGANIC 20 LTS",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 8,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2718.75,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2446.88
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 2310.94
      },
      {
        "tierName": "Precio 4",
        "value": 2175
      }
    ]
  },
  {
    "code": "MCE",
    "name": "MICRO ENERGIC 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 67,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 296.05,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 266.45
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 251.64
      },
      {
        "tierName": "Precio 4",
        "value": 281.25
      }
    ]
  },
  {
    "code": "MIC",
    "name": "MICRO ENERGIC 5KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 6,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1273.75,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1146.32
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1082.63
      }
    ]
  },
  {
    "code": "MOLI",
    "name": "MOLIBCUAJE 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 610.51,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 549.46
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 518.94
      },
      {
        "tierName": "Precio 4",
        "value": 488.41
      }
    ]
  },
  {
    "code": "NON",
    "name": "NON-PITT 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 20,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 390.94,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 351.84
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 332.3
      },
      {
        "tierName": "Precio 4",
        "value": 312.75
      }
    ]
  },
  {
    "code": "NNS",
    "name": "NON-SAL 20L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 12,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2837.5,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2553.75
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 2411.88
      },
      {
        "tierName": "Precio 4",
        "value": 2270
      }
    ]
  },
  {
    "code": "NUT",
    "name": "NUTRIMAZIN 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 12,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 232.88,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 209.59
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 197.94
      }
    ]
  },
  {
    "code": "NTMB",
    "name": "NUTRIMOB 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 60,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 582.19,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 523.97
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 494.86
      },
      {
        "tierName": "Precio 4",
        "value": 465.75
      }
    ]
  },
  {
    "code": "PHCO1",
    "name": "PHOSCUPRICO 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 26,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 532.56,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 479.31
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 452.68
      },
      {
        "tierName": "Precio 4",
        "value": 426.05
      }
    ]
  },
  {
    "code": "QUAN1",
    "name": "QUANTUM 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 251,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 531.25,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 478.13
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 451.56
      },
      {
        "tierName": "Precio 4",
        "value": 425
      }
    ]
  },
  {
    "code": "QUAN10",
    "name": "QUANTUM 10 KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 5062.5,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 4556.25
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 4303.13
      },
      {
        "tierName": "Precio 4",
        "value": 4050
      }
    ]
  },
  {
    "code": "QUAN5",
    "name": "QUANTUM 5 KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 5,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2531.25,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2278.13
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 2151.56
      },
      {
        "tierName": "Precio 4",
        "value": 2025
      }
    ]
  },
  {
    "code": "QUAF",
    "name": "QUANTUM FLOWER 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 102,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 512.23,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 461
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 435.39
      },
      {
        "tierName": "Precio 4",
        "value": 409.78
      }
    ]
  },
  {
    "code": "QRT1",
    "name": "QUANTUM ROOT 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 79,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 441.88,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 397.69
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 375.59
      },
      {
        "tierName": "Precio 4",
        "value": 353.5
      }
    ]
  },
  {
    "code": "RZOOT1",
    "name": "RAIZOOT 1L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 64,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 393.75,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 354.38
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 334.69
      },
      {
        "tierName": "Precio 4",
        "value": 315
      }
    ]
  },
  {
    "code": "RZOOT20",
    "name": "RAIZOOT 20 L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 5192,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 5970.8
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 4932.4
      },
      {
        "tierName": "Precio 4",
        "value": 4672.8
      }
    ]
  },
  {
    "code": "SB1",
    "name": "SILISEC BOTRYSEC 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 72,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 308.26,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 277.44
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 262.02
      },
      {
        "tierName": "Precio 4",
        "value": 246.61
      }
    ]
  },
  {
    "code": "SILG",
    "name": "SILISEC-BOTRYSEC 5KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 24,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1465.63,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1319.06
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1245.78
      },
      {
        "tierName": "Precio 4",
        "value": 1172.5
      }
    ]
  },
  {
    "code": "GSI1",
    "name": "SILISEC-K 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 117,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 220.63,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 198.56
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 187.53
      },
      {
        "tierName": "Precio 4",
        "value": 176.5
      }
    ]
  },
  {
    "code": "STPS",
    "name": "STOP SAL 1L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 11,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 494.54,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 445.08
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 420.36
      },
      {
        "tierName": "Precio 4",
        "value": 395.63
      }
    ]
  },
  {
    "code": "STOP",
    "name": "STOP SAL 5 LT",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1915.65,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2394.56
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 2155.11
      },
      {
        "tierName": "Precio 4",
        "value": 1657.43
      }
    ]
  },
  {
    "code": "SACV",
    "name": "SUCRE ACTIVE 1L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 100,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 317.39,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 286
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 269.78
      }
    ]
  },
  {
    "code": "ZQ1",
    "name": "ZINESSE QUELAT 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 23,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 342.5,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 308.28
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 291.13
      },
      {
        "tierName": "Precio 4",
        "value": 274
      }
    ]
  },
  {
    "code": "ALG",
    "name": "*ALGIMEL 500GR *",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 498.22,
        "isDefault": true
      }
    ]
  },
  {
    "code": "AMI16OUT",
    "name": "*AMINOGREEN 16 1L*",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 16,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 196,
        "isDefault": true
      }
    ]
  },
  {
    "code": "BIMAXOUT",
    "name": "*BIOMAX 1L *",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 16,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 212.5,
        "isDefault": true
      }
    ]
  },
  {
    "code": "FITS",
    "name": "*FITASIO 1L*",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": -1,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 501.74,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 451.56
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 426.48
      }
    ]
  },
  {
    "code": "FLOO",
    "name": "*FLORCUAJE 1L*",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 291.64,
        "isDefault": true
      }
    ]
  },
  {
    "code": "GPO",
    "name": "*GREEN P 1L*",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 27,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 274,
        "isDefault": true
      }
    ]
  },
  {
    "code": "MOBLOUT",
    "name": "*MOBLICUAJE 1L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 4,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 412.25,
        "isDefault": true
      }
    ]
  },
  {
    "code": "NON_OUT",
    "name": "*NON PITT 1K*",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 2,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 207,
        "isDefault": true
      }
    ]
  },
  {
    "code": "QUANF",
    "name": "*QUANTUM 1 K*",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 1,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 318,
        "isDefault": true
      }
    ]
  },
  {
    "code": "RZTOUT",
    "name": "*RAIZOOT 1L",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 21,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 315,
        "isDefault": true
      }
    ]
  },
  {
    "code": "SILI5",
    "name": "*SILISEC-BOTRYSEC 5K*",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "AGRINOVA OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 1,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 879.38,
        "isDefault": true
      }
    ]
  },
  {
    "code": "CHICE",
    "name": "CHOICE1L",
    "unit": "H87",
    "satCode": "12161900",
    "departmentName": "AGRISTAR",
    "ivaRaw": 16,
    "iepsRaw": 0,
    "existencia": 15,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 200,
        "isDefault": true
      }
    ]
  },
  {
    "code": "ACET2",
    "name": "ACET200 500 GRS",
    "unit": "H87",
    "satCode": "10191509",
    "departmentName": "AGROFARM",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1289.68,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1160.71
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1096.23
      }
    ]
  },
  {
    "code": "AGRIMT",
    "name": "AGROMECTINA 1L",
    "unit": "H87",
    "satCode": "10191509",
    "departmentName": "AGROFARM",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 29,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 718.75,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 646.88
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 610.94
      }
    ]
  },
  {
    "code": "BACTO",
    "name": "BACTER OUT 800 GRS",
    "unit": "H87",
    "satCode": "10171702",
    "departmentName": "AGROFARM",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 19,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 596.59,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 536.93
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 507.1
      }
    ]
  },
  {
    "code": "BTK731",
    "name": "BTKUR 731 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROFARM",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 39,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 392.86,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 353.57
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 333.93
      }
    ]
  },
  {
    "code": "CYAT",
    "name": "CYANTROL 1L",
    "unit": "H87",
    "satCode": "10191509",
    "departmentName": "AGROFARM",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 21,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 4722.22,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 4250
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 4013.89
      }
    ]
  },
  {
    "code": "ECOT1",
    "name": "ECOTROL EC 1L",
    "unit": "H87",
    "satCode": "10191500",
    "departmentName": "AGROFARM",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 53,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 968.75,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 871.88
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 823.44
      }
    ]
  },
  {
    "code": "ENG",
    "name": "ENGOR-D 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROFARM",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 59,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 762.2,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 685.98
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 647.87
      }
    ]
  },
  {
    "code": "EXP",
    "name": "EXPLORER 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROFARM",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 3,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 588.24,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 529.41
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 500
      }
    ]
  },
  {
    "code": "GRP",
    "name": "GORPLUS 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROFARM",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 766.67,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 690
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 651.67
      }
    ]
  },
  {
    "code": "KEYBPS",
    "name": "KEYPLEX BYPASS 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROFARM",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": -1,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1133.33,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1020
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 963.33
      }
    ]
  },
  {
    "code": "KF",
    "name": "K-FULL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROFARM",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 46,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 375,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 337.5
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 318.75
      }
    ]
  },
  {
    "code": "LDM",
    "name": "LANDIM 330 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROFARM",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 35,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 920,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 900.09
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 850.09
      }
    ]
  },
  {
    "code": "MAXCT",
    "name": "MAX CONTROL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROFARM",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 11,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1093.75,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 984.38
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 929.69
      }
    ]
  },
  {
    "code": "PPT",
    "name": "PEPTON 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROFARM",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 31,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 691.18,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 622.06
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 587.5
      }
    ]
  },
  {
    "code": "TTMAX",
    "name": "TETRA MAX 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROFARM",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 41,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 4687.5,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 4218.75
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 3984.38
      }
    ]
  },
  {
    "code": "ABAM",
    "name": "ABAMEN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 588.24,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 529.41
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 500
      }
    ]
  },
  {
    "code": "ADRM",
    "name": "ADERMEN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 152.94,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 137.65
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 130
      }
    ]
  },
  {
    "code": "AGRC",
    "name": "AGROCAN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 529.41,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 476.47
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 450
      }
    ]
  },
  {
    "code": "AGGL",
    "name": "AGROGARLIC 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 285.71,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 257.14
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 242.86
      }
    ]
  },
  {
    "code": "AGNM",
    "name": "AGRO-NEM 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 897.83,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 808.05
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 763.16
      }
    ]
  },
  {
    "code": "AMXM",
    "name": "AMOXAM 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 425,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 361.25
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 340
      }
    ]
  },
  {
    "code": "BFLL",
    "name": "BIOFULL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 421.57,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 379.41
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 358.33
      }
    ]
  },
  {
    "code": "CRMN",
    "name": "CORAMEN 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 699,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 622
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 585
      }
    ]
  },
  {
    "code": "DRV",
    "name": "DERRIVE 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 275,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 233.75
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 220
      }
    ]
  },
  {
    "code": "DRRB",
    "name": "DERRUNBE 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 940,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 905
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 850
      }
    ]
  },
  {
    "code": "FLY500",
    "name": "FLYMEN 500 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 933.34,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 793.34
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 746.66
      }
    ]
  },
  {
    "code": "LTL",
    "name": "LETAL 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 419.64,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 356.7
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 335.71
      }
    ]
  },
  {
    "code": "MXM",
    "name": "MAXIMO 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 465,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 395.78
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 372.5
      }
    ]
  },
  {
    "code": "NIP",
    "name": "NIPROL 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1400,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1260
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1200
      }
    ]
  },
  {
    "code": "OXFN",
    "name": "OXIFEN 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 600,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 510
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 517
      }
    ]
  },
  {
    "code": "OXFN500ML",
    "name": "OXIFEN 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1010,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 980
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 940
      }
    ]
  },
  {
    "code": "SOPME",
    "name": "SOAPMEN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 225.49,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 202.94
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 191.67
      }
    ]
  },
  {
    "code": "SULB",
    "name": "SULBEMEN 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 151.92,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 129.13
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 121.54
      }
    ]
  },
  {
    "code": "SLBP",
    "name": "SULBER PLUS 250 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 491.67,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 417.92
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 393.33
      }
    ]
  },
  {
    "code": "SLBMX",
    "name": "SULBERMEN MAX 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 235.42,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 200.1
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 188.33
      }
    ]
  },
  {
    "code": "TXN",
    "name": "TOXAN 250 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 690,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 630
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 593
      }
    ]
  },
  {
    "code": "XPL",
    "name": "XIPROL 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 441.67,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 375.42
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 353.33
      }
    ]
  },
  {
    "code": "XIP",
    "name": "XIPROL 500ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 883.34,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 750.84
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 706.66
      }
    ]
  },
  {
    "code": "ZANE",
    "name": "ZARANEEM",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROMEN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 521.01,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 468.91
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 442.86
      }
    ]
  },
  {
    "code": "TALR",
    "name": "TALOCUPER 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROPLUS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 725,
        "isDefault": true
      }
    ]
  },
  {
    "code": "CORAZ",
    "name": "CORAZA 1L",
    "unit": "H87",
    "satCode": "10171702",
    "departmentName": "AGROQUIMICOS BARRITA",
    "ivaRaw": 0,
    "iepsRaw": 6,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 220,
        "isDefault": true
      }
    ]
  },
  {
    "code": "KASUM",
    "name": "KASUMI 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROQUIMICOS BARRITA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 470,
        "isDefault": true
      }
    ]
  },
  {
    "code": "OBON",
    "name": "OBERON SC240 500ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROQUIMICOS BARRITA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1500,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1465
      }
    ]
  },
  {
    "code": "TRA",
    "name": "TRAZEX 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "AGROQUIMICOS BARRITA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 210.6,
        "isDefault": true
      }
    ]
  },
  {
    "code": "EPA90",
    "name": "EPA 90 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "ALFA SOLUCIONES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 215,
        "isDefault": true
      }
    ]
  },
  {
    "code": "MUFF",
    "name": "SOBRE SEMILLA MUFAXA TOMATE",
    "unit": "H87",
    "satCode": "10151500",
    "departmentName": "AXIA VEGETABLES SEEDS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3600,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 3000
      }
    ]
  },
  {
    "code": "BUF",
    "name": "BUFFLEX 440G",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "BIOGROWER",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 200,
        "isDefault": true
      }
    ]
  },
  {
    "code": "DRE20",
    "name": "DETRUIRE DE 20 L",
    "unit": "H87",
    "satCode": "10171801",
    "departmentName": "BIOGROWER",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1394.67,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1743.33
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1569
      }
    ]
  },
  {
    "code": "LUC",
    "name": "LUCAGRO 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "BIOGROWER",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 175,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 157.5
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 148.75
      }
    ]
  },
  {
    "code": "PULI1",
    "name": "PULITORE 1 L",
    "unit": "H87",
    "satCode": "12164001",
    "departmentName": "BIOGROWER",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 3,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 680,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 612
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 578
      }
    ]
  },
  {
    "code": "SERR",
    "name": "SERRA K 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "BIOGROWER",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 225,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 202.5
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 191.25
      }
    ]
  },
  {
    "code": "AGRIS",
    "name": "AGRISUR 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 714.12,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 642.71
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 607
      }
    ]
  },
  {
    "code": "KOLO",
    "name": "KOLORNEUTRO 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 280.3,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 252.27
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 238.26
      }
    ]
  },
  {
    "code": "PHOST",
    "name": "PHOSTROT 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 311.42,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 280.28
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 264.71
      }
    ]
  },
  {
    "code": "SOLO",
    "name": "SOLO K 2.5 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1541.67,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1387.5
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1310.42
      }
    ]
  },
  {
    "code": "ALLEC",
    "name": "ALLECTUS DE 20G",
    "unit": "H87",
    "satCode": "10151700",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 850,
        "isDefault": true
      }
    ]
  },
  {
    "code": "BEL20G",
    "name": "BELEAF 20 GRS",
    "unit": "H87",
    "satCode": "10191509",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 126.83,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 115.56
      }
    ]
  },
  {
    "code": "BELF600",
    "name": "BELEAF 600 GRS",
    "unit": "H87",
    "satCode": "10191509",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3924.72,
        "isDefault": true
      }
    ]
  },
  {
    "code": "BUFF",
    "name": "BUFLEX 4KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1540,
        "isDefault": true
      }
    ]
  },
  {
    "code": "EXAL",
    "name": "EXALT 60SC 1LT",
    "unit": "H87",
    "satCode": "10191509",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3025.08,
        "isDefault": true
      }
    ]
  },
  {
    "code": "EXAT100",
    "name": "EXALT TM 60 SC 100ML",
    "unit": "H87",
    "satCode": "10191509",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 327,
        "isDefault": true
      }
    ]
  },
  {
    "code": "FIDATO",
    "name": "FIDATO 300GR",
    "unit": "H87",
    "satCode": "10191509",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2100,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1952
      }
    ]
  },
  {
    "code": "FSTO",
    "name": "FOSFONITRATO 25KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 375,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 352.63
      }
    ]
  },
  {
    "code": "MAIZDK_",
    "name": "MAIZ DK-357",
    "unit": "H87",
    "satCode": "10151513",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3386,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 3278.95
      }
    ]
  },
  {
    "code": "RALLY",
    "name": "RALLY 40W 114 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 560,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 544.44
      }
    ]
  },
  {
    "code": "SLB",
    "name": "SALIBRO 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 4930,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 4805
      }
    ]
  },
  {
    "code": "SPORTA",
    "name": "SPORTAK 45EC 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1429.92,
        "isDefault": true
      }
    ]
  },
  {
    "code": "SDC",
    "name": "SULFATO DE COBRE 25 KG",
    "unit": "H87",
    "satCode": "73101600",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2200,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2154
      }
    ]
  },
  {
    "code": "MNG",
    "name": "SULFATO DE MANGANESO 25 KG",
    "unit": "H87",
    "satCode": "73101600",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 730,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 700
      }
    ]
  },
  {
    "code": "SFZ",
    "name": "SULFATO DE ZINC 25 KG",
    "unit": "H87",
    "satCode": "73101600",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 860,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 805
      }
    ]
  },
  {
    "code": "TALS",
    "name": "TALSTAR 100",
    "unit": "H87",
    "satCode": "10191509",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 650,
        "isDefault": true
      }
    ]
  },
  {
    "code": "TORET",
    "name": "TORETTO 1LT",
    "unit": "H87",
    "satCode": "10191500",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 4492.94,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 4243.33
      }
    ]
  },
  {
    "code": "UMB",
    "name": "UMBRAL  1L",
    "unit": "H87",
    "satCode": "12164000",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 438.79,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 417.9
      }
    ]
  },
  {
    "code": "VER",
    "name": "VERIMAKR 20SC 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 6777.1,
        "isDefault": true
      }
    ]
  },
  {
    "code": "VRMK",
    "name": "VERIMARK 150ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "COIAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 998,
        "isDefault": true
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 952
      }
    ]
  },
  {
    "code": "GS5",
    "name": "GROW SOIL 5L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "EISENIA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 803.5,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 715
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 620
      }
    ]
  },
  {
    "code": "LEOMIL",
    "name": "LEOMIFUL K 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "EISENIA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 112,
        "isDefault": true
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 95
      }
    ]
  },
  {
    "code": "LEOMI5L",
    "name": "LEOMIFUL K 5L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "EISENIA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 540,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 511.82
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 480
      }
    ]
  },
  {
    "code": "SOLM1",
    "name": "SOLUM 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "EISENIA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 325.43,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 292.89
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 276.62
      }
    ]
  },
  {
    "code": "TSR",
    "name": "TALSTAR 100",
    "unit": "H87",
    "satCode": "10191500",
    "departmentName": "EISENIA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 652.7,
        "isDefault": true
      }
    ]
  },
  {
    "code": "CAB",
    "name": "CABO ZINC 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "EL ING OCOTLAN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 262.2,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 238.89
      }
    ]
  },
  {
    "code": "DAP",
    "name": "DAP-ISQUISA",
    "unit": "H87",
    "satCode": "10171602",
    "departmentName": "EL ING OCOTLAN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 524.39,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 440
      }
    ]
  },
  {
    "code": "EVER",
    "name": "EVEREX 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "EL ING OCOTLAN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 169.51,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 154.44
      }
    ]
  },
  {
    "code": "FULL",
    "name": "FULL-GRO 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "EL ING OCOTLAN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 498.78,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 454.44
      }
    ]
  },
  {
    "code": "GRO",
    "name": "GRO-BOMO",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "EL ING OCOTLAN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 195.12,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 177.78
      }
    ]
  },
  {
    "code": "HAVAC",
    "name": "HAVOC PELLET 1KG",
    "unit": "H87",
    "satCode": "10191509",
    "departmentName": "EL ING OCOTLAN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 290,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 260
      }
    ]
  },
  {
    "code": "HIER",
    "name": "HIERBAMINA",
    "unit": "H87",
    "satCode": "10171700",
    "departmentName": "EL ING OCOTLAN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 165,
        "isDefault": true
      }
    ]
  },
  {
    "code": "HUMI",
    "name": "HUMICS-95 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "EL ING OCOTLAN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 219.51,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 200
      }
    ]
  },
  {
    "code": "MAIZH",
    "name": "MAIZ H377",
    "unit": "H87",
    "satCode": "50221001",
    "departmentName": "EL ING OCOTLAN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2240,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1800
      }
    ]
  },
  {
    "code": "MAIZSORE",
    "name": "MAIZ SORENTO 60000",
    "unit": "H87",
    "satCode": "50221001",
    "departmentName": "EL ING OCOTLAN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2850,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2450
      }
    ]
  },
  {
    "code": "PAQ_ELUMI",
    "name": "PAQ. ELUMIS (GESAPRIM/PRIMAGRAM)",
    "unit": "H87",
    "satCode": "10191509",
    "departmentName": "EL ING OCOTLAN",
    "ivaRaw": 0,
    "iepsRaw": 6,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1020,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 920
      }
    ]
  },
  {
    "code": "PH",
    "name": "PUSH 5L",
    "unit": "H87",
    "satCode": "10191509",
    "departmentName": "EL ING OCOTLAN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 506.1,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 500
      }
    ]
  },
  {
    "code": "ROOTF",
    "name": "ROOT FACTOR 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "EL ING OCOTLAN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 487.8,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 444.44
      }
    ]
  },
  {
    "code": "SEAZ",
    "name": "SEAZYME 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "EL ING OCOTLAN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 587.8,
        "isDefault": true
      }
    ]
  },
  {
    "code": "SEAZY",
    "name": "SEAZYME 250ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "EL ING OCOTLAN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 157.32,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 143.33
      }
    ]
  },
  {
    "code": "SWT",
    "name": "SWEET 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "EL ING OCOTLAN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 738.68,
        "isDefault": true
      }
    ]
  },
  {
    "code": "UREA",
    "name": "UREA-ISQUISA",
    "unit": "H87",
    "satCode": "10171602",
    "departmentName": "EL ING OCOTLAN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 347.56,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 330
      }
    ]
  },
  {
    "code": "X_PAN",
    "name": "X-PANSOR 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "EL ING OCOTLAN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 729.27,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 664.44
      }
    ]
  },
  {
    "code": "X_PLE",
    "name": "X-PLENDOR 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "EL ING OCOTLAN",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1129.27,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1028.89
      }
    ]
  },
  {
    "code": "BOMHUSK",
    "name": "BOMBA HUSKY ELECTRICA Y MANUAL",
    "unit": "H87",
    "satCode": "40151500",
    "departmentName": "ESTEFANIA ARELLANES MACHORRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1750,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1600
      }
    ]
  },
  {
    "code": "FIAT20L",
    "name": "FIAT 20 L AZUL",
    "unit": "H87",
    "satCode": "21101800",
    "departmentName": "ESTEFANIA ARELLANES MACHORRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 500,
        "isDefault": true
      }
    ]
  },
  {
    "code": "FIAT25L",
    "name": "FIAT 25 LITROS 35CC 4 TIEMPOS",
    "unit": "H87",
    "satCode": "21101800",
    "departmentName": "ESTEFANIA ARELLANES MACHORRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2800,
        "isDefault": true
      }
    ]
  },
  {
    "code": "NMG",
    "name": "MAGNIT SACOS 25 KG",
    "unit": "H87",
    "satCode": "12352300",
    "departmentName": "FERTILIZANTES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 510,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 417.88
      }
    ]
  },
  {
    "code": "ANT",
    "name": "ACIDO NITRICO 55% 20L",
    "unit": "H87",
    "satCode": "12352301",
    "departmentName": "FERTILIZANTES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 520,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 485
      }
    ]
  },
  {
    "code": "ASF",
    "name": "ACIDO SULFURICO 98% 20L",
    "unit": "H87",
    "satCode": "12352301",
    "departmentName": "FERTILIZANTES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 800.11,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 772
      }
    ]
  },
  {
    "code": "NCB",
    "name": "CALCIO BI   25 KG",
    "unit": "H87",
    "satCode": "10171611",
    "departmentName": "FERTILIZANTES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 413.35,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 395.95
      }
    ]
  },
  {
    "code": "CTT",
    "name": "CINTILLA TORO",
    "unit": "H87",
    "satCode": "70171700",
    "departmentName": "FERTILIZANTES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3250,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 3150
      }
    ]
  },
  {
    "code": "CCA",
    "name": "CLORURO DE CALCIO",
    "unit": "H87",
    "satCode": "10171611",
    "departmentName": "FERTILIZANTES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 390,
        "isDefault": true
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 367
      }
    ]
  },
  {
    "code": "CLK",
    "name": "CLORURO DE POTASIO 25 KG",
    "unit": "H87",
    "satCode": "10171602",
    "departmentName": "FERTILIZANTES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 375,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 328.4
      }
    ]
  },
  {
    "code": "KRF",
    "name": "KERF 25 KG",
    "unit": "H87",
    "satCode": "10171602",
    "departmentName": "FERTILIZANTES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 726.3,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 688.87
      }
    ]
  },
  {
    "code": "MAP",
    "name": "MAP SACO 25 KG",
    "unit": "H87",
    "satCode": "12141909",
    "departmentName": "FERTILIZANTES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 907.77,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 879.11
      }
    ]
  },
  {
    "code": "MKP",
    "name": "MKP SACO 25 KG",
    "unit": "H87",
    "satCode": "10171603",
    "departmentName": "FERTILIZANTES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1132.05,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1103.03
      }
    ]
  },
  {
    "code": "NAIII",
    "name": "NITRO-ABLE III",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FERTILIZANTES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 920,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 890
      }
    ]
  },
  {
    "code": "NKS",
    "name": "NKS 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FERTILIZANTES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 696.24,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 667.53
      }
    ]
  },
  {
    "code": "SLR",
    "name": "SOLUBOR 25KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FERTILIZANTES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1360,
        "isDefault": true
      }
    ]
  },
  {
    "code": "SLC",
    "name": "SOLUCROS SACO 25 KG",
    "unit": "H87",
    "satCode": "10171602",
    "departmentName": "FERTILIZANTES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 660,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 600
      }
    ]
  },
  {
    "code": "SULMAG",
    "name": "SULMAG SACO 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FERTILIZANTES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 247.39,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 234.37
      }
    ]
  },
  {
    "code": "MXGO",
    "name": "MAXI-GROW EXCEL 250ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FERTIRRIEGOS BARRITA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 99.5,
        "isDefault": true
      }
    ]
  },
  {
    "code": "MAGO",
    "name": "MAXI-GROW EXCEL1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FERTIRRIEGOS BARRITA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 360,
        "isDefault": true
      }
    ]
  },
  {
    "code": "OVI",
    "name": "OVIE DIE 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FERTIRRIEGOS BARRITA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 443,
        "isDefault": true
      }
    ]
  },
  {
    "code": "STOPP",
    "name": "STOPPLEX",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FERTIRRIEGOS BARRITA",
    "ivaRaw": 0,
    "iepsRaw": 6,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 372,
        "isDefault": true
      }
    ]
  },
  {
    "code": "AGR1OUT",
    "name": "*AGRIMENCTIN 1 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FORMULABAGRO OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 322.5,
        "isDefault": true
      }
    ]
  },
  {
    "code": "EXBAC_OUT",
    "name": "*EXTRABACTER 1 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FORMULABAGRO OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 560,
        "isDefault": true
      }
    ]
  },
  {
    "code": "F81",
    "name": "*F 8 24 1 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FORMULABAGRO OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 60,
        "isDefault": true
      }
    ]
  },
  {
    "code": "FORMU824",
    "name": "*FORMU 8 24 0 20 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FORMULABAGRO OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 960,
        "isDefault": true
      }
    ]
  },
  {
    "code": "FORFO_OUT",
    "name": "*FORMUFOSFORO 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FORMULABAGRO OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 170,
        "isDefault": true
      }
    ]
  },
  {
    "code": "HOROUT",
    "name": "*HORMOMAX 1 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FORMULABAGRO OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 327.75,
        "isDefault": true
      }
    ]
  },
  {
    "code": "NEEO",
    "name": "*NEEMGROW 1 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FORMULABAGRO OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 446.25,
        "isDefault": true
      }
    ]
  },
  {
    "code": "OXE",
    "name": "*OXIFORTE 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FORMULABAGRO OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 650,
        "isDefault": true
      }
    ]
  },
  {
    "code": "SWDOUT",
    "name": "*SEAWEED 25 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FORMULABAGRO OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 250,
        "isDefault": true
      }
    ]
  },
  {
    "code": "SUL",
    "name": "*SULFACU 1 LT *",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FORMULABAGRO OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 449,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 449
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 449
      }
    ]
  },
  {
    "code": "SCAO",
    "name": "*SUPER CABO 1 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FORMULABAGRO OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 180,
        "isDefault": true
      }
    ]
  },
  {
    "code": "ANGS",
    "name": "ANGLOSAN 1L",
    "unit": "H87",
    "satCode": "47131803",
    "departmentName": "FRANCISCO FIGUEROA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 850,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 816.69
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 777.8
      }
    ]
  },
  {
    "code": "ANGL5",
    "name": "ANGLOSAN 5L",
    "unit": "H87",
    "satCode": "47131803",
    "departmentName": "FRANCISCO FIGUEROA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3750.26,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 3375.14
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 3187.63
      }
    ]
  },
  {
    "code": "AGSIL",
    "name": "ANGLOSIL 20 L",
    "unit": "H87",
    "satCode": "47131803",
    "departmentName": "FRANCISCO FIGUEROA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2322,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2222
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 2150
      }
    ]
  },
  {
    "code": "ANG",
    "name": "ANGLOSIL NSF 4L",
    "unit": "H87",
    "satCode": "47131803",
    "departmentName": "FRANCISCO FIGUEROA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 599,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 573.8
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 546.48
      }
    ]
  },
  {
    "code": "BIOC",
    "name": "BIOGLUC 10L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "FRANCISCO FIGUEROA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 899,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 840
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 795
      }
    ]
  },
  {
    "code": "GLUT",
    "name": "GLUTASAN 50 1L",
    "unit": "H87",
    "satCode": "47131803",
    "departmentName": "FRANCISCO FIGUEROA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 880,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 824
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 799
      }
    ]
  },
  {
    "code": "GLUT5",
    "name": "GLUTASAN 5L",
    "unit": "H87",
    "satCode": "47131803",
    "departmentName": "FRANCISCO FIGUEROA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 4151.22,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 3736.1
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 3528.54
      }
    ]
  },
  {
    "code": "BLAM",
    "name": "BLAUKAM CLASIC 25KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "GABINO BARRITA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 570,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 530
      }
    ]
  },
  {
    "code": "EVIS",
    "name": "EVISECT 500GR",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "GABINO BARRITA",
    "ivaRaw": 0,
    "iepsRaw": 6,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1159.76,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1056.67
      }
    ]
  },
  {
    "code": "HAKAZU",
    "name": "HAKAPHOS AZUL 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "GABINO BARRITA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 720,
        "isDefault": true
      }
    ]
  },
  {
    "code": "HAKBA",
    "name": "HAKAPHOS BASE 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "GABINO BARRITA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1210,
        "isDefault": true
      }
    ]
  },
  {
    "code": "HAKVI",
    "name": "HAKAPHOS VIOLETA 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "GABINO BARRITA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1210,
        "isDefault": true
      }
    ]
  },
  {
    "code": "HYDCATR",
    "name": "HYDROSPEED CAB MAX",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "GABINO BARRITA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 700,
        "isDefault": true
      }
    ]
  },
  {
    "code": "HYD_GROW",
    "name": "HYDROSPEED GROWH",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "GABINO BARRITA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1200,
        "isDefault": true
      }
    ]
  },
  {
    "code": "BBACIL",
    "name": "BIBACIL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "IBAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 350,
        "isDefault": true
      }
    ]
  },
  {
    "code": "BSAR",
    "name": "BIOSARIA 1 L",
    "unit": "H87",
    "satCode": "10171607",
    "departmentName": "IBAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 373.33,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 336
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 317.33
      }
    ]
  },
  {
    "code": "BIOV",
    "name": "BIOVIGOR 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "IBAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 493.33,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 444
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 419.33
      }
    ]
  },
  {
    "code": "HUMX",
    "name": "HUMIXTRON 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "IBAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 320,
        "isDefault": true
      }
    ]
  },
  {
    "code": "LAR",
    "name": "LARBIA 1 LT",
    "unit": "H87",
    "satCode": "10171607",
    "departmentName": "IBAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 373.33,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 336
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 317.33
      }
    ]
  },
  {
    "code": "NMC",
    "name": "NEMACONTROL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "IBAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 640,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 576
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 544
      }
    ]
  },
  {
    "code": "PLIM",
    "name": "PLINIUM 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "IBAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 386.67,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 348
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 328.67
      }
    ]
  },
  {
    "code": "BTN",
    "name": "SUPER BTN 5L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "IBAGRO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1200,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1080
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1020
      }
    ]
  },
  {
    "code": "QCOU",
    "name": "*QUIVER CUAJE 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INACTIVOS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 328.24,
        "isDefault": true
      }
    ]
  },
  {
    "code": "FRUC",
    "name": "FRUCTON 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INACTIVOS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 648,
        "isDefault": true
      }
    ]
  },
  {
    "code": "AGRI_1L",
    "name": "AGRIMEC 1L 10%",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1240,
        "isDefault": true
      }
    ]
  },
  {
    "code": "AGRI_250MIL",
    "name": "AGRIMEC 250 MIL 10%",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 362,
        "isDefault": true
      }
    ]
  },
  {
    "code": "AGM",
    "name": "AGRIMY CU 100 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 6,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 379.96,
        "isDefault": true
      }
    ]
  },
  {
    "code": "ALIET",
    "name": "ALIETTE 2KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1053.66,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 960
      }
    ]
  },
  {
    "code": "AMIR",
    "name": "AMISTAR 100 GR-10%",
    "unit": "H87",
    "satCode": "10171702",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 6,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 444,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 380
      }
    ]
  },
  {
    "code": "BTL",
    "name": "BACTROL 2X 800GR",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 710,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 669
      }
    ]
  },
  {
    "code": "BAYN",
    "name": "BAYFOLAN FORTE SL 11 1L",
    "unit": "H87",
    "satCode": "10171601",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 105,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 95
      }
    ]
  },
  {
    "code": "CAIO",
    "name": "CABRIO C 800 GR",
    "unit": "H87",
    "satCode": "10171702",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 6,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1900.8,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2150
      }
    ]
  },
  {
    "code": "ELE",
    "name": "ELESTAL 300ML",
    "unit": "H87",
    "satCode": "10191509",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1395,
        "isDefault": true
      }
    ]
  },
  {
    "code": "FAEN",
    "name": "FAENA CLASICO 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 170,
        "isDefault": true
      }
    ]
  },
  {
    "code": "FAFR",
    "name": "FAENA FUERTE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 210,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 188
      }
    ]
  },
  {
    "code": "FTC",
    "name": "FERTIPOL CUAJE 500GRS 10% (24)",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 521,
        "isDefault": true
      }
    ]
  },
  {
    "code": "FERG",
    "name": "FERTIPOL GRANDE 500 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 706.44,
        "isDefault": true
      }
    ]
  },
  {
    "code": "FIBR",
    "name": "FINALBACTER 800 GR-105%\"20\"",
    "unit": "H87",
    "satCode": "10171702",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 705,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 660
      }
    ]
  },
  {
    "code": "FINB",
    "name": "FINALBACTER250GRS-105240\"",
    "unit": "H87",
    "satCode": "10171702",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 320,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 290
      }
    ]
  },
  {
    "code": "FOL",
    "name": "FOLEY REY 950ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 329.27,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 300
      }
    ]
  },
  {
    "code": "FLC",
    "name": "FOLIRCUR EW250 1L",
    "unit": "H87",
    "satCode": "10171702",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 6,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 865,
        "isDefault": true
      }
    ]
  },
  {
    "code": "GARN",
    "name": "GALARDON 150SL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 160,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 130
      }
    ]
  },
  {
    "code": "GRA",
    "name": "GRANERIL 1KG-20%",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 6,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 89,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 78
      }
    ]
  },
  {
    "code": "HER",
    "name": "HERBIPOL GLIFOSATO 970ML",
    "unit": "H87",
    "satCode": "10171700",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 190,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 140
      }
    ]
  },
  {
    "code": "NEW_LEVE",
    "name": "NEW LEVERAGE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 370,
        "isDefault": true
      }
    ]
  },
  {
    "code": "OBRSP",
    "name": "OBERON  SC240 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2460,
        "isDefault": true
      }
    ]
  },
  {
    "code": "ORE",
    "name": "OREGON 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2567.07,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2338.89
      }
    ]
  },
  {
    "code": "PRR",
    "name": "PREVICUR ENERGY SL840 1L",
    "unit": "H87",
    "satCode": "10171702",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1306.67,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1292.31
      }
    ]
  },
  {
    "code": "SEC",
    "name": "SECADOR 900ML",
    "unit": "H87",
    "satCode": "10171700",
    "departmentName": "INNES",
    "ivaRaw": 0,
    "iepsRaw": 7,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 99,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 70
      }
    ]
  },
  {
    "code": "AK1",
    "name": "ALGAK 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 376,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 338.4
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 319.6
      },
      {
        "tierName": "Precio 4",
        "value": 293.56
      }
    ]
  },
  {
    "code": "AT10",
    "name": "ATP UP 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3940,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 3546
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 3349
      },
      {
        "tierName": "Precio 4",
        "value": 3230.8
      }
    ]
  },
  {
    "code": "AT1",
    "name": "ATP UP 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 434,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 390.6
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 368.9
      },
      {
        "tierName": "Precio 4",
        "value": 355.88
      }
    ]
  },
  {
    "code": "BLO10",
    "name": "BALOX 10 LTS",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 5940,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 5346
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 5049
      },
      {
        "tierName": "Precio 4",
        "value": 4870.8
      }
    ]
  },
  {
    "code": "BLOX1",
    "name": "BALOX 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 615,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 553.5
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 522.75
      },
      {
        "tierName": "Precio 4",
        "value": 504.3
      }
    ]
  },
  {
    "code": "BET",
    "name": "BESTCURE 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1080,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 972
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 918
      },
      {
        "tierName": "Precio 4",
        "value": 885.6
      }
    ]
  },
  {
    "code": "BIOC1",
    "name": "BIOCINNAFOL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 870,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 783
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 739.5
      },
      {
        "tierName": "Precio 4",
        "value": 713.4
      }
    ]
  },
  {
    "code": "BIOCR10",
    "name": "BIOCRIFOL 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 15400,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 13860
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 13090
      },
      {
        "tierName": "Precio 4",
        "value": 12628
      }
    ]
  },
  {
    "code": "BIOCRIF1",
    "name": "BIOCRIFOL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1650,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1485
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1402.5
      },
      {
        "tierName": "Precio 4",
        "value": 1353
      }
    ]
  },
  {
    "code": "BF1KG",
    "name": "BIOFIT G 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 292,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 262.8
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 248.2
      },
      {
        "tierName": "Precio 4",
        "value": 239.44
      }
    ]
  },
  {
    "code": "BG20",
    "name": "BIOFIT G 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 5640,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 5076
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 4794
      },
      {
        "tierName": "Precio 4",
        "value": 4624.8
      }
    ]
  },
  {
    "code": "BIO",
    "name": "BIOFIT RTU 1 KG.",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 851,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 765.9
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 723.35
      },
      {
        "tierName": "Precio 4",
        "value": 697.82
      }
    ]
  },
  {
    "code": "BFIT333",
    "name": "BIOFIT RTU 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 293.66,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 264.29
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 249.61
      },
      {
        "tierName": "Precio 4",
        "value": 240.8
      }
    ]
  },
  {
    "code": "BUP10",
    "name": "BRIX UP 10L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3760,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 3384
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 3196
      },
      {
        "tierName": "Precio 4",
        "value": 3083.2
      }
    ]
  },
  {
    "code": "CFE1",
    "name": "CARBOXY FE 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 412,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 370.8
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 350.2
      },
      {
        "tierName": "Precio 4",
        "value": 337.84
      }
    ]
  },
  {
    "code": "CFE",
    "name": "CARBOXY FE 5 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2000,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1800
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1700
      },
      {
        "tierName": "Precio 4",
        "value": 1640
      }
    ]
  },
  {
    "code": "CK10",
    "name": "CARBOXY K 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1940,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1746
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1649
      },
      {
        "tierName": "Precio 4",
        "value": 1590.8
      }
    ]
  },
  {
    "code": "CK1",
    "name": "CARBOXY K 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 223,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 200.7
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 189.55
      },
      {
        "tierName": "Precio 4",
        "value": 182.86
      }
    ]
  },
  {
    "code": "CK20",
    "name": "CARBOXY K 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3520,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 3168
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 2992
      },
      {
        "tierName": "Precio 4",
        "value": 2886.4
      }
    ]
  },
  {
    "code": "CKX",
    "name": "CARBOXY K MAX 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 288,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 259.2
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 244.8
      },
      {
        "tierName": "Precio 4",
        "value": 236.16
      }
    ]
  },
  {
    "code": "CL1",
    "name": "CARBOXY L 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 212,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 190.8
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 180.2
      },
      {
        "tierName": "Precio 4",
        "value": 173.84
      }
    ]
  },
  {
    "code": "CL10",
    "name": "CARBOXY L 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1800,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1620
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1530
      },
      {
        "tierName": "Precio 4",
        "value": 1476
      }
    ]
  },
  {
    "code": "CMCRO1",
    "name": "CARBOXY MICRO 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 319,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 287.1
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 271.15
      },
      {
        "tierName": "Precio 4",
        "value": 261.58
      }
    ]
  },
  {
    "code": "CMCRO",
    "name": "CARBOXY MICRO 5 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1475,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1327.5
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1253.75
      },
      {
        "tierName": "Precio 4",
        "value": 1209.5
      }
    ]
  },
  {
    "code": "CMING",
    "name": "CARBOXY MIN G 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2375,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2137.5
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 2018.75
      },
      {
        "tierName": "Precio 4",
        "value": 1947.5
      }
    ]
  },
  {
    "code": "CMIN1",
    "name": "CARBOXY MIN L 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 198,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 178.2
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 168.3
      },
      {
        "tierName": "Precio 4",
        "value": 162.36
      }
    ]
  },
  {
    "code": "CMIN10",
    "name": "CARBOXY MIN L 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1630,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1467
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1385.5
      },
      {
        "tierName": "Precio 4",
        "value": 1336.6
      }
    ]
  },
  {
    "code": "CMIN20",
    "name": "CARBOXY MIN L 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2980,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2682
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 2533
      },
      {
        "tierName": "Precio 4",
        "value": 2443.6
      }
    ]
  },
  {
    "code": "CCZ",
    "name": "CARBOXY ZINC 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 401,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 360.9
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 340.85
      },
      {
        "tierName": "Precio 4",
        "value": 328.82
      }
    ]
  },
  {
    "code": "CZN",
    "name": "CARBOXY ZINC 5 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1945,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1750.5
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1653.25
      },
      {
        "tierName": "Precio 4",
        "value": 1594.9
      }
    ]
  },
  {
    "code": "CVK1",
    "name": "CUVREK 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 360,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 324
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 306
      },
      {
        "tierName": "Precio 4",
        "value": 295.2
      }
    ]
  },
  {
    "code": "EB1",
    "name": "ENERBOOST 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 398,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 358.2
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 338.3
      },
      {
        "tierName": "Precio 4",
        "value": 326.36
      }
    ]
  },
  {
    "code": "FOS1",
    "name": "FOSFONICUR 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 447,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 402.3
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 379.95
      },
      {
        "tierName": "Precio 4",
        "value": 366.54
      }
    ]
  },
  {
    "code": "HAD1",
    "name": "HADDAK 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 679,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 627.3
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 592.45
      },
      {
        "tierName": "Precio 4",
        "value": 571.54
      }
    ]
  },
  {
    "code": "HAD10",
    "name": "HADDAK 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 6630,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 5967
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 5635.5
      },
      {
        "tierName": "Precio 4",
        "value": 5436.6
      }
    ]
  },
  {
    "code": "MDAL1",
    "name": "MEDAL 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 684,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 615.6
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 581.4
      },
      {
        "tierName": "Precio 4",
        "value": 560.88
      }
    ]
  },
  {
    "code": "MDAL10",
    "name": "MEDAL 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 6330,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 5697
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 5380.5
      },
      {
        "tierName": "Precio 4",
        "value": 5190.6
      }
    ]
  },
  {
    "code": "MROOT1",
    "name": "MYCOROOT 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1715,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1543.5
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1457.75
      },
      {
        "tierName": "Precio 4",
        "value": 1406.3
      }
    ]
  },
  {
    "code": "MROOT333",
    "name": "MYCOROOT 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 581.66,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 523.49
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 494.41
      },
      {
        "tierName": "Precio 4",
        "value": 476.96
      }
    ]
  },
  {
    "code": "NROOT1",
    "name": "NEMAROOT 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1700,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1530
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1445
      },
      {
        "tierName": "Precio 4",
        "value": 1394
      }
    ]
  },
  {
    "code": "N333",
    "name": "NEMAROOT 333 GRS.",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 576.66,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 518.99
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 490.16
      },
      {
        "tierName": "Precio 4",
        "value": 472.86
      }
    ]
  },
  {
    "code": "NUTG",
    "name": "NUTRISORB GRANULADO 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 4300,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 3870
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 3655
      },
      {
        "tierName": "Precio 4",
        "value": 3526
      }
    ]
  },
  {
    "code": "NUT1",
    "name": "NUTRISORB L 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 398,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 358.2
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 338.3
      },
      {
        "tierName": "Precio 4",
        "value": 326.36
      }
    ]
  },
  {
    "code": "NUT10",
    "name": "NUTRISORB L 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3680,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 3312
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 3128
      },
      {
        "tierName": "Precio 4",
        "value": 3017.6
      }
    ]
  },
  {
    "code": "NUT20",
    "name": "NUTRISORB L 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 6680,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 6012
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 5678
      },
      {
        "tierName": "Precio 4",
        "value": 5477.6
      }
    ]
  },
  {
    "code": "NUT200",
    "name": "NUTRISORB L 200 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 66200,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 59580
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 56270
      },
      {
        "tierName": "Precio 4",
        "value": 54284
      }
    ]
  },
  {
    "code": "NUX",
    "name": "NUUTRIMAK+  VIGOR 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 274,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 246.6
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 232.9
      },
      {
        "tierName": "Precio 4",
        "value": 224.68
      }
    ]
  },
  {
    "code": "NUTD",
    "name": "NUUTRIMAK+ DESARROLLO 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 406,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 365.4
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 345.1
      },
      {
        "tierName": "Precio 4",
        "value": 332.92
      }
    ]
  },
  {
    "code": "PK1",
    "name": "PACKHARD 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 277,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 249.3
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 235.45
      },
      {
        "tierName": "Precio 4",
        "value": 227.14
      }
    ]
  },
  {
    "code": "PK10",
    "name": "PACKHARD 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2470,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2223
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 2099.5
      },
      {
        "tierName": "Precio 4",
        "value": 2025.4
      }
    ]
  },
  {
    "code": "PK20",
    "name": "PACKHARD 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 4460,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 4014
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 3791
      },
      {
        "tierName": "Precio 4",
        "value": 3657.2
      }
    ]
  },
  {
    "code": "PG1",
    "name": "PGR IV  1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1083,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 974.7
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 920.55
      },
      {
        "tierName": "Precio 4",
        "value": 888.06
      }
    ]
  },
  {
    "code": "PREVN",
    "name": "PREVENT UP 10LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3998,
        "isDefault": true
      }
    ]
  },
  {
    "code": "PVUP1",
    "name": "PREVENT UP 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 564,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 507.6
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 479.4
      },
      {
        "tierName": "Precio 4",
        "value": 462.48
      }
    ]
  },
  {
    "code": "PRO1",
    "name": "PROBORATE 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 203,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 182.7
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 172.55
      },
      {
        "tierName": "Precio 4",
        "value": 166.46
      }
    ]
  },
  {
    "code": "P5X10",
    "name": "PROMESOL 5X 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1484,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1335.6
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1261.4
      },
      {
        "tierName": "Precio 4",
        "value": 1216.88
      }
    ]
  },
  {
    "code": "P5X20",
    "name": "PROMESOL 5X 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2840,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2556
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 2414
      },
      {
        "tierName": "Precio 4",
        "value": 2328.8
      }
    ]
  },
  {
    "code": "P5X200",
    "name": "PROMESOL 5X 200 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 28000,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 25200
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 23800
      },
      {
        "tierName": "Precio 4",
        "value": 22960
      }
    ]
  },
  {
    "code": "PCA20",
    "name": "PROMESOL CA 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3380,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 3042
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 2873
      },
      {
        "tierName": "Precio 4",
        "value": 2771.6
      }
    ]
  },
  {
    "code": "PCA200",
    "name": "PROMESOL CA 200 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 33600,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 30240
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 28560
      },
      {
        "tierName": "Precio 4",
        "value": 27552
      }
    ]
  },
  {
    "code": "PMSG",
    "name": "PROMESOL G  SACO 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3325,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2992.5
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 2826.25
      },
      {
        "tierName": "Precio 4",
        "value": 2726.5
      }
    ]
  },
  {
    "code": "PFE1",
    "name": "PROQUELATE FE 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 149,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 134.1
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 126.65
      },
      {
        "tierName": "Precio 4",
        "value": 122.18
      }
    ]
  },
  {
    "code": "PMG1",
    "name": "PROQUELATE MG 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 149,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 134.1
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 126.65
      },
      {
        "tierName": "Precio 4",
        "value": 122.18
      }
    ]
  },
  {
    "code": "PROMN",
    "name": "PROQUELATE MN 1 LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 164,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 147.6
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 139.4
      },
      {
        "tierName": "Precio 4",
        "value": 134.48
      }
    ]
  },
  {
    "code": "PZN1",
    "name": "PROQUELATE ZINC 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 164,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 147.6
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 139.4
      },
      {
        "tierName": "Precio 4",
        "value": 134.48
      }
    ]
  },
  {
    "code": "RAD1",
    "name": "RADIGROW 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 541,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 486.9
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 459.85
      },
      {
        "tierName": "Precio 4",
        "value": 443.62
      }
    ]
  },
  {
    "code": "RAD10",
    "name": "RADIGROW 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 4960,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 4464
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 4216
      },
      {
        "tierName": "Precio 4",
        "value": 4067.2
      }
    ]
  },
  {
    "code": "RAD20",
    "name": "RADIGROW 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 9140,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 8226
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 7769
      },
      {
        "tierName": "Precio 4",
        "value": 7494.8
      }
    ]
  },
  {
    "code": "RAD200",
    "name": "RADIGROW 200 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 87800,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 79020
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 74630
      },
      {
        "tierName": "Precio 4",
        "value": 71996
      }
    ]
  },
  {
    "code": "RADG25",
    "name": "RADIGROW G 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 5375,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 4837.5
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 4568.75
      },
      {
        "tierName": "Precio 4",
        "value": 4407.5
      }
    ]
  },
  {
    "code": "RTX",
    "name": "RHIZO TX 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1414,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1272.6
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1201.9
      },
      {
        "tierName": "Precio 4",
        "value": 1159.48
      }
    ]
  },
  {
    "code": "RHIZCOM",
    "name": "RHIZOBAC COMBI 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 562,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 505.8
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 477.7
      },
      {
        "tierName": "Precio 4",
        "value": 460.84
      }
    ]
  },
  {
    "code": "RBACK1",
    "name": "RHIZOBAC COMBI I KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1656,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1490.4
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1407.6
      },
      {
        "tierName": "Precio 4",
        "value": 1357.92
      }
    ]
  },
  {
    "code": "RHITX333",
    "name": "RHIZOTX 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 481.33,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 433.2
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 409.13
      },
      {
        "tierName": "Precio 4",
        "value": 394.69
      }
    ]
  },
  {
    "code": "RYSN1",
    "name": "RYSANBIO 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1462,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1315.8
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1242.7
      },
      {
        "tierName": "Precio 4",
        "value": 1198.84
      }
    ]
  },
  {
    "code": "SEL1",
    "name": "SELECTO XL 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1044,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 939.6
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 887.4
      },
      {
        "tierName": "Precio 4",
        "value": 856.08
      }
    ]
  },
  {
    "code": "SEL10",
    "name": "SELECTO XL 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 9900,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 8910
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 8415
      },
      {
        "tierName": "Precio 4",
        "value": 8118
      }
    ]
  },
  {
    "code": "STFM1",
    "name": "STAR FEED MICRO SC 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 313,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 281.7
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 266.05
      },
      {
        "tierName": "Precio 4",
        "value": 256.66
      }
    ]
  },
  {
    "code": "TK1",
    "name": "TKROOT 1 KG.",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1365,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1228.5
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1160.25
      },
      {
        "tierName": "Precio 4",
        "value": 1119.3
      }
    ]
  },
  {
    "code": "TKR333",
    "name": "TKROOT 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 465,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 418.5
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 395.25
      },
      {
        "tierName": "Precio 4",
        "value": 381.3
      }
    ]
  },
  {
    "code": "UTL",
    "name": "ULTRA V 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 352,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 316.8
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 299.2
      },
      {
        "tierName": "Precio 4",
        "value": 288.64
      }
    ]
  },
  {
    "code": "VER10",
    "name": "VERNUM 10 LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1270,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1143
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1079.5
      },
      {
        "tierName": "Precio 4",
        "value": 1041.4
      }
    ]
  },
  {
    "code": "VER20",
    "name": "VERNUM 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK GLOBAL",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2320,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2088
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1972
      },
      {
        "tierName": "Precio 4",
        "value": 1902.4
      }
    ]
  },
  {
    "code": "ATPO",
    "name": "*ATP 1 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2500,
        "isDefault": true
      }
    ]
  },
  {
    "code": "ATPOUT",
    "name": "*ATP 10 L *",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 5200,
        "isDefault": true
      }
    ]
  },
  {
    "code": "ATOUT",
    "name": "*ATP UP 20L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 430,
        "isDefault": true
      }
    ]
  },
  {
    "code": "BLOUT",
    "name": "*BALOX 01 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 0.3,
        "isDefault": true
      }
    ]
  },
  {
    "code": "BAL10",
    "name": "*BALOX 10L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 890,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 0.2
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 0.1
      }
    ]
  },
  {
    "code": "BST1L",
    "name": "*BEST CURE*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 700,
        "isDefault": true
      }
    ]
  },
  {
    "code": "BIOC_1LT",
    "name": "*BIOCINNAFOL 1 LT*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1440,
        "isDefault": true
      }
    ]
  },
  {
    "code": "BIOFIT",
    "name": "*BIOFIT RTU  1 KG *",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2700,
        "isDefault": true
      }
    ]
  },
  {
    "code": "BUP10O",
    "name": "*BRIX UP 10 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1139.6,
        "isDefault": true
      }
    ]
  },
  {
    "code": "CARB_FE",
    "name": "*CARBOXY FE 5 KG*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1102.6,
        "isDefault": true
      }
    ]
  },
  {
    "code": "CK10_OUT",
    "name": "*CARBOXY K 10 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 139.86,
        "isDefault": true
      }
    ]
  },
  {
    "code": "CKO",
    "name": "*CARBOXY K 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 263,
        "isDefault": true
      }
    ]
  },
  {
    "code": "CAROUT20",
    "name": "*CARBOXY K20L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1200,
        "isDefault": true
      }
    ]
  },
  {
    "code": "CL10_OUT",
    "name": "*CARBOXY L 10L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 140,
        "isDefault": true
      }
    ]
  },
  {
    "code": "CL1OUT",
    "name": "*CARBOXY L 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 130,
        "isDefault": true
      }
    ]
  },
  {
    "code": "CARB_MIN",
    "name": "*CARBOXY MIN L 1 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1100,
        "isDefault": true
      }
    ]
  },
  {
    "code": "CMIN10O",
    "name": "*CARBOXY MIN L 10 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 900,
        "isDefault": true
      }
    ]
  },
  {
    "code": "CARB_ZN",
    "name": "*CARBOXY ZN*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1424.5,
        "isDefault": true
      }
    ]
  },
  {
    "code": "CMGOUT",
    "name": "*CARBOXYMIN G 25 K*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2100,
        "isDefault": true
      }
    ]
  },
  {
    "code": "CMINL20",
    "name": "*CARBXY MIN L 20L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 200,
        "isDefault": true
      }
    ]
  },
  {
    "code": "CVKOUT",
    "name": "*CUVREK 1 KG*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 406,
        "isDefault": true
      }
    ]
  },
  {
    "code": "MED10",
    "name": "*MEDAL 10 L *",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 420,
        "isDefault": true
      }
    ]
  },
  {
    "code": "MEDO",
    "name": "*MEDAL 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 140,
        "isDefault": true
      }
    ]
  },
  {
    "code": "MEDA",
    "name": "*MEDAL 250ML*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 16,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1100,
        "isDefault": true
      }
    ]
  },
  {
    "code": "MYCOUT",
    "name": "*MYCORROT 1 KG *",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1000,
        "isDefault": true
      }
    ]
  },
  {
    "code": "NUTGOUT",
    "name": "*NUTRISORB GRANULADO  25KG*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 231.62,
        "isDefault": true
      }
    ]
  },
  {
    "code": "NUT1OUT",
    "name": "*NUTRISORB L 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 162.06,
        "isDefault": true
      }
    ]
  },
  {
    "code": "PACO",
    "name": "*PACKHARD 1 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3000,
        "isDefault": true
      }
    ]
  },
  {
    "code": "PCKH20",
    "name": "*PACKHARD 20 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 700,
        "isDefault": true
      }
    ]
  },
  {
    "code": "PGOUT",
    "name": "*PGR 1 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 300,
        "isDefault": true
      }
    ]
  },
  {
    "code": "PRE_UP",
    "name": "*PREVEN UP 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 100,
        "isDefault": true
      }
    ]
  },
  {
    "code": "PROU",
    "name": "*PROBORATE 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 800,
        "isDefault": true
      }
    ]
  },
  {
    "code": "PRO20OUT",
    "name": "*PROBORATE 20 L OUT*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1800,
        "isDefault": true
      }
    ]
  },
  {
    "code": "PROG_OUT",
    "name": "*PROMESOL G 25 KG ROTO",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 90,
        "isDefault": true
      }
    ]
  },
  {
    "code": "PROFEOUT",
    "name": "*PROQUELATE FE 1 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 90,
        "isDefault": true
      }
    ]
  },
  {
    "code": "PMGOUT",
    "name": "*PROQUELATE MAGNESIO 1 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 90,
        "isDefault": true
      }
    ]
  },
  {
    "code": "PROMN_OUT",
    "name": "*PROQUELATE MN 1 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 90,
        "isDefault": true
      }
    ]
  },
  {
    "code": "PROQZN",
    "name": "*PROQUELATE ZN 1 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 329.3,
        "isDefault": true
      }
    ]
  },
  {
    "code": "COMBIOUT",
    "name": "*RHIZOBAC COMBI 1KG *",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 755.54,
        "isDefault": true
      }
    ]
  },
  {
    "code": "RHIZOOUT",
    "name": "*RHIZOTX 1 KG*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 6000,
        "isDefault": true
      }
    ]
  },
  {
    "code": "SEL_10L_OUT",
    "name": "*SELECTO 10 LT*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 700,
        "isDefault": true
      }
    ]
  },
  {
    "code": "SEL1OUT",
    "name": "*SELECTO 1L *",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 900,
        "isDefault": true
      }
    ]
  },
  {
    "code": "TKR_OUT",
    "name": "*TKROOT 1 KG*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 16,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 800,
        "isDefault": true
      }
    ]
  },
  {
    "code": "VER10OUT",
    "name": "*VERNUM 10 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "INNOVAK OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1361.6,
        "isDefault": true
      }
    ]
  },
  {
    "code": "COLM",
    "name": "COLMENA",
    "unit": "H87",
    "satCode": "10101900",
    "departmentName": "JOVIPA INSUMOS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 95,
        "isDefault": true
      }
    ]
  },
  {
    "code": "KERC20",
    "name": "KER CALCIO 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "KER BIOTEC LIQUIDOS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2321.98,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2089.78
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1973.68
      }
    ]
  },
  {
    "code": "KRCA5",
    "name": "KER CALCIO 5L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "KER BIOTEC LIQUIDOS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 612.57,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 554.525
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 525.5
      }
    ]
  },
  {
    "code": "KERKC20",
    "name": "KER K 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "KER BIOTEC LIQUIDOS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 4403.29,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 3962.96
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 3742.8
      }
    ]
  },
  {
    "code": "KERK5L",
    "name": "KER K 5 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "KER BIOTEC LIQUIDOS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1132.9,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1022.82
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 996.17
      }
    ]
  },
  {
    "code": "KERMG20",
    "name": "KER MAGNESIO MG 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "KER BIOTEC LIQUIDOS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2229.1,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2006.19
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1894.74
      }
    ]
  },
  {
    "code": "KERM20",
    "name": "KER MN 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "KER BIOTEC LIQUIDOS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2146.59,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1931.93
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1824.6
      }
    ]
  },
  {
    "code": "KERN20",
    "name": "KER NITRO 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "KER BIOTEC LIQUIDOS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2274.51,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2047.06
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1933.33
      }
    ]
  },
  {
    "code": "NITR",
    "name": "KER NITRO 5LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "KER BIOTEC LIQUIDOS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 600.7,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 543.84
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 515.41
      }
    ]
  },
  {
    "code": "KERPH20",
    "name": "KER PHOS 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "KER BIOTEC LIQUIDOS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3800.95,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 3420.85
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 3230.8
      }
    ]
  },
  {
    "code": "KCBOUT",
    "name": "* KER CIBUS 1L*",
    "unit": "H87",
    "satCode": "10171601",
    "departmentName": "KEY BIOTEC OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 397.5,
        "isDefault": true
      }
    ]
  },
  {
    "code": "ECOUT",
    "name": "*ECOTROL 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "KEY BIOTEC OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 560,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 560
      }
    ]
  },
  {
    "code": "IRON",
    "name": "*IRON PLEX 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "KEY BIOTEC OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 582.4,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 506.69
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 477.53
      }
    ]
  },
  {
    "code": "IRNP",
    "name": "*IRON PLEX 20L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "KEY BIOTEC OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 9753.33,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 8778
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 8290.33
      }
    ]
  },
  {
    "code": "JUMR",
    "name": "*JUMPSTART 1L*",
    "unit": "H87",
    "satCode": "10171505",
    "departmentName": "KEY BIOTEC OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 625,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 562.5
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 531.25
      }
    ]
  },
  {
    "code": "KRKB",
    "name": "*KER KAB 1L*",
    "unit": "H87",
    "satCode": "12164001",
    "departmentName": "KEY BIOTEC OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 687.5,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 618.7
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 584.38
      }
    ]
  },
  {
    "code": "KYC",
    "name": "*KEY CU 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "KEY BIOTEC OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 594.51,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 535.06
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 505.34
      }
    ]
  },
  {
    "code": "KEEK",
    "name": "*KEY NEEK 500ML*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "KEY BIOTEC OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 158.77,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 142.89
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 134.95
      }
    ]
  },
  {
    "code": "KYTK",
    "name": "*KEY TAAK 500ML*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "KEY BIOTEC OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 170.87,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 153.78
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 145.24
      }
    ]
  },
  {
    "code": "PULOUT",
    "name": "*PULITORE 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "KEY BIOTEC OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 463,
        "isDefault": true
      }
    ]
  },
  {
    "code": "SPOO",
    "name": "*SPORATEC 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "KEY BIOTEC OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 576,
        "isDefault": true
      }
    ]
  },
  {
    "code": "JPS1",
    "name": "JUMPSTART 1L",
    "unit": "H87",
    "satCode": "10171505",
    "departmentName": "KEYBIOTEC",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 666.67,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 600
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 566.67
      }
    ]
  },
  {
    "code": "KERC",
    "name": "KER CIBUS 1 L",
    "unit": "H87",
    "satCode": "10171601",
    "departmentName": "KEYBIOTEC",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 463.24,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 416.91
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 393.75
      }
    ]
  },
  {
    "code": "KC",
    "name": "KER CU 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "KEYBIOTEC",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 527.38,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 474.65
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 448.28
      }
    ]
  },
  {
    "code": "KAB1",
    "name": "KER KAB 1L",
    "unit": "H87",
    "satCode": "12164001",
    "departmentName": "KEYBIOTEC",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3666.65,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 3300
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 3116.65
      }
    ]
  },
  {
    "code": "THIK1",
    "name": "KER THICK 1L",
    "unit": "H87",
    "satCode": "10171601",
    "departmentName": "KEYBIOTEC",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 494.12,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 444.71
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 420
      }
    ]
  },
  {
    "code": "KTHL",
    "name": "KER THICK LEAF",
    "unit": "H87",
    "satCode": "10171601",
    "departmentName": "KEYBIOTEC",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 713.73,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 642.35
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 606.67
      }
    ]
  },
  {
    "code": "KCA5",
    "name": "KEY CARBOXY 5L",
    "unit": "H87",
    "satCode": "12164001",
    "departmentName": "KEYBIOTEC",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2179.93,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1961.94
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1852.94
      }
    ]
  },
  {
    "code": "KPLEX1",
    "name": "KEYPLEX 350 1L",
    "unit": "H87",
    "satCode": "10171505",
    "departmentName": "KEYBIOTEC",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 750,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 675
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 637.5
      }
    ]
  },
  {
    "code": "KPLEX4",
    "name": "KEYPLEX 350 4 LTS",
    "unit": "H87",
    "satCode": "10171505",
    "departmentName": "KEYBIOTEC",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2933.33,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2640
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 2493.33
      }
    ]
  },
  {
    "code": "SPOR1",
    "name": "SPORAN EC 1L",
    "unit": "H87",
    "satCode": null,
    "departmentName": "KEYBIOTEC",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 990.85,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 891.77
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 842.23
      }
    ]
  },
  {
    "code": "B100",
    "name": "B100-AMYL  1LT",
    "unit": "H87",
    "satCode": "10171608",
    "departmentName": "LABMA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 500,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 450
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 425
      },
      {
        "tierName": "Precio 4",
        "value": 480
      }
    ]
  },
  {
    "code": "BACTI",
    "name": "BACTIROOT 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "LABMA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 600,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 540
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 510
      },
      {
        "tierName": "Precio 4",
        "value": 480
      }
    ]
  },
  {
    "code": "BIO_PA",
    "name": "BIO PAE 500ML",
    "unit": "H87",
    "satCode": "41106503",
    "departmentName": "LABMA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 400,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 360
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 340
      },
      {
        "tierName": "Precio 4",
        "value": 320
      }
    ]
  },
  {
    "code": "BIO_PRO",
    "name": "BIO PROTECTO 6 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "LABMA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 692.31,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 623.08
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 588.46
      },
      {
        "tierName": "Precio 4",
        "value": 553.85
      }
    ]
  },
  {
    "code": "BIO_CO",
    "name": "BIO-COMPLEX 1L",
    "unit": "H87",
    "satCode": "10171801",
    "departmentName": "LABMA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 750,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 675
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 637.5
      },
      {
        "tierName": "Precio 4",
        "value": 600
      }
    ]
  },
  {
    "code": "BIO_NPK",
    "name": "BIO-COMPLEX NPK",
    "unit": "H87",
    "satCode": "10171801",
    "departmentName": "LABMA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 600,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 540
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 510
      },
      {
        "tierName": "Precio 4",
        "value": 480
      }
    ]
  },
  {
    "code": "BIO_TRIN",
    "name": "BIO-TRINCHO 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "LABMA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 607.14,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 546.43
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 516.07
      }
    ]
  },
  {
    "code": "ECO",
    "name": "ECOFILM 1LT",
    "unit": "H87",
    "satCode": "11121502",
    "departmentName": "LABMA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 585.94,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 527.34
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 498.05
      }
    ]
  },
  {
    "code": "PL_NEMA",
    "name": "PL-NEMATICIDA 1LT",
    "unit": "H87",
    "satCode": "41106503",
    "departmentName": "LABMA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 600,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 540
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 510
      },
      {
        "tierName": "Precio 4",
        "value": 480
      }
    ]
  },
  {
    "code": "PRO_RA",
    "name": "PRO RAIZ MAX 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "LABMA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 566.67,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 510
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 481.67
      },
      {
        "tierName": "Precio 4",
        "value": 453.33
      }
    ]
  },
  {
    "code": "PRO_RAIZ",
    "name": "PRO-RAIZ PLUS 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "LABMA",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 0.01,
        "isDefault": true
      }
    ]
  },
  {
    "code": "QCA1",
    "name": "QUIVER CALCIO 1 L",
    "unit": "H87",
    "satCode": "10171611",
    "departmentName": "MATERIALES",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 169.65,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 152.69
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 144.21
      }
    ]
  },
  {
    "code": "AMIG",
    "name": "AMIGAN 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 488.16,
        "isDefault": true
      }
    ]
  },
  {
    "code": "BFZ",
    "name": "BIO-FREEZE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1250,
        "isDefault": true
      }
    ]
  },
  {
    "code": "BRE1",
    "name": "BREAKOUT 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 263.24,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 236.92
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 223.75
      }
    ]
  },
  {
    "code": "BR10OUT",
    "name": "BREAKOUT 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1390,
        "isDefault": true
      }
    ]
  },
  {
    "code": "CAL",
    "name": "CALCIUM 1 L",
    "unit": "H87",
    "satCode": "10171611",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 202.94,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 182.65
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 172.5
      }
    ]
  },
  {
    "code": "COX",
    "name": "COMPLEX 50 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1480,
        "isDefault": true
      }
    ]
  },
  {
    "code": "COCTC",
    "name": "COPLE CINTILLA-CINTILLA 5/8",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 4.2,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 4.2
      }
    ]
  },
  {
    "code": "CURZ",
    "name": "CURZATE M8 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 505,
        "isDefault": true
      }
    ]
  },
  {
    "code": "DF",
    "name": "DECIS FORTE 450 ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 462,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 402
      }
    ]
  },
  {
    "code": "DSFR",
    "name": "DOSIFICADOR 50ML",
    "unit": "H87",
    "satCode": null,
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 20,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 15
      }
    ]
  },
  {
    "code": "EXA_1KG",
    "name": "EXALT 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3162.5,
        "isDefault": true
      }
    ]
  },
  {
    "code": "FERTI",
    "name": "FERTIPOL NAUTA 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 890,
        "isDefault": true
      }
    ]
  },
  {
    "code": "FIDGR",
    "name": "FIDATO 1GR",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 0,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 6.5
      }
    ]
  },
  {
    "code": "FID",
    "name": "FIDATO 40GRS",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 272,
        "isDefault": true
      }
    ]
  },
  {
    "code": "FLORX",
    "name": "FLORAXXION 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 328.32,
        "isDefault": true
      }
    ]
  },
  {
    "code": "FOREY",
    "name": "FOLEY REY 240 ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 106.71,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 97.22
      }
    ]
  },
  {
    "code": "FOLEY",
    "name": "FOLEY REY 450 ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 190.24,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 173.33
      }
    ]
  },
  {
    "code": "FOLI",
    "name": "FOLIDOL 1KG.",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 25,
        "isDefault": true
      }
    ]
  },
  {
    "code": "FTLS",
    "name": "FONTELIS 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2079,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2002
      }
    ]
  },
  {
    "code": "FNTE",
    "name": "FONTELIS 250ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 515,
        "isDefault": true
      }
    ]
  },
  {
    "code": "FOSF50",
    "name": "FOSFONITRATO 50KG",
    "unit": "H87",
    "satCode": "10171603",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 661.11,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 646.74
      }
    ]
  },
  {
    "code": "KTNC",
    "name": "K- TIONIC 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 119,
        "isDefault": true
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 104
      }
    ]
  },
  {
    "code": "K3",
    "name": "K3",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 432.93,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 394.44
      }
    ]
  },
  {
    "code": "KARATE",
    "name": "KARATE ZEON 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1099.96,
        "isDefault": true
      }
    ]
  },
  {
    "code": "KRMT",
    "name": "KAREMITE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1950,
        "isDefault": true
      }
    ]
  },
  {
    "code": "MALP",
    "name": "MALPHOS 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 280.82,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 252.74
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 238.7
      }
    ]
  },
  {
    "code": "MAPT",
    "name": "MAP TECNICO 25 KG",
    "unit": "H87",
    "satCode": "73101600",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 793.8,
        "isDefault": true
      }
    ]
  },
  {
    "code": "MOL",
    "name": "MOLIBION 250ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 403,
        "isDefault": true
      }
    ]
  },
  {
    "code": "NITCAL",
    "name": "NITRATO DE CALCIO 25 KG",
    "unit": "H87",
    "satCode": "73101600",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 294.84,
        "isDefault": true
      }
    ]
  },
  {
    "code": "NITPOTA",
    "name": "NKS NITRATO DE POTASIO 25KG",
    "unit": "H87",
    "satCode": "73101600",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 732.24,
        "isDefault": true
      }
    ]
  },
  {
    "code": "NFST",
    "name": "NO FROST 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 400,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 380
      }
    ]
  },
  {
    "code": "PALG",
    "name": "PALGUS 100ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 335.29,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 316.67
      }
    ]
  },
  {
    "code": "PAL1LT",
    "name": "PALGUS 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3238.64,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 3000
      }
    ]
  },
  {
    "code": "PASTI",
    "name": "PASTILLAS QUIKCFUME -20% \"192\"",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 40,
        "isDefault": true
      }
    ]
  },
  {
    "code": "PIC1",
    "name": "PICUDO 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1047.06,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 988.89
      }
    ]
  },
  {
    "code": "PIRIFLU",
    "name": "PIRIFLU 500ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 6,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2146.34,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1955.56
      }
    ]
  },
  {
    "code": "PVE",
    "name": "PREVICUR ENERGY SL840 250 ML",
    "unit": "H87",
    "satCode": "10171702",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 300,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 290
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 280
      }
    ]
  },
  {
    "code": "PRONTUS",
    "name": "PRONTIUS 1KG",
    "unit": "H87",
    "satCode": "10171702",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 6,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 420,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 340
      }
    ]
  },
  {
    "code": "PNTS",
    "name": "PRONTIUS 200 GRS",
    "unit": "H87",
    "satCode": "10171702",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 100,
        "isDefault": true
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 90
      }
    ]
  },
  {
    "code": "PROZ",
    "name": "PROZYCAR 250 MGS",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 105,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 96.67
      }
    ]
  },
  {
    "code": "SCRE",
    "name": "SCORE 250ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 490,
        "isDefault": true
      }
    ]
  },
  {
    "code": "SEMIAGU",
    "name": "SEMILLA JIMTOMATE AGUAMIEL",
    "unit": "H87",
    "satCode": "10151500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3217.75,
        "isDefault": true
      }
    ]
  },
  {
    "code": "SEMI609",
    "name": "SEMILLA JITOMATE V609",
    "unit": "H87",
    "satCode": "10151500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3139.5,
        "isDefault": true
      }
    ]
  },
  {
    "code": "ASRIE",
    "name": "SERVICIO DE ASESORIA EN RIEGO",
    "unit": "ACT",
    "satCode": "70171708",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 16,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 500,
        "isDefault": true
      }
    ]
  },
  {
    "code": "SAVAN250",
    "name": "SIVANTO PRIME 250 ML",
    "unit": "H87",
    "satCode": "10191509",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 455.76,
        "isDefault": true
      }
    ]
  },
  {
    "code": "SOLDER",
    "name": "SOLDIER  250 1L",
    "unit": "H87",
    "satCode": "10191509",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1468.5,
        "isDefault": true
      }
    ]
  },
  {
    "code": "SUN1L",
    "name": "SUNFIRE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 6,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2530,
        "isDefault": true
      }
    ]
  },
  {
    "code": "SPERCA",
    "name": "SUPER CAL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 479.52,
        "isDefault": true
      }
    ]
  },
  {
    "code": "TRMP",
    "name": "TRAMPA AMARILLA FEROMIS 30X100MT",
    "unit": "H87",
    "satCode": "10191703",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1378.08,
        "isDefault": true
      }
    ]
  },
  {
    "code": "VAL",
    "name": "VALTAR 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 596,
        "isDefault": true
      }
    ]
  },
  {
    "code": "VEL",
    "name": "VELADES 20LT",
    "unit": "H87",
    "satCode": "10171801",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3035.71,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2732.14
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 2580.36
      },
      {
        "tierName": "Precio 4",
        "value": 2428.57
      }
    ]
  },
  {
    "code": "VELA5",
    "name": "VELADES 5LT",
    "unit": "H87",
    "satCode": "10171801",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 781.25,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 703.13
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 664.06
      },
      {
        "tierName": "Precio 4",
        "value": 625
      }
    ]
  },
  {
    "code": "VERI",
    "name": "VERIMARK 100ML",
    "unit": "H87",
    "satCode": "10191509",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 700,
        "isDefault": true
      }
    ]
  },
  {
    "code": "VIRU1",
    "name": "VIRUSAN 1L",
    "unit": "H87",
    "satCode": "10191509",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 677,
        "isDefault": true
      }
    ]
  },
  {
    "code": "VIT1",
    "name": "VITOL 1 L",
    "unit": "H87",
    "satCode": "10171603",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 597,
        "isDefault": true
      }
    ]
  },
  {
    "code": "VYDA",
    "name": "VYDATE 1L",
    "unit": "H87",
    "satCode": "10191509",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1205.89,
        "isDefault": true
      }
    ]
  },
  {
    "code": "YODA",
    "name": "YODAL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 424.35,
        "isDefault": true
      }
    ]
  },
  {
    "code": "44M10",
    "name": "*44 MAG 10L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 740,
        "isDefault": true
      }
    ]
  },
  {
    "code": "44M1",
    "name": "*44 MAG 1L *",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 110,
        "isDefault": true
      }
    ]
  },
  {
    "code": "ABMOUT",
    "name": "*ABAMEN 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 408,
        "isDefault": true
      }
    ]
  },
  {
    "code": "AEC20",
    "name": "*AE- CALCIUM 20 L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 800,
        "isDefault": true
      }
    ]
  },
  {
    "code": "BIOFOUT",
    "name": "*BIOFOLCON 1L *",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 238,
        "isDefault": true
      }
    ]
  },
  {
    "code": "BIOSOUT",
    "name": "*BIOSURGEN 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 238,
        "isDefault": true
      }
    ]
  },
  {
    "code": "CAU20",
    "name": "*CA ULTRA 20 L*",
    "unit": "H87",
    "satCode": "10171611",
    "departmentName": "OTRAS LINEAS OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 800,
        "isDefault": true
      }
    ]
  },
  {
    "code": "CLOUT",
    "name": "*CALCIUM 1L*",
    "unit": "H87",
    "satCode": "10171600",
    "departmentName": "OTRAS LINEAS OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 136,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 136
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 136
      }
    ]
  },
  {
    "code": "LNEEMOUT",
    "name": "*LONGER NEEM 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 531.25,
        "isDefault": true
      }
    ]
  },
  {
    "code": "NKOUT",
    "name": "*NOKAU 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 765,
        "isDefault": true
      }
    ]
  },
  {
    "code": "QQO",
    "name": "*QUIVER CUAJE 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 650,
        "isDefault": true
      }
    ]
  },
  {
    "code": "QROU",
    "name": "*QUIVER RAIZ 1L *",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 328.24,
        "isDefault": true
      }
    ]
  },
  {
    "code": "RAIZ20",
    "name": "*RAIZ-PACK 20L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2100,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2625
      },
      {
        "tierName": "Precio Distri 15%",
        "value": 1672.8
      }
    ]
  },
  {
    "code": "SPOUT",
    "name": "*SPEED SOAP 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 201.88,
        "isDefault": true
      }
    ]
  },
  {
    "code": "SUNO",
    "name": "*SUPER NITRO 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 160,
        "isDefault": true
      }
    ]
  },
  {
    "code": "VTHOUT",
    "name": "*VITA-HOUR 1L*",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 351.16,
        "isDefault": true
      }
    ]
  },
  {
    "code": "VIOUT",
    "name": "*VITOL 1L *",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "OTRAS LINEAS OUT",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 185,
        "isDefault": true
      }
    ]
  },
  {
    "code": "ANB",
    "name": "ANIBAC PLUS 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "SEMBRADOR",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 202,
        "isDefault": true
      }
    ]
  },
  {
    "code": "APPL",
    "name": "APPLAUD 40SC 500MG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "SEMBRADOR",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 890.24,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 811.11
      }
    ]
  },
  {
    "code": "CTU",
    "name": "CAPTAN ULTRA 50WP 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "SEMBRADOR",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 230,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 230
      }
    ]
  },
  {
    "code": "FOLIDOL",
    "name": "FOLIDOL 25 KG",
    "unit": "H87",
    "satCode": "10191500",
    "departmentName": "SEMBRADOR",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 450,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 405
      }
    ]
  },
  {
    "code": "PRRZ",
    "name": "PROZYCAR 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "SEMBRADOR",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 286,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 255
      }
    ]
  },
  {
    "code": "QUICKF",
    "name": "QUICK FUME LATA 960 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "SEMBRADOR",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 650,
        "isDefault": true
      }
    ]
  },
  {
    "code": "RNAN",
    "name": "RANMAN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "SEMBRADOR",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 3192,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 3092
      }
    ]
  },
  {
    "code": "RANM",
    "name": "RANMAN 200ML",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "SEMBRADOR",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 891.01,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 871.43
      }
    ]
  },
  {
    "code": "DUPLE",
    "name": "DUPLEX 1LT",
    "unit": "H87",
    "satCode": "12161913",
    "departmentName": "SERVICIO AGROTECNICO",
    "ivaRaw": 16,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 190,
        "isDefault": true
      }
    ]
  },
  {
    "code": "LUCMR",
    "name": "LUCAFUM MERCENARIO 20L",
    "unit": "H87",
    "satCode": "10171500",
    "departmentName": "TEPEYAC",
    "ivaRaw": 0,
    "iepsRaw": 9,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 524.3,
        "isDefault": true
      }
    ]
  },
  {
    "code": "SUNFIRE",
    "name": "SUNFIRE 250 LT",
    "unit": "H87",
    "satCode": "10191509",
    "departmentName": "TEPEYAC",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1400,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1350
      }
    ]
  },
  {
    "code": "ACH",
    "name": "ACOLCHADO NEGRO-PLATA 1.10  P 40",
    "unit": "H87",
    "satCode": "13111201",
    "departmentName": "TOYO",
    "ivaRaw": 16,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1350,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1300
      }
    ]
  },
  {
    "code": "ANI",
    "name": "ANILLO DE TUTOREO",
    "unit": "H87",
    "satCode": "31163230",
    "departmentName": "TOYO",
    "ivaRaw": 16,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1293.1,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 0.15
      }
    ]
  },
  {
    "code": "CINT1000",
    "name": "CINTILLA CHICA 1000 A 10CM",
    "unit": "H87",
    "satCode": "70171700",
    "departmentName": "TOYO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1210,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1162.35
      }
    ]
  },
  {
    "code": "CINT8MIL",
    "name": "CINTILLA GRANDE 8 MIL A 10CM",
    "unit": "H87",
    "satCode": "70171700",
    "departmentName": "TOYO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 2800,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 2709
      }
    ]
  },
  {
    "code": "CINT6MIL",
    "name": "CINTILLA MEDIANA 6 MIL A 10 CM",
    "unit": "H87",
    "satCode": "70171700",
    "departmentName": "TOYO",
    "ivaRaw": 0,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 1740,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 1657
      }
    ]
  },
  {
    "code": "RAFD",
    "name": "RAFIA DELGADA 1KG",
    "unit": "H87",
    "satCode": "21102300",
    "departmentName": "TOYO",
    "ivaRaw": 16,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 110,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 95
      }
    ]
  },
  {
    "code": "FAG",
    "name": "RAFIA DELGADA 2KG",
    "unit": "H87",
    "satCode": "21102300",
    "departmentName": "TOYO",
    "ivaRaw": 16,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 110,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 95
      }
    ]
  },
  {
    "code": "RAF",
    "name": "RAFIA GRUESA 1KG",
    "unit": "H87",
    "satCode": "21102300",
    "departmentName": "TOYO",
    "ivaRaw": 16,
    "iepsRaw": 0,
    "existencia": 0,
    "prices": [
      {
        "tierName": "Precio Publico",
        "value": 110,
        "isDefault": true
      },
      {
        "tierName": "Precio Subdis 10%",
        "value": 95
      }
    ]
  }
];

export const TIENDAS_INVENTORY_DATA: TiendaInventoryRow[] = [
  {
    "code": "ABAX",
    "name": "ABAXO FERRO 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 410.1,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ALMX",
    "name": "ALGIMAX 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 374.38,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ALGM500",
    "name": "ALGIMEL 500 GR",
    "unit": "H87",
    "satCode": "10171600",
    "price": 581.25,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "AMG",
    "name": "AMINOGREEN 16 1 LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 380.63,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "AMG24",
    "name": "AMINOGREEN 24 1 LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 420,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BSOL",
    "name": "AMINOGREEN 90  1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 778.13,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "AMK",
    "name": "AMINOGREEN K 1LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 510,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BOR",
    "name": "BOR 1 LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 319.13,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BUFS",
    "name": "BUFALO SOLID 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 261,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "CPQ",
    "name": "CUPRIC QUELAT 5KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 363,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ENGY",
    "name": "ENERGY SOIL 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 230,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "FIT1L",
    "name": "Fitasio 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 472.22,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "FLOR",
    "name": "FLORCUAJE 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 520.78,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "GRCA",
    "name": "GREEN CABOR 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 196.31,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "GRCR",
    "name": "GREEN COBRE 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 296.63,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "GREP",
    "name": "Green P 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 490.85,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "GZL",
    "name": "GREEN ZINC 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 164.06,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "GCZ1",
    "name": "GREEN CALCIO ZINC 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 196.88,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "HRMG",
    "name": "HORMOSTING 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1116,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "HMTG",
    "name": "HORMOSTING 250ML",
    "unit": "H87",
    "satCode": "10171600",
    "price": 326.25,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "MQ",
    "name": "MANGANESSE QUELAT 5KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 363,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "MAXOR1L",
    "name": "Max Organic 20 x litro",
    "unit": "H87",
    "satCode": "10171600",
    "price": 145,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "MCE",
    "name": "MICRO ENERGIC 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 296.05,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "NON",
    "name": "NON-PITT 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 390.94,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "NUT",
    "name": "NUTRIMAZIN 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 232.88,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "NTMB",
    "name": "NUTRIMOB 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 582.19,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "PHOSC",
    "name": "Phoscuprico 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 532.56,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "QUAN1",
    "name": "QUANTUM 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 531.25,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "QUAN5",
    "name": "QUANTUM 5 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 2531.25,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "QUAF",
    "name": "QUANTUM FLOWER 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 512.23,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "QRT1",
    "name": "QUANTUM ROOT 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 441.88,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "RZOOT1",
    "name": "RAIZOOT 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 393.75,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "SB1",
    "name": "SILISEC BOTRYSEC 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 308.26,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "SILG",
    "name": "SILISEC-BOTRYSEC 5KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1465.63,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "GSI1",
    "name": "SILISEC-K 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 220.63,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "SACV",
    "name": "SUCRE ACTIVE 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 317.39,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ZQ1",
    "name": "ZINESSE QUELAT 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 342.5,
    "departmentName": "AGRINOVA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "AK1",
    "name": "ALGAK 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 376,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "AT1",
    "name": "ATP UP 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 434,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BLOX1",
    "name": "BALOX 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 615,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BET",
    "name": "BESTCURE 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1080,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BIOC1",
    "name": "BIOCINNAFOL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 870,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BIOCRIF1",
    "name": "BIOCRIFOL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1650,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BF1KG",
    "name": "BIOFIT G 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 292,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BIO",
    "name": "BIOFIT RTU 1 KG.",
    "unit": "H87",
    "satCode": "10171500",
    "price": 851,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BFIT333",
    "name": "BIOFIT RTU 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 293.66,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "CFE1",
    "name": "CARBOXY FE 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 412,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "CFE",
    "name": "CARBOXY FE 5 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2000,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "CK1",
    "name": "CARBOXY K 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 223,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "CKX",
    "name": "CARBOXY K MAX 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 288,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "CL1",
    "name": "CARBOXY L 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 212,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "CMCRO1",
    "name": "CARBOXY MICRO 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 319,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "CMCRO",
    "name": "CARBOXY MICRO 5 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1475,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "CMING",
    "name": "Carboxy Min G25kileado",
    "unit": "H87",
    "satCode": "10171501",
    "price": 100,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "CMIN1",
    "name": "CARBOXY MIN L 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 198,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "CCZ",
    "name": "CARBOXY ZINC 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 401,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "CVK1",
    "name": "CUVREK 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 360,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "EB1",
    "name": "ENERBOOST 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 398,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "FOS1",
    "name": "FOSFONICUR 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 447,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "HAD1",
    "name": "HADDAK 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 679,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "MDAL1",
    "name": "MEDAL 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 684,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "MROOT1",
    "name": "MYCOROOT 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1715,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "MROOT333",
    "name": "MYCOROOT 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 581.66,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "NROOT1",
    "name": "NEMAROOT 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1700,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "N333",
    "name": "NEMAROOT 333 GRS.",
    "unit": "H87",
    "satCode": "10171500",
    "price": 576.66,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "NUTD",
    "name": "NUUTRIMAK+ DESARROLLO 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 406,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "NUX",
    "name": "NUUTRIMAK+  VIGOR 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 274,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "NUT10",
    "name": "NUTRISORB L 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3680,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "NUT1",
    "name": "NUTRISORB L 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 398,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "NUTG",
    "name": "NUTRISORB GRANULADO  1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 175,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "PK1",
    "name": "PACKHARD 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 277,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "PG1",
    "name": "PGR IV  1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1083,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "PVUP1",
    "name": "PREVENT UP 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 564,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "PRO1",
    "name": "PROBORATE 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 203,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "P5X20",
    "name": "PROMESOL 5X 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2840,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "P51LT",
    "name": "Promesol 5x 20Litreado",
    "unit": "H87",
    "satCode": "10171500",
    "price": 152,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "PCA1",
    "name": "PROMESOL CA 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 180,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "PMSG",
    "name": "PROMESOL G  SACO 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3325,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "PFE1",
    "name": "PROQUELATE FE 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 149,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "PMG1",
    "name": "PROQUELATE MG 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 149,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "PROMN",
    "name": "PROQUELATE MN 1 LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 164,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "PZN1",
    "name": "PROQUELATE ZINC 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 164,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "RAD1",
    "name": "RADIGROW 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 541,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "RADG1",
    "name": "RADIGROW G 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 220,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "RTX",
    "name": "RHIZO TX 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1414,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "RHITX333",
    "name": "RHIZOTX 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 481.33,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "RBACK1",
    "name": "RHIZOBAC COMBI I KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1656,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "RHIZCOM",
    "name": "RHIZOBAC COMBI 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 562,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "SEL1",
    "name": "SELECTO XL 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1044,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "TKR333",
    "name": "TKROOT 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 465,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "UTL",
    "name": "ULTRA V 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 352,
    "departmentName": "INNOVAK",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "KERC20",
    "name": "KER CALCIO 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2321.98,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "KERCA1",
    "name": "Ker Cal 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 117,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "KERKC20",
    "name": "KER K 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 4403.29,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "KERK1L",
    "name": "Ker k 20Litrreado",
    "unit": "H87",
    "satCode": "10171500",
    "price": 221,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "KERMG1",
    "name": "Ker Magnesio mg 20Litreado",
    "unit": "H87",
    "satCode": "10171500",
    "price": 112,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "KERMN1",
    "name": "Ker MN 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 108,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "KNT1",
    "name": "Ker Nitro 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 114,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "KRPS1",
    "name": "Ker Phos 20Litreado",
    "unit": "H87",
    "satCode": "10171500",
    "price": 191,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "JPS1",
    "name": "JUMPSTART 1L",
    "unit": "H87",
    "satCode": "10171505",
    "price": 666.67,
    "departmentName": "TECNOFERSA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "KERC",
    "name": "KER CIBUS 1 L",
    "unit": "H87",
    "satCode": "10171601",
    "price": 463.24,
    "departmentName": "TECNOFERSA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "KC",
    "name": "KER CU 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 527.38,
    "departmentName": "TECNOFERSA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "KAB1",
    "name": "KER KAB 1L",
    "unit": "H87",
    "satCode": "12164001",
    "price": 699.35,
    "departmentName": "TECNOFERSA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "THIK1",
    "name": "KER THICK 1L",
    "unit": "H87",
    "satCode": "10171601",
    "price": 494.12,
    "departmentName": "TECNOFERSA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "KTHL",
    "name": "KER THICK LEAF",
    "unit": "H87",
    "satCode": "10171601",
    "price": 713.73,
    "departmentName": "TECNOFERSA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "KEYCLI",
    "name": "KEY CARBOXY 1LT",
    "unit": "H87",
    "satCode": "12164001",
    "price": 440,
    "departmentName": "TECNOFERSA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "KPLEX1",
    "name": "KEYPLEX 350 1L",
    "unit": "H87",
    "satCode": "10171505",
    "price": 750,
    "departmentName": "TECNOFERSA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ACET2",
    "name": "ACET200 500 GRS",
    "unit": "H87",
    "satCode": "10191509",
    "price": 1289.68,
    "departmentName": "AGROFARM",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "AGRIMT",
    "name": "AGROMECTINA 1L",
    "unit": "H87",
    "satCode": "10191509",
    "price": 718.75,
    "departmentName": "AGROFARM",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BACTO",
    "name": "BACTER OUT 800 GRS",
    "unit": "H87",
    "satCode": "10171702",
    "price": 596.59,
    "departmentName": "AGROFARM",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BTK731",
    "name": "BTKUR 731 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 392.86,
    "departmentName": "AGROFARM",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "CYAT",
    "name": "CYANTROL 1ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 5,
    "departmentName": "AGROFARM",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ECOT1",
    "name": "ECOTROL EC 1L",
    "unit": "H87",
    "satCode": "10191500",
    "price": 968.75,
    "departmentName": "AGROFARM",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ENG",
    "name": "ENGOR-D 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 762.2,
    "departmentName": "AGROFARM",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "EXPL",
    "name": "EXPLORER 1K",
    "unit": "H87",
    "satCode": "10171500",
    "price": 588.24,
    "departmentName": "AGROFARM",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "KEYBPS",
    "name": "KEYPLEX BYPASS 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1133.33,
    "departmentName": "AGROFARM",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "KFLL",
    "name": "K-full 1l",
    "unit": "H87",
    "satCode": "10171500",
    "price": 375,
    "departmentName": "AGROFARM",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "LDM",
    "name": "Landin 330 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 920,
    "departmentName": "AGROFARM",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "MAXCT",
    "name": "MAX CONTROL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1093.75,
    "departmentName": "AGROFARM",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "MAXDOS",
    "name": "Max Control  DOS 1ML",
    "unit": "H87",
    "satCode": "10171501",
    "price": 1.12,
    "departmentName": "AGROFARM",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "PPT",
    "name": "PEPTON 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 691.18,
    "departmentName": "AGROFARM",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "SPOR1",
    "name": "SPORAN EC 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 990.85,
    "departmentName": "AGROFARM",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "TTMAX",
    "name": "TETRA MAX 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 4687.5,
    "departmentName": "AGROFARM",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ADRM",
    "name": "ADERMEN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 152.94,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "AGRC",
    "name": "AGROCAN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 529.41,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "AGGL",
    "name": "AGROGARLIC 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 285.71,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "AGNM",
    "name": "Agro-Nem 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 897.83,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "AMXM",
    "name": "AMOXAM 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 425,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BFLL",
    "name": "BIOFULL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 421.57,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "CRMN",
    "name": "CORAMEN 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 699,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "DRV",
    "name": "DERRIVE 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 275,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "DERR250",
    "name": "Derrunbe 250 Ml",
    "unit": "H87",
    "satCode": "10171500",
    "price": 562.5,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "DRRB",
    "name": "DERRUNBE 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 940,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "FLY250",
    "name": "Flymen 250 Grs",
    "unit": "H87",
    "satCode": "10171500",
    "price": 466.67,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "LTL",
    "name": "LETAL 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 419.64,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "MXM",
    "name": "MAXIMO 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 465,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "NIP250",
    "name": "Niprol 250 Ml",
    "unit": "H87",
    "satCode": "10171500",
    "price": 700,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "NIP",
    "name": "NIPROL 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1400,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "OXFN",
    "name": "OXIFEN 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 600,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "SOPME",
    "name": "SOAPMEN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 225.49,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "SULB",
    "name": "SULBERMEN 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 151.92,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "SLBP",
    "name": "SULBER PLUS 250 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 491.67,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "SLBMX",
    "name": "SULBERMEN MAX 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 235.42,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "TXN",
    "name": "TOXAN 250 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 690,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "XPL",
    "name": "XIPROL 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 441.67,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ZANE",
    "name": "ZARANEEM",
    "unit": "H87",
    "satCode": "10171500",
    "price": 521.01,
    "departmentName": "AGROMEN",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ANT",
    "name": "ACIDO NITRICO 55% 20L",
    "unit": "H87",
    "satCode": "12352301",
    "price": 520,
    "departmentName": "FERTILIZANTES",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ASF",
    "name": "ACIDO SULFURICO 98% 20L",
    "unit": "H87",
    "satCode": "12352301",
    "price": 800.11,
    "departmentName": "FERTILIZANTES",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "HYDCATR",
    "name": "HYDROSPEED CAB MAX",
    "unit": "H87",
    "satCode": "10171500",
    "price": 700,
    "departmentName": "FERTILIZANTES",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "NCB",
    "name": "CALCIO BI   25 KG",
    "unit": "H87",
    "satCode": "10171611",
    "price": 413.35,
    "departmentName": "FERTILIZANTES",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "CTT",
    "name": "CINTILLA TORO",
    "unit": "H87",
    "satCode": "70171700",
    "price": 3250,
    "departmentName": "FERTILIZANTES",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "HYD_GROW",
    "name": "HYDROSPEED GROWH",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1200,
    "departmentName": "FIAT 25 4 TIEMPOS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "HAKBA",
    "name": "HAKAPHOS BASE 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1210,
    "departmentName": "FIAT 25 4 TIEMPOS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "KRF",
    "name": "KERF 25 KG",
    "unit": "H87",
    "satCode": "10171602",
    "price": 726.3,
    "departmentName": "FIAT 25 4 TIEMPOS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "NMG",
    "name": "MAGNIT SACOS 25 KG",
    "unit": "H87",
    "satCode": "12352300",
    "price": 510,
    "departmentName": "FIAT 25 4 TIEMPOS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "MAP",
    "name": "MAP SACO 25 KG",
    "unit": "H87",
    "satCode": "12141909",
    "price": 907.77,
    "departmentName": "FIAT 25 4 TIEMPOS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "MKP",
    "name": "MKP SACO 25 KG",
    "unit": "H87",
    "satCode": "10171603",
    "price": 1132.05,
    "departmentName": "FIAT 25 4 TIEMPOS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "NIT",
    "name": "Nitro-able III Urea",
    "unit": "H87",
    "satCode": "10171500",
    "price": 910,
    "departmentName": "FIAT 25 4 TIEMPOS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "NKS",
    "name": "NKS 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 696.24,
    "departmentName": "FIAT 25 4 TIEMPOS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "SLC",
    "name": "SOLUCROS SACO 25 KG",
    "unit": "H87",
    "satCode": "10171602",
    "price": 660,
    "departmentName": "FIAT 25 4 TIEMPOS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "SULMAG",
    "name": "SULMAG SACO 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 247.39,
    "departmentName": "FIAT 25 4 TIEMPOS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "HAKVI",
    "name": "HAKAPHOS VIOLETA 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1210,
    "departmentName": "FIAT 25 4 TIEMPOS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ANGS",
    "name": "ANGLOSAN 1L",
    "unit": "H87",
    "satCode": "47131803",
    "price": 850,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ANG",
    "name": "ANGLOSIL NSF 4L",
    "unit": "H87",
    "satCode": "47131803",
    "price": 599,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BSAR",
    "name": "BIOSARIA 1 L",
    "unit": "H87",
    "satCode": "10171607",
    "price": 373.33,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BIOV",
    "name": "BIOVIGOR 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 493.33,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "GLUT",
    "name": "GLUTASAN 50 1L",
    "unit": "H87",
    "satCode": "47131803",
    "price": 880,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "LAR",
    "name": "LARBIA 1 LT",
    "unit": "H87",
    "satCode": "10171607",
    "price": 373.33,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "NMC",
    "name": "NEMACONTROL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 640,
    "departmentName": "Multicide 1L",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "RAFD",
    "name": "RAFIA DELGADA 1KG",
    "unit": "H87",
    "satCode": "21102300",
    "price": 110,
    "departmentName": "CHAVIRA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "RAF",
    "name": "RAFIA GRUESA 1KG",
    "unit": "H87",
    "satCode": "21102300",
    "price": 110,
    "departmentName": "CHAVIRA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "AGRI_250MIL",
    "name": "AGRIMEC 250 MIL 10%",
    "unit": "H87",
    "satCode": "10171500",
    "price": 362,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "APPL",
    "name": "APPLAUD 40SC 500MG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 890.24,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BAYN",
    "name": "BAYFOLAN FORTE SL 11 1L",
    "unit": "H87",
    "satCode": "10171601",
    "price": 105,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BEL20G",
    "name": "BELEAF 20 GRS",
    "unit": "H87",
    "satCode": "10191509",
    "price": 140,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BIOFRE",
    "name": "Bio-freeze 1l",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1250,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "FAEN",
    "name": "FAENA CLASICO 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 170,
    "departmentName": "DIATOMEAS 1KG",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "FAFR",
    "name": "FAENA FUERTE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 210,
    "departmentName": "DIATOMEAS 1KG",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "FIDGR",
    "name": "FIDATO 1GR",
    "unit": "H87",
    "satCode": "10171500",
    "price": 7.54,
    "departmentName": "DIATOMEAS 1KG",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "HER",
    "name": "HERBIPOL GLIFOSATO 970ML",
    "unit": "H87",
    "satCode": "10171700",
    "price": 190,
    "departmentName": "DIATOMEAS 1KG",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "PRONTUS",
    "name": "PRONTIUS 1KG",
    "unit": "H87",
    "satCode": "10171702",
    "price": 420,
    "departmentName": "MERIVON 1L (Dosis 20 ml)",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "PNTS",
    "name": "PRONTIUS 200 GRS",
    "unit": "H87",
    "satCode": "10171702",
    "price": 100,
    "departmentName": "MERIVON 1L (Dosis 20 ml)",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "NFST",
    "name": "NO FROST 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 400,
    "departmentName": "MERIVON 1L (Dosis 20 ml)",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "RALLY",
    "name": "RALLY 40W 114 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 560,
    "departmentName": "MERIVON 1L (Dosis 20 ml)",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "RAN200",
    "name": "Ranman 200 ml",
    "unit": "H87",
    "satCode": "10171501",
    "price": 891.01,
    "departmentName": "MERIVON 1L (Dosis 20 ml)",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "SLB",
    "name": "SALIBRO 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 4930,
    "departmentName": "MERIVON 1L (Dosis 20 ml)",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "SCORE",
    "name": "SCORE 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2096.67,
    "departmentName": "MERIVON 1L (Dosis 20 ml)",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "SEC",
    "name": "SECADOR 900ML",
    "unit": "H87",
    "satCode": "10171700",
    "price": 105,
    "departmentName": "MERIVON 1L (Dosis 20 ml)",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "TOEMIL",
    "name": "TORETTO DOSIF ML",
    "unit": "H87",
    "satCode": "10171701",
    "price": 4.8,
    "departmentName": "MERIVON 1L (Dosis 20 ml)",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ACTDOS",
    "name": "ACTIVANE DOS 100G",
    "unit": "H87",
    "satCode": "10171600",
    "price": 168.02,
    "departmentName": "LIDA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ACTIVA1",
    "name": "ACTIVANE 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1562.64,
    "departmentName": "LIDA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ENG100",
    "name": "ENGORDONE 100 GRS",
    "unit": "H87",
    "satCode": "10171600",
    "price": 342.18,
    "departmentName": "LIDA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ENGOR",
    "name": "ENGORDONE DOSIF",
    "unit": "H87",
    "satCode": "10171600",
    "price": 302.31,
    "departmentName": "LIDA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "MAXDOS",
    "name": "MAXIFRUTO DOS 250ML",
    "unit": "H87",
    "satCode": "10171600",
    "price": 572.5,
    "departmentName": "LIDA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "MAXI",
    "name": "MAXIFRUTO 500ML",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1065.11,
    "departmentName": "LIDA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "STEDOS",
    "name": "STEMICOL DOS 100GR",
    "unit": "H87",
    "satCode": "10171600",
    "price": 119.86,
    "departmentName": "LIDA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "STEMI1K",
    "name": "STEMICOL 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1114.82,
    "departmentName": "LIDA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ULT",
    "name": "ULTIMITE 1LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1406.15,
    "departmentName": "LIDA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ULTDOS",
    "name": "ULTIMITE DOS 250ML",
    "unit": "H87",
    "satCode": "10171600",
    "price": 377.9,
    "departmentName": "LIDA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "AGRIS",
    "name": "AGRISUR 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 714.12,
    "departmentName": "BIORIZON",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "AGR",
    "name": "AGRISUR Z 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1131.25,
    "departmentName": "BIORIZON",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "AZUL",
    "name": "BOSTER AZUL 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 395.29,
    "departmentName": "BIORIZON",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "KOLO",
    "name": "KOLORNEUTRO 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 280.3,
    "departmentName": "BIORIZON",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "PHOST",
    "name": "PHOSTROT 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 311.42,
    "departmentName": "BIORIZON",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "SOLO",
    "name": "SOLO K 2.5KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1541.67,
    "departmentName": "BIORIZON",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "B100",
    "name": "B100-AMYL  1LT",
    "unit": "H87",
    "satCode": "10171608",
    "price": 600,
    "departmentName": "LABMA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BACTI",
    "name": "BACTIROOT 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 600,
    "departmentName": "LABMA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BIO_SOLI",
    "name": "BIO COMPLEX 1 SOLID 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 366.67,
    "departmentName": "LABMA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BIOINS1",
    "name": "BIO INSECT MIX 1 500ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 555.56,
    "departmentName": "LABMA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BIOINS2",
    "name": "BIO INSECT MIX 2 500ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 434.03,
    "departmentName": "LABMA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BIO_PA",
    "name": "BIO PAE 500ML",
    "unit": "H87",
    "satCode": "41106503",
    "price": 400,
    "departmentName": "LABMA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BIO_PRO",
    "name": "BIO PROTECTO 6 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 692.31,
    "departmentName": "LABMA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BIORI",
    "name": "Bio Rize 10gr",
    "unit": "H87",
    "satCode": "10171500",
    "price": 538.46,
    "departmentName": "LABMA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BIO_CO",
    "name": "BIO-COMPLEX 1L",
    "unit": "H87",
    "satCode": "10171801",
    "price": 750,
    "departmentName": "LABMA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BIO_NPK",
    "name": "BIO-COMPLEX NPK",
    "unit": "H87",
    "satCode": "10171801",
    "price": 600,
    "departmentName": "LABMA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BIO_TRIN",
    "name": "BIO-TRINCHO 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 607.14,
    "departmentName": "LABMA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "BIO_YO",
    "name": "BIO-YODO 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 395.83,
    "departmentName": "LABMA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "ECO",
    "name": "ECOFILM 1LT",
    "unit": "H87",
    "satCode": "11121502",
    "price": 585.94,
    "departmentName": "LABMA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "NA_HO_BA",
    "name": "NANO-HO-BA 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 694.44,
    "departmentName": "LABMA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "NANO",
    "name": "Nano-virus 1lt",
    "unit": "H87",
    "satCode": "10171500",
    "price": 746.53,
    "departmentName": "LABMA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "PL_NEMA",
    "name": "PL-NEMATICIDA 1LT",
    "unit": "H87",
    "satCode": "41106503",
    "price": 600,
    "departmentName": "LABMA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "PRO_RA",
    "name": "PRO RAIZ MAX 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 566.67,
    "departmentName": "LABMA",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "AGRO50",
    "name": "AGRO-OX 50 4LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 599,
    "departmentName": "BIG EXPORT. BANG",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "GLUT50",
    "name": "Glutaral 50 1lt",
    "unit": "H87",
    "satCode": "10171500",
    "price": 880,
    "departmentName": "BIG EXPORT. BANG",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "INVE1",
    "name": "Inver clean 1lt",
    "unit": "H87",
    "satCode": "10171500",
    "price": 850,
    "departmentName": "BIG EXPORT. BANG",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "INVE5",
    "name": "Inver clean 5lt",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3750.26,
    "departmentName": "BIG EXPORT. BANG",
    "branchCode": "CHICHICAPAM"
  },
  {
    "code": "AK1",
    "name": "ALGAK 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 376,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "AT1",
    "name": "ATP UP 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 434,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BLOX1",
    "name": "BALOX 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 615,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BET",
    "name": "BESTCURE 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1080,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BIOC1",
    "name": "BIOCINNAFOL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 870,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BIOCRIF1",
    "name": "BIOCRIFOL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1650,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BF1KG",
    "name": "BIOFIT G 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 292,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BIO",
    "name": "BIOFIT RTU 1 KG.",
    "unit": "H87",
    "satCode": "10171500",
    "price": 851,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BFIT333",
    "name": "BIOFIT RTU 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 293.66,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "CFE1",
    "name": "CARBOXY FE 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 412,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "CFE",
    "name": "CARBOXY FE 5 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2000,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "CK1",
    "name": "CARBOXY K 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 223,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "CKX",
    "name": "CARBOXY K MAX 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 288,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "CL1",
    "name": "CARBOXY L 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 212,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "CMCRO1",
    "name": "CARBOXY MICRO 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 319,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "CMCRO",
    "name": "CARBOXY MICRO 5 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1475,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "CMING",
    "name": "Carboxy Min G25kileado",
    "unit": "H87",
    "satCode": "10171501",
    "price": 100,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "CMIN1",
    "name": "CARBOXY MIN L 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 198,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "CCZ",
    "name": "CARBOXY ZINC 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 401,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "CVK1",
    "name": "CUVREK 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 360,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "EB1",
    "name": "ENERBOOST 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 398,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "FOS1",
    "name": "FOSFONICUR 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 447,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "HAD1",
    "name": "HADDAK 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 679,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "MDAL1",
    "name": "MEDAL 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 684,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "MROOT1",
    "name": "MYCOROOT 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1715,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "MROOT333",
    "name": "MYCOROOT 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 581.66,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NROOT1",
    "name": "NEMAROOT 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1700,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "N333",
    "name": "NEMAROOT 333 GRS.",
    "unit": "H87",
    "satCode": "10171500",
    "price": 576.66,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NUTD",
    "name": "NUUTRIMAK+ DESARROLLO 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 406,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NUX",
    "name": "NUUTRIMAK+  VIGOR 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 274,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NUT10",
    "name": "NUTRISORB L 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3680,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NUT1",
    "name": "NUTRISORB L 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 398,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NUTG",
    "name": "NUTRISORB GRANULADO  1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 175,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "PK1",
    "name": "PACKHARD 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 277,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "PG1",
    "name": "PGR IV  1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1083,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "PVUP1",
    "name": "PREVENT UP 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 564,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "PRO1",
    "name": "PROBORATE 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 203,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "P5X20",
    "name": "PROMESOL 5X 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2840,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "P51LT",
    "name": "Promesol 5x 20Litreado",
    "unit": "H87",
    "satCode": "10171500",
    "price": 152,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "PCA1",
    "name": "PROMESOL CA 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 180,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "PMSG",
    "name": "PROMESOL G  SACO 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3325,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "PFE1",
    "name": "PROQUELATE FE 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 149,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "PMG1",
    "name": "PROQUELATE MG 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 149,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "PROMN",
    "name": "PROQUELATE MN 1 LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 164,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "PZN1",
    "name": "PROQUELATE ZINC 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 164,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "RAD1",
    "name": "RADIGROW 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 541,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "RADG1",
    "name": "RADIGROW G 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 220,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "RTX",
    "name": "RHIZO TX 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1414,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "RHITX333",
    "name": "RHIZOTX 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 481.33,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "RBACK1",
    "name": "RHIZOBAC COMBI I KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1656,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "RHIZCOM",
    "name": "RHIZOBAC COMBI 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 562,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "SEL1",
    "name": "SELECTO XL 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1044,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "TKR333",
    "name": "TKROOT 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 465,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "UTL",
    "name": "ULTRA V 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 352,
    "departmentName": "INNOVAK",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ABAX",
    "name": "ABAXO FERRO 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 410.1,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ALMX",
    "name": "ALGIMAX 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 374.38,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ALGM500",
    "name": "ALGIMEL 500 GR",
    "unit": "H87",
    "satCode": "10171600",
    "price": 581.25,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "AMG",
    "name": "AMINOGREEN 16 1 LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 380.63,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "AMG24",
    "name": "AMINOGREEN 24 1 LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 420,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BSOL",
    "name": "AMINOGREEN 90  1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 778.13,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "AMK",
    "name": "AMINOGREEN K 1LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 510,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BOR",
    "name": "BOR 1 LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 319.13,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BUFS",
    "name": "BUFALO SOLID 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 261,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "CPQ",
    "name": "CUPRIC QUELAT 5KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 363,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ENGY",
    "name": "ENERGY SOIL 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 230,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "FIT1L",
    "name": "Fitasio 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 472.22,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "FLOR",
    "name": "FLORCUAJE 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 520.78,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "GRCA",
    "name": "GREEN CABOR 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 196.31,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "GRCR",
    "name": "GREEN COBRE 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 296.63,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "GREP",
    "name": "Green P 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 490.85,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "GZL",
    "name": "GREEN ZINC 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 164.06,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "GCZ1",
    "name": "GREEN CALCIO ZINC 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 196.88,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "HRMG",
    "name": "HORMOSTING 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1116,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "HMTG",
    "name": "HORMOSTING 250ML",
    "unit": "H87",
    "satCode": "10171600",
    "price": 326.25,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "MQ",
    "name": "MANGANESSE QUELAT 5KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 363,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "MAXOR1L",
    "name": "Max Organic 20 x litro",
    "unit": "H87",
    "satCode": "10171600",
    "price": 145,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "MCE",
    "name": "MICRO ENERGIC 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 296.05,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NON",
    "name": "NON-PITT 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 390.94,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NUT",
    "name": "NUTRIMAZIN 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 232.88,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NTMB",
    "name": "NUTRIMOB 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 582.19,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "PHOSC",
    "name": "Phoscuprico 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 532.56,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "QUAN1",
    "name": "QUANTUM 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 531.25,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "QUAN5",
    "name": "QUANTUM 5 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 2531.25,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "QUAF",
    "name": "QUANTUM FLOWER 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 512.23,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "QRT1",
    "name": "QUANTUM ROOT 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 441.88,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "RZOOT1",
    "name": "RAIZOOT 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 393.75,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "SB1",
    "name": "SILISEC BOTRYSEC 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 308.26,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "SILG",
    "name": "SILISEC-BOTRYSEC 5KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1465.63,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "GSI1",
    "name": "SILISEC-K 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 220.63,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "SACV",
    "name": "SUCRE ACTIVE 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 317.39,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ZQ1",
    "name": "ZINESSE QUELAT 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 342.5,
    "departmentName": "AGRINOVA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "KERC20",
    "name": "KER CALCIO 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2321.98,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "KERCA1",
    "name": "Ker Cal 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 117,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "KERKC20",
    "name": "KER K 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 4403.29,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "KERK1L",
    "name": "Ker k 20Litrreado",
    "unit": "H87",
    "satCode": "10171500",
    "price": 221,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "KERMG1",
    "name": "Ker Magnesio mg 20Litreado",
    "unit": "H87",
    "satCode": "10171500",
    "price": 112,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "KERMN1",
    "name": "Ker MN 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 108,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "KNT1",
    "name": "Ker Nitro 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 114,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "KRPS1",
    "name": "Ker Phos 20Litreado",
    "unit": "H87",
    "satCode": "10171500",
    "price": 191,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "JPS1",
    "name": "JUMPSTART 1L",
    "unit": "H87",
    "satCode": "10171505",
    "price": 666.67,
    "departmentName": "TECNOFERSA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "KERC",
    "name": "KER CIBUS 1 L",
    "unit": "H87",
    "satCode": "10171601",
    "price": 463.24,
    "departmentName": "TECNOFERSA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "KC",
    "name": "KER CU 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 527.38,
    "departmentName": "TECNOFERSA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "KAB1",
    "name": "KER KAB 1L",
    "unit": "H87",
    "satCode": "12164001",
    "price": 699.35,
    "departmentName": "TECNOFERSA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "THIK1",
    "name": "KER THICK 1L",
    "unit": "H87",
    "satCode": "10171601",
    "price": 494.12,
    "departmentName": "TECNOFERSA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "KTHL",
    "name": "KER THICK LEAF",
    "unit": "H87",
    "satCode": "10171601",
    "price": 713.73,
    "departmentName": "TECNOFERSA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "KEYCLI",
    "name": "KEY CARBOXY 1LT",
    "unit": "H87",
    "satCode": "12164001",
    "price": 440,
    "departmentName": "TECNOFERSA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "KPLEX1",
    "name": "KEYPLEX 350 1L",
    "unit": "H87",
    "satCode": "10171505",
    "price": 750,
    "departmentName": "TECNOFERSA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ACET2",
    "name": "ACET200 500 GRS",
    "unit": "H87",
    "satCode": "10191509",
    "price": 1289.68,
    "departmentName": "AGROFARM",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "AGRIMT",
    "name": "AGROMECTINA 1L",
    "unit": "H87",
    "satCode": "10191509",
    "price": 718.75,
    "departmentName": "AGROFARM",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BACTO",
    "name": "BACTER OUT 800 GRS",
    "unit": "H87",
    "satCode": "10171702",
    "price": 596.59,
    "departmentName": "AGROFARM",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BTK731",
    "name": "BTKUR 731 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 392.86,
    "departmentName": "AGROFARM",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "CYAT",
    "name": "CYANTROL 1ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 5,
    "departmentName": "AGROFARM",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ECOT1",
    "name": "ECOTROL EC 1L",
    "unit": "H87",
    "satCode": "10191500",
    "price": 968.75,
    "departmentName": "AGROFARM",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ENG",
    "name": "ENGOR-D 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 762.2,
    "departmentName": "AGROFARM",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "EXPL",
    "name": "EXPLORER 1K",
    "unit": "H87",
    "satCode": "10171500",
    "price": 588.24,
    "departmentName": "AGROFARM",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "KEYBPS",
    "name": "KEYPLEX BYPASS 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1133.33,
    "departmentName": "AGROFARM",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "KFLL",
    "name": "K-full 1l",
    "unit": "H87",
    "satCode": "10171500",
    "price": 375,
    "departmentName": "AGROFARM",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "LDM",
    "name": "Landin 330 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 920,
    "departmentName": "AGROFARM",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "MAXCT",
    "name": "MAX CONTROL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1093.75,
    "departmentName": "AGROFARM",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "MAXDOS",
    "name": "Max Control  DOS 1ML",
    "unit": "H87",
    "satCode": "10171501",
    "price": 1.12,
    "departmentName": "AGROFARM",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "PPT",
    "name": "PEPTON 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 691.18,
    "departmentName": "AGROFARM",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "SPOR1",
    "name": "SPORAN EC 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 990.85,
    "departmentName": "AGROFARM",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "TTMAX",
    "name": "TETRA MAX 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 4687.5,
    "departmentName": "AGROFARM",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ADRM",
    "name": "ADERMEN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 152.94,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "AGRC",
    "name": "AGROCAN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 529.41,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "AGGL",
    "name": "AGROGARLIC 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 285.71,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "AGNM",
    "name": "Agro-Nem 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 897.83,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "AMXM",
    "name": "AMOXAM 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 425,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BFLL",
    "name": "BIOFULL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 421.57,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "CRMN",
    "name": "CORAMEN 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 699,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "DRV",
    "name": "DERRIVE 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 275,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "DERR250",
    "name": "Derrunbe 250 Ml",
    "unit": "H87",
    "satCode": "10171500",
    "price": 562.5,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "DRRB",
    "name": "DERRUNBE 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 940,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "FLY250",
    "name": "Flymen 250 Grs",
    "unit": "H87",
    "satCode": "10171500",
    "price": 466.67,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "LTL",
    "name": "LETAL 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 419.64,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "MXM",
    "name": "MAXIMO 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 465,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NIP250",
    "name": "Niprol 250 Ml",
    "unit": "H87",
    "satCode": "10171500",
    "price": 700,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NIP",
    "name": "NIPROL 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1400,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "OXFN",
    "name": "OXIFEN 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 600,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "SOPME",
    "name": "SOAPMEN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 225.49,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "SULB",
    "name": "SULBERMEN 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 151.92,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "SLBP",
    "name": "SULBER PLUS 250 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 491.67,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "SLBMX",
    "name": "SULBERMEN MAX 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 235.42,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "TXN",
    "name": "TOXAN 250 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 690,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "XPL",
    "name": "XIPROL 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 441.67,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ZANE",
    "name": "ZARANEEM",
    "unit": "H87",
    "satCode": "10171500",
    "price": 521.01,
    "departmentName": "AGROMEN",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ANT",
    "name": "ACIDO NITRICO 55% 20L",
    "unit": "H87",
    "satCode": "12352301",
    "price": 520,
    "departmentName": "FERTILIZANTES",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ASF",
    "name": "ACIDO SULFURICO 98% 20L",
    "unit": "H87",
    "satCode": "12352301",
    "price": 800.11,
    "departmentName": "FERTILIZANTES",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NCB",
    "name": "CALCIO BI   25 KG",
    "unit": "H87",
    "satCode": "10171611",
    "price": 413.35,
    "departmentName": "FERTILIZANTES",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "CTT",
    "name": "CINTILLA TORO",
    "unit": "H87",
    "satCode": "70171700",
    "price": 3250,
    "departmentName": "FERTILIZANTES",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "CLK",
    "name": "CLORURO DE POTASIO 25 KG",
    "unit": "H87",
    "satCode": "10171602",
    "price": 375,
    "departmentName": "FERTILIZANTES",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "KRF",
    "name": "KERF 25 KG",
    "unit": "H87",
    "satCode": "10171602",
    "price": 726.3,
    "departmentName": "FERTILIZANTES",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NMG",
    "name": "MAGNIT SACOS 25 KG",
    "unit": "H87",
    "satCode": "12352300",
    "price": 510,
    "departmentName": "FERTILIZANTES",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "MAP",
    "name": "MAP SACO 25 KG",
    "unit": "H87",
    "satCode": "12141909",
    "price": 907.77,
    "departmentName": "FERTILIZANTES",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "MKP",
    "name": "MKP SACO 25 KG",
    "unit": "H87",
    "satCode": "10171603",
    "price": 1132.05,
    "departmentName": "FERTILIZANTES",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NIT",
    "name": "Nitro-able III Urea",
    "unit": "H87",
    "satCode": "10171500",
    "price": 910,
    "departmentName": "FERTILIZANTES",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NKS",
    "name": "NKS 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 696.24,
    "departmentName": "FERTILIZANTES",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NKSULT",
    "name": "Nks ultrasol 25kg",
    "unit": "H87",
    "satCode": "10171500",
    "price": 638.71,
    "departmentName": "FERTILIZANTES",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "SLC",
    "name": "SOLUCROS SACO 25 KG",
    "unit": "H87",
    "satCode": "10171602",
    "price": 660,
    "departmentName": "FERTILIZANTES",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "SULMAG",
    "name": "SULMAG SACO 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 247.39,
    "departmentName": "FERTILIZANTES",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "LEOMIL",
    "name": "LEOMIFUL K 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 112,
    "departmentName": "Care soil 25kg",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BIOFRE",
    "name": "Bio-freeze 1l",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1250,
    "departmentName": "Care soil 25kg",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ANGS",
    "name": "ANGLOSAN 1L",
    "unit": "H87",
    "satCode": "47131803",
    "price": 850,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ANG",
    "name": "ANGLOSIL NSF 4L",
    "unit": "H87",
    "satCode": "47131803",
    "price": 599,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BSAR",
    "name": "BIOSARIA 1 L",
    "unit": "H87",
    "satCode": "10171607",
    "price": 373.33,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BIOV",
    "name": "BIOVIGOR 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 493.33,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "GLUT",
    "name": "GLUTASAN 50 1L",
    "unit": "H87",
    "satCode": "47131803",
    "price": 880,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "LAR",
    "name": "LARBIA 1 LT",
    "unit": "H87",
    "satCode": "10171607",
    "price": 373.33,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NMC",
    "name": "NEMACONTROL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 640,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "APPL",
    "name": "APPLAUD 40SC 500MG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 890.24,
    "departmentName": "Acolchado blanco",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BAYN",
    "name": "BAYFOLAN FORTE SL 11 1L",
    "unit": "H87",
    "satCode": "10171601",
    "price": 105,
    "departmentName": "Acolchado blanco",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BEL20G",
    "name": "BELEAF 20 GRS",
    "unit": "H87",
    "satCode": "10191509",
    "price": 140,
    "departmentName": "beleaf 150",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "DAP",
    "name": "DAP-ISQUISA",
    "unit": "H87",
    "satCode": "10171602",
    "price": 524.39,
    "departmentName": "Choice 1lt",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "DF",
    "name": "DECIS FORTE 450 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 462,
    "departmentName": "Choice 1lt",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "FIDGR",
    "name": "FIDATO 1GR",
    "unit": "H87",
    "satCode": "10171500",
    "price": 7.54,
    "departmentName": "FIA bomba manual",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "HER",
    "name": "HERBIPOL GLIFOSATO 970ML",
    "unit": "H87",
    "satCode": "10171700",
    "price": 190,
    "departmentName": "FIA bomba manual",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "KTNC",
    "name": "K- TIONIC 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 119,
    "departmentName": "FIA bomba manual",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "MALP",
    "name": "MALPHOS 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 280.82,
    "departmentName": "FIA bomba manual",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NFST",
    "name": "NO FROST 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 400,
    "departmentName": "FIA bomba manual",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "PRONTUS",
    "name": "PRONTIUS 1KG",
    "unit": "H87",
    "satCode": "10171702",
    "price": 420,
    "departmentName": "FIA bomba manual",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "PNTS",
    "name": "PRONTIUS 200 GRS",
    "unit": "H87",
    "satCode": "10171702",
    "price": 100,
    "departmentName": "FIA bomba manual",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "RAFD",
    "name": "RAFIA DELGADA 1KG",
    "unit": "H87",
    "satCode": "21102300",
    "price": 110,
    "departmentName": "FIA bomba manual",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "RALLY",
    "name": "RALLY 40W 114 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 560,
    "departmentName": "FIA bomba manual",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "RAN200",
    "name": "Ranman 200 ml",
    "unit": "H87",
    "satCode": "10171501",
    "price": 891.01,
    "departmentName": "FIA bomba manual",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "SLB",
    "name": "SALIBRO 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 4930,
    "departmentName": "FIA bomba manual",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "SEC",
    "name": "SECADOR 900ML",
    "unit": "H87",
    "satCode": "10171700",
    "price": 105,
    "departmentName": "FIA bomba manual",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "TOEMIL",
    "name": "TORETTO DOSIF ML",
    "unit": "H87",
    "satCode": "10171701",
    "price": 4.8,
    "departmentName": "FIA bomba manual",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "VEL",
    "name": "VELADES 20LT",
    "unit": "H87",
    "satCode": "10171801",
    "price": 160,
    "departmentName": "Urea yara",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ACTDOS",
    "name": "ACTIVANE DOS 100G",
    "unit": "H87",
    "satCode": "10171600",
    "price": 168.02,
    "departmentName": "LIDA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ACTIVA1",
    "name": "ACTIVANE 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1562.64,
    "departmentName": "LIDA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ENG100",
    "name": "ENGORDONE 100 GRS",
    "unit": "H87",
    "satCode": "10171600",
    "price": 342.18,
    "departmentName": "LIDA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ENGOR",
    "name": "ENGORDONE DOSIF",
    "unit": "H87",
    "satCode": "10171600",
    "price": 302.31,
    "departmentName": "LIDA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "MAXDOS",
    "name": "MAXIFRUTO DOS 250ML",
    "unit": "H87",
    "satCode": "10171600",
    "price": 572.5,
    "departmentName": "LIDA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "MAXI",
    "name": "MAXIFRUTO 500ML",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1065.11,
    "departmentName": "LIDA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "STEDOS",
    "name": "STEMICOL DOS 100GR",
    "unit": "H87",
    "satCode": "10171600",
    "price": 119.86,
    "departmentName": "LIDA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "STEMI1K",
    "name": "STEMICOL 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1114.82,
    "departmentName": "LIDA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ULT",
    "name": "ULTIMITE 1LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1406.15,
    "departmentName": "LIDA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ULTDOS",
    "name": "ULTIMITE DOS 250ML",
    "unit": "H87",
    "satCode": "10171600",
    "price": 377.9,
    "departmentName": "LIDA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "B100",
    "name": "B100-AMYL  1LT",
    "unit": "H87",
    "satCode": "10171608",
    "price": 600,
    "departmentName": "LABMA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BACTI",
    "name": "BACTIROOT 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 600,
    "departmentName": "LABMA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BIO_SOLI",
    "name": "BIO COMPLEX 1 SOLID 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 366.67,
    "departmentName": "LABMA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BIOINS1",
    "name": "BIO INSECT MIX 1 500ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 555.56,
    "departmentName": "LABMA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BIOINS2",
    "name": "BIO INSECT MIX 2 500ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 434.03,
    "departmentName": "LABMA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BIO_PA",
    "name": "BIO PAE 500ML",
    "unit": "H87",
    "satCode": "41106503",
    "price": 400,
    "departmentName": "LABMA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BIO_PRO",
    "name": "BIO PROTECTO 6 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 692.31,
    "departmentName": "LABMA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BIORI",
    "name": "Bio Rize 10gr",
    "unit": "H87",
    "satCode": "10171500",
    "price": 538.46,
    "departmentName": "LABMA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BIO_CO",
    "name": "BIO-COMPLEX 1L",
    "unit": "H87",
    "satCode": "10171801",
    "price": 750,
    "departmentName": "LABMA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BIO_NPK",
    "name": "BIO-COMPLEX NPK",
    "unit": "H87",
    "satCode": "10171801",
    "price": 600,
    "departmentName": "LABMA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BIO_TRIN",
    "name": "BIO-TRINCHO 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 607.14,
    "departmentName": "LABMA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "BIO_YO",
    "name": "BIO-YODO 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 395.83,
    "departmentName": "LABMA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "ECO",
    "name": "ECOFILM 1LT",
    "unit": "H87",
    "satCode": "11121502",
    "price": 585.94,
    "departmentName": "LABMA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NA_HO_BA",
    "name": "NANO-HO-BA 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 694.44,
    "departmentName": "LABMA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "NANO",
    "name": "Nano-virus 1lt",
    "unit": "H87",
    "satCode": "10171500",
    "price": 746.53,
    "departmentName": "LABMA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "PL_NEMA",
    "name": "PL-NEMATICIDA 1LT",
    "unit": "H87",
    "satCode": "41106503",
    "price": 600,
    "departmentName": "LABMA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "PRO_RA",
    "name": "PRO RAIZ MAX 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 566.67,
    "departmentName": "LABMA",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "AGRIS",
    "name": "AGRISUR 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 714.12,
    "departmentName": "BIORIZON",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "AGR",
    "name": "AGRISUR Z 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1131.25,
    "departmentName": "BIORIZON",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "AZUL",
    "name": "BOSTER AZUL 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 395.29,
    "departmentName": "BIORIZON",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "KOLO",
    "name": "KOLORNEUTRO 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 280.3,
    "departmentName": "BIORIZON",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "PHOST",
    "name": "PHOSTROT 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 311.42,
    "departmentName": "BIORIZON",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "SOLO",
    "name": "SOLO K 2.5KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1541.67,
    "departmentName": "BIORIZON",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "AGRO50",
    "name": "AGRO-OX 50 4LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 599,
    "departmentName": "DESINFECTANTES",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "GLUT50",
    "name": "Glutaral 50 1lt",
    "unit": "H87",
    "satCode": "10171500",
    "price": 880,
    "departmentName": "DESINFECTANTES",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "INVE1",
    "name": "Inver clean 1lt",
    "unit": "H87",
    "satCode": "10171500",
    "price": 850,
    "departmentName": "DESINFECTANTES",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "INVE5",
    "name": "Inver clean 5lt",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3750.26,
    "departmentName": "DESINFECTANTES",
    "branchCode": "ZARIOZ"
  },
  {
    "code": "AK1",
    "name": "ALGAK 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 376,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "AT1",
    "name": "ATP UP 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 434,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BLO10",
    "name": "BALOX 10 LTS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 5940,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BLOX1",
    "name": "BALOX 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 615,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BET",
    "name": "BESTCURE 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1080,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BIOC1",
    "name": "BIOCINNAFOL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 870,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BIOCRIF1",
    "name": "BIOCRIFOL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1650,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BF1KG",
    "name": "BIOFIT G 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 292,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BG20",
    "name": "BIOFIT G 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 5640,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BIO",
    "name": "BIOFIT RTU 1 KG.",
    "unit": "H87",
    "satCode": "10171500",
    "price": 851,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BFIT333",
    "name": "BIOFIT RTU 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 293.66,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "CFE1",
    "name": "CARBOXY FE 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 412,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "CFE",
    "name": "CARBOXY FE 5 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2000,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "CK10",
    "name": "CARBOXY K 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1940,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "CK1",
    "name": "CARBOXY K 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 223,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "CKX",
    "name": "CARBOXY K MAX 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 288,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "CL1",
    "name": "CARBOXY L 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 212,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "CMCRO1",
    "name": "CARBOXY MICRO 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 319,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "CMCRO",
    "name": "CARBOXY MICRO 5 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1475,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "CMING",
    "name": "CARBOXY MIN G 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2375,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "CMIN1",
    "name": "CARBOXY MIN L 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 198,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "CCZ",
    "name": "CARBOXY ZINC 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 401,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "CZN",
    "name": "CARBOXY ZINC 5 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1945,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "CVK1",
    "name": "CUVREK 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 360,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "EB1",
    "name": "ENERBOOST 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 398,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "FOS1",
    "name": "FOSFONICUR 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 447,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "HAD1",
    "name": "HADDAK 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 679,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "MDAL1",
    "name": "MEDAL 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 684,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "MROOT1",
    "name": "MYCOROOT 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1715,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NROOT1",
    "name": "NEMAROOT 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1700,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NUTD",
    "name": "NUUTRIMAK+ DESARROLLO 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 406,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NUX",
    "name": "NUUTRIMAK+  VIGOR 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 274,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NUT10",
    "name": "NUTRISORB L 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3680,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NUT1",
    "name": "NUTRISORB L 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 398,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NUT20",
    "name": "NUTRISORB L 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 6680,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NUTG",
    "name": "NUTRISORB GRANULADO 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 4300,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NUTG",
    "name": "NUTRISORB GRANULADO  1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 175,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PK10",
    "name": "PACKHARD 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2470,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PK1",
    "name": "PACKHARD 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 277,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PG1",
    "name": "PGR IV  1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1083,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PVUP1",
    "name": "PREVENT UP 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 564,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "P5X10",
    "name": "PROMESOL 5X 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1484,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "P5X20",
    "name": "PROMESOL 5X 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2840,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "P5X1LT",
    "name": "Promesol 5X litreado",
    "unit": "H87",
    "satCode": "10171500",
    "price": 152,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PCA20",
    "name": "PROMESOL CA 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3380,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PCA1",
    "name": "PROMESOL CA 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 180,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PMSG",
    "name": "PROMESOL G  SACO 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3325,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PFE1",
    "name": "PROQUELATE FE 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 149,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PMG1",
    "name": "PROQUELATE MG 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 149,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PROMN",
    "name": "PROQUELATE MN 1 LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 164,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PZN1",
    "name": "PROQUELATE ZINC 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 164,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "RADG25",
    "name": "RADIGROW G 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 5375,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "RADG1",
    "name": "RADIGROW G 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 220,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "RAD10",
    "name": "RADIGROW 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 4960,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "RAD1",
    "name": "RADIGROW 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 541,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "RTX",
    "name": "RHIZO TX 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1414,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "RHITX333",
    "name": "RHIZOTX 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 481.33,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "RBACK1",
    "name": "RHIZOBAC COMBI I KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1656,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "SEL1",
    "name": "SELECTO XL 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1044,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "TK1",
    "name": "TKROOT 1 KG.",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1365,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "UTL",
    "name": "ULTRA V 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 352,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "VER10",
    "name": "VERNUM 10 LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1270,
    "departmentName": "INNOVAK",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ABAX",
    "name": "ABAXO FERRO 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 410.1,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ALMX",
    "name": "ALGIMAX 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 374.38,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ALGM500",
    "name": "ALGIMEL 500 GR",
    "unit": "H87",
    "satCode": "10171600",
    "price": 581.25,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "AMG",
    "name": "AMINOGREEN 16 1 LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 380.63,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "AMG24",
    "name": "AMINOGREEN 24 1 LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 420,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BSOL",
    "name": "AMINOGREEN 90  1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 778.13,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "AMK",
    "name": "AMINOGREEN K 1LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 510,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BOR",
    "name": "BOR 1 LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 319.13,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BUSOL1",
    "name": "bufalo solid kileado",
    "unit": "H87",
    "satCode": "10171600",
    "price": 261,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "CUP1KG",
    "name": "Cupric Quelat 1kg",
    "unit": "H87",
    "satCode": "10171600",
    "price": 363,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "CPQ",
    "name": "CUPRIC QUELAT 5KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1812.5,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ENGY",
    "name": "ENERGY SOIL 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 230,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "FLOR",
    "name": "FLORCUAJE 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 520.78,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "GRCA",
    "name": "GREEN CABOR 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 196.31,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "GCZ1",
    "name": "GREEN CALCIO ZINC 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 196.88,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "GRCR",
    "name": "GREEN COBRE 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 296.63,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "GZL",
    "name": "GREEN ZINC 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 164.06,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "HRMG",
    "name": "HORMOSTING 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1116,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "HMTG",
    "name": "HORMOSTING 250ML",
    "unit": "H87",
    "satCode": "10171600",
    "price": 326.25,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "MAG1K",
    "name": "Manganese Quelat 1kg",
    "unit": "H87",
    "satCode": "10171600",
    "price": 363,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "MQ",
    "name": "MANGANESSE QUELAT 5KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1814.06,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "MCE",
    "name": "MICRO ENERGIC 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 296.05,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NON",
    "name": "NON-PITT 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 390.94,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NUT",
    "name": "NUTRIMAZIN 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 232.88,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NTMB",
    "name": "NUTRIMOB 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 582.19,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "QUAN1",
    "name": "QUANTUM 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 531.25,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "QUAN5",
    "name": "QUANTUM 5 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 2531.25,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "QUAF",
    "name": "QUANTUM FLOWER 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 512.23,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "QRT1",
    "name": "QUANTUM ROOT 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 441.88,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "RZOOT1",
    "name": "RAIZOOT 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 393.75,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "SB1",
    "name": "SILISEC BOTRYSEC 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 308.26,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "SILG",
    "name": "SILISEC-BOTRYSEC 5KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1465.63,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "GSI1",
    "name": "SILISEC-K 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 220.63,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "SACV",
    "name": "SUCRE ACTIVE 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 317.39,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ZQ1",
    "name": "ZINESSE QUELAT 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 342.5,
    "departmentName": "AGRINOVA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KERC20",
    "name": "KER CALCIO 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2321.98,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KRCA5",
    "name": "KER CALCIO 5L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 612.57,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KERCALI",
    "name": "KER CALCIO 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 117,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KERKC20",
    "name": "KER K 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 4403.29,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KER_KLT",
    "name": "Ker k 20Litreado",
    "unit": "H87",
    "satCode": "10171500",
    "price": 221,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KERK5L",
    "name": "KER K 5 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1132.9,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KERMNL",
    "name": "Ker Mn",
    "unit": "H87",
    "satCode": "10171500",
    "price": 108,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KERN20",
    "name": "KER NITRO 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2274.51,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KEPHSL",
    "name": "Ker Phos 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 191,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KERPH20",
    "name": "KER PHOS 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3800.95,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "JPS1",
    "name": "JUMPSTART 1L",
    "unit": "H87",
    "satCode": "10171505",
    "price": 666.67,
    "departmentName": "TECNOFERSA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KERC",
    "name": "KER CIBUS 1 L",
    "unit": "H87",
    "satCode": "10171601",
    "price": 463.24,
    "departmentName": "TECNOFERSA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KC",
    "name": "KER CU 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 527.38,
    "departmentName": "TECNOFERSA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KAB1",
    "name": "KER KAB 1L",
    "unit": "H87",
    "satCode": "12164001",
    "price": 699.35,
    "departmentName": "TECNOFERSA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KEYBPS",
    "name": "KEYPLEX BYPASS 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1133.33,
    "departmentName": "TECNOFERSA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "THIK1",
    "name": "KER THICK 1L",
    "unit": "H87",
    "satCode": "10171601",
    "price": 494.12,
    "departmentName": "TECNOFERSA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KTHL",
    "name": "KER THICK LEAF",
    "unit": "H87",
    "satCode": "10171601",
    "price": 713.73,
    "departmentName": "TECNOFERSA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KCA5",
    "name": "KEY CARBOXY 5L",
    "unit": "H87",
    "satCode": "12164001",
    "price": 2179.93,
    "departmentName": "TECNOFERSA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KEYCLI",
    "name": "KEY CARBOXY 1LT",
    "unit": "H87",
    "satCode": "12164001",
    "price": 440,
    "departmentName": "TECNOFERSA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KPLEX1",
    "name": "KEYPLEX 350 1L",
    "unit": "H87",
    "satCode": "10171505",
    "price": 750,
    "departmentName": "TECNOFERSA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ACET2",
    "name": "ACET200 500 GRS",
    "unit": "H87",
    "satCode": "10191509",
    "price": 1289.68,
    "departmentName": "AGROFARM",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "AGRIMT",
    "name": "AGROMECTINA 1L",
    "unit": "H87",
    "satCode": "10191509",
    "price": 718.75,
    "departmentName": "AGROFARM",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BACTO",
    "name": "BACTER OUT 800 GRS",
    "unit": "H87",
    "satCode": "10171702",
    "price": 596.59,
    "departmentName": "AGROFARM",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BTK731",
    "name": "BTKUR 731 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 392.86,
    "departmentName": "AGROFARM",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ECOT1",
    "name": "ECOTROL EC 1L",
    "unit": "H87",
    "satCode": "10191500",
    "price": 968.75,
    "departmentName": "AGROFARM",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ENG",
    "name": "ENGOR-D 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 762.2,
    "departmentName": "AGROFARM",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "MAXCT",
    "name": "MAX CONTROL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1093.75,
    "departmentName": "AGROFARM",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PPT",
    "name": "PEPTON 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 691.18,
    "departmentName": "AGROFARM",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "SPOR1",
    "name": "SPORAN EC 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 990.85,
    "departmentName": "AGROFARM",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "TTMAX",
    "name": "TETRA MAX 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 4687.5,
    "departmentName": "AGROFARM",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ADRM",
    "name": "ADERMEN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 152.94,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "AGRC",
    "name": "AGROCAN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 529.41,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "AGGL",
    "name": "AGROGARLIC 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 285.71,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "AMXM",
    "name": "AMOXAM 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 425,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BFLL",
    "name": "BIOFULL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 421.57,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "CRMN",
    "name": "CORAMEN 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 699,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "DRV",
    "name": "DERRIVE 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 275,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "DRRB",
    "name": "DERRUNBE 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 940,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "FLY250",
    "name": "Flymen 250 Grs",
    "unit": "H87",
    "satCode": "10171500",
    "price": 466.67,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "LTL",
    "name": "LETAL 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 419.64,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "MXM",
    "name": "MAXIMO 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 465,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NIP250",
    "name": "Niprol 250 Ml",
    "unit": "H87",
    "satCode": "10171500",
    "price": 700,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NIP",
    "name": "NIPROL 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1400,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NIPDOS",
    "name": "Niprol Ml Dosificado",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "OXFN",
    "name": "OXIFEN 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 600,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "OXFN500ML",
    "name": "OXIFEN 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1010,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "SOPME",
    "name": "SOAPMEN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 225.49,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "SLBMX",
    "name": "SULBERMEN MAX 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 235.42,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "SLBP",
    "name": "SULBER PLUS 250 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 491.67,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "TXN",
    "name": "TOXAN 250 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 690,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "XPL",
    "name": "XIPROL 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 441.67,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ZANE",
    "name": "ZARANEEM",
    "unit": "H87",
    "satCode": "10171500",
    "price": 521.01,
    "departmentName": "AGROMEN",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ANT",
    "name": "ACIDO NITRICO 55% 20L",
    "unit": "H87",
    "satCode": "12352301",
    "price": 520,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ASF",
    "name": "ACIDO SULFURICO 98% 20L",
    "unit": "H87",
    "satCode": "12352301",
    "price": 800.11,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ANILL",
    "name": "Anillo de tomatero 1KG",
    "unit": "H87",
    "satCode": "31163230",
    "price": 170,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NCB",
    "name": "CALCIO BI   25 KG",
    "unit": "H87",
    "satCode": "10171611",
    "price": 413.35,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "CTT",
    "name": "CINTILLA TORO",
    "unit": "H87",
    "satCode": "70171700",
    "price": 3250,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "CLK",
    "name": "CLORURO DE POTASIO 25 KG",
    "unit": "H87",
    "satCode": "10171602",
    "price": 375,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "FSTO",
    "name": "FOSFONITRATO 25KG",
    "unit": "H87",
    "satCode": "10171603",
    "price": 375,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "FOSF50",
    "name": "FOSFONITRATO 50KG",
    "unit": "H87",
    "satCode": "10171603",
    "price": 661.11,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "FULL_MI",
    "name": "FULLMIX 25 KG",
    "unit": "H87",
    "satCode": "10171602",
    "price": 3769.43,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KRF",
    "name": "KERF 25 KG",
    "unit": "H87",
    "satCode": "10171602",
    "price": 726.3,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NMG",
    "name": "MAGNIT SACOS 25 KG",
    "unit": "H87",
    "satCode": "12352300",
    "price": 510,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "MAP",
    "name": "MAP SACO 25 KG",
    "unit": "H87",
    "satCode": "12141909",
    "price": 907.77,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "MKP",
    "name": "MKP SACO 25 KG",
    "unit": "H87",
    "satCode": "10171603",
    "price": 1132.05,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NKS",
    "name": "NKS 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 696.24,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "RAFD",
    "name": "RAFIA DELGADA 1KG",
    "unit": "H87",
    "satCode": "21102300",
    "price": 110,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "RAF",
    "name": "RAFIA GRUESA 1KG",
    "unit": "H87",
    "satCode": "21102300",
    "price": 110,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "SLR",
    "name": "SOLUBOR 25KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 110,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "SLC",
    "name": "SOLUCROS SACO 25 KG",
    "unit": "H87",
    "satCode": "10171602",
    "price": 660,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "SOP",
    "name": "SOP ULTRASOL 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 620,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "SULMAG",
    "name": "SULMAG SACO 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 247.39,
    "departmentName": "FERTILIZANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "LEOMIL",
    "name": "LEOMIFUL K 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 112,
    "departmentName": "LAFIC",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "LEOMI5L",
    "name": "LEOMIFUL K 5L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 540,
    "departmentName": "LAFIC",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ANGS",
    "name": "ANGLOSAN 1L",
    "unit": "H87",
    "satCode": "47131803",
    "price": 850,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ANGL5",
    "name": "ANGLOSAN 5L",
    "unit": "H87",
    "satCode": "47131803",
    "price": 3750.26,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "AGSIL",
    "name": "ANGLOSIL 20 L",
    "unit": "H87",
    "satCode": "47131803",
    "price": 2322,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ANG",
    "name": "ANGLOSIL NSF 4L",
    "unit": "H87",
    "satCode": "47131803",
    "price": 599,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BSAR",
    "name": "BIOSARIA 1 L",
    "unit": "H87",
    "satCode": "10171607",
    "price": 373.33,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BIOV",
    "name": "BIOVIGOR 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 493.33,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "GLUT",
    "name": "GLUTASAN 50 1L",
    "unit": "H87",
    "satCode": "47131803",
    "price": 880,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "LAR",
    "name": "LARBIA 1 LT",
    "unit": "H87",
    "satCode": "10171607",
    "price": 373.33,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NMC",
    "name": "NEMACONTROL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 640,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PLIM",
    "name": "PLINIUM 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 386.67,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "APPL",
    "name": "APPLAUD 40SC 500MG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 890.24,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BTL",
    "name": "BACTROL 2X 800GR",
    "unit": "H87",
    "satCode": "10171500",
    "price": 710,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BEL20G",
    "name": "BELEAF 20 GRS",
    "unit": "H87",
    "satCode": "10191509",
    "price": 140,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "CORAZ",
    "name": "CORAZA 1L",
    "unit": "H87",
    "satCode": "10171702",
    "price": 220,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "DAP",
    "name": "DAP-ISQUISA",
    "unit": "H87",
    "satCode": "10171602",
    "price": 524.39,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "DF",
    "name": "DECIS FORTE 450 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 462,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "DSFR",
    "name": "DOSIFICADOR 50ML",
    "unit": "H87",
    "satCode": null,
    "price": 20,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "DGN",
    "name": "DRAGONIL 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 203.03,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "EVIS",
    "name": "EVISECT 500GR",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1159.76,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "FIDGR",
    "name": "FIDATO 1GR",
    "unit": "H87",
    "satCode": "10171500",
    "price": 7.54,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "FTLS",
    "name": "FONTELIS 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2079,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "HAVAC",
    "name": "HAVOC PELLET 1KG",
    "unit": "H87",
    "satCode": "10191509",
    "price": 290,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "HER",
    "name": "HERBIPOL GLIFOSATO 970ML",
    "unit": "H87",
    "satCode": "10171700",
    "price": 190,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KTNC",
    "name": "K- TIONIC 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 119,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "MAIZDK_",
    "name": "MAIZ DK-357",
    "unit": "H87",
    "satCode": "10151513",
    "price": 3160,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "MAIZH",
    "name": "MAIZ H377",
    "unit": "H87",
    "satCode": "50221001",
    "price": 2240,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PAQ_ELUMI",
    "name": "PAQ. ELUMIS (GESAPRIM/PRIMAGRAM)",
    "unit": "H87",
    "satCode": "10191509",
    "price": 1020,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PASTI",
    "name": "PASTILLAS QUIKCFUME -20% \"192\"",
    "unit": "H87",
    "satCode": "10171500",
    "price": 40,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PIC1",
    "name": "PICUDO 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1047.06,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PIRIFLU",
    "name": "PIRIFLU 500ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2146.34,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PRONTUS",
    "name": "PRONTIUS 1KG",
    "unit": "H87",
    "satCode": "10171702",
    "price": 420,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PNTS",
    "name": "PRONTIUS 200 GRS",
    "unit": "H87",
    "satCode": "10171702",
    "price": 100,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "RALLY",
    "name": "RALLY 40W 114 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 560,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "RNAN",
    "name": "RANMAN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3192,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "SLB",
    "name": "SALIBRO 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 4930,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "SEC",
    "name": "SECADOR 900ML",
    "unit": "H87",
    "satCode": "10171700",
    "price": 105,
    "departmentName": "Bomba manual",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "UMB",
    "name": "UMBRAL  1L",
    "unit": "H87",
    "satCode": "12164000",
    "price": 438.79,
    "departmentName": "TAPSON",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "UREA",
    "name": "UREA-ISQUISA",
    "unit": "H87",
    "satCode": "10171602",
    "price": 347.56,
    "departmentName": "TAPSON",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "VEL",
    "name": "VELADES 20LT",
    "unit": "H87",
    "satCode": "10171801",
    "price": 3035.71,
    "departmentName": "TAPSON",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "VELA5",
    "name": "VELADES 5LT",
    "unit": "H87",
    "satCode": "10171801",
    "price": 781.25,
    "departmentName": "TAPSON",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "FOLI",
    "name": "VENENO ARRIERA 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 22,
    "departmentName": "TAPSON",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ACTDOS",
    "name": "ACTIVANE DOS 100G",
    "unit": "H87",
    "satCode": "10171600",
    "price": 168.02,
    "departmentName": "LIDA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ACTIVA1",
    "name": "ACTIVANE 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1562.64,
    "departmentName": "LIDA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ENG100",
    "name": "ENGORDONE 100 GRS",
    "unit": "H87",
    "satCode": "10171600",
    "price": 342.18,
    "departmentName": "LIDA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ENGOR",
    "name": "ENGORDONE DOSIF",
    "unit": "H87",
    "satCode": "10171600",
    "price": 302.31,
    "departmentName": "LIDA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "MAXDOS",
    "name": "MAXIFRUTO DOS 250ML",
    "unit": "H87",
    "satCode": "10171600",
    "price": 572.5,
    "departmentName": "LIDA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "MAXI",
    "name": "MAXIFRUTO 500ML",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1065.11,
    "departmentName": "LIDA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "STEDOS",
    "name": "STEMICOL DOS 100GR",
    "unit": "H87",
    "satCode": "10171600",
    "price": 119.86,
    "departmentName": "LIDA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "STEMI1K",
    "name": "STEMICOL 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1114.82,
    "departmentName": "LIDA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ULT",
    "name": "ULTIMITE 1LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1406.15,
    "departmentName": "LIDA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ULTDOS",
    "name": "ULTIMITE DOS 250ML",
    "unit": "H87",
    "satCode": "10171600",
    "price": 377.9,
    "departmentName": "LIDA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "B100",
    "name": "B100-AMYL  1LT",
    "unit": "H87",
    "satCode": "10171608",
    "price": 600,
    "departmentName": "LABMA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BACTI",
    "name": "BACTIROOT 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 600,
    "departmentName": "LABMA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BIO_SOLI",
    "name": "BIO COMPLEX 1 SOLID 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 366.67,
    "departmentName": "LABMA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BIOINS1",
    "name": "BIO INSECT MIX 1 500ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 555.56,
    "departmentName": "LABMA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BIOINS2",
    "name": "BIO INSECT MIX 2 500ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 434.03,
    "departmentName": "LABMA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BIO_PA",
    "name": "BIO PAE 500ML",
    "unit": "H87",
    "satCode": "41106503",
    "price": 400,
    "departmentName": "LABMA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BIO_PRO",
    "name": "BIO PROTECTO 6 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 692.31,
    "departmentName": "LABMA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BIORI",
    "name": "Bio Rize 10gr",
    "unit": "H87",
    "satCode": "10171500",
    "price": 538.46,
    "departmentName": "LABMA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BIO_CO",
    "name": "BIO-COMPLEX 1L",
    "unit": "H87",
    "satCode": "10171801",
    "price": 750,
    "departmentName": "LABMA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BIO_NPK",
    "name": "BIO-COMPLEX NPK",
    "unit": "H87",
    "satCode": "10171801",
    "price": 600,
    "departmentName": "LABMA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BIO_TRIN",
    "name": "BIO-TRINCHO 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 607.14,
    "departmentName": "LABMA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BIO_YO",
    "name": "BIO-YODO 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 395.83,
    "departmentName": "LABMA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "ECO",
    "name": "ECOFILM 1LT",
    "unit": "H87",
    "satCode": "11121502",
    "price": 585.94,
    "departmentName": "LABMA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NA_HO_BA",
    "name": "NANO-HO-BA 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 694.44,
    "departmentName": "LABMA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "NANO",
    "name": "Nano-virus 1lt",
    "unit": "H87",
    "satCode": "10171500",
    "price": 746.53,
    "departmentName": "LABMA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PL_NEMA",
    "name": "PL-NEMATICIDA 1LT",
    "unit": "H87",
    "satCode": "41106503",
    "price": 600,
    "departmentName": "LABMA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PRO_RA",
    "name": "PRO RAIZ MAX 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 566.67,
    "departmentName": "LABMA",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "AGRO50",
    "name": "AGRO-OX 50 4LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 599,
    "departmentName": "DESINFECTANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "GLUT50",
    "name": "Glutaral 50 1lt",
    "unit": "H87",
    "satCode": "10171500",
    "price": 880,
    "departmentName": "DESINFECTANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "INVE1",
    "name": "Inver clean 1lt",
    "unit": "H87",
    "satCode": "10171500",
    "price": 850,
    "departmentName": "DESINFECTANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "INVE5",
    "name": "Inver clean 5lt",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3750.26,
    "departmentName": "DESINFECTANTES",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "AGRIS",
    "name": "AGRISUR 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 714.12,
    "departmentName": "BIORIZON",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "AGRIZ",
    "name": "AGRISUR Z 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1131.25,
    "departmentName": "BIORIZON",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "BOST",
    "name": "BOSTER AZUL 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 395.29,
    "departmentName": "BIORIZON",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "KOLO",
    "name": "KOLORNEUTRO 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 280.3,
    "departmentName": "BIORIZON",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "PHOST",
    "name": "PHOSTROT 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 311.42,
    "departmentName": "BIORIZON",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "SOLO",
    "name": "SOLO K 2.5 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1541.67,
    "departmentName": "BIORIZON",
    "branchCode": "HUAJUAPAN"
  },
  {
    "code": "AT1",
    "name": "ATP UP 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 434,
    "departmentName": "INNOVAK",
    "branchCode": "PRADERA"
  },
  {
    "code": "AK1",
    "name": "ALGAK 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 376,
    "departmentName": "INNOVAK",
    "branchCode": "PRADERA"
  },
  {
    "code": "BLOX1",
    "name": "BALOX 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 615,
    "departmentName": "INNOVAK",
    "branchCode": "PRADERA"
  },
  {
    "code": "BET",
    "name": "BESTCURE 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1080,
    "departmentName": "INNOVAK",
    "branchCode": "PRADERA"
  },
  {
    "code": "BIO",
    "name": "BIOFIT RTU 1 KG.",
    "unit": "H87",
    "satCode": "10171500",
    "price": 851,
    "departmentName": "INNOVAK",
    "branchCode": "PRADERA"
  },
  {
    "code": "BIODOS",
    "name": "Biofit Rtu 250 grs",
    "unit": "H87",
    "satCode": "10171500",
    "price": 215,
    "departmentName": "INNOVAK",
    "branchCode": "PRADERA"
  },
  {
    "code": "CFE1",
    "name": "CARBOXY FE 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 412,
    "departmentName": "INNOVAK",
    "branchCode": "PRADERA"
  },
  {
    "code": "CFE",
    "name": "CARBOXY FE 5 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2000,
    "departmentName": "INNOVAK",
    "branchCode": "PRADERA"
  },
  {
    "code": "CK1",
    "name": "CARBOXY K 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 223,
    "departmentName": "INNOVAK",
    "branchCode": "PRADERA"
  },
  {
    "code": "CKX",
    "name": "CARBOXY K MAX 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 288,
    "departmentName": "INNOVAK",
    "branchCode": "PRADERA"
  },
  {
    "code": "CL1",
    "name": "CARBOXY L 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 212,
    "departmentName": "INNOVAK",
    "branchCode": "PRADERA"
  },
  {
    "code": "CMCRO1",
    "name": "CARBOXY MICRO 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 319,
    "departmentName": "INNOVAK",
    "branchCode": "PRADERA"
  },
  {
    "code": "CMCRO",
    "name": "CARBOXY MICRO 5 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1475,
    "departmentName": "INNOVAK",
    "branchCode": "PRADERA"
  },
  {
    "code": "CMING",
    "name": "Carboxy Min G25kileado",
    "unit": "H87",
    "satCode": "10171501",
    "price": 100,
    "departmentName": "INNOVAK",
    "branchCode": "PRADERA"
  },
  {
    "code": "CMIN1",
    "name": "CARBOXY MIN L 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 198,
    "departmentName": "INNOVAK",
    "branchCode": "PRADERA"
  },
  {
    "code": "CCZ",
    "name": "CARBOXY ZINC 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 401,
    "departmentName": "INNOVAK",
    "branchCode": "PRADERA"
  },
  {
    "code": "FOS1",
    "name": "FOSFONICUR 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 447,
    "departmentName": "INNOVAK",
    "branchCode": "PRADERA"
  },
  {
    "code": "HAD1",
    "name": "HADDAK 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 679,
    "departmentName": "INNOVAK",
    "branchCode": "PRADERA"
  },
  {
    "code": "MDAL1",
    "name": "MEDAL 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 684,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "MROOT1",
    "name": "MYCOROOT 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1715,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "MROOT333",
    "name": "MYCOROOT 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 581.66,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "NROOT1",
    "name": "NEMAROOT 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1700,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "NEMDOS",
    "name": "NEMAROOT DOS GR",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "NUTD",
    "name": "NUUTRIMAK+ DESARROLLO 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 406,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "NUX",
    "name": "NUUTRIMAK+  VIGOR 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 274,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "NUT10",
    "name": "NUTRISORB L 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3680,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "NUT1",
    "name": "NUTRISORB L 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 398,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "NUTG",
    "name": "NUTRISORB GRANULADO  1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 175,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "PK1",
    "name": "PACKHARD 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 277,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "PG1",
    "name": "PGR IV  1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1083,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "PVUP1",
    "name": "PREVENT UP 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 564,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "PRO1",
    "name": "PROBORATE 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 203,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "P5X20",
    "name": "PROMESOL 5X 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2840,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "P51LT",
    "name": "Promesol 5x 20Litreado",
    "unit": "H87",
    "satCode": "10171500",
    "price": 152,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "PCA1",
    "name": "PROMESOL CA 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 180,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "PMSG",
    "name": "PROMESOL G  SACO 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3325,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "PFE1",
    "name": "PROQUELATE FE 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 149,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "PMG1",
    "name": "PROQUELATE MG 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 149,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "PROMN",
    "name": "PROQUELATE MN 1 LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 164,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "PZN1",
    "name": "PROQUELATE ZINC 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 164,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "RAD1",
    "name": "RADIGROW 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 541,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "RADG1",
    "name": "RADIGROW G 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 220,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "RTX",
    "name": "RHIZO TX 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1414,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "RHITX333",
    "name": "RHIZOTX 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 481.33,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "RBACK1",
    "name": "RHIZOBAC COMBI I KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1656,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "SEL1",
    "name": "SELECTO XL 1 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1044,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "SENDOS",
    "name": "SELECTO DOSI 250ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 280,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "TKR333",
    "name": "TKROOT 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 465,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "UTL",
    "name": "ULTRA V 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 352,
    "departmentName": "Medal 1 Litreado",
    "branchCode": "PRADERA"
  },
  {
    "code": "ALGM500",
    "name": "ALGIMEL 500 GR",
    "unit": "H87",
    "satCode": "10171600",
    "price": 581.25,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "ALMX",
    "name": "ALGIMAX 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 374.38,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "AMG",
    "name": "AMINOGREEN 16 1 LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 380.63,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "AMG24",
    "name": "AMINOGREEN 24 1 LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 420,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "BSOL",
    "name": "AMINOGREEN 90  1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 778.13,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "AMK",
    "name": "AMINOGREEN K 1LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 510,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "BOR",
    "name": "BOR 1 LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 319.13,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "CPQ",
    "name": "CUPRIC QUELAT 5KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 363,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "FIT1L",
    "name": "Fitasio 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 472.22,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "GRCA",
    "name": "GREEN CABOR 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 196.31,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "GRCR",
    "name": "GREEN COBRE 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 296.63,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "GREP",
    "name": "Green P 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 490.85,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "GZL",
    "name": "GREEN ZINC 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 164.06,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "GCZ1",
    "name": "GREEN CALCIO ZINC 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 196.88,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "HMTG",
    "name": "HORMOSTING 250ML",
    "unit": "H87",
    "satCode": "10171600",
    "price": 326.25,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "MQ",
    "name": "MANGANESSE QUELAT 5KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 363,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "MCE",
    "name": "MICRO ENERGIC 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 296.05,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "NON",
    "name": "NON-PITT 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 390.94,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "NTMB",
    "name": "NUTRIMOB 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 582.19,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "PHOSC",
    "name": "Phoscuprico 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 532.56,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "QUAN1",
    "name": "QUANTUM 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 531.25,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "QUAN5",
    "name": "QUANTUM 5 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 2531.25,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "QUAF",
    "name": "QUANTUM FLOWER 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 512.23,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "QRT1",
    "name": "QUANTUM ROOT 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 441.88,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "RZOOT1",
    "name": "RAIZOOT 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 393.75,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "SB1",
    "name": "SILISEC BOTRYSEC 1 KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 308.26,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "SILG",
    "name": "SILISEC-BOTRYSEC 5KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1465.63,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "GSI1",
    "name": "SILISEC-K 1 L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 220.63,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "SACV",
    "name": "SUCRE ACTIVE 1L",
    "unit": "H87",
    "satCode": "10171600",
    "price": 317.39,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "ZQ1",
    "name": "ZINESSE QUELAT 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 342.5,
    "departmentName": "AGRINOVA",
    "branchCode": "PRADERA"
  },
  {
    "code": "KERC20",
    "name": "KER CALCIO 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2321.98,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "PRADERA"
  },
  {
    "code": "KERCA1",
    "name": "Ker Cal 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 117,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "PRADERA"
  },
  {
    "code": "KERKC20",
    "name": "KER K 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 4403.29,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "PRADERA"
  },
  {
    "code": "KERK1L",
    "name": "Ker k 20Litrreado",
    "unit": "H87",
    "satCode": "10171500",
    "price": 221,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "PRADERA"
  },
  {
    "code": "KERMG1",
    "name": "Ker Magnesio mg 20Litreado",
    "unit": "H87",
    "satCode": "10171500",
    "price": 112,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "PRADERA"
  },
  {
    "code": "KERMN1",
    "name": "Ker MN 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 108,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "PRADERA"
  },
  {
    "code": "KNT1",
    "name": "Ker Nitro 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 114,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "PRADERA"
  },
  {
    "code": "KRPS1",
    "name": "Ker Phos 20Litreado",
    "unit": "H87",
    "satCode": "10171500",
    "price": 191,
    "departmentName": "KER BIOTEC LIQUIDOS",
    "branchCode": "PRADERA"
  },
  {
    "code": "JPS1",
    "name": "JUMPSTART 1L",
    "unit": "H87",
    "satCode": "10171505",
    "price": 666.67,
    "departmentName": "TECNOFERSA",
    "branchCode": "PRADERA"
  },
  {
    "code": "KERC",
    "name": "KER CIBUS 1 L",
    "unit": "H87",
    "satCode": "10171601",
    "price": 463.24,
    "departmentName": "TECNOFERSA",
    "branchCode": "PRADERA"
  },
  {
    "code": "KC",
    "name": "KER CU 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 527.38,
    "departmentName": "TECNOFERSA",
    "branchCode": "PRADERA"
  },
  {
    "code": "KAB1",
    "name": "KER KAB 1L",
    "unit": "H87",
    "satCode": "12164001",
    "price": 699.35,
    "departmentName": "TECNOFERSA",
    "branchCode": "PRADERA"
  },
  {
    "code": "THIK1",
    "name": "KER THICK 1L",
    "unit": "H87",
    "satCode": "10171601",
    "price": 494.12,
    "departmentName": "TECNOFERSA",
    "branchCode": "PRADERA"
  },
  {
    "code": "KTHL",
    "name": "KER THICK LEAF",
    "unit": "H87",
    "satCode": "10171601",
    "price": 713.73,
    "departmentName": "TECNOFERSA",
    "branchCode": "PRADERA"
  },
  {
    "code": "KEYCLI",
    "name": "KEY CARBOXY 1LT",
    "unit": "H87",
    "satCode": "12164001",
    "price": 440,
    "departmentName": "TECNOFERSA",
    "branchCode": "PRADERA"
  },
  {
    "code": "KPLEX1",
    "name": "KEYPLEX 350 1L",
    "unit": "H87",
    "satCode": "10171505",
    "price": 750,
    "departmentName": "TECNOFERSA",
    "branchCode": "PRADERA"
  },
  {
    "code": "ACET2",
    "name": "ACET200 500 GRS",
    "unit": "H87",
    "satCode": "10191509",
    "price": 1289.68,
    "departmentName": "AGROFARM",
    "branchCode": "PRADERA"
  },
  {
    "code": "AGRIMT",
    "name": "AGROMECTINA 1L",
    "unit": "H87",
    "satCode": "10191509",
    "price": 718.75,
    "departmentName": "AGROFARM",
    "branchCode": "PRADERA"
  },
  {
    "code": "AGIDOS",
    "name": "Agromectina Dosificado",
    "unit": "H87",
    "satCode": "10191509",
    "price": 185,
    "departmentName": "AGROFARM",
    "branchCode": "PRADERA"
  },
  {
    "code": "BACTO",
    "name": "BACTER OUT 800 GRS",
    "unit": "H87",
    "satCode": "10171702",
    "price": 596.59,
    "departmentName": "AGROFARM",
    "branchCode": "PRADERA"
  },
  {
    "code": "BTK731",
    "name": "BTKUR 731 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 392.86,
    "departmentName": "AGROFARM",
    "branchCode": "PRADERA"
  },
  {
    "code": "CYAT",
    "name": "CYANTROL 1ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 5,
    "departmentName": "AGROFARM",
    "branchCode": "PRADERA"
  },
  {
    "code": "ECOT1",
    "name": "ECOTROL EC 1L",
    "unit": "H87",
    "satCode": "10191500",
    "price": 968.75,
    "departmentName": "AGROFARM",
    "branchCode": "PRADERA"
  },
  {
    "code": "ENG",
    "name": "ENGOR-D 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 762.2,
    "departmentName": "AGROFARM",
    "branchCode": "PRADERA"
  },
  {
    "code": "KEYBPS",
    "name": "KEYPLEX BYPASS 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1133.33,
    "departmentName": "AGROFARM",
    "branchCode": "PRADERA"
  },
  {
    "code": "KFLL",
    "name": "K-full 1l",
    "unit": "H87",
    "satCode": "10171500",
    "price": 375,
    "departmentName": "AGROFARM",
    "branchCode": "PRADERA"
  },
  {
    "code": "LDM",
    "name": "Landin 330 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 920,
    "departmentName": "AGROFARM",
    "branchCode": "PRADERA"
  },
  {
    "code": "LEOMIL",
    "name": "LEOMIFUL K 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 112,
    "departmentName": "AGROFARM",
    "branchCode": "PRADERA"
  },
  {
    "code": "MAXCT",
    "name": "MAX CONTROL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1093.75,
    "departmentName": "AGROFARM",
    "branchCode": "PRADERA"
  },
  {
    "code": "MAXDOS",
    "name": "Max Control  DOS 1ML",
    "unit": "H87",
    "satCode": "10171501",
    "price": 1.12,
    "departmentName": "AGROFARM",
    "branchCode": "PRADERA"
  },
  {
    "code": "PPT",
    "name": "PEPTON 1 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 691.18,
    "departmentName": "AGROFARM",
    "branchCode": "PRADERA"
  },
  {
    "code": "PTONDOS",
    "name": "PEPETON 100GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 75,
    "departmentName": "AGROFARM",
    "branchCode": "PRADERA"
  },
  {
    "code": "SPOR1",
    "name": "SPORAN EC 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 990.85,
    "departmentName": "AGROFARM",
    "branchCode": "PRADERA"
  },
  {
    "code": "TTMAX",
    "name": "TETRA MAX 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 4687.5,
    "departmentName": "AGROFARM",
    "branchCode": "PRADERA"
  },
  {
    "code": "ADRM",
    "name": "ADERMEN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 152.94,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "AGRC",
    "name": "AGROCAN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 529.41,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "AGGL",
    "name": "AGROGARLIC 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 285.71,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "AGNM",
    "name": "Agro-Nem 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 897.83,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "AMXM",
    "name": "AMOXAM 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 425,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "BFLL",
    "name": "BIOFULL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 421.57,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "CRMN",
    "name": "CORAMEN 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 699,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "DRV",
    "name": "DERRIVE 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 275,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "DERR250",
    "name": "Derrunbe 250 Ml",
    "unit": "H87",
    "satCode": "10171500",
    "price": 562.5,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "FLY250",
    "name": "Flymen 250 Grs",
    "unit": "H87",
    "satCode": "10171500",
    "price": 466.67,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "LTL",
    "name": "LETAL 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 419.64,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "MXM",
    "name": "MAXIMO 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 465,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "NIP250",
    "name": "Niprol 250 Ml",
    "unit": "H87",
    "satCode": "10171500",
    "price": 700,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "NIP",
    "name": "NIPROL 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1400,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "NIPDOS",
    "name": "Niprol Ml Dosificado",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "OXFN",
    "name": "OXIFEN 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 600,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "SOPME",
    "name": "SOAPMEN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 225.49,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "SULB",
    "name": "SULBERMEN 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 151.92,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "SLBP",
    "name": "SULBER PLUS 250 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 491.67,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "SLBMX",
    "name": "SULBERMEN MAX 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 235.42,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "TXN",
    "name": "TOXAN 250 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 690,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "XPL",
    "name": "XIPROL 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 441.67,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "ZANE",
    "name": "ZARANEEM",
    "unit": "H87",
    "satCode": "10171500",
    "price": 521.01,
    "departmentName": "AGROMEN",
    "branchCode": "PRADERA"
  },
  {
    "code": "ANT",
    "name": "ACIDO NITRICO 55% 20L",
    "unit": "H87",
    "satCode": "12352301",
    "price": 520,
    "departmentName": "FERTILIZANTES",
    "branchCode": "PRADERA"
  },
  {
    "code": "ASF",
    "name": "ACIDO SULFURICO 98% 20L",
    "unit": "H87",
    "satCode": "12352301",
    "price": 800.11,
    "departmentName": "FERTILIZANTES",
    "branchCode": "PRADERA"
  },
  {
    "code": "NCB",
    "name": "CALCIO BI   25 KG",
    "unit": "H87",
    "satCode": "10171611",
    "price": 413.35,
    "departmentName": "FERTILIZANTES",
    "branchCode": "PRADERA"
  },
  {
    "code": "CLK",
    "name": "CLORURO DE POTASIO 25 KG",
    "unit": "H87",
    "satCode": "10171602",
    "price": 375,
    "departmentName": "FERTILIZANTES",
    "branchCode": "PRADERA"
  },
  {
    "code": "FSTO",
    "name": "FOSFONITRATO 25KG",
    "unit": "H87",
    "satCode": "10171603",
    "price": 375,
    "departmentName": "FERTILIZANTES",
    "branchCode": "PRADERA"
  },
  {
    "code": "KRF",
    "name": "KERF 25 KG",
    "unit": "H87",
    "satCode": "10171602",
    "price": 726.3,
    "departmentName": "FERTILIZANTES",
    "branchCode": "PRADERA"
  },
  {
    "code": "NMG",
    "name": "MAGNIT SACOS 25 KG",
    "unit": "H87",
    "satCode": "12352300",
    "price": 510,
    "departmentName": "FERTILIZANTES",
    "branchCode": "PRADERA"
  },
  {
    "code": "MAP",
    "name": "MAP SACO 25 KG",
    "unit": "H87",
    "satCode": "12141909",
    "price": 907.77,
    "departmentName": "FERTILIZANTES",
    "branchCode": "PRADERA"
  },
  {
    "code": "MKP",
    "name": "MKP SACO 25 KG",
    "unit": "H87",
    "satCode": "10171603",
    "price": 1132.05,
    "departmentName": "FERTILIZANTES",
    "branchCode": "PRADERA"
  },
  {
    "code": "NKS",
    "name": "NKS 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 696.24,
    "departmentName": "FERTILIZANTES",
    "branchCode": "PRADERA"
  },
  {
    "code": "SLC",
    "name": "SOLUCROS SACO 25 KG",
    "unit": "H87",
    "satCode": "10171602",
    "price": 660,
    "departmentName": "FERTILIZANTES",
    "branchCode": "PRADERA"
  },
  {
    "code": "SULMAG",
    "name": "SULMAG SACO 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 247.39,
    "departmentName": "FERTILIZANTES",
    "branchCode": "PRADERA"
  },
  {
    "code": "ANGS",
    "name": "ANGLOSAN 1L",
    "unit": "H87",
    "satCode": "47131803",
    "price": 850,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "PRADERA"
  },
  {
    "code": "ANG",
    "name": "ANGLOSIL NSF 4L",
    "unit": "H87",
    "satCode": "47131803",
    "price": 599,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "PRADERA"
  },
  {
    "code": "BSAR",
    "name": "BIOSARIA 1 L",
    "unit": "H87",
    "satCode": "10171607",
    "price": 373.33,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "PRADERA"
  },
  {
    "code": "BIOV",
    "name": "BIOVIGOR 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 493.33,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "PRADERA"
  },
  {
    "code": "GLUT",
    "name": "GLUTASAN 50 1L",
    "unit": "H87",
    "satCode": "47131803",
    "price": 880,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "PRADERA"
  },
  {
    "code": "LAR",
    "name": "LARBIA 1 LT",
    "unit": "H87",
    "satCode": "10171607",
    "price": 373.33,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "PRADERA"
  },
  {
    "code": "PLIM",
    "name": "PLINIUM 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 386.67,
    "departmentName": "AGROFIGUEROA",
    "branchCode": "PRADERA"
  },
  {
    "code": "AGRI_250MIL",
    "name": "AGRIMEC 250 MIL 10%",
    "unit": "H87",
    "satCode": "10171500",
    "price": 362,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "ANB",
    "name": "ANIBAC PLUS 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 202,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "ANILL",
    "name": "Anillo de tomatero 1KG",
    "unit": "H87",
    "satCode": "31163230",
    "price": 170,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "APPL",
    "name": "APPLAUD 40SC 500MG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 890.24,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "BEL20G",
    "name": "BELEAF 20 GRS",
    "unit": "H87",
    "satCode": "10191509",
    "price": 140,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "DSFR",
    "name": "DOSIFICADOR 50ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 20,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "DAP",
    "name": "DAP-ISQUISA",
    "unit": "H87",
    "satCode": "10171602",
    "price": 524.39,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "DF",
    "name": "DECIS FORTE 450 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 462,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "EVIS",
    "name": "EVISECT 500GR",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1159.76,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "FAEN",
    "name": "FAENA CLASICO 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 170,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "FAFR",
    "name": "FAENA FUERTE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 210,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "FIDGR",
    "name": "FIDATO 1GR",
    "unit": "H87",
    "satCode": "10171500",
    "price": 7.54,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "FOLI",
    "name": "FOLIDOL 1KG.",
    "unit": "H87",
    "satCode": "10171500",
    "price": 25,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "HAVAC",
    "name": "HAVOC PELLET 1KG",
    "unit": "H87",
    "satCode": "10191509",
    "price": 290,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "HER",
    "name": "HERBIPOL GLIFOSATO 970ML",
    "unit": "H87",
    "satCode": "10171700",
    "price": 190,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "HIER",
    "name": "HIERBAMINA",
    "unit": "H87",
    "satCode": "10171700",
    "price": 165,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "MAIZDK_",
    "name": "MAIZ DK-357",
    "unit": "H87",
    "satCode": "10151513",
    "price": 3160,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "MAIZH",
    "name": "MAIZ H377",
    "unit": "H87",
    "satCode": "50221001",
    "price": 2240,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "MALP",
    "name": "MALPHOS 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 280.82,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "PALG",
    "name": "PALGUS 100ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 335.29,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "PAL1LT",
    "name": "PALGUS 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3238.64,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "PAQ_ELUMI",
    "name": "PAQ. ELUMIS (GESAPRIM/PRIMAGRAM)",
    "unit": "H87",
    "satCode": "10191509",
    "price": 1020,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "PIC1",
    "name": "PICUDO 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1047.06,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "PIRIFLU",
    "name": "PIRIFLU 500ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2146.34,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "PRR",
    "name": "PREVICUR ENERGY SL840 1L",
    "unit": "H87",
    "satCode": "10171702",
    "price": 1306.67,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "PRONTUS",
    "name": "PRONTIUS 1KG",
    "unit": "H87",
    "satCode": "10171702",
    "price": 420,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "PNTS",
    "name": "PRONTIUS 200 GRS",
    "unit": "H87",
    "satCode": "10171702",
    "price": 100,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "PRRZ",
    "name": "PROZYCAR 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 286,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "PROZ",
    "name": "PROZYCAR 250 MGS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 105,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "PH",
    "name": "PUSH 5L",
    "unit": "H87",
    "satCode": "10191509",
    "price": 506.1,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "PASTI",
    "name": "PASTILLAS QUIKCFUME -20% \"192\"",
    "unit": "H87",
    "satCode": "10171500",
    "price": 40,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "RAFD",
    "name": "RAFIA DELGADA 1KG",
    "unit": "H87",
    "satCode": "21102300",
    "price": 110,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "RAF",
    "name": "RAFIA GRUESA 1KG",
    "unit": "H87",
    "satCode": "21102300",
    "price": 110,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "RALLY",
    "name": "RALLY 40W 114 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 560,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "RNAN",
    "name": "RANMAN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3192,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "SLB",
    "name": "SALIBRO 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 4930,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "SEC",
    "name": "SECADOR 900ML",
    "unit": "H87",
    "satCode": "10171700",
    "price": 105,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "UREA",
    "name": "UREA-ISQUISA",
    "unit": "H87",
    "satCode": "10171602",
    "price": 347.56,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "VELA5",
    "name": "VELADES 5LT",
    "unit": "H87",
    "satCode": "10171801",
    "price": 781.25,
    "departmentName": "OTRAS LINEAS",
    "branchCode": "PRADERA"
  },
  {
    "code": "CAB",
    "name": "CABO ZINC 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 262.2,
    "departmentName": "AGROSCIENSE",
    "branchCode": "PRADERA"
  },
  {
    "code": "EVER",
    "name": "EVEREX 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 169.51,
    "departmentName": "AGROSCIENSE",
    "branchCode": "PRADERA"
  },
  {
    "code": "FULL",
    "name": "FULL-GRO 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 498.78,
    "departmentName": "AGROSCIENSE",
    "branchCode": "PRADERA"
  },
  {
    "code": "GRO",
    "name": "GRO-BOMO",
    "unit": "H87",
    "satCode": "10171500",
    "price": 195.12,
    "departmentName": "AGROSCIENSE",
    "branchCode": "PRADERA"
  },
  {
    "code": "HUMI",
    "name": "HUMICS-95 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 219.51,
    "departmentName": "AGROSCIENSE",
    "branchCode": "PRADERA"
  },
  {
    "code": "ROOTF",
    "name": "ROOT FACTOR 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 487.8,
    "departmentName": "AGROSCIENSE",
    "branchCode": "PRADERA"
  },
  {
    "code": "SEAZ",
    "name": "SEAZYME 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 587.8,
    "departmentName": "AGROSCIENSE",
    "branchCode": "PRADERA"
  },
  {
    "code": "SEAZY",
    "name": "SEAZYME 250ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 157.32,
    "departmentName": "AGROSCIENSE",
    "branchCode": "PRADERA"
  },
  {
    "code": "X_PAN",
    "name": "X-PANSOR 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 729.27,
    "departmentName": "AGROSCIENSE",
    "branchCode": "PRADERA"
  },
  {
    "code": "X_PLE",
    "name": "X-PLENDOR 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1129.27,
    "departmentName": "AGROSCIENSE",
    "branchCode": "PRADERA"
  },
  {
    "code": "ACTDOS",
    "name": "ACTIVANE DOS 100G",
    "unit": "H87",
    "satCode": "10171600",
    "price": 168.02,
    "departmentName": "LIDA",
    "branchCode": "PRADERA"
  },
  {
    "code": "ACTIVA1",
    "name": "ACTIVANE 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1562.64,
    "departmentName": "LIDA",
    "branchCode": "PRADERA"
  },
  {
    "code": "ENG100",
    "name": "ENGORDONE 100 GRS",
    "unit": "H87",
    "satCode": "10171600",
    "price": 342.18,
    "departmentName": "LIDA",
    "branchCode": "PRADERA"
  },
  {
    "code": "ENGOR",
    "name": "ENGORDONE DOSIF",
    "unit": "H87",
    "satCode": "10171600",
    "price": 302.31,
    "departmentName": "LIDA",
    "branchCode": "PRADERA"
  },
  {
    "code": "MAXDOS",
    "name": "MAXIFRUTO DOS 250ML",
    "unit": "H87",
    "satCode": "10171600",
    "price": 572.5,
    "departmentName": "LIDA",
    "branchCode": "PRADERA"
  },
  {
    "code": "MAXI",
    "name": "MAXIFRUTO 500ML",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1065.11,
    "departmentName": "LIDA",
    "branchCode": "PRADERA"
  },
  {
    "code": "STEDOS",
    "name": "STEMICOL DOS 100GR",
    "unit": "H87",
    "satCode": "10171600",
    "price": 119.86,
    "departmentName": "LIDA",
    "branchCode": "PRADERA"
  },
  {
    "code": "STEMI1K",
    "name": "STEMICOL 1KG",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1114.82,
    "departmentName": "LIDA",
    "branchCode": "PRADERA"
  },
  {
    "code": "ULT",
    "name": "ULTIMITE 1LT",
    "unit": "H87",
    "satCode": "10171600",
    "price": 1406.15,
    "departmentName": "LIDA",
    "branchCode": "PRADERA"
  },
  {
    "code": "ULTDOS",
    "name": "ULTIMITE DOS 250ML",
    "unit": "H87",
    "satCode": "10171600",
    "price": 377.9,
    "departmentName": "LIDA",
    "branchCode": "PRADERA"
  },
  {
    "code": "B100",
    "name": "B100-AMYL  1LT",
    "unit": "H87",
    "satCode": "10171608",
    "price": 600,
    "departmentName": "LABMA",
    "branchCode": "PRADERA"
  },
  {
    "code": "BACTI",
    "name": "BACTIROOT 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 600,
    "departmentName": "LABMA",
    "branchCode": "PRADERA"
  },
  {
    "code": "BIO_SOLI",
    "name": "BIO COMPLEX 1 SOLID 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 366.67,
    "departmentName": "LABMA",
    "branchCode": "PRADERA"
  },
  {
    "code": "BIOINS1",
    "name": "BIO INSECT MIX 1 500ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 555.56,
    "departmentName": "LABMA",
    "branchCode": "PRADERA"
  },
  {
    "code": "BIOINS2",
    "name": "BIO INSECT MIX 2 500ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 434.03,
    "departmentName": "LABMA",
    "branchCode": "PRADERA"
  },
  {
    "code": "BIO_PA",
    "name": "BIO PAE 500ML",
    "unit": "H87",
    "satCode": "41106503",
    "price": 400,
    "departmentName": "LABMA",
    "branchCode": "PRADERA"
  },
  {
    "code": "BIO_PRO",
    "name": "BIO PROTECTO 6 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 692.31,
    "departmentName": "LABMA",
    "branchCode": "PRADERA"
  },
  {
    "code": "BIORI",
    "name": "Bio Rize 10gr",
    "unit": "H87",
    "satCode": "10171500",
    "price": 538.46,
    "departmentName": "LABMA",
    "branchCode": "PRADERA"
  },
  {
    "code": "BIO_CO",
    "name": "BIO-COMPLEX 1L",
    "unit": "H87",
    "satCode": "10171801",
    "price": 750,
    "departmentName": "LABMA",
    "branchCode": "PRADERA"
  },
  {
    "code": "BIO_NPK",
    "name": "BIO-COMPLEX NPK",
    "unit": "H87",
    "satCode": "10171801",
    "price": 600,
    "departmentName": "LABMA",
    "branchCode": "PRADERA"
  },
  {
    "code": "BIO_TRIN",
    "name": "BIO-TRINCHO 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 607.14,
    "departmentName": "LABMA",
    "branchCode": "PRADERA"
  },
  {
    "code": "BIO_YO",
    "name": "BIO-YODO 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 395.83,
    "departmentName": "LABMA",
    "branchCode": "PRADERA"
  },
  {
    "code": "ECO",
    "name": "ECOFILM 1LT",
    "unit": "H87",
    "satCode": "11121502",
    "price": 585.94,
    "departmentName": "LABMA",
    "branchCode": "PRADERA"
  },
  {
    "code": "NA_HO_BA",
    "name": "NANO-HO-BA 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 694.44,
    "departmentName": "LABMA",
    "branchCode": "PRADERA"
  },
  {
    "code": "NANO",
    "name": "Nano-virus 1lt",
    "unit": "H87",
    "satCode": "10171500",
    "price": 746.53,
    "departmentName": "LABMA",
    "branchCode": "PRADERA"
  },
  {
    "code": "PL_NEMA",
    "name": "PL-NEMATICIDA 1LT",
    "unit": "H87",
    "satCode": "41106503",
    "price": 600,
    "departmentName": "LABMA",
    "branchCode": "PRADERA"
  },
  {
    "code": "PRO_RA",
    "name": "PRO RAIZ MAX 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 566.67,
    "departmentName": "LABMA",
    "branchCode": "PRADERA"
  },
  {
    "code": "AGRO50",
    "name": "AGRO-OX 50 4LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 599,
    "departmentName": "DESINFECTANTES",
    "branchCode": "PRADERA"
  },
  {
    "code": "GLUT50",
    "name": "Glutaral 50 1lt",
    "unit": "H87",
    "satCode": "10171500",
    "price": 880,
    "departmentName": "DESINFECTANTES",
    "branchCode": "PRADERA"
  },
  {
    "code": "INVE1",
    "name": "Inver clean 1lt",
    "unit": "H87",
    "satCode": "10171500",
    "price": 850,
    "departmentName": "DESINFECTANTES",
    "branchCode": "PRADERA"
  },
  {
    "code": "INVE5",
    "name": "Inver clean 5lt",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3750.26,
    "departmentName": "DESINFECTANTES",
    "branchCode": "PRADERA"
  },
  {
    "code": "AGRIS",
    "name": "AGRISUR 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 714.12,
    "departmentName": "BIORIZON",
    "branchCode": "PRADERA"
  },
  {
    "code": "AGRIZ",
    "name": "AGRISUR Z 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1131.25,
    "departmentName": "BIORIZON",
    "branchCode": "PRADERA"
  },
  {
    "code": "BOST",
    "name": "BOSTER AZUL 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 395.29,
    "departmentName": "BIORIZON",
    "branchCode": "PRADERA"
  },
  {
    "code": "KOLO",
    "name": "KOLORNEUTRO 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 280.3,
    "departmentName": "BIORIZON",
    "branchCode": "PRADERA"
  },
  {
    "code": "PHOST",
    "name": "PHOSTROT 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 311.42,
    "departmentName": "BIORIZON",
    "branchCode": "PRADERA"
  },
  {
    "code": "SOLO",
    "name": "SOLO K 2.5 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1541.67,
    "departmentName": "BIORIZON",
    "branchCode": "PRADERA"
  }
];

export const TLAXIACO_RAW_DATA: TlaxiacoRawRow[] = [
  {
    "tlaxiacoRawCode": 7,
    "name": "ADAPTADOR HEMBRA",
    "unit": "H87",
    "satCode": "10171500",
    "price": 18,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 8,
    "name": "ADAPTADOR HENBRA 2",
    "unit": "H87",
    "satCode": "10171500",
    "price": 18,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 9,
    "name": "ADAPTADOR MACHO1",
    "unit": "H87",
    "satCode": "10171500",
    "price": 9,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 10,
    "name": "ADAPTADOR1 1/14",
    "unit": "H87",
    "satCode": "10171500",
    "price": 11,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 22,
    "name": "ALIETTE DE 2KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1053.66,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 23,
    "name": "ALIETTE DOSIS 500GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 277,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 32,
    "name": "AMISTAR DE 100 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 456,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 42,
    "name": "ASPERSORA FIAT 20L AZUL",
    "unit": "H87",
    "satCode": "10171500",
    "price": 840,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 43,
    "name": "ASPERSORA FIAT 25L 35CC A 4 TIEMPOS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3412.5,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 49,
    "name": "BACTROL 2X DE 800 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 745.5,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 52,
    "name": "BELEAF DE 20GR",
    "unit": "H87",
    "satCode": "10171500",
    "price": 168,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 61,
    "name": "BIO-FREEZE DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1320,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 101,
    "name": "CINTILLA CHICA 6 MIL A 10CM, 1000 MTS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1270.5,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 102,
    "name": "CINTILLA GRANDE 8 MIL A 10CM, 2296 MTS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2940,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 103,
    "name": "CINTILLA MEDIANA 6 MIL A 10CM, 1524 MTS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1827,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 107,
    "name": "CODO 2",
    "unit": "H87",
    "satCode": "10171500",
    "price": 19,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 108,
    "name": "CODO UNA PULGADA",
    "unit": "H87",
    "satCode": "10171500",
    "price": 9,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 109,
    "name": "COPLE",
    "unit": "H87",
    "satCode": "10171500",
    "price": 29,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 110,
    "name": "COPLE 1",
    "unit": "H87",
    "satCode": "10171500",
    "price": 7,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 111,
    "name": "COPLE 2",
    "unit": "H87",
    "satCode": "10171500",
    "price": 18,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 112,
    "name": "COPLE2",
    "unit": "H87",
    "satCode": "10171500",
    "price": 18,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 133,
    "name": "FINALBACTER DE 250 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 336,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 134,
    "name": "FINALBACTER DE 800 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 740,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 156,
    "name": "GREEN FORTE",
    "unit": "H87",
    "satCode": "10171500",
    "price": 360,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 178,
    "name": "K3 DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 432.93,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 215,
    "name": "MAXI GREEN",
    "unit": "H87",
    "satCode": "10171500",
    "price": 310,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 304,
    "name": "REDUCTOR 2 1/2",
    "unit": "H87",
    "satCode": "10171500",
    "price": 21,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 305,
    "name": "REDUCTOR2¨",
    "unit": "H87",
    "satCode": "10171500",
    "price": 22,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 312,
    "name": "SALIBRO 50ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 303,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 313,
    "name": "SALIBRO DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 5766,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 329,
    "name": "SPEED SOAP DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 243,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 330,
    "name": "SPORAN EC DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1040,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 343,
    "name": "T 1¨",
    "unit": "H87",
    "satCode": "10171500",
    "price": 12,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 344,
    "name": "T 2¨",
    "unit": "H87",
    "satCode": "10171500",
    "price": 34,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 346,
    "name": "TAPA2¨",
    "unit": "H87",
    "satCode": "10171500",
    "price": 14,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 347,
    "name": "TAPON 1",
    "unit": "H87",
    "satCode": "10171500",
    "price": 8,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 351,
    "name": "TUERCA 2",
    "unit": "H87",
    "satCode": "10171500",
    "price": 115,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 354,
    "name": "UMBRAL DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 523,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 357,
    "name": "VALVULA 1 1/2¨",
    "unit": "H87",
    "satCode": "10171500",
    "price": 200,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 358,
    "name": "VALVULA2¨¨",
    "unit": "H87",
    "satCode": "10171500",
    "price": 250,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 359,
    "name": "VELADES",
    "unit": "H87",
    "satCode": "10171500",
    "price": 167,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 360,
    "name": "VELADES DE 20L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3187.5,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 361,
    "name": "VELADES DE 5L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 820,
    "departmentName": null,
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 18,
    "name": "ALBATROSS 200 SC DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1418.38,
    "departmentName": "ADAMA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 53,
    "name": "BENHUAR DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 245,
    "departmentName": "ADAMA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 12,
    "name": "ADHER-ON DE 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 85.2,
    "departmentName": "AFL AGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 26,
    "name": "AMINOFUL DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 311,
    "departmentName": "AFL AGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 143,
    "name": "FOSFOSOIL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 330,
    "departmentName": "AFL AGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 216,
    "name": "MAXIFOL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 338.4,
    "departmentName": "AFL AGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 256,
    "name": "PAQUETE LLENADO 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 589.2,
    "departmentName": "AFL AGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 1,
    "name": "ABAXO FERRO DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 405,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 20,
    "name": "ALGIMAX DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 421,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 21,
    "name": "ALGIMEL 500 Grs",
    "unit": "H87",
    "satCode": "10171500",
    "price": 654,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 27,
    "name": "AMINOGREEN 16 DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 400,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 28,
    "name": "AMINOGREEN 24 DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 441,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 29,
    "name": "AMINOGREEN 9 DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 310,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 30,
    "name": "AMINOGREEN 90 DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 817,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 31,
    "name": "AMINOGREEN K 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 535.5,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 75,
    "name": "BOR 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 335,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 77,
    "name": "BUFALO",
    "unit": "H87",
    "satCode": "10171500",
    "price": 198,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 78,
    "name": "BUFALO DE 20 LTS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3768,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 79,
    "name": "BUFALO SOLID DE 5KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1267,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 80,
    "name": "BUFALO SOLID POR KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 266,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 114,
    "name": "CUPRIC QUELAT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 420,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 115,
    "name": "CUPRIC QUELAT DE 5KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1903,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 135,
    "name": "FITASIO 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 527,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 136,
    "name": "FLORCUAJE DE 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 547,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 154,
    "name": "GREEN CALCIO ZINC 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 207,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 155,
    "name": "GREEN COBRE DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 311,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 157,
    "name": "GREEN P DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 515,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 170,
    "name": "HORMOSTING DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1172,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 171,
    "name": "HORMOSTING DE 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 343,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 209,
    "name": "MANGANESSE QUELAT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 460,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 210,
    "name": "MANGANESSE QUELAT 5KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1905,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 213,
    "name": "MAX ORGANIC",
    "unit": "H87",
    "satCode": "10171500",
    "price": 150,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 214,
    "name": "MAX ORGANIC DE 20L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2855,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 220,
    "name": "MICRO ENERGIC DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 369,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 221,
    "name": "MICRO ENERGIC DE 5KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1337.5,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 240,
    "name": "NON-PITT 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 410.5,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 245,
    "name": "NUTRIMAZINC DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 259,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 246,
    "name": "NUTRIMOB 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 611,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 260,
    "name": "PHOSCUPRICO DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 560,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 287,
    "name": "QUANTUM EYM 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 558,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 288,
    "name": "QUANTUM EYM 5KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2689.46,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 289,
    "name": "QUANTUM FLOWER 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 538,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 290,
    "name": "QUANTUM ROOT 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 464,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 300,
    "name": "RAIZOOT DE 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 413.5,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 317,
    "name": "SILISEC BOTRYSEC DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 328,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 318,
    "name": "SILISEC-BOTRYSEC 5KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1539,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 319,
    "name": "SILISEC-K DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 232,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 333,
    "name": "STOP SAL DE 1LT",
    "unit": "H87",
    "satCode": "10171500",
    "price": 520,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 334,
    "name": "SUCRE ACTIVE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 334,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 367,
    "name": "ZINESSE QUELAT DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 360,
    "departmentName": "AGRINOVA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 38,
    "name": "ANIBAC PLUS DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 270.5,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 40,
    "name": "APPLAAUD 40SC DOSIS  250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 467.5,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 41,
    "name": "APPLAUD 40SC DE 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 890.24,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 81,
    "name": "CABRIO C 100 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 303,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 82,
    "name": "CABRIO C 800 GR",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2309,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 84,
    "name": "CAPTAN ULTRA 50 WP 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 276,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 127,
    "name": "EVISECT S DE 500 GR",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1159.76,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 128,
    "name": "EVISECT-S 100 GR",
    "unit": "H87",
    "satCode": "10171500",
    "price": 244,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 130,
    "name": "FAENA FUERTE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 226,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 138,
    "name": "FOLEY REY 240 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 106.71,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 139,
    "name": "FOLEY REY 450 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 190.24,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 145,
    "name": "GESAPRIM AUTOSUSPENSIBLE DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 255,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 146,
    "name": "GESAPRIM CALIBRE 90 DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 307,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 153,
    "name": "GRANERIL 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 90,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 168,
    "name": "HERBIPOL AMINA DE 950 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 108,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 169,
    "name": "HERBIPOL GLIFOSATO 970 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 168,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 174,
    "name": "INFINITO 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1076,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 201,
    "name": "KUMULUS 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2935.4,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 202,
    "name": "KUMULUS Azufre Elemental Al 80%",
    "unit": "H87",
    "satCode": "10171500",
    "price": 136.32,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 252,
    "name": "OREGON 60SC 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2567.07,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 257,
    "name": "PASTILLA MAIZ",
    "unit": "H87",
    "satCode": "10171500",
    "price": 50,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 261,
    "name": "PIRIFLU 20 SC 100 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 451,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 262,
    "name": "PIRIFLU 20 SC 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2146.34,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 267,
    "name": "PREVICUR ENERGY 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1380,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 268,
    "name": "PREVICUR ENERGY 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 336,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 301,
    "name": "RALLY 40W 114 GR",
    "unit": "H87",
    "satCode": "10171500",
    "price": 690,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 302,
    "name": "RANMAN 200ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1025,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 303,
    "name": "RANMAN DOSIS 100 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 390,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 314,
    "name": "SECADOR 900 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 104,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 355,
    "name": "UNIFORM 50 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 321,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 356,
    "name": "UNIFORM DE 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3087.5,
    "departmentName": "AGROABASTO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 2,
    "name": "ACET200 DE 500 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1354,
    "departmentName": "AGROFARM",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 47,
    "name": "BACTER OUT DE 800 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 626,
    "departmentName": "AGROFARM",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 76,
    "name": "BTKUR 731 DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 412.5,
    "departmentName": "AGROFARM",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 118,
    "name": "CYANTROL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 5376.5,
    "departmentName": "AGROFARM",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 119,
    "name": "CYANTROL DE 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1411,
    "departmentName": "AGROFARM",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 124,
    "name": "ENGOR-D",
    "unit": "H87",
    "satCode": "10171500",
    "price": 800,
    "departmentName": "AGROFARM",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 152,
    "name": "GORPLUS 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 805,
    "departmentName": "AGROFARM",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 177,
    "name": "K-FULL DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 394,
    "departmentName": "AGROFARM",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 199,
    "name": "KEYPLEX BYPASS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1435,
    "departmentName": "AGROFARM",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 203,
    "name": "LANDIM 330 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1050,
    "departmentName": "AGROFARM",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 212,
    "name": "MAX CONTROL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1225,
    "departmentName": "AGROFARM",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 258,
    "name": "PEPTON 85/16 DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 822.5,
    "departmentName": "AGROFARM",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 348,
    "name": "TETRA MAX 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 5350,
    "departmentName": "AGROFARM",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 349,
    "name": "TETRAMAX DOSIS 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1400,
    "departmentName": "AGROFARM",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 11,
    "name": "ADERMEN DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 158,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 16,
    "name": "AGROCAN DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 652,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 17,
    "name": "AGRONEM---EXTRACFIN DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1192.05,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 33,
    "name": "AMOXAN DE 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 515,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 68,
    "name": "BIOFULL DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 586,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 113,
    "name": "CORAMEN DE 250 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1006,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 120,
    "name": "DERRIVE 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 315,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 121,
    "name": "DERRUMBE DE 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 727,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 137,
    "name": "FLYMEN DE 250 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 565,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 207,
    "name": "LETAL 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 475,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 218,
    "name": "MAXIMO DE 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 602,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 236,
    "name": "NIPROL 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 735,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 237,
    "name": "NIPROL DE 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1440,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 253,
    "name": "OXIFEN DE 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 577.5,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 335,
    "name": "SULBER PLUS 5% 250 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 596,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 336,
    "name": "SULBERMEN 250ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 160,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 337,
    "name": "SULBERMEN MAX 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 297,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 350,
    "name": "TOXAN DE 250 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 959.13,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 365,
    "name": "XIPROL 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 535,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 366,
    "name": "ZARANEEM DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 727,
    "departmentName": "AGROMEN AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 342,
    "name": "SUPER POTASIO",
    "unit": "H87",
    "satCode": "10171500",
    "price": 172,
    "departmentName": "AGROMEN AGROFIGUEROA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 140,
    "name": "FOLEY REY 950ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 329.27,
    "departmentName": "BARRITA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 175,
    "name": "INFINITO 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 304.2,
    "departmentName": "BARRITA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 279,
    "name": "PRONTIUS 200GR",
    "unit": "H87",
    "satCode": "10171500",
    "price": 108,
    "departmentName": "BARRITA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 283,
    "name": "PROZYCAR 240 GR",
    "unit": "H87",
    "satCode": "10171500",
    "price": 96,
    "departmentName": "BARRITA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 284,
    "name": "PROZYCAR DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 285,
    "departmentName": "BARRITA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 69,
    "name": "BIOGLUB",
    "unit": "H87",
    "satCode": "10171500",
    "price": 99,
    "departmentName": "BIOBEST",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 70,
    "name": "BIOGLUB JARRAFA DE 10L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 935,
    "departmentName": "BIOBEST",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 24,
    "name": "ALLECTUS DE 20 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 975,
    "departmentName": "COIAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 25,
    "name": "ALLECTUS POR KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 51,
    "departmentName": "COIAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 116,
    "name": "CURZATE M8 DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 606,
    "departmentName": "COIAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 129,
    "name": "EXALT TM 60 SC 100ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 409,
    "departmentName": "COIAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 131,
    "name": "FIDATO 15 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 137,
    "departmentName": "COIAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 132,
    "name": "FIDATO 300 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2342.5,
    "departmentName": "COIAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 326,
    "name": "SOLDIER 250 SC 250ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 461.5,
    "departmentName": "COIAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 345,
    "name": "TALSTAR 100EC 240 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 222.3,
    "departmentName": "COIAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 73,
    "name": "BLAUKORN CLASSIC 12-8-16+3+TE 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 600,
    "departmentName": "COMPO EXPERT",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 74,
    "name": "BLAUKORN CLASSICPOR KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 28,
    "departmentName": "COMPO EXPERT",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 158,
    "name": "GRIS-BASE POR KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 58,
    "departmentName": "COMPO EXPERT",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 159,
    "name": "GROWTH POR KILO",
    "unit": "H87",
    "satCode": "10171500",
    "price": 54,
    "departmentName": "COMPO EXPERT",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 163,
    "name": "HAKAPHOS AZUL DE 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 796.34,
    "departmentName": "COMPO EXPERT",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 164,
    "name": "HAKAPHOS BASE 7-12-40 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1385.37,
    "departmentName": "COMPO EXPERT",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 165,
    "name": "HAKAPHOS NARANJA 15-5-30 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 720,
    "departmentName": "COMPO EXPERT",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 166,
    "name": "HAKAPHOS ROJO DE 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1867,
    "departmentName": "COMPO EXPERT",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 167,
    "name": "HAKAPHOS VIOLETA 13-40-13 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1389.02,
    "departmentName": "COMPO EXPERT",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 172,
    "name": "HYDROSPEED GROWTH 10-14-33+4 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1325.61,
    "departmentName": "COMPO EXPERT",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 173,
    "name": "HYDROSPEED STARTER 6-20-25+6.5 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1154,
    "departmentName": "COMPO EXPERT",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 241,
    "name": "NOVACTEC PREMIUM POR KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 30,
    "departmentName": "COMPO EXPERT",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 242,
    "name": "NOVATEC PREMIUM DE 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 655,
    "departmentName": "COMPO EXPERT",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 311,
    "name": "ROJO POR KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 78.5,
    "departmentName": "COMPO EXPERT",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 363,
    "name": "VIOLETA POR KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 58,
    "departmentName": "COMPO EXPERT",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 15,
    "name": "AGRO-OX 50 DE 4L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 594,
    "departmentName": "DESINFECCION AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 147,
    "name": "GLUTARAL 50 DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 800,
    "departmentName": "DESINFECCION AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 176,
    "name": "INVER CLEAN DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 851,
    "departmentName": "DESINFECCION AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 34,
    "name": "ANGLOSAN CL",
    "unit": "H87",
    "satCode": "10171500",
    "price": 851,
    "departmentName": "DESINFECTANTE",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 35,
    "name": "ANGLOSAN CL DE 5L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3519,
    "departmentName": "DESINFECTANTE",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 36,
    "name": "ANGLOSIL NSF DE 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2250,
    "departmentName": "DESINFECTANTE",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 37,
    "name": "ANGLOSIL NSF DE 4L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 594,
    "departmentName": "DESINFECTANTE",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 148,
    "name": "GLUTASAN 50 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 880,
    "departmentName": "DESINFECTANTE",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 149,
    "name": "GLUTASAN 50 5L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3901.2,
    "departmentName": "DESINFECTANTE",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 227,
    "name": "MULTICIDE",
    "unit": "H87",
    "satCode": "10171500",
    "price": 872,
    "departmentName": "DESINFECTANTE",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 232,
    "name": "NARANJA 15-05-30 POR KILO",
    "unit": "H87",
    "satCode": "10171500",
    "price": 53.26,
    "departmentName": "DIMSA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 238,
    "name": "NITRATO DE POTASIO GRANULAD",
    "unit": "H87",
    "satCode": "10171500",
    "price": 800,
    "departmentName": "DIMSA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 3,
    "name": "ACIDO NITRICO DE 20L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 520,
    "departmentName": "FERTILIZANTE AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 4,
    "name": "ACIDO SULFURICO 98% DE 20L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 800.11,
    "departmentName": "FERTILIZANTE AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 83,
    "name": "CALCIO DE 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 413.35,
    "departmentName": "FERTILIZANTE AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 104,
    "name": "CLORURO DE CALCIO DE 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 440,
    "departmentName": "FERTILIZANTE AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 105,
    "name": "CLORURO DE CALCIO POR KILO",
    "unit": "H87",
    "satCode": "10171500",
    "price": 20,
    "departmentName": "FERTILIZANTE AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 106,
    "name": "CLORURO DE POTASIO DE 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 353.94,
    "departmentName": "FERTILIZANTE AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 142,
    "name": "FOSFONITRATO POR KILO",
    "unit": "H87",
    "satCode": "10171500",
    "price": 15,
    "departmentName": "FERTILIZANTE AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 144,
    "name": "FULLMIX B DE 25 G",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3958,
    "departmentName": "FERTILIZANTE AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 197,
    "name": "KERF DE 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 726.3,
    "departmentName": "FERTILIZANTE AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 208,
    "name": "MAGNIT DE 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 510,
    "departmentName": "FERTILIZANTE AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 211,
    "name": "MAP DE 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 907.77,
    "departmentName": "FERTILIZANTE AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 226,
    "name": "MKP DE 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1132.05,
    "departmentName": "FERTILIZANTE AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 239,
    "name": "NKS DE 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 696.5,
    "departmentName": "FERTILIZANTE AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 328,
    "name": "SOP DE 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 660,
    "departmentName": "FERTILIZANTE AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 338,
    "name": "SULMAG DE 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 247.39,
    "departmentName": "FERTILIZANTE AGRISAS",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 13,
    "name": "AGRIMECTIN 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 189,
    "departmentName": "FORMU LAB",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 14,
    "name": "AGRIMECTIN DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 720,
    "departmentName": "FORMU LAB",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 205,
    "name": "LEOMIFUL K 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 122,
    "departmentName": "FORMU LAB",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 206,
    "name": "LEOMIFUL K 5L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 540,
    "departmentName": "FORMU LAB",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 286,
    "name": "Picus Knock Down 250ml",
    "unit": "H87",
    "satCode": "10171500",
    "price": 408.73,
    "departmentName": "FORMU LAB",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 327,
    "name": "SOLUM 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 346,
    "departmentName": "FORMU LAB",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 364,
    "name": "VITOL",
    "unit": "H87",
    "satCode": "10171500",
    "price": 332,
    "departmentName": "HUMAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 67,
    "name": "BIOFOLCON DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 482.5,
    "departmentName": "IBAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 71,
    "name": "BIOSARIA 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 438,
    "departmentName": "IBAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 72,
    "name": "BIOVIGOR",
    "unit": "H87",
    "satCode": "10171500",
    "price": 696,
    "departmentName": "IBAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 204,
    "name": "LARBIA 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 408.2,
    "departmentName": "IBAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 230,
    "name": "MYCOS GOLD WP",
    "unit": "H87",
    "satCode": "10171500",
    "price": 816,
    "departmentName": "IBAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 233,
    "name": "NEMACONTROL",
    "unit": "H87",
    "satCode": "10171500",
    "price": 798.5,
    "departmentName": "IBAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 264,
    "name": "PLINIUM",
    "unit": "H87",
    "satCode": "10171500",
    "price": 500,
    "departmentName": "IBAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 310,
    "name": "RIZOBION 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 436,
    "departmentName": "IBAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 339,
    "name": "SUPER BTN 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2602,
    "departmentName": "IBAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 340,
    "name": "SUPER BTN 5L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1350,
    "departmentName": "IBAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 341,
    "name": "SUPER BTN POR LITRO",
    "unit": "H87",
    "satCode": "10171500",
    "price": 287,
    "departmentName": "IBAGRO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 19,
    "name": "ALGAK DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 376,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 44,
    "name": "ATP UP DE 10L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3940,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 45,
    "name": "ATP UP DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 434,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 50,
    "name": "BALOX DE 10L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 5940,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 51,
    "name": "BALOX DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 615,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 54,
    "name": "BESTCURE DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1080,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 55,
    "name": "BESTCURE DOSIS 250 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 283.5,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 63,
    "name": "BIOCINNAFOL DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 870,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 64,
    "name": "BIOFIT G",
    "unit": "H87",
    "satCode": "10171500",
    "price": 292,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 65,
    "name": "BIOFIT RTU DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 851,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 66,
    "name": "BIOFIT RTU DE 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 293.66,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 85,
    "name": "CARBOXY FE 5KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2000,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 86,
    "name": "CARBOXY FE DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 412,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 87,
    "name": "CARBOXY K 10L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1940,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 88,
    "name": "CARBOXY K DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 223,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 89,
    "name": "CARBOXY K MAX 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 288,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 90,
    "name": "CARBOXY L 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 212,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 91,
    "name": "CARBOXY L DE 10L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1800,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 92,
    "name": "CARBOXY MICRO 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 319,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 93,
    "name": "CARBOXY MICRO 5KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1475,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 94,
    "name": "CARBOXY MIN G 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2375,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 95,
    "name": "CARBOXY MIN G GRANULADO",
    "unit": "H87",
    "satCode": "10171500",
    "price": 100,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 96,
    "name": "CARBOXY MIN L 10L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1630,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 97,
    "name": "CARBOXY MIN L 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 198,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 98,
    "name": "CARBOXY MIN L 20L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2980,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 99,
    "name": "CARBOXY ZN DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 401,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 100,
    "name": "CARBOXY ZN DE 5KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1945,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 117,
    "name": "CUVREK DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 360,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 141,
    "name": "FOSFONICUR DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 447,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 161,
    "name": "HADDAK 10L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 6630,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 162,
    "name": "HADDAK 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 697,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 219,
    "name": "MEDAL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 684,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 228,
    "name": "MYCOROOT 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 581.66,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 229,
    "name": "MYCOROOT DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1715,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 234,
    "name": "NEMAROOT 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1700,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 235,
    "name": "NEMAROOT 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 576.66,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 243,
    "name": "NUTRIMAK + DESARROLLO 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 406,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 244,
    "name": "NUTRIMAK + VIGOR 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 274,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 247,
    "name": "NUTRISORB G 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 4300,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 248,
    "name": "NUTRISORB G GRANULADO",
    "unit": "H87",
    "satCode": "10171500",
    "price": 181,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 249,
    "name": "NUTRISORB L 10 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3680,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 250,
    "name": "NUTRISORB L 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 398,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 251,
    "name": "NUTRISORB L 20L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 6680,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 254,
    "name": "PACK HARD 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 277,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 255,
    "name": "PACKHARD 10L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2470,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 259,
    "name": "PGR IV DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1083,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 265,
    "name": "PREVEN UP 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 564,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 266,
    "name": "PREVEN UP DE 10L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3998,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 270,
    "name": "PROMESOL 5X",
    "unit": "H87",
    "satCode": "10171500",
    "price": 149,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 271,
    "name": "PROMESOL 5X 10L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1484,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 272,
    "name": "PROMESOL 5X 20L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2840,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 273,
    "name": "PROMESOL 5X DE 200L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 28000,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 274,
    "name": "PROMESOL CA",
    "unit": "H87",
    "satCode": "10171500",
    "price": 178,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 275,
    "name": "PROMESOL CA 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3380,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 276,
    "name": "PROMESOL CA DE 200L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 33600,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 277,
    "name": "PROMESOL G GRANULADO",
    "unit": "H87",
    "satCode": "10171500",
    "price": 140,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 278,
    "name": "PROMESOL G SACO 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3325,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 280,
    "name": "PROQUELATE FE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 149,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 281,
    "name": "PROQUELATE MG 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 149,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 282,
    "name": "PROQUELATE MN 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 164,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 291,
    "name": "RADIGROW 10L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 4960,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 292,
    "name": "RADIGROW 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 541,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 293,
    "name": "RADIGROW 20L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 9140,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 294,
    "name": "RADIGROW G 25 KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 5375,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 295,
    "name": "RADIGROW G GRANULADO",
    "unit": "H87",
    "satCode": "10171500",
    "price": 226,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 306,
    "name": "RHIZO TX 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1414,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 307,
    "name": "RHIZO TX 333 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 481.33,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 308,
    "name": "RHIZOBAC COMBI 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1656,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 309,
    "name": "RHIZOBAC COMBI De 333 Grs",
    "unit": "H87",
    "satCode": "10171500",
    "price": 562,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 315,
    "name": "SELECTO XL 10L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 9900,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 316,
    "name": "SELECTO XL 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1044,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 353,
    "name": "ULTRA V DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 352,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 362,
    "name": "VERNUM 10L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1270,
    "departmentName": "-INNOVAK",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 179,
    "name": "KER CAL",
    "unit": "H87",
    "satCode": "10171500",
    "price": 126,
    "departmentName": "KER",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 180,
    "name": "KER CALCIO DE 20L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2467.1,
    "departmentName": "KER",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 183,
    "name": "KER K",
    "unit": "H87",
    "satCode": "10171500",
    "price": 250,
    "departmentName": "KER",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 184,
    "name": "KER K 20 L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 4764,
    "departmentName": "KER",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 188,
    "name": "KER MAG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 122,
    "departmentName": "KER",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 189,
    "name": "KER MAN",
    "unit": "H87",
    "satCode": "10171500",
    "price": 122,
    "departmentName": "KER",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 190,
    "name": "KER MG DE 20L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2322.16,
    "departmentName": "KER",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 191,
    "name": "KER NITRO",
    "unit": "H87",
    "satCode": "10171500",
    "price": 129,
    "departmentName": "KER",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 192,
    "name": "KER NITRO 20L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2460,
    "departmentName": "KER",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 193,
    "name": "KER PHOS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 216,
    "departmentName": "KER",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 194,
    "name": "KER PHOS DE 20L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 4112,
    "departmentName": "KER",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 123,
    "name": "ECOTROL EC 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1033.2,
    "departmentName": "KEYBIOTEC",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 181,
    "name": "KER CIBUS 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 432,
    "departmentName": "KEYBIOTEC",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 182,
    "name": "KER CU DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 553,
    "departmentName": "KEYBIOTEC",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 185,
    "name": "KER KAB 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 770,
    "departmentName": "KEYBIOTEC",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 186,
    "name": "KER KARBOXI",
    "unit": "H87",
    "satCode": "10171500",
    "price": 518.44,
    "departmentName": "KEYBIOTEC",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 187,
    "name": "KER KARBOXI DE 5L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2464,
    "departmentName": "KEYBIOTEC",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 195,
    "name": "KER THICK 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 647.02,
    "departmentName": "KEYBIOTEC",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 196,
    "name": "KER TICK LEAF",
    "unit": "H87",
    "satCode": "10171500",
    "price": 715,
    "departmentName": "KEYBIOTEC",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 198,
    "name": "KEYPLEX 350 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 787,
    "departmentName": "KEYBIOTEC",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 200,
    "name": "KEYPLEX JUMPSTART DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 700,
    "departmentName": "KEYBIOTEC",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 285,
    "name": "PULITORE DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 752.5,
    "departmentName": "KEYBIOTEC",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 46,
    "name": "B100 AMYL DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 630,
    "departmentName": "LABMA-microbiologia",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 48,
    "name": "BACTIROOT DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 630,
    "departmentName": "LABMA-microbiologia",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 56,
    "name": "BIO COMPLEX DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 785.5,
    "departmentName": "LABMA-microbiologia",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 57,
    "name": "BIO COMPLEX NPK DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 600,
    "departmentName": "LABMA-microbiologia",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 58,
    "name": "BIO PAE DE 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 420,
    "departmentName": "LABMA-microbiologia",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 59,
    "name": "BIO PROTECTO 6 DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 727,
    "departmentName": "LABMA-microbiologia",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 60,
    "name": "BIO RIZE DE 10GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 565.38,
    "departmentName": "LABMA-microbiologia",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 62,
    "name": "BIO-TRICHO DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 637.49,
    "departmentName": "LABMA-microbiologia",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 122,
    "name": "ECOFILM DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 615,
    "departmentName": "LABMA-microbiologia",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 231,
    "name": "NANO-VIRUS DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 783.85,
    "departmentName": "LABMA-microbiologia",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 263,
    "name": "PL NEMATICIDA DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 630,
    "departmentName": "LABMA-microbiologia",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 269,
    "name": "PRO RAIZ MAX DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 595,
    "departmentName": "LABMA-microbiologia",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 5,
    "name": "ACTIVANE DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1641,
    "departmentName": "LIDA plant research",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 6,
    "name": "ACTIVANE DOSIS 100GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 176.5,
    "departmentName": "LIDA plant research",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 125,
    "name": "ENGORDONE DE 100 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 359,
    "departmentName": "LIDA plant research",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 126,
    "name": "ENGORDONE DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2953,
    "departmentName": "LIDA plant research",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 217,
    "name": "MAXIFRUTO DE 500 ML",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1118,
    "departmentName": "LIDA plant research",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 331,
    "name": "STEMICOL DE 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1171,
    "departmentName": "LIDA plant research",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 332,
    "name": "STEMICOL DOSIS 100 GRS",
    "unit": "H87",
    "satCode": "10171500",
    "price": 126,
    "departmentName": "LIDA plant research",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 352,
    "name": "ULTIMITE DE 1L",
    "unit": "H87",
    "satCode": "10171500",
    "price": 1476.5,
    "departmentName": "LIDA plant research",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 320,
    "name": "SOBRE CHILE DE ARBOL",
    "unit": "H87",
    "satCode": "10171500",
    "price": 20.5,
    "departmentName": "SEMILLA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 321,
    "name": "SOBRE CHILE POBLANO",
    "unit": "H87",
    "satCode": "10171500",
    "price": 20.5,
    "departmentName": "SEMILLA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 322,
    "name": "SOBRE COL VERDE (REPOLLO)",
    "unit": "H87",
    "satCode": "10171500",
    "price": 20.5,
    "departmentName": "SEMILLA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 323,
    "name": "SOBRE EPAZOTE",
    "unit": "H87",
    "satCode": "10171500",
    "price": 20.5,
    "departmentName": "SEMILLA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 324,
    "name": "SOBRE HIERBABUENA",
    "unit": "H87",
    "satCode": "10171500",
    "price": 20.5,
    "departmentName": "SEMILLA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 325,
    "name": "SOBRE MANZANILLA",
    "unit": "H87",
    "satCode": "10171500",
    "price": 20.5,
    "departmentName": "SEMILLA",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 39,
    "name": "ANILLO DE TUTOREO",
    "unit": "H87",
    "satCode": "10171500",
    "price": 160,
    "departmentName": "TOYO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 150,
    "name": "GOMA 13MM",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2,
    "departmentName": "TOYO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 151,
    "name": "GOMAS 13 MM",
    "unit": "H87",
    "satCode": "10171500",
    "price": 3,
    "departmentName": "TOYO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 160,
    "name": "Goma Bilabial",
    "unit": "H87",
    "satCode": "10171500",
    "price": 2,
    "departmentName": "TOYO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 222,
    "name": "MINIVALINICIAL MANGUERA",
    "unit": "H87",
    "satCode": "10171500",
    "price": 15,
    "departmentName": "TOYO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 223,
    "name": "MINIVALVULA 16MM",
    "unit": "H87",
    "satCode": "10171500",
    "price": 15,
    "departmentName": "TOYO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 224,
    "name": "MINIVALVULA CINTA - CINTA",
    "unit": "H87",
    "satCode": "10171500",
    "price": 15,
    "departmentName": "TOYO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 225,
    "name": "MINIVALVULA INICIAL CINTILLA",
    "unit": "H87",
    "satCode": "10171500",
    "price": 15,
    "departmentName": "TOYO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 296,
    "name": "RAFIA 1KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 114,
    "departmentName": "TOYO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 297,
    "name": "RAFIA 2KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 235,
    "departmentName": "TOYO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 298,
    "name": "RAFIA 3KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 270,
    "departmentName": "TOYO",
    "branchCode": "TLAXIACO"
  },
  {
    "tlaxiacoRawCode": 299,
    "name": "RAFIA 4KG",
    "unit": "H87",
    "satCode": "10171500",
    "price": 414,
    "departmentName": "TOYO",
    "branchCode": "TLAXIACO"
  }
];
