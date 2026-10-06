/**
 * OCR Service — Resilient multi-provider text recognition with pharmaceutical parser.
 *
 * Capabilities:
 *   1. Custom API key support (configured by user in Profile > Settings)
 *   2. OCR.space multi-endpoint pipeline with redundant keys and form fallbacks
 *   3. Intelligent medicine parser with 100+ pharmaceutical dictionary entries
 *   4. Strict expiry date parser that distinguishes EXP from MFD
 *   5. Robust dosage & quantity extraction
 */

import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Google Cloud Vision (read securely from environment variable) ───────────
const VISION_API_KEY = process.env.EXPO_PUBLIC_VISION_API_KEY || '';

// ── OCR.space Endpoints & Keys ─────────────────────────────────────────────
const OCR_ENDPOINTS = [
  'https://api.ocr.space/parse/image',
  'https://apipro1.ocr.space/parse/image',
];

const OCR_KEYS = [
  'K85672888788957',
  'helloworld',
];

export interface OCRResult {
  name: string;
  dosage: string;
  expiryDate: string;
  quantity: string;
  rawText: string;
}

// ── 120+ Common Pharmaceutical Drugs & Brands ─────────────────────────────
export const PHARMACEUTICAL_DICTIONARY = [
  // Analgesics, Antipyretics & Anti-inflammatory
  'Paracetamol', 'Acetaminophen', 'Dolo', 'Calpol', 'Crocin', 'Combiflam', 'Ibuprofen',
  'Advil', 'Motrin', 'Naproxen', 'Aspirin', 'Diclofenac', 'Tramadol', 'Aceclofenac',
  'Meftal', 'Meftal-Spas', 'Zerodol', 'Zerodol-P', 'Zerodol-SP', 'Voveran', 'Ultracet',
  'Flexon', 'Saridon',
  // Antibiotics & Anti-infectives
  'Amoxicillin', 'Augmentin', 'Azithromycin', 'Azithral', 'Azee', 'Ciprofloxacin', 'Cefixime',
  'Ceftriaxone', 'Levofloxacin', 'Doxycycline', 'Clindamycin', 'Metronidazole',
  'Ofloxacin', 'Oflox-OZ', 'Taxim-O', 'Mahacef', 'Zifi', 'Clavam', 'Cephalexin', 'Ampicillin',
  'Erythromycin', 'Moxikind', 'Moxikind-CV', 'Cifran', 'Norflox', 'Norflox-TZ',
  // Diabetes & Endocrine
  'Metformin', 'Glimepiride', 'Glycomet', 'Januvia', 'Janumet', 'Sitagliptin', 'Dapagliflozin',
  'Empagliflozin', 'Jardiance', 'Galvus', 'Galvus Met', 'Trajenta', 'Insulin', 'Glipizide',
  'Teneligliptin', 'Tenepride', 'Vildagliptin', 'Gemer',
  'Thyroxine', 'Levothyroxine', 'Eltroxin', 'Synthroid',
  // Cardiovascular & Hypertension
  'Atorvastatin', 'Atorva', 'Rosuvastatin', 'Rosuvas', 'Simvastatin', 'Tonact',
  'Telmisartan', 'Telma', 'Telmikind', 'Amlodipine', 'Amlong', 'Amlokind', 'Cilacar',
  'Losartan', 'Enalapril', 'Ramipril', 'Cardace', 'Atenolol', 'Metoprolol', 'Starpress',
  'Bisoprolol', 'Nebivolol', 'Clopidogrel', 'Deplatt', 'Ecosprin', 'Ecosprin-AV',
  // Gastrointestinal & Antacids
  'Pantoprazole', 'Pan', 'Pan-D', 'Pantocid', 'Pantocid-DSR', 'Omeprazole', 'Omez', 'Omez-D',
  'Rabeprazole', 'Razo', 'Rablet', 'Rabicip', 'Esomeprazole', 'Nexpro', 'Ranitidine',
  'Famotidine', 'Sucralfate', 'Gelusil', 'Digene', 'Mucaine',
  // Antihistamines & Respiratory
  'Cetirizine', 'Cetzine', 'Levocetirizine', 'Allegra', 'Fexofenadine',
  'Montelukast', 'Montair', 'Montair-LC', 'Montek-LC', 'Telekast-L', 'Levocet-M',
  'Benadryl', 'Chlorpheniramine', 'Ascoril', 'Ascoril-D', 'Alex', 'Grilinctus', 'Cheston Cold',
  // Neuro, Vitamins & Supplements
  'Gabapentin', 'Pregabalin', 'Alprazolam', 'Alprax', 'Clonazepam', 'Zolpidem',
  'Sertraline', 'Escitalopram', 'Multivitamin', 'Vitamin D3', 'Vitamin C',
  'Calcium', 'Shelcal', 'Zinc', 'Zincovit', 'Iron', 'Folic Acid', 'Neurobion', 'Neurobion Forte',
  'Becosules', 'Limcee', 'Evion', 'Supradyn', 'Uprise-D3',
];

/**
 * Prepare image: resize to 1000px wide + JPEG 80% compression (clean 100-150KB upload).
 */
async function prepareImage(imageUri: string) {
  try {
    const manipulated = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1000 } }],
      { base64: true, compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    if (!manipulated.base64) {
      throw new Error('Failed to encode image as base64');
    }
    return manipulated.base64;
  } catch (err: any) {
    throw new Error('Image preparation failed: ' + (err.message || String(err)));
  }
}

// ── Provider 1: Cloud Vision ────────────────────────────────────────
async function recognizeWithCloudVision(base64: string, customKey?: string | null): Promise<string> {
  const key = customKey || VISION_API_KEY;
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${key}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const body = {
      requests: [
        {
          image: { content: base64 },
          features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloud Vision ${response.status}: ${errorText.slice(0, 150)}`);
    }

    const data = await response.json();
    const annotations = data.responses?.[0]?.textAnnotations;
    return annotations?.[0]?.description ?? '';
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ── Provider 2: OCR.space ──────────────────────────────────────────
async function recognizeWithOCRSpace(
  base64: string,
  apiKey: string,
  endpoint: string = OCR_ENDPOINTS[0]
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    // Form parameters
    const formData = new FormData();
    formData.append('base64Image', `data:image/jpeg;base64,${base64}`);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('filetype', 'JPG');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Engine 2 is optimized for alphanumeric packaging & numbers

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { apikey: apiKey },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OCR.space HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.IsErroredOnProcessing) {
      throw new Error(data.ErrorMessage?.[0] || 'OCR.space processing error');
    }

    const text = data.ParsedResults
      ?.map((r: any) => r.ParsedText)
      .join('\n')
      .trim();

    return text || '';
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ── Public API: Multi-Provider Text Recognition Flow ────────────────
export async function recognizeText(imageUri: string): Promise<string> {
  const base64 = await prepareImage(imageUri);

  // Check for custom user API key in settings
  const customKey = await AsyncStorage.getItem('custom_ocr_key').catch(() => null);

  // 1. Try Cloud Vision with custom key if provided
  if (customKey && customKey.startsWith('AIza')) {
    try {
      const text = await recognizeWithCloudVision(base64, customKey);
      if (text && text.trim().length > 0) return text.trim();
    } catch (e: any) {
      console.warn('Custom Cloud Vision key failed:', e.message);
    }
  }

  // 2. Try OCR.space with custom key or redundant backup keys
  const keysToTry = customKey && !customKey.startsWith('AIza')
    ? [customKey, ...OCR_KEYS]
    : OCR_KEYS;

  for (const endpoint of OCR_ENDPOINTS) {
    for (const key of keysToTry) {
      try {
        const text = await recognizeWithOCRSpace(base64, key, endpoint);
        if (text && text.trim().length > 0) return text.trim();
      } catch (err: any) {
        console.warn(`OCR endpoint ${endpoint} key ${key.slice(0, 5)}... failed:`, err.message);
      }
    }
  }

  // 3. Fallback: try default Cloud Vision (in case GCP billing was activated)
  try {
    const text = await recognizeWithCloudVision(base64);
    if (text && text.trim().length > 0) return text.trim();
  } catch (err: any) {
    console.warn('Default Cloud Vision unavailable:', err.message);
  }

  return '';
}

function formatMedicineName(raw: string): string {
  if (!raw) return '';
  // Clean punctuation and special characters
  const cleaned = raw.replace(/[®™©]/g, '').trim();
  // If ALL CAPS or all lower, convert to Title Case
  return cleaned
    .split(/\s+/)
    .map((word) => {
      // Keep acronyms/units uppercase
      if (/^(mg|ml|mcg|iu|iv|im|ip|usp|bp|cr|sr|er|xl|ds|dt|d|cv|sp)$/i.test(word)) {
        return word.toUpperCase();
      }
      if (/^\d+[a-zA-Z]*$/.test(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

// ── Enhanced Medicine Label Parser ──────────────────────────────────
export function parseOCRText(text: string): OCRResult {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const result: OCRResult = {
    name: '',
    dosage: '',
    expiryDate: '',
    quantity: '',
    rawText: text,
  };

  if (lines.length === 0) return result;

  // 1. Medicine Name Matching
  // First, check for known brand or generic drugs in dictionary
  const fullText = lines.join(' ');
  for (const drug of PHARMACEUTICAL_DICTIONARY) {
    const rx = new RegExp(`\\b${drug}\\b`, 'i');
    if (rx.test(fullText)) {
      // Find the cleanest line containing this drug
      for (const line of lines) {
        if (rx.test(line)) {
          const cleaned = line
            .replace(/[®™©]/g, '')
            .split(/(?:tablets?|capsules?|\bip\b|\busp\b|\bbp\b)/i)[0]
            .trim();
          if (cleaned.length >= 2) {
            result.name = formatMedicineName(cleaned);
            break;
          }
        }
      }
      if (!result.name) result.name = drug;
      break;
    }
  }

  // If no known medicine found, select the first high-confidence line
  if (!result.name) {
    const skipRegex =
      /^(mfg|mfd|batch|b\.?no|lot|exp|expiry|price|mrp|net|qty|pack|store|keep|warning|caution|rx|mkt|marketed|for|dosage|composition|each|\d+)/i;
    for (const line of lines) {
      const clean = line.replace(/[®™©]/g, '').trim();
      if (clean.length >= 3 && !skipRegex.test(clean) && !clean.match(/^\d+$/)) {
        const candidate = clean
          .split(/(?:tablets?|capsules?|\bip\b|\busp\b|\bbp\b)/i)[0]
          .trim();
        result.name = formatMedicineName(candidate);
        break;
      }
    }
  }

  // 2. Dosage Extraction
  // Pass A: Explicit unit (e.g., 500mg, 650 mg, 10mcg, 5ml, 1g)
  for (const line of lines) {
    const m = line.match(/(\d+\.?\d*)\s*(mg|ml|mcg|g|iu|units?)\b/i);
    if (m) {
      result.dosage = `${m[1]}${m[2].toLowerCase()}`;
      break;
    }
  }
  // Pass B: Brand with strength in name (e.g., Dolo 650, Augmentin 625, Pan 40)
  if (!result.dosage) {
    for (const line of lines) {
      const m = line.match(
        /\b(?:dolo|crocin|calpol|pan|augmentin|azithral|combiflam)\s*(\d{2,4})\b/i
      );
      if (m) {
        result.dosage = `${m[1]}mg`;
        break;
      }
    }
  }

  // 3. Expiry Date Extraction (Strictly ignoring MFD / MFG lines)
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };

  // Pass A: Explicit EXP / EXPIRY / USE BEFORE / BEST BEFORE prefix
  for (const line of lines) {
    if (/^(mfd|mfg|manufacture)/i.test(line)) continue;

    // mm/yyyy or mm-yyyy
    let m = line.match(
      /(?:exp(?:iry|\.|\s*date)?|use\s*by|best\s*before|use\s*before|bb)[:\s]*(\d{1,2})[\/\-](\d{4})/i
    );
    if (m) {
      const month = String(parseInt(m[1], 10)).padStart(2, '0');
      result.expiryDate = `${m[2]}-${month}-01`;
      break;
    }

    // mm/yy (e.g. 11/27 -> 2027-11-01)
    m = line.match(
      /(?:exp(?:iry|\.|\s*date)?|use\s*by|best\s*before|use\s*before|bb)[:\s]*(\d{1,2})[\/\-](\d{2})\b/i
    );
    if (m) {
      const month = String(parseInt(m[1], 10)).padStart(2, '0');
      const year = `20${m[2]}`;
      result.expiryDate = `${year}-${month}-01`;
      break;
    }

    // Month name + year (e.g. DEC 2026 or EXP. OCT 27)
    m = line.match(
      /(?:exp(?:iry|\.|\s*date)?|bb)[:\s]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*[\s\/\-](\d{2,4})/i
    );
    if (m) {
      const month = monthMap[m[1].toLowerCase().slice(0, 3)] || '01';
      const year = m[2].length === 2 ? `20${m[2]}` : m[2];
      result.expiryDate = `${year}-${month}-01`;
      break;
    }
  }

  // Pass B: Date pattern without EXP prefix if still not found
  if (!result.expiryDate) {
    for (const line of lines) {
      if (/^(mfd|mfg|manufacture)/i.test(line)) continue;
      let m = line.match(/\b(\d{1,2})[\/\-](\d{4})\b/);
      if (m) {
        const month = String(parseInt(m[1], 10)).padStart(2, '0');
        result.expiryDate = `${m[2]}-${month}-01`;
        break;
      }
      m = line.match(/\b(\d{1,2})[\/\-](\d{2})\b/);
      if (m && parseInt(m[2], 10) >= 24 && parseInt(m[2], 10) <= 35) {
        const month = String(parseInt(m[1], 10)).padStart(2, '0');
        result.expiryDate = `20${m[2]}-${month}-01`;
        break;
      }
    }
  }

  // 4. Quantity Extraction
  for (const line of lines) {
    let m = line.match(/(?:strip\s*of\s*|pack\s*of\s*)(\d+)/i);
    if (m) {
      result.quantity = m[1];
      break;
    }
    m = line.match(
      /(?:qty[:\s]*|contains[:\s]*)?(\d+)\s*(tablets?|capsules?|pills?|sachets?|vials?|bottles?|pieces?|units?)/i
    );
    if (m) {
      result.quantity = m[1];
      break;
    }
  }

  return result;
}
