// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Signers} from "@rarimo/evm-bridge-contracts/utils/Signers.sol";

import {WorldIDBridge} from "./vendor/worldcoin/world-id-state-bridge/WorldIDBridge.sol";

import {IIdentityManager} from "./interfaces/IIdentityManager.sol";

/**
 * @title Rarimo identity manager contract that operates and accepts states from WorldID
 */
contract IdentityManager is IIdentityManager, WorldIDBridge, Signers {
    address public sourceStateContract;

    uint256 internal _latestTimestamp;

    mapping(uint256 => RootData) internal _roots;

    /**
     *
     * @notice Init function
     * @param signer_ the Rarimo TSS signer
     * @param sourceStateContract_ the WorldID state contract address on mainnet
     * @param chainName_ the chain name the contract is being deployed to
     */
    function __IdentityManager_init(
        uint8 treeDepth_,
        address semaphoreVerifier_,
        address signer_,
        address sourceStateContract_,
        string calldata chainName_
    ) external initializer {
        __WorldIDBridge_init(treeDepth_, semaphoreVerifier_);
        __Signers_init(signer_, address(0), chainName_);

        sourceStateContract = sourceStateContract_;
    }

    /**
     * @notice The function to transit state with the new WorldID root
     * @param prevRoot_ the old Merkle root
     * @param postRoot_ the new Merkle root
     * @param replacedAt_ the timestamp new root has been issued at
     * @param proof_ the Rarimo Merkle proof of state transition
     */
    function signedTransitRoot(
        uint256 prevRoot_,
        uint256 postRoot_,
        uint256 replacedAt_,
        bytes calldata proof_
    ) external {
        RootData storage _prevRoot = _roots[prevRoot_];

        require(prevRoot_ != postRoot_, "IdentityManager: same prev and post roots");
        require(_prevRoot.replacedAt == 0, "IdentityManager: can't update already stored root");

        _checkMerkleSignature(_getSignHash(prevRoot_, postRoot_, replacedAt_), proof_);

        if (_prevRoot.replacedBy != 0) {
            _roots[postRoot_].replacedBy = _prevRoot.replacedBy;
        }

        if (replacedAt_ >= _latestTimestamp) {
            _roots[_latestRoot].replacedBy = postRoot_;

            _receiveRoot(postRoot_, replacedAt_);
            _latestTimestamp = replacedAt_;
        }

        _prevRoot.replacedAt = replacedAt_;
        _prevRoot.replacedBy = postRoot_;

        emit SignedRootTransited(prevRoot_, postRoot_, replacedAt_, _latestRoot);
    }

    /**
     * @notice The function to update the root expiry time
     * @param expiryTime_ new history root expiry time
     */
    function setRootHistoryExpiry(uint256 expiryTime_) public override {}

    /**
     * @notice The function to check whether the root exists
     * @param root_ the root to check
     * @return true if root exists
     */
    function rootExists(uint256 root_) public view override returns (bool) {
        return rootHistory[root_] != 0;
    }

    /**
     * @notice The function to check if the root is the latest root
     * @param root the root to check
     * @return true if the root is the latest root
     */
    function isLatestRoot(uint256 root) public view override returns (bool) {
        return latestRoot() == root;
    }

    /**
     * @notice The function to get the info about the root
     * @param root_ the root to check
     * @return the info about the root
     */
    function getRootInfo(uint256 root_) external view override returns (RootInfo memory) {
        RootData storage _root = _roots[root_];

        return
            RootInfo({
                replacedBy: _root.replacedBy,
                replacedAt: _root.replacedAt,
                isLatest: isLatestRoot(root_),
                isValid: isValidRoot(root_)
            });
    }

    function _getSignHash(
        uint256 prevRoot_,
        uint256 postRoot_,
        uint256 replacedAt_
    ) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(sourceStateContract, prevRoot_, postRoot_, replacedAt_));
    }
}
