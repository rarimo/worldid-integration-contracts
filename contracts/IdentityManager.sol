// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@rarimo/evm-bridge-contracts/utils/Signers.sol";

import "./interfaces/IIdentityManager.sol";

contract IdentityManager is IIdentityManager, Signers {
    uint256 public constant ROOT_EXPIRATION_TIME = 1 hours;

    address public sourceStateContract;

    uint256 internal _latestRoot;
    uint256 internal _latestTimestamp;

    mapping(uint256 => RootData) internal _roots;

    function __IdentityManager_init(
        address signer_,
        address sourceStateContract_,
        string calldata chainName_
    ) external initializer {
        __Signers_init(signer_, chainName_);

        sourceStateContract = sourceStateContract_;
    }

    function signedTransitRoot(
        uint256 prevRoot_,
        uint256 postRoot_,
        uint256 replacedAt_,
        bytes calldata proof_
    ) external override {
        RootData storage _prevRoot = _roots[prevRoot_];

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

    function isExpiredRoot(uint256 root_) public view override returns (bool) {
        if (!rootExists(root_)) {
            return true;
        }

        if (isLatestRoot(root_)) {
            return false;
        }

        return block.timestamp > _roots[root_].replacedAt + ROOT_EXPIRATION_TIME;
    }

    function rootExists(uint256 root_) public view override returns (bool) {
        return _roots[root_].replacedAt != 0 || isLatestRoot(root_);
    }

    function isLatestRoot(uint256 root) public view override returns (bool) {
        return _latestRoot == root;
    }

    function getLatestRoot() external view override returns (uint256, uint256) {
        return (_latestRoot, _latestTimestamp);
    }

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
