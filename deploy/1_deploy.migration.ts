import { Deployer, Reporter } from "@solarity/hardhat-migrate";

import { SemaphoreVerifier__factory, IdentityManager__factory, Verifier__factory } from "@ethers-v6";

import config from "@/deploy/config/config.json";

export = async (deployer: Deployer) => {
  const semaphoreVerifier = await deployer.deploy(SemaphoreVerifier__factory);
  const identityManager = await deployer.deploy(IdentityManager__factory);
  const verifier = await deployer.deploy(Verifier__factory);

  await identityManager.__IdentityManager_init(config.signer, config.sourceStateContract, config.chainName);
  await verifier.__Verifier_init(await semaphoreVerifier.getAddress(), await identityManager.getAddress());

  Reporter.reportContracts(
    ["SemaphoreVerifier", await semaphoreVerifier.getAddress()],
    ["IdentityManager", await identityManager.getAddress()],
    ["Verifier", await verifier.getAddress()],
  );
};
