// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.8.0;

/*@@@@@@@       @@@@@@@@@
 @@@@@@@@@       @@@@@@@@@
  @@@@@@@@@       @@@@@@@@@
   @@@@@@@@@       @@@@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@
     @@@@@  HYPERLANE  @@@@@@@
    @@@@@@@@@@@@@@@@@@@@@@@@@
   @@@@@@@@@       @@@@@@@@@
  @@@@@@@@@       @@@@@@@@@
 @@@@@@@@@       @@@@@@@@@
@@@@@@@@@       @@@@@@@@*/

// ============ Internal Imports ============
import {IArbitrumMessageHook} from "../interfaces/hooks/IArbitrumMessageHook.sol";
import {ArbitrumISM} from "../isms/native/ArbitrumISM.sol";
import {TypeCasts} from "../libs/TypeCasts.sol";

// ============ External Imports ============
import {IInbox} from "@arbitrum/nitro-contracts/src/bridge/IInbox.sol";
import {ArbGasInfo} from "@arbitrum/nitro-contracts/src/precompiles/ArbGasInfo.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ArbitrumMessageHook
 * @notice Message hook to inform the Arbitrum ISM of messages published through
 * the native Arbitrum bridge.
 */
contract ArbitrumMessageHook is IArbitrumMessageHook, Ownable {
    // ============ Constants ============

    // Domain of chain on which the arbitrum ISM is deployed
    uint32 public immutable destinationDomain;
    // Arbitrum ISM to verify messages
    ArbitrumISM public immutable ism;
    // Arbitrum's inbox used to send messages from L1 -> L2
    IInbox public immutable inbox;

    // ============ Public Storage ============

    // Gas limit for L2 execution (storage write)
    uint128 public constant GAS_LIMIT = 26_000;
    // Gas price for L2 - currently 0.1 gwei
    uint128 public maxGasPrice = 1e8;

    // ============ Constructor ============

    constructor(
        uint32 _destinationDomain,
        address _inbox,
        address _ism
    ) {
        require(
            _destinationDomain != 0,
            "ArbitrumHook: invalid destination domain"
        );
        destinationDomain = _destinationDomain;

        inbox = IInbox(_onlyContract(_inbox, "Inbox"));
        ism = ArbitrumISM(_onlyContract(_ism, "ISM"));
    }

    // ============ External Functions ============

    /**
     * @notice Hook to inform the Arbitrum ISM of messages published through.
     * @notice anyone can call this function, that's why we to send msg.sender
     * @param _destinationDomain The destination domain of the message.
     * @param _messageId The message ID.
     * @return gasOverhead The gas overhead for the function call on L2.
     */
    function postDispatch(uint32 _destinationDomain, bytes32 _messageId)
        external
        payable
        override
        returns (uint256)
    {
        require(
            _destinationDomain == destinationDomain,
            "ArbitrumHook: invalid destination domain"
        );

        bytes memory _payload = abi.encodeCall(
            ism.receiveFromHook,
            (msg.sender, _messageId)
        );

        // submission fee as rent to keep message in memory and
        // refunded to l2 address if auto-redeem is successful
        uint256 submissionFee = inbox.calculateRetryableSubmissionFee(
            _payload.length,
            0
        );

        // total gas cost = l1 submission fee + l2 execution cost
        uint256 totalGasCost = submissionFee + GAS_LIMIT * maxGasPrice;

        require(msg.value >= totalGasCost, "ArbitrumHook: insufficient funds");

        IInbox(inbox).createRetryableTicket{value: submissionFee}({
            to: address(ism),
            l2CallValue: 0, // no value is transferred to the L2 receiver
            maxSubmissionCost: submissionFee,
            excessFeeRefundAddress: msg.sender, // refund limit x price - execution cost
            callValueRefundAddress: msg.sender, // refund if timeout or cancelled
            gasLimit: 0, // paid by the relayer
            maxFeePerGas: 0, // paid by the relayer
            data: _payload
        });

        emit ArbitrumMessagePublished(msg.sender, _messageId, submissionFee);

        return submissionFee;
    }

    /**
     * @notice Sets the max gas price for L2 execution.
     * @param _maxGasPrice The new max gas price.
     */
    function setMaxGasPrice(uint128 _maxGasPrice) external onlyOwner {
        maxGasPrice = _maxGasPrice;
    }

    // ============ Internal Functions ============

    function _onlyContract(address _contract, string memory _type)
        internal
        view
        returns (address)
    {
        require(
            Address.isContract(_contract),
            string.concat("ArbitrumHook: invalid ", _type)
        );
        return _contract;
    }
}
