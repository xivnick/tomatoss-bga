/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * tomatoss implementation : © xivnick
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
const THROW_CUTSCENE_MS = 760;
const THROW_RESOLVE_DELAY_MS = 60;
const TOKEN_MOVE_MS = 380;
const CARD_MOVE_MS = 560;
const FLIP_MS = 520;
const REFILL_PAUSE_MS = 180;
const THROW_RESULT_PAUSE_MS = 120;
const TURN_CLEANUP_MS = 320;
const TOKEN_DESIGN_SIZE = 300;
const TOKEN_STACK_RISE_PX = 6;
const TOKEN_EASING = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
const CARD_EASING = 'cubic-bezier(0.18, 0.84, 0.32, 1)';
const FLIP_IN_EASING = 'cubic-bezier(0.55, 0.08, 0.68, 0.53)';
const FLIP_OUT_EASING = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
const PREF_ANIMATION_SPEED = 100;
const PREF_REPEATED_CLICK_CONFIRM = 101;
const ANIMATION_FULL = 1;
const ANIMATION_REDUCED = 2;
const ANIMATION_NONE = 3;
const REPEATED_CLICK_CONFIRM_ON = 1;
const LOCAL_STORAGE_ZOOM_KEY = 'Tomatoss-zoom';

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
        const node = this.getNode(`mission-${card.id}`, {
            style: this.sprites.missionCardStyle(Number(card.targetId), scale),
            classes: ['card-node', 'board-mission-card', ...classes],
        });
        this.game.bindMissionTooltip(node, Number(card.targetId));
        return node;
    }

    getTomatoNode(card, scale, classes = []) {
        const node = this.getNode(`tomato-${card.id}`, {
            style: this.sprites.tomatoCardStyle(Number(card.value), scale),
            classes: ['card-node', 'board-tomato-card', ...classes],
        });
        this.game.bindTomatoTooltip(node, Number(card.value));
        return node;
    }

    getBackNode(key, kind, scale, classes = []) {
        return this.getNode(key, {
            style: this.sprites.cardBackStyle(kind, scale),
            classes: ['card-node', 'card-back', ...classes],
        });
    }

    getTemporaryTomatoNode(key, value, scale, classes = []) {
        const node = this.getNode(key, {
            style: this.sprites.tomatoCardStyle(Number(value), scale),
            classes: ['card-node', 'recent-throw__tomato', ...classes],
        });
        this.game.bindTomatoTooltip(node, Number(value));
        return node;
    }

    getTemporaryMissionNode(key, targetId, scale, classes = []) {
        const node = this.getNode(key, {
            style: this.sprites.missionCardStyle(Number(targetId), scale),
            classes: ['card-node', 'board-mission-card', ...classes],
        });
        this.game.bindMissionTooltip(node, Number(targetId));
        return node;
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
        node.id = `tomatoss-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
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

    createReserveTokenNode(face = 'whole') {
        const node = document.createElement('div');
        node.className = `moving-token ${face}`;
        node.style.width = '100%';
        node.style.height = '100%';
        return node;
    }

    animateTokenFaceChange(node, nextFace, delay = TOKEN_MOVE_MS / 2) {
        if (!node) {
            return Promise.resolve();
        }

        if (delay <= 0) {
            node.className = `moving-token ${nextFace}`;
            return Promise.resolve();
        }

        return new Promise(resolve => {
            setTimeout(() => {
                node.className = `moving-token ${nextFace}`;
                resolve();
            }, delay);
        });
    }

    async animateDiscardRecycleToDeck(latestDiscardTomato) {
        const discardRect = this.getDiscardPileRect();
        const deckRect = this.getTomatoDeckRect();
        if (!discardRect || !deckRect) {
            return;
        }

        const startNode = latestDiscardTomato
            ? this.createTomatoFaceNode(latestDiscardTomato.value, discardRect)
            : this.createTomatoBackNode(discardRect);
        const wrapper = this.createWrapper(startNode, discardRect, 'motion-card-wrapper');
        const movePromise = this.animateRect(wrapper, discardRect, deckRect, {
            duration: this.game.getAnimationDuration(CARD_MOVE_MS),
            easing: CARD_EASING,
        });
        const flipPromise = this.animateFlip(
            startNode,
            () => this.createTomatoBackNode(deckRect),
            this.game.getAnimationDuration(FLIP_MS)
        );
        await Promise.all([movePromise, flipPromise]);
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

        if (duration <= 0) {
            wrapper.remove();
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

        if (duration <= 0) {
            const frontNode = makeFrontNode();
            frontNode.style.width = '100%';
            frontNode.style.height = '100%';
            frontNode.style.display = 'block';
            node.replaceWith(frontNode);
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

    getPlacedTokenRect(space, stackIndex) {
        const board = document.getElementById('festival-board');
        const boardRect = this.getRect(board);
        if (!boardRect) {
            return null;
        }

        const slot = TOKEN_SLOTS.find(item => item.space === Number(space));
        if (!slot) {
            return null;
        }

        const width = TOKEN_DESIGN_SIZE * this.sprites.getBoardScale();
        const height = TOKEN_DESIGN_SIZE * this.sprites.getBoardScale();
        const left = boardRect.left + (slot.left / 100) * boardRect.width - (width / 2);
        const top = boardRect.top + (slot.top / 100) * boardRect.height - (height / 2) - (stackIndex * TOKEN_STACK_RISE_PX);
        return { left, top, width, height };
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
        const actions = this.game.getDisplayedTurnActions();
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
            node.style.top = `calc(${slot.top}% - ${stackIndex * TOKEN_STACK_RISE_PX}px)`;
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

        const remaining = this.game.getDisplayedPlacementsRemaining();
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
        const localPlayerId = Number(this.game.getLocalPlayerId());
        const baseOrder = (this.game.gamedatas.turnOrderPlayerIds ?? []).map(playerId => Number(playerId));
        const localIndex = baseOrder.indexOf(localPlayerId);
        const order = localIndex >= 0
            ? [...baseOrder.slice(localIndex), ...baseOrder.slice(0, localIndex)]
            : baseOrder;
        const orderIndex = new Map(order.map((playerId, index) => [playerId, index]));
        return Object.values(this.game.gamedatas.players ?? {}).sort((a, b) => {
            const aIndex = orderIndex.get(Number(a.id)) ?? Number.MAX_SAFE_INTEGER;
            const bIndex = orderIndex.get(Number(b.id)) ?? Number.MAX_SAFE_INTEGER;
            if (aIndex !== bIndex) {
                return aIndex - bIndex;
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
        this.deferredResolveBonusArgs = null;
        this.deferredBonusHandUpdateArgs = null;
        this.cleanupDisplayActions = null;
        this.turnCleanupPromise = null;
        this.deferredTurnCleanupActions = null;
        this.actionAnimationDepth = 0;
        this.movingTomatoKeys = new Set();
        this.movingMissionKeys = new Set();
        this.isDiscardPopupOpen = false;
        this.openMissionPopupIndex = null;
        this.zoomManager = null;
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
                                                <button
                                                    class="mission-zoom-button"
                                                    data-role="open-mission-popup"
                                                    data-target-index="${index}"
                                                    aria-label="${_('View target card')}"
                                                >?</button>
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
                <div id="discard-popup" class="discard-popup is-hidden" aria-hidden="true">
                    <div class="discard-popup__backdrop" data-role="close-discard-popup"></div>
                    <div class="discard-popup__panel">
                        <button class="discard-popup__close" data-role="close-discard-popup" aria-label="${_('Close discard pile')}">×</button>
                        <div class="discard-popup__header">
                            <div class="discard-popup__title">${_('Discard pile')}</div>
                            <div id="discard-popup-count" class="discard-popup__count"></div>
                        </div>
                        <div id="discard-popup-cards" class="discard-popup__cards"></div>
                    </div>
                </div>
                <div id="mission-popup" class="mission-popup is-hidden" aria-hidden="true">
                    <div class="mission-popup__backdrop" data-role="close-mission-popup"></div>
                    <div class="mission-popup__panel">
                        <button class="mission-popup__close" data-role="close-mission-popup" aria-label="${_('Close target card')}">×</button>
                        <div class="mission-popup__header">
                            <div class="mission-popup__title">${_('Target card')}</div>
                        </div>
                        <div id="mission-popup-card" class="mission-popup__card"></div>
                    </div>
                </div>
            </div>
        `);

        this.playerZonesView.setup();
        this.bindRootEvents();
        window.addEventListener('resize', this.onWindowResize);
        this.renderState(gamedatas);
        this.setupZoomManager();
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

    getDisplayedTurnActions() {
        return this.cleanupDisplayActions ?? this.gamedatas.currentTurnActions ?? [];
    }

    getDisplayedPlacementsRemaining() {
        if (this.cleanupDisplayActions) {
            return 0;
        }
        return Number(this.gamedatas.placementsRemaining ?? 0);
    }

    bindRootEvents() {
        const root = document.getElementById('tomatoss-layout');
        if (!root || root.dataset.bound === 'true') {
            return;
        }

        root.addEventListener('click', event => {
            const target = event.target;
            const missionZoomButton = target.closest('.mission-zoom-button');
            if (missionZoomButton) {
                this.openMissionPopup(Number(missionZoomButton.dataset.targetIndex));
                return;
            }

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

            if (target.closest('#discard-slot')) {
                if (this.isDiscardPopupOpen) {
                    this.closeDiscardPopup();
                } else {
                    this.openDiscardPopup();
                }
                return;
            }

            if (target.closest('[data-role="close-discard-popup"]')) {
                this.closeDiscardPopup();
                return;
            }

            if (target.closest('[data-role="close-mission-popup"]')) {
                this.closeMissionPopup();
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
            publicDiscardCount: source.publicDiscardCount ?? this.gamedatas.publicDiscardCount ?? 0,
            latestDiscardTomato: source.latestDiscardTomato ?? this.gamedatas.latestDiscardTomato ?? null,
            discardTomatoes: source.discardTomatoes ?? this.gamedatas.discardTomatoes ?? [],
            playerHand: source.playerHand ?? this.gamedatas.playerHand ?? [],
            handCountsByPlayer: source.handCountsByPlayer ?? this.gamedatas.handCountsByPlayer ?? {},
            currentTurnActions: source.currentTurnActions ?? this.gamedatas.currentTurnActions ?? [],
            placementsRemaining: source.placementsRemaining ?? this.gamedatas.placementsRemaining ?? 3,
            capturedTargetsByPlayer: source.capturedTargetsByPlayer ?? this.gamedatas.capturedTargetsByPlayer ?? {},
            discardCountNeeded: source.discardCountNeeded ?? this.gamedatas.discardCountNeeded ?? 0,
            turnOrderPlayerIds: source.turnOrderPlayerIds ?? this.gamedatas.turnOrderPlayerIds ?? [],
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
            publicDiscardCount: this.gamedatas.publicDiscardCount ?? 0,
            latestDiscardTomato: this.gamedatas.latestDiscardTomato ?? null,
            discardTomatoes: this.gamedatas.discardTomatoes ?? [],
            capturedTargetsByPlayer: this.gamedatas.capturedTargetsByPlayer ?? {},
        };
    }

    renderState(source) {
        const previousTurnActions = [...(this.gamedatas?.currentTurnActions ?? [])];
        const nextData = { ...this.gamedatas, ...this.buildRenderData(source) };
        const nextTurnActions = nextData.currentTurnActions ?? [];
        if (previousTurnActions.length > 0 && nextTurnActions.length === 0 && !this.turnCleanupPromise) {
            this.deferredTurnCleanupActions = previousTurnActions;
            this.cleanupDisplayActions = previousTurnActions;
        }

        this.gamedatas = nextData;
        this.stageView.renderAll();
        this.playerZonesView.renderAll();
        this.renderOverallPlayerBoards();
        this.renderDiscardPopup();
        this.renderMissionPopup();
        this.cleanupMissionNodes();
        this.updateActionButtons();
        this.flushDeferredTurnCleanup();
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

    setupZoomManager() {
        const ZoomManager = window.BgaZoom?.Manager;
        const fullTable = document.getElementById('full-table');
        if (!ZoomManager || !fullTable || this.zoomManager) {
            return;
        }

        this.zoomManager = new ZoomManager({
            element: fullTable,
            zoomControls: {
                color: 'white',
            },
            localStorageZoomKey: LOCAL_STORAGE_ZOOM_KEY,
            onDimensionsChange: () => this.renderState(this.gamedatas),
        });
    }

    supportsHoverTooltips() {
        return Boolean(window.matchMedia?.('(hover: hover)').matches);
    }

    getTooltipDelay() {
        return document.body.classList.contains('touch-device') ? 800 : 250;
    }

    getTooltipApi() {
        const gameui = this.bga.gameui;
        return {
            addHtml: gameui?.addTooltipHtml?.bind(gameui) ?? this.bga.addTooltipHtml?.bind(this.bga),
            remove: gameui?.removeTooltip?.bind(gameui) ?? this.bga.removeTooltip?.bind(this.bga),
        };
    }

    buildMissionTooltipHtml(targetId) {
        const scale = 300 / 157.5;
        return `
            <div class="tomatoss-card-tooltip">
                <div class="tomatoss-card-tooltip__title">${_('Target card')}</div>
                <div class="tomatoss-card-tooltip__card" style="${this.sprites.missionCardStyle(Number(targetId), scale)}"></div>
            </div>
        `;
    }

    buildTomatoTooltipHtml(value) {
        const scale = 270 / 155;
        return `
            <div class="tomatoss-card-tooltip">
                <div class="tomatoss-card-tooltip__title">${_('Tomato card')} ${Number(value)}</div>
                <div class="tomatoss-card-tooltip__card" style="${this.sprites.tomatoCardStyle(Number(value), scale)}"></div>
            </div>
        `;
    }

    bindMissionTooltip(node, targetId) {
        if (!node || !this.supportsHoverTooltips()) {
            return;
        }
        const api = this.getTooltipApi();
        if (!api.addHtml || !node.id) {
            return;
        }
        api.remove?.(node.id);
        api.addHtml(node.id, this.buildMissionTooltipHtml(targetId), this.getTooltipDelay());
    }

    bindTomatoTooltip(node, value) {
        if (!node || !this.supportsHoverTooltips()) {
            return;
        }
        const api = this.getTooltipApi();
        if (!api.addHtml || !node.id) {
            return;
        }
        api.remove?.(node.id);
        api.addHtml(node.id, this.buildTomatoTooltipHtml(value), this.getTooltipDelay());
    }

    getAnimationPreferenceValue() {
        const value = this.bga.gameui?.getGameUserPreference?.(PREF_ANIMATION_SPEED)
            ?? this.bga.getGameUserPreference?.(PREF_ANIMATION_SPEED)
            ?? ANIMATION_FULL;
        const parsed = Number(value);
        if ([ANIMATION_FULL, ANIMATION_REDUCED, ANIMATION_NONE].includes(parsed)) {
            return parsed;
        }
        return ANIMATION_FULL;
    }

    isAutoTossOnRepeatedClickEnabled() {
        const value = this.bga.gameui?.getGameUserPreference?.(PREF_REPEATED_CLICK_CONFIRM)
            ?? this.bga.getGameUserPreference?.(PREF_REPEATED_CLICK_CONFIRM)
            ?? REPEATED_CLICK_CONFIRM_ON;
        return Number(value) === REPEATED_CLICK_CONFIRM_ON;
    }

    getAnimationSpeedFactor() {
        if (this.bga.gameui?.bgaAnimationsActive && !this.bga.gameui.bgaAnimationsActive()) {
            return 0;
        }

        switch (this.getAnimationPreferenceValue()) {
            case ANIMATION_NONE:
                return 0;
            case ANIMATION_REDUCED:
                return 0.6;
            case ANIMATION_FULL:
            default:
                return 1;
        }
    }

    getAnimationDuration(baseMs) {
        const factor = this.getAnimationSpeedFactor();
        if (factor <= 0) {
            return 0;
        }
        return Math.max(1, Math.round(baseMs * factor));
    }

    wait(ms) {
        const duration = this.getAnimationDuration(ms);
        if (duration <= 0) {
            return Promise.resolve();
        }
        return new Promise(resolve => {
            setTimeout(resolve, duration);
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

    shouldAnimateNotifications() {
        return !document.hidden
            && document.hasFocus()
            && this.getAnimationSpeedFactor() > 0;
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
            this.cleanupDisplayActions = null;
            this.stageView.renderPlacedTokens();
            this.stageView.renderReserveTokens();
        });
    }

    getActionStackIndex(space) {
        return Math.max(
            0,
            (this.gamedatas.currentTurnActions ?? []).filter(action => Number(action.space) === Number(space)).length - 1
        );
    }

    animateReserveTokenToSpace(space) {
        const fromRect = this.motionLayer.getReserveTokenRect();
        const toRect = this.motionLayer.getPlacedTokenRect(space, this.getActionStackIndex(space));
        if (!fromRect || !toRect) {
            return Promise.resolve();
        }

        const tokenNode = this.motionLayer.createReserveTokenNode();
        const wrapper = this.motionLayer.createWrapper(tokenNode, fromRect, 'motion-token');
        const movePromise = this.motionLayer.animateRect(wrapper, fromRect, toRect, {
            duration: this.getAnimationDuration(TOKEN_MOVE_MS),
            easing: TOKEN_EASING,
        });
        if (Number(space) < 3) {
            return movePromise;
        }

        const facePromise = this.motionLayer.animateTokenFaceChange(
            tokenNode,
            'splat',
            this.getAnimationDuration(TOKEN_MOVE_MS / 2)
        );
        return Promise.all([movePromise, facePromise]);
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
            duration: this.getAnimationDuration(CARD_MOVE_MS),
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
            duration: this.getAnimationDuration(CARD_MOVE_MS),
            easing: CARD_EASING,
        });
    }

    animateCollectRefill(args) {
        if (!args.refill) {
            return Promise.resolve();
        }

        const recycledDiscardTop = args.recycledTomatoDiscard
            ? this.prepareRecycleTomatoDiscardVisualState()
            : null;
        const recyclePromise = args.recycledTomatoDiscard
            ? this.motionLayer.animateDiscardRecycleToDeck(recycledDiscardTop)
            : Promise.resolve();

        const sourceRect = this.motionLayer.getTomatoDeckRect();
        const destinationRect = this.motionLayer.getRect(document.querySelector(`#tomato-slot-${Number(args.space)} .slot-card-host`));
        if (!sourceRect || !destinationRect) {
            return Promise.resolve();
        }

        const backNode = this.motionLayer.createTomatoBackNode(sourceRect);
        const wrapper = this.motionLayer.createWrapper(backNode, sourceRect, 'motion-card-wrapper');
        const movePromise = this.motionLayer.animateRect(wrapper, sourceRect, destinationRect, {
            duration: this.getAnimationDuration(CARD_MOVE_MS),
            easing: CARD_EASING,
        });
        const flipPromise = this.motionLayer.animateFlip(
            backNode,
            () => this.motionLayer.createTomatoFaceNode(args.refill.value, sourceRect),
            this.getAnimationDuration(FLIP_MS)
        );

        return recyclePromise.then(() => Promise.all([movePromise, flipPromise]));
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
                duration: this.getAnimationDuration(CARD_MOVE_MS),
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
                this.getAnimationDuration(FLIP_MS)
            );
            animations.push(Promise.all([movePromise, flipPromise]));
        });

        return Promise.all(animations);
    }

    animateQuickReveal(args) {
        if (!args.quickToss || !args.revealed?.value) {
            return Promise.resolve();
        }

        const recycledDiscardTop = args.recycledTomatoDiscard
            ? this.prepareRecycleTomatoDiscardVisualState()
            : null;
        const recyclePromise = args.recycledTomatoDiscard
            ? this.motionLayer.animateDiscardRecycleToDeck(recycledDiscardTop)
            : Promise.resolve();

        return recyclePromise.then(() => {
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
            duration: this.getAnimationDuration(CARD_MOVE_MS),
            easing: CARD_EASING,
        });
        const flipPromise = this.motionLayer.animateFlip(
            backNode,
            () => this.motionLayer.createTomatoFaceNode(args.revealed.value, sourceRect),
            this.getAnimationDuration(FLIP_MS)
        );

        return Promise.all([movePromise, flipPromise]);
        });
    }

    async animateThrowEntry(args, selectedIds) {
        await this.animateReserveTokenToSpace(Number(args.space));
        this.stageView.renderPlacedTokens();
        this.stageView.renderReserveTokens();
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
                    duration: this.getAnimationDuration(CARD_MOVE_MS),
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
                duration: this.getAnimationDuration(CARD_MOVE_MS),
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
                duration: this.getAnimationDuration(CARD_MOVE_MS),
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
            duration: this.getAnimationDuration(CARD_MOVE_MS),
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
            duration: this.getAnimationDuration(CARD_MOVE_MS),
            easing: CARD_EASING,
        });
        const flipPromise = this.motionLayer.animateFlip(
            backNode,
            () => missionNode,
            this.getAnimationDuration(FLIP_MS)
        );

        await Promise.all([movePromise, flipPromise]);
    }

    async animateBonusCardToHand(args) {
        if (Number(args.player_id) !== this.getLocalPlayerId() || !args.bonusCard) {
            return;
        }

        if (args.recycledTomatoDiscard) {
            const recycledDiscardTop = this.prepareRecycleTomatoDiscardVisualState();
            await this.motionLayer.animateDiscardRecycleToDeck(recycledDiscardTop);
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
            duration: this.getAnimationDuration(CARD_MOVE_MS),
            easing: CARD_EASING,
        });
        const flipPromise = this.motionLayer.animateFlip(
            backNode,
            () => tomatoNode,
            this.getAnimationDuration(FLIP_MS)
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

            const clone = this.motionLayer.createReserveTokenNode(
                token.classList.contains('splat') ? 'splat' : 'whole'
            );
            const wrapper = this.motionLayer.createWrapper(clone, fromRect, 'motion-token');
            token.style.visibility = 'hidden';
            return this.motionLayer.animateRect(wrapper, fromRect, toRect, {
                duration: this.getAnimationDuration(TURN_CLEANUP_MS),
                easing: TOKEN_EASING,
            }).finally(() => {
                token.style.visibility = '';
            });
        }));
    }

    renderOverallPlayerBoards() {
        Object.values(this.gamedatas.players ?? {}).forEach(player => {
            const playerId = Number(player.id);
            const panel = this.bga.playerPanels.getElement(playerId);
            if (!panel) {
                return;
            }

            let counter = panel.querySelector('.tomatoss-overall-hand');
            if (!counter) {
                counter = document.createElement('div');
                counter.className = 'tomatoss-overall-hand';
                panel.appendChild(counter);
            }
            if (!counter.querySelector('.tomatoss-overall-basket')) {
                counter.innerHTML = `
                    <div class="tomatoss-overall-hand__icon"></div>
                    <span class="tomatoss-overall-hand__count"></span>
                    <div class="tomatoss-overall-basket">
                        <div class="tomatoss-overall-basket__icon"></div>
                        <span class="tomatoss-overall-basket__label"></span>
                    </div>
                `;
            }

            const count = Number(this.gamedatas.handCountsByPlayer?.[playerId] ?? 0);
            counter.querySelector('.tomatoss-overall-hand__count').textContent = `${count}/8`;
            const basketLabel = counter.querySelector('.tomatoss-overall-basket__label');
            const basketIcon = counter.querySelector('.tomatoss-overall-basket__icon');
            const basketFull = Boolean(this.gamedatas.players?.[playerId]?.basketFull);
            basketLabel.textContent = basketFull ? _('Full') : _('Empty');
            basketIcon.className = `tomatoss-overall-basket__icon ${basketFull ? 'is-full' : 'is-empty'}`;
        });
    }

    openMissionPopup(index) {
        if (!this.gamedatas.boardTargets?.[index]) {
            return;
        }
        this.openMissionPopupIndex = index;
        this.renderMissionPopup();
    }

    closeMissionPopup() {
        this.openMissionPopupIndex = null;
        this.renderMissionPopup();
    }

    openDiscardPopup() {
        if ((this.gamedatas.discardTomatoes?.length ?? 0) === 0) {
            this.bga.dialogs.showMessage(_('Discard pile is empty'), 'error');
            return;
        }
        this.isDiscardPopupOpen = true;
        this.renderDiscardPopup();
    }

    renderMissionPopup() {
        const popup = document.getElementById('mission-popup');
        const cardRoot = document.getElementById('mission-popup-card');
        if (!popup || !cardRoot) {
            return;
        }

        const index = this.openMissionPopupIndex;
        const card = Number.isInteger(index) ? this.gamedatas.boardTargets?.[index] : null;
        const isOpen = Boolean(card);
        popup.classList.toggle('is-hidden', !isOpen);
        popup.setAttribute('aria-hidden', isOpen ? 'false' : 'true');

        if (!isOpen) {
            cardRoot.replaceChildren();
            this.registry.clearTemporary('mission-popup-');
            return;
        }

        const popupCardWidth = Math.min(window.innerWidth * 0.82, 430);
        const scale = popupCardWidth / 157.5;
        const host = document.createElement('div');
        host.className = 'mission-popup__card-host';
        host.style.width = `${157.5 * scale}px`;
        host.style.height = `${220 * scale}px`;
        this.registry.mount(
            host,
            this.registry.getTemporaryMissionNode(`mission-popup-${card.id}`, card.targetId, scale)
        );
        cardRoot.replaceChildren(host);
    }

    closeDiscardPopup() {
        this.isDiscardPopupOpen = false;
        this.renderDiscardPopup();
    }

    renderDiscardPopup() {
        const popup = document.getElementById('discard-popup');
        const cardsRoot = document.getElementById('discard-popup-cards');
        const countChip = document.getElementById('discard-popup-count');
        if (!popup || !cardsRoot || !countChip) {
            return;
        }

        const cards = this.gamedatas.discardTomatoes ?? [];
        popup.classList.toggle('is-hidden', !this.isDiscardPopupOpen);
        popup.setAttribute('aria-hidden', this.isDiscardPopupOpen ? 'false' : 'true');
        countChip.textContent = `${cards.length} ${cards.length === 1 ? _('card') : _('cards')}`;

        if (!this.isDiscardPopupOpen) {
            cardsRoot.replaceChildren();
            this.registry.clearTemporary('discard-popup-');
            return;
        }

        const scale = this.sprites.getCardScale('tomato') * 0.82;
        cardsRoot.replaceChildren();
        cards.forEach((card, index) => {
            const cardHost = document.createElement('div');
            cardHost.className = 'discard-popup__card';
            this.registry.mount(
                cardHost,
                this.registry.getTemporaryTomatoNode(`discard-popup-card-${index}`, Number(card.value), scale)
            );
            cardsRoot.appendChild(cardHost);
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

        if (this.isAutoTossOnRepeatedClickEnabled()) {
            this.confirmToss(false);
        } else {
            this.bga.dialogs.showMessage(_('Both Toss and Quick toss are possible. Use the action buttons.'), 'error');
        }
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
                return count === 1 && [6, 7].includes(sorted[0]);
            case 14:
            case 15:
                return count === 2 && Math.abs(sorted[0] - sorted[1]) === 1;
            case 16:
            case 17:
                return 11 <= sum && sum <= 13;
            case 18:
                return 11 <= sum && sum <= 13 && !sorted.includes(3);
            case 19:
            case 20:
                return count === 1 && [2, 4, 6].includes(sorted[0]);
            case 21:
            case 22:
                return 6 <= sum && sum <= 8;
            case 23:
                return 6 <= sum && sum <= 8 && !sorted.includes(3);
            case 24:
                return count === 2 && sum === 10;
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
        if (Object.prototype.hasOwnProperty.call(args, 'publicDiscardCount')) {
            this.gamedatas.publicDiscardCount = args.publicDiscardCount;
        }
        if (Object.prototype.hasOwnProperty.call(args, 'latestDiscardTomato')) {
            this.gamedatas.latestDiscardTomato = args.latestDiscardTomato;
        }
        if (Object.prototype.hasOwnProperty.call(args, 'discardTomatoes')) {
            this.gamedatas.discardTomatoes = args.discardTomatoes;
        }
        this.updateHandCount(args.player_id, args.handCount ?? ((this.gamedatas.handCountsByPlayer?.[args.player_id] ?? 0) + 1));
    }

    applyThrowAction(args) {
        const slotIndex = Number(args.targetIndex);
        this.gamedatas.boardTargets = [...(this.gamedatas.boardTargets ?? [])];
        if (args.replacementTarget) {
            this.gamedatas.boardTargets[slotIndex] = args.replacementTarget;
        } else if (args.success) {
            this.gamedatas.boardTargets[slotIndex] = null;
        }
        this.gamedatas.capturedTargetsByPlayer = args.capturedTargetsByPlayer ?? this.gamedatas.capturedTargetsByPlayer;
        this.gamedatas.tomatoDeckCount = args.tomatoDeckCount ?? this.gamedatas.tomatoDeckCount;
        this.gamedatas.targetDeckCount = args.targetDeckCount ?? this.gamedatas.targetDeckCount;
        if (Object.prototype.hasOwnProperty.call(args, 'publicDiscardCount')) {
            this.gamedatas.publicDiscardCount = args.publicDiscardCount;
        }
        if (Object.prototype.hasOwnProperty.call(args, 'latestDiscardTomato')) {
            this.gamedatas.latestDiscardTomato = args.latestDiscardTomato;
        }
        if (Object.prototype.hasOwnProperty.call(args, 'discardTomatoes')) {
            this.gamedatas.discardTomatoes = args.discardTomatoes;
        }
        this.updateHandCount(args.player_id, args.handCount ?? (this.gamedatas.handCountsByPlayer?.[args.player_id] ?? 0));
    }

    applyImmediateThrowHandChange(args) {
        if (Number(args.player_id) !== this.getLocalPlayerId()) {
            this.updateHandCount(args.player_id, args.handCount ?? (this.gamedatas.handCountsByPlayer?.[args.player_id] ?? 0));
            return;
        }

        const playedIds = new Set((args.playedCardIds ?? []).map(id => Number(id)));
        if (playedIds.size === 0) {
            return;
        }

        this.gamedatas.playerHand = (this.gamedatas.playerHand ?? []).filter(card => !playedIds.has(Number(card.id)));
        this.updateHandCount(args.player_id, this.gamedatas.playerHand.length);
    }

    prepareRecycleTomatoDiscardVisualState() {
        const recycledDiscardTop = this.gamedatas.latestDiscardTomato ?? null;
        const recycledCount = Number(this.gamedatas.publicDiscardCount ?? 0);
        if (recycledCount <= 0) {
            return recycledDiscardTop;
        }

        this.gamedatas.latestDiscardTomato = null;
        this.gamedatas.discardTomatoes = [];
        this.gamedatas.publicDiscardCount = 0;
        this.gamedatas.tomatoDeckCount = Number(this.gamedatas.tomatoDeckCount ?? 0) + recycledCount;
        this.stageView.renderTomatoRow();
        this.renderDiscardPopup();
        return recycledDiscardTop;
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
                        await this.flushDeferredPostThrowNotifications();
                    } finally {
                        this.endActionAnimation();
                    }
                }, this.getAnimationDuration(THROW_RESOLVE_DELAY_MS));
                return;
            }
            this.recentThrow = null;
            this.stageView.renderRecentThrow();
            this.endActionAnimation();
        }, this.getAnimationDuration(THROW_CUTSCENE_MS));
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
        this.renderOverallPlayerBoards();
        this.renderMissionPopup();
        this.updateActionButtons();
    }

    applyResolveBonusNotification(args) {
        if (this.gamedatas.players?.[args.player_id]) {
            this.gamedatas.players[args.player_id].basketFull = args.basketFull;
        }
        this.gamedatas.tomatoDeckCount = args.tomatoDeckCount ?? this.gamedatas.tomatoDeckCount;
        if (Object.prototype.hasOwnProperty.call(args, 'publicDiscardCount')) {
            this.gamedatas.publicDiscardCount = args.publicDiscardCount;
        }
        if (Object.prototype.hasOwnProperty.call(args, 'latestDiscardTomato')) {
            this.gamedatas.latestDiscardTomato = args.latestDiscardTomato;
        }
        if (Object.prototype.hasOwnProperty.call(args, 'discardTomatoes')) {
            this.gamedatas.discardTomatoes = args.discardTomatoes;
        }
        this.updateHandCount(args.player_id, args.handCount);
        this.playerZonesView.renderPlayer(args.player_id);
        this.renderOverallPlayerBoards();
        this.updateActionButtons();
    }

    async applyPrivateHandUpdateNotification(args) {
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

    async flushDeferredPostThrowNotifications() {
        if (this.deferredResolveBonusArgs) {
            const args = this.deferredResolveBonusArgs;
            this.deferredResolveBonusArgs = null;
            this.applyResolveBonusNotification(args);
        }

        if (this.deferredBonusHandUpdateArgs) {
            const args = this.deferredBonusHandUpdateArgs;
            this.deferredBonusHandUpdateArgs = null;
            await this.applyPrivateHandUpdateNotification(args);
        }
    }

    async notif_turnAction(args) {
        const isCollect = Object.prototype.hasOwnProperty.call(args, 'refill');
        if (!this.shouldAnimateNotifications()) {
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
                this.applyImmediateThrowHandChange({ ...args, playedCardIds: this.selectedCardIds });
                this.applyThrowAction({ ...args, playedCardIds: this.selectedCardIds });
                this.clearSelection();
                this.clearPendingAction();
                this.afterPublicChange();
            }
            return;
        }

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
                this.stageView.renderPlacedTokens();
                this.stageView.renderReserveTokens();
                const isLocalCollect = Number(args.player_id) === this.getLocalPlayerId();
                if (isLocalCollect) {
                    finishInPrivateUpdate = true;
                    this.pendingCollectAnimation = args;
                    this.clearPendingAction();
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
                this.showRecentThrow(args);
            }
        } finally {
            if (isCollect && !finishInPrivateUpdate) {
                this.endActionAnimation();
            }
        }
    }

    async notif_resolveBonus(args) {
        if (this.recentThrow || this.pendingThrowResolution) {
            this.deferredResolveBonusArgs = args;
            return;
        }

        this.applyResolveBonusNotification(args);
    }

    async notif_discardCard(args) {
        if (!this.shouldAnimateNotifications()) {
            if (Object.prototype.hasOwnProperty.call(args, 'latestDiscardTomato')) {
                this.gamedatas.latestDiscardTomato = args.latestDiscardTomato;
            }
            if (Object.prototype.hasOwnProperty.call(args, 'publicDiscardCount')) {
                this.gamedatas.publicDiscardCount = args.publicDiscardCount;
            }
            if (Object.prototype.hasOwnProperty.call(args, 'discardTomatoes')) {
                this.gamedatas.discardTomatoes = args.discardTomatoes;
            }
            this.updateHandCount(args.player_id, args.handCount);
            this.clearSelection();
            this.afterPublicChange();
            return;
        }

        const discardedIds = [...this.selectedCardIds];
        await this.animateDiscardMotion(args);
        discardedIds.forEach(cardId => this.forgetMovingTomatoKey(cardId));
        if (Object.prototype.hasOwnProperty.call(args, 'latestDiscardTomato')) {
            this.gamedatas.latestDiscardTomato = args.latestDiscardTomato;
        }
        if (Object.prototype.hasOwnProperty.call(args, 'publicDiscardCount')) {
            this.gamedatas.publicDiscardCount = args.publicDiscardCount;
        }
        if (Object.prototype.hasOwnProperty.call(args, 'discardTomatoes')) {
            this.gamedatas.discardTomatoes = args.discardTomatoes;
        }
        this.updateHandCount(args.player_id, args.handCount);
        this.clearSelection();
        this.afterPublicChange();
    }

    async notif_privateHandUpdate(args) {
        if (args.mode === 'bonus' && (this.recentThrow || this.pendingThrowResolution)) {
            this.deferredBonusHandUpdateArgs = args;
            return;
        }

        if (!this.shouldAnimateNotifications()) {
            if (Array.isArray(args.playerHand)) {
                this.gamedatas.playerHand = args.playerHand;
                this.updateHandCount(args.player_id, args.playerHand.length);
            }
            this.playerZonesView.renderHandArea(this.getLocalPlayerId());
            this.updateActionButtons();
            return;
        }

        await this.applyPrivateHandUpdateNotification(args);
    }
}
