# VaultToken Project

This project demonstrates the implementation of a custom ERC20 token (`VaultToken`) and a `Vault` contract that interacts with it. The `VaultToken` contract allows minting new tokens, while the `Vault` contract manages token deposits with an entry fee.

## Table of Contents

1. [Overview](#overview)
2. [Smart Contracts](#smart-contracts)
3. [Setup](#setup)
4. [Testing](#testing)
5. [License](#license)

## Overview

The project consists of two main smart contracts:
- **VaultToken**: ERC20 token with minting capability
- **Vault**: Contract managing token deposits with fees

## Smart Contracts

### VaultToken
- ERC20 token with 1,000,000 initial supply
- Minting function to create new tokens
- Function: `mint(address to, uint256 amount)`

### Vault
- Manages VaultToken deposits
- Charges entry fee in basis points
- Function: `deposit(uint256 amount)`

## Setup

### Prerequisites
- Node.js v16+
- Hardhat
- ethers.js
- Chai

### Installation
```bash
git clone https://github.com/codebasebo/vault-token-contract.git
cd vault-token-project
npm install
npx hardhat compile
```

## Testing
```bash
npx hardhat test
```

### Test Cases
- Initial Supply Verification
- Minting Operations
- Multiple Mint Tests
- Deposit Fee Calculations

## License
This project is licensed under MIT License.
