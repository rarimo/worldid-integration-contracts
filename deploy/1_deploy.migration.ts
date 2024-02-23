import { Deployer, Reporter } from "@solarity/hardhat-migrate";

import { SemaphoreVerifier__factory, IdentityManager__factory, Verifier__factory } from "@ethers-v6";

import config from "@/deploy/config/config.json";

export = async (deployer: Deployer) => {
  const semaphoreVerifier = await deployer.deploy(SemaphoreVerifier__factory);
  const identityManager = await deployer.deploy(IdentityManager__factory);
  const verifier = await deployer.deploy(Verifier__factory);

  await identityManager.__IdentityManager_init(config.signer, config.sourceStateContract, config.chainName);
  await verifier.__Verifier_init(await semaphoreVerifier.getAddress(), await identityManager.getAddress());

  await identityManager.addOwners([
    "0xF65F3f18D9087c4E35BAC5b9746492082e186872",
    "0x8fe0D4923f61ff466430F63471E27B89A7Cf0C92",
    "0x53638975BC11de3029E46DF193d64879EAeA94eB",
  ]);

  Reporter.reportContracts(
    ["SemaphoreVerifier", await semaphoreVerifier.getAddress()],
    ["IdentityManager", await identityManager.getAddress()],
    ["Verifier", await verifier.getAddress()],
  );
};
