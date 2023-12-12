// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract SemaphoreVerifierMock {
    error ProofInvalid();

    bool public shouldRevert;

    function toggleRevert() external {
        shouldRevert = !shouldRevert;
    }

    function verifyProof(uint256[8] calldata, uint256[4] calldata) external view {
        if (shouldRevert) {
            revert ProofInvalid();
        }
    }
}
