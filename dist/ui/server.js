import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import { createAuthorizeUrl, exchangeAuthorizationCode } from './oauth.js';
import { discoverDevicesForUi } from './service.js';
class SmartThingsWindFreeUiServer extends HomebridgePluginUiServer {
    pendingStates = new Set();
    constructor() {
        super();
        this.onRequest('/oauth/start', (payload) => {
            const request = payloadRecord(payload);
            const result = createAuthorizeUrl(request);
            this.pendingStates.add(result.state);
            return result;
        });
        this.onRequest('/oauth/exchange', (payload) => {
            const request = payloadRecord(payload);
            return exchangeAuthorizationCode(request, this.pendingStates);
        });
        this.onRequest('/discoverDevices', (payload) => {
            const request = payloadRecord(payload);
            return discoverDevicesForUi(request, uiLogger);
        });
        this.ready();
    }
}
const uiLogger = {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
};
function payloadRecord(payload) {
    return payload && typeof payload === 'object' ? payload : {};
}
(() => new SmartThingsWindFreeUiServer())();
//# sourceMappingURL=server.js.map