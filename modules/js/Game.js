/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * tomatoss implementation : © <Your name here> <Your email address here>
 * -----
 */

const BOARD_TOKEN_SLOTS = [
    { space: 3, left: 20.4, top: 22.3, side: 'target' },
    { space: 4, left: 51.2, top: 22.3, side: 'target' },
    { space: 5, left: 82.3, top: 22.3, side: 'target' },
    { space: 0, left: 7.7, top: 63.2, side: 'tomato' },
    { space: 1, left: 39.2, top: 63.2, side: 'tomato' },
    { space: 2, left: 70.8, top: 63.2, side: 'tomato' },
];

class PlayerTurn {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        this.game.renderState(args);
        this.game.bindPlayerTurnInteractions(isCurrentPlayerActive);

        if (!isCurrentPlayerActive) {
            this.bga.statusBar.setTitle(_('${actplayer} must place a tomato token'));
            return;
        }

        this.game.renderTurnModeButtons();
        this.game.updateTurnPrompt();
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
        this.tossMode = 'normal';

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
                <div id="festival-stage">
                    <div id="mission-row" class="festival-card-row"></div>
                    <div id="festival-board">
                        <div id="festival-slot-layer"></div>
                        <div id="festival-token-layer"></div>
                    </div>
                    <div id="tomato-row" class="festival-card-row"></div>
                </div>
                <div id="turn-token-tray"></div>
                <div id="hand-area"></div>
            </div>
        `);

        Object.values(this.gamedatas.players).forEach(player => {
            this.bga.playerPanels.getElement(player.id).insertAdjacentHTML('beforeend', `
                <div class="player-board-panel" id="player-board-panel-${player.id}">
                    <div class="captured-strip left" id="captured-left-${player.id}"></div>
                    <div class="captured-strip right" id="captured-right-${player.id}"></div>
                    <div class="basket-anchor" id="basket-anchor-${player.id}"></div>
                </div>
            `);
        });

        this.renderState(gamedatas);
        this.setupNotifications();
    }

    renderTurnModeButtons() {
        this.bga.statusBar.removeActionButtons();
        this.bga.statusBar.addActionButton(_('Normal toss'), () => {
            this.tossMode = 'normal';
            this.updateTurnPrompt();
        });
        this.bga.statusBar.addActionButton(_('Quick toss'), () => {
            this.tossMode = 'quick';
            this.updateTurnPrompt();
        });
        this.bga.statusBar.addActionButton(_('Clear selection'), () => this.clearSelection(), { color: 'secondary' });
    }

    updateTurnPrompt() {
        const remaining = Number(this.gamedatas.placementsRemaining ?? 0);
        this.bga.statusBar.setTitle(_('${you} must place a tomato token'));
        this.setStateNote(`Placements remaining: ${remaining} | Toss mode: ${this.tossMode === 'quick' ? 'Quick' : 'Normal'}`);
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
        const data = {
            players: source.players ?? this.gamedatas.players ?? {},
            boardTomatoes: source.boardTomatoes ?? this.gamedatas.boardTomatoes ?? [null, null, null],
            boardTargets: source.boardTargets ?? this.gamedatas.boardTargets ?? [null, null, null],
            playerHand: source.playerHand ?? this.gamedatas.playerHand ?? [],
            currentTurnActions: source.currentTurnActions ?? this.gamedatas.currentTurnActions ?? [],
            placementsRemaining: source.placementsRemaining ?? this.gamedatas.placementsRemaining ?? 3,
            capturedTargetsByPlayer: source.capturedTargetsByPlayer ?? this.gamedatas.capturedTargetsByPlayer ?? {},
        };

        this.gamedatas.players = data.players;
        this.gamedatas.boardTomatoes = data.boardTomatoes;
        this.gamedatas.boardTargets = data.boardTargets;
        this.gamedatas.playerHand = data.playerHand;
        this.gamedatas.currentTurnActions = data.currentTurnActions;
        this.gamedatas.placementsRemaining = data.placementsRemaining;
        this.gamedatas.capturedTargetsByPlayer = data.capturedTargetsByPlayer;

        this.renderMissionRow(data.boardTargets);
        this.renderFestivalBoard(data.currentTurnActions);
        this.renderTomatoRow(data.boardTomatoes);
        this.renderTokenTray(data.placementsRemaining);
        this.renderHand(data.playerHand);
        this.renderPlayerPanels();
    }

    missionSpriteStyle(targetId, scale) {
        const width = 315 * scale;
        const height = 440 * scale;
        const col = (targetId - 1) % 6;
        const row = Math.floor((targetId - 1) / 6);
        return `
            width:${width}px;
            height:${height}px;
            background-image:url('img/mission_cards.png');
            background-repeat:no-repeat;
            background-size:${1890 * scale}px ${2200 * scale}px;
            background-position:-${col * width}px -${row * height}px;
        `;
    }

    tomatoCardSpriteStyle(value, scale) {
        const width = 310 * scale;
        const height = 440 * scale;
        return `
            width:${width}px;
            height:${height}px;
            background-image:url('img/tomato_cards.png');
            background-repeat:no-repeat;
            background-size:${2170 * scale}px ${440 * scale}px;
            background-position:-${(value - 1) * width}px 0;
        `;
    }

    renderMissionRow(targets) {
        const row = document.getElementById('mission-row');
        row.innerHTML = targets.map((target, index) => `
            <div class="festival-card-slot target ${target ? '' : 'is-empty'}">
                ${target ? `<div class="mission-card-large" data-slot="${index}" style="${this.missionSpriteStyle(Number(target.targetId), 0.4)}"></div>` : '<div class="festival-card-slot__empty">-</div>'}
            </div>
        `).join('');
    }

    renderTomatoRow(tomatoes) {
        const row = document.getElementById('tomato-row');
        row.innerHTML = tomatoes.map((card, index) => `
            <div class="festival-card-slot tomato ${card ? '' : 'is-empty'}">
                ${card ? `<div class="tomato-card-large" data-slot="${index}" style="${this.tomatoCardSpriteStyle(Number(card.value), 0.28)}"></div>` : '<div class="festival-card-slot__empty">-</div>'}
            </div>
        `).join('');
    }

    renderFestivalBoard(actions) {
        const slotLayer = document.getElementById('festival-slot-layer');
        const tokenLayer = document.getElementById('festival-token-layer');

        slotLayer.innerHTML = BOARD_TOKEN_SLOTS.map(slot => `
            <button
                class="board-token-slot ${slot.side}"
                data-space="${slot.space}"
                style="left:${slot.left}%; top:${slot.top}%;">
            </button>
        `).join('');

        tokenLayer.innerHTML = actions.map((action, index) => {
            const slot = BOARD_TOKEN_SLOTS.find(item => Number(item.space) === Number(action.space));
            if (!slot) {
                return '';
            }

            const tokenType = action.actionKind === 'collect' ? 'whole' : 'splat';
            return `
                <div class="placed-token ${tokenType}" style="left:${slot.left}%; top:${slot.top}%;">
                    <div class="placed-token__index">${index + 1}</div>
                </div>
            `;
        }).join('');
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
                ${cards.map(card => `
                    <button class="hand-card ${this.selectedCardIds.includes(card.id) ? 'is-selected' : ''}" data-card-id="${card.id}" data-value="${card.value}">
                        <div class="hand-card__art" style="${this.tomatoCardSpriteStyle(Number(card.value), 0.3)}"></div>
                    </button>
                `).join('')}
            </div>
        `;
    }

    renderPlayerPanels() {
        const capturedByPlayer = this.gamedatas.capturedTargetsByPlayer ?? {};
        Object.values(this.gamedatas.players).forEach(player => {
            const basketAnchor = document.getElementById(`basket-anchor-${player.id}`);
            const leftStrip = document.getElementById(`captured-left-${player.id}`);
            const rightStrip = document.getElementById(`captured-right-${player.id}`);
            const captured = capturedByPlayer[player.id] ?? { normal: [], quick: [] };

            if (basketAnchor) {
                basketAnchor.innerHTML = `<div class="basket-token ${player.basketFull ? 'full' : 'empty'}"></div>`;
            }

            if (leftStrip) {
                leftStrip.innerHTML = captured.normal.map((card, index) => `
                    <div class="captured-mission normal" style="${this.missionSpriteStyle(Number(card.targetId), 0.17)} left:${index * 16}px;"></div>
                `).join('');
            }

            if (rightStrip) {
                rightStrip.innerHTML = captured.quick.map((card, index) => `
                    <div class="captured-mission quick" style="${this.missionSpriteStyle(Number(card.targetId), 0.17)} right:${index * 16}px;"></div>
                `).join('');
            }
        });
    }

    bindPlayerTurnInteractions(isCurrentPlayerActive) {
        this.unbindInteractions();
        if (!isCurrentPlayerActive) {
            return;
        }

        document.querySelectorAll('.board-token-slot').forEach(button => {
            const handler = () => {
                const space = Number(button.dataset.space);
                if (space < 3) {
                    this.bga.actions.performAction('actCollectTomato', { slot: space });
                } else {
                    this.bga.actions.performAction('actTossToTarget', {
                        slot: space,
                        cardsJson: JSON.stringify(this.selectedCardIds),
                        quickToss: this.tossMode === 'quick',
                    });
                }
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
        const actionKind = args.collected ? 'collect' : (args.quickToss ? 'quick_toss' : 'normal_toss');
        const actualSpace = args.collected ? Number(args.slot_no) - 1 : Number(args.slot_no) + 2;
        this.appendTurnAction(actualSpace, actionKind);

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
            if (args.capturedTargetsByPlayer) {
                this.gamedatas.capturedTargetsByPlayer = args.capturedTargetsByPlayer;
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
