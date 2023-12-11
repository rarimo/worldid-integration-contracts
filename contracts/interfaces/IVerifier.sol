// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title IVerifier
 * @notice The `Verifier` contract is an adopted `WorldIDIdentityManagerImplV2` contract from WorldCoinID.
 * It's designed with the purpose of verifying ZK proofs while integrating with `SemaphoreVerifier`.
 */
interface IVerifier {
    /// @notice The function that validates the Merkle root and verifies ZKP
    /// @param root_ the root of the Merkle tree
    /// @param signalHash_ a keccak256 hash of the Semaphore signal
    /// @param nullifierHash_ the nullifier hash
    /// @param externalNullifierHash_ a keccak256 hash of the external nullifier
    /// @param proof_ the zero-knowledge proof
    function verifyProof(
        uint256 root_,
        uint256 signalHash_,
        uint256 nullifierHash_,
        uint256 externalNullifierHash_,
        uint256[8] calldata proof_
    ) external;
}
