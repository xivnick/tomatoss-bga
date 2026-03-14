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

        this.game.renderState(args);
        this.game.bindTomatoSlotClicks(isCurrentPlayerActive);

        if (!isCurrentPlayerActive) {
            return;
        }

        const remaining = args.placementsRemaining ?? 0;
        this.game.setStateNote(_('Placements remaining: ${count}').replace('${count}', remaining));
    }

    onLeavingState() {
        this.game.unbindTomatoSlotClicks();
        this.bga.statusBar.removeActionButtons();
        this.game.setStateNote('');
    }
}

class ResolveBonus {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }

    onEnteringState(args) {
        this.game.renderState(args);
        this.bga.statusBar.setTitle(_('Resolving bonus'));
    }
}

class DiscardDown {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        this.game.renderState(args);
        this.bga.statusBar.setTitle(isCurrentPlayerActive
            ? _('${you} must discard down to the hand limit')
            : _('${actplayer} must discard down to the hand limit')
        );

        if (!isCurrentPlayerActive) {
            return;
        }

        const fallbackCard = Array.isArray(args.playerHand) && args.playerHand.length > 0 ? args.playerHand[0] : null;
        if (fallbackCard) {
            this.bga.statusBar.addActionButton(
                _('Discard one card'),
                () => this.bga.actions.performAction('actDiscardCard', { cardValue: fallbackCard.value })
            );
        }
    }

    onLeavingState() {
        this.bga.statusBar.removeActionButtons();
    }
}

export class Game {
    constructor(bga) {
        this.bga = bga;
        this.boundTomatoClicks = [];

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

        this.renderState(gamedatas);
        this.setupNotifications();
    }

    setStateNote(text) {
        const note = document.getElementById('tomatoss-state-note');
        if (note) {
            note.textContent = text;
        }
    }

    renderState(source) {
        const data = {
            boardTomatoes: source.boardTomatoes ?? this.gamedatas.boardTomatoes ?? [null, null, null],
            boardTargets: source.boardTargets ?? this.gamedatas.boardTargets ?? [null, null, null],
            playerHand: source.playerHand ?? this.gamedatas.playerHand ?? [],
        };

        this.gamedatas.boardTomatoes = data.boardTomatoes;
        this.gamedatas.boardTargets = data.boardTargets;
        this.gamedatas.playerHand = data.playerHand;

        this.renderTomatoSlots(data.boardTomatoes);
        this.renderTargetSlots(data.boardTargets);
        this.renderHand(data.playerHand);
    }

    renderTomatoSlots(slots) {
        const tomatoSlots = document.getElementById('tomato-slots');
        tomatoSlots.innerHTML = `
            <h3>Tomatoes</h3>
            <div class="slot-row">
                ${slots.map((slot, index) => `
                    <button class="slot tomato-slot" data-slot="${index}" ${slot ? '' : 'disabled'}>
                        ${slot ? slot.value : '-'}
                    </button>
                `).join('')}
            </div>
        `;
    }

    renderTargetSlots(slots) {
        const targetSlots = document.getElementById('target-slots');
        targetSlots.innerHTML = `
            <h3>Targets</h3>
            <div class="target-grid">
                ${slots.map((slot, index) => `
                    <div class="target-card ${slot ? '' : 'is-empty'}" data-slot="${index}">
                        ${slot ? `<div class="target-desc">${slot.desc}</div><div class="target-score">${slot.base} / ${slot.toss}</div>` : '-'}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderHand(cards) {
        const handArea = document.getElementById('hand-area');
        handArea.innerHTML = `
            <h3>Your hand</h3>
            <div class="card-row">
                ${cards.map(card => `<div class="hand-card" data-card-id="${card.id}">${card.value}</div>`).join('')}
            </div>
        `;
    }

    bindTomatoSlotClicks(isCurrentPlayerActive) {
        this.unbindTomatoSlotClicks();
        if (!isCurrentPlayerActive) {
            return;
        }

        document.querySelectorAll('.tomato-slot').forEach(button => {
            const handler = () => {
                const slot = Number(button.dataset.slot);
                this.bga.actions.performAction('actCollectTomato', { slot });
            };
            button.addEventListener('click', handler);
            this.boundTomatoClicks.push({ button, handler });
        });
    }

    unbindTomatoSlotClicks() {
        this.boundTomatoClicks.forEach(({ button, handler }) => button.removeEventListener('click', handler));
        this.boundTomatoClicks = [];
    }

    setupNotifications() {
        this.bga.notifications.setupPromiseNotifications({});
    }

    async notif_turnAction(args) {
        if (args.collected && args.refill !== undefined) {
            const slotIndex = Number(args.slot_no) - 1;
            this.gamedatas.playerHand = [...this.gamedatas.playerHand, args.collected];
            this.gamedatas.boardTomatoes = [...this.gamedatas.boardTomatoes];
            this.gamedatas.boardTomatoes[slotIndex] = args.refill;
            this.renderState(this.gamedatas);
        }
    }
}
