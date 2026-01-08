import { adaptAndRegisterLegacyWidgets } from './index';
import { customerWidgets } from '../config/widgets/customerWidgets';
import { adminWidgets } from '../config/widgets/adminWidgets';

export function initializeWidgets() {
  adaptAndRegisterLegacyWidgets(Object.values(customerWidgets));
  adaptAndRegisterLegacyWidgets(Object.values(adminWidgets));
  console.log('[Widgets] Registered', Object.keys(customerWidgets).length + Object.keys(adminWidgets).length, 'widgets');
}
