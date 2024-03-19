import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumberish, HDNodeWallet } from "ethers";
import { Reverter } from "@/test/helpers/reverter";
import { CHAIN_NAME, ROOT_HISTORY_EXPIRY } from "@/test/helpers/constants";
import { SignHelper } from "@/test/utils/signature";
import { MerkleTreeHelper } from "@/test/utils/merkletree";
import { ZERO_ADDR } from "@/scripts/utils/constants";
import { time } from "@nomicfoundation/hardhat-network-helpers";

import { IdentityManager, IIdentityManager, SemaphoreVerifierMock } from "@ethers-v6";

describe("IdentityManager", () => {
  const reverter = new Reverter();

  let signHelper: SignHelper;
  let merkleHelper: MerkleTreeHelper;

  let SIGNER: HDNodeWallet;

  let identityManager: IdentityManager;

  let sourceStateContractAddress: string;
  let semaphoreVerifier: SemaphoreVerifierMock;

  let roots: Array<any>;
  let proofs: Array<string>;

  function compareRootInfo(
    rootInfo: IIdentityManager.RootInfoStructOutput,
    expectedRootInfo: IIdentityManager.RootInfoStruct,
  ) {
    expect(rootInfo.replacedBy).to.be.eq(expectedRootInfo.replacedBy);
    expect(rootInfo.replacedAt).to.be.eq(expectedRootInfo.replacedAt);
    expect(rootInfo.isLatest).to.be.eq(expectedRootInfo.isLatest);
    expect(rootInfo.isValid).to.be.eq(expectedRootInfo.isValid);
  }

  before(async () => {
    SIGNER = ethers.Wallet.createRandom();

    const IdentityManager = await ethers.getContractFactory("IdentityManager");
    const SemaphoreVerifierMock = await ethers.getContractFactory("SemaphoreVerifierMock");

    semaphoreVerifier = await SemaphoreVerifierMock.deploy();
    identityManager = await IdentityManager.deploy();

    sourceStateContractAddress = ethers.Wallet.createRandom().address;

    signHelper = new SignHelper(SIGNER);
    merkleHelper = new MerkleTreeHelper(signHelper, sourceStateContractAddress);

    await identityManager.__IdentityManager_init(
      30,
      await semaphoreVerifier.getAddress(),
      SIGNER.address,
      sourceStateContractAddress,
      CHAIN_NAME,
    );

    roots = [
      { prevRoot: 1, postRoot: 2, replacedAt: 100 },
      { prevRoot: 2, postRoot: 3, replacedAt: 200 },
      { prevRoot: 3, postRoot: 4, replacedAt: 300 },
      { prevRoot: 4, postRoot: 5, replacedAt: 400 },
      { prevRoot: 5, postRoot: 6, replacedAt: 500 },
    ];

    proofs = roots.map((transition) => {
      const { prevRoot, postRoot, replacedAt } = transition;

      const leaf = merkleHelper.encodeLeaf(prevRoot, postRoot, replacedAt);

      return merkleHelper.getProof(leaf);
    });

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  describe("#__IdentityManager_init", () => {
    it("should set correct data after creation", async () => {
      expect(await identityManager.getFunction("signer")()).to.be.eq(SIGNER.address);
      expect(await identityManager.sourceStateContract()).to.be.eq(sourceStateContractAddress);
      expect(await identityManager.chainName()).to.be.eq(CHAIN_NAME);
    });

    it("should not initialize twice", async () => {
      await expect(
        identityManager.__IdentityManager_init(0, ZERO_ADDR, ZERO_ADDR, ZERO_ADDR, ""),
      ).to.be.revertedWithCustomError(identityManager, "InvalidInitialization");
    });
  });

  describe("#setRootHistoryExpiry", () => {
    it("should call the function", async () => {
      expect(identityManager.setRootHistoryExpiry(1337)).to.not.be.rejected;
    });
  });

  describe("#signedTransitRoot", () => {
    it("should not commit root transition twice", async () => {
      await identityManager.signedTransitRoot(roots[0].prevRoot, roots[0].postRoot, roots[0].replacedAt, proofs[0]);

      await expect(
        identityManager.signedTransitRoot(roots[0].prevRoot, roots[0].postRoot, roots[0].replacedAt, proofs[0]),
      ).to.be.revertedWith("IdentityManager: can't update already stored root");
    });

    it("should not commit root transition where prev and post roots are the same", async () => {
      await expect(
        identityManager.signedTransitRoot(roots[0].prevRoot, roots[0].prevRoot, roots[0].replacedAt, proofs[0]),
      ).to.be.revertedWith("IdentityManager: same prev and post roots");
    });

    it("should not commit root transition if invalid signature", async () => {
      await expect(
        identityManager.signedTransitRoot(roots[0].prevRoot, roots[0].postRoot, roots[0].replacedAt, proofs[1]),
      ).to.be.revertedWith("Signers: invalid signature");
    });

    it("should commit root transition if all conditions are met", async () => {
      const tx = identityManager.signedTransitRoot(
        roots[0].prevRoot,
        roots[0].postRoot,
        roots[0].replacedAt,
        proofs[0],
      );

      await expect(tx)
        .to.emit(identityManager, "SignedRootTransited")
        .withArgs(roots[0].prevRoot, roots[0].postRoot, roots[0].replacedAt, roots[0].postRoot);

      expect(await identityManager.latestRoot()).to.be.eq(roots[0].postRoot);
    });

    it("should maintain root history and latest root properly while complex transitions", async () => {
      await identityManager.signedTransitRoot(roots[0].prevRoot, roots[0].postRoot, roots[0].replacedAt, proofs[0]);

      await identityManager.signedTransitRoot(roots[1].prevRoot, roots[1].postRoot, roots[1].replacedAt, proofs[1]);

      expect(await identityManager.latestRoot()).to.be.eq(roots[1].postRoot);

      await identityManager.signedTransitRoot(roots[4].prevRoot, roots[4].postRoot, roots[4].replacedAt, proofs[4]);

      expect(await identityManager.latestRoot()).to.be.eq(roots[4].postRoot);
      expect((await identityManager.getRootInfo(roots[1].postRoot)).replacedBy).to.be.eq(roots[4].postRoot);

      await identityManager.signedTransitRoot(roots[2].prevRoot, roots[2].postRoot, roots[2].replacedAt, proofs[2]);

      expect(await identityManager.latestRoot()).to.be.eq(roots[4].postRoot);
      expect((await identityManager.getRootInfo(roots[1].postRoot)).replacedBy).to.be.eq(roots[2].postRoot);
      expect((await identityManager.getRootInfo(roots[2].postRoot)).replacedBy).to.be.eq(roots[4].postRoot);
    });
  });

  context("if root is transited", () => {
    beforeEach(async () => {
      await identityManager.signedTransitRoot(roots[0].prevRoot, roots[0].postRoot, roots[0].replacedAt, proofs[0]);
      await identityManager.signedTransitRoot(roots[1].prevRoot, roots[1].postRoot, roots[1].replacedAt, proofs[1]);
    });

    describe("#rootExists", () => {
      it("should return true only if the root has been committed", async () => {
        expect(await identityManager.rootExists(0)).to.be.false;
        expect(await identityManager.rootExists(roots[0].prevRoot)).to.be.false;
        expect(await identityManager.rootExists(roots[0].postRoot)).to.be.true;
        expect(await identityManager.rootExists(roots[1].postRoot)).to.be.true;
        expect(await identityManager.rootExists(roots[2].postRoot)).to.be.false;
      });
    });

    describe("#isLatestRoot", () => {
      it("should return true only if the root is the latest one", async () => {
        expect(await identityManager.isLatestRoot(0)).to.be.false;
        expect(await identityManager.isLatestRoot(roots[0].postRoot)).to.be.false;
        expect(await identityManager.isLatestRoot(roots[1].postRoot)).to.be.true;
        expect(await identityManager.isLatestRoot(roots[2].postRoot)).to.be.false;
      });
    });

    describe("#isValidRoot", () => {
      it("should return false if the root doesn't exist", async () => {
        expect(await identityManager.isValidRoot(roots[2].postRoot)).to.be.false;
      });

      it("should return true if the root is the latest one", async () => {
        expect(await identityManager.isValidRoot(roots[1].postRoot)).to.be.true;
      });

      it("should return a time-based expiration flag if the root has been replaced", async () => {
        expect(await identityManager.isValidRoot(roots[0].postRoot)).to.be.true;

        await time.increaseTo(roots[0].replacedAt + ROOT_HISTORY_EXPIRY + 1);

        expect(await identityManager.isValidRoot(roots[0].postRoot)).to.be.false;
      });
    });

    describe("#getRootInfo", () => {
      it("should return root info properly", async () => {
        compareRootInfo(await identityManager.getRootInfo(roots[0].prevRoot), {
          replacedBy: roots[0].postRoot,
          replacedAt: roots[0].replacedAt,
          isLatest: false,
          isValid: false,
        });

        compareRootInfo(await identityManager.getRootInfo(roots[1].postRoot), {
          replacedBy: 0,
          replacedAt: 0,
          isLatest: true,
          isValid: true,
        });

        compareRootInfo(await identityManager.getRootInfo(0), {
          replacedBy: roots[0].postRoot,
          replacedAt: 0,
          isLatest: false,
          isValid: false,
        });
      });
    });
  });

  describe("#verifyProof", () => {
    async function verifyProof(root: BigNumberish) {
      await identityManager.verifyProof(root, 0, 0, 0, [0, 0, 0, 0, 0, 0, 0, 0]);
    }

    it("should not verify proof if the root is expired", async () => {
      await expect(verifyProof(0)).to.be.revertedWithCustomError(identityManager, "NoRootsSeen");

      await identityManager.signedTransitRoot(roots[0].prevRoot, roots[0].postRoot, roots[0].replacedAt, proofs[0]);

      await time.increaseTo(roots[0].replacedAt + ROOT_HISTORY_EXPIRY + 1);

      await expect(verifyProof(roots[0].prevRoot)).to.be.revertedWithCustomError(identityManager, "ExpiredRoot");
    });

    it("should delegate call to semaphore if the root is not expired", async () => {
      await identityManager.signedTransitRoot(roots[0].prevRoot, roots[0].postRoot, roots[0].replacedAt, proofs[0]);
      await identityManager.signedTransitRoot(roots[1].prevRoot, roots[1].postRoot, roots[1].replacedAt, proofs[1]);

      await expect(verifyProof(roots[0].postRoot)).to.not.be.reverted;
      await expect(verifyProof(roots[1].postRoot)).to.not.be.reverted;

      await semaphoreVerifier.toggleRevert();

      await expect(verifyProof(roots[0].postRoot)).to.be.revertedWithCustomError(semaphoreVerifier, "ProofInvalid");
      await expect(verifyProof(roots[1].postRoot)).to.be.revertedWithCustomError(semaphoreVerifier, "ProofInvalid");
    });
  });
});
