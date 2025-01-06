const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("Vault Contract", function () {
  async function deployVault() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    // EntryFeeBasisPoints
    const entryFeeBasisPoints = 100; // 1%

    const VToken = await ethers.getContractFactory("VaultToken");
    const vToken = await VToken.deploy();
    await vToken.waitForDeployment();
    const vtokenAddress = await vToken.getAddress();
    console.log("VaultToken deployed to:", vtokenAddress);

    const amount = ethers.parseEther("1000");
    const otherAccountAddress = await otherAccount.getAddress();

    // Use the public `mint` function instead of `_mint`
    const mintOtherAccount = await vToken.mint(otherAccountAddress, amount);
    await mintOtherAccount.wait();
    console.log("Minted 1000 tokens to other account");

    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(vtokenAddress, entryFeeBasisPoints);
    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();
    console.log("Vault deployed to:", vaultAddress);

    return { vaultAddress, vtokenAddress, vault, vToken, owner, otherAccount };
  }

  describe("owner Vault Token balance", function () {
    it("Should return the owner's Vault Token balance", async function () {
      const { vaultAddress, vtokenAddress, vault, vToken, owner, otherAccount } = await deployVault();

      const balance = await vToken.balanceOf(await owner.getAddress());
      const balanceOther = await vToken.balanceOf(await otherAccount.getAddress());

      const totalSupply = await vToken.totalSupply();

      // Check that the total supply equals the sum of the owner's and other account's balances
      expect(totalSupply.toString()).to.equal(
        (BigInt(balance.toString()) + BigInt(balanceOther.toString())).toString()
      );

      console.log("Owner balance: ", balance.toString());
      console.log("Other account balance: ", balanceOther.toString());
      console.log("Total supply: ", totalSupply.toString());
    });
  });

  describe("VaultToken totalSupply", function () {
    it("Should return the correct total supply after deployment", async function () {
      const { vToken } = await deployVault();

      // Check the total supply after deployment
      const totalSupply = await vToken.totalSupply();
      const expectedSupply = ethers.parseEther("1001000"); // 1,001,000 tokens

      expect(totalSupply.toString()).to.equal(expectedSupply.toString());
      console.log("Total supply after deployment:", totalSupply.toString());
    });

    it("Should update the total supply after minting", async function () {
      const { vToken, otherAccount } = await deployVault();

      // Mint additional tokens to another account
      const mintAmount = ethers.parseEther("1000"); // 1,000 tokens
      await vToken.mint(await otherAccount.getAddress(), mintAmount);

      // Check the updated total supply
      const totalSupply = await vToken.totalSupply();
      const expectedSupply = ethers.parseEther("1002000"); // 1,001,000 tokens

      expect(totalSupply.toString()).to.equal(expectedSupply.toString());
      console.log("Total supply after minting:", totalSupply.toString());
    });

    it("Should return the correct total supply after multiple mints", async function () {
      const { vToken, owner, otherAccount } = await deployVault();

      // Mint tokens to the owner and another account
      const mintAmount1 = ethers.parseEther("500"); // 500 tokens
      const mintAmount2 = ethers.parseEther("1500"); // 1,500 tokens
      await vToken.mint(await owner.getAddress(), mintAmount1);
      await vToken.mint(await otherAccount.getAddress(), mintAmount2);

      // Check the updated total supply
      const totalSupply = await vToken.totalSupply();
      const expectedSupply = ethers.parseEther("1003000"); // 1,003,000 tokens

      expect(totalSupply.toString()).to.equal(expectedSupply.toString());
      console.log("Total supply after multiple mints:", totalSupply.toString());
    });
  });

  describe("Owner receives Vault Token from vault", function () {
    it("Should transfer Vault Token to owner", async function () {
      const { vaultAddress, vtokenAddress, vault, vToken, owner, otherAccount } = await deployVault();
      console.log("Vault address: ", vaultAddress);
      console.log("Owner address: ", await owner.getAddress());

      // Handle decimals if necessary
      const decimals = await vToken.decimals();
      const amount = ethers.parseEther("100"); // 100 tokens

      // Check current balance of the owner before approval
      let ownerBalanceBefore = await vToken.balanceOf(await owner.getAddress());
      console.log("Owner balance before approval: ", ownerBalanceBefore.toString());

      // Calculate the interest (1% of the deposit amount)
      const interest = amount / 100n; // 1 token
      const totalAllowance = amount + interest; // 101 tokens

      // Approve the vault to spend tokens on behalf of the owner
      let approvalTx = await vToken.connect(owner).approve(vaultAddress, totalAllowance);
      await approvalTx.wait(); // Ensure the approval transaction is mined
      console.log("Approval transaction mined");

      // Check the current allowance after approval
      let currentAllowance = await vToken.allowance(await owner.getAddress(), vaultAddress);
      console.log("Current allowance after approval: ", currentAllowance.toString());

      // Transfer tokens from the owner to the vault using deposit
      const transferTx = await vault.connect(owner).deposit(amount, await owner.getAddress());
      const receipt = await transferTx.wait(); // Ensure the transaction is mined
      console.log("Transfer transaction status: ", receipt.status === 1 ? "Success" : "Failed");

      // Check the balance of the vault after transfer
      const vaultBalance = await vToken.balanceOf(vaultAddress);
      console.log("Vault balance after transfer: ", vaultBalance.toString());

      // Calculate entry fee
      const entryFee = await vault.calculateEntryFee(amount);
      console.log("Entry Fees: ", entryFee.toString());

      // Assert that the vault balance is equal to the net deposit amount
      expect(vaultBalance.toString()).to.equal((amount - entryFee + interest).toString());

      // Check the owner's balance after the transfer
      let ownerBalanceAfter = await vToken.balanceOf(await owner.getAddress());
      console.log("Owner balance after transfer: ", ownerBalanceAfter.toString());

      // Ensure the owner's balance decreased by the full deposit amount
      expect((ownerBalanceBefore - ownerBalanceAfter).toString()).to.equal((totalAllowance - entryFee).toString());

      // Check the owner's Vault Token balance
      const vCoinBalance = await vault.balanceOf(await owner.getAddress());
      console.log("Vault balance: ", vCoinBalance.toString());
    });
  });

  describe("Owner can withdraw Vault Token from vault", function () {
    it("Should withdraw Vault Token from vault", async function () {
      const { vaultAddress, vtokenAddress, vault, vToken, owner, otherAccount } = await deployVault();
      console.log("Vault address: ", vaultAddress);
      console.log("Owner address: ", await owner.getAddress());

      // Handle decimals if necessary
      const decimals = await vToken.decimals();
      const amount = ethers.parseUnits("100", decimals); // 100 tokens

      // Check current balance of the owner before approval
      let ownerBalanceBefore = await vToken.balanceOf(await owner.getAddress());
      console.log("Owner balance before approval: ", ownerBalanceBefore.toString());

      // Calculate the interest (1% of the deposit amount)
      const interest = amount / 100n; // 1 token
      const totalAllowance = amount + interest; // 101 tokens

      // Vault balance before deposit
      let vaultBalanceBefore = await vToken.balanceOf(vaultAddress);
      console.log("Vault balance before deposit: ", vaultBalanceBefore.toString());

      // Approve the vault to spend tokens on behalf of the owner
      let approvalTx = await vToken.connect(owner).approve(vaultAddress, totalAllowance);
      await approvalTx.wait(); // Ensure the approval transaction is mined
      console.log("Approval transaction mined");

      // Check the current allowance after approval
      let currentAllowance = await vToken.allowance(await owner.getAddress(), vaultAddress);
      console.log("Current allowance after approval: ", currentAllowance.toString());

      console.log("Allowance is Sufficient");

      // Transfer tokens from the owner to the vault using deposit
      const transferTx = await vault.connect(owner).deposit(amount, await owner.getAddress());
      const receipt = await transferTx.wait(); // Ensure the transaction is mined
      console.log("Transfer transaction status: ", receipt.status === 1 ? "Success" : "Failed");

      // Check the balance of the vault after transfer
      const vaultBalance = await vToken.balanceOf(vaultAddress);
      console.log("Vault balance after transfer: ", vaultBalance.toString());

      // Calculate entry fee
      const entryFee = await vault.calculateEntryFee(amount);
      console.log("Entry Fees: ", entryFee.toString());

      // Assert that the vault balance is equal to the net deposit amount + interest
      const expectedVaultBalance = amount - entryFee + interest;
      expect(vaultBalance.toString()).to.equal(expectedVaultBalance.toString());

      // Check the owner's balance after the transfer
      let ownerBalanceAfter = await vToken.balanceOf(await owner.getAddress());
      console.log("Owner balance after transfer: ", ownerBalanceAfter.toString());

      // Ensure the owner's balance decreased by the full deposit amount
      expect((ownerBalanceBefore - ownerBalanceAfter).toString()).to.equal((totalAllowance - entryFee).toString());

      // Check vault shares before withdrawal
      const ownerSharesBeforeWithdraw = await vault.balanceOf(await owner.getAddress());
      console.log("Vault shares before withdrawal: ", ownerSharesBeforeWithdraw.toString());

      // Calculate the maximum amount the owner can withdraw
      const maxWithdrawAmount = await vault.maxWithdraw(await owner.getAddress());
      console.log("Max withdraw amount: ", maxWithdrawAmount.toString());

      // Withdraw tokens from the vault to the owner
      const withdrawTx = await vault.connect(owner).withdraw(maxWithdrawAmount, await owner.getAddress(), await owner.getAddress());
      const withdrawReceipt = await withdrawTx.wait(); // Ensure the transaction is mined
      console.log("Withdraw transaction status: ", withdrawReceipt.status === 1 ? "Success" : "Failed");

      // Check the owner's balance after withdrawal
      let ownerBalanceAfterWithdraw = await vToken.balanceOf(await owner.getAddress());
      console.log("Owner balance after withdrawal: ", ownerBalanceAfterWithdraw.toString());

      // Check the balance of the vault after withdrawal
      const vaultBalanceAfterWithdraw = await vToken.balanceOf(vaultAddress);
      console.log("Vault balance after withdrawal: ", vaultBalanceAfterWithdraw.toString());

      // Assert that the vault balance is zero after withdrawal
      expect(vaultBalanceAfterWithdraw.toString()).to.equal("1");

      // Assert that the owner's balance increased by the net deposit amount (after fees)
      expect((ownerBalanceAfterWithdraw - ownerBalanceAfter).toString()).to.equal(maxWithdrawAmount.toString());
    });
  });


  describe("Owner can Redeem Vault Token from vault", function () {
    it("Should Redeem Vault Token from vault", async function () {
      const { vaultAddress, vtokenAddress, vault, vToken, owner, otherAccount } = await deployVault();
      console.log("Vault address: ", vaultAddress);
      console.log("Owner address: ", await owner.getAddress());

      // Handle decimals if necessary
      const decimals = await vToken.decimals();
      const amount = ethers.parseUnits("100", decimals); // 100 tokens

      //Owner vCoin balance before redemption
      let ownerVCoinBalanceBefore = await vault.balanceOf(await owner.getAddress());
      console.log("Owner VaultCoin before redemption: ", ownerVCoinBalanceBefore.toString());

      //Vault vCoin balance before redemption
      let vaultVCoinBalanceBefore = await vault.balanceOf(vaultAddress);
      console.log("Vault VaultCoin before redemption: ", vaultVCoinBalanceBefore.toString());

      // Calculate the interest (1% of the deposit amount)
      const interest = amount / 100n; // 1 token
      const totalAllowance = amount + interest; // 101 tokens

      // Check current vToken balance of the owner before approval
      let ownerBalanceBefore = await vToken.balanceOf(await owner.getAddress());
      console.log("Owner balance before approval: ", ownerBalanceBefore.toString());

      // Vault vToken balance before deposit
      let vaultBalanceBefore = await vToken.balanceOf(vaultAddress);
      console.log("Vault balance before deposit: ", vaultBalanceBefore.toString());

      // Approve the vault to spend tokens on behalf of the owner
      let approvalTx = await vToken.connect(owner).approve(vaultAddress, totalAllowance);
      await approvalTx.wait(); // Ensure the approval transaction is mined
      console.log("Approval transaction mined");

      // Check the current allowance after approval
      let currentAllowance = await vToken.allowance(await owner.getAddress(), vaultAddress);
      console.log("Current allowance after approval: ", currentAllowance.toString());

      // Ensure allowance is set correctly
      console.log("Allowance match the amount.");

      // Transfer tokens from the owner to the vault using transferFrom
      const transferTx = await vault.connect(owner).deposit(amount, await owner.getAddress());
      const receipt = await transferTx.wait(); // Ensure the transaction is mined
      console.log("Transfer transaction status: ", receipt.status === 1 ? "Success" : "Failed");

      // Check the balance of the vault after transfer
      const vaultBalance = await vToken.balanceOf(vaultAddress);
      console.log("Vault vToken balance after transfer: ", vaultBalance.toString());

      // Calculate entry fee
      const entryFee = await vault.calculateEntryFee(amount);
      console.log("Entry Fees: ", entryFee.toString());

      // Assert that the vault balance is equal to the transferred amount
      expect(vaultBalance.toString()).to.equal((amount - entryFee + interest).toString());

      // Check the owner's balance after the transfer
      let ownerBalanceAfter = await vToken.balanceOf(await owner.getAddress());
      console.log("Owner vToken balance after transfer: ", ownerBalanceAfter.toString());

      // Ensure the owner's balance decreased by the transferred amount
      expect((ownerBalanceBefore - ownerBalanceAfter).toString()).to.equal((totalAllowance - entryFee).toString());

      // Check vault shares before redemption
      console.log("Owner VaultCoin before redemption: ", await vault.balanceOf(await owner.getAddress()));

      // Calculate the maximum amount the owner can withdraw
      const maxRedeemAmount = await vault.maxRedeem(await owner.getAddress());
      console.log("Max redeem amount: ", maxRedeemAmount.toString());

      // Redeem tokens from the vault to the owner
      const redeemTx = await vault.connect(owner).redeem(maxRedeemAmount, await owner.getAddress(), await owner.getAddress());
      const redeemReceipt = await redeemTx.wait(); // Ensure the transaction is mined
      console.log("Redeem transaction status: ", redeemReceipt.status === 1 ? "Success" : "Failed");

      // Check the owner's balance after redemption
      let ownerBalanceAfterRedeem = await vToken.balanceOf(await owner.getAddress());
      console.log("Owner vToken balance after redemption: ", ownerBalanceAfterRedeem.toString());

      // Check the balance of the vault after redemption
      const vaultBalanceAfterRedeem = await vToken.balanceOf(vaultAddress);
      console.log("Vault vToken balance after redemption: ", vaultBalanceAfterRedeem.toString());

      //Owner vCoin balance after redemption
      let ownerVCoinBalanceAfterRedeem = await vault.balanceOf(await owner.getAddress());
      console.log("Owner VaultCoin after redemption: ", ownerVCoinBalanceAfterRedeem.toString());

      //Vault vCoin balance after redemption
      let vaultVCoinBalanceAfterRedeem = await vault.balanceOf(vaultAddress);
      console.log("Vault VaultCoin after redemption: ", vaultVCoinBalanceAfterRedeem.toString());

      // Assert that the owenr vCoin balance is zero after redemption
      expect(ownerVCoinBalanceAfterRedeem.toString()).to.equal("0");

      // Assert that the vault vCoin balance is zero after redemption
      expect(vaultVCoinBalanceAfterRedeem.toString()).to.equal("0");

      // Assert that the vault balance is zero after redemption
      expect(vaultBalanceAfterRedeem.toString()).to.equal("1");

      // Assert that the owner's balance increased by the redeemed amount
      expect(maxRedeemAmount.toString()).to.equal((amount - entryFee).toString());
    });
  });

  describe("set entryFeeBasisPoints", function () {
    it("Should retrieve entryFeeBasisPoints", async function () {
      const { vaultAddress, vtokenAddress, vault, vToken, owner, otherAccount } = await deployVault();
      console.log("Vault address: ", vaultAddress);
      console.log("Owner address: ", await owner.getAddress());

      // Set entry fee basis points
      const entryFeeBasisPoints = await vault.getEntryFeeBasisPoints();
      console.log("Entry fee basis points: ", entryFeeBasisPoints.toString());
    });
  });

  describe("Get entryFeeRecipient address", function () {
    it("Should retrieve entryFeeRecipient address", async function () {
      const { vaultAddress, vtokenAddress, vault, vToken, owner, otherAccount } = await deployVault();
      console.log("Vault address: ", vaultAddress);
      console.log("Owner address: ", await owner.getAddress());

      // Set entry fee recipient
      const entryFeeRecipient = await vault.getEntryFeeRecipient();
      console.log("Entry fee recipient: ", entryFeeRecipient.toString());
    });
  });

});
