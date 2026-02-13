// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {BraboStaking} from "../src/BraboStaking.sol";

contract BraboStakingScript is Script {

     function run() external returns (BraboStaking) {


        address brb = 0x07f6A4932e8be5Be7a0aC1bfCAB5EF6b95B0b1a2;
        address braboNft = 0x680cc2149bc0E7A4Aa83f462F28aee1639C1355a;

        vm.startBroadcast();
        BraboStaking braboStaking = new BraboStaking(brb, braboNft);

        console.log("BraboStaking deployed to:", address(braboStaking));
        vm.stopBroadcast();
        return (braboStaking);
     }

}
