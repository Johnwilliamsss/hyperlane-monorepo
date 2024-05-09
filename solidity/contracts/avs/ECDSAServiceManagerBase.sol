// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../interfaces/avs/vendored/ISignatureUtils.sol";
import "../interfaces/avs/vendored/IAVSDirectory.sol";
import "../interfaces/avs/vendored/IServiceManager.sol";
import "../interfaces/avs/vendored/IServiceManagerUI.sol";
import "../interfaces/avs/vendored/IDelegationManager.sol";
import "../interfaces/avs/vendored/IStrategy.sol";
import "../interfaces/avs/vendored/IPaymentCoordinator.sol";
import "../interfaces/avs/vendored/IECDSAStakeRegistryEventsAndErrors.sol";
import "./ECDSAStakeRegistry.sol";

abstract contract ECDSAServiceManagerBase is IServiceManager, OwnableUpgradeable {
    address public immutable stakeRegistry;
    address public immutable avsDirectory;
    address internal immutable delegationManager;
    address internal paymentCoordinator;

    event OperatorRegisteredToAVS(address indexed operator);
    event OperatorDeregisteredFromAVS(address indexed operator);

    modifier onlyStakeRegistry() {
        require(msg.sender == stakeRegistry, "ECDSAServiceManagerBase: caller is not the stakeRegistry");
        _;
    }

    function __ServiceManagerBase_init(address initialOwner) internal virtual initializer {
        __Ownable_init();
        transferOwnership(initialOwner);
    }

    function updateAVSMetadataURI(string memory _metadataURI) external virtual onlyOwner {
        _updateAVSMetadataURI(_metadataURI);
    }

    function payForRange(IPaymentCoordinator.RangePayment[] calldata rangePayments) external virtual onlyOwner {
        _payForRange(rangePayments);
    }

    function registerOperatorToAVS(address operator, ISignatureUtils.SignatureWithSaltAndExpiry memory operatorSignature) external virtual onlyStakeRegistry {
        _registerOperatorToAVS(operator, operatorSignature);
    }

    function deregisterOperatorFromAVS(address operator) external virtual onlyStakeRegistry {
        _deregisterOperatorFromAVS(operator);
    }

    function getRestakeableStrategies() external view virtual returns (address[] memory) {
        return _getRestakeableStrategies();
    }

    function getOperatorRestakedStrategies(address _operator) external view virtual returns (address[] memory) {
        return _getOperatorRestakedStrategies(_operator);
    }

    function setPaymentCoordinator(address _paymentCoordinator) external virtual onlyOwner {
        paymentCoordinator = _paymentCoordinator;
    }

    function _updateAVSMetadataURI(string memory _metadataURI) internal virtual {
        IAVSDirectory(avsDirectory).updateAVSMetadataURI(_metadataURI);
    }

    function _registerOperatorToAVS(address operator, ISignatureUtils.SignatureWithSaltAndExpiry memory operatorSignature) internal virtual {
        IAVSDirectory(avsDirectory).registerOperatorToAVS(operator, operatorSignature);
        emit OperatorRegisteredToAVS(operator);
    }

    function _deregisterOperatorFromAVS(address operator) internal virtual {
        IAVSDirectory(avsDirectory).deregisterOperatorFromAVS(operator);
        emit OperatorDeregisteredFromAVS(operator);
    }

    function _payForRange(IPaymentCoordinator.RangePayment[] calldata rangePayments) internal virtual {
        for (uint256 i = 0; i < rangePayments.length; ++i) {
            rangePayments[i].token.transferFrom(msg.sender, address(this), rangePayments[i].amount);
            rangePayments[i].token.approve(paymentCoordinator, rangePayments[i].amount);
        }

        IPaymentCoordinator(paymentCoordinator).payForRange(rangePayments);
    }

    function _getRestakeableStrategies() internal view virtual returns (address[] memory) {
        Quorum memory quorum = ECDSAStakeRegistry(stakeRegistry).quorum();
        address[] memory strategies = new address[](quorum.strategies.length);
        for (uint256 i = 0; i < quorum.strategies.length; i++) {
            strategies[i] = address(quorum.strategies[i].strategy);
        }
        return strategies;
    }

    function _getOperatorRestakedStrategies(address _operator) internal view virtual returns (address[] memory) {
        Quorum memory quorum = ECDSAStakeRegistry(stakeRegistry).quorum();
        IStrategy[] memory strategies = new IStrategy[](quorum.strategies.length);
        for (uint256 i = 0; i < quorum.strategies.length; i++) {
            strategies[i] = quorum.strategies[i].strategy;
        }
        uint256[] memory shares = IDelegationManager(delegationManager).getOperatorShares(_operator, strategies);

        address[] memory restakedStrategies = new address[](quorum.strategies.length);
        uint256 activeCount;
        for (uint256 i = 0; i < quorum.strategies.length; i++) {
            if (shares[i] > 0) {
                restakedStrategies[activeCount++] = address(quorum.strategies[i].strategy);
            }
        }

        assembly {
            mstore(restakedStrategies, activeCount)
        }

        return restakedStrategies;
    }

    uint256[50] private __gap;
}

