import { adaptAndRegisterLegacyWidgets } from './index';
import { customerWidgets } from '../config/widgets/customerWidgets';
import { adminWidgets } from '../config/widgets/adminWidgets';
import { logger } from '../utils/logger';

export function initializeWidgets() {
  adaptAndRegisterLegacyWidgets(Object.values(customerWidgets));
  adaptAndRegisterLegacyWidgets(Object.values(adminWidgets));
  logger.log('[Widgets] Registered', Object.keys(customerWidgets).length + Object.keys(adminWidgets).length, 'widgets');
}
