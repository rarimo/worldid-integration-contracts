// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IIdentityManager {
    struct RootData {
        uint256 replacedAt;
        uint256 replacedBy;
    }

    struct RootInfo {
        uint256 replacedBy;
        uint256 replacedAt;
        bool isCurrent;
        bool isExpired;
    }

    event SignedRootTransited(
        uint256 prevRoot,
        uint256 postRoot,
        uint256 replacedAt,
        uint256 currentRoot
    );

    function signedTransitRoot(
        uint256 prevRoot_,
        uint256 postRoot_,
        uint256 replacedAt_,
        bytes calldata proof_
    ) external;

    function isExpiredRoot(uint256 root) external view returns (bool isExpired_);

    function rootExists(uint256 root) external view returns (bool doesExist_);

    function isCurrentRoot(uint256 root) external view returns (bool isCurrent_);

    function getLatestRoot() external view returns (uint256 latestRoot_, uint256 latestTimestamp_);

    function getRootInfo(uint256 root) external view returns (RootInfo memory rootInfo_);
}
