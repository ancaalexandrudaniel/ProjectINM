/**
 * Cron Jobs Configuration
 * 
 * Scheduled background tasks for the INM Mentor platform.
 * Uses node-cron for in-process scheduling.
 */

import cron from 'node-cron';

/**
 * Initialize all cron jobs
 * Call this once when the server starts (production only)
 */
export function initializeCronJobs(): void {
    // Only run cron jobs in production
    if (process.env.NODE_ENV !== 'production') {
        console.log('[CRON] Skipping cron jobs in development mode');
        return;
    }

    console.log('[CRON] Initializing scheduled jobs...');

    // =========================================================================
    // Legislative Sync - Weekly on Sunday at 06:00 AM (Romania time UTC+2/+3)
    // Cron: "0 6 * * 0" = At 06:00 on Sunday
    // =========================================================================
    cron.schedule('0 6 * * 0', async () => {
        console.log('[CRON] Starting weekly legislative sync...');

        try {
            const { getLegislativeMonitor } = await import('./services/legislative-monitor');
            const monitor = getLegislativeMonitor();
            const result = await monitor.checkForUpdates();

            console.log(`[CRON] Legislative sync complete:`);
            console.log(`  - Acts checked: ${result.actsChecked}`);
            console.log(`  - Changes detected: ${result.changesDetected.length}`);

            if (result.changesDetected.length > 0) {
                console.log(`[CRON] Changes found in:`);
                result.changesDetected.forEach(c => {
                    console.log(`    - ${c.actName} (${c.affectedArticles.length} articles affected)`);
                });
            }

            if (result.errors.length > 0) {
                console.log(`[CRON] Errors during sync:`);
                result.errors.forEach(e => console.log(`    - ${e}`));
            }
        } catch (error) {
            console.error('[CRON] Legislative sync failed:', error);
        }
    }, {
        timezone: 'Europe/Bucharest'
    });

    console.log('[CRON] Scheduled: Legislative sync (Sundays 06:00 Europe/Bucharest)');
    console.log('[CRON] All cron jobs initialized');
}
