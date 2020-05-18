import BN from 'bn.js';

import { SMPStateMachine } from 'js-smp';

function createSMPStateMachine() {
  return new SMPStateMachine(new BN(1));
}

export { createSMPStateMachine };
