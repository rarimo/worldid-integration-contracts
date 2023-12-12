import { expect } from "chai";
import { ethers } from "hardhat";
import { HDNodeWallet } from "ethers";
import { Reverter } from "@/test/helpers/reverter";
import { CHAIN_NAME } from "@/test/helpers/constants";
import { SignHelper } from "@/test/utils/signature";
import { MerkleTreeHelper } from "@/test/utils/merkletree";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { IdentityManager } from "@ethers-v6";
import { ZERO_ADDR } from "@/scripts/utils/constants";

describe("IdentityManager", () => {
  const reverter = new Reverter();

  let signHelper: SignHelper;
  let merkleHelper: MerkleTreeHelper;

  let OWNER: HardhatEthersSigner;
  let SIGNER: HDNodeWallet;

  let identityManager: IdentityManager;

  let sourceStateContractAddress: string;

  const rootHistory = [
    { prevRoot: 1, postRoot: 1, replacedAt: 100 },
    { prevRoot: 2, postRoot: 3, replacedAt: 200 },
    { prevRoot: 3, postRoot: 4, replacedAt: 300 },
    { prevRoot: 4, postRoot: 5, replacedAt: 400 },
    { prevRoot: 5, postRoot: 6, replacedAt: 500 },
  ];

  before(async () => {
    [OWNER] = await ethers.getSigners();
    SIGNER = ethers.Wallet.createRandom();

    const IdentityManager = await ethers.getContractFactory("IdentityManager");

    identityManager = await IdentityManager.deploy();

    sourceStateContractAddress = ethers.Wallet.createRandom().address;

    signHelper = new SignHelper(SIGNER);
    merkleHelper = new MerkleTreeHelper(signHelper, sourceStateContractAddress);

    await identityManager.__IdentityManager_init(SIGNER.address, sourceStateContractAddress, CHAIN_NAME);

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
      await expect(identityManager.__IdentityManager_init(ZERO_ADDR, ZERO_ADDR, "")).to.be.revertedWithCustomError(
        identityManager,
        "InvalidInitialization",
      );
    });
  });

  describe.only("#signedTransitRoot", () => {
    it("should not commit root transition twice", async () => {
      const { prevRoot, postRoot, replacedAt } = rootHistory[0];

      const leaf = merkleHelper.encodeLeaf(prevRoot, postRoot, replacedAt);
      const proof = merkleHelper.getProof(leaf);

      await identityManager.signedTransitRoot(prevRoot, postRoot, replacedAt, proof);

      await expect(identityManager.signedTransitRoot(prevRoot, postRoot, replacedAt, proof)).to.be.revertedWith(
        "IdentityManager: can't update already stored root",
      );
    });

    it("should not commit root transition if invalid signature", async () => {
      const { prevRoot, postRoot, replacedAt } = rootHistory[0];

      const leaf = merkleHelper.encodeLeaf(prevRoot, postRoot, replacedAt + 1);
      const proof = merkleHelper.getProof(leaf);

      await expect(identityManager.signedTransitRoot(prevRoot, postRoot, replacedAt, proof)).to.be.revertedWith(
        "Signers: invalid signature",
      );
    });

    it("should commit root transition if all conditions are met", async () => {
      const { prevRoot, postRoot, replacedAt } = rootHistory[0];

      const leaf = merkleHelper.encodeLeaf(prevRoot, postRoot, replacedAt);
      const proof = merkleHelper.getProof(leaf);

      await identityManager.signedTransitRoot(prevRoot, postRoot, replacedAt, proof);

      expect(await identityManager.getLatestRoot()).to.be.deep.eq([postRoot, replacedAt]);
    });

    it("should maintain root history and latest root properly while complex transitions", async () => {
      const proofs = rootHistory.map((transition) => {
        const { prevRoot, postRoot, replacedAt } = transition;

        const leaf = merkleHelper.encodeLeaf(prevRoot, postRoot, replacedAt);

        return merkleHelper.getProof(leaf);
      });

      await identityManager.signedTransitRoot(
        rootHistory[0].prevRoot,
        rootHistory[0].postRoot,
        rootHistory[0].replacedAt,
        proofs[0],
      );

      await identityManager.signedTransitRoot(
        rootHistory[1].prevRoot,
        rootHistory[1].postRoot,
        rootHistory[1].replacedAt,
        proofs[1],
      );

      expect(await identityManager.getLatestRoot()).to.be.deep.eq([rootHistory[1].postRoot, rootHistory[1].replacedAt]);

      await identityManager.signedTransitRoot(
        rootHistory[4].prevRoot,
        rootHistory[4].postRoot,
        rootHistory[4].replacedAt,
        proofs[4],
      );

      expect(await identityManager.getLatestRoot()).to.be.deep.eq([rootHistory[4].postRoot, rootHistory[4].replacedAt]);
      expect((await identityManager.getRootInfo(rootHistory[1].postRoot)).replacedBy).to.be.eq(rootHistory[4].postRoot);

      await identityManager.signedTransitRoot(
        rootHistory[2].prevRoot,
        rootHistory[2].postRoot,
        rootHistory[2].replacedAt,
        proofs[2],
      );

      expect(await identityManager.getLatestRoot()).to.be.deep.eq([rootHistory[4].postRoot, rootHistory[4].replacedAt]);
      expect((await identityManager.getRootInfo(rootHistory[1].postRoot)).replacedBy).to.be.eq(rootHistory[2].postRoot);
      expect((await identityManager.getRootInfo(rootHistory[2].postRoot)).replacedBy).to.be.eq(rootHistory[4].postRoot);
    });
  });
});
