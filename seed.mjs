import { initializeApp } from "firebase/app";
import { getFirestore, setDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDzOel-toXx7oT3DJ1GqgerW-X6dIdsyh0",
  authDomain: "desmoproductsonline.firebaseapp.com",
  projectId: "desmoproductsonline",
  storageBucket: "desmoproductsonline.firebasestorage.app",
  messagingSenderId: "684470912687",
  appId: "1:684470912687:web:9b31a83fb8217cd691f65a",
  measurementId: "G-6MM332FX5Y"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DEFAULT_PRODUCTS = [
  {
    id: "DP-DMM-401",
    name: "Desmo True RMS Digital Multimeter",
    sku: "DP-DMM-401",
    description: "Industrial grade auto-ranging digital multimeter with high safety rating (CAT III 1000V / CAT IV 600V). Features temperature measurement, dual displays, and micro-amp testing for flame sensors.",
    imageUrl: "https://images.unsplash.com/photo-not-used",
    baseWholesalePrice: 150.00,
    isRestricted: false,
    quantityBreaks: [
      { minQty: 10, discountType: "percentage", discountValue: 5 },
      { minQty: 25, discountType: "percentage", discountValue: 12 }
    ],
    category: "Digital Meters",
    stock: 120,
    allowBackorders: true,
    weightKg: 1.5,
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10
  },
  {
    id: "DP-PAT-302",
    name: "Portable Appliance Safety Tester",
    sku: "DP-PAT-302",
    description: "Fast and easy-to-use handheld PAT tester. Features clear pass/fail indicators, earth bond test, and insulation resistance checks for compliant electrical safety inspections.",
    imageUrl: "https://images.unsplash.com/photo-not-used",
    baseWholesalePrice: 180.00,
    isRestricted: false,
    quantityBreaks: [
      { minQty: 5, discountType: "percentage", discountValue: 5 },
      { minQty: 10, discountType: "percentage", discountValue: 10 }
    ],
    category: "Safety Compliance",
    stock: 45,
    allowBackorders: false,
    weightKg: 1.5,
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10
  },
  {
    id: "DP-OSC-200",
    name: "Desmo Handheld Digital Oscilloscope",
    sku: "DP-OSC-200",
    description: "Extremely high-precision, dual-channel 100MHz handheld oscilloscope. Features advanced waveform trigger capture, color TFT screen, and battery power for field diagnostics. Restricted access.",
    imageUrl: "https://images.unsplash.com/photo-not-used",
    baseWholesalePrice: 1250.00,
    isRestricted: true,
    quantityBreaks: [
      { minQty: 2, discountType: "fixed", discountValue: 1150.00 }
    ],
    category: "Signal Analysis",
    stock: 5,
    allowBackorders: true,
    weightKg: 1.5,
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10
  },
  {
    id: "DP-IRT-500",
    name: "Insulation Resistance Diagnostic Tester",
    sku: "DP-IRT-500",
    description: "Rugged high-voltage diagnostic insulation tester for checking motors, generators, cables, and switchgears. Test voltages up to 2500V with PI/DAR ratio calculations.",
    imageUrl: "https://images.unsplash.com/photo-not-used",
    baseWholesalePrice: 95.00,
    isRestricted: false,
    quantityBreaks: [
      { minQty: 15, discountType: "percentage", discountValue: 15 }
    ],
    category: "High-Voltage Diagnostics",
    stock: 80,
    allowBackorders: false,
    weightKg: 1.5,
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10
  },
  {
    id: "DP-CLP-600",
    name: "True RMS AC/DC Clamp Meter",
    sku: "DP-CLP-600",
    description: "Professional jaw clamp current meter with True RMS accuracy. Replaces traditional line breaking methods, allowing safe current measurements in tight panel nodes. Restricted access.",
    imageUrl: "https://images.unsplash.com/photo-not-used",
    baseWholesalePrice: 340.00,
    isRestricted: true,
    quantityBreaks: [
      { minQty: 10, discountType: "percentage", discountValue: 10 }
    ],
    category: "Digital Meters",
    stock: 12,
    allowBackorders: true,
    weightKg: 1.5,
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10
  },
  {
    id: "DP-LCR-100",
    name: "Precision LCR Bridge Meter",
    sku: "DP-LCR-100",
    description: "High-accuracy component tester for measuring inductance (L), capacitance (C), and resistance (R) with dissipation factor (D) and quality factor (Q). Dual display layout.",
    imageUrl: "https://images.unsplash.com/photo-not-used",
    baseWholesalePrice: 110.00,
    isRestricted: false,
    quantityBreaks: [
      { minQty: 10, discountType: "percentage", discountValue: 8 },
      { minQty: 25, discountType: "percentage", discountValue: 15 }
    ],
    category: "Component Analysis",
    stock: 60,
    allowBackorders: true,
    weightKg: 1.5,
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10
  },
  {
    id: "LT240A15",
    name: "CAT IV 600V Single Phase Loadtester",
    sku: "LT240A15",
    description: "The Loadtester is used as an electrical load on kWh power meters when testing to ensure the correct operation and functionality of the meters. Incorporates fused probes with silicon leads and is housed in a compact body. Protected by an automatic thermal cut-out switch.\n\nSpecifications:\nVoltage: 240 – 250V max. 1Ø\nLoad: 1100W – 4.5amp\nInternal Fusing: 7amp\nSafety Rating: Cat IV 600V – Cat III 1000V\nCompliant to: AS: 61010.1: 2003\nWeight: 420gm\nLeads: Silicon with internal white wear indicator layer\nTest Probes: Cat III 1000V\nMotor: 1100W with thermal cut-out\nGrills: Black Nylon 15% Glass Filled\nCable Grommet: TPE 90A Shore\nBody: PC-ABS Fire Retardant – spark finish\nHook: Polished 316 S/S that allows hands free operation.",
    imageUrl: "placeholder",
    baseWholesalePrice: 430.00,
    isRestricted: false,
    autoApprove: true,
    category: "Safety Compliance",
    stock: 50,
    allowBackorders: true,
    weightKg: 1.5,
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10
  },
  {
    id: "B400",
    name: "400A LV Barrier",
    sku: "B400",
    description: "Insulated safety barrier used on the overhead network of the West Australian supply authority during switching and interconnection movements. Installed by hand or Hotstick onto the contact blade of a 400A Low Voltage isolator (disconnector) to prevent closure contact.\n\nSpecifications:\nWeight: 225gm\nMaterial: High Impact Polyethylene PVC\nLength: 310mm\nDiameter: 50mm\nAdapts to male Flowline fitting on standard Hotstick or Double Ended Fuse Extractor (FE2)",
    imageUrl: "placeholder",
    baseWholesalePrice: 99.00,
    isRestricted: false,
    autoApprove: true,
    category: "Safety Compliance",
    stock: 100,
    allowBackorders: true,
    weightKg: 1.5,
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10
  },
  {
    id: "B600",
    name: "600A LV Barrier",
    sku: "B600",
    description: "Insulated safety barrier used on the overhead network of the West Australian supply authority during switching and interconnection movements. Installed by hand or Hotstick onto the contact blade of a 600A Low Voltage isolator (disconnector) to prevent closure contact.\n\nSpecifications:\nWeight: 200gm\nMaterial: High Impact Polyethylene PVC\nLength: 275mm\nDiameter: 50mm\nAdapts to male Flowline fitting on standard Hotstick or Double Ended Fuse Extractor (FE2)",
    imageUrl: "placeholder",
    baseWholesalePrice: 129.00,
    isRestricted: false,
    autoApprove: true,
    category: "Safety Compliance",
    stock: 100,
    allowBackorders: true,
    weightKg: 1.5,
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10
  },
  {
    id: "METERSEAL",
    name: "KWh Meter Seals (Pack)",
    sku: "METERSEAL",
    description: "Polypropylene meter seals used as an anti-pilferage measure on KWh power meters by the Australian Supply Authorities. Can also be used for all types of sealing equipment and printed with flag symbol/logo if required.\n\nSpecifications:\nMaterial: Polypropylene\nLength: 235mm\nTag Size: 25mm x 12mm",
    imageUrl: "placeholder",
    baseWholesalePrice: 45.00,
    isRestricted: true,
    autoApprove: false,
    category: "Safety Compliance",
    stock: 200,
    allowBackorders: true,
    weightKg: 1.5,
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10,
    colors: [
      "Signal Orange",
      "Green",
      "Yellow",
      "White",
      "Beige",
      "Red",
      "Pink",
      "Purple",
      "L/ Blue",
      "Grey",
      "Brown",
      "Blue",
      "Black",
      "Fluoro Orange"
    ]
  }
];

async function seed() {
  for (const product of DEFAULT_PRODUCTS) {
    try {
      await setDoc(doc(db, "products", product.id), product);
      console.log(`Added product: ${product.name}`);
    } catch (error) {
      console.error(`Error adding product ${product.name}:`, error);
    }
  }
  console.log("All products seeded successfully.");
  process.exit(0);
}

seed();
