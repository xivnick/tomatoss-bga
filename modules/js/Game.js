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
const PLAYER_BOARD_DESIGN_SIZE = 880;
const MAX_LAYOUT_WIDTH = 700;
const LAYOUT_HORIZONTAL_CHROME = 40;
const LAYOUT_HORIZONTAL_PADDING = 32;
const TARGET_CARD_POSITIONS = [
    { x: 841, y: 370 },
    { x: 1592, y: 370 },
    { x: 2343, y: 370 },
];
const RECENT_THROW_Y = 100;
const RECENT_THROW_X_OFFSET = -150;
const RECENT_THROW_X_STEP = 260;
const THROW_CUTSCENE_MS = 2200;
const THROW_RESOLVE_DELAY_MS = 180;
const TOKEN_MOVE_MS = 380;
const CARD_MOVE_MS = 560;
const FLIP_MS = 520;
const REFILL_PAUSE_MS = 180;
const THROW_RESULT_PAUSE_MS = 220;
const TURN_CLEANUP_MS = 320;
const TOKEN_EASING = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
const CARD_EASING = 'cubic-bezier(0.18, 0.84, 0.32, 1)';
const FLIP_IN_EASING = 'cubic-bezier(0.55, 0.08, 0.68, 0.53)';
const FLIP_OUT_EASING = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

class SpriteStyles {
    getLayoutElement() {
        return document.getElementById('tomatoss-layout');
    }

    getStageWidth() {
        const layoutParent = this.getLayoutElement()?.parentElement;
        const leftSide = document.getElementById('left-side');
        const available = layoutParent?.clientWidth ?? leftSide?.clientWidth ?? STAGE_DESIGN_WIDTH;
        const usable = Math.max(
            320,
            Math.min(available, MAX_LAYOUT_WIDTH) - LAYOUT_HORIZONTAL_CHROME - LAYOUT_HORIZONTAL_PADDING
        );
        return Math.min(STAGE_DESIGN_WIDTH, usable);
    }

    getStageScale() {
        return Math.min(1, this.getStageWidth() / STAGE_DESIGN_WIDTH);
    }

    getBoardScale() {
        const board = document.getElementById('festival-board');
        return board ? Math.min(1, board.clientWidth / 2275) : 1;
    }

    updateBoardScale() {
        const layout = this.getLayoutElement();
        const stageWidth = this.getStageWidth();
        const stageScale = this.getStageScale();
        const boardScale = this.getBoardScale();
        const sharedCardWidth = CARD_DESIGN_WIDTH * stageScale;
        const sharedCardHeight = CARD_DESIGN_HEIGHT * stageScale;

        if (layout) {
            layout.style.setProperty('--layout-width', `${stageWidth + LAYOUT_HORIZONTAL_CHROME}px`);
            layout.style.setProperty('--stage-width', `${stageWidth}px`);
            layout.style.setProperty('--stage-height', `${STAGE_DESIGN_HEIGHT * stageScale}px`);
            layout.style.setProperty('--tomato-card-w', `${sharedCardWidth}px`);
            layout.style.setProperty('--mission-card-w', `${sharedCardWidth}px`);
            layout.style.setProperty('--card-h', `${sharedCardHeight}px`);
            layout.style.setProperty('--player-board-size', `${PLAYER_BOARD_DESIGN_SIZE * stageScale}px`);
            layout.style.setProperty('--board-scale', String(boardScale));
            layout.style.setProperty('--stage-scale', String(stageScale));
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

class MotionLayer {
    constructor(game, sprites) {
        this.game = game;
        this.sprites = sprites;
    }

    getLayer() {
        return document.getElementById('animation-layer');
    }

    getStageCanvasRect() {
        return document.getElementById('festival-stage-canvas')?.getBoundingClientRect() ?? null;
    }

    createWrapper(node, rect, className = '') {
        const layer = this.getLayer();
        if (!layer || !rect) {
            return null;
        }

        const wrapper = document.createElement('div');
        wrapper.className = `motion-wrapper ${className}`.trim();
        wrapper.style.left = `${rect.left}px`;
        wrapper.style.top = `${rect.top}px`;
        wrapper.style.width = `${rect.width}px`;
        wrapper.style.height = `${rect.height}px`;
        node.style.width = '100%';
        node.style.height = '100%';
        wrapper.appendChild(node);
        layer.appendChild(wrapper);
        return wrapper;
    }

    async moveNodeToHost(node, destinationHost, {
        duration = CARD_MOVE_MS,
        easing = CARD_EASING,
        className = 'motion-card-wrapper',
    } = {}) {
        if (!node || !destinationHost) {
            return;
        }

        const fromRect = this.getRect(node);
        const toRect = this.getRect(destinationHost);
        if (!fromRect || !toRect) {
            return;
        }

        const wrapper = this.createWrapper(node, fromRect, className);
        await this.animateRect(wrapper, fromRect, toRect, { duration, easing });
        const finalNode = wrapper?.firstElementChild ?? node;
        destinationHost.dataset.empty = 'false';
        destinationHost.replaceChildren(finalNode);
    }

    async moveNewNodeToHost(node, fromRect, destinationHost, {
        duration = CARD_MOVE_MS,
        easing = CARD_EASING,
        className = 'motion-card-wrapper',
    } = {}) {
        if (!node || !fromRect || !destinationHost) {
            return;
        }

        const toRect = this.getRect(destinationHost);
        if (!toRect) {
            return;
        }

        const wrapper = this.createWrapper(node, fromRect, className);
        await this.animateRect(wrapper, fromRect, toRect, { duration, easing });
        const finalNode = wrapper?.firstElementChild ?? node;
        destinationHost.dataset.empty = 'false';
        destinationHost.replaceChildren(finalNode);
    }

    createReserveTokenNode() {
        const node = document.createElement('div');
        node.className = 'reserve-token';
        return node;
    }

    createTomatoFaceNode(value, rect) {
        const scale = rect.width / 155;
        const node = document.createElement('div');
        node.className = 'card-node board-tomato-card motion-card';
        node.style.cssText = this.sprites.tomatoCardStyle(Number(value), scale);
        return node;
    }

    createTomatoBackNode(rect) {
        const scale = rect.width / 155;
        const node = document.createElement('div');
        node.className = 'card-node card-back motion-card';
        node.style.cssText = this.sprites.cardBackStyle('tomato', scale);
        return node;
    }

    createMissionFaceNode(targetId, rect) {
        const scale = rect.width / 157.5;
        const node = document.createElement('div');
        node.className = 'card-node board-mission-card motion-card';
        node.style.cssText = this.sprites.missionCardStyle(Number(targetId), scale);
        return node;
    }

    createMissionBackNode(rect) {
        const scale = rect.width / 155;
        const node = document.createElement('div');
        node.className = 'card-node card-back motion-card';
        node.style.cssText = this.sprites.cardBackStyle('mission', scale);
        return node;
    }

    getRect(element) {
        return element?.getBoundingClientRect() ?? null;
    }

    async animateRect(wrapper, fromRect, toRect, {
        duration = CARD_MOVE_MS,
        easing = CARD_EASING,
    } = {}) {
        if (!wrapper || !fromRect || !toRect) {
            wrapper?.remove();
            return;
        }

        const dx = toRect.left - fromRect.left;
        const dy = toRect.top - fromRect.top;
        const sx = toRect.width / fromRect.width;
        const sy = toRect.height / fromRect.height;

        await wrapper.animate([
            { transform: 'translate(0px, 0px) scale(1, 1)' },
            {
                transform: `translate(${dx * 0.55}px, ${dy * 0.55}px) scale(${1 + (sx - 1) * 0.45}, ${1 + (sy - 1) * 0.45})`,
                offset: 0.6,
            },
            { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
        ], {
            duration,
            easing,
            fill: 'forwards',
        }).finished;

        wrapper.remove();
    }

    animateFlip(node, makeFrontNode, duration = FLIP_MS) {
        if (!node) {
            return Promise.resolve();
        }

        const half = duration / 2;
        const frontNode = makeFrontNode();
        frontNode.style.width = '100%';
        frontNode.style.height = '100%';

        const first = node.animate([
            { transform: 'rotateY(0deg)' },
            { transform: 'rotateY(90deg)' },
        ], {
            duration: half,
            easing: FLIP_IN_EASING,
            fill: 'forwards',
        }).finished.then(() => {
            node.replaceWith(frontNode);
            return frontNode.animate([
                { transform: 'rotateY(-90deg)' },
                { transform: 'rotateY(0deg)' },
            ], {
                duration: half,
                easing: FLIP_OUT_EASING,
                fill: 'forwards',
            }).finished;
        });

        return first;
    }

    getReserveTokenRect() {
        const tokens = [...document.querySelectorAll('#token-reserve .reserve-token')];
        return this.getRect(tokens[tokens.length - 1]);
    }

    getBoardSlotRect(space) {
        return this.getRect(document.querySelector(`.board-token-slot[data-space="${space}"]`));
    }

    getBoardTomatoRect(slot) {
        return this.getRect(document.querySelector(`#tomato-slot-${slot} .card-node`));
    }

    getBoardTargetRect(slot) {
        return this.getRect(document.querySelector(`#mission-slot-${slot} .card-node`));
    }

    getTargetSlotRect(slot) {
        return this.getRect(document.querySelector(`#mission-slot-${slot} .slot-card-host`));
    }

    getSelfHandCardRect(cardId) {
        return this.getRect(document.querySelector(`.hand-card-button[data-card-id="${cardId}"] .card-node`));
    }

    getOpponentHandRect(playerId) {
        const cards = [...document.querySelectorAll(`#player-zone-top-${playerId} .player-hand-back-host .card-node`)];
        const cardRect = this.getRect(cards[cards.length - 1]);
        if (cardRect) {
            return cardRect;
        }

        const fanRect = this.getRect(document.querySelector(`#player-zone-top-${playerId} .player-hand-fan`));
        if (!fanRect) {
            return null;
        }

        const scale = this.sprites.getCardScale('tomato');
        return {
            left: fanRect.left,
            top: fanRect.top,
            width: 155 * scale,
            height: 220 * scale,
        };
    }

    getDiscardPileRect() {
        return this.getRect(document.querySelector('#discard-slot .slot-card-host'));
    }

    getTomatoDeckRect() {
        return this.getRect(document.querySelector('#tomato-deck-slot .card-node'));
    }

    getMissionDeckRect() {
        return this.getRect(document.querySelector('#mission-deck-slot .card-node'));
    }

    getCollectDestinationRect(playerId) {
        const localPlayerId = this.game.getLocalPlayerId();
        if (Number(playerId) === Number(localPlayerId)) {
            const rowRect = this.getRect(document.querySelector(`#player-zone-top-${playerId} .self-hand-row`));
            if (!rowRect) {
                return null;
            }

            const scale = this.sprites.getCardScale('tomato');
            return {
                left: rowRect.left,
                top: rowRect.top,
                width: 155 * scale,
                height: 220 * scale,
            };
        }

        return this.getOpponentHandRect(playerId);
    }

    getReserveTokenDesignRect(index) {
        const canvasRect = this.getStageCanvasRect();
        const stageScale = this.sprites.getStageScale();
        if (!canvasRect) {
            return null;
        }

        const positions = [
            { x: 200, y: 1300 },
            { x: 100, y: 1450 },
            { x: 150, y: 1650 },
        ];
        const pos = positions[index] ?? positions[positions.length - 1];
        return {
            left: canvasRect.left + pos.x * stageScale,
            top: canvasRect.top + pos.y * stageScale,
            width: 300 * stageScale,
            height: 300 * stageScale,
        };
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

            const node = this.registry.getMissionNode(card, scale);
            this.registry.mount(host, node);
        });

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

        this.registry.removeMissing(['tomato-'], [...keepKeys, ...this.game.movingTomatoKeys]);
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
        const actions = this.game.gamedatas.currentTurnActions ?? [];
        const keep = new Set();
        actions.forEach((action, index) => {
            const slot = TOKEN_SLOTS.find(item => item.space === Number(action.space));
            if (!slot) {
                return;
            }

            const stackIndex = counts.get(slot.space) ?? 0;
            counts.set(slot.space, stackIndex + 1);
            const kind = (action.actionKind ?? action.action_kind) === 'collect' ? 'whole' : 'splat';
            const key = `placed-${index}`;
            keep.add(key);
            let node = tokenLayer.querySelector(`[data-key="${key}"]`);
            if (!node) {
                node = document.createElement('div');
                node.dataset.key = key;
                tokenLayer.appendChild(node);
            }
            node.className = `placed-token ${kind}`;
            node.style.left = `${slot.left}%`;
            node.style.top = `calc(${slot.top}% - ${stackIndex * 18}px)`;
        });

        [...tokenLayer.children].forEach(child => {
            if (!keep.has(child.dataset.key)) {
                child.remove();
            }
        });
    }

    renderReserveTokens() {
        const reserve = document.getElementById('token-reserve');
        if (!reserve) {
            return;
        }

        const remaining = Number(this.game.gamedatas.placementsRemaining ?? 0);
        const keep = new Set();
        Array.from({ length: remaining }, (_, index) => index).forEach(index => {
            const key = `reserve-${index}`;
            keep.add(key);
            let node = reserve.querySelector(`[data-key="${key}"]`);
            if (!node) {
                node = document.createElement('div');
                node.dataset.key = key;
                reserve.appendChild(node);
            }
            node.className = `reserve-token reserve-token-${index + 1}`;
        });

        [...reserve.children].forEach(child => {
            if (!keep.has(child.dataset.key)) {
                child.remove();
            }
        });
    }

    ensureRecentThrowWrap(targetIndex, success) {
        const area = document.getElementById('recent-throw-area');
        if (!area) {
            return null;
        }

        area.dataset.visible = 'true';
        let wrap = area.querySelector('.recent-throw');
        if (!wrap) {
            wrap = document.createElement('div');
            area.replaceChildren(wrap);
        }

        wrap.className = `recent-throw ${success ? 'is-success' : 'is-fail'}`;
        wrap.style.position = 'absolute';
        wrap.style.height = `${CARD_DESIGN_HEIGHT * this.sprites.getStageScale()}px`;
        const targetPos = TARGET_CARD_POSITIONS[targetIndex] ?? TARGET_CARD_POSITIONS[0];
        wrap.style.left = `${(targetPos.x - 150) * this.sprites.getStageScale()}px`;
        wrap.style.top = `${100 * this.sprites.getStageScale()}px`;

        let cards = wrap.querySelector('.recent-throw__cards');
        if (!cards) {
            cards = document.createElement('div');
            cards.className = 'recent-throw__cards';
            wrap.appendChild(cards);
        }

        return cards;
    }

    ensureRecentThrowHost(index, classes = []) {
        const cards = this.ensureRecentThrowWrap(
            Math.max(0, Number(this.game.recentThrow?.targetIndex ?? 0)),
            Boolean(this.game.recentThrow?.success)
        );
        if (!cards) {
            return null;
        }

        const key = `recent-host-${index}`;
        let host = cards.querySelector(`[data-key="${key}"]`);
        if (!host) {
            host = document.createElement('div');
            host.dataset.key = key;
            host.className = 'recent-throw__host';
            cards.appendChild(host);
        }

        host.className = ['recent-throw__host', ...classes].join(' ');
        return host;
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
            return;
        }

        const cards = this.ensureRecentThrowWrap(
            Math.max(0, Number(recent.targetIndex ?? 0)),
            Boolean(recent.success)
        );
        const keep = new Set();
        const total = (recent.cards?.length ?? 0) + (recent.revealed ? 1 : 0);
        for (let index = 0; index < total; index += 1) {
            keep.add(`recent-host-${index}`);
            const host = this.ensureRecentThrowHost(index, [index > 0 ? 'is-overlap' : '', index === total - 1 && recent.revealed ? 'reveal' : ''].filter(Boolean));
            if (host && !host.firstElementChild) {
                host.dataset.empty = 'true';
            }
        }

        [...cards.children].forEach(child => {
            if (!keep.has(child.dataset.key)) {
                child.remove();
            }
        });
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

        if (Number(playerId) === this.game.getLocalPlayerId()) {
            this.renderSelfHand(top);
            return;
        }

        this.renderOpponentHand(top, playerId);
    }

    ensureSingleChild(parent, selector, className) {
        let child = parent.querySelector(selector);
        if (!child) {
            child = document.createElement('div');
            child.className = className;
            parent.replaceChildren(child);
        } else if (parent.childElementCount !== 1 || parent.firstElementChild !== child) {
            parent.replaceChildren(child);
        }
        return child;
    }

    syncOrderedChildren(container, items, keyFn, createChild, updateChild) {
        const seen = new Set();
        items.forEach((item, index) => {
            const key = keyFn(item, index);
            seen.add(key);
            let child = container.querySelector(`[data-key="${key}"]`);
            if (!child) {
                child = createChild(item, index, key);
                child.dataset.key = key;
            }
            updateChild(child, item, index, key);
            container.appendChild(child);
        });

        [...container.children].forEach(child => {
            if (!seen.has(child.dataset.key)) {
                child.remove();
            }
        });
    }

    renderSelfHand(top) {
        const scale = this.sprites.getCardScale('tomato');
        const keepKeys = [];
        const row = this.ensureSingleChild(top, '.self-hand-row', 'self-hand-row');

        this.syncOrderedChildren(
            row,
            this.game.gamedatas.playerHand ?? [],
            card => String(card.id),
            (card) => {
                const button = document.createElement('button');
                button.className = 'hand-card-button';
                button.innerHTML = '<div class="hand-card-host"></div>';
                button.dataset.cardId = String(card.id);
                return button;
            },
            (button, card) => {
                const key = `tomato-${card.id}`;
                keepKeys.push(key);
                button.className = `hand-card-button ${this.game.selectedCardIds.includes(card.id) ? 'is-selected' : ''}`;
                button.dataset.cardId = String(card.id);
                button.dataset.value = String(card.value);
                const host = button.querySelector('.hand-card-host');
                this.registry.mount(host, this.registry.getTomatoNode(card, scale));
            }
        );

        this.registry.removeMissing(['tomato-'], [
            ...keepKeys,
            ...this.getBoardTomatoKeys(),
            ...this.getDiscardTomatoKeys(),
            ...this.game.movingTomatoKeys,
        ]);
    }

    renderOpponentHand(top, playerId) {
        const scale = this.sprites.getCardScale('tomato');
        const count = this.game.gamedatas.handCountsByPlayer?.[playerId] ?? 0;
        const fan = this.ensureSingleChild(top, '.player-hand-fan', 'player-hand-fan');
        const entries = Array.from({ length: count }, (_, index) => index);
        this.syncOrderedChildren(
            fan,
            entries,
            index => String(index),
            () => {
                const host = document.createElement('div');
                host.className = 'player-hand-back-host';
                return host;
            },
            (host, index) => {
                host.style.marginLeft = index === 0 ? '0' : `${-Math.round(0.68 * 155 * scale)}px`;
                this.registry.mount(host, this.registry.getBackNode(`back-opponent-${playerId}-${index}`, 'tomato', scale));
            }
        );
    }

    renderBoard(playerId) {
        const basketAnchor = document.getElementById(`basket-anchor-${playerId}`);
        const player = this.game.gamedatas.players?.[playerId];
        if (basketAnchor && player) {
            basketAnchor.innerHTML = `<div class="basket-token ${player.basketFull ? 'full' : 'empty'}"></div>`;
        }
    }

    ensureSelfHandPlaceholder(card) {
        const top = document.getElementById(`player-zone-top-${this.game.getLocalPlayerId()}`);
        if (!top || !card) {
            return null;
        }

        const row = this.ensureSingleChild(top, '.self-hand-row', 'self-hand-row');
        let button = row.querySelector(`.hand-card-button[data-card-id="${card.id}"]`);
        if (!button) {
            button = document.createElement('button');
            button.className = 'hand-card-button';
            button.innerHTML = '<div class="hand-card-host"></div>';
            button.dataset.cardId = String(card.id);
            row.appendChild(button);
        }

        button.className = 'hand-card-button';
        button.dataset.cardId = String(card.id);
        button.dataset.value = String(card.value);
        const host = button.querySelector('.hand-card-host');
        host.dataset.empty = 'true';
        return host;
    }

    ensureCapturedPlaceholder(playerId, quickToss, cardId) {
        const stack = document.getElementById(`captured-${quickToss ? 'quick' : 'normal'}-${playerId}`);
        if (!stack) {
            return null;
        }

        let wrapper = stack.querySelector(`.captured-card-host[data-key="${cardId}"]`);
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'captured-card-host';
            wrapper.dataset.key = String(cardId);
            stack.appendChild(wrapper);
        }

        wrapper.style.zIndex = '0';
        return wrapper;
    }

    renderCaptured(playerId) {
        const normalHost = document.getElementById(`captured-normal-${playerId}`);
        const quickHost = document.getElementById(`captured-quick-${playerId}`);
        const captured = this.game.gamedatas.capturedTargetsByPlayer?.[playerId] ?? { normal: [], quick: [] };
        const scale = this.sprites.getCardScale('mission');

        if (normalHost) {
            this.syncOrderedChildren(
                normalHost,
                captured.normal,
                card => String(card.id),
                () => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'captured-card-host';
                    return wrapper;
                },
                (wrapper, card, index) => {
                    wrapper.style.zIndex = String(100 - index);
                    this.registry.mount(wrapper, this.registry.getMissionNode(card, scale, ['captured-mission', 'normal']));
                }
            );
        }

        if (quickHost) {
            this.syncOrderedChildren(
                quickHost,
                captured.quick,
                card => String(card.id),
                () => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'captured-card-host';
                    return wrapper;
                },
                (wrapper, card, index) => {
                    wrapper.style.zIndex = String(100 - index);
                    this.registry.mount(wrapper, this.registry.getMissionNode(card, scale, ['captured-mission', 'quick']));
                }
            );
        }

    }

    getBoardTomatoKeys() {
        return (this.game.gamedatas.boardTomatoes ?? []).filter(Boolean).map(card => `tomato-${card.id}`);
    }

    getDiscardTomatoKeys() {
        return this.game.gamedatas.latestDiscardTomato ? [`tomato-${this.game.gamedatas.latestDiscardTomato.id}`] : [];
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
            ? this.game.getPlayerTurnPrompt()
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
        this.pendingCollectAnimation = null;
        this.turnCleanupPromise = null;
        this.deferredTurnCleanupActions = null;
        this.actionAnimationDepth = 0;
        this.movingTomatoKeys = new Set();
        this.movingMissionKeys = new Set();
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
        this.motionLayer = new MotionLayer(this, this.sprites);
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
                <div id="animation-layer"></div>
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

    rememberMovingTomatoKey(cardId) {
        this.movingTomatoKeys.add(`tomato-${cardId}`);
    }

    forgetMovingTomatoKey(cardId) {
        this.movingTomatoKeys.delete(`tomato-${cardId}`);
    }

    rememberMovingMissionKey(cardId) {
        this.movingMissionKeys.add(`mission-${cardId}`);
    }

    forgetMovingMissionKey(cardId) {
        this.movingMissionKeys.delete(`mission-${cardId}`);
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
            discardCountNeeded: source.discardCountNeeded ?? this.gamedatas.discardCountNeeded ?? 0,
        };

        if (this.pendingThrowResolution) {
            return this.buildFrozenThrowRenderData(base);
        }

        return base;
    }

    buildFrozenThrowRenderData(base) {
        return {
            ...base,
            boardTargets: this.gamedatas.boardTargets ?? [null, null, null],
            tomatoDeckCount: this.gamedatas.tomatoDeckCount ?? 0,
            targetDeckCount: this.gamedatas.targetDeckCount ?? 0,
            latestDiscardTomato: this.gamedatas.latestDiscardTomato ?? null,
            capturedTargetsByPlayer: this.gamedatas.capturedTargetsByPlayer ?? {},
        };
    }

    renderState(source) {
        const previousTurnActions = [...(this.gamedatas?.currentTurnActions ?? [])];
        this.gamedatas = { ...this.gamedatas, ...this.buildRenderData(source) };
        this.stageView.renderAll();
        this.playerZonesView.renderAll();
        this.renderOverallPlayerBoards();
        this.cleanupMissionNodes();
        this.updateActionButtons();

        const nextTurnActions = this.gamedatas.currentTurnActions ?? [];
        if (previousTurnActions.length > 0 && nextTurnActions.length === 0 && !this.turnCleanupPromise) {
            this.deferredTurnCleanupActions = previousTurnActions;
            this.flushDeferredTurnCleanup();
        }
    }

    cleanupMissionNodes() {
        const boardKeys = (this.gamedatas.boardTargets ?? []).filter(Boolean).map(card => `mission-${card.id}`);
        const capturedKeys = Object.values(this.gamedatas.capturedTargetsByPlayer ?? {}).flatMap(captured => [
            ...((captured?.normal ?? []).map(card => `mission-${card.id}`)),
            ...((captured?.quick ?? []).map(card => `mission-${card.id}`)),
        ]);
        this.registry.removeMissing(['mission-'], [...boardKeys, ...capturedKeys, ...this.movingMissionKeys]);
    }

    setStatePrompt(text) {
        this.bga.statusBar.setTitle(text);
    }

    wait(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    }

    hideElementDuringAnimation(element) {
        if (!element) {
            return () => {};
        }

        const previousVisibility = element.style.visibility;
        element.style.visibility = 'hidden';
        return () => {
            element.style.visibility = previousVisibility;
        };
    }

    beginActionAnimation() {
        this.actionAnimationDepth += 1;
    }

    endActionAnimation() {
        this.actionAnimationDepth = Math.max(0, this.actionAnimationDepth - 1);
        this.flushDeferredTurnCleanup();
    }

    isActionAnimationRunning() {
        return this.actionAnimationDepth > 0 || Boolean(this.pendingThrowResolution) || Boolean(this.recentThrow);
    }

    flushDeferredTurnCleanup() {
        if (this.turnCleanupPromise || !this.deferredTurnCleanupActions || this.isActionAnimationRunning()) {
            return;
        }

        const actions = this.deferredTurnCleanupActions;
        this.deferredTurnCleanupActions = null;
        this.turnCleanupPromise = this.animateTurnCleanup(actions).finally(() => {
            this.turnCleanupPromise = null;
            this.stageView.renderPlacedTokens();
            this.stageView.renderReserveTokens();
        });
    }

    animateReserveTokenToSpace(space) {
        const fromRect = this.motionLayer.getReserveTokenRect();
        const toRect = this.motionLayer.getBoardSlotRect(space);
        if (!fromRect || !toRect) {
            return Promise.resolve();
        }

        const tokenNode = this.motionLayer.createReserveTokenNode();
        const wrapper = this.motionLayer.createWrapper(tokenNode, fromRect, 'motion-token');
        return this.motionLayer.animateRect(wrapper, fromRect, toRect, {
            duration: TOKEN_MOVE_MS,
            easing: TOKEN_EASING,
        });
    }

    animateCollectMotion(args) {
        const sourceElement = document.querySelector(`#tomato-slot-${Number(args.space)} .card-node`);
        const sourceRect = this.motionLayer.getRect(sourceElement);
        const destinationRect = this.motionLayer.getCollectDestinationRect(Number(args.player_id));
        if (!sourceRect || !destinationRect) {
            return Promise.resolve();
        }

        const card = this.gamedatas.boardTomatoes?.[Number(args.space)];
        if (!card) {
            return Promise.resolve();
        }

        const node = this.motionLayer.createTomatoFaceNode(card.value, sourceRect);
        const wrapper = this.motionLayer.createWrapper(node, sourceRect, 'motion-card-wrapper');
        this.hideElementDuringAnimation(sourceElement);
        return this.motionLayer.animateRect(wrapper, sourceRect, destinationRect, {
            duration: CARD_MOVE_MS,
            easing: CARD_EASING,
        });
    }

    async animateLocalCollectToHand(publicArgs, collectedCard) {
        if (!publicArgs || !collectedCard) {
            return;
        }

        const sourceNode = document.querySelector(`#tomato-slot-${Number(publicArgs.space)} .card-node`);
        const destinationHost = this.playerZonesView.ensureSelfHandPlaceholder(collectedCard);
        if (!sourceNode || !destinationHost) {
            return;
        }

        this.rememberMovingTomatoKey(collectedCard.id);
        await this.motionLayer.moveNodeToHost(sourceNode, destinationHost, {
            duration: CARD_MOVE_MS,
            easing: CARD_EASING,
        });
    }

    animateCollectRefill(args) {
        if (!args.refill) {
            return Promise.resolve();
        }

        const sourceRect = this.motionLayer.getTomatoDeckRect();
        const destinationRect = this.motionLayer.getRect(document.querySelector(`#tomato-slot-${Number(args.space)} .slot-card-host`));
        if (!sourceRect || !destinationRect) {
            return Promise.resolve();
        }

        const backNode = this.motionLayer.createTomatoBackNode(sourceRect);
        const wrapper = this.motionLayer.createWrapper(backNode, sourceRect, 'motion-card-wrapper');
        const movePromise = this.motionLayer.animateRect(wrapper, sourceRect, destinationRect, {
            duration: CARD_MOVE_MS,
            easing: CARD_EASING,
        });
        const flipPromise = this.motionLayer.animateFlip(
            backNode,
            () => this.motionLayer.createTomatoFaceNode(args.refill.value, sourceRect),
            FLIP_MS
        );

        return Promise.all([movePromise, flipPromise]);
    }

    animateThrowCards(args, selectedIds) {
        const playerId = Number(args.player_id);
        const isLocalPlayer = playerId === this.getLocalPlayerId();
        const animations = [];

        (args.cards ?? []).forEach((value, index) => {
            const sourceNode = isLocalPlayer
                ? document.querySelector(`.hand-card-button[data-card-id="${selectedIds[index]}"] .card-node`)
                : [...document.querySelectorAll(`#player-zone-top-${playerId} .player-hand-back-host .card-node`)].pop();
            const destinationHost = this.stageView.ensureRecentThrowHost(index, [index > 0 ? 'is-overlap' : '']);
            if (!sourceNode || !destinationHost) {
                return;
            }

            const movePromise = this.motionLayer.moveNodeToHost(sourceNode, destinationHost, {
                duration: CARD_MOVE_MS,
                easing: CARD_EASING,
            });

            if (isLocalPlayer) {
                animations.push(movePromise);
                return;
            }

            const flipPromise = this.motionLayer.animateFlip(
                sourceNode,
                () => this.motionLayer.createTomatoFaceNode(value, {
                    width: sourceNode.getBoundingClientRect().width || (155 * this.sprites.getCardScale('tomato')),
                }),
                FLIP_MS
            );
            animations.push(Promise.all([movePromise, flipPromise]));
        });

        return Promise.all(animations);
    }

    animateQuickReveal(args) {
        if (!args.quickToss || !args.revealed?.value) {
            return Promise.resolve();
        }

        const sourceRect = this.motionLayer.getRect(document.querySelector('#tomato-deck-slot .card-node'));
        const destinationHost = this.stageView.ensureRecentThrowHost((args.cards ?? []).length, [
            (args.cards?.length ?? 0) > 0 ? 'is-overlap' : '',
            'reveal',
        ].filter(Boolean));
        if (!sourceRect || !destinationHost) {
            return Promise.resolve();
        }

        const backNode = this.motionLayer.createTomatoBackNode(sourceRect);
        const movePromise = this.motionLayer.moveNewNodeToHost(backNode, sourceRect, destinationHost, {
            duration: CARD_MOVE_MS,
            easing: CARD_EASING,
        });
        const flipPromise = this.motionLayer.animateFlip(
            backNode,
            () => this.motionLayer.createTomatoFaceNode(args.revealed.value, sourceRect),
            FLIP_MS
        );

        return Promise.all([movePromise, flipPromise]);
    }

    async animateThrowEntry(args, selectedIds) {
        await this.animateReserveTokenToSpace(Number(args.space));
        await this.animateThrowCards(args, selectedIds);
        await this.animateQuickReveal(args);
    }

    async animateDiscardMotion(args) {
        const playerId = Number(args.player_id);
        const isLocalPlayer = playerId === this.getLocalPlayerId();
        const discardRect = this.motionLayer.getDiscardPileRect();
        if (!discardRect) {
            return;
        }

        const values = args.cardValues ?? [];
        const selectedIds = isLocalPlayer ? [...this.selectedCardIds] : [];
        if (isLocalPlayer) {
            const discardHost = document.querySelector('#discard-slot .slot-card-host');
            if (!discardHost) {
                return;
            }

            for (const cardId of selectedIds) {
                const sourceNode = document.querySelector(`.hand-card-button[data-card-id="${cardId}"] .card-node`);
                if (!sourceNode) {
                    continue;
                }

                this.rememberMovingTomatoKey(cardId);
                await this.motionLayer.moveNodeToHost(sourceNode, discardHost, {
                    duration: CARD_MOVE_MS,
                    easing: CARD_EASING,
                });
            }
            return;
        }

        const animations = values.map(() => {
            const sourceRect = this.motionLayer.getOpponentHandRect(playerId);
            if (!sourceRect) {
                return Promise.resolve();
            }

            const node = this.motionLayer.createTomatoBackNode(sourceRect);
            const wrapper = this.motionLayer.createWrapper(node, sourceRect, 'motion-card-wrapper');
            return this.motionLayer.animateRect(wrapper, sourceRect, discardRect, {
                duration: CARD_MOVE_MS,
                easing: CARD_EASING,
            });
        });

        await Promise.all(animations);
    }

    async animateThrownCardsToDiscard(args) {
        const discardHost = document.querySelector('#discard-slot .slot-card-host');
        if (!discardHost) {
            return;
        }

        const thrownValues = [...(args.cards ?? [])];
        if (args.quickToss && args.revealed?.value) {
            thrownValues.push(args.revealed.value);
        }

        await Promise.all(thrownValues.map((value, index) => {
            const sourceNode = document.querySelector(`.recent-throw__host[data-key="recent-host-${index}"] .card-node`);
            if (!sourceNode) {
                return Promise.resolve();
            }

            return this.motionLayer.moveNodeToHost(sourceNode, discardHost, {
                duration: CARD_MOVE_MS,
                easing: CARD_EASING,
            });
        }));
    }

    async animateCapturedTarget(args) {
        if (!args.success) {
            return;
        }

        const playerId = Number(args.player_id);
        const quickToss = Boolean(args.quickToss);
        const sourceElement = document.querySelector(`#mission-slot-${Number(args.targetIndex ?? 0)} .card-node`);
        const destinationHost = this.playerZonesView.ensureCapturedPlaceholder(playerId, quickToss, args.targetId);
        if (!sourceElement || !destinationHost || !args.targetId) {
            return;
        }

        this.rememberMovingMissionKey(args.targetId);
        await this.motionLayer.moveNodeToHost(sourceElement, destinationHost, {
            duration: CARD_MOVE_MS,
            easing: CARD_EASING,
        });
    }

    async animateReplacementTarget(args) {
        if (!args.replacementTarget) {
            return;
        }

        const sourceRect = this.motionLayer.getMissionDeckRect();
        const destinationHost = document.querySelector(`#mission-slot-${Number(args.targetIndex ?? 0)} .slot-card-host`);
        if (!sourceRect || !destinationHost) {
            return;
        }

        const backNode = this.motionLayer.createMissionBackNode(sourceRect);
        const missionNode = this.registry.getMissionNode(args.replacementTarget, this.sprites.getCardScale('mission'));
        this.rememberMovingMissionKey(args.replacementTarget.id);
        const movePromise = this.motionLayer.moveNewNodeToHost(backNode, sourceRect, destinationHost, {
            duration: CARD_MOVE_MS,
            easing: CARD_EASING,
        });
        const flipPromise = this.motionLayer.animateFlip(
            backNode,
            () => missionNode,
            FLIP_MS
        );

        await Promise.all([movePromise, flipPromise]);
    }

    async animateBonusCardToHand(args) {
        if (Number(args.player_id) !== this.getLocalPlayerId() || !args.bonusCard) {
            return;
        }

        const sourceRect = this.motionLayer.getTomatoDeckRect();
        const destinationHost = this.playerZonesView.ensureSelfHandPlaceholder(args.bonusCard);
        if (!sourceRect || !destinationHost) {
            return;
        }

        const backNode = this.motionLayer.createTomatoBackNode(sourceRect);
        const tomatoNode = this.registry.getTomatoNode(args.bonusCard, this.sprites.getCardScale('tomato'));
        this.rememberMovingTomatoKey(args.bonusCard.id);
        const movePromise = this.motionLayer.moveNewNodeToHost(backNode, sourceRect, destinationHost, {
            duration: CARD_MOVE_MS,
            easing: CARD_EASING,
        });
        const flipPromise = this.motionLayer.animateFlip(
            backNode,
            () => tomatoNode,
            FLIP_MS
        );

        await Promise.all([movePromise, flipPromise]);
    }

    async animateTurnCleanup(turnActions) {
        if (!turnActions?.length) {
            return;
        }

        const tokens = [...document.querySelectorAll('#festival-token-layer .placed-token')];
        if (tokens.length === 0) {
            return;
        }

        await Promise.all(tokens.map((token, index) => {
            const fromRect = this.motionLayer.getRect(token);
            const toRect = this.motionLayer.getReserveTokenDesignRect(Math.min(index, 2));
            if (!fromRect || !toRect) {
                return Promise.resolve();
            }

            const clone = document.createElement('div');
            clone.className = token.className;
            const wrapper = this.motionLayer.createWrapper(clone, fromRect, 'motion-token');
            token.style.visibility = 'hidden';
            return this.motionLayer.animateRect(wrapper, fromRect, toRect, {
                duration: TURN_CLEANUP_MS,
                easing: TOKEN_EASING,
            }).finally(() => {
                token.style.visibility = '';
            });
        }));
    }

    renderOverallPlayerBoards() {
        Object.values(this.gamedatas.players ?? {}).forEach(player => {
            const playerId = Number(player.id);
            const panel = document.getElementById(`overall_player_board_${playerId}`);
            if (!panel) {
                return;
            }

            let counter = panel.querySelector('.tomatoss-overall-hand');
            if (!counter) {
                counter = document.createElement('div');
                counter.className = 'tomatoss-overall-hand';
                counter.innerHTML = `
                    <div class="tomatoss-overall-hand__icon"></div>
                    <span class="tomatoss-overall-hand__count"></span>
                `;
                panel.appendChild(counter);
            }

            const count = Number(this.gamedatas.handCountsByPlayer?.[playerId] ?? 0);
            counter.querySelector('.tomatoss-overall-hand__count').textContent = String(count);
        });
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

        const action = this.currentUiMode === 'discard' ? 'actDiscardCards' : 'actTossToTarget';
        if (!this.canInteract(action)) {
            return;
        }

        const cardId = Number(button.dataset.cardId);
        const wasSelected = this.selectedCardIds.includes(cardId);
        if (this.currentUiMode === 'discard') {
            if (wasSelected) {
                this.selectedCardIds = this.selectedCardIds.filter(id => id !== cardId);
            } else {
                const discardNeeded = Number(this.gamedatas.discardCountNeeded ?? 0);
                if (this.selectedCardIds.length >= discardNeeded) {
                    return;
                }
                this.selectedCardIds = [...this.selectedCardIds, cardId];
            }
        } else if (wasSelected) {
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

    getPlayerTurnPrompt() {
        if (this.pendingSpace !== null && this.pendingSpace < 3) {
            return _('Pick up the selected tomato card.');
        }

        if (this.pendingSpace !== null && this.pendingSpace >= 3) {
            return _('Choose tomato cards to toss.');
        }

        return _('Choose an action.');
    }

    updateActionButtons() {
        this.bga.statusBar.removeActionButtons();
        if (this.currentUiMode === 'playerTurn') {
            this.setStatePrompt(this.isCurrentPlayerActive
                ? this.getPlayerTurnPrompt()
                : _('Waiting for the active player.'));
        }
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
        const discardNeeded = Number(this.gamedatas.discardCountNeeded ?? 0);
        const hasExactSelection = this.selectedCardIds.length === discardNeeded && discardNeeded > 0;
        this.bga.statusBar.addActionButton(_('Discard selected'), () => this.confirmDiscard(), {
            color: 'alert',
            disabled: !hasExactSelection,
        });
        if (this.selectedCardIds.length > 0) {
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
        const discardNeeded = Number(this.gamedatas.discardCountNeeded ?? 0);
        if (this.selectedCardIds.length !== discardNeeded || discardNeeded <= 0) {
            return;
        }

        this.bga.actions.performAction('actDiscardCards', { cardsJson: JSON.stringify(this.selectedCardIds) });
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
        this.renderOverallPlayerBoards();
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
    }

    showRecentThrow(args) {
        if (this.recentThrowTimeout) {
            clearTimeout(this.recentThrowTimeout);
        }
        this.recentThrowTimeout = setTimeout(() => {
            const pending = this.pendingThrowResolution;
            this.pendingThrowResolution = null;
            if (pending) {
                setTimeout(async () => {
                    try {
                        await this.animateThrownCardsToDiscard(pending);
                        await this.wait(THROW_RESULT_PAUSE_MS);
                        await this.animateCapturedTarget(pending);
                        await this.animateReplacementTarget(pending);
                        (pending.playedCardIds ?? []).forEach(cardId => this.forgetMovingTomatoKey(cardId));
                        if (pending.targetId) {
                            this.forgetMovingMissionKey(pending.targetId);
                        }
                        if (pending.replacementTarget?.id) {
                            this.forgetMovingMissionKey(pending.replacementTarget.id);
                        }
                        this.recentThrow = null;
                        this.stageView.renderRecentThrow();
                        this.applyThrowAction(pending);
                        this.afterPublicChange();
                    } finally {
                        this.endActionAnimation();
                    }
                }, THROW_RESOLVE_DELAY_MS);
                return;
            }
            this.recentThrow = null;
            this.stageView.renderRecentThrow();
            this.endActionAnimation();
        }, THROW_CUTSCENE_MS);
    }

    prepareRecentThrow(args) {
        this.recentThrow = {
            targetId: args.targetId,
            targetIndex: Number(args.targetIndex),
            cards: args.cards ?? [],
            revealed: args.revealed?.value ?? null,
            success: Boolean(args.success),
        };
        this.stageView.renderRecentThrow();
    }

    afterPublicChange() {
        this.stageView.renderAll();
        this.playerZonesView.renderAll();
        this.updateActionButtons();
    }

    async notif_turnAction(args) {
        const isCollect = Object.prototype.hasOwnProperty.call(args, 'refill');
        let finishInPrivateUpdate = false;
        this.beginActionAnimation();
        this.pushTurnAction({
            space: Number(args.space),
            actionKind: isCollect ? 'collect' : (args.quickToss ? 'quick_toss' : 'normal_toss'),
            cards: args.cards ?? [],
            revealed: args.revealed ?? null,
            targetId: args.targetId ?? null,
            scoreGained: args.scoreGained ?? 0,
        });

        try {
            if (isCollect) {
                await this.animateReserveTokenToSpace(Number(args.space));
                const isLocalCollect = Number(args.player_id) === this.getLocalPlayerId();
                if (isLocalCollect) {
                    finishInPrivateUpdate = true;
                    this.pendingCollectAnimation = args;
                    this.clearPendingAction();
                    this.stageView.renderPlacedTokens();
                    this.stageView.renderReserveTokens();
                    this.updateActionButtons();
                    return;
                }

                await this.animateCollectMotion(args);
                await this.wait(REFILL_PAUSE_MS);
                await this.animateCollectRefill(args);
                this.applyCollectAction(args);
                this.clearPendingAction();
                this.afterPublicChange();
            } else {
                const selectedIds = [...this.selectedCardIds];
                selectedIds.forEach(cardId => this.rememberMovingTomatoKey(cardId));
                this.prepareRecentThrow(args);
                const throwAnimation = this.animateThrowEntry(args, selectedIds);
                this.applyImmediateThrowHandChange(args);
                this.pendingThrowResolution = { ...args, playedCardIds: selectedIds };
                this.clearSelection();
                this.clearPendingAction();
                this.updateActionButtons();
                await throwAnimation;
                this.stageView.renderPlacedTokens();
                this.stageView.renderReserveTokens();
                this.showRecentThrow(args);
            }
        } finally {
            if (isCollect && !finishInPrivateUpdate) {
                this.endActionAnimation();
            }
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
        const discardedIds = [...this.selectedCardIds];
        await this.animateDiscardMotion(args);
        discardedIds.forEach(cardId => this.forgetMovingTomatoKey(cardId));
        this.gamedatas.latestDiscardTomato = args.latestDiscardTomato ?? this.gamedatas.latestDiscardTomato;
        this.updateHandCount(args.player_id, args.handCount);
        this.clearSelection();
        this.afterPublicChange();
    }

    async notif_privateHandUpdate(args) {
        const isLocalPlayer = Number(args.player_id) === this.getLocalPlayerId();
        if (Array.isArray(args.playerHand)) {
            this.gamedatas.playerHand = args.playerHand;
            this.updateHandCount(args.player_id, args.playerHand.length);
        }

        if (args.mode === 'collect' && isLocalPlayer && this.pendingCollectAnimation && args.collected) {
            try {
                await this.animateLocalCollectToHand(this.pendingCollectAnimation, args.collected);
                await this.wait(REFILL_PAUSE_MS);
                await this.animateCollectRefill(this.pendingCollectAnimation);
                this.forgetMovingTomatoKey(args.collected.id);
                this.applyCollectAction(this.pendingCollectAnimation);
                this.playerZonesView.renderHandArea(this.getLocalPlayerId());
                this.pendingCollectAnimation = null;
                this.afterPublicChange();
            } finally {
                this.endActionAnimation();
            }
            return;
        }

        this.playerZonesView.renderHandArea(this.getLocalPlayerId());
        if (args.mode === 'bonus' && args.bonusCard) {
            await this.animateBonusCardToHand(args);
            this.forgetMovingTomatoKey(args.bonusCard.id);
            this.playerZonesView.renderHandArea(this.getLocalPlayerId());
        }
        this.updateActionButtons();
    }
}
