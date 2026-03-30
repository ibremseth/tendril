// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

contract Husk is UUPSUpgradeable {
    function init() external {}
    function _authorizeUpgrade(address) internal override {}
}

contract Tendril {
    address public immutable ADMIN;
    address public immutable HUSK;

    event NewDeployment(address deployAddress);

    constructor(address root, uint256 rootChainId) {
        if (block.chainid == rootChainId) {
            ADMIN = root;
        } else {
            ADMIN = address(uint160(address(this)) + uint160(0x1111000000000000000000000000000000001111));
        }
        HUSK = address(new Husk());
    }

    modifier onlyAdmin() {
        _onlyAdmin();
        _;
    }

    function _onlyAdmin() internal view {
        require(msg.sender == ADMIN);
    }

    function execute(address dest, bytes calldata data) external payable onlyAdmin {
        (bool success, bytes memory result) = payable(dest).call{value: msg.value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    function deploy(bytes32 salt, address impl, bytes calldata init) external onlyAdmin {
        address deployAddress = Create2.deploy(
            0,
            salt,
            abi.encodePacked(type(ERC1967Proxy).creationCode, abi.encode(HUSK, abi.encodeWithSignature("init()")))
        );
        (bool success, bytes memory result) =
            deployAddress.call(abi.encodeWithSignature("upgradeToAndCall(address,bytes)", impl, init));
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        emit NewDeployment(deployAddress);
    }

    function predict(bytes32 salt) external view returns (address) {
        return Create2.computeAddress(
            salt,
            keccak256(
                abi.encodePacked(type(ERC1967Proxy).creationCode, abi.encode(HUSK, abi.encodeWithSignature("init()")))
            )
        );
    }

    receive() external payable {}
}
