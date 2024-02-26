// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@rarimo/evm-bridge-contracts/utils/Signers.sol";

import "./interfaces/IIdentityManager.sol";

/**
 * @title Rarimo identity manager contract that operates and accepts states from WorldID
 */
contract IdentityManager is IIdentityManager, Signers {
    uint256 public constant ROOT_EXPIRATION_TIME = 1 hours;

    address public sourceStateContract;

    uint256 internal _latestRoot;
    uint256 internal _latestTimestamp;

    mapping(uint256 => RootData) internal _roots;

    /**
     * @notice Init function
     * @param signer_ the Rarimo TSS signer
     * @param sourceStateContract_ the WorldID state contract address on mainnet
     * @param chainName_ the chain name the contract is being deployed to
     */
    function __IdentityManager_init(
        address signer_,
        address sourceStateContract_,
        string calldata chainName_
    ) external initializer {
        __Signers_init(signer_, chainName_);

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
    ) external override {
        RootData storage _prevRoot = _roots[prevRoot_];

        require(prevRoot_ != postRoot_, "IdentityManager: same prev and post roots");
        require(_prevRoot.replacedAt == 0, "IdentityManager: can't update already stored root");

        _checkMerkleSignature(_getSignHash(prevRoot_, postRoot_, replacedAt_), proof_);

        if (_prevRoot.replacedBy != 0) {
            _roots[postRoot_].replacedBy = _prevRoot.replacedBy;
        }

        if (replacedAt_ >= _latestTimestamp) {
            _roots[_latestRoot].replacedBy = postRoot_;

            _latestRoot = postRoot_;
            _latestTimestamp = replacedAt_;
        }

        _prevRoot.replacedAt = replacedAt_;
        _prevRoot.replacedBy = postRoot_;

        emit SignedRootTransited(prevRoot_, postRoot_, replacedAt_, _latestRoot);
    }

    /**
     * @notice The function to check whether the root is expired
     * @param root_ the root to check
     * @return true if root is expired
     */
    function isExpiredRoot(uint256 root_) public view override returns (bool) {
        if (!rootExists(root_)) {
            return true;
        }

        if (isLatestRoot(root_)) {
            return false;
        }

        return block.timestamp > _roots[root_].replacedAt + ROOT_EXPIRATION_TIME;
    }

    /**
     * @notice The function to check whether the root exists
     * @param root_ the root to check
     * @return true if root exists
     */
    function rootExists(uint256 root_) public view override returns (bool) {
        return _roots[root_].replacedAt != 0 || isLatestRoot(root_);
    }

    /**
     * @notice The function to check if the root is the latest root
     * @param root the root to check
     * @return true if the root is the latest root
     */
    function isLatestRoot(uint256 root) public view override returns (bool) {
        return _latestRoot == root;
    }

    /**
     * @notice The function to get the latest root
     * @return the latest root
     * @return the transition timestamp
     */
    function getLatestRoot() external view override returns (uint256, uint256) {
        return (_latestRoot, _latestTimestamp);
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
                isExpired: isExpiredRoot(root_)
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
