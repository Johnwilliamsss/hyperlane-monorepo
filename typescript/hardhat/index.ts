import { TestAbacusDeploy } from './src/TestAbacusDeploy';
import '@nomiclabs/hardhat-waffle';
import { extendEnvironment } from 'hardhat/config';
import { lazyObject } from 'hardhat/plugins';
import 'hardhat/types/runtime';

export { TestAbacusDeploy } from './src/TestAbacusDeploy';
export { TestRouterDeploy } from './src/TestRouterDeploy';

declare module 'hardhat/types/runtime' {
  interface HardhatRuntimeEnvironment {
    abacus: TestAbacusDeploy;
  }
}

// HardhatRuntimeEnvironment
extendEnvironment((hre) => {
  hre.abacus = lazyObject(() => new TestAbacusDeploy({ signer: {} }));
});
