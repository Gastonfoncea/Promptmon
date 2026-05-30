// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import {Test} from "forge-std/Test.sol";
import {PromptMon} from "../src/PromptMon.sol";
import {IERC721Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

contract PromptMonTest is Test {
    PromptMon pm;

    address owner = makeAddr("owner");
    address treasury = makeAddr("treasury");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    string constant GLB = "https://tripo.example/creature.glb";
    uint256 constant FEE = 0.1 ether;

    event CreatureMinted(uint256 indexed id, address indexed owner, string glb);
    event ChallengeCreated(uint256 indexed cid, uint256 indexed creatureId);
    event ChallengeCancelled(uint256 indexed cid);

    function setUp() public {
        vm.prank(owner);
        pm = new PromptMon(owner, treasury);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    // helper: mint con stats válidas por defecto (25/25/25/25 = 100)
    function _mint(address who, string memory glb) internal returns (uint256 id) {
        vm.prank(who);
        id = pm.mintCreature{value: FEE}(glb, 25, 25, 25, 25);
    }

    // ----------------------------- construcción ---------------------------- //

    function test_constructor() public view {
        assertEq(pm.owner(), owner);
        assertEq(pm.name(), "PromptMon");
        assertEq(pm.symbol(), "PMON");
        assertEq(pm.STAT_TOTAL(), 100);
        assertEq(pm.STAT_MIN(), 5);
    }

    // ------------------------------- mint ---------------------------------- //

    function test_mint_storesChosenStats() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit CreatureMinted(0, alice, GLB);
        uint256 id = pm.mintCreature{value: FEE}(GLB, 40, 30, 20, 10);

        assertEq(id, 0);
        assertEq(pm.ownerOf(0), alice);
        PromptMon.Creature memory c = pm.getCreature(0);
        assertEq(c.atk, 40);
        assertEq(c.def, 30);
        assertEq(c.hp, 20);
        assertEq(c.spd, 10);
        assertEq(c.level, 1);
        assertEq(c.wins, 0);
        assertEq(c.glb, GLB);
    }

    function test_mint_forwardsFeeToTreasury() public {
        uint256 before = treasury.balance;
        _mint(alice, GLB);
        assertEq(treasury.balance - before, FEE);
        assertEq(address(pm).balance, 0);
    }

    function test_mint_revertsOnWrongFee() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(PromptMon.WrongFee.selector, FEE - 1, FEE));
        pm.mintCreature{value: FEE - 1}(GLB, 25, 25, 25, 25);
    }

    function test_mint_revertsOnZeroFee() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(PromptMon.WrongFee.selector, 0, FEE));
        pm.mintCreature(GLB, 25, 25, 25, 25);
    }

    function test_mint_revertsOnEmptyGlb() public {
        vm.prank(alice);
        vm.expectRevert(PromptMon.EmptyGlbUrl.selector);
        pm.mintCreature{value: FEE}("", 25, 25, 25, 25);
    }

    function test_mint_revertsIfSumNot100() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(PromptMon.BadStatTotal.selector, uint256(99)));
        pm.mintCreature{value: FEE}(GLB, 25, 25, 25, 24);
    }

    function test_mint_revertsIfSumOver100() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(PromptMon.BadStatTotal.selector, uint256(101)));
        pm.mintCreature{value: FEE}(GLB, 26, 25, 25, 25);
    }

    function test_mint_revertsIfStatBelowMin() public {
        vm.prank(alice);
        vm.expectRevert(PromptMon.StatBelowMin.selector);
        pm.mintCreature{value: FEE}(GLB, 90, 4, 3, 3); // suma 100 pero def/hp/spd < 5
    }

    function test_mint_allowsExtremeBuildAtMin() public {
        // 85/5/5/5 = 100, todas >= 5 → válido
        vm.prank(alice);
        uint256 id = pm.mintCreature{value: FEE}(GLB, 85, 5, 5, 5);
        PromptMon.Creature memory c = pm.getCreature(id);
        assertEq(c.atk, 85);
        assertEq(c.spd, 5);
    }

    function test_mint_incrementsIds() public {
        assertEq(_mint(alice, "a"), 0);
        assertEq(_mint(alice, "b"), 1);
        assertEq(pm.nextId(), 2);
    }

    function testFuzz_mint_validBuildsAlwaysSum100(uint16 atk, uint16 def, uint16 hp) public {
        atk = uint16(bound(atk, 5, 85));
        def = uint16(bound(def, 5, 85));
        hp = uint16(bound(hp, 5, 85));
        uint256 used = uint256(atk) + def + hp;
        vm.assume(used + 5 <= 100 && used + 85 >= 100); // spd entre 5 y 85
        uint16 spd = uint16(100 - used);
        vm.assume(spd >= 5);

        vm.prank(alice);
        uint256 id = pm.mintCreature{value: FEE}(GLB, atk, def, hp, spd);
        PromptMon.Creature memory c = pm.getCreature(id);
        assertEq(uint256(c.atk) + c.def + c.hp + c.spd, 100);
    }

    // ---------------------------- challenges ------------------------------- //

    function test_createChallenge_locks() public {
        uint256 id = _mint(alice, "a");
        vm.prank(alice);
        uint256 cid = pm.createChallenge(id);
        assertEq(cid, 0);
        assertTrue(pm.locked(id));
        assertEq(pm.getOpenChallenges().length, 1);
    }

    function test_createChallenge_revertsIfNotOwner() public {
        uint256 id = _mint(alice, "a");
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(PromptMon.NotCreatureOwner.selector, id));
        pm.createChallenge(id);
    }

    function test_lockedCannotTransfer() public {
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
        pm.cancelChallenge(cid);
        vm.stopPrank();
        assertFalse(pm.locked(id));
        assertEq(pm.getOpenChallenges().length, 0);
    }

    // --------------------- flujo de conquista (core) ----------------------- //

    function test_acceptChallenge_fullConquestFlow() public {
        // alice: build ofensivo fuerte; bob: débil → alice debería ganar
        vm.prank(alice);
        uint256 idA = pm.mintCreature{value: FEE}("alice", 85, 5, 5, 5);
        vm.prank(bob);
        uint256 idB = pm.mintCreature{value: FEE}("bob", 5, 85, 5, 5);

        vm.prank(alice);
        uint256 cid = pm.createChallenge(idA);

        vm.prank(bob);
        pm.acceptChallenge(cid, idB);

        // locks liberados, sin desafíos abiertos
        assertFalse(pm.locked(idA));
        assertFalse(pm.locked(idB));
        assertEq(pm.getOpenChallenges().length, 0);

        // el ganador es dueño de ambos NFTs
        address ownerA = pm.ownerOf(idA);
        address ownerB = pm.ownerOf(idB);
        assertTrue(
            (ownerA == alice && ownerB == alice) || (ownerA == bob && ownerB == bob),
            "ganador posee ambos"
        );

        uint256 winnerId = (ownerA == alice) ? idA : idB;
        assertEq(pm.getCreature(winnerId).level, 2);
        assertEq(pm.getCreature(winnerId).wins, 1);
        // al subir de nivel 1→2 gana 10 puntos sin asignar
        assertEq(pm.unspentPoints(winnerId), 10);
    }

    // ------------------------ puntos + allocate ---------------------------- //

    function test_allocate_addsToStatsAndConsumesPoints() public {
        // alice gana → 10 puntos
        vm.prank(alice);
        uint256 idA = pm.mintCreature{value: FEE}("a", 85, 5, 5, 5);
        vm.prank(bob);
        uint256 idB = pm.mintCreature{value: FEE}("b", 5, 5, 85, 5);
        vm.prank(alice);
        uint256 cid = pm.createChallenge(idA);
        vm.prank(bob);
        pm.acceptChallenge(cid, idB);

        address winner = pm.ownerOf(idA);
        uint256 wid = (winner == alice) ? idA : idB;
        vm.assertEq(pm.unspentPoints(wid), 10);

        PromptMon.Creature memory before = pm.getCreature(wid);
        vm.prank(winner);
        pm.allocate(wid, 6, 2, 1, 1); // 10 puntos

        PromptMon.Creature memory aft = pm.getCreature(wid);
        assertEq(aft.atk, before.atk + 6);
        assertEq(aft.def, before.def + 2);
        assertEq(aft.hp, before.hp + 1);
        assertEq(aft.spd, before.spd + 1);
        assertEq(pm.unspentPoints(wid), 0);
    }

    function test_allocate_revertsIfOverBudget() public {
        // dar puntos a alice
        vm.prank(alice);
        uint256 idA = pm.mintCreature{value: FEE}("a", 85, 5, 5, 5);
        vm.prank(bob);
        uint256 idB = pm.mintCreature{value: FEE}("b", 5, 5, 85, 5);
        vm.prank(alice);
        uint256 cid = pm.createChallenge(idA);
        vm.prank(bob);
        pm.acceptChallenge(cid, idB);
        address winner = pm.ownerOf(idA);
        uint256 wid = (winner == alice) ? idA : idB;

        vm.prank(winner);
        vm.expectRevert(abi.encodeWithSelector(PromptMon.NotEnoughPoints.selector, uint16(10), uint256(11)));
        pm.allocate(wid, 11, 0, 0, 0);
    }

    function test_allocate_revertsIfNotOwner() public {
        uint256 id = _mint(alice, "a");
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(PromptMon.NotCreatureOwner.selector, id));
        pm.allocate(id, 1, 0, 0, 0);
    }

    function test_allocate_revertsIfNothing() public {
        uint256 id = _mint(alice, "a");
        vm.prank(alice);
        vm.expectRevert(PromptMon.NothingToAllocate.selector);
        pm.allocate(id, 0, 0, 0, 0);
    }

    function test_pointsDecreasePerLevel() public {
        // simular varias victorias de la misma criatura: 10, 8, 6, 4, 2...
        vm.prank(alice);
        uint256 champ = pm.mintCreature{value: FEE}("champ", 85, 5, 5, 5);

        uint16[5] memory expected = [uint16(10), 8, 6, 4, 2];
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(bob);
            uint256 prey = pm.mintCreature{value: FEE}(
                string(abi.encodePacked("prey", vm.toString(i))), 5, 5, 85, 5
            );
            vm.prank(bob);
            uint256 cid = pm.createChallenge(prey);
            vm.prank(alice);
            pm.acceptChallenge(cid, champ);
            // champ debe ganar siempre (build fuerte) y acumular puntos
            assertEq(pm.ownerOf(champ), alice, "champ deberia ganar");
            // gastar los puntos para chequear el monto exacto de esta ronda
            uint16 got = pm.unspentPoints(champ);
            assertEq(got, expected[i], "puntos de la ronda");
            vm.prank(alice);
            pm.allocate(champ, got, 0, 0, 0);
        }
    }

    function test_acceptChallenge_revertsOnClosed() public {
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

    function test_acceptChallenge_revertsIfAccepterLocked() public {
        uint256 idA = _mint(alice, "a");
        uint256 idB = _mint(bob, "b");
        vm.prank(alice);
        uint256 cidA = pm.createChallenge(idA);
        vm.prank(bob);
        pm.createChallenge(idB);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(PromptMon.CreatureLocked.selector, idB));
        pm.acceptChallenge(cidA, idB);
    }

    // ------------------------------- views --------------------------------- //

    function test_getCreature_revertsForNonexistent() public {
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, 99));
        pm.getCreature(99);
    }
}
