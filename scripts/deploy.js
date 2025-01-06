const hre = require("hardhat");

async function main() {
    // Deploy VaultToken
    const VaultToken = await hre.ethers.getContractFactory("VaultToken");
    const vToken = await VaultToken.deploy();
    await vToken.waitForDeployment();
    const vTokenAddress = await vToken.getAddress();
    console.log("VaultToken deployed to:", vTokenAddress);



    // Deploy Vault
    const entryFeeBasisPoints = 100; // 1%
    const Vault = await hre.ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(vTokenAddress, entryFeeBasisPoints);
    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();
    console.log("Vault deployed to:", vaultAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});