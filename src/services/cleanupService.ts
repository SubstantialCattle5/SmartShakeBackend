import { JwtService } from './jwtService';

export class CleanupService {
  private static cleanupInterval: NodeJS.Timeout | null = null;

  // Start periodic cleanup of expired blacklisted tokens
  static startPeriodicCleanup(intervalHours: number = 24): void {
    if (this.cleanupInterval) {
      console.log('Cleanup service is already running');
      return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000; // Convert hours to milliseconds

    this.cleanupInterval = setInterval(async () => {
      try {
        console.log('Starting periodic cleanup of expired blacklisted tokens...');
        await JwtService.cleanupExpiredBlacklistedTokens();
        console.log('Cleanup completed successfully');
      } catch (error) {
        console.error('Error during periodic cleanup:', error);
      }
    }, intervalMs);

    console.log(`Cleanup service started. Will run every ${intervalHours} hours.`);
  }

  // Stop periodic cleanup
  static stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Cleanup service stopped');
    }
  }

  // Manual cleanup trigger
  static async runCleanupNow(): Promise<void> {
    try {
      console.log('Running manual cleanup of expired blacklisted tokens...');
      await JwtService.cleanupExpiredBlacklistedTokens();
      console.log('Manual cleanup completed successfully');
    } catch (error) {
      console.error('Error during manual cleanup:', error);
      throw error;
    }
  }
} 