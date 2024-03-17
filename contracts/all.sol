// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;

import "@aave/protocol-v2/contracts/protocol/configuration/LendingPoolAddressesProviderRegistry.sol";
import "@aave/protocol-v2/contracts/protocol/configuration/LendingPoolAddressesProvider.sol";

import "@aave/protocol-v2/contracts/protocol/lendingpool/LendingPool.sol";
import "@aave/protocol-v2/contracts/protocol/lendingpool/LendingPoolConfigurator.sol";
import "@aave/protocol-v2/contracts/protocol/lendingpool/DefaultReserveInterestRateStrategy.sol";
import "@aave/protocol-v2/contracts/protocol/lendingpool/LendingPoolCollateralManager.sol";

import "@aave/protocol-v2/contracts/protocol/tokenization/AToken.sol";
import "@aave/protocol-v2/contracts/protocol/tokenization/DelegationAwareAToken.sol";
import "@aave/protocol-v2/contracts/protocol/tokenization/StableDebtToken.sol";
import "@aave/protocol-v2/contracts/protocol/tokenization/VariableDebtToken.sol";

import "@aave/protocol-v2/contracts/deployments/ATokensAndRatesHelper.sol";
import "@aave/protocol-v2/contracts/deployments/StableAndVariableTokensHelper.sol";

import "@aave/protocol-v2/contracts/misc/AaveOracle.sol";
import "@aave/protocol-v2/contracts/misc/WalletBalanceProvider.sol";
import "@aave/protocol-v2/contracts/misc/AaveProtocolDataProvider.sol";
import "@aave/protocol-v2/contracts/misc/WETHGateway.sol";

import "@aave/protocol-v2/contracts/dependencies/openzeppelin/upgradeability/InitializableAdminUpgradeabilityProxy.sol";
import "@aave/protocol-v2/contracts/protocol/libraries/aave-upgradeability/InitializableImmutableAdminUpgradeabilityProxy.sol";
import "@aave/protocol-v2/contracts/mocks/oracle/LendingRateOracle.sol";

import "@aave/protocol-v2/contracts/protocol/libraries/logic/ValidationLogic.sol";
import "@aave/protocol-v2/contracts/protocol/libraries/logic/GenericLogic.sol";
