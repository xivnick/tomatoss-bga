/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * tomatoss implementation : © <Your name here> <Your email address here>
 * -----
 */

const TOKEN_SLOTS = [
    { space: 3, left: 25.58, top: 34.37 },
    { space: 4, left: 58.20, top: 34.37 },
    { space: 5, left: 90.86, top: 34.37 },
    { space: 0, left: 9.14, top: 65.79 },
    { space: 1, left: 41.85, top: 65.79 },
    { space: 2, left: 74.51, top: 65.79 },
];

class PlayerTurn {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        this.game.renderState(args);
        this.game.bindPlayerTurnInteractions(isCurrentPlayerActive);

        if (isCurrentPlayerActive) {
            this.game.setStateNote('Select cards, then click a top throw slot or bottom collect slot.');
        } else {
            this.game.setStateNote('');
        }
    }

    onLeavingState() {
        this.game.unbindInteractions();
        this.bga.statusBar.removeActionButtons();
    }
}

class ResolveBonus {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }

    onEnteringState(args) {
        this.game.renderState(args);
        this.game.setStateNote('Resolving bonus');
    }
}

class DiscardDown {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        this.game.renderState(args);
        this.game.bindDiscardInteractions(isCurrentPlayerActive);
        this.game.setStateNote(isCurrentPlayerActive ? 'Discard a tomato card from your hand.' : '');
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
        if (this.bga.gameui && 'interface_min_width' in this.bga.gameui) {
            this.bga.gameui.interface_min_width = 600;
        }

        Object.values(this.gamedatas.players ?? {}).forEach(player => {
            const panel = this.bga.playerPanels?.getElement?.(player.id);
            if (!panel) {
                return;
            }

            panel.querySelectorAll('.player-board-summary, .tomatoss-player-zone, [id^="player-zone-"], [id^="player-board-"], [id^="basket-anchor-"], [id^="captured-normal-"], [id^="captured-quick-"], [id^="player-hand-stack-"]').forEach(element => element.remove());
        });

        this.bga.gameArea.getElement().insertAdjacentHTML('beforeend', `
            <div id="tomatoss-layout">
                <div id="tomatoss-state-note"></div>
                <div id="festival-stage">
                    <div id="festival-canvas">
                        <div id="mission-deck-slot" class="stage-slot"></div>
                        <div id="mission-slot-0" class="stage-slot"></div>
                        <div id="mission-slot-1" class="stage-slot"></div>
                        <div id="mission-slot-2" class="stage-slot"></div>
                        <div id="festival-board-wrap">
                            <div id="festival-board">
                                <div id="festival-slot-layer"></div>
                                <div id="festival-token-layer"></div>
                            </div>
                        </div>
                        <div id="discard-slot" class="stage-slot"></div>
                        <div id="tomato-slot-0" class="stage-slot"></div>
                        <div id="tomato-slot-1" class="stage-slot"></div>
                        <div id="tomato-slot-2" class="stage-slot"></div>
                        <div id="tomato-deck-slot" class="stage-slot"></div>
                        <div id="deck-strip"></div>
                    </div>
                </div>
                <div id="hand-area" class="whiteblock"></div>
                <div id="player-zones"></div>
            </div>
        `);

        const playerZones = document.getElementById('player-zones');
        document.querySelectorAll('.player-board-summary').forEach(element => element.remove());
        document.querySelectorAll('.tomatoss-player-zone').forEach(element => {
            if (element.closest('#player-zones') === null) {
                element.remove();
            }
        });
        Object.values(this.gamedatas.players).forEach(player => {
            const isSelf = Number(player.id) === Number(globalThis.player_id ?? this.bga.player_id);
            playerZones.insertAdjacentHTML('beforeend', `
                <div class="tomatoss-player-zone whiteblock ${isSelf ? 'is-self' : ''}" id="player-zone-${player.id}">
                    <div class="tomatoss-player-zone__name">${player.name ?? `P${player.id}`}</div>
                    <div class="tomatoss-player-zone__top" id="player-hand-stack-${player.id}"></div>
                    <div class="tomatoss-player-zone__bottom">
                        <div class="tomatoss-player-board" id="player-board-${player.id}">
                            <div class="basket-anchor" id="basket-anchor-${player.id}"></div>
                        </div>
                        <div class="captured-band" id="captured-band-${player.id}">
                            <div class="captured-stack normal" id="captured-normal-${player.id}"></div>
                            <div class="captured-stack quick" id="captured-quick-${player.id}"></div>
                        </div>
                    </div>
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

    updateBoardScale() {
        const board = document.getElementById('festival-board');
        const stage = document.getElementById('festival-stage');
        if (!board || !stage) {
            return;
        }

        const scale = Math.min(1, board.clientWidth / 1138);
        stage.style.setProperty('--board-scale', String(scale));
    }

    clearSelection() {
        this.selectedCardIds = [];
        document.querySelectorAll('.hand-card').forEach(card => card.classList.remove('is-selected'));
    }

    getScale() {
        const board = document.getElementById('festival-board');
        if (!board) {
            return 1;
        }

        return Math.min(1, board.clientWidth / 1138);
    }

    getStageWidth() {
        const stage = document.getElementById('festival-stage');
        return stage?.clientWidth ?? 520;
    }

    getBoardCardScale(kind) {
        const stageWidth = this.getStageWidth();
        const targetWidth = stageWidth * (kind === 'mission' ? 0.18 : 0.175);
        const sourceWidth = kind === 'mission' ? 315 : 310;
        return targetWidth / sourceWidth;
    }

    missionCardStyle(targetId, scale) {
        const w = 315 * scale;
        const h = 440 * scale;
        const col = (targetId - 1) % 6;
        const row = Math.floor((targetId - 1) / 6);
        return `
            width:${w}px;
            height:${h}px;
            background-image:url('${g_gamethemeurl}img/mission_cards.png');
            background-repeat:no-repeat;
            background-size:${1890 * scale}px ${2200 * scale}px;
            background-position:-${col * w}px -${row * h}px;
        `;
    }

    tomatoCardStyle(value, scale) {
        const w = 310 * scale;
        const h = 440 * scale;
        const position = ((value - 1) / 6) * 100;
        return `
            width:${w}px;
            height:${h}px;
            background-image:url('${g_gamethemeurl}img/tomato_cards.png');
            background-repeat:no-repeat;
            background-size:700% 100%;
            background-position:${position}% 0;
        `;
    }

    cardBackStyle(kind, scale) {
        const w = 310 * scale;
        const h = 440 * scale;
        const position = kind === 'mission' ? 100 : 0;
        return `
            width:${w}px;
            height:${h}px;
            background-image:url('${g_gamethemeurl}img/card_backs.png');
            background-repeat:no-repeat;
            background-size:200% 100%;
            background-position:${position}% 0;
        `;
    }

    renderState(source) {
        const data = {
            players: source.players ?? this.gamedatas.players ?? {},
            boardTomatoes: source.boardTomatoes ?? this.gamedatas.boardTomatoes ?? [null, null, null],
            boardTargets: source.boardTargets ?? this.gamedatas.boardTargets ?? [null, null, null],
            tomatoDeckCount: source.tomatoDeckCount ?? this.gamedatas.tomatoDeckCount ?? 0,
            targetDeckCount: source.targetDeckCount ?? this.gamedatas.targetDeckCount ?? 0,
            latestDiscardTomato: source.latestDiscardTomato ?? this.gamedatas.latestDiscardTomato ?? null,
            playerHand: source.playerHand ?? this.gamedatas.playerHand ?? [],
            handCountsByPlayer: source.handCountsByPlayer ?? this.gamedatas.handCountsByPlayer ?? {},
            currentTurnActions: source.currentTurnActions ?? this.gamedatas.currentTurnActions ?? [],
            placementsRemaining: source.placementsRemaining ?? this.gamedatas.placementsRemaining ?? 3,
            capturedTargetsByPlayer: source.capturedTargetsByPlayer ?? this.gamedatas.capturedTargetsByPlayer ?? {},
        };

        this.gamedatas = { ...this.gamedatas, ...data };
        this.updateBoardScale();

        this.renderMissionRow();
        this.renderFestivalBoard();
        this.renderTomatoRow();
        this.renderDeckStrip();
        this.renderHand();
        this.renderPlayerZones();
    }

    renderMissionRow() {
        const scale = this.getBoardCardScale('mission');
        const cards = this.gamedatas.boardTargets ?? [];
        document.getElementById('mission-deck-slot').innerHTML = `
            <div class="deck-slot stage-deck">
                <div class="card-back mission" style="${this.cardBackStyle('mission', scale)}"></div>
                <div class="deck-count">${this.gamedatas.targetDeckCount ?? 0}</div>
            </div>
        `;
        cards.forEach((card, index) => {
            const slot = document.getElementById(`mission-slot-${index}`);
            if (!slot) {
                return;
            }
            slot.innerHTML = card
                ? `<div class="board-mission-card" style="${this.missionCardStyle(Number(card.targetId), scale)}"></div>`
                : '<div class="board-card-empty"></div>';
        });
    }

    renderTomatoRow() {
        const scale = this.getBoardCardScale('tomato');
        const cards = this.gamedatas.boardTomatoes ?? [];
        cards.forEach((card, index) => {
            const slot = document.getElementById(`tomato-slot-${index}`);
            if (!slot) {
                return;
            }
            slot.innerHTML = card
                ? `<div class="board-tomato-card" style="${this.tomatoCardStyle(Number(card.value), scale)}"></div>`
                : '<div class="board-card-empty"></div>';
        });
        document.getElementById('discard-slot').innerHTML = this.gamedatas.latestDiscardTomato
            ? `<div class="discard-card" style="${this.tomatoCardStyle(Number(this.gamedatas.latestDiscardTomato.value), scale)}"></div>`
            : '<div class="board-card-empty small"></div>';
        document.getElementById('tomato-deck-slot').innerHTML = `
            <div class="deck-slot stage-deck tomato-deck-slot">
                <div class="card-back tomato" style="${this.cardBackStyle('tomato', scale)}"></div>
                <div class="deck-count">${this.gamedatas.tomatoDeckCount ?? 0}</div>
            </div>
        `;
    }

    renderFestivalBoard() {
        const slotLayer = document.getElementById('festival-slot-layer');
        const tokenLayer = document.getElementById('festival-token-layer');
        const actions = this.gamedatas.currentTurnActions ?? [];

        slotLayer.innerHTML = TOKEN_SLOTS.map(slot => `
            <button class="board-token-slot" data-space="${slot.space}" style="left:${slot.left}%; top:${slot.top}%"></button>
        `).join('');

        const slotCounts = new Map();
        tokenLayer.innerHTML = actions.map(action => {
            const slot = TOKEN_SLOTS.find(item => item.space === Number(action.space));
            if (!slot) {
                return '';
            }

            const kind = action.actionKind ?? action.action_kind;
            const tokenType = kind === 'collect' ? 'whole' : 'splat';
            const stackIndex = slotCounts.get(slot.space) ?? 0;
            slotCounts.set(slot.space, stackIndex + 1);
            return `
                <div class="placed-token ${tokenType}" style="left:${slot.left}%; top:calc(${slot.top}% - ${stackIndex * 16}px);">
                </div>
            `;
        }).join('');
    }

    renderDeckStrip() {
        const strip = document.getElementById('deck-strip');
        const remaining = Number(this.gamedatas.placementsRemaining ?? 0);
        strip.innerHTML = `
            <div class="turn-token-tray">
                <div class="turn-token-tray__label">Remaining tokens</div>
                <div class="turn-token-tray__tokens">
                    ${Array.from({ length: remaining }, () => '<div class="tray-token"></div>').join('')}
                </div>
            </div>
        `;
    }

    renderHand() {
        const scale = 0.17;
        const handArea = document.getElementById('hand-area');
        const cards = this.gamedatas.playerHand ?? [];
        handArea.innerHTML = `
            <h3>Your hand</h3>
            <div class="hand-row">
                ${cards.map(card => `
                    <button class="hand-card ${this.selectedCardIds.includes(card.id) ? 'is-selected' : ''}" data-card-id="${card.id}" data-value="${card.value}">
                        <div class="hand-card__art" style="${this.tomatoCardStyle(Number(card.value), scale)}"></div>
                    </button>
                `).join('')}
            </div>
        `;
    }

    renderPlayerZones() {
        const capturedByPlayer = this.gamedatas.capturedTargetsByPlayer ?? {};
        const handCounts = this.gamedatas.handCountsByPlayer ?? {};

        Object.values(this.gamedatas.players ?? {}).forEach(player => {
            const zone = document.getElementById(`player-zone-${player.id}`);
            const basketAnchor = document.getElementById(`basket-anchor-${player.id}`);
            const normal = document.getElementById(`captured-normal-${player.id}`);
            const quick = document.getElementById(`captured-quick-${player.id}`);
            const handStack = document.getElementById(`player-hand-stack-${player.id}`);
            const captured = capturedByPlayer[player.id] ?? { normal: [], quick: [] };

            if (basketAnchor) {
                basketAnchor.innerHTML = `<div class="basket-token ${player.basketFull ? 'full' : 'empty'}"></div>`;
            }

            if (handStack) {
                const count = handCounts[player.id] ?? 0;
                const handBackScale = 0.12;
                handStack.innerHTML = `
                    <div class="player-hand-fan">
                        ${Array.from({ length: count }, (_, index) => `
                            <div class="player-hand-back" style="${this.cardBackStyle('tomato', handBackScale)} margin-left:${index === 0 ? 0 : -16}px;"></div>
                        `).join('')}
                    </div>
                    <div class="player-hand-count">${count}</div>
                `;
            }

            const playerBoard = document.getElementById(`player-board-${player.id}`);
            const playerAreaScale = (playerBoard?.clientWidth ?? 148) / 440;
            zone?.style.setProperty('--player-zone-scale', String(playerAreaScale));

            if (normal) {
                normal.innerHTML = captured.normal.map((card, index) => `
                    <div class="captured-mission normal" style="${this.missionCardStyle(Number(card.targetId), playerAreaScale)} right:${index * 96 * playerAreaScale}px; z-index:${captured.normal.length - index};"></div>
                `).join('');
            }

            if (quick) {
                quick.innerHTML = captured.quick.map((card, index) => `
                    <div class="captured-mission quick" style="${this.missionCardStyle(Number(card.targetId), playerAreaScale)} left:${index * 96 * playerAreaScale}px; z-index:${captured.quick.length - index};"></div>
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
            const handler = () => this.handleBoardSlotClick(Number(button.dataset.space));
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
            const handler = () => this.bga.actions.performAction('actDiscardCard', { cardValue: Number(button.dataset.value) });
            button.addEventListener('click', handler);
            this.boundInteractions.push({ element: button, handler });
        });
    }

    unbindInteractions() {
        this.boundInteractions.forEach(({ element, handler }) => element.removeEventListener('click', handler));
        this.boundInteractions = [];
    }

    handleBoardSlotClick(space) {
        if (space < 3) {
            this.bga.actions.performAction('actCollectTomato', { slot: space });
            return;
        }

        const cardIds = [...this.selectedCardIds];
        const target = (this.gamedatas.boardTargets ?? [])[space - 3];
        if (!target) {
            this.bga.dialogs.showMessage(_('No mission card in that slot'), 'error');
            return;
        }

        const handMap = new Map((this.gamedatas.playerHand ?? []).map(card => [card.id, card.value]));
        const values = cardIds.map(id => handMap.get(id)).filter(value => value !== undefined);

        const normal = this.targetMatches(Number(target.targetId), [...values]);
        const quick = [1, 2, 3, 4, 5, 6, 7].some(next => this.targetMatches(Number(target.targetId), [...values, next]));

        if (normal) {
            this.bga.actions.performAction('actTossToTarget', {
                slot: space,
                cardsJson: JSON.stringify(cardIds),
                quickToss: false,
            });
            return;
        }

        if (quick) {
            this.bga.actions.performAction('actTossToTarget', {
                slot: space,
                cardsJson: JSON.stringify(cardIds),
                quickToss: true,
            });
            return;
        }

        this.bga.dialogs.showMessage(_('Select a valid set of tomato cards for this throw slot'), 'error');
    }

    targetMatches(targetId, cards) {
        const sorted = [...cards].sort((a, b) => a - b);
        const count = sorted.length;
        const sum = sorted.reduce((acc, value) => acc + value, 0);

        switch (targetId) {
            case 1:
            case 2:
                return count === 1 && sorted[0] === 3;
            case 3:
            case 4:
                return count === 2 && sorted[0] === sorted[1];
            case 5:
                return count === 3 && sorted[0] === sorted[1] && sorted[1] < sorted[2];
            case 6:
                return count === 3 && sorted[0] === sorted[1] && sorted[1] === sorted[2];
            case 7:
            case 8:
                return count === 1 && [5, 6, 7].includes(sorted[0]);
            case 9:
                return count === 1 && [1, 2].includes(sorted[0]);
            case 10:
            case 11:
                return 8 <= sum && sum <= 9;
            case 12:
                return 8 <= sum && sum <= 9 && !sorted.includes(3);
            case 13:
            case 14:
                return count === 1 && [2, 4, 6].includes(sorted[0]);
            case 15:
            case 16:
                return 6 <= sum && sum <= 8;
            case 17:
                return 6 <= sum && sum <= 8 && !sorted.includes(3);
            case 18:
                return count === 2 && sum === 10;
            case 19:
                return count === 1 && [6, 7].includes(sorted[0]);
            case 20:
            case 21:
                return count === 2 && Math.abs(sorted[0] - sorted[1]) === 1;
            case 22:
            case 23:
                return 11 <= sum && sum <= 13;
            case 24:
                return 11 <= sum && sum <= 13 && !sorted.includes(3);
            case 25:
                return count === 1 && [4, 5].includes(sorted[0]);
            case 26:
                return count === 1 && sorted[0] === 5;
            case 27:
                return 7 <= sum && sum <= 11;
            case 28:
                return 7 <= sum && sum <= 11 && !sorted.includes(3);
            case 29:
            case 30:
                return count === 2 && 4 <= Math.abs(sorted[0] - sorted[1]) && Math.abs(sorted[0] - sorted[1]) <= 6;
            default:
                return false;
        }
    }

    appendTurnAction(space, actionKind) {
        const actions = [...(this.gamedatas.currentTurnActions ?? [])];
        actions.push({ space, actionKind });
        this.gamedatas.currentTurnActions = actions;
        this.gamedatas.placementsRemaining = Math.max(0, Number(this.gamedatas.placementsRemaining ?? 3) - 1);
    }

    setupNotifications() {
        this.bga.notifications.setupPromiseNotifications({});
    }

    async notif_turnAction(args) {
        const isCollect = Number(args.slot_no) <= 3 && Object.prototype.hasOwnProperty.call(args, 'refill');
        const actualSpace = isCollect ? Number(args.slot_no) - 1 : Number(args.slot_no) + 2;
        const actionKind = isCollect ? 'collect' : (args.quickToss ? 'quick_toss' : 'normal_toss');
        this.appendTurnAction(actualSpace, actionKind);

        if (isCollect) {
            const slotIndex = Number(args.slot_no) - 1;
            this.gamedatas.boardTomatoes = [...(this.gamedatas.boardTomatoes ?? [])];
            this.gamedatas.boardTomatoes[slotIndex] = args.refill;
            this.gamedatas.tomatoDeckCount = args.tomatoDeckCount ?? this.gamedatas.tomatoDeckCount;
            this.gamedatas.handCountsByPlayer = {
                ...(this.gamedatas.handCountsByPlayer ?? {}),
                [args.player_id]: args.handCount ?? ((this.gamedatas.handCountsByPlayer?.[args.player_id] ?? 0) + 1),
            };
            this.renderState(this.gamedatas);
            return;
        }

        {
            const slotIndex = Number(args.slot_no) - 1;
            this.gamedatas.boardTargets = [...(this.gamedatas.boardTargets ?? [])];
            if (args.newTarget !== undefined) {
                this.gamedatas.boardTargets[slotIndex] = args.newTarget;
            }
            this.gamedatas.capturedTargetsByPlayer = args.capturedTargetsByPlayer ?? this.gamedatas.capturedTargetsByPlayer;
            this.gamedatas.tomatoDeckCount = args.tomatoDeckCount ?? this.gamedatas.tomatoDeckCount;
            this.gamedatas.targetDeckCount = args.targetDeckCount ?? this.gamedatas.targetDeckCount;
            this.gamedatas.latestDiscardTomato = args.latestDiscardTomato ?? this.gamedatas.latestDiscardTomato;
            this.gamedatas.handCountsByPlayer = {
                ...(this.gamedatas.handCountsByPlayer ?? {}),
                [args.player_id]: args.handCount ?? (this.gamedatas.handCountsByPlayer?.[args.player_id] ?? 0),
            };
            this.renderState(this.gamedatas);
        }
    }

    async notif_resolveBonus(args) {
        const player = this.gamedatas.players?.[args.player_id];
        if (player) {
            player.basketFull = args.basketFull;
        }

        this.gamedatas.handCountsByPlayer = {
            ...(this.gamedatas.handCountsByPlayer ?? {}),
            [args.player_id]: args.handCount ?? (this.gamedatas.handCountsByPlayer?.[args.player_id] ?? 0),
        };

        this.renderState(this.gamedatas);
    }

    async notif_discardCard(args) {
        this.gamedatas.latestDiscardTomato = args.latestDiscardTomato ?? this.gamedatas.latestDiscardTomato;
        this.gamedatas.handCountsByPlayer = {
            ...(this.gamedatas.handCountsByPlayer ?? {}),
            [args.player_id]: args.handCount ?? (this.gamedatas.handCountsByPlayer?.[args.player_id] ?? 0),
        };
        this.renderState(this.gamedatas);
    }

    async notif_privateHandUpdate(args) {
        if (Array.isArray(args.playerHand)) {
            this.gamedatas.playerHand = args.playerHand;
            this.gamedatas.handCountsByPlayer = {
                ...(this.gamedatas.handCountsByPlayer ?? {}),
                [args.player_id]: args.playerHand.length,
            };
        }

        this.clearSelection();
        this.renderState(this.gamedatas);
    }
}
