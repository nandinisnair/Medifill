// Medicine interaction database
// In production, this should come from a medical API (e.g., RxNorm, OpenFDA)
// This is an expanded local fallback

export interface InteractionInfo {
  medicines: string[];
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
}

// Map of medicine name (lowercase) -> list of interacting medicine names (lowercase)
export const MEDICINE_INTERACTIONS: Record<string, string[]> = {
  'aspirin': ['warfarin', 'ibuprofen', 'naproxen', 'clopidogrel', 'heparin'],
  'warfarin': ['aspirin', 'ibuprofen', 'paracetamol', 'naproxen', 'vitamin k', 'amiodarone'],
  'ibuprofen': ['aspirin', 'warfarin', 'lisinopril', 'naproxen', 'methotrexate'],
  'paracetamol': ['warfarin', 'alcohol'],
  'lisinopril': ['ibuprofen', 'potassium supplements', 'spironolactone'],
  'simvastatin': ['clarithromycin', 'erythromycin', 'amiodarone', 'grapefruit'],
  'clarithromycin': ['simvastatin', 'atorvastatin'],
  'erythromycin': ['simvastatin', 'atorvastatin'],
  'potassium supplements': ['lisinopril', 'spironolactone'],
  'metformin': ['alcohol', 'contrast dye'],
  'levothyroxine': ['calcium supplements', 'iron supplements', 'antacids'],
  'calcium supplements': ['levothyroxine', 'iron supplements'],
  'iron supplements': ['levothyroxine', 'calcium supplements', 'antacids'],
  'naproxen': ['aspirin', 'warfarin', 'ibuprofen', 'lisinopril'],
  'clopidogrel': ['aspirin', 'omeprazole'],
  'omeprazole': ['clopidogrel', 'methotrexate'],
  'atorvastatin': ['clarithromycin', 'erythromycin', 'grapefruit'],
  'amiodarone': ['warfarin', 'simvastatin', 'digoxin'],
  'digoxin': ['amiodarone', 'verapamil'],
  'verapamil': ['digoxin', 'metoprolol'],
  'metoprolol': ['verapamil', 'insulin'],
  'insulin': ['metoprolol', 'alcohol'],
  'spironolactone': ['lisinopril', 'potassium supplements'],
  'methotrexate': ['ibuprofen', 'omeprazole'],
  'antacids': ['levothyroxine', 'iron supplements'],
};

// Severity mapping for specific pairs
export const INTERACTION_SEVERITY: InteractionInfo[] = [
  {
    medicines: ['warfarin', 'aspirin'],
    severity: 'severe',
    description: 'Greatly increases risk of bleeding. Consult your doctor immediately.',
  },
  {
    medicines: ['warfarin', 'ibuprofen'],
    severity: 'severe',
    description: 'NSAIDs increase anticoagulant effect and risk of GI bleeding.',
  },
  {
    medicines: ['simvastatin', 'clarithromycin'],
    severity: 'severe',
    description: 'Risk of rhabdomyolysis (muscle breakdown). Avoid combination.',
  },
  {
    medicines: ['lisinopril', 'potassium supplements'],
    severity: 'moderate',
    description: 'Risk of hyperkalemia (high potassium). Monitor levels closely.',
  },
  {
    medicines: ['levothyroxine', 'calcium supplements'],
    severity: 'mild',
    description: 'Calcium reduces thyroid hormone absorption. Take 4 hours apart.',
  },
  {
    medicines: ['metformin', 'alcohol'],
    severity: 'moderate',
    description: 'Increases risk of lactic acidosis. Limit alcohol consumption.',
  },
  {
    medicines: ['clopidogrel', 'omeprazole'],
    severity: 'moderate',
    description: 'Omeprazole reduces effectiveness of clopidogrel. Consider alternative PPI.',
  },
];

/**
 * Find known drug keywords present in a medicine name.
 * e.g. "Aspirin 100mg Dispersible" -> ["aspirin"]
 */
export function extractKnownDrugKeys(name: string): string[] {
  if (!name) return [];
  const clean = name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = clean.split(/\s+/).filter(Boolean);
  const matched = new Set<string>();

  for (const key of Object.keys(MEDICINE_INTERACTIONS)) {
    // Check multi-word keys (e.g. "potassium supplements", "calcium supplements")
    if (clean.includes(key)) {
      matched.add(key);
      continue;
    }
    // Check single-word keys against individual words
    if (words.includes(key)) {
      matched.add(key);
    }
  }

  return Array.from(matched);
}

/**
 * Find all medicines in the user's list that interact with a given medicine name.
 */
export function findInteractionsForMedicine(
  medicineName: string,
  existingMedicineNames: string[]
): string[] {
  const targetKeys = extractKnownDrugKeys(medicineName);
  if (targetKeys.length === 0) return [];

  // Collect all interacting drug keys
  const interactingKeys = new Set<string>();
  for (const key of targetKeys) {
    const list = MEDICINE_INTERACTIONS[key] || [];
    for (const item of list) {
      interactingKeys.add(item);
    }
  }

  // Filter existing medicines that contain any of the interacting keys
  return existingMedicineNames.filter((existingName) => {
    // Avoid self-interaction check if same name
    if (existingName.trim().toLowerCase() === medicineName.trim().toLowerCase()) {
      return false;
    }
    const existingKeys = extractKnownDrugKeys(existingName);
    return existingKeys.some((k) => interactingKeys.has(k));
  });
}

/**
 * Get interaction severity between two medicines.
 */
export function getInteractionSeverity(
  med1: string,
  med2: string
): InteractionInfo | undefined {
  const keys1 = extractKnownDrugKeys(med1);
  const keys2 = extractKnownDrugKeys(med2);

  return INTERACTION_SEVERITY.find((info) => {
    const [a, b] = info.medicines;
    return (
      (keys1.includes(a) && keys2.includes(b)) ||
      (keys1.includes(b) && keys2.includes(a))
    );
  });
}
