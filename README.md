## Roles 

| Role | Description |
| ------ | ------ |
| Pool Admin | manage settings of pool |
| Pool Admin | set pool pause |
| Internal Roles | for example, some functions of lendingPool can be called only by lendingPoolConfigurator |
| Owners of contracts* | manage helpers contracts* |

*Contracts:
- stableAndVariableTokensHelper
- aTokensAndRatesHelper
- lendingRateOracle
- addressesProvider
- addressesProviderRegistry
- incentivesController
- reserveTreasury
- wETHGateway
- aaveOracle - for set functions
 
## Instructions
### Write Methods
#### **LendingPool.deposit()**

`function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)`

>When depositing, the LendingPool contract must have allowance() to spend funds on behalf of msg.sender for at-least amount for the 
asset
 being deposited. This can be done via the standard ERC20 approve() method.

| Parameter | Type | Description |
| ------ | ------ | ------ |
| asset | address | address of the underlying asset |
| amount | uint256 | amount deposited, expressed in wei units |
| onBehalfOf | address | address whom will receive the aTokens. Use msg.sender when the aTokens should be sent to the caller. |
| referralCode | uint16 | referral code for our referral program. **Use 0 for no referral**. |

#### **LendingPool.withdraw()**
`function withdraw(address asset, uint256 amount, address to)`

Withdraws amount of the underlying asset, i.e. redeems the underlying token and burns the aTokens.

| Parameter Name | Type | Description | 
| ------ | ------ | ------ |
| asset | address | address of the underlying asset, not the aToken
amount | uint256 | amount deposited, expressed in wei units.Use type(uint).max to withdraw the entire balance. |
| to | address | address that will receive the asset |

#### **LendingPool.borrow()**
`function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)`

Borrows amount of asset with interestRateMode, sending the amount to msg.sender, with the debt being incurred by onBehalfOf.

| Parameter Name |	Type |	Description |
| ------ | ------ | ------ |
| asset | address | address of the underlying asset |
| amount | uint256 |amount to be borrowed, expressed in wei units |
| interestRateMode | uint256 |the type of borrow debt. Stable: 1, Variable: 2 |
| referralCode | uint16 | referral code for our referral program. Use 0 for no referral code. |
| onBehalfOf | address | address of user who will incur the debt. Use msg.sender when not calling on behalf of a different user. |

#### **LendingPool.repay()**
`function repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf)`

Repays onBehalfOf's debt amount of asset which has a rateMode.

| Parameter Name |	Type |	Description |
| ------ | ------ | ------ |
| asset | address | address of the underlying asset |
| amount | uint256 | amount to be borrowed, expressed in wei units. Use uint(-1) to repay the entire debt. |
| rateMode | uint256 | the type of borrow debt. Stable: 1 Variable: 2 |
| onBehalfOf | address | address of user who will incur the debt. Use msg.sender when not calling on behalf of a different user. |

#### **LendingPool.swapBorrowRateMode()**
`function swapBorrowRateMode(address asset, uint256 rateMode)`

Swaps the msg.sender's borrow rate modes between stable and variable.

| Parameter Name |	Type |	Description |
| ------ | ------ | ------ |
| asset | address | address of the underlying asset |
| rateMode | uint256 | the rate mode the user is swapping to. Stable: 1, Variable: 2 |

#### **LendingPool.setUserUseReserveAsCollateral()**
`function setUserUseReserveAsCollateral(address asset, bool useAsCollateral)`

Sets the asset of msg.sender to be used as collateral or not.

| Parameter Name |	Type |	Description |
| ------ | ------ | ------ |
| asset | address | address of the underlying asset |
| useAsCollateral | bool | true if the asset should be used as collateral |

### View Methods

#### **LendingPool.getUserAccountData()**
`function getUserAccountData(address user)`

Returns the user account data across all the reserves

| Parameter Name | Type | Description |
| ------ | ------ | ------ |
| user | address | address of the user |

Return values:
| Parameter Name | Type | Description |
| ------ | ------ | ------ |
| totalCollateralETH | uint256 | total collateral in ETH of the use (wei decimal unit) |
| totalDebtETH | uint256 | total debt in ETH of the user (wei decimal unit) |
| availableBorrowsETH | uint256 | borrowing power left of the user (wei decimal unit) |
| currentLiquidationThreshold | uint256 | liquidation threshold of the user - weighted average of liquidation threshold of collateral reserves (1e4 format => percentage plus two decimals) |
| ltv | uint256 | maximum Loan To Value of the user - weighted average of max ltv of collateral reserves (1e4 format => percentage plus two decimals) |
| healthFactor | uint256 | current health factor of the user. |
