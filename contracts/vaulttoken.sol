// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract VaultToken is ERC20 {
    constructor() ERC20("Vault Token", "VT") {
        _mint(msg.sender, 1000000 * 10 ** decimals()); // Mint 1,000,000 tokens to the deployer
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount); // Mint the exact amount (in wei)
    }
}