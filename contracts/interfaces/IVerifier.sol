// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IVerifier {
    function verifyProof(
        uint256 root_,
        uint256 signalHash_,
        uint256 nullifierHash_,
        uint256 externalNullifierHash_,
        uint256[8] calldata proof_
    ) external;
}
