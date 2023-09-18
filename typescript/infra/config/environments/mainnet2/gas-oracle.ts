import { BigNumber, ethers } from 'ethers';

import { ChainMap, ChainName } from '@hyperlane-xyz/sdk';
import { convertDecimalsEthersBigNumber } from '@hyperlane-xyz/utils';

import {
  AllStorageGasOracleConfigs,
  getAllStorageGasOracleConfigs,
} from '../../../src/config';
import { TOKEN_EXCHANGE_RATE_DECIMALS } from '../../../src/config/gas-oracle';
import { mustGetChainNativeTokenDecimals } from '../../../src/utils/utils';

import { supportedChainNames } from './chains';

// Overcharge by 30% to account for market making risk
const TOKEN_EXCHANGE_RATE_MULTIPLIER = ethers.utils.parseUnits(
  '1.30',
  TOKEN_EXCHANGE_RATE_DECIMALS,
);

// Taken by looking at each network's gas history and overestimating
// Last updated Mar 9, 2023.
const gasPrices: ChainMap<BigNumber> = {
  // https://bscscan.com/chart/gasprice
  bsc: ethers.utils.parseUnits('7', 'gwei'),
  // https://snowtrace.io/chart/gasprice
  avalanche: ethers.utils.parseUnits('35', 'gwei'),
  // https://polygonscan.com/chart/gasprice
  polygon: ethers.utils.parseUnits('200', 'gwei'),
  // https://celoscan.io/chart/gasprice
  // This one is interesting - the average is high (~20 gwei)
  // but the median is low (< 10). This is likely because a popular wallet is
  // overpaying, but all our txs tend to be < 10 gwei.
  celo: ethers.utils.parseUnits('10', 'gwei'),
  // https://dune.com/Henrystats/arbitrum-metrics
  // A bit higher to try to account for L1 fees
  arbitrum: ethers.utils.parseUnits('1', 'gwei'),
  // https://dune.com/optimismfnd/optimism-l1-batch-submission-fees-security-costs
  // A bit higher to try to account for L1 fees
  optimism: ethers.utils.parseUnits('1', 'gwei'),
  // https://dune.com/hildobby/Gas
  ethereum: ethers.utils.parseUnits('35', 'gwei'),
  // https://moonscan.io/chart/gasprice
  // Similar to Celo - average is ~200 gwei, but people
  // generally are overpaying compared to us
  moonbeam: ethers.utils.parseUnits('150', 'gwei'),
  // https://gnosisscan.io/chart/gasprice
  // People also seem to be overpaying here
  gnosis: ethers.utils.parseUnits('2', 'gwei'),
  // Arbitrarily chosen as gas prices aren't really a thing
  // in Solana.
  solana: ethers.BigNumber.from('28'),
};

// Accurate from coingecko as of Mar 9, 2023.
// These aren't overestimates because the exchange rates between
// tokens are what matters. These generally have high beta
const tokenUsdPrices: ChainMap<BigNumber> = {
  // https://www.coingecko.com/en/coins/bnb
  bsc: ethers.utils.parseUnits('211.55', TOKEN_EXCHANGE_RATE_DECIMALS),
  // https://www.coingecko.com/en/coins/avalanche
  avalanche: ethers.utils.parseUnits('9.25', TOKEN_EXCHANGE_RATE_DECIMALS),
  // https://www.coingecko.com/en/coins/polygon
  polygon: ethers.utils.parseUnits('0.518', TOKEN_EXCHANGE_RATE_DECIMALS),
  // https://www.coingecko.com/en/coins/celo
  celo: ethers.utils.parseUnits('0.42', TOKEN_EXCHANGE_RATE_DECIMALS),
  // https://www.coingecko.com/en/coins/ethereum
  arbitrum: ethers.utils.parseUnits('1619.00', TOKEN_EXCHANGE_RATE_DECIMALS),
  // https://www.coingecko.com/en/coins/ethereum
  optimism: ethers.utils.parseUnits('1619.00', TOKEN_EXCHANGE_RATE_DECIMALS),
  // https://www.coingecko.com/en/coins/ethereum
  ethereum: ethers.utils.parseUnits('1619.00', TOKEN_EXCHANGE_RATE_DECIMALS),
  // https://www.coingecko.com/en/coins/moonbeam
  moonbeam: ethers.utils.parseUnits('0.166', TOKEN_EXCHANGE_RATE_DECIMALS),
  // xDAI
  gnosis: ethers.utils.parseUnits('1.00', TOKEN_EXCHANGE_RATE_DECIMALS),
  // https://www.coingecko.com/en/coins/solana
  solana: ethers.utils.parseUnits('18.85', TOKEN_EXCHANGE_RATE_DECIMALS),
};

// Gets the exchange rate of the remote quoted in local tokens
function getTokenExchangeRate(local: ChainName, remote: ChainName): BigNumber {
  const localValue = tokenUsdPrices[local];
  const remoteValue = tokenUsdPrices[remote];

  // Apply multiplier to overcharge

  // This does not account for decimals.
  const exchangeRate = remoteValue
    .mul(TOKEN_EXCHANGE_RATE_MULTIPLIER)
    .div(localValue);

  return convertDecimalsEthersBigNumber(
    mustGetChainNativeTokenDecimals(remote),
    mustGetChainNativeTokenDecimals(local),
    exchangeRate,
  );
}

export const storageGasOracleConfig: AllStorageGasOracleConfigs =
  getAllStorageGasOracleConfigs(
    supportedChainNames,
    gasPrices,
    getTokenExchangeRate,
  );
