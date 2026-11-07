import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEY_USAGE = '@medifill_maps_monthly_usage';
const STORAGE_KEY_MONTH = '@medifill_maps_current_month';

// Default budget values (Google Maps Platform provides $200 / 200 free credits/month)
const DEFAULT_MONTHLY_BUDGET = Number(process.env.EXPO_PUBLIC_MONTHLY_CREDIT_BUDGET) || 200;
const SAFEGUARD_PERCENT = Number(process.env.EXPO_PUBLIC_CREDIT_SAFEGUARD_PERCENT) || 80;

export interface QuotaStatus {
  totalBudget: number;
  usedCredits: number;
  remainingCredits: number;
  percentageUsed: number;
  isSafeguardActive: boolean; // True when >= 80%
  isExhausted: boolean;       // True when >= 100%
  currentMonth: string;
}

class QuotaGuardService {
  private getCurrentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Retrieves current monthly usage and resets if a new calendar month has started.
   */
  async getUsage(): Promise<number> {
    try {
      const currentMonth = this.getCurrentMonthKey();
      const storedMonth = await AsyncStorage.getItem(STORAGE_KEY_MONTH);

      // Reset automatically on the 1st of every month
      if (storedMonth !== currentMonth) {
        await AsyncStorage.setItem(STORAGE_KEY_MONTH, currentMonth);
        await AsyncStorage.setItem(STORAGE_KEY_USAGE, '0');
        return 0;
      }

      const storedUsage = await AsyncStorage.getItem(STORAGE_KEY_USAGE);
      return storedUsage ? parseFloat(storedUsage) : 0;
    } catch (error) {
      console.warn('QuotaGuard: Error reading usage, falling back to 0', error);
      return 0;
    }
  }

  /**
   * Get detailed quota status including whether the 80% safeguard is active.
   */
  async getQuotaStatus(): Promise<QuotaStatus> {
    const used = await this.getUsage();
    const total = DEFAULT_MONTHLY_BUDGET;
    const percentage = Math.min(100, Math.round((used / total) * 100));
    const isSafeguardActive = percentage >= SAFEGUARD_PERCENT;
    const isExhausted = percentage >= 100;

    return {
      totalBudget: total,
      usedCredits: used,
      remainingCredits: Math.max(0, total - used),
      percentageUsed: percentage,
      isSafeguardActive,
      isExhausted,
      currentMonth: this.getCurrentMonthKey(),
    };
  }

  /**
   * Check if a Maps API request is permitted.
   * Returns false once 80% of credits are reached to prevent any billing.
   */
  async canUsePaidMapsApi(): Promise<boolean> {
    const status = await this.getQuotaStatus();
    // Safeguard triggers at 80% of $200 free tier (160 credits)
    return !status.isSafeguardActive;
  }

  /**
   * Records a Maps API request (increments usage by units, e.g. 1 request or estimated cost).
   */
  async recordUsage(units: number = 1): Promise<QuotaStatus> {
    try {
      const currentUsed = await this.getUsage();
      const newUsed = Math.round((currentUsed + units) * 100) / 100;
      await AsyncStorage.setItem(STORAGE_KEY_USAGE, String(newUsed));
      return await this.getQuotaStatus();
    } catch (error) {
      console.warn('QuotaGuard: Failed to record API usage', error);
      return await this.getQuotaStatus();
    }
  }

  /**
   * Manual reset for testing or administration
   */
  async resetQuota(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_USAGE, '0');
    await AsyncStorage.setItem(STORAGE_KEY_MONTH, this.getCurrentMonthKey());
  }
}

export const quotaGuard = new QuotaGuardService();
