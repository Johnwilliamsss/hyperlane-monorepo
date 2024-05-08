import {
  EV5GnosisSafeTxSubmitter,
  EV5ImpersonatedAccountTxSubmitter,
  EV5InterchainAccountTxTransformer,
  EV5JsonRpcTxSubmitter,
  MultiProvider,
  TxSubmitterBuilder,
  TxSubmitterInterface,
  TxSubmitterType,
  TxTransformerInterface,
  TxTransformerType,
} from '@hyperlane-xyz/sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';

import { forkNetworkToMultiProvider, verifyAnvil } from '../deploy/dry-run.js';

import {
  SubmitterBuilderSettings,
  SubmitterMetadata,
  TransformerMetadata,
} from './submitTypes.js';

export async function getSubmitterBuilder<TProtocol extends ProtocolType>({
  submitterMetadata,
  transformersMetadata,
  multiProvider,
}: SubmitterBuilderSettings): Promise<TxSubmitterBuilder<TProtocol>> {
  const submitter = await getSubmitter<TProtocol>(
    multiProvider,
    submitterMetadata,
  );
  const transformers = await getTransformers<TProtocol>(
    multiProvider,
    transformersMetadata,
  );

  return new TxSubmitterBuilder<TProtocol>(submitter, transformers);
}

async function getSubmitter<TProtocol extends ProtocolType>(
  multiProvider: MultiProvider,
  { type, chain, settings }: SubmitterMetadata,
): Promise<TxSubmitterInterface<TProtocol>> {
  switch (type) {
    case TxSubmitterType.JSON_RPC:
      return new EV5JsonRpcTxSubmitter(multiProvider, chain);
    case TxSubmitterType.IMPERSONATED_ACCOUNT:
      if (!settings?.userAddress)
        throw new Error(
          `Missing param 'userAddress': Cannot instantiate EV5ImpersonatedAccountTxSubmitter.`,
        );

      await verifyAnvil();
      await forkNetworkToMultiProvider(multiProvider, chain);

      return new EV5ImpersonatedAccountTxSubmitter(multiProvider, chain, {
        address: settings?.userAddress,
      });
    case TxSubmitterType.GNOSIS_SAFE:
      if (!settings?.safeAddress)
        throw new Error(
          `Missing param 'safeAddress': Cannot instantiate EV5GnosisSafeTxSubmitter.`,
        );
      return new EV5GnosisSafeTxSubmitter(multiProvider, chain, {
        safeAddress: settings?.safeAddress,
      });
    default:
      throw new Error(`Invalid TxSubmitterType: ${type}`);
  }
}

async function getTransformers<TProtocol extends ProtocolType>(
  multiProvider: MultiProvider,
  metadata: TransformerMetadata[],
): Promise<TxTransformerInterface<TProtocol>[]> {
  return Promise.all(
    metadata.map(({ type, chain, settings }) =>
      getTransformer<TProtocol>(multiProvider, { type, chain, settings }),
    ),
  );
}

async function getTransformer<TProtocol extends ProtocolType>(
  multiProvider: MultiProvider,
  { type, chain, settings }: TransformerMetadata,
): Promise<TxTransformerInterface<TProtocol>> {
  switch (type) {
    case TxTransformerType.ICA:
      if (!settings?.interchainAccount)
        throw new Error(
          `Missing param 'interchainAccount': Cannot instantiate EV5InterchainAccountTxTransformer.`,
        );
      if (!settings?.accountConfig)
        throw new Error(
          `Missing param 'accountConfig': Cannot instantiate EV5InterchainAccountTxTransformer.`,
        );
      return new EV5InterchainAccountTxTransformer(multiProvider, chain, {
        interchainAccount: settings.interchainAccount,
        accountConfig: settings.accountConfig,
        hookMetadata: settings.hookMetadata,
      });
    default:
      throw new Error(`Invalid TxTransformerType: ${type}`);
  }
}
