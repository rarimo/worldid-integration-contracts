import hre from "hardhat";

export async function getConfig() {
  if (hre.network.name == "localhost" || hre.network.name == "hardhat") {
    return await import("./testnets/localhost");
  }

  if (hre.network.name == "fuji") {
    return await import("./testnets/fuji");
  }

  if (hre.network.name == "sepolia") {
    return await import("./testnets/sepolia");
  }

  if (hre.network.name == "avalanche") {
    return await import("./mainnets/avalanche");
  }

  throw new Error(`Config for network ${hre.network.name} is not specified`);
}
