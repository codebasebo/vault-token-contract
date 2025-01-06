// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "./ERC4626Fees.sol";

/**
 * @title Vault
 * @dev A tokenized vault that allows users to deposit and withdraw assets while charging an entry fee.
 * The vault implements the ERC4626 standard with additional fee functionality.
 */
contract Vault is ERC4626Fees {
    // The owner of the vault who receives the entry fees.
    address payable public VaultOwner;

    // The basis points (bps) for the entry fee. For example, 100 bps = 1% fee.
    uint256 public entryFeeBasisPoints;

    /**
     * @dev Constructor to initialize the vault.
     * @param asset_ The underlying ERC20 asset for the vault.
     * @param _basisPoints The entry fee in basis points (e.g., 100 for 1%).
     */
    constructor(IERC20 asset_, uint256 _basisPoints) ERC4626(asset_) ERC20("VaultCoin", "VCOIN") {
        VaultOwner = payable(msg.sender); // Set the deployer as the vault owner.
        entryFeeBasisPoints = _basisPoints; // Set the entry fee basis points.
    }

    /**
     * @dev Overrides the ERC4626 deposit function to include entry fee logic.
     * @param assets The amount of assets to deposit.
     * @param receiver The address to receive the vault shares.
     * @return shares The number of shares minted to the receiver.
     */
    function deposit(uint256 assets, address receiver) public virtual override returns (uint256) {
        uint256 maxAssets = maxDeposit(receiver);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxDeposit(receiver, assets, maxAssets);
        }

        uint256 shares = previewDeposit(assets); // Calculate shares based on assets.
        _deposit(_msgSender(), receiver, assets, shares); // Perform the deposit.
        afterDeposit(assets); // Execute logic after deposit.

        return shares;
    }
    

    /**
     * @dev Overrides the ERC4626 mint function to include entry fee logic.
     * @param shares The number of shares to mint.
     * @param receiver The address to receive the vault shares.
     * @return assets The amount of assets deposited.
     */
    function mint(uint256 shares, address receiver) public virtual override returns (uint256) {
        uint256 maxShares = maxMint(receiver);
        if (shares > maxShares) {
            revert ERC4626ExceededMaxMint(receiver, shares, maxShares);
        }

        uint256 assets = previewMint(shares); // Calculate assets required for shares.
        _deposit(_msgSender(), receiver, assets, shares); // Perform the deposit.
        afterDeposit(assets); // Execute logic after deposit.

        return assets;
    }

    /**
     * @dev Overrides the ERC4626 withdraw function to include fee logic.
     * @param assets The amount of assets to withdraw.
     * @param receiver The address to receive the withdrawn assets.
     * @param owner The address owning the shares to be withdrawn.
     * @return shares The number of shares burned.
     */
    function withdraw(uint256 assets, address receiver, address owner) public virtual override returns (uint256) {
        uint256 maxAssets = maxWithdraw(owner);
        if (assets > maxAssets) {
            revert ERC4626ExceededMaxWithdraw(owner, assets, maxAssets);
        }

        uint256 shares = previewWithdraw(assets); // Calculate shares required for assets.
        beforeWithdraw(assets, shares); // Execute logic before withdrawal.
        _withdraw(_msgSender(), receiver, owner, assets, shares); // Perform the withdrawal.

        return shares;
    }

    /**
     * @dev Overrides the ERC4626 redeem function to include fee logic.
     * @param shares The number of shares to redeem.
     * @param receiver The address to receive the withdrawn assets.
     * @param owner The address owning the shares to be redeemed.
     * @return assets The amount of assets withdrawn.
     */
    function redeem(uint256 shares, address receiver, address owner) public virtual override returns (uint256) {
        uint256 maxShares = maxRedeem(owner);
        if (shares > maxShares) {
            revert ERC4626ExceededMaxRedeem(owner, shares, maxShares);
        }

        uint256 assets = previewRedeem(shares); // Calculate assets for the shares.
        beforeWithdraw(assets, shares); // Execute logic before withdrawal.
        _withdraw(_msgSender(), receiver, owner, assets, shares); // Perform the withdrawal.

        return assets;
    }

    /**
     * @dev Returns the entry fee basis points.
     * @return The entry fee in basis points.
     */
    function _entryFeeBasisPoints() internal view override returns (uint256) {
        return entryFeeBasisPoints;
    }

    /**
     * @dev Returns the entry fee recipient address.
     * @return The address of the fee recipient.
     */
    function _entryFeeRecipient() internal view override returns (address) {
        return VaultOwner;
    }

    /**
     * @dev Public getter for the entry fee basis points.
     * @return The entry fee in basis points.
     */
    function getEntryFeeBasisPoints() public view returns (uint256) {
        return entryFeeBasisPoints;
    }

    /**
     * @dev Public getter for the entry fee recipient address.
     * @return The address of the fee recipient.
     */
    function getEntryFeeRecipient() public view returns (address) {
        return VaultOwner;
    }

    /**
     * @dev Calculates the entry fee for a given amount.
     * @param amount The amount to calculate the fee for.
     * @return The entry fee amount.
     */
    function calculateEntryFee(uint256 amount) public view returns (uint256) {
        return _feeOnTotal(amount, entryFeeBasisPoints);
    }

    /**
     * @dev Hook executed before withdrawing assets.
     * @param assets The amount of assets being withdrawn.
     * @param shares The number of shares being burned.
     */
    function beforeWithdraw(uint256 assets, uint256 shares) internal virtual {
        // Custom logic before withdrawal can be added here.
    }

    /**
     * @dev Hook executed after depositing assets.
     * @param assets The amount of assets deposited.
     */
    function afterDeposit(uint256 assets) internal virtual {
        // Example: Transfer 1% of the deposited assets as interest.
        uint256 interest = assets / 100;
        SafeERC20.safeTransferFrom(IERC20(asset()), msg.sender, address(this), interest);
    }
}