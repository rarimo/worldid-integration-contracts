# WorldID integration contracts

This repository manages the smart contracts that handle Rarimo <> WorldID integration.

## What

The repository consists of three smart contracts:

- `IdentityManager` that stores and updates the WorldID state roots via Rarimo TSS transition function and verifies user ZK proofs
- `SemaphoreVerifier` that actually verifies ZK proofs (forked from WorldID contracts)
- `WorldIDBridge` that sets the interface and integration flow for the `IdentityManager`

Together these smart contracts allow WorldID to become cross-chain leveraging Rarimo multichain technology.

## Usage

### Test

To run the tests, execute the following command:

```bash
npm run test
```

Or to see the coverage, run:

```bash
npm run coverage
```

### Deployment

Prior deployment create the `.env` file following the example provided in `.env.example`. Also check out the config files in the `deploy/config/` directory.

The config structure is the following:

```ts
export const signer = "0x0000000000000000000000000000000000000000";
export const sourceStateContract = "0x0000000000000000000000000000000000000000";
export const chainName = "DEPLOYMENT_CHAIN_NAME";
```

Where `signer` is the address of Rarimo TSS signer, `sourceStateContract` is the address of WorldID manager contract to listed to, and `chainName` is the name of the network (e.g. Ethereum, Sepolia, Mumbai) where the contracts are being deployed to.

> [!NOTE]
> The appropriate config file gets chosen automatically upon the deployment network.

After the configuration is provided, execute:

```bash
npm run deploy-<network>
```

Check the available options in the `package.json`.

### Local Deployment

To deploy the contracts locally, run the following commands (in the different terminals):

```bash
npm run private-network
npm run deploy-local
```

### Bindings

The command to generate the bindings is as follows:

```bash
npm run generate-types
```

## Disclaimer

GLHF!
