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

const STAGE_DESIGN_WIDTH = 3754;
const STAGE_DESIGN_HEIGHT = 2976;
const CARD_DESIGN_WIDTH = 620;
const CARD_DESIGN_HEIGHT = 880;
const MAX_LAYOUT_WIDTH = 700;
const TARGET_CARD_POSITIONS = [
    { x: 841, y: 370 },
    { x: 1592, y: 370 },
    { x: 2343, y: 370 },
];
const THROW_CUTSCENE_MS = 3200;
const THROW_RESOLVE_DELAY_MS = 180;

class SpriteStyles {
    getLayoutElement() {
        return document.getElementById('tomatoss-layout');
    }

    getStageElement() {
        return document.getElementById('festival-stage');
    }

    getStageWidth() {
        const leftSide = document.getElementById('left-side');
        const gameAreaWrap = document.getElementById('game_play_area_wrap');
        const tableCenter = document.getElementById('table-center');
        const layoutParent = this.getLayoutElement()?.parentElement;
        const available = leftSide?.clientWidth
            ?? gameAreaWrap?.clientWidth
            ?? tableCenter?.clientWidth
            ?? layoutParent?.clientWidth
            ?? STAGE_DESIGN_WIDTH;
        return Math.min(STAGE_DESIGN_WIDTH, MAX_LAYOUT_WIDTH, Math.max(360, available - 40));
    }

    getStageScale() {
        return Math.min(1, this.getStageWidth() / STAGE_DESIGN_WIDTH);
    }

    getBoardScale() {
        const board = document.getElementById('festival-board');
        return board ? Math.min(1, board.clientWidth / 569) : 1;
    }

    updateBoardScale() {
        const layout = this.getLayoutElement();
        const stage = this.getStageElement();
        const stageScale = this.getStageScale();
        const boardScale = this.getBoardScale();
        const tomatoCardScale = (CARD_DESIGN_WIDTH / 155) * stageScale;
        const missionCardScale = (CARD_DESIGN_WIDTH / 157.5) * stageScale;
        const sharedCardWidth = CARD_DESIGN_WIDTH * stageScale;
        const sharedCardHeight = CARD_DESIGN_HEIGHT * stageScale;

        if (layout) {
            layout.style.setProperty('--stage-width', `${this.getStageWidth()}px`);
            layout.style.setProperty('--stage-height', `${STAGE_DESIGN_HEIGHT * stageScale}px`);
            layout.style.setProperty('--card-scale', String(stageScale));
            layout.style.setProperty('--tomato-card-w', `${sharedCardWidth}px`);
            layout.style.setProperty('--mission-card-w', `${sharedCardWidth}px`);
            layout.style.setProperty('--card-h', `${sharedCardHeight}px`);
            layout.style.setProperty('--player-board-size', `${250 * stageScale}px`);
            layout.style.setProperty('--tomato-card-scale', String(tomatoCardScale));
            layout.style.setProperty('--mission-card-scale', String(missionCardScale));
        }

        if (stage) {
            stage.style.setProperty('--board-scale', String(boardScale));
            stage.style.setProperty('--stage-scale', String(stageScale));
        }
    }

    getCardScale(kind) {
        const stageScale = this.getStageScale();
        if (kind === 'mission') {
            return (CARD_DESIGN_WIDTH / 157.5) * stageScale;
        }
        return (CARD_DESIGN_WIDTH / 155) * stageScale;
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

class CardRegistry {
    constructor(game, sprites) {
        this.game = game;
        this.sprites = sprites;
        this.nodes = new Map();
    }

    getMissionNode(card, scale, classes = []) {
        return this.getNode(`mission-${card.id}`, {
            style: this.sprites.missionCardStyle(Number(card.targetId), scale),
            classes: ['card-node', 'board-mission-card', ...classes],
        });
    }

    getTomatoNode(card, scale, classes = []) {
        return this.getNode(`tomato-${card.id}`, {
            style: this.sprites.tomatoCardStyle(Number(card.value), scale),
            classes: ['card-node', 'board-tomato-card', ...classes],
        });
    }

    getBackNode(key, kind, scale, classes = []) {
        return this.getNode(key, {
            style: this.sprites.cardBackStyle(kind, scale),
            classes: ['card-node', 'card-back', ...classes],
        });
    }

    getTemporaryTomatoNode(key, value, scale, classes = []) {
        return this.getNode(key, {
            style: this.sprites.tomatoCardStyle(Number(value), scale),
            classes: ['card-node', 'recent-throw__tomato', ...classes],
        });
    }

    mount(parent, node, { empty = false } = {}) {
        if (!parent) {
            return;
        }

        parent.dataset.empty = empty ? 'true' : 'false';
        if (empty) {
            parent.replaceChildren();
            return;
        }

        if (node.parentElement !== parent || parent.firstElementChild !== node || parent.childElementCount !== 1) {
            parent.replaceChildren(node);
        }
    }

    removeMissing(prefixes, keepKeys) {
        const keep = new Set(keepKeys);
        [...this.nodes.keys()].forEach(key => {
            if (!prefixes.some(prefix => key.startsWith(prefix))) {
                return;
            }
            if (keep.has(key)) {
                return;
            }
            this.nodes.get(key)?.remove();
            this.nodes.delete(key);
        });
    }

    clearTemporary(prefix) {
        [...this.nodes.keys()].forEach(key => {
            if (!key.startsWith(prefix)) {
                return;
            }
            this.nodes.get(key)?.remove();
            this.nodes.delete(key);
        });
    }

    getNode(key, { style, classes }) {
        let node = this.nodes.get(key);
        if (!node) {
            node = document.createElement('div');
            this.nodes.set(key, node);
        }

        node.className = classes.join(' ');
        node.style.cssText = style;
        node.dataset.registryKey = key;
        return node;
    }
}

class FestivalStageView {
    constructor(game, sprites, registry) {
        this.game = game;
        this.sprites = sprites;
        this.registry = registry;
    }

    renderAll() {
        this.sprites.updateBoardScale();
        this.renderMissionRow();
        this.renderTomatoRow();
        this.renderActionSlots();
        this.renderPlacedTokens();
        this.renderReserveTokens();
        this.renderRecentThrow();
    }

    renderMissionRow() {
        const scale = this.sprites.getCardScale('mission');
        const keepKeys = [];

        const deck = document.getElementById('mission-deck-slot');
        if (deck) {
            const back = this.registry.getBackNode('back-mission-deck', 'mission', scale, ['mission']);
            deck.replaceChildren(back);
            deck.insertAdjacentHTML('beforeend', `<div class="deck-count">${this.game.gamedatas.targetDeckCount ?? 0}</div>`);
        }

        (this.game.gamedatas.boardTargets ?? []).forEach((card, index) => {
            const host = document.querySelector(`#mission-slot-${index} .slot-card-host`);
            if (!host) {
                return;
            }

            if (!card) {
                this.registry.mount(host, null, { empty: true });
                return;
            }

            const key = `mission-${card.id}`;
            keepKeys.push(key);
            const node = this.registry.getMissionNode(card, scale);
            this.registry.mount(host, node);
        });

        this.registry.removeMissing(['mission-'], keepKeys);
    }

    renderTomatoRow() {
        const scale = this.sprites.getCardScale('tomato');
        const keepKeys = [];

        (this.game.gamedatas.boardTomatoes ?? []).forEach((card, index) => {
            const host = document.querySelector(`#tomato-slot-${index} .slot-card-host`);
            if (!host) {
                return;
            }

            if (!card) {
                this.registry.mount(host, null, { empty: true });
                return;
            }

            const key = `tomato-${card.id}`;
            keepKeys.push(key);
            const node = this.registry.getTomatoNode(card, scale);
            this.registry.mount(host, node);
        });

        const discardHost = document.querySelector('#discard-slot .slot-card-host');
        if (discardHost) {
            const discardCard = this.game.gamedatas.latestDiscardTomato;
            if (discardCard) {
                const node = this.registry.getTomatoNode(discardCard, scale, ['discard-card']);
                keepKeys.push(`tomato-${discardCard.id}`);
                this.registry.mount(discardHost, node);
            } else {
                this.registry.mount(discardHost, null, { empty: true });
            }
        }

        const deck = document.getElementById('tomato-deck-slot');
        if (deck) {
            const back = this.registry.getBackNode('back-tomato-deck', 'tomato', scale, ['tomato']);
            deck.replaceChildren(back);
            deck.insertAdjacentHTML('beforeend', `<div class="deck-count">${this.game.gamedatas.tomatoDeckCount ?? 0}</div>`);
        }

        this.registry.removeMissing(['tomato-'], keepKeys);
    }

    renderActionSlots() {
        const slotLayer = document.getElementById('festival-slot-layer');
        if (!slotLayer) {
            return;
        }

        slotLayer.innerHTML = TOKEN_SLOTS.map(slot => `
            <button class="board-token-slot ${this.game.pendingSpace === slot.space ? 'is-pending' : ''}" data-space="${slot.space}" style="left:${slot.left}%; top:${slot.top}%"></button>
        `).join('');

        document.querySelectorAll('.stage-slot-button').forEach(button => {
            button.classList.toggle('is-pending', Number(button.dataset.space) === this.game.pendingSpace);
        });
    }

    renderPlacedTokens() {
        const tokenLayer = document.getElementById('festival-token-layer');
        if (!tokenLayer) {
            return;
        }

        const counts = new Map();
        tokenLayer.innerHTML = (this.game.gamedatas.currentTurnActions ?? []).map(action => {
            const slot = TOKEN_SLOTS.find(item => item.space === Number(action.space));
            if (!slot) {
                return '';
            }

            const stackIndex = counts.get(slot.space) ?? 0;
            counts.set(slot.space, stackIndex + 1);
            const kind = (action.actionKind ?? action.action_kind) === 'collect' ? 'whole' : 'splat';
            return `<div class="placed-token ${kind}" style="left:${slot.left}%; top:calc(${slot.top}% - ${stackIndex * 18}px);"></div>`;
        }).join('');
    }

    renderReserveTokens() {
        const reserve = document.getElementById('token-reserve');
        if (!reserve) {
            return;
        }

        const remaining = Number(this.game.gamedatas.placementsRemaining ?? 0);
        reserve.innerHTML = Array.from({ length: remaining }, () => '<div class="reserve-token"></div>').join('');
    }

    renderRecentThrow() {
        const area = document.getElementById('recent-throw-area');
        if (!area) {
            return;
        }

        const recent = this.game.recentThrow;
        if (!recent) {
            area.dataset.visible = 'false';
            area.replaceChildren();
            this.registry.clearTemporary('recent-');
            return;
        }

        area.dataset.visible = 'true';
        this.registry.clearTemporary('recent-');

        const wrap = document.createElement('div');
        wrap.className = `recent-throw ${recent.success ? 'is-success' : 'is-fail'}`;
        wrap.style.position = 'absolute';
        wrap.style.height = `${CARD_DESIGN_HEIGHT * this.sprites.getStageScale()}px`;

        const tomatoScale = this.sprites.getCardScale('tomato');
        const targetIndex = Math.max(0, Number(recent.targetIndex ?? 0));
        const targetPos = TARGET_CARD_POSITIONS[targetIndex] ?? TARGET_CARD_POSITIONS[0];
        wrap.style.left = `${(targetPos.x - 150) * this.sprites.getStageScale()}px`;
        wrap.style.top = `${100 * this.sprites.getStageScale()}px`;

        const cards = document.createElement('div');
        cards.className = 'recent-throw__cards';
        wrap.appendChild(cards);

        (recent.cards ?? []).forEach((value, index) => {
            const node = this.registry.getTemporaryTomatoNode(`recent-card-${index}`, value, tomatoScale);
            node.style.position = 'static';
            node.style.left = '';
            node.style.top = '';
            node.style.marginLeft = index > 0 ? `${-360 * this.sprites.getStageScale()}px` : '0';
            cards.appendChild(node);
        });

        if (recent.revealed) {
            const node = this.registry.getTemporaryTomatoNode('recent-reveal', recent.revealed, tomatoScale, ['reveal']);
            node.style.position = 'static';
            node.style.left = '';
            node.style.top = '';
            node.style.marginLeft = (recent.cards?.length ?? 0) > 0 ? `${-360 * this.sprites.getStageScale()}px` : '0';
            cards.appendChild(node);
        }

        area.replaceChildren(wrap);
    }
}

class PlayerZonesView {
    constructor(game, sprites, registry) {
        this.game = game;
        this.sprites = sprites;
        this.registry = registry;
    }

    getOrderedPlayers() {
        const localPlayerId = this.game.getLocalPlayerId();
        return Object.values(this.game.gamedatas.players ?? {}).sort((a, b) => {
            const aSelf = Number(a.id) === localPlayerId ? 1 : 0;
            const bSelf = Number(b.id) === localPlayerId ? 1 : 0;
            if (aSelf !== bSelf) {
                return bSelf - aSelf;
            }
            return Number(a.id) - Number(b.id);
        });
    }

    setup() {
        const root = document.getElementById('player-zones');
        if (!root) {
            return;
        }

        root.innerHTML = '';
        this.getOrderedPlayers().forEach(player => {
            const isSelf = Number(player.id) === this.game.getLocalPlayerId();
            root.insertAdjacentHTML('beforeend', `
                <div class="tomatoss-player-zone whiteblock ${isSelf ? 'is-self' : ''}" id="player-zone-${player.id}">
                    <div class="tomatoss-player-zone__top" id="player-zone-top-${player.id}"></div>
                    <div class="tomatoss-player-zone__namebar">
                        <div class="tomatoss-player-zone__name">${player.name ?? `P${player.id}`}</div>
                    </div>
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
        this.getOrderedPlayers().forEach(player => this.renderPlayer(Number(player.id)));
    }

    renderPlayer(playerId) {
        this.renderHandArea(playerId);
        this.renderBoard(playerId);
        this.renderCaptured(playerId);
    }

    renderHandArea(playerId) {
        const top = document.getElementById(`player-zone-top-${playerId}`);
        if (!top) {
            return;
        }

        const isSelf = Number(playerId) === this.game.getLocalPlayerId();
        const scale = this.sprites.getCardScale('tomato');

        if (isSelf) {
            top.innerHTML = `<div class="self-hand-row"></div>`;
            const row = top.firstElementChild;
            const keepKeys = [];

            (this.game.gamedatas.playerHand ?? []).forEach(card => {
                const key = `tomato-${card.id}`;
                keepKeys.push(key);
                const button = document.createElement('button');
                button.className = `hand-card-button ${this.game.selectedCardIds.includes(card.id) ? 'is-selected' : ''}`;
                button.dataset.cardId = String(card.id);
                button.dataset.value = String(card.value);
                const host = document.createElement('div');
                host.className = 'hand-card-host';
                button.appendChild(host);
                row.appendChild(button);
                this.registry.mount(host, this.registry.getTomatoNode(card, scale));
            });

            this.registry.removeMissing(['tomato-'], [
                ...keepKeys,
                ...this.getBoardTomatoKeys(),
                ...this.getDiscardTomatoKeys(),
            ]);
            return;
        }

        const count = this.game.gamedatas.handCountsByPlayer?.[playerId] ?? 0;
        top.innerHTML = `<div class="player-hand-fan"></div>`;
        const fan = top.firstElementChild;
        for (let index = 0; index < count; index += 1) {
            const host = document.createElement('div');
            host.className = 'player-hand-back-host';
            host.style.marginLeft = index === 0 ? '0' : `${-Math.round(0.68 * 155 * scale)}px`;
            fan.appendChild(host);
            this.registry.mount(host, this.registry.getBackNode(`back-opponent-${playerId}-${index}`, 'tomato', scale));
        }
    }

    renderBoard(playerId) {
        const basketAnchor = document.getElementById(`basket-anchor-${playerId}`);
        const player = this.game.gamedatas.players?.[playerId];
        if (basketAnchor && player) {
            basketAnchor.innerHTML = `<div class="basket-token ${player.basketFull ? 'full' : 'empty'}"></div>`;
        }
    }

    renderCaptured(playerId) {
        const normalHost = document.getElementById(`captured-normal-${playerId}`);
        const quickHost = document.getElementById(`captured-quick-${playerId}`);
        const board = document.getElementById(`player-board-${playerId}`);
        const zone = document.getElementById(`player-zone-${playerId}`);
        const captured = this.game.gamedatas.capturedTargetsByPlayer?.[playerId] ?? { normal: [], quick: [] };
        const scale = (board?.clientWidth ?? 176) / 220;
        const keepKeys = [];

        zone?.style.setProperty('--player-zone-scale', String(scale));
        if (normalHost) {
            normalHost.replaceChildren();
            captured.normal.forEach((card, index) => {
                const key = `mission-${card.id}`;
                keepKeys.push(key);
                const wrapper = document.createElement('div');
                wrapper.className = 'captured-card-host';
                wrapper.style.right = `${index * 52 * scale}px`;
                wrapper.style.zIndex = String(100 - index);
                normalHost.appendChild(wrapper);
                this.registry.mount(wrapper, this.registry.getMissionNode(card, scale, ['captured-mission', 'normal']));
            });
        }

        if (quickHost) {
            quickHost.replaceChildren();
            captured.quick.forEach((card, index) => {
                const key = `mission-${card.id}`;
                keepKeys.push(key);
                const wrapper = document.createElement('div');
                wrapper.className = 'captured-card-host';
                wrapper.style.left = `${index * 52 * scale}px`;
                wrapper.style.zIndex = String(100 - index);
                quickHost.appendChild(wrapper);
                this.registry.mount(wrapper, this.registry.getMissionNode(card, scale, ['captured-mission', 'quick']));
            });
        }

        this.registry.removeMissing(['mission-'], [
            ...keepKeys,
            ...this.getBoardMissionKeys(),
        ]);
    }

    getBoardTomatoKeys() {
        return (this.game.gamedatas.boardTomatoes ?? []).filter(Boolean).map(card => `tomato-${card.id}`);
    }

    getDiscardTomatoKeys() {
        return this.game.gamedatas.latestDiscardTomato ? [`tomato-${this.game.gamedatas.latestDiscardTomato.id}`] : [];
    }

    getBoardMissionKeys() {
        return (this.game.gamedatas.boardTargets ?? []).filter(Boolean).map(card => `mission-${card.id}`);
    }
}

class PlayerTurnState {
    constructor(game) {
        this.game = game;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        this.game.currentUiMode = 'playerTurn';
        this.game.isCurrentPlayerActive = isCurrentPlayerActive;
        this.game.clearPendingAction();
        this.game.renderState(args);
        this.game.setStatePrompt(isCurrentPlayerActive
            ? _('Choose a slot or cards, then confirm.')
            : _('Waiting for the active player.'));
        this.game.updateActionButtons();
    }

    onLeavingState() {
        this.game.currentUiMode = null;
        this.game.isCurrentPlayerActive = false;
        this.game.bga.statusBar.removeActionButtons();
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
        this.game.setStatePrompt(_('Resolving bonus'));
        this.game.bga.statusBar.removeActionButtons();
    }
}

class DiscardDownState {
    constructor(game) {
        this.game = game;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        this.game.currentUiMode = 'discard';
        this.game.isCurrentPlayerActive = isCurrentPlayerActive;
        this.game.clearPendingAction();
        this.game.clearSelection();
        this.game.renderState(args);
        this.game.setStatePrompt(isCurrentPlayerActive
            ? _('Choose cards to discard down to 8.')
            : _('Waiting for discard.'));
        this.game.updateActionButtons();
    }

    onLeavingState() {
        this.game.currentUiMode = null;
        this.game.isCurrentPlayerActive = false;
        this.game.bga.statusBar.removeActionButtons();
    }
}

export class Game {
    constructor(bga) {
        this.bga = bga;
        this.selectedCardIds = [];
        this.pendingSpace = null;
        this.currentUiMode = null;
        this.isCurrentPlayerActive = false;
        this.recentThrow = null;
        this.recentThrowTimeout = null;
        this.pendingThrowResolution = null;
        this.resizeRaf = null;
        this.onWindowResize = () => {
            if (this.resizeRaf !== null) {
                cancelAnimationFrame(this.resizeRaf);
            }
            this.resizeRaf = requestAnimationFrame(() => {
                this.resizeRaf = null;
                this.renderState(this.gamedatas);
            });
        };

        this.sprites = new SpriteStyles();
        this.registry = new CardRegistry(this, this.sprites);
        this.stageView = new FestivalStageView(this, this.sprites, this.registry);
        this.playerZonesView = new PlayerZonesView(this, this.sprites, this.registry);

        this.playerTurn = new PlayerTurnState(this);
        this.resolveBonus = new ResolveBonusState(this);
        this.discardDown = new DiscardDownState(this);

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
                <div id="full-table">
                    <div id="centered-table">
                        <div id="tables-and-center">
                            <div id="table-center">
                                <div id="festival-stage">
                                    <div id="festival-stage-canvas">
                                        <div id="recent-throw-area" data-visible="false"></div>
                                        <div id="mission-deck-slot" class="stage-slot stage-deck-slot"></div>
                                        ${[0, 1, 2].map(index => `
                                            <div id="mission-slot-${index}" class="stage-slot mission-slot">
                                                <button class="stage-slot-button mission-slot-button" data-space="${index + 3}">
                                                    <div class="slot-card-host" data-empty="true"></div>
                                                </button>
                                            </div>
                                        `).join('')}
                                        <div id="festival-board-wrap">
                                            <div id="festival-board">
                                                <div id="festival-slot-layer"></div>
                                                <div id="festival-token-layer"></div>
                                            </div>
                                        </div>
                                        <div id="discard-slot" class="stage-slot side-slot">
                                            <div class="slot-card-host" data-empty="true"></div>
                                        </div>
                                        <div id="token-reserve" class="stage-slot"></div>
                                        ${[0, 1, 2].map(index => `
                                            <div id="tomato-slot-${index}" class="stage-slot tomato-slot">
                                                <button class="stage-slot-button tomato-slot-button" data-space="${index}">
                                                    <div class="slot-card-host" data-empty="true"></div>
                                                </button>
                                            </div>
                                        `).join('')}
                                        <div id="tomato-deck-slot" class="stage-slot stage-deck-slot"></div>
                                    </div>
                                </div>
                            </div>
                            <div id="player-zones"></div>
                        </div>
                    </div>
                </div>
            </div>
        `);

        this.playerZonesView.setup();
        this.bindRootEvents();
        window.addEventListener('resize', this.onWindowResize);
        this.renderState(gamedatas);
        this.setupNotifications();
    }

    bindRootEvents() {
        const root = document.getElementById('tomatoss-layout');
        if (!root || root.dataset.bound === 'true') {
            return;
        }

        root.addEventListener('click', event => {
            const target = event.target;
            const handButton = target.closest('.hand-card-button');
            if (handButton) {
                this.onHandCardClick(handButton);
                return;
            }

            const stageSlotButton = target.closest('.stage-slot-button');
            if (stageSlotButton) {
                this.onBoardSpaceClick(Number(stageSlotButton.dataset.space));
                return;
            }

            const boardTokenSlot = target.closest('.board-token-slot');
            if (boardTokenSlot) {
                this.onBoardSpaceClick(Number(boardTokenSlot.dataset.space));
            }
        });

        root.dataset.bound = 'true';
    }

    buildRenderData(source) {
        const base = {
            viewerPlayerId: source.viewerPlayerId ?? this.gamedatas.viewerPlayerId ?? null,
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

        if (this.pendingThrowResolution) {
            return {
                ...base,
                boardTargets: this.gamedatas.boardTargets ?? [null, null, null],
                tomatoDeckCount: this.gamedatas.tomatoDeckCount ?? 0,
                targetDeckCount: this.gamedatas.targetDeckCount ?? 0,
                latestDiscardTomato: this.gamedatas.latestDiscardTomato ?? null,
                capturedTargetsByPlayer: this.gamedatas.capturedTargetsByPlayer ?? {},
            };
        }

        return base;
    }

    renderState(source) {
        this.gamedatas = { ...this.gamedatas, ...this.buildRenderData(source) };
        this.stageView.renderAll();
        this.playerZonesView.renderAll();
        this.updateActionButtons();
    }

    setStatePrompt(text) {
        this.bga.statusBar.setTitle(text);
    }

    getLocalPlayerId() {
        const candidates = [
            this.gamedatas?.viewerPlayerId,
            this.bga.player_id,
            this.bga.current_player_id,
            this.bga.gameui?.player_id,
            this.bga.gameui?.current_player_id,
        ];
        for (const candidate of candidates) {
            const parsed = Number(candidate);
            if (!Number.isNaN(parsed) && parsed > 0) {
                return parsed;
            }
        }
        return NaN;
    }

    canInteract(action) {
        if (!this.isCurrentPlayerActive) {
            this.bga.dialogs.showMessage(_('This is not your turn'), 'error');
            return false;
        }
        return this.bga.actions.checkAction(action, false);
    }

    clearSelection() {
        this.selectedCardIds = [];
    }

    clearPendingAction() {
        this.pendingSpace = null;
    }

    onHandCardClick(button) {
        if (this.currentUiMode !== 'playerTurn' && this.currentUiMode !== 'discard') {
            return;
        }

        const action = this.currentUiMode === 'discard' ? 'actDiscardCard' : 'actTossToTarget';
        if (!this.canInteract(action)) {
            return;
        }

        const cardId = Number(button.dataset.cardId);
        const wasSelected = this.selectedCardIds.includes(cardId);
        if (this.currentUiMode === 'discard') {
            if (wasSelected) {
                this.clearSelection();
                this.playerZonesView.renderHandArea(this.getLocalPlayerId());
                this.updateActionButtons();
                return;
            }
            this.selectedCardIds = [cardId];
        } else if (this.selectedCardIds.includes(cardId)) {
            if (this.tryAutoConfirmPendingThrow()) {
                return;
            }
            this.selectedCardIds = this.selectedCardIds.filter(id => id !== cardId);
        } else {
            this.selectedCardIds = [...this.selectedCardIds, cardId];
        }

        this.playerZonesView.renderHandArea(this.getLocalPlayerId());
        this.updateActionButtons();
    }

    onBoardSpaceClick(space) {
        const action = space < 3 ? 'actCollectTomato' : 'actTossToTarget';
        if (!this.canInteract(action)) {
            return;
        }

        if (this.pendingSpace === space) {
            if (space < 3) {
                this.confirmCollect();
                return;
            }
            if (this.tryAutoConfirmPendingThrow()) {
                return;
            }
        }

        this.pendingSpace = space;
        this.stageView.renderActionSlots();
        this.updateActionButtons();
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

    tryAutoConfirmPendingThrow() {
        if (this.pendingSpace === null || this.pendingSpace < 3) {
            return false;
        }

        const target = (this.gamedatas.boardTargets ?? [])[this.pendingSpace - 3];
        if (!target) {
            this.bga.dialogs.showMessage(_('No target in that slot'), 'error');
            return true;
        }

        const { normal, quick } = this.getThrowOptions(Number(target.targetId));
        if (normal && !quick) {
            this.confirmToss(false);
            return true;
        }
        if (!normal && quick) {
            this.confirmToss(true);
            return true;
        }
        if (!normal && !quick) {
            this.bga.dialogs.showMessage(_('Choose cards that can toss to this target'), 'error');
            return true;
        }

        this.bga.dialogs.showMessage(_('Both Toss and Quick toss are possible. Use the action buttons.'), 'error');
        return true;
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
        if (this.pendingSpace !== null && this.pendingSpace < 3) {
            this.bga.statusBar.addActionButton(_('Pick up'), () => this.confirmCollect(), {
                id: 'pickup_button',
            });
        }

        if (this.pendingSpace !== null && this.pendingSpace >= 3) {
            const target = (this.gamedatas.boardTargets ?? [])[this.pendingSpace - 3];
            const { normal, quick } = target ? this.getThrowOptions(Number(target.targetId)) : { normal: false, quick: false };

            this.bga.statusBar.addActionButton(_('Toss'), () => this.confirmToss(false), {
                id: 'toss_button',
                disabled: !normal,
            });
            this.bga.statusBar.addActionButton(_('Quick toss'), () => this.confirmToss(true), {
                id: 'quick_toss_button',
                disabled: !quick,
            });
        }

        if (this.pendingSpace !== null || this.selectedCardIds.length > 0) {
            this.bga.statusBar.addActionButton(_('Clear selection'), () => {
                this.clearPendingAction();
                this.clearSelection();
                this.playerZonesView.renderHandArea(this.getLocalPlayerId());
                this.stageView.renderActionSlots();
                this.updateActionButtons();
            }, {
                color: 'secondary',
            });
        }
    }

    renderDiscardButtons() {
        const selectedCard = (this.gamedatas.playerHand ?? []).find(card => this.selectedCardIds.includes(card.id));
        this.bga.statusBar.addActionButton(_('Discard selected'), () => this.confirmDiscard(), {
            color: 'alert',
            disabled: !selectedCard,
        });
        if (selectedCard) {
            this.bga.statusBar.addActionButton(_('Clear selection'), () => {
                this.clearSelection();
                this.playerZonesView.renderHandArea(this.getLocalPlayerId());
                this.updateActionButtons();
            }, { color: 'secondary' });
        }
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
        const slotIndex = Number(args.space);
        this.gamedatas.boardTomatoes = [...(this.gamedatas.boardTomatoes ?? [])];
        this.gamedatas.boardTomatoes[slotIndex] = args.refill;
        this.gamedatas.tomatoDeckCount = args.tomatoDeckCount ?? this.gamedatas.tomatoDeckCount;
        this.updateHandCount(args.player_id, args.handCount ?? ((this.gamedatas.handCountsByPlayer?.[args.player_id] ?? 0) + 1));
    }

    applyThrowAction(args) {
        const slotIndex = Number(args.targetIndex);
        if (args.replacementTarget) {
            this.gamedatas.boardTargets = [...(this.gamedatas.boardTargets ?? [])];
            this.gamedatas.boardTargets[slotIndex] = args.replacementTarget;
        }
        this.gamedatas.capturedTargetsByPlayer = args.capturedTargetsByPlayer ?? this.gamedatas.capturedTargetsByPlayer;
        this.gamedatas.tomatoDeckCount = args.tomatoDeckCount ?? this.gamedatas.tomatoDeckCount;
        this.gamedatas.targetDeckCount = args.targetDeckCount ?? this.gamedatas.targetDeckCount;
        this.gamedatas.latestDiscardTomato = args.latestDiscardTomato ?? this.gamedatas.latestDiscardTomato;
        this.updateHandCount(args.player_id, args.handCount ?? (this.gamedatas.handCountsByPlayer?.[args.player_id] ?? 0));
    }

    applyImmediateThrowHandChange(args) {
        if (Number(args.player_id) !== this.getLocalPlayerId()) {
            this.updateHandCount(args.player_id, args.handCount ?? (this.gamedatas.handCountsByPlayer?.[args.player_id] ?? 0));
            return;
        }

        const playedIds = new Set((args.cards ?? []).map(card => Number(card.id)));
        if (playedIds.size === 0) {
            return;
        }

        this.gamedatas.playerHand = (this.gamedatas.playerHand ?? []).filter(card => !playedIds.has(Number(card.id)));
        this.updateHandCount(args.player_id, this.gamedatas.playerHand.length);
        this.playerZonesView.renderHandArea(this.getLocalPlayerId());
    }

    showRecentThrow(args) {
        if (this.recentThrowTimeout) {
            clearTimeout(this.recentThrowTimeout);
        }
        this.recentThrow = {
            targetId: args.targetId,
            targetIndex: Number(args.targetIndex),
            cards: args.cards ?? [],
            revealed: args.revealed?.value ?? null,
            success: Boolean(args.success),
        };
        this.stageView.renderRecentThrow();
        this.recentThrowTimeout = setTimeout(() => {
            this.recentThrow = null;
            this.stageView.renderRecentThrow();
            const pending = this.pendingThrowResolution;
            this.pendingThrowResolution = null;
            if (pending) {
                setTimeout(() => {
                    this.applyThrowAction(pending);
                    this.afterPublicChange();
                }, THROW_RESOLVE_DELAY_MS);
            }
        }, THROW_CUTSCENE_MS);
    }

    afterPublicChange() {
        this.stageView.renderAll();
        this.playerZonesView.renderAll();
        this.updateActionButtons();
    }

    async notif_turnAction(args) {
        const isCollect = Object.prototype.hasOwnProperty.call(args, 'refill');
        this.pushTurnAction({
            space: Number(args.space),
            actionKind: isCollect ? 'collect' : (args.quickToss ? 'quick_toss' : 'normal_toss'),
            cards: args.cards ?? [],
            revealed: args.revealed ?? null,
            targetId: args.targetId ?? null,
            scoreGained: args.scoreGained ?? 0,
        });

        if (isCollect) {
            this.applyCollectAction(args);
            this.clearPendingAction();
            this.afterPublicChange();
        } else {
            this.applyImmediateThrowHandChange(args);
            this.pendingThrowResolution = args;
            this.showRecentThrow(args);
            this.clearSelection();
            this.clearPendingAction();
            this.stageView.renderAll();
            this.playerZonesView.renderAll();
            this.updateActionButtons();
        }
    }

    async notif_resolveBonus(args) {
        if (this.gamedatas.players?.[args.player_id]) {
            this.gamedatas.players[args.player_id].basketFull = args.basketFull;
        }
        this.updateHandCount(args.player_id, args.handCount);
        this.playerZonesView.renderPlayer(args.player_id);
        this.updateActionButtons();
    }

    async notif_discardCard(args) {
        this.gamedatas.latestDiscardTomato = args.latestDiscardTomato ?? this.gamedatas.latestDiscardTomato;
        this.updateHandCount(args.player_id, args.handCount);
        this.clearSelection();
        this.afterPublicChange();
    }

    async notif_privateHandUpdate(args) {
        if (Array.isArray(args.playerHand)) {
            this.gamedatas.playerHand = args.playerHand;
            this.updateHandCount(args.player_id, args.playerHand.length);
        }
        this.playerZonesView.renderHandArea(this.getLocalPlayerId());
        this.updateActionButtons();
    }
}
