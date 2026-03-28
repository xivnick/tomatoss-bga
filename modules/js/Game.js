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
        return document.getElementById('festival-stage')?.clientWidth ?? 560;
    }

    getCardScale(kind) {
        const width = this.getStageWidth() * (kind === 'mission' ? 0.165 : 0.16);
        const sourceWidth = kind === 'mission' ? 157.5 : 155;
        return width / sourceWidth;
    }

    missionCardStyle(targetId, scale) {
        const width = 157.5 * scale;
        const height = 220 * scale;
        const col = (targetId - 1) % 6;
        const row = Math.floor((targetId - 1) / 6);
        return `
            width:${width}px;
            height:${height}px;
            background-image:url('${g_gamethemeurl}img/mission_cards.jpg');
            background-repeat:no-repeat;
            background-size:${945 * scale}px ${1100 * scale}px;
            background-position:-${col * width}px -${row * height}px;
        `;
    }

    tomatoCardStyle(value, scale) {
        return `
            width:${155 * scale}px;
            height:${220 * scale}px;
            background-image:url('${g_gamethemeurl}img/tomato_cards.jpg');
            background-repeat:no-repeat;
            background-size:700% 100%;
            background-position:${((value - 1) / 6) * 100}% 0;
        `;
    }

    cardBackStyle(kind, scale) {
        return `
            width:${155 * scale}px;
            height:${220 * scale}px;
            background-image:url('${g_gamethemeurl}img/card_backs.jpg');
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
        this.renderReserveTokens();
        this.renderRecentThrow();
    }

    renderMissionRow() {
        const scale = this.sprites.getCardScale('mission');
        const deck = document.getElementById('mission-deck-slot');
        if (deck) {
            deck.innerHTML = `
                <div class="deck-slot stage-deck mission-deck-slot">
                    <div class="card-back mission" style="${this.sprites.cardBackStyle('mission', scale)}"></div>
                    <div class="deck-count">${this.game.gamedatas.targetDeckCount ?? 0}</div>
                </div>
            `;
        }

        (this.game.gamedatas.boardTargets ?? []).forEach((card, index) => {
            const slot = document.getElementById(`mission-slot-${index}`);
            if (!slot) {
                return;
            }

            const pendingClass = this.game.pendingSpace === index + 3 ? 'is-pending' : '';
            slot.innerHTML = card
                ? `<button class="stage-card-action mission-slot-button ${pendingClass}" data-space="${index + 3}"><div class="board-mission-card" style="${this.sprites.missionCardStyle(Number(card.targetId), scale)}"></div></button>`
                : '<div class="board-card-empty"></div>';
        });
    }

    renderTomatoRow() {
        const scale = this.sprites.getCardScale('tomato');
        const discardSlot = document.getElementById('discard-slot');
        const deckSlot = document.getElementById('tomato-deck-slot');

        (this.game.gamedatas.boardTomatoes ?? []).forEach((card, index) => {
            const slot = document.getElementById(`tomato-slot-${index}`);
            if (!slot) {
                return;
            }

            const pendingClass = this.game.pendingSpace === index ? 'is-pending' : '';
            slot.innerHTML = card
                ? `<button class="stage-card-action tomato-slot-button ${pendingClass}" data-space="${index}"><div class="board-tomato-card" style="${this.sprites.tomatoCardStyle(Number(card.value), scale)}"></div></button>`
                : '<div class="board-card-empty"></div>';
        });

        if (discardSlot) {
            discardSlot.innerHTML = this.game.gamedatas.latestDiscardTomato
                ? `<div class="discard-card" style="${this.sprites.tomatoCardStyle(Number(this.game.gamedatas.latestDiscardTomato.value), scale)}"></div>`
                : '<div class="board-card-empty small"></div>';
        }

        if (deckSlot) {
            deckSlot.innerHTML = `
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
            <button class="board-token-slot ${this.game.pendingSpace === slot.space ? 'is-pending' : ''}" data-space="${slot.space}" style="left:${slot.left}%; top:${slot.top}%"></button>
        `).join('');

        const slotCounts = new Map();
        tokenLayer.innerHTML = (this.game.gamedatas.currentTurnActions ?? []).map(action => {
            const slot = TOKEN_SLOTS.find(item => item.space === Number(action.space));
            if (!slot) {
                return '';
            }

            const count = slotCounts.get(slot.space) ?? 0;
            slotCounts.set(slot.space, count + 1);
            const kind = action.actionKind ?? action.action_kind;
            const tokenType = kind === 'collect' ? 'whole' : 'splat';
            return `<div class="placed-token ${tokenType}" style="left:${slot.left}%; top:calc(${slot.top}% - ${count * 18}px);"></div>`;
        }).join('');
    }

    renderReserveTokens() {
        const reserve = document.getElementById('token-reserve');
        if (!reserve) {
            return;
        }

        const remaining = Number(this.game.gamedatas.placementsRemaining ?? 0);
        reserve.innerHTML = Array.from({ length: 3 }, (_, index) => {
            if (index >= remaining) {
                return '';
            }
            return `<div class="reserve-token"></div>`;
        }).join('');
    }

    renderRecentThrow() {
        const area = document.getElementById('recent-throw-area');
        const recent = this.game.recentThrow;
        if (!area) {
            return;
        }

        if (!recent) {
            area.innerHTML = '';
            area.dataset.visible = 'false';
            return;
        }

        area.dataset.visible = 'true';
        const missionScale = 0.18;
        const tomatoScale = 0.12;
        const cards = recent.cards ?? [];
        const reveal = recent.revealed ?? null;

        area.innerHTML = `
            <div class="recent-throw ${recent.success ? 'is-success' : 'is-fail'}">
                <div class="recent-throw__target" style="${this.sprites.missionCardStyle(Number(recent.targetId), missionScale)}">
                    <div class="recent-throw__cards">
                        ${cards.map((value, index) => `
                            <div class="recent-throw__tomato" style="${this.sprites.tomatoCardStyle(Number(value), tomatoScale)} left:${index * 26}px;"></div>
                        `).join('')}
                        ${reveal ? `<div class="recent-throw__tomato reveal" style="${this.sprites.tomatoCardStyle(Number(reveal), tomatoScale)} left:${cards.length * 26}px;"></div>` : ''}
                    </div>
                </div>
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

        playerZones.innerHTML = '';
        Object.values(this.game.gamedatas.players ?? {}).forEach(player => {
            const isSelf = Number(player.id) === Number(globalThis.player_id ?? this.game.bga.player_id);
            playerZones.insertAdjacentHTML('beforeend', `
                <div class="tomatoss-player-zone whiteblock ${isSelf ? 'is-self' : ''}" id="player-zone-${player.id}">
                    <div class="tomatoss-player-zone__name">${player.name ?? `P${player.id}`}</div>
                    <div class="tomatoss-player-zone__top" id="player-zone-top-${player.id}"></div>
                    <div class="tomatoss-player-zone__bottom">
                        <div class="captured-band" id="captured-band-${player.id}">
                            <div class="captured-stack normal" id="captured-normal-${player.id}"></div>
                            <div class="captured-stack quick" id="captured-quick-${player.id}"></div>
                        </div>
                        <div class="tomatoss-player-board" id="player-board-${player.id}">
                            <div class="basket-anchor" id="basket-anchor-${player.id}"></div>
                        </div>
                    </div>
                </div>
            `);
        });
    }

    renderAll() {
        Object.values(this.game.gamedatas.players ?? {}).forEach(player => this.renderPlayer(Number(player.id)));
    }

    renderPlayer(playerId) {
        const player = this.game.gamedatas.players?.[playerId];
        if (!player) {
            return;
        }

        this.renderTop(playerId);
        this.renderBoard(playerId);
        this.renderCapturedTargets(playerId);
    }

    renderTop(playerId) {
        const top = document.getElementById(`player-zone-top-${playerId}`);
        if (!top) {
            return;
        }

        const isSelf = Number(playerId) === Number(this.game.bga.player_id);
        if (isSelf) {
            const scale = this.sprites.getCardScale('tomato');
            top.innerHTML = `
                <div class="self-hand-row">
                    ${(this.game.gamedatas.playerHand ?? []).map(card => `
                        <button class="hand-card ${this.game.selectedCardIds.includes(card.id) ? 'is-selected' : ''}" data-card-id="${card.id}" data-value="${card.value}">
                            <div class="hand-card__art" style="${this.sprites.tomatoCardStyle(Number(card.value), scale)}"></div>
                        </button>
                    `).join('')}
                </div>
            `;
            return;
        }

        const count = this.game.gamedatas.handCountsByPlayer?.[playerId] ?? 0;
        top.innerHTML = `
            <div class="player-hand-fan">
                ${Array.from({ length: count }, (_, index) => `
                    <div class="player-hand-back" style="${this.sprites.cardBackStyle('tomato', 0.16)} margin-left:${index === 0 ? 0 : -24}px;"></div>
                `).join('')}
            </div>
        `;
    }

    renderBoard(playerId) {
        const player = this.game.gamedatas.players?.[playerId];
        const basketAnchor = document.getElementById(`basket-anchor-${playerId}`);
        if (basketAnchor) {
            basketAnchor.innerHTML = `<div class="basket-token ${player?.basketFull ? 'full' : 'empty'}"></div>`;
        }
    }

    renderCapturedTargets(playerId) {
        const normal = document.getElementById(`captured-normal-${playerId}`);
        const quick = document.getElementById(`captured-quick-${playerId}`);
        const playerBoard = document.getElementById(`player-board-${playerId}`);
        const zone = document.getElementById(`player-zone-${playerId}`);
        const captured = this.game.gamedatas.capturedTargetsByPlayer?.[playerId] ?? { normal: [], quick: [] };
        const scale = (playerBoard?.clientWidth ?? 176) / 220;

        zone?.style.setProperty('--player-zone-scale', String(scale));

        if (normal) {
            normal.innerHTML = captured.normal.map((card, index) => `
                <div class="captured-mission normal" style="${this.sprites.missionCardStyle(Number(card.targetId), scale)} right:${index * 76 * scale}px; z-index:${100 - index};"></div>
            `).join('');
        }

        if (quick) {
            quick.innerHTML = captured.quick.map((card, index) => `
                <div class="captured-mission quick" style="${this.sprites.missionCardStyle(Number(card.targetId), scale)} left:${index * 76 * scale}px; z-index:${100 - index};"></div>
            `).join('');
        }
    }
}

class PlayerTurnState {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        this.game.currentUiMode = 'playerTurn';
        this.game.isCurrentPlayerActive = isCurrentPlayerActive;
        this.game.clearPendingAction();
        this.game.renderState(args);
        this.game.bindPlayerTurnInteractions();
        this.game.setStatePrompt(isCurrentPlayerActive
            ? _('Select a tomato card and a board slot, then confirm with the action buttons.')
            : _('Waiting for the active player to choose an action.'));
        this.game.updateActionButtons();
    }

    onLeavingState() {
        this.game.currentUiMode = null;
        this.game.isCurrentPlayerActive = false;
        this.game.unbindInteractions();
        this.bga.statusBar.removeActionButtons();
    }
}

class ResolveBonusState {
    constructor(game) {
        this.game = game;
    }

    onEnteringState(args) {
        this.game.currentUiMode = null;
        this.game.isCurrentPlayerActive = false;
        this.game.clearPendingAction();
        this.game.renderState(args);
        this.game.setStatePrompt(_('Resolving bonus.'));
        this.game.bga.statusBar.removeActionButtons();
    }
}

class DiscardDownState {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        this.game.currentUiMode = 'discard';
        this.game.isCurrentPlayerActive = isCurrentPlayerActive;
        this.game.clearPendingAction();
        this.game.renderState(args);
        this.game.bindDiscardInteractions();
        this.game.setStatePrompt(isCurrentPlayerActive
            ? _('Select a tomato card to discard, then confirm with the action buttons.')
            : _('Waiting for the active player to discard down.'));
        this.game.updateActionButtons();
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
        this.pendingSpace = null;
        this.currentUiMode = null;
        this.isCurrentPlayerActive = false;
        this.recentThrow = null;
        this.recentThrowTimeout = null;

        this.sprites = new SpriteStyles();
        this.stageView = new FestivalStageView(this, this.sprites);
        this.playerZonesView = new PlayerZonesView(this, this.sprites);

        this.playerTurn = new PlayerTurnState(this, bga);
        this.resolveBonus = new ResolveBonusState(this, bga);
        this.discardDown = new DiscardDownState(this, bga);

        this.bga.states.register('PlayerTurn', this.playerTurn);
        this.bga.states.register('ResolveBonus', this.resolveBonus);
        this.bga.states.register('DiscardDown', this.discardDown);
    }

    setup(gamedatas) {
        this.gamedatas = gamedatas;
        if (this.bga.gameui && 'interface_min_width' in this.bga.gameui) {
            this.bga.gameui.interface_min_width = 600;
        }

        document.getElementById('tomatoss-layout')?.remove();

        this.bga.gameArea.getElement().insertAdjacentHTML('beforeend', `
            <div id="tomatoss-layout">
                <div id="festival-stage">
                    <div id="festival-canvas">
                        <div id="recent-throw-area" data-visible="false"></div>
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
                        <div id="token-reserve" class="stage-slot"></div>
                        <div id="tomato-slot-0" class="stage-slot"></div>
                        <div id="tomato-slot-1" class="stage-slot"></div>
                        <div id="tomato-slot-2" class="stage-slot"></div>
                        <div id="tomato-deck-slot" class="stage-slot"></div>
                    </div>
                </div>
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
        this.playerZonesView.renderAll();
    }

    setStatePrompt(text) {
        this.bga.statusBar.setTitle(text);
    }

    clearSelection() {
        this.selectedCardIds = [];
        document.querySelectorAll('.hand-card').forEach(card => card.classList.remove('is-selected'));
    }

    clearPendingAction() {
        this.pendingSpace = null;
    }

    clearRecentThrow() {
        if (this.recentThrowTimeout !== null) {
            clearTimeout(this.recentThrowTimeout);
            this.recentThrowTimeout = null;
        }
        this.recentThrow = null;
        this.stageView.renderRecentThrow();
    }

    showRecentThrow(args) {
        this.recentThrow = {
            targetId: args.targetId,
            cards: args.cards ?? [],
            revealed: args.revealed?.value ?? null,
            success: Boolean(args.success),
        };
        this.stageView.renderRecentThrow();
        if (this.recentThrowTimeout !== null) {
            clearTimeout(this.recentThrowTimeout);
        }
        this.recentThrowTimeout = setTimeout(() => this.clearRecentThrow(), 3200);
    }

    canInteract(action) {
        if (!this.isCurrentPlayerActive) {
            this.bga.dialogs.showMessage(_('This is not your turn'), 'error');
            return false;
        }

        if (!this.bga.actions.checkAction(action, false)) {
            return false;
        }

        return true;
    }

    getSelectedValues(cardIds = this.selectedCardIds) {
        const handMap = new Map((this.gamedatas.playerHand ?? []).map(card => [card.id, card.value]));
        return cardIds.map(id => handMap.get(id)).filter(value => value !== undefined);
    }

    getThrowOptions(targetId, cardIds = this.selectedCardIds) {
        const values = this.getSelectedValues(cardIds);
        return {
            normal: this.targetMatches(targetId, [...values]),
            quick: [1, 2, 3, 4, 5, 6, 7].some(next => this.targetMatches(targetId, [...values, next])),
        };
    }

    updateActionButtons() {
        this.bga.statusBar.removeActionButtons();
        if (!this.isCurrentPlayerActive) {
            return;
        }

        if (this.currentUiMode === 'playerTurn') {
            this.renderPlayerTurnButtons();
            return;
        }

        if (this.currentUiMode === 'discard') {
            this.renderDiscardButtons();
        }
    }

    renderPlayerTurnButtons() {
        const pendingSpace = this.pendingSpace;
        const hasSelection = this.selectedCardIds.length > 0;

        if (pendingSpace !== null && pendingSpace < 3) {
            this.bga.statusBar.addActionButton(_('Pick up'), () => this.confirmCollect(), {
                id: 'pickup_button',
            });
        }

        if (pendingSpace !== null && pendingSpace >= 3) {
            const target = (this.gamedatas.boardTargets ?? [])[pendingSpace - 3];
            const { normal, quick } = target ? this.getThrowOptions(Number(target.targetId)) : { normal: false, quick: false };

            this.bga.statusBar.addActionButton(_('Toss'), () => this.confirmToss(false), {
                id: 'toss_button',
                disabled: !hasSelection || !normal,
            });
            this.bga.statusBar.addActionButton(_('Quick toss'), () => this.confirmToss(true), {
                id: 'quick_toss_button',
                color: 'secondary',
                disabled: !hasSelection || !quick,
            });
        }

        if (pendingSpace !== null || hasSelection) {
            this.bga.statusBar.addActionButton(_('Clear selection'), () => {
                this.clearPendingAction();
                this.clearSelection();
                this.renderState(this.gamedatas);
                this.bindPlayerTurnInteractions();
                this.updateActionButtons();
            }, {
                color: 'secondary',
                id: 'clear_selection_button',
            });
        }
    }

    renderDiscardButtons() {
        const selectedCard = (this.gamedatas.playerHand ?? []).find(card => this.selectedCardIds.includes(card.id));
        this.bga.statusBar.addActionButton(_('Discard selected'), () => this.confirmDiscard(), {
            id: 'discard_button',
            color: 'alert',
            disabled: !selectedCard,
        });

        if (selectedCard) {
            this.bga.statusBar.addActionButton(_('Clear selection'), () => {
                this.clearSelection();
                this.playerZonesView.renderTop(this.bga.player_id);
                this.bindDiscardInteractions();
                this.updateActionButtons();
            }, {
                color: 'secondary',
                id: 'clear_discard_selection_button',
            });
        }
    }

    bindPlayerTurnInteractions() {
        this.unbindInteractions();

        document.querySelectorAll('.board-token-slot, .stage-card-action').forEach(button => {
            const handler = () => this.handleBoardSlotClick(Number(button.dataset.space));
            button.addEventListener('click', handler);
            this.boundInteractions.push({ element: button, handler });
        });

        document.querySelectorAll('.hand-card').forEach(button => {
            const handler = () => this.handleHandCardClick(button);
            button.addEventListener('click', handler);
            this.boundInteractions.push({ element: button, handler });
        });
    }

    bindDiscardInteractions() {
        this.unbindInteractions();

        document.querySelectorAll('.hand-card').forEach(button => {
            const handler = () => this.handleDiscardCardClick(button);
            button.addEventListener('click', handler);
            this.boundInteractions.push({ element: button, handler });
        });
    }

    unbindInteractions() {
        this.boundInteractions.forEach(({ element, handler }) => element.removeEventListener('click', handler));
        this.boundInteractions = [];
    }

    handleHandCardClick(button) {
        if (!this.canInteract('actTossToTarget')) {
            return;
        }

        this.toggleHandSelection(button);
        this.playerZonesView.renderTop(this.bga.player_id);
        this.bindPlayerTurnInteractions();
        this.updateActionButtons();
    }

    handleDiscardCardClick(button) {
        if (!this.canInteract('actDiscardCard')) {
            return;
        }

        this.clearSelection();
        this.selectedCardIds = [Number(button.dataset.cardId)];
        this.playerZonesView.renderTop(this.bga.player_id);
        this.bindDiscardInteractions();
        this.updateActionButtons();
    }

    toggleHandSelection(button) {
        const cardId = Number(button.dataset.cardId);
        if (this.selectedCardIds.includes(cardId)) {
            this.selectedCardIds = this.selectedCardIds.filter(id => id !== cardId);
        } else {
            this.selectedCardIds = [...this.selectedCardIds, cardId];
        }
    }

    handleBoardSlotClick(space) {
        const action = space < 3 ? 'actCollectTomato' : 'actTossToTarget';
        if (!this.canInteract(action)) {
            return;
        }

        this.pendingSpace = space;
        this.bindPlayerTurnInteractions();
        this.updateActionButtons();
    }

    confirmCollect() {
        if (this.pendingSpace === null || this.pendingSpace >= 3) {
            return;
        }

        this.bga.actions.performAction('actCollectTomato', { slot: this.pendingSpace });
    }

    confirmToss(quickToss) {
        if (this.pendingSpace === null || this.pendingSpace < 3) {
            return;
        }

        const target = (this.gamedatas.boardTargets ?? [])[this.pendingSpace - 3];
        if (!target) {
            this.bga.dialogs.showMessage(_('No mission card in that slot'), 'error');
            return;
        }

        const { normal, quick } = this.getThrowOptions(Number(target.targetId));
        if (!quickToss && !normal) {
            this.bga.dialogs.showMessage(_('Selected cards cannot satisfy this target'), 'error');
            return;
        }
        if (quickToss && !quick) {
            this.bga.dialogs.showMessage(_('Selected cards cannot satisfy a quick toss for this target'), 'error');
            return;
        }

        this.bga.actions.performAction('actTossToTarget', {
            slot: this.pendingSpace,
            cardsJson: JSON.stringify(this.selectedCardIds),
            quickToss,
        });
    }

    confirmDiscard() {
        const selectedCard = (this.gamedatas.playerHand ?? []).find(card => this.selectedCardIds.includes(card.id));
        if (!selectedCard) {
            return;
        }

        this.bga.actions.performAction('actDiscardCard', { cardValue: Number(selectedCard.value) });
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
        this.updateHandCount(args.player_id, args.handCount ?? ((this.gamedatas.handCountsByPlayer?.[args.player_id] ?? 0) + 1));
    }

    applyThrowAction(args) {
        const slotIndex = Number(args.slot_no) - 1;
        if (args.newTarget !== undefined) {
            this.gamedatas.boardTargets = [...(this.gamedatas.boardTargets ?? [])];
            this.gamedatas.boardTargets[slotIndex] = args.newTarget;
        }
        this.gamedatas.capturedTargetsByPlayer = args.capturedTargetsByPlayer ?? this.gamedatas.capturedTargetsByPlayer;
        this.gamedatas.tomatoDeckCount = args.tomatoDeckCount ?? this.gamedatas.tomatoDeckCount;
        this.gamedatas.targetDeckCount = args.targetDeckCount ?? this.gamedatas.targetDeckCount;
        this.gamedatas.latestDiscardTomato = args.latestDiscardTomato ?? this.gamedatas.latestDiscardTomato;
        this.updateHandCount(args.player_id, args.handCount ?? (this.gamedatas.handCountsByPlayer?.[args.player_id] ?? 0));
    }

    refreshCurrentUi() {
        if (this.currentUiMode === 'playerTurn') {
            this.playerZonesView.renderTop(this.bga.player_id);
            this.bindPlayerTurnInteractions();
        } else if (this.currentUiMode === 'discard') {
            this.playerZonesView.renderTop(this.bga.player_id);
            this.bindDiscardInteractions();
        }
        this.updateActionButtons();
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

        if (isCollect) {
            this.applyCollectAction(args);
            this.clearPendingAction();
            this.stageView.renderTomatoRow();
            this.stageView.renderBoardTokens();
            this.stageView.renderReserveTokens();
            this.playerZonesView.renderPlayer(args.player_id);
            this.refreshCurrentUi();
            return;
        }

        this.applyThrowAction(args);
        this.showRecentThrow(args);
        this.clearPendingAction();
        this.clearSelection();
        this.stageView.renderTomatoRow();
        this.stageView.renderBoardTokens();
        this.stageView.renderReserveTokens();
        if (args.newTarget !== undefined) {
            this.stageView.renderMissionRow();
        }
        this.playerZonesView.renderPlayer(args.player_id);
        this.refreshCurrentUi();
    }

    async notif_resolveBonus(args) {
        const player = this.gamedatas.players?.[args.player_id];
        if (player) {
            player.basketFull = args.basketFull;
        }
        this.updateHandCount(args.player_id, args.handCount);
        this.playerZonesView.renderPlayer(args.player_id);
        this.refreshCurrentUi();
    }

    async notif_discardCard(args) {
        this.gamedatas.latestDiscardTomato = args.latestDiscardTomato ?? this.gamedatas.latestDiscardTomato;
        this.updateHandCount(args.player_id, args.handCount);
        this.clearSelection();
        this.stageView.renderTomatoRow();
        this.playerZonesView.renderPlayer(args.player_id);
        this.refreshCurrentUi();
    }

    async notif_privateHandUpdate(args) {
        if (Array.isArray(args.playerHand)) {
            this.gamedatas.playerHand = args.playerHand;
            this.updateHandCount(args.player_id, args.playerHand.length);
        }
        this.playerZonesView.renderTop(this.bga.player_id);
        this.refreshCurrentUi();
    }
}
