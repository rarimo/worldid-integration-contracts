import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumberish, HDNodeWallet } from "ethers";
import { Reverter } from "@/test/helpers/reverter";
import { CHAIN_NAME, ROOT_EXPIRATION_TIME } from "@/test/helpers/constants";
import { SignHelper } from "@/test/utils/signature";
import { MerkleTreeHelper } from "@/test/utils/merkletree";
import { IdentityManager, SemaphoreVerifierMock, Verifier } from "@ethers-v6";
import { ZERO_ADDR } from "@/scripts/utils/constants";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Verifier", () => {
  const reverter = new Reverter();

  let signHelper: SignHelper;
  let merkleHelper: MerkleTreeHelper;

  let SIGNER: HDNodeWallet;

  let semaphoreVerifier: SemaphoreVerifierMock;
  let identityManager: IdentityManager;
  let verifier: Verifier;

  let sourceStateContractAddress: string;

  let roots: Array<any>;
  let proofs: Array<string>;

  before(async () => {
    SIGNER = ethers.Wallet.createRandom();

    const SemaphoreVerifierMock = await ethers.getContractFactory("SemaphoreVerifierMock");
    const IdentityManager = await ethers.getContractFactory("IdentityManager");
    const Verifier = await ethers.getContractFactory("Verifier");

    semaphoreVerifier = await SemaphoreVerifierMock.deploy();
    identityManager = await IdentityManager.deploy();
    verifier = await Verifier.deploy();

    sourceStateContractAddress = ethers.Wallet.createRandom().address;

    signHelper = new SignHelper(SIGNER);
    merkleHelper = new MerkleTreeHelper(signHelper, sourceStateContractAddress);

    await identityManager.__IdentityManager_init(SIGNER.address, sourceStateContractAddress, CHAIN_NAME);
    await verifier.__Verifier_init(await semaphoreVerifier.getAddress(), await identityManager.getAddress());

    roots = [
      { prevRoot: 1, postRoot: 2, replacedAt: 100 },
      { prevRoot: 2, postRoot: 3, replacedAt: 200 },
    ];

    proofs = roots.map((transition) => {
      const { prevRoot, postRoot, replacedAt } = transition;

      const leaf = merkleHelper.encodeLeaf(prevRoot, postRoot, replacedAt);

      return merkleHelper.getProof(leaf);
    });

    await identityManager.signedTransitRoot(roots[0].prevRoot, roots[0].postRoot, roots[0].replacedAt, proofs[0]);
    await identityManager.signedTransitRoot(roots[1].prevRoot, roots[1].postRoot, roots[1].replacedAt, proofs[1]);

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  describe("#__Verifier_init", () => {
    it("should set correct data after creation", async () => {
      expect(await verifier.semaphoreVerifier()).to.be.eq(await semaphoreVerifier.getAddress());
      expect(await verifier.identityManager()).to.be.eq(await identityManager.getAddress());
    });

    it("should not initialize twice", async () => {
      await expect(verifier.__Verifier_init(ZERO_ADDR, ZERO_ADDR)).to.be.revertedWithCustomError(
        identityManager,
        "InvalidInitialization",
      );
    });
  });

  describe("#verifyProof", () => {
    async function verifyProof(root: BigNumberish) {
      await verifier.verifyProof(root, 0, 0, 0, [0, 0, 0, 0, 0, 0, 0, 0]);
    }

    it("should not verify proof if the root is expired", async () => {
      await expect(verifyProof(0)).to.be.revertedWith("Verifier: root is expired");

      await time.increaseTo(roots[0].replacedAt + ROOT_EXPIRATION_TIME + 1);

      await expect(verifyProof(roots[0].prevRoot)).to.be.revertedWith("Verifier: root is expired");
    });

    it("should delegate call to semaphore if the root is not expired", async () => {
      await expect(verifyProof(roots[0].prevRoot)).to.not.be.reverted;
      await expect(verifyProof(roots[1].postRoot)).to.not.be.reverted;

      await semaphoreVerifier.toggleRevert();

      await expect(verifyProof(roots[0].prevRoot)).to.be.revertedWithCustomError(semaphoreVerifier, "ProofInvalid");
      await expect(verifyProof(roots[1].postRoot)).to.be.revertedWithCustomError(semaphoreVerifier, "ProofInvalid");
    });
  });
});
