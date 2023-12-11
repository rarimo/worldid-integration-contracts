// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./vendor/worldcoin/world-id-contracts/interfaces/ISemaphoreVerifier.sol";

import "./interfaces/IIdentityManager.sol";
import "./interfaces/IVerifier.sol";

contract Verifier is IVerifier, Initializable {
    address public semaphoreVerifier;
    address public identityManager;

    function __Verifier_init(
        address semaphoreVerifier_,
        address identityManager_
    ) external initializer {
        semaphoreVerifier = semaphoreVerifier_;
        identityManager = identityManager_;
    }

    function verifyProof(
        uint256 root_,
        uint256 signalHash_,
        uint256 nullifierHash_,
        uint256 externalNullifierHash_,
        uint256[8] calldata proof_
    ) public virtual override {
        require(
            !IIdentityManager(identityManager).isExpiredRoot(root_),
            "Verifier: root is expired"
        );

        _beforeProofValidation();

        ISemaphoreVerifier(semaphoreVerifier).verifyProof(
            proof_,
            [root_, nullifierHash_, signalHash_, externalNullifierHash_]
        );

        _afterProofValidation();
    }

    function _beforeProofValidation() internal virtual {}

    function _afterProofValidation() internal virtual {}
}
