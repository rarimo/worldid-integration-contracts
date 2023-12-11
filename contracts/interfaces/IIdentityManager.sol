// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title IIdentityManager
 * @notice The `IdentityManager` contract is responsible for storing the Merkle root history.
 * The history is updated using timestamp signatures from the Rarimo validators network.
 */
interface IIdentityManager {
    /// @notice The struct that stores the data of the certain Merkle tree root
    /// @param replacedAt the timestamp when this root has been replaced
    /// @param replacedBy the root by which this root has been replaced
    struct RootData {
        uint256 replacedAt;
        uint256 replacedBy;
    }

    /// @notice The struct that stores detailed the data of the certain Merkle tree root returned by view methods
    /// @param replacedAt the timestamp when this root has been replaced
    /// @param replacedBy the root by which this root has been replaced
    /// @param isCurrent the boolean flag indicating whether the queried root is the latest one
    /// @param isExpired the boolean flag indicating whether the root is expired
    struct RootInfo {
        uint256 replacedBy;
        uint256 replacedAt;
        bool isLatest;
        bool isExpired;
    }

    /// @notice The event that is emitted when the Merkle root history is updated
    /// @param prevRoot the root that has been replaced
    /// @param postRoot the root by which `prevRoot` root has been replaced
    /// @param replacedAt the timestamp when the `prevRoot` has been replaced
    /// @param latestRoot the latest root in the current time
    event SignedRootTransited(
        uint256 prevRoot,
        uint256 postRoot,
        uint256 replacedAt,
        uint256 latestRoot
    );

    /// @notice The function that updates the Merkle root history
    /// @param prevRoot_ the root that has been replaced
    /// @param postRoot_ the root by which prevRoot root has been replaced
    /// @param replacedAt_ the timestamp when the prevRoot has been replaced
    /// @param proof_ the proof of entry of the relevant leaf into Merkle Tree together with signature from Rarimo validators
    function signedTransitRoot(
        uint256 prevRoot_,
        uint256 postRoot_,
        uint256 replacedAt_,
        bytes calldata proof_
    ) external;

    /// @notice The function that checks whether the root is expired
    /// @param root_ the root to be checked
    /// @return isExpired_ the boolean flag indicating whether the `root_` is expired
    function isExpiredRoot(uint256 root_) external view returns (bool isExpired_);

    /// @notice The function that checks whether the root exists
    /// @param root_ the root to be checked
    /// @return doesExist_ the boolean flag indicating whether the `root_` exists
    function rootExists(uint256 root_) external view returns (bool doesExist_);

    /// @notice The function that checks whether the root is the latest one
    /// @param root_ the root to be checked
    /// @return isLatest_ the boolean flag indicating whether the `root_` is the latest root
    function isLatestRoot(uint256 root_) external view returns (bool isLatest_);

    /// @notice The function that returns the information about the latest recorded root
    /// @return latestRoot_ the latest root
    /// @return latestTimestamp_ the timestamp when the `latestRoot_` replaced the previous root
    function getLatestRoot() external view returns (uint256 latestRoot_, uint256 latestTimestamp_);

    /// @notice The function that returns the information about any root
    /// @param root_ the root to be checked
    /// @return rootInfo_ the information about the `root_`
    function getRootInfo(uint256 root_) external view returns (RootInfo memory rootInfo_);
}
