# WordlID integration contracts

This repository manages the smart contracts that handle Rarimo <> WorldID integration.

## What

The repository consists of three smart contracts:

- `IdentityManager` that stores and updates the WorldID state roots via Rarimo TSS transition function
- `Verifier` that verifies user ZK proofs and checks the validity of the root the proof is generated against
- `SemaphoreVerifier` that actually verifies ZK proofs (forked from WorldID contracts)

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

Prior deployment create the `.env` file following the example provided in `.env.example` file. Also check out the required config in the `deploy/config/config.json` file.

The config structure is the following:

```json
{
  "signer": "0x0000000000000000000000000000000000000000",
  "sourceStateContract": "0x0000000000000000000000000000000000000000",
  "chainName": "CHAIN_NAME"
}
```

Where `signer` is the Rarimo TSS signer, `sourceStateContract` is the address of WorldID manager contract to listed to, and `chainName` is the name of the network (e.g. Ethereum, Sepolia, Mumbai) where the contract is being deployed to.

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
