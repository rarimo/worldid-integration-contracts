import { ethers } from "hardhat";
import { BigNumberish } from "ethers";

import { MerkleTree } from "merkletreejs";
import { SignHelper } from "@/test/utils/signature";

export class MerkleTreeHelper {
  public tree: MerkleTree;

  constructor(
    public signHelper: SignHelper,
    public sourceStateContractAddress: string,
  ) {
    const leaves = Array.from({ length: 10 }, () => ethers.randomBytes(32));

    this.tree = new MerkleTree(
      leaves,
      (e: Buffer) => {
        const hash = ethers.solidityPackedKeccak256(["bytes"], [e]);

        return Buffer.from(hash.slice(2), "hex");
      },
      { sortPairs: true },
    );
  }

  public encodeLeaf(prevRoot: BigNumberish, postRoot: BigNumberish, replacedAt: BigNumberish) {
    return ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "uint256"],
      [this.sourceStateContractAddress, prevRoot, postRoot, replacedAt],
    );
  }

  public addLeaf(leaf: string) {
    this.tree.addLeaf(Buffer.from(leaf.slice(2), "hex"));
  }

  public getPath(leaf: string): Array<string> {
    return this.tree.getProof(leaf).map((el) => "0x" + el.data.toString("hex"));
  }

  public getProof(leaf: string, addLeaf: boolean = true): string {
    if (addLeaf) {
      this.addLeaf(leaf);
    }

    const root = this.getRoot();
    const path = this.getPath(leaf);

    const signature = this.signHelper.sign(root);

    return ethers.AbiCoder.defaultAbiCoder().encode(["bytes32[]", "bytes"], [path, signature]);
  }

  public getRoot(): string {
    return "0x" + this.tree.getRoot().toString("hex");
  }
}
