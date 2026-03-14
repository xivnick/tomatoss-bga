/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * tomatoss implementation : © <Your name here> <Your email address here>
 * -----
 */

class PlayerTurn {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        this.bga.statusBar.setTitle(isCurrentPlayerActive
            ? _('${you} must place a marker')
            : _('${actplayer} must place a marker')
        );

        if (!isCurrentPlayerActive) {
            return;
        }

        const remaining = args.placementsRemaining ?? 0;
        this.bga.statusBar.addActionButton(
            _('Collect tomato'),
            () => this.bga.actions.performAction('actCollectTomato', { slot: 0 })
        );
        this.bga.statusBar.addActionButton(
            _('Normal toss'),
            () => this.bga.actions.performAction('actTossToTarget', { slot: 3, cardsJson: '[]', quickToss: false })
        );
        this.bga.statusBar.addActionButton(
            _('Quick toss'),
            () => this.bga.actions.performAction('actTossToTarget', { slot: 3, cardsJson: '[]', quickToss: true })
        );

        this.game.setStateNote(_('Placements remaining: ${count}').replace('${count}', remaining));
    }

    onLeavingState() {
        this.bga.statusBar.removeActionButtons();
        this.game.setStateNote('');
    }
}

class ResolveBonus {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        void args;
        void isCurrentPlayerActive;
        this.bga.statusBar.setTitle(_('Resolving bonus'));
    }
}

class DiscardDown {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        this.bga.statusBar.setTitle(isCurrentPlayerActive
            ? _('${you} must discard down to the hand limit')
            : _('${actplayer} must discard down to the hand limit')
        );

        if (!isCurrentPlayerActive) {
            return;
        }

        const fallbackValue = Array.isArray(args.playerHand) && args.playerHand.length > 0 ? args.playerHand[0] : 1;
        this.bga.statusBar.addActionButton(
            _('Discard one card'),
            () => this.bga.actions.performAction('actDiscardCard', { cardValue: fallbackValue })
        );
    }

    onLeavingState() {
        this.bga.statusBar.removeActionButtons();
    }
}

export class Game {
    constructor(bga) {
        this.bga = bga;

        this.playerTurn = new PlayerTurn(this, bga);
        this.resolveBonus = new ResolveBonus(this, bga);
        this.discardDown = new DiscardDown(this, bga);

        this.bga.states.register('PlayerTurn', this.playerTurn);
        this.bga.states.register('ResolveBonus', this.resolveBonus);
        this.bga.states.register('DiscardDown', this.discardDown);
    }

    setup(gamedatas) {
        this.gamedatas = gamedatas;

        this.bga.gameArea.getElement().insertAdjacentHTML('beforeend', `
            <div id="tomatoss-layout">
                <div id="tomatoss-state-note"></div>
                <div id="tomato-slots"></div>
                <div id="target-slots"></div>
                <div id="hand-area"></div>
            </div>
        `);

        this.renderStaticState();
        this.setupNotifications();
    }

    setStateNote(text) {
        const note = document.getElementById('tomatoss-state-note');
        if (note) {
            note.textContent = text;
        }
    }

    renderStaticState() {
        const tomatoSlots = document.getElementById('tomato-slots');
        const targetSlots = document.getElementById('target-slots');
        const handArea = document.getElementById('hand-area');

        tomatoSlots.innerHTML = '<h3>Tomatoes</h3><div class="slot-row"><div class="slot">1</div><div class="slot">2</div><div class="slot">3</div></div>';
        targetSlots.innerHTML = '<h3>Targets</h3><div class="slot-row"><div class="slot">A</div><div class="slot">B</div><div class="slot">C</div></div>';
        handArea.innerHTML = `<h3>Your hand</h3><div class="hand-count">${this.gamedatas.playerHand.length} cards</div>`;
    }

    setupNotifications() {
        this.bga.notifications.setupPromiseNotifications({});
    }
}
