// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Tendril} from "../src/Tendril.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

contract MockTarget {
    uint256 public value;

    function setValue(uint256 _value) external {
        value = _value;
    }

    function reverter() external pure {
        revert("MockTarget: reverted");
    }

    receive() external payable {}
}

contract MockImpl is UUPSUpgradeable {
    uint256 public x;

    function initialize(uint256 _x) external {
        x = _x;
    }

    function _authorizeUpgrade(address) internal override {}
}

contract TendrilOnRootChainTest is Test {
    Tendril tendril;
    MockTarget target;
    address root = makeAddr("root");

    function setUp() public {
        tendril = new Tendril(root, block.chainid);
        target = new MockTarget();
        vm.deal(address(tendril), 10 ether);
        vm.deal(root, 10 ether);
    }

    function test_adminIsRootOnRootChain() public view {
        assertEq(tendril.ADMIN(), root);
    }

    function test_seedIsDeployed() public view {
        assertTrue(tendril.SEED() != address(0));
        assertTrue(address(tendril.SEED()).code.length > 0);
    }

    function test_executeAsAdmin() public {
        vm.prank(root);
        tendril.execute(address(target), abi.encodeWithSelector(MockTarget.setValue.selector, 42));
        assertEq(target.value(), 42);
    }

    function test_executeForwardsValue() public {
        vm.prank(root);
        tendril.execute{value: 1 ether}(address(target), "");
        assertEq(address(target).balance, 1 ether);
    }

    function test_executeRevertsIfNotAdmin() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert();
        tendril.execute(address(target), abi.encodeWithSelector(MockTarget.setValue.selector, 42));
    }

    function test_executeBubblesRevert() public {
        vm.prank(root);
        vm.expectRevert("MockTarget: reverted");
        tendril.execute(address(target), abi.encodeWithSelector(MockTarget.reverter.selector));
    }

    function test_receiveETH() public {
        (bool success,) = address(tendril).call{value: 1 ether}("");
        assertTrue(success);
        assertEq(address(tendril).balance, 11 ether);
    }
}

contract TendrilOnL2Test is Test {
    Tendril tendril;
    address root = address(0xBEEF);
    uint256 rootChainId = 1;

    function setUp() public {
        // Deploy on a different chain than rootChainId
        vm.chainId(42161);
        tendril = new Tendril(root, rootChainId);
    }

    function test_adminIsAliasedOnL2() public view {
        address expected = address(uint160(address(tendril)) + uint160(0x1111000000000000000000000000000000001111));
        assertEq(tendril.ADMIN(), expected);
    }

    function test_aliasedAdminCanExecute() public {
        MockTarget target = new MockTarget();
        address aliased = tendril.ADMIN();

        vm.prank(aliased);
        tendril.execute(address(target), abi.encodeWithSelector(MockTarget.setValue.selector, 99));
        assertEq(target.value(), 99);
    }

    function test_rootCannotExecuteOnL2() public {
        MockTarget target = new MockTarget();

        vm.prank(root);
        vm.expectRevert();
        tendril.execute(address(target), abi.encodeWithSelector(MockTarget.setValue.selector, 1));
    }
}

contract TendrilDeployTest is Test {
    Tendril tendril;
    MockImpl impl;
    address root = address(0xBEEF);

    function setUp() public {
        tendril = new Tendril(root, block.chainid);
        impl = new MockImpl();
        vm.deal(address(tendril), 10 ether);
    }

    function test_deployProxy() public {
        bytes32 salt = bytes32(uint256(1));
        bytes memory init = abi.encodeWithSelector(MockImpl.initialize.selector, 123);

        vm.prank(root);
        tendril.deploy(salt, address(impl), init);

        address predicted = tendril.predict(salt);
        MockImpl proxy = MockImpl(predicted);
        assertEq(proxy.x(), 123);
    }

    function test_predictMatchesDeploy() public {
        bytes32 salt = bytes32(uint256(2));

        address predicted = tendril.predict(salt);

        vm.prank(root);
        tendril.deploy(salt, address(impl), "");

        assertTrue(predicted.code.length > 0);
    }

    function test_deployEmitsEvent() public {
        bytes32 salt = bytes32(uint256(3));
        address predicted = tendril.predict(salt);

        vm.prank(root);
        vm.expectEmit(false, false, false, true);
        emit Tendril.NewDeployment(predicted);
        tendril.deploy(salt, address(impl), "");
    }

    function test_deployRevertsIfNotAdmin() public {
        bytes32 salt = bytes32(uint256(4));

        vm.prank(address(0xDEAD));
        vm.expectRevert();
        tendril.deploy(salt, address(impl), "");
    }

    function test_deploySameSaltReverts() public {
        bytes32 salt = bytes32(uint256(5));

        vm.prank(root);
        tendril.deploy(salt, address(impl), "");

        vm.prank(root);
        vm.expectRevert();
        tendril.deploy(salt, address(impl), "");
    }

    function test_deployedProxyIsUpgradeable() public {
        bytes32 salt = bytes32(uint256(6));
        bytes memory init = abi.encodeWithSelector(MockImpl.initialize.selector, 1);

        vm.prank(root);
        tendril.deploy(salt, address(impl), init);

        address predicted = tendril.predict(salt);
        MockImpl proxy = MockImpl(predicted);
        assertEq(proxy.x(), 1);

        // Deploy new impl and upgrade
        MockImpl impl2 = new MockImpl();
        vm.prank(root);
        tendril.execute(
            predicted,
            abi.encodeWithSignature(
                "upgradeToAndCall(address,bytes)",
                address(impl2),
                abi.encodeWithSelector(MockImpl.initialize.selector, 999)
            )
        );
        assertEq(proxy.x(), 999);
    }
}
