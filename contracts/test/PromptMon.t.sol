// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {PromptMon} from "../src/PromptMon.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockUSDTNoReturn} from "./mocks/MockUSDTNoReturn.sol";
import {ReentrantMinter} from "./mocks/ReentrantMinter.sol";
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
    string constant GLB = "https://tripo.example/creature.glb";

    event CreatureMinted(uint256 indexed id, address indexed owner, string glb);
    event ChallengeCreated(uint256 indexed cid, uint256 indexed creatureId);
    event ChallengeCancelled(uint256 indexed cid);
    event BattleResult(
        uint256 indexed winnerId, uint256 indexed loserId, address winner, address loser
    );

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        usdt = new MockUSDTNoReturn();

        vm.prank(owner);
        pm = new PromptMon(owner, treasury);

        vm.startPrank(owner);
        pm.setPaymentToken(address(usdc), USDC_PRICE);
        pm.setPaymentToken(address(usdt), USDC_PRICE);
        vm.stopPrank();

        usdc.mint(alice, 1_000e6);
        usdc.mint(bob, 1_000e6);
        usdt.mint(alice, 1_000e6);
    }

    // ----------------------------- helpers --------------------------------- //

    /// Mintea para `who` con un glb único (para variar el hash de stats).
    function _mint(address who, string memory glb) internal returns (uint256 id) {
        vm.startPrank(who);
        usdc.approve(address(pm), USDC_PRICE);
        id = pm.mintCreature(glb, address(usdc));
        vm.stopPrank();
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

    // ------------------------------- Mint ---------------------------------- //

    function test_mint_withUSDC_mintsAndForwardsToTreasury() public {
        vm.startPrank(alice);
        usdc.approve(address(pm), USDC_PRICE);
        vm.expectEmit(true, true, false, true);
        emit CreatureMinted(0, alice, GLB);
        uint256 id = pm.mintCreature(GLB, address(usdc));
        vm.stopPrank();

        assertEq(id, 0);
        assertEq(pm.ownerOf(0), alice);
        assertEq(pm.nextId(), 1);
        assertEq(usdc.balanceOf(treasury), USDC_PRICE);
        assertEq(usdc.balanceOf(address(pm)), 0);
        assertEq(pm.getCreature(0).glb, GLB);
    }

    /// USDT real no devuelve bool: pasa solo si el contrato usa SafeERC20.
    function test_mint_withUSDT_noReturnValue_works() public {
        vm.startPrank(alice);
        usdt.approve(address(pm), USDC_PRICE);
        uint256 id = pm.mintCreature(GLB, address(usdt));
        vm.stopPrank();
        assertEq(pm.ownerOf(id), alice);
        assertEq(usdt.balanceOf(treasury), USDC_PRICE);
    }

    function test_mint_revertsWithoutApproval() public {
        vm.prank(alice);
        vm.expectRevert();
        pm.mintCreature(GLB, address(usdc));
    }

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
        uint256 a = _mint(alice, "a");
        uint256 b = _mint(alice, "b");
        assertEq(a, 0);
        assertEq(b, 1);
        assertEq(pm.nextId(), 2);
    }

    // ------------------------------ Stats ---------------------------------- //

    function test_stats_sumTo100_orFloor() public {
        uint256 id = _mint(alice, "stats");
        PromptMon.Creature memory c = pm.getCreature(id);
        uint256 sum = uint256(c.atk) + c.def + c.hp + c.spd;
        // == 100 salvo cuando aplica el piso de SPD (=5), donde puede ser >100.
        assertTrue(sum == 100 || c.spd == 5, "suma debe ser 100 o SPD en piso");
        assertGe(c.spd, 5);
        assertEq(c.level, 1);
        assertEq(c.wins, 0);
        // rangos de las otras stats
        assertGe(c.atk, 10);
        assertLe(c.atk, 49);
        assertGe(c.def, 10);
        assertLe(c.def, 49);
        assertGe(c.hp, 10);
        assertLe(c.hp, 49);
    }

    function test_stats_differBetweenMints() public {
        uint256 a = _mint(alice, "one");
        vm.warp(block.timestamp + 1); // distinto timestamp → distinto hash
        uint256 b = _mint(alice, "two");
        PromptMon.Creature memory ca = pm.getCreature(a);
        PromptMon.Creature memory cb = pm.getCreature(b);
        bool different =
            ca.atk != cb.atk || ca.def != cb.def || ca.hp != cb.hp || ca.spd != cb.spd;
        assertTrue(different, "dos mints deberian dar stats distintas");
    }

    function testFuzz_stats_invariant(string calldata glb, uint64 ts) public {
        vm.assume(bytes(glb).length > 0);
        vm.warp(ts);
        uint256 id = _mint(alice, glb);
        PromptMon.Creature memory c = pm.getCreature(id);
        uint256 sum = uint256(c.atk) + c.def + c.hp + c.spd;
        assertTrue(sum == 100 || c.spd == 5);
        assertGe(c.spd, 5);
    }

    // ---------------------------- Challenges ------------------------------- //

    function test_createChallenge_locksCreature() public {
        uint256 id = _mint(alice, "a");
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit ChallengeCreated(0, id);
        uint256 cid = pm.createChallenge(id);

        assertEq(cid, 0);
        assertTrue(pm.locked(id));
        PromptMon.OpenChallenge[] memory open = pm.getOpenChallenges();
        assertEq(open.length, 1);
        assertEq(open[0].cid, 0);
        assertEq(open[0].creatureId, id);
        assertEq(open[0].challenger, alice);
    }

    function test_createChallenge_revertsIfNotOwner() public {
        uint256 id = _mint(alice, "a");
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(PromptMon.NotCreatureOwner.selector, id));
        pm.createChallenge(id);
    }

    function test_createChallenge_revertsIfAlreadyLocked() public {
        uint256 id = _mint(alice, "a");
        vm.startPrank(alice);
        pm.createChallenge(id);
        vm.expectRevert(abi.encodeWithSelector(PromptMon.CreatureLocked.selector, id));
        pm.createChallenge(id); // no se puede meter en dos desafíos
        vm.stopPrank();
    }

    function test_lockedCreature_cannotTransfer() public {
        uint256 id = _mint(alice, "a");
        vm.startPrank(alice);
        pm.createChallenge(id);
        vm.expectRevert(abi.encodeWithSelector(PromptMon.CreatureLocked.selector, id));
        pm.transferFrom(alice, bob, id);
        vm.stopPrank();
    }

    function test_cancelChallenge_unlocks() public {
        uint256 id = _mint(alice, "a");
        vm.startPrank(alice);
        uint256 cid = pm.createChallenge(id);
        vm.expectEmit(true, false, false, false);
        emit ChallengeCancelled(cid);
        pm.cancelChallenge(cid);
        vm.stopPrank();

        assertFalse(pm.locked(id));
        assertEq(pm.getOpenChallenges().length, 0);
        // tras cancelar, ya se puede transferir
        vm.prank(alice);
        pm.transferFrom(alice, bob, id);
        assertEq(pm.ownerOf(id), bob);
    }

    function test_cancelChallenge_revertsIfNotChallenger() public {
        uint256 id = _mint(alice, "a");
        vm.prank(alice);
        uint256 cid = pm.createChallenge(id);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(PromptMon.NotCreatureOwner.selector, id));
        pm.cancelChallenge(cid);
    }

    function test_cancelChallenge_revertsIfAlreadyClosed() public {
        uint256 id = _mint(alice, "a");
        vm.startPrank(alice);
        uint256 cid = pm.createChallenge(id);
        pm.cancelChallenge(cid);
        vm.expectRevert(abi.encodeWithSelector(PromptMon.ChallengeNotOpen.selector, cid));
        pm.cancelChallenge(cid);
        vm.stopPrank();
    }

    // --------------------- FLUJO DE CONQUISTA (core) ----------------------- //

    function test_acceptChallenge_fullConquestFlow() public {
        uint256 idA = _mint(alice, "alice-creature");
        uint256 idB = _mint(bob, "bob-creature");

        vm.prank(alice);
        uint256 cid = pm.createChallenge(idA);

        // estado previo
        uint16 winsBefore;
        {
            // determinar quién va a ganar para chequear level/wins del ganador
        }

        vm.prank(bob);
        vm.recordLogs();
        pm.acceptChallenge(cid, idB);

        // el challenge quedó cerrado y ambos locks liberados
        assertFalse(pm.locked(idA), "lock de A liberado");
        assertFalse(pm.locked(idB), "lock de B liberado");
        assertEq(pm.getOpenChallenges().length, 0, "no quedan desafios abiertos");

        // uno de los dos cambió de dueño hacia el ganador
        address ownerA = pm.ownerOf(idA);
        address ownerB = pm.ownerOf(idB);
        // el ganador es dueño de ambas criaturas
        assertTrue(
            (ownerA == alice && ownerB == alice) || (ownerA == bob && ownerB == bob),
            "el ganador debe ser dueno de ambos NFTs"
        );

        // el ganador subió +1 level y +1 win
        address winnerAddr = ownerA; // ambos pertenecen al ganador
        uint256 winnerId = (winnerAddr == alice) ? idA : idB;
        uint256 loserId = (winnerAddr == alice) ? idB : idA;
        assertEq(pm.getCreature(winnerId).level, 2, "ganador level 2");
        assertEq(pm.getCreature(winnerId).wins, 1, "ganador 1 win");
        // el perdedor no cambia stats de progreso
        assertEq(pm.getCreature(loserId).level, 1, "perdedor sigue level 1");
        assertEq(pm.getCreature(loserId).wins, 0, "perdedor 0 wins");
        winsBefore; // silence
    }

    /// Aceptar el propio challenge con la MISMA criatura: como la criatura del
    /// challenger está locked mientras espera rival, el guard de lock salta antes
    /// que el de self-battle. Por eso el revert real es CreatureLocked, no
    /// SelfBattle (que queda como defensa redundante e inalcanzable por esta vía).
    function test_acceptChallenge_sameCreature_revertsLocked() public {
        uint256 idA = _mint(alice, "a");
        vm.startPrank(alice);
        uint256 cid = pm.createChallenge(idA);
        vm.expectRevert(abi.encodeWithSelector(PromptMon.CreatureLocked.selector, idA));
        pm.acceptChallenge(cid, idA);
        vm.stopPrank();
    }

    /// El dueño del challenge SÍ puede aceptarlo con OTRA criatura suya (no es
    /// self-battle): pelea válida, una de las dos criaturas absorbe a la otra.
    function test_acceptChallenge_ownerWithDifferentCreature_works() public {
        uint256 idA = _mint(alice, "a");
        uint256 idA2 = _mint(alice, "a2");
        vm.startPrank(alice);
        uint256 cid = pm.createChallenge(idA);
        pm.acceptChallenge(cid, idA2);
        vm.stopPrank();
        // alice sigue siendo dueña de ambas (peleó contra sí misma con 2 bichos)
        assertEq(pm.ownerOf(idA), alice);
        assertEq(pm.ownerOf(idA2), alice);
        assertFalse(pm.locked(idA));
        assertFalse(pm.locked(idA2));
    }

    function test_acceptChallenge_revertsIfClosed() public {
        uint256 idA = _mint(alice, "a");
        uint256 idB = _mint(bob, "b");
        vm.prank(alice);
        uint256 cid = pm.createChallenge(idA);
        vm.prank(alice);
        pm.cancelChallenge(cid);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(PromptMon.ChallengeNotOpen.selector, cid));
        pm.acceptChallenge(cid, idB);
    }

    function test_acceptChallenge_revertsIfAccepterCreatureLocked() public {
        uint256 idA = _mint(alice, "a");
        uint256 idB = _mint(bob, "b");
        vm.prank(alice);
        uint256 cidA = pm.createChallenge(idA);
        // bob lockea su propio bicho en otro challenge
        vm.prank(bob);
        pm.createChallenge(idB);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(PromptMon.CreatureLocked.selector, idB));
        pm.acceptChallenge(cidA, idB);
    }

    function test_acceptChallenge_revertsIfNotOwnerOfAccepter() public {
        uint256 idA = _mint(alice, "a");
        uint256 idB = _mint(bob, "b");
        vm.prank(alice);
        uint256 cid = pm.createChallenge(idA);
        // carol intenta aceptar con el bicho de bob
        vm.prank(makeAddr("carol"));
        vm.expectRevert(abi.encodeWithSelector(PromptMon.NotCreatureOwner.selector, idB));
        pm.acceptChallenge(cid, idB);
    }

    // ------------------------------- Views --------------------------------- //

    function test_getCreature_revertsForNonexistent() public {
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, 99));
        pm.getCreature(99);
    }

    function test_getOpenChallenges_excludesClosed() public {
        uint256 id1 = _mint(alice, "1");
        uint256 id2 = _mint(alice, "2");
        uint256 id3 = _mint(alice, "3");
        vm.startPrank(alice);
        uint256 c1 = pm.createChallenge(id1);
        pm.createChallenge(id2);
        pm.createChallenge(id3);
        pm.cancelChallenge(c1); // cierra el primero
        vm.stopPrank();

        PromptMon.OpenChallenge[] memory open = pm.getOpenChallenges();
        assertEq(open.length, 2);
        // ninguno de los abiertos es el cancelado
        for (uint256 i; i < open.length; ++i) {
            assertTrue(open[i].cid != c1);
        }
        assertEq(pm.challengeCount(), 3);
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

    // --------------------------- Reentrancy -------------------------------- //

    /// Un receptor malicioso intenta re-entrar mintCreature dentro del callback
    /// onERC721Received del _safeMint. El guard nonReentrant debe abortar todo.
    function test_mint_reentrancyIsBlocked() public {
        ReentrantMinter attacker = new ReentrantMinter(address(pm), address(usdc));
        usdc.mint(address(attacker), 1_000e6);

        vm.expectRevert(); // ReentrancyGuardReentrantCall (propaga y revierte el mint externo)
        attacker.attack(GLB);

        // nada se acuñó: el estado quedó intacto
        assertEq(pm.nextId(), 0);
        assertEq(usdc.balanceOf(treasury), 0);
    }
}
