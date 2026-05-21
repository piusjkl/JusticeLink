export type TriageCategory =
  | 'domestic_violence'
  | 'land_dispute'
  | 'labor_conflict'
  | 'family'
  | 'civil'
  | 'criminal'
  | 'child_protection'
  | 'disability_rights'
  | 'unknown';

export type TriageOutput = {
  category: TriageCategory;
  urgency: 'normal' | 'high' | 'emergency';
  confidence: number;
  language: string;
  recommendedInstitutionType: 'police' | 'legal_aid' | 'court' | 'ngo' | 'jlos';
  referralReasonCodes: string[];
  safetyFlags: string[];
  modelVersion: string;
};

const categoryRules: Array<{ category: TriageCategory; codes: string[]; terms: RegExp[] }> = [
  {
    category: 'child_protection',
    codes: ['CHILD_SAFETY'],
    terms: [/child/i, /minor/i, /defile/i, /school/i, /orphan/i, /maintenance/i],
  },
  {
    category: 'domestic_violence',
    codes: ['GBV_SAFETY', 'FAMILY_PROTECTION'],
    terms: [/domestic/i, /husband/i, /wife/i, /beaten/i, /beat/i, /violence/i, /abuse/i, /gbv/i, /threat/i],
  },
  {
    category: 'land_dispute',
    codes: ['LAND_RIGHTS'],
    terms: [/land/i, /boundary/i, /title/i, /evict/i, /kibanja/i, /landlord/i, /tenant/i, /plot/i],
  },
  {
    category: 'labor_conflict',
    codes: ['LABOUR_RIGHTS'],
    terms: [/salary/i, /wage/i, /employer/i, /dismiss/i, /termination/i, /labou?r/i, /workplace/i, /worker/i],
  },
  {
    category: 'disability_rights',
    codes: ['PWD_ACCESS'],
    terms: [/disab/i, /pwd/i, /wheelchair/i, /accessibility/i, /impairment/i],
  },
  {
    category: 'family',
    codes: ['FAMILY_MEDIATION'],
    terms: [/divorce/i, /custody/i, /inheritance/i, /marriage/i, /maintenance/i, /separation/i],
  },
  {
    category: 'criminal',
    codes: ['CRIMINAL_REPORT'],
    terms: [/theft/i, /robbery/i, /murder/i, /assault/i, /police/i, /arrest/i, /stolen/i, /rape/i],
  },
  {
    category: 'civil',
    codes: ['CIVIL_CLAIM'],
    terms: [/contract/i, /debt/i, /property/i, /neighbou?r/i, /business/i, /agreement/i],
  },
];

const emergencyTerms = [/danger/i, /urgent/i, /threat/i, /injur/i, /bleed/i, /rape/i, /defile/i, /violence/i, /evict/i, /arrest/i];

function detectLanguage(text: string, fallback?: string) {
  if (fallback) return fallback;
  if (/luganda|okukuba|ettaka|omwana/i.test(text)) return 'lg';
  if (/acholi|lobo|latin/i.test(text)) return 'ach';
  if (/runyankole|rukiga|eitaka/i.test(text)) return 'nyn';
  if (/lusoga/i.test(text)) return 'xog';
  return 'en';
}

function institutionFor(category: TriageCategory, emergency: boolean): TriageOutput['recommendedInstitutionType'] {
  if (emergency) return 'police';
  if (['domestic_violence', 'child_protection', 'criminal'].includes(category)) return 'police';
  if (['land_dispute', 'labor_conflict', 'family', 'disability_rights'].includes(category)) return 'legal_aid';
  if (category === 'civil') return 'court';
  return 'jlos';
}

export function classifyComplaint(description: string, language?: string): TriageOutput {
  const text = description || '';
  const matched = categoryRules.find((rule) => rule.terms.some((term) => term.test(text)));
  const emergency = emergencyTerms.some((term) => term.test(text));
  const category = matched?.category ?? 'unknown';
  const safetyFlags: string[] = [];

  if (emergency) safetyFlags.push('possible_immediate_risk');
  if (category === 'domestic_violence') safetyFlags.push('gbv_sensitive');
  if (category === 'child_protection') safetyFlags.push('child_sensitive');

  return {
    category,
    urgency: emergency ? 'emergency' : matched ? 'high' : 'normal',
    confidence: matched ? (emergency ? 0.86 : 0.74) : 0.42,
    language: detectLanguage(text, language),
    recommendedInstitutionType: institutionFor(category, emergency),
    referralReasonCodes: matched?.codes ?? ['GENERAL_REVIEW'],
    safetyFlags,
    modelVersion: 'private-hybrid-rules-v1',
  };
}
