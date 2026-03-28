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

class SpriteStyles {
    getScale() {
        const board = document.getElementById('festival-board');
        if (!board) {
            return 1;
        }

        return Math.min(1, board.clientWidth / 1138);
    }

    updateBoardScale() {
        const board = document.getElementById('festival-board');
        const stage = document.getElementById('festival-stage');
        if (!board || !stage) {
            return;
        }

        stage.style.setProperty('--board-scale', String(this.getScale()));
    }

    getStageWidth() {
        const stage = document.getElementById('festival-stage');
        return stage?.clientWidth ?? 520;
    }

    getBoardCardScale(kind) {
        const targetWidth = this.getStageWidth() * (kind === 'mission' ? 0.18 : 0.175);
        const sourceWidth = kind === 'mission' ? 315 : 310;
        return targetWidth / sourceWidth;
    }

    missionCardStyle(targetId, scale) {
        const width = 315 * scale;
        const height = 440 * scale;
        const col = (targetId - 1) % 6;
        const row = Math.floor((targetId - 1) / 6);
        return `
            width:${width}px;
            height:${height}px;
            background-image:url('${g_gamethemeurl}img/mission_cards.png');
            background-repeat:no-repeat;
            background-size:${1890 * scale}px ${2200 * scale}px;
            background-position:-${col * width}px -${row * height}px;
        `;
    }

    tomatoCardStyle(value, scale) {
        return `
            width:${310 * scale}px;
            height:${440 * scale}px;
            background-image:url('${g_gamethemeurl}img/tomato_cards.png');
            background-repeat:no-repeat;
            background-size:700% 100%;
            background-position:${((value - 1) / 6) * 100}% 0;
        `;
    }

    cardBackStyle(kind, scale) {
        return `
            width:${310 * scale}px;
            height:${440 * scale}px;
            background-image:url('${g_gamethemeurl}img/card_backs.png');
            background-repeat:no-repeat;
            background-size:200% 100%;
            background-position:${kind === 'mission' ? 100 : 0}% 0;
        `;
    }
}

class FestivalStageView {
    constructor(game, sprites) {
        this.game = game;
        this.sprites = sprites;
    }

    renderAll() {
        this.sprites.updateBoardScale();
        this.renderMissionRow();
        this.renderTomatoRow();
        this.renderBoardTokens();
        this.renderDeckStrip();
    }

    renderMissionRow() {
        const scale = this.sprites.getBoardCardScale('mission');
        const cards = this.game.gamedatas.boardTargets ?? [];
        const deck = document.getElementById('mission-deck-slot');
        if (deck) {
            deck.innerHTML = `
                <div class="deck-slot stage-deck mission-deck-slot">
                    <div class="card-back mission" style="${this.sprites.cardBackStyle('mission', scale)}"></div>
                    <div class="deck-count">${this.game.gamedatas.targetDeckCount ?? 0}</div>
                </div>
            `;
        }

        cards.forEach((card, index) => {
            const slot = document.getElementById(`mission-slot-${index}`);
            if (!slot) {
                return;
            }

            slot.innerHTML = card
                ? `<button class="stage-card-action" data-space="${index + 3}"><div class="board-mission-card" style="${this.sprites.missionCardStyle(Number(card.targetId), scale)}"></div></button>`
                : '<div class="board-card-empty"></div>';
        });
    }

    renderTomatoRow() {
        const scale = this.sprites.getBoardCardScale('tomato');
        const cards = this.game.gamedatas.boardTomatoes ?? [];

        cards.forEach((card, index) => {
            const slot = document.getElementById(`tomato-slot-${index}`);
            if (!slot) {
                return;
            }

            slot.innerHTML = card
                ? `<button class="stage-card-action" data-space="${index}"><div class="board-tomato-card" style="${this.sprites.tomatoCardStyle(Number(card.value), scale)}"></div></button>`
                : '<div class="board-card-empty"></div>';
        });

        const discardSlot = document.getElementById('discard-slot');
        if (discardSlot) {
            discardSlot.innerHTML = this.game.gamedatas.latestDiscardTomato
                ? `<div class="discard-card" style="${this.sprites.tomatoCardStyle(Number(this.game.gamedatas.latestDiscardTomato.value), scale)}"></div>`
                : '<div class="board-card-empty small"></div>';
        }

        const tomatoDeck = document.getElementById('tomato-deck-slot');
        if (tomatoDeck) {
            tomatoDeck.innerHTML = `
                <div class="deck-slot stage-deck tomato-deck-slot">
                    <div class="card-back tomato" style="${this.sprites.cardBackStyle('tomato', scale)}"></div>
                    <div class="deck-count">${this.game.gamedatas.tomatoDeckCount ?? 0}</div>
                </div>
            `;
        }
    }

    renderBoardTokens() {
        const slotLayer = document.getElementById('festival-slot-layer');
        const tokenLayer = document.getElementById('festival-token-layer');
        if (!slotLayer || !tokenLayer) {
            return;
        }

        slotLayer.innerHTML = TOKEN_SLOTS.map(slot => `
            <button class="board-token-slot" data-space="${slot.space}" style="left:${slot.left}%; top:${slot.top}%"></button>
        `).join('');

        const slotCounts = new Map();
        tokenLayer.innerHTML = (this.game.gamedatas.currentTurnActions ?? []).map(action => {
            const slot = TOKEN_SLOTS.find(item => item.space === Number(action.space));
            if (!slot) {
                return '';
            }

            const stackIndex = slotCounts.get(slot.space) ?? 0;
            slotCounts.set(slot.space, stackIndex + 1);
            const kind = action.actionKind ?? action.action_kind;
            const tokenType = kind === 'collect' ? 'whole' : 'splat';
            return `<div class="placed-token ${tokenType}" style="left:${slot.left}%; top:calc(${slot.top}% - ${stackIndex * 16}px);"></div>`;
        }).join('');
    }

    renderDeckStrip() {
        const strip = document.getElementById('deck-strip');
        if (!strip) {
            return;
        }

        const remaining = Number(this.game.gamedatas.placementsRemaining ?? 0);
        strip.innerHTML = `
            <div class="turn-token-tray">
                <div class="turn-token-tray__label">Remaining tokens</div>
                <div class="turn-token-tray__tokens">
                    ${Array.from({ length: remaining }, () => '<div class="tray-token"></div>').join('')}
                </div>
            </div>
        `;
    }
}

class ThrowLogView {
    constructor(game, sprites) {
        this.game = game;
        this.sprites = sprites;
    }

    render() {
        const panel = document.getElementById('throw-log-panel');
        if (!panel) {
            return;
        }

        const actions = [...(this.game.gamedatas.currentTurnActions ?? [])].reverse();
        const lastThrow = actions.find(action => {
            const kind = action.actionKind ?? action.action_kind;
            return kind === 'normal_toss' || kind === 'quick_toss';
        });

        if (!lastThrow) {
            panel.innerHTML = '';
            panel.classList.add('is-empty');
            return;
        }

        panel.classList.remove('is-empty');
        const kind = lastThrow.actionKind ?? lastThrow.action_kind;
        const submittedCards = Array.isArray(lastThrow.cards)
            ? lastThrow.cards
            : (lastThrow.cardsJson ? JSON.parse(lastThrow.cardsJson) : []);
        const revealed = lastThrow.revealed?.value ?? lastThrow.revealedCard ?? null;
        const targetId = lastThrow.targetId ?? null;
        const score = Number(lastThrow.scoreGained ?? lastThrow.score_gained ?? 0);
        const success = score > 0;

        panel.innerHTML = `
            <div class="throw-log__label">Last throw</div>
            <div class="throw-log__row">
                ${targetId ? `<div class="throw-log__target" style="${this.sprites.missionCardStyle(Number(targetId), 0.16)}"></div>` : '<div class="board-card-empty small"></div>'}
                <div class="throw-log__cards">
                    <div class="throw-log__group">
                        <span class="throw-log__group-label">${kind === 'quick_toss' ? 'Quick' : 'Normal'}</span>
                        <div class="throw-log__fan">
                            ${submittedCards.length > 0
                                ? submittedCards.map(value => `<div class="throw-log__tomato" style="${this.sprites.tomatoCardStyle(Number(value), 0.13)}"></div>`).join('')
                                : '<div class="throw-log__empty">0</div>'}
                        </div>
                    </div>
                    <div class="throw-log__group">
                        <span class="throw-log__group-label">Reveal</span>
                        <div class="throw-log__fan">
                            ${revealed
                                ? `<div class="throw-log__tomato reveal" style="${this.sprites.tomatoCardStyle(Number(revealed), 0.13)}"></div>`
                                : '<div class="throw-log__empty">-</div>'}
                        </div>
                    </div>
                </div>
                <div class="throw-log__result ${success ? 'is-success' : 'is-fail'}">${success ? `+${score}` : 'Fail'}</div>
            </div>
        `;
    }
}

class HandView {
    constructor(game, sprites) {
        this.game = game;
        this.sprites = sprites;
    }

    render() {
        const handArea = document.getElementById('hand-area');
        if (!handArea) {
            return;
        }

        handArea.innerHTML = `
            <h3>Your hand</h3>
            <div class="hand-row">
                ${(this.game.gamedatas.playerHand ?? []).map(card => `
                    <button class="hand-card ${this.game.selectedCardIds.includes(card.id) ? 'is-selected' : ''}" data-card-id="${card.id}" data-value="${card.value}">
                        <div class="hand-card__art" style="${this.sprites.tomatoCardStyle(Number(card.value), 0.17)}"></div>
                    </button>
                `).join('')}
            </div>
        `;
    }
}

class PlayerZonesView {
    constructor(game, sprites) {
        this.game = game;
        this.sprites = sprites;
    }

    setup() {
        const playerZones = document.getElementById('player-zones');
        if (!playerZones) {
            return;
        }

        document.querySelectorAll('.player-board-summary').forEach(element => element.remove());
        document.querySelectorAll('.tomatoss-player-zone').forEach(element => {
            if (element.closest('#player-zones') === null) {
                element.remove();
            }
        });

        Object.values(this.game.gamedatas.players ?? {}).forEach(player => {
            const isSelf = Number(player.id) === Number(globalThis.player_id ?? this.game.bga.player_id);
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
    }

    renderAll() {
        Object.values(this.game.gamedatas.players ?? {}).forEach(player => this.renderPlayer(player.id));
    }

    renderPlayer(playerId) {
        const player = this.game.gamedatas.players?.[playerId];
        if (!player) {
            return;
        }

        const basketAnchor = document.getElementById(`basket-anchor-${playerId}`);
        if (basketAnchor) {
            basketAnchor.innerHTML = `<div class="basket-token ${player.basketFull ? 'full' : 'empty'}"></div>`;
        }

        this.renderHandStack(playerId);
        this.renderCapturedTargets(playerId);
    }

    renderHandStack(playerId) {
        const handStack = document.getElementById(`player-hand-stack-${playerId}`);
        if (!handStack) {
            return;
        }

        const count = this.game.gamedatas.handCountsByPlayer?.[playerId] ?? 0;
        handStack.innerHTML = `
            <div class="player-hand-fan">
                ${Array.from({ length: count }, (_, index) => `
                    <div class="player-hand-back" style="${this.sprites.cardBackStyle('tomato', 0.12)} margin-left:${index === 0 ? 0 : -16}px;"></div>
                `).join('')}
            </div>
            <div class="player-hand-count">${count}</div>
        `;
    }

    renderCapturedTargets(playerId) {
        const normal = document.getElementById(`captured-normal-${playerId}`);
        const quick = document.getElementById(`captured-quick-${playerId}`);
        const playerBoard = document.getElementById(`player-board-${playerId}`);
        const zone = document.getElementById(`player-zone-${playerId}`);
        const captured = this.game.gamedatas.capturedTargetsByPlayer?.[playerId] ?? { normal: [], quick: [] };
        const scale = (playerBoard?.clientWidth ?? 148) / 440;

        zone?.style.setProperty('--player-zone-scale', String(scale));

        if (normal) {
            normal.innerHTML = captured.normal.map((card, index) => `
                <div class="captured-mission normal" style="${this.sprites.missionCardStyle(Number(card.targetId), scale)} right:${index * 96 * scale}px; z-index:${captured.normal.length - index};"></div>
            `).join('');
        }

        if (quick) {
            quick.innerHTML = captured.quick.map((card, index) => `
                <div class="captured-mission quick" style="${this.sprites.missionCardStyle(Number(card.targetId), scale)} left:${index * 96 * scale}px; z-index:${captured.quick.length - index};"></div>
            `).join('');
        }
    }
}

class PlayerTurn {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        this.game.currentUiMode = 'playerTurn';
        this.game.isCurrentPlayerActive = isCurrentPlayerActive;
        this.game.renderState(args);
        this.game.bindPlayerTurnInteractions(isCurrentPlayerActive);
        this.game.setStateNote(isCurrentPlayerActive ? 'Select cards, then click a top throw slot or bottom collect slot.' : '');
    }

    onLeavingState() {
        this.game.currentUiMode = null;
        this.game.isCurrentPlayerActive = false;
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
        this.game.currentUiMode = null;
        this.game.isCurrentPlayerActive = false;
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
        this.game.currentUiMode = 'discard';
        this.game.isCurrentPlayerActive = isCurrentPlayerActive;
        this.game.renderState(args);
        this.game.bindDiscardInteractions(isCurrentPlayerActive);
        this.game.setStateNote(isCurrentPlayerActive ? 'Discard a tomato card from your hand.' : '');
    }

    onLeavingState() {
        this.game.currentUiMode = null;
        this.game.isCurrentPlayerActive = false;
        this.game.unbindInteractions();
        this.bga.statusBar.removeActionButtons();
    }
}

export class Game {
    constructor(bga) {
        this.bga = bga;
        this.boundInteractions = [];
        this.selectedCardIds = [];
        this.currentUiMode = null;
        this.isCurrentPlayerActive = false;

        this.sprites = new SpriteStyles();
        this.stageView = new FestivalStageView(this, this.sprites);
        this.throwLogView = new ThrowLogView(this, this.sprites);
        this.handView = new HandView(this, this.sprites);
        this.playerZonesView = new PlayerZonesView(this, this.sprites);

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
                <div id="throw-log-panel"></div>
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

        this.playerZonesView.setup();
        this.renderState(gamedatas);
        this.setupNotifications();
    }

    buildRenderData(source) {
        return {
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
    }

    renderState(source) {
        this.gamedatas = { ...this.gamedatas, ...this.buildRenderData(source) };
        this.stageView.renderAll();
        this.throwLogView.render();
        this.handView.render();
        this.playerZonesView.renderAll();
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

    getThrowOptions(targetId, cardIds) {
        const values = this.getSelectedValues(cardIds);
        return {
            normal: this.targetMatches(targetId, [...values]),
            quick: [1, 2, 3, 4, 5, 6, 7].some(next => this.targetMatches(targetId, [...values, next])),
        };
    }

    getSelectedValues(cardIds) {
        const handMap = new Map((this.gamedatas.playerHand ?? []).map(card => [card.id, card.value]));
        return cardIds.map(id => handMap.get(id)).filter(value => value !== undefined);
    }

    bindPlayerTurnInteractions(isCurrentPlayerActive) {
        this.unbindInteractions();
        if (!isCurrentPlayerActive) {
            return;
        }

        document.querySelectorAll('.board-token-slot, .stage-card-action').forEach(button => {
            const handler = () => this.handleBoardSlotClick(Number(button.dataset.space));
            button.addEventListener('click', handler);
            this.boundInteractions.push({ element: button, handler });
        });

        document.querySelectorAll('.hand-card').forEach(button => {
            const handler = () => this.toggleHandSelection(button);
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

    toggleHandSelection(button) {
        const cardId = Number(button.dataset.cardId);
        if (this.selectedCardIds.includes(cardId)) {
            this.selectedCardIds = this.selectedCardIds.filter(id => id !== cardId);
            button.classList.remove('is-selected');
            return;
        }

        this.selectedCardIds = [...this.selectedCardIds, cardId];
        button.classList.add('is-selected');
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

        const target = (this.gamedatas.boardTargets ?? [])[space - 3];
        if (!target) {
            this.bga.dialogs.showMessage(_('No mission card in that slot'), 'error');
            return;
        }

        const cardIds = [...this.selectedCardIds];
        const { normal, quick } = this.getThrowOptions(Number(target.targetId), cardIds);

        if (normal) {
            this.performToss(space, cardIds, false);
            return;
        }

        if (quick) {
            this.performToss(space, cardIds, true);
            return;
        }

        this.bga.dialogs.showMessage(_('Select a valid set of tomato cards for this throw slot'), 'error');
    }

    performToss(space, cardIds, quickToss) {
        this.bga.actions.performAction('actTossToTarget', {
            slot: space,
            cardsJson: JSON.stringify(cardIds),
            quickToss,
        });
    }

    refreshInteractions() {
        if (this.currentUiMode === 'playerTurn') {
            this.bindPlayerTurnInteractions(this.isCurrentPlayerActive);
            return;
        }

        if (this.currentUiMode === 'discard') {
            this.bindDiscardInteractions(this.isCurrentPlayerActive);
        }
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

    setupNotifications() {
        this.bga.notifications.setupPromiseNotifications({});
    }

    pushTurnAction(action) {
        this.gamedatas.currentTurnActions = [...(this.gamedatas.currentTurnActions ?? []), action];
        this.gamedatas.placementsRemaining = Math.max(0, Number(this.gamedatas.placementsRemaining ?? 3) - 1);
    }

    updateHandCount(playerId, handCount) {
        if (playerId === undefined || handCount === undefined) {
            return;
        }

        this.gamedatas.handCountsByPlayer = {
            ...(this.gamedatas.handCountsByPlayer ?? {}),
            [playerId]: handCount,
        };
    }

    applyCollectAction(args) {
        const slotIndex = Number(args.slot_no) - 1;
        this.gamedatas.boardTomatoes = [...(this.gamedatas.boardTomatoes ?? [])];
        this.gamedatas.boardTomatoes[slotIndex] = args.refill;
        this.gamedatas.tomatoDeckCount = args.tomatoDeckCount ?? this.gamedatas.tomatoDeckCount;
        this.updateHandCount(
            args.player_id,
            args.handCount ?? ((this.gamedatas.handCountsByPlayer?.[args.player_id] ?? 0) + 1),
        );
    }

    applyThrowAction(args) {
        const slotIndex = Number(args.slot_no) - 1;
        this.gamedatas.boardTargets = [...(this.gamedatas.boardTargets ?? [])];
        if (args.newTarget !== undefined) {
            this.gamedatas.boardTargets[slotIndex] = args.newTarget;
        }
        this.gamedatas.capturedTargetsByPlayer = args.capturedTargetsByPlayer ?? this.gamedatas.capturedTargetsByPlayer;
        this.gamedatas.tomatoDeckCount = args.tomatoDeckCount ?? this.gamedatas.tomatoDeckCount;
        this.gamedatas.targetDeckCount = args.targetDeckCount ?? this.gamedatas.targetDeckCount;
        this.gamedatas.latestDiscardTomato = args.latestDiscardTomato ?? this.gamedatas.latestDiscardTomato;
        this.updateHandCount(args.player_id, args.handCount ?? (this.gamedatas.handCountsByPlayer?.[args.player_id] ?? 0));
    }

    async notif_turnAction(args) {
        const isCollect = Number(args.slot_no) <= 3 && Object.prototype.hasOwnProperty.call(args, 'refill');
        this.pushTurnAction({
            space: isCollect ? Number(args.slot_no) - 1 : Number(args.slot_no) + 2,
            actionKind: isCollect ? 'collect' : (args.quickToss ? 'quick_toss' : 'normal_toss'),
            cards: args.cards ?? [],
            revealed: args.revealed ?? null,
            targetId: args.targetId ?? null,
            scoreGained: args.scoreGained ?? 0,
        });

        this.stageView.renderBoardTokens();
        this.stageView.renderDeckStrip();

        if (isCollect) {
            this.applyCollectAction(args);
            this.stageView.renderTomatoRow();
            this.playerZonesView.renderHandStack(args.player_id);
            this.refreshInteractions();
            return;
        }

        this.applyThrowAction(args);
        this.stageView.renderMissionRow();
        this.stageView.renderTomatoRow();
        this.throwLogView.render();
        this.playerZonesView.renderPlayer(args.player_id);
        this.refreshInteractions();
    }

    async notif_resolveBonus(args) {
        const player = this.gamedatas.players?.[args.player_id];
        if (player) {
            player.basketFull = args.basketFull;
        }

        this.updateHandCount(args.player_id, args.handCount);
        this.playerZonesView.renderPlayer(args.player_id);
    }

    async notif_discardCard(args) {
        this.gamedatas.latestDiscardTomato = args.latestDiscardTomato ?? this.gamedatas.latestDiscardTomato;
        this.updateHandCount(args.player_id, args.handCount);
        this.stageView.renderTomatoRow();
        this.playerZonesView.renderHandStack(args.player_id);
        this.refreshInteractions();
    }

    async notif_privateHandUpdate(args) {
        if (Array.isArray(args.playerHand)) {
            this.gamedatas.playerHand = args.playerHand;
            this.updateHandCount(args.player_id, args.playerHand.length);
        }

        this.clearSelection();
        this.handView.render();
        this.playerZonesView.renderHandStack(args.player_id);
        this.refreshInteractions();
    }
}
