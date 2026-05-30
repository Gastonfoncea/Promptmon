// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {PromptMon} from "../src/PromptMon.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockUSDTNoReturn} from "./mocks/MockUSDTNoReturn.sol";
import {IERC721Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract PromptMonTest is Test {
    PromptMon pm;
    MockERC20 usdc; // 6 decimales, como USDC
    MockUSDTNoReturn usdt; // sin return en transfer, como USDT real

    address owner = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    uint256 constant USDC_PRICE = 10e6; // 10 USDC (6 decimales)
    uint256 constant MON_PRICE = 0.1 ether; // equivalente en MON (seteado a mano)
    string constant GLB = "https://tripo.example/creature.glb";
    // address(0) = pago nativo. Usar una constante (NO pm.NATIVE()) evita que la
    // llamada externa consuma el vm.prank/vm.expectRevert de la línea siguiente.
    address constant NATIVE = address(0);

    event CreatureMinted(
        uint256 indexed id, address indexed owner, string glbUrl, address payToken, uint256 amount
    );

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        usdt = new MockUSDTNoReturn();

        vm.prank(owner);
        pm = new PromptMon(owner, treasury);

        vm.startPrank(owner);
        pm.setPaymentToken(address(usdc), USDC_PRICE);
        pm.setPaymentToken(address(usdt), USDC_PRICE);
        pm.setPaymentToken(NATIVE, MON_PRICE);
        vm.stopPrank();

        usdc.mint(alice, 1_000e6);
        usdt.mint(alice, 1_000e6);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    // ----------------------------- Construcción ---------------------------- //

    function test_constructor_setsOwnerAndTreasury() public view {
        assertEq(pm.owner(), owner);
        assertEq(pm.treasury(), treasury);
        assertEq(pm.name(), "PromptMon");
        assertEq(pm.symbol(), "PMON");
    }

    function test_constructor_revertsOnZeroTreasury() public {
        vm.expectRevert(PromptMon.InvalidTreasury.selector);
        new PromptMon(owner, address(0));
    }

    // ----------------------------- Mint con USDC --------------------------- //

    function test_mint_withUSDC_mintsAndForwardsToTreasury() public {
        vm.startPrank(alice);
        usdc.approve(address(pm), USDC_PRICE);

        vm.expectEmit(true, true, false, true);
        emit CreatureMinted(0, alice, GLB, address(usdc), USDC_PRICE);
        uint256 id = pm.mintCreature(GLB, address(usdc));
        vm.stopPrank();

        assertEq(id, 0);
        assertEq(pm.ownerOf(0), alice);
        assertEq(pm.nextId(), 1);
        // fee directo a treasury, nada queda en el contrato
        assertEq(usdc.balanceOf(treasury), USDC_PRICE);
        assertEq(usdc.balanceOf(address(pm)), 0);
        assertEq(usdc.balanceOf(alice), 1_000e6 - USDC_PRICE);
        // glbUrl guardado y leíble
        assertEq(pm.getCreature(0).glb, GLB);
    }

    function test_mint_withUSDC_revertsWithoutApproval() public {
        vm.prank(alice);
        vm.expectRevert(); // ERC20InsufficientAllowance
        pm.mintCreature(GLB, address(usdc));
    }

    // ----------------------------- Mint con USDT --------------------------- //

    /// USDT real no devuelve bool: esto pasa solo si el contrato usa SafeERC20.
    function test_mint_withUSDT_noReturnValue_works() public {
        vm.startPrank(alice);
        usdt.approve(address(pm), USDC_PRICE);
        uint256 id = pm.mintCreature(GLB, address(usdt));
        vm.stopPrank();

        assertEq(pm.ownerOf(id), alice);
        assertEq(usdt.balanceOf(treasury), USDC_PRICE);
    }

    // ----------------------------- Mint con MON ---------------------------- //

    function test_mint_withNative_mintsAndForwards() public {
        uint256 treBefore = treasury.balance;
        vm.prank(alice);
        uint256 id = pm.mintCreature{value: MON_PRICE}(GLB, NATIVE);

        assertEq(pm.ownerOf(id), alice);
        assertEq(treasury.balance - treBefore, MON_PRICE);
        assertEq(address(pm).balance, 0);
    }

    function test_mint_withNative_revertsOnWrongValue() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(PromptMon.WrongNativeValue.selector, MON_PRICE - 1, MON_PRICE)
        );
        pm.mintCreature{value: MON_PRICE - 1}(GLB, NATIVE);
    }

    function test_mint_withNative_revertsOnExcessValue() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(PromptMon.WrongNativeValue.selector, MON_PRICE + 1, MON_PRICE)
        );
        pm.mintCreature{value: MON_PRICE + 1}(GLB, NATIVE);
    }

    /// Pagar con ERC-20 pero mandando MON por error debe revertir (no se pierde).
    function test_mint_withERC20_revertsIfNativeSent() public {
        vm.startPrank(alice);
        usdc.approve(address(pm), USDC_PRICE);
        vm.expectRevert(PromptMon.UnexpectedNativeValue.selector);
        pm.mintCreature{value: 1}(GLB, address(usdc));
        vm.stopPrank();
    }

    // --------------------------- Validaciones ------------------------------ //

    function test_mint_revertsOnUnacceptedToken() public {
        MockERC20 dai = new MockERC20("DAI", "DAI", 18);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(PromptMon.TokenNotAccepted.selector, address(dai)));
        pm.mintCreature(GLB, address(dai));
    }

    function test_mint_revertsOnEmptyGlb() public {
        vm.startPrank(alice);
        usdc.approve(address(pm), USDC_PRICE);
        vm.expectRevert(PromptMon.EmptyGlbUrl.selector);
        pm.mintCreature("", address(usdc));
        vm.stopPrank();
    }

    function test_mint_incrementsIds() public {
        vm.startPrank(alice);
        usdc.approve(address(pm), USDC_PRICE * 3);
        uint256 a = pm.mintCreature(GLB, address(usdc));
        uint256 b = pm.mintCreature(GLB, address(usdc));
        uint256 c = pm.mintCreature(GLB, address(usdc));
        vm.stopPrank();
        assertEq(a, 0);
        assertEq(b, 1);
        assertEq(c, 2);
        assertEq(pm.nextId(), 3);
    }

    // ------------------------------- Views --------------------------------- //

    function test_getCreature_revertsForNonexistent() public {
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, 99));
        pm.getCreature(99);
    }

    // ------------------------------ Admin ---------------------------------- //

    function test_setTreasury_onlyOwner() public {
        address newTre = makeAddr("newTreasury");
        vm.prank(owner);
        pm.setTreasury(newTre);
        assertEq(pm.treasury(), newTre);
    }

    function test_setTreasury_revertsForNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        pm.setTreasury(alice);
    }

    function test_setTreasury_revertsOnZero() public {
        vm.prank(owner);
        vm.expectRevert(PromptMon.InvalidTreasury.selector);
        pm.setTreasury(address(0));
    }

    function test_setPaymentToken_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        pm.setPaymentToken(address(usdc), 1);
    }

    function test_setPaymentToken_zeroDisablesToken() public {
        vm.prank(owner);
        pm.setPaymentToken(address(usdc), 0);
        vm.startPrank(alice);
        usdc.approve(address(pm), USDC_PRICE);
        vm.expectRevert(abi.encodeWithSelector(PromptMon.TokenNotAccepted.selector, address(usdc)));
        pm.mintCreature(GLB, address(usdc));
        vm.stopPrank();
    }

    // ------------------------------ Fuzz ----------------------------------- //

    function testFuzz_mint_forwardsExactPrice(uint256 price) public {
        price = bound(price, 1, 1_000e6);
        vm.prank(owner);
        pm.setPaymentToken(address(usdc), price);

        usdc.mint(bob, price);
        vm.startPrank(bob);
        usdc.approve(address(pm), price);
        pm.mintCreature(GLB, address(usdc));
        vm.stopPrank();

        assertEq(usdc.balanceOf(treasury), price);
    }
}
