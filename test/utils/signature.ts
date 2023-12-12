import { BytesLike, HDNodeWallet } from "ethers";

export class SignHelper {
  constructor(public signer: HDNodeWallet) {}

  public sign(hash: BytesLike) {
    return this.signer.signingKey.sign(hash).serialized;
  }
}
