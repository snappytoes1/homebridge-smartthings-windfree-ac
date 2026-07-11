import fs from 'node:fs';
import path from 'node:path';
import { PLATFORM_NAME } from './settings.js';
import { errorMessage } from './secrets.js';
export async function persistRefreshToken(refreshToken, log) {
    const configPath = process.env.UIX_CONFIG_PATH ?? path.join(process.cwd(), 'config.json');
    try {
        const raw = await fs.promises.readFile(configPath, 'utf8');
        const config = JSON.parse(raw);
        const platform = config.platforms?.find(candidate => candidate.platform === PLATFORM_NAME);
        if (!platform) {
            log.debug('Skipped refresh token persistence because platform config was not found.');
            return;
        }
        platform.refreshToken = refreshToken;
        await fs.promises.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
        log.debug('Persisted rotated SmartThings refresh token.');
    }
    catch (error) {
        log.warn(`Could not persist rotated SmartThings refresh token: ${errorMessage(error)}`);
    }
}
//# sourceMappingURL=tokenStore.js.map