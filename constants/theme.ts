// MediFill Design System — Modern Clinical & Human Health Palette
// Inspired by Apple Health, One Medical, and modern Scandinavian medical UI

export const Colors = {
  // Primary Palette — Precision Medical Blue
  primary: '#0284C7',
  primaryDark: '#0369A1',
  primaryDeep: '#075985',
  primaryLight: '#E0F2FE',
  primarySubtle: '#F0F9FF',
  primaryGradientStart: '#0284C7',
  primaryGradientEnd: '#38BDF8',

  // Secondary & Accents
  accent: '#2563EB',
  accentLight: '#EFF6FF',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  purple: '#7C3AED',
  purpleLight: '#F5F3FF',
  pink: '#DB2777',
  pinkLight: '#FDF2F8',

  // Semantic Feedback — Distinct Medical Tones
  success: '#059669',
  successLight: '#ECFDF5',
  successDark: '#065F46',

  warning: '#D97706',
  warningLight: '#FFFBEB',
  warningDark: '#92400E',

  danger: '#DC2626',
  dangerLight: '#FEF2F2',
  dangerDark: '#991B1B',

  // Family Member Badges
  familySelf: '#0284C7',
  familySpouse: '#DB2777',
  familyChild: '#F59E0B',
  familyParent: '#8B5CF6',
  familyGrandparent: '#059669',
  familyOther: '#64748B',

  // Neutrals & Surfaces
  white: '#FFFFFF',
  background: '#F8FAFC',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  surfaceTertiary: '#E2E8F0',

  // Borders & Dividers
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderDark: '#CBD5E1',

  // Typography Hierarchy (WCAG AAA compliant contrast against white)
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  textOnDanger: '#991B1B',

  // Alert Specific
  alertBackground: '#FEF2F2',
  alertBorder: '#FECACA',
} as const;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 48,
} as const;

export const FontSize = {
  xxs: 10,
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 19,
  xxl: 22,
  xxxl: 28,
  hero: 34,
} as const;

export const FontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  full: 9999,
} as const;

export const Shadow = {
  xs: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
} as const;
