import { ProtocolType, rootLogger } from '@hyperlane-xyz/utils';

import { HyperlaneContracts } from '../contracts/types.js';
import { InterchainAccountDeployer } from '../middleware/account/InterchainAccountDeployer.js';
import { InterchainAccountFactories } from '../middleware/account/contracts.js';
import { MultiProvider } from '../providers/MultiProvider.js';
import { EthersV5Transaction } from '../providers/ProviderType.js';
import { ProxiedRouterConfig } from '../router/types.js';
import { ChainNameOrId } from '../types.js';

import { HyperlaneModule, HyperlaneModuleArgs } from './AbstractHyperlaneModule.js';

export type InterchainAccountConfig = ProxiedRouterConfig;

export class EvmIcaModule extends HyperlaneModule<
  ProtocolType.Ethereum,
  InterchainAccountConfig,
  HyperlaneContracts<InterchainAccountFactories>
> {
  protected logger = rootLogger.child({ module: 'EvmIsmModule' });

  protected constructor(
    protected readonly multiProvider: MultiProvider,
    args: HyperlaneModuleArgs<
      InterchainAccountConfig,
      HyperlaneContracts<InterchainAccountFactories>
    >,
  ) {
    super(args);
  }

  public async read(): Promise<InterchainAccountConfig> {
    throw new Error('Method not implemented.');
  }

  public async update(
    _config: InterchainAccountConfig,
  ): Promise<EthersV5Transaction[]> {
    throw new Error('Method not implemented.');
  }

  /**
   * Creates a new EvmIcaModule instance by deploying an ICA with an ICA ISM.
   *
   * @param chain - The chain on which to deploy the ICA.
   * @param config - The configuration for the ICA.
   * @param multiProvider - The MultiProvider instance to use for deployment.
   * @returns {Promise<EvmIcaModule>} - A new EvmIcaModule instance.
   */
  public static async create({
    chain,
    config,
    multiProvider,
  }: {
    chain: ChainNameOrId;
    config: InterchainAccountConfig;
    multiProvider: MultiProvider;
  }): Promise<EvmIcaModule> {
    const interchainAccountDeployer = new InterchainAccountDeployer(
      multiProvider,
    );
    const deployedContracts = await interchainAccountDeployer.deployContracts(
      multiProvider.getChainName(chain),
      config,
    );

    return new EvmIcaModule(multiProvider, {
      addresses: deployedContracts,
      chain,
      config,
    });
  }
}