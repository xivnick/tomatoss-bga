/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * tomatoss implementation : © <Your name here> <Your email address here>
 * -----
 */

const SLOT_LAYOUT = [
    { side: 'target', left: 17.8, top: 22.0 },
    { side: 'target', left: 50.0, top: 22.0 },
    { side: 'target', left: 82.2, top: 22.0 },
    { side: 'tomato', left: 6.5, top: 62.5 },
    { side: 'tomato', left: 39.0, top: 62.5 },
    { side: 'tomato', left: 71.5, top: 62.5 },
];

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
        this.game.bindPlayerTurnInteractions(isCurrentPlayerActive);

        if (!isCurrentPlayerActive) {
            return;
        }

        const remaining = args.placementsRemaining ?? 0;
        this.game.setStateNote(_('Placements remaining: ${count}').replace('${count}', remaining));
        this.bga.statusBar.addActionButton(_('Clear selection'), () => this.game.clearSelection(), { color: 'secondary' });
    }

    onLeavingState() {
        this.game.unbindInteractions();
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

        this.game.bindDiscardInteractions(isCurrentPlayerActive);
    }

    onLeavingState() {
        this.game.unbindInteractions();
        this.bga.statusBar.removeActionButtons();
    }
}

export class Game {
    constructor(bga) {
        this.bga = bga;
        this.boundInteractions = [];
        this.selectedCardIds = [];

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
                <div id="tomatoss-main-board">
                    <div id="festival-board">
                        <div id="festival-slot-layer"></div>
                        <div id="festival-token-layer"></div>
                    </div>
                    <div id="turn-token-tray"></div>
                </div>
                <div id="hand-area"></div>
            </div>
        `);

        Object.values(this.gamedatas.players).forEach(player => {
            this.bga.playerPanels.getElement(player.id).insertAdjacentHTML('beforeend', `
                <div class="player-board-summary" id="player-board-summary-${player.id}">
                    <div class="basket-status" id="basket-status-${player.id}"></div>
                    <div class="captured-count" id="captured-count-${player.id}"></div>
                </div>
            `);
        });

        this.renderState(gamedatas);
        this.setupNotifications();
    }

    setStateNote(text) {
        const note = document.getElementById('tomatoss-state-note');
        if (note) {
            note.textContent = text;
        }
    }

    clearSelection() {
        this.selectedCardIds = [];
        document.querySelectorAll('.hand-card').forEach(card => card.classList.remove('is-selected'));
    }

    renderState(source) {
        const normalizedActions = (source.currentTurnActions ?? this.gamedatas.currentTurnActions ?? []).map(action => {
            const kind = action.actionKind ?? action.action_kind ?? '';
            const rawSpace = Number(action.space);
            let normalizedSpace = rawSpace;

            if (kind === 'collect' && rawSpace < 3) {
                normalizedSpace = rawSpace + 3;
            } else if ((kind === 'normal_toss' || kind === 'quick_toss') && rawSpace >= 3) {
                normalizedSpace = rawSpace - 3;
            }

            return {
                ...action,
                space: normalizedSpace,
            };
        });

        const data = {
            players: source.players ?? this.gamedatas.players ?? {},
            boardTomatoes: source.boardTomatoes ?? this.gamedatas.boardTomatoes ?? [null, null, null],
            boardTargets: source.boardTargets ?? this.gamedatas.boardTargets ?? [null, null, null],
            playerHand: source.playerHand ?? this.gamedatas.playerHand ?? [],
            currentTurnActions: normalizedActions,
            placementsRemaining: source.placementsRemaining ?? this.gamedatas.placementsRemaining ?? 3,
        };

        this.gamedatas.players = data.players;
        this.gamedatas.boardTomatoes = data.boardTomatoes;
        this.gamedatas.boardTargets = data.boardTargets;
        this.gamedatas.playerHand = data.playerHand;
        this.gamedatas.currentTurnActions = data.currentTurnActions;
        this.gamedatas.placementsRemaining = data.placementsRemaining;

        this.renderFestivalBoard(data.boardTargets, data.boardTomatoes, data.currentTurnActions);
        this.renderTokenTray(data.placementsRemaining);
        this.renderHand(data.playerHand);
        this.renderPlayerPanels();
    }

    renderFestivalBoard(targets, tomatoes, actions) {
        const slotLayer = document.getElementById('festival-slot-layer');
        const tokenLayer = document.getElementById('festival-token-layer');

        const allSlots = [...targets, ...tomatoes];
        slotLayer.innerHTML = allSlots.map((slot, index) => {
            const layout = SLOT_LAYOUT[index];
            const classes = ['festival-slot', layout.side];
            if (!slot) {
                classes.push('is-empty');
            }

            const content = layout.side === 'target'
                ? this.renderMissionCard(slot, index)
                : this.renderTomatoCard(slot, index - 3);

            return `
                <div class="${classes.join(' ')}" data-slot="${index}" style="left:${layout.left}%; top:${layout.top}%;">
                    ${content}
                </div>
            `;
        }).join('');

        tokenLayer.innerHTML = actions.map((action, index) => {
            const slotIndex = Number(action.space);
            const layout = SLOT_LAYOUT[slotIndex];
            const tokenType = slotIndex < 3 ? 'splat' : 'whole';

            return `
                <div class="placed-token ${tokenType}" data-token-index="${index}" style="left:${layout.left + 8}%; top:${layout.top + 11}%;">
                    <div class="placed-token__index">${index + 1}</div>
                </div>
            `;
        }).join('');
    }

    renderMissionCard(slot, index) {
        if (!slot) {
            return '<div class="festival-slot__empty">-</div>';
        }

        const zeroBased = Number(slot.targetId) - 1;
        const col = zeroBased % 6;
        const row = Math.floor(zeroBased / 6);
        const posX = col * 315;
        const posY = row * 440;

        return `
            <div class="mission-card">
                <div class="mission-card__art" style="background-position:-${posX}px -${posY}px;"></div>
                <div class="mission-card__actions">
                    <button class="target-action" data-action="normal" data-slot="${index}">Toss</button>
                    <button class="target-action" data-action="quick" data-slot="${index}">Quick</button>
                </div>
            </div>
        `;
    }

    renderTomatoCard(slot, index) {
        if (!slot) {
            return '<div class="festival-slot__empty">-</div>';
        }

        const posX = Number(slot.value - 1) * 310;
        return `
            <button class="tomato-card tomato-slot" data-slot="${index}">
                <div class="tomato-card__art" style="background-position:-${posX}px 0;"></div>
            </button>
        `;
    }

    renderTokenTray(placementsRemaining) {
        const tray = document.getElementById('turn-token-tray');
        tray.innerHTML = `
            <div class="turn-token-tray__label">Remaining tokens</div>
            <div class="turn-token-tray__tokens">
                ${Array.from({ length: 3 }, (_, index) => `
                    <div class="tray-token ${index < placementsRemaining ? '' : 'is-spent'}"></div>
                `).join('')}
            </div>
        `;
    }

    renderHand(cards) {
        const handArea = document.getElementById('hand-area');
        handArea.innerHTML = `
            <h3>Your hand</h3>
            <div class="card-row">
                ${cards.map(card => {
                    const posX = Number(card.value - 1) * 310;
                    return `
                        <button class="hand-card ${this.selectedCardIds.includes(card.id) ? 'is-selected' : ''}" data-card-id="${card.id}" data-value="${card.value}">
                            <div class="hand-card__art" style="background-position:-${posX}px 0;"></div>
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderPlayerPanels() {
        Object.values(this.gamedatas.players).forEach(player => {
            const basket = document.getElementById(`basket-status-${player.id}`);
            const captured = document.getElementById(`captured-count-${player.id}`);
            if (!basket || !captured) {
                return;
            }

            basket.innerHTML = `
                <div class="basket-token ${player.basketFull ? 'full' : 'empty'}"></div>
                <span>${player.basketFull ? 'Basket full' : 'Basket empty'}</span>
            `;
            captured.textContent = `Captured targets: ${player.capturedCount}`;
        });
    }

    bindPlayerTurnInteractions(isCurrentPlayerActive) {
        this.unbindInteractions();
        if (!isCurrentPlayerActive) {
            return;
        }

        document.querySelectorAll('.tomato-slot').forEach(button => {
            const handler = () => {
                const slot = Number(button.dataset.slot);
                this.bga.actions.performAction('actCollectTomato', { slot });
            };
            button.addEventListener('click', handler);
            this.boundInteractions.push({ element: button, handler });
        });

        document.querySelectorAll('.hand-card').forEach(button => {
            const handler = () => {
                const cardId = Number(button.dataset.cardId);
                if (this.selectedCardIds.includes(cardId)) {
                    this.selectedCardIds = this.selectedCardIds.filter(id => id !== cardId);
                    button.classList.remove('is-selected');
                } else {
                    this.selectedCardIds = [...this.selectedCardIds, cardId];
                    button.classList.add('is-selected');
                }
            };
            button.addEventListener('click', handler);
            this.boundInteractions.push({ element: button, handler });
        });

        document.querySelectorAll('.target-action').forEach(button => {
            const handler = () => {
                const slot = Number(button.dataset.slot) + 3;
                const quickToss = button.dataset.action === 'quick';
                this.bga.actions.performAction('actTossToTarget', {
                    slot,
                    cardsJson: JSON.stringify(this.selectedCardIds),
                    quickToss,
                });
            };
            button.addEventListener('click', handler);
            this.boundInteractions.push({ element: button, handler });
        });
    }

    bindDiscardInteractions(isCurrentPlayerActive) {
        this.unbindInteractions();
        if (!isCurrentPlayerActive) {
            return;
        }

        document.querySelectorAll('.hand-card').forEach(button => {
            const handler = () => {
                const cardValue = Number(button.dataset.value);
                this.bga.actions.performAction('actDiscardCard', { cardValue });
            };
            button.addEventListener('click', handler);
            this.boundInteractions.push({ element: button, handler });
        });
    }

    unbindInteractions() {
        this.boundInteractions.forEach(({ element, handler }) => element.removeEventListener('click', handler));
        this.boundInteractions = [];
    }

    appendTurnAction(space, actionKind) {
        const currentTurnActions = [...(this.gamedatas.currentTurnActions ?? [])];
        currentTurnActions.push({ space, actionKind });
        this.gamedatas.currentTurnActions = currentTurnActions;
        this.gamedatas.placementsRemaining = Math.max(0, Number(this.gamedatas.placementsRemaining ?? 3) - 1);
    }

    setupNotifications() {
        this.bga.notifications.setupPromiseNotifications({});
    }

    async notif_turnAction(args) {
        this.appendTurnAction(Number(args.slot_no) - 1 + (args.collected ? 3 : 0), args.quickToss ? 'quick_toss' : (args.collected ? 'collect' : 'normal_toss'));

        if (args.collected && args.refill !== undefined) {
            const slotIndex = Number(args.slot_no) - 1;
            this.gamedatas.playerHand = [...this.gamedatas.playerHand, args.collected];
            this.gamedatas.boardTomatoes = [...this.gamedatas.boardTomatoes];
            this.gamedatas.boardTomatoes[slotIndex] = args.refill;
            this.renderState(this.gamedatas);
            return;
        }

        if (Array.isArray(args.remainingHand)) {
            const slotIndex = Number(args.slot_no) - 1;
            this.gamedatas.playerHand = args.remainingHand;
            if (args.newTarget !== undefined) {
                this.gamedatas.boardTargets = [...this.gamedatas.boardTargets];
                this.gamedatas.boardTargets[slotIndex] = args.newTarget;
            }
            const player = this.gamedatas.players?.[args.player_id];
            if (player && args.success) {
                player.capturedCount = Number(player.capturedCount ?? 0) + 1;
            }
            this.clearSelection();
            this.renderState(this.gamedatas);
        }
    }

    async notif_resolveBonus(args) {
        const player = this.gamedatas.players?.[args.player_id];
        if (player) {
            player.basketFull = args.basketFull;
        }

        if (args.bonusCard) {
            this.gamedatas.playerHand = [...this.gamedatas.playerHand, args.bonusCard];
        }

        this.renderState(this.gamedatas);
    }

    async notif_discardCard(args) {
        if (Array.isArray(args.remainingHand)) {
            this.gamedatas.playerHand = args.remainingHand;
            this.clearSelection();
            this.renderState(this.gamedatas);
        }
    }
}
