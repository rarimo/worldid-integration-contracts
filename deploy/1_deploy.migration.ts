import { Deployer, Reporter } from "@solarity/hardhat-migrate";

import { SemaphoreVerifier__factory, IdentityManager__factory } from "@ethers-v6";

import config from "@/deploy/config/config.json";

const GLOBAL_TREE_DEPTH = 30;

export = async (deployer: Deployer) => {
  const semaphoreVerifier = await deployer.deploy(SemaphoreVerifier__factory);
  const identityManager = await deployer.deploy(IdentityManager__factory);

  await identityManager.__IdentityManager_init(
    GLOBAL_TREE_DEPTH,
    await semaphoreVerifier.getAddress(),
    config.signer,
    config.sourceStateContract,
    config.chainName,
  );

  Reporter.reportContracts(
    ["SemaphoreVerifier", await semaphoreVerifier.getAddress()],
    ["IdentityManager", await identityManager.getAddress()],
  );
};
