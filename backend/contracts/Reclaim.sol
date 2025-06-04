
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {SiweAuth} from "@oasisprotocol/sapphire-contracts/contracts/auth/SiweAuth.sol";

contract Reclaim is SiweAuth {
    mapping(address => mapping(string => string)) private registerToNameToNumbers;
    mapping(address => string[]) private registerToNames;

    constructor(string memory domain) SiweAuth(domain) {}

    function createNumbersList(
        string[] calldata names,
        string[] calldata numbers,
        bytes calldata authToken
    ) external {
        require(names.length == numbers.length, "Mismatched array lengths");

        address user = authMsgSender(authToken);
        delete registerToNames[user]; // optional: clears previous list

        for (uint256 i = 0; i < names.length; i++) {
            registerToNameToNumbers[user][names[i]] = numbers[i];
            registerToNames[user].push(names[i]);
        }
    }

    function addToNumbersList(
        string calldata name,
        string calldata number,
        bytes calldata authToken
    ) external {
        address user = authMsgSender(authToken);

        // Optional: prevent duplicates
        if (bytes(registerToNameToNumbers[user][name]).length == 0) {
            registerToNames[user].push(name);
        }

        registerToNameToNumbers[user][name] = number;
    }

    function removeFromNumbersList(
        string calldata name,
        bytes calldata authToken
    ) external {
        address user = authMsgSender(authToken);
        registerToNameToNumbers[user][name] = "";

        // Optional: also remove from name array
        string[] storage names = registerToNames[user];
        for (uint256 i = 0; i < names.length; i++) {
            if (keccak256(bytes(names[i])) == keccak256(bytes(name))) {
                names[i] = names[names.length - 1];
                names.pop();
                break;
            }
        }
    }

    function getNumbersList(
        bytes calldata authToken
    ) external view returns (string[] memory names, string[] memory numbers) {
        address user = authMsgSender(authToken);
        names = registerToNames[user];
        numbers = new string[](names.length);
        for (uint256 i = 0; i < names.length; i++) {
            numbers[i] = registerToNameToNumbers[user][names[i]];
        }
    }
}
