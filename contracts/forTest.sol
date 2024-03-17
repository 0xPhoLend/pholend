// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;

import "@aave/protocol-v2/contracts/mocks/tokens/MintableERC20.sol";
import "@aave/protocol-v2/contracts/mocks/oracle/PriceOracle.sol";
import "@aave/protocol-v2/contracts/mocks/oracle/CLAggregators/MockAggregator.sol";
import "@aave/protocol-v2/contracts/mocks/tokens/WETH9Mocked.sol";
import "@aave/protocol-v2/contracts/mocks/tokens/MintableDelegationERC20.sol";
import "@aave/protocol-v2/contracts/mocks/flashloan/MockFlashLoanReceiver.sol";
import "@aave/protocol-v2/contracts/mocks/attacks/SefldestructTransfer.sol";
import "@aave/protocol-v2/contracts/mocks/upgradeability/MockAToken.sol";
import "@aave/protocol-v2/contracts/mocks/upgradeability/MockStableDebtToken.sol";
import "@aave/protocol-v2/contracts/mocks/upgradeability/MockVariableDebtToken.sol";
