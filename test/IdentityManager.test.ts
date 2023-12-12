import { expect } from "chai";
import { ethers } from "hardhat";
import { HDNodeWallet } from "ethers";
import { Reverter } from "@/test/helpers/reverter";
import { CHAIN_NAME } from "@/test/helpers/constants";
import { SignHelper } from "@/test/utils/signature";
import { MerkleTreeHelper } from "@/test/utils/merkletree";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { IdentityManager } from "@ethers-v6";
import {ZERO_ADDR} from "@/scripts/utils/constants";

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
      await expect(
          identityManager.__IdentityManager_init(ZERO_ADDR, ZERO_ADDR, "")
      ).to.be.revertedWithCustomError(identityManager, "InvalidInitialization")
    });
  });

  describe("#signedTransitRoot", () => {
    it("should commit root transition if all conditions are met", async () => {
      const { prevRoot, postRoot, replacedAt } = rootHistory[0];

      const leaf= merkleHelper.encodeLeaf(prevRoot, postRoot, replacedAt);
      const proof = merkleHelper.getProof(leaf);

      await identityManager.signedTransitRoot(prevRoot, postRoot, replacedAt, proof);
    });
  });
});
