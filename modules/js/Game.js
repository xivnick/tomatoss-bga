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
const CUSTOM_ACTION_BUTTON_IDS = ['pickup_button', 'toss_button', 'quick_toss_button', 'discard_button'];

class SpriteStyles {
    getLayoutElement() {
        return document.getElementById('tomatoss-layout');
    }

    getPositiveWidth(...elements) {
        for (const element of elements) {
            const width = Number(element?.clientWidth ?? 0);
            if (width > 0) {
                return width;
            }
        }
        return 0;
    }

    getStageWidth() {
        const layoutParent = this.getLayoutElement()?.parentElement;
        const leftSide = document.getElementById('left-side');
        const available = this.getPositiveWidth(layoutParent, leftSide) || STAGE_DESIGN_WIDTH;
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
        const xPercent = col === 0 ? 0 : (col / 5) * 100;
        const yPercent = row === 0 ? 0 : (row / 4) * 100;
        return `
            width:${width}px;
            height:${height}px;
            background-image:url('${g_gamethemeurl}img/mission_cards.jpg');
            background-repeat:no-repeat;
            background-size:600% 500%;
            background-position:${xPercent}% ${yPercent}%;
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
        return this.getRect(document.getElementById('festival-stage-canvas'));
    }

    getGameUiMethod(name) {
        return this.game.bga.gameui?.[name]?.bind(this.game.bga.gameui)
            ?? this.game.bga[name]?.bind(this.game.bga);
    }

    playDojoAnimation(animation, duration = 0) {
        if (!animation) {
            return Promise.resolve();
        }

        return new Promise(resolve => {
            let settled = false;
            let endHandle = null;
            let stopHandle = null;
            let timerId = null;
            const finish = () => {
                if (settled) {
                    return;
                }
                settled = true;
                if (endHandle) {
                    dojo.disconnect(endHandle);
                }
                if (stopHandle) {
                    dojo.disconnect(stopHandle);
                }
                if (timerId !== null) {
                    clearTimeout(timerId);
                }
                resolve();
            };

            if (typeof dojo !== 'undefined') {
                endHandle = dojo.connect(animation, 'onEnd', finish);
                stopHandle = dojo.connect(animation, 'onStop', finish);
            }

            timerId = setTimeout(finish, Math.max(100, duration + 150));
            animation.play();
        });
    }

    resetFloatingNode(node) {
        if (!node) {
            return;
        }

        node.classList.remove('motion-floating');
        node.style.pointerEvents = '';
        node.style.position = '';
        node.style.left = '';
        node.style.top = '';
        node.style.zIndex = '';
    }

    prepareFloatingNode(node, sourceElement, sourceRectOverride = null) {
        const layer = this.getLayer();
        const placeOnObject = this.getGameUiMethod('placeOnObject');
        if (!node || !layer || !sourceElement || !placeOnObject) {
            return null;
        }

        const sourceRect = sourceRectOverride ?? this.getRect(sourceElement);
        node.classList.add('motion-floating');
        node.style.pointerEvents = 'none';
        node.style.position = 'absolute';
        node.style.zIndex = '200';
        if (sourceRect) {
            node.style.width = `${sourceRect.width}px`;
            node.style.height = `${sourceRect.height}px`;
        }
        layer.appendChild(node);
        placeOnObject(node, sourceElement);
        return node;
    }

    async slideFloatingNodeToElement(node, destinationElement, {
        duration = CARD_MOVE_MS,
        destroy = false,
    } = {}) {
        const slideToObject = this.getGameUiMethod('slideToObject');
        if (!node || !destinationElement || !slideToObject) {
            node?.remove();
            return;
        }

        await this.playDojoAnimation(
            slideToObject(node, destinationElement, duration),
            duration
        );

        if (destroy) {
            node.remove();
            return;
        }

        this.resetFloatingNode(node);
    }

    async moveNodeToHost(node, destinationHost, {
        duration = CARD_MOVE_MS,
    } = {}) {
        if (!node || !destinationHost) {
            return;
        }

        const attachToNewParent = this.getGameUiMethod('attachToNewParent');
        const layer = this.getLayer();
        if (!attachToNewParent || !layer) {
            return;
        }

        const movingNode = attachToNewParent(node, layer);
        movingNode.classList.add('motion-floating');
        movingNode.style.pointerEvents = 'none';
        movingNode.style.position = 'absolute';
        movingNode.style.zIndex = '200';
        await this.slideFloatingNodeToElement(movingNode, destinationHost, { duration });
        destinationHost.dataset.empty = 'false';
        destinationHost.replaceChildren(movingNode);
        this.resetFloatingNode(movingNode);
    }

    async moveNewNodeToHost(node, sourceElement, destinationHost, {
        duration = CARD_MOVE_MS,
        sourceRect = null,
    } = {}) {
        if (!node || !sourceElement || !destinationHost) {
            return;
        }

        const movingNode = this.prepareFloatingNode(node, sourceElement, sourceRect);
        if (!movingNode) {
            return;
        }

        await this.slideFloatingNodeToElement(movingNode, destinationHost, { duration });
        destinationHost.dataset.empty = 'false';
        destinationHost.replaceChildren(movingNode);
        this.resetFloatingNode(movingNode);
    }

    async moveNewNodeToElementAndDestroy(node, sourceElement, destinationElement, {
        duration = CARD_MOVE_MS,
        sourceRect = null,
    } = {}) {
        if (!node || !sourceElement || !destinationElement) {
            return;
        }

        const movingNode = this.prepareFloatingNode(node, sourceElement, sourceRect);
        if (!movingNode) {
            return;
        }

        await this.slideFloatingNodeToElement(movingNode, destinationElement, {
            duration,
            destroy: true,
        });
    }

    createReserveTokenNode(face = 'whole') {
        const node = document.createElement('div');
        node.className = `moving-token ${face}`;
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
        const discardElement = document.querySelector('#discard-slot .slot-card-host');
        const deckElement = document.querySelector('#tomato-deck-slot .card-node');
        const discardRect = this.getRect(discardElement);
        if (!discardElement || !deckElement || !discardRect) {
            return;
        }

        const startNode = latestDiscardTomato
            ? this.createTomatoFaceNode(latestDiscardTomato.value, discardRect)
            : this.createTomatoBackNode(discardRect);
        const movePromise = this.moveNewNodeToElementAndDestroy(startNode, discardElement, deckElement, {
            duration: this.game.getAnimationDuration(CARD_MOVE_MS),
        });
        const flipPromise = this.animateFlip(
            startNode,
            () => this.createTomatoBackNode(discardRect),
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
        const getIgnoreZoomRect = this.game.bga.gameui?.getBoundingClientRectIgnoreZoom?.bind(this.game.bga.gameui)
            ?? this.game.bga.getBoundingClientRectIgnoreZoom?.bind(this.game.bga);
        const rect = element
            ? (getIgnoreZoomRect?.(element) ?? element.getBoundingClientRect?.())
            : null;
        if (!rect) {
            return null;
        }
        return {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
        };
    }

    copyVisualNodeState(targetNode, sourceNode) {
        if (!targetNode || !sourceNode) {
            return;
        }

        const preserved = {
            position: targetNode.style.position,
            left: targetNode.style.left,
            top: targetNode.style.top,
            zIndex: targetNode.style.zIndex,
            pointerEvents: targetNode.style.pointerEvents,
            width: targetNode.style.width,
            height: targetNode.style.height,
        };

        targetNode.className = sourceNode.className;
        targetNode.style.cssText = sourceNode.style.cssText;

        targetNode.style.position = preserved.position;
        targetNode.style.left = preserved.left;
        targetNode.style.top = preserved.top;
        targetNode.style.zIndex = preserved.zIndex;
        targetNode.style.pointerEvents = preserved.pointerEvents;
        targetNode.style.width = preserved.width;
        targetNode.style.height = preserved.height;
    }

    animateFlip(node, makeFrontNode, duration = FLIP_MS) {
        if (!node) {
            return Promise.resolve();
        }

        const sourceRect = this.getRect(node);
        node.classList.add('is-flipping');

        if (duration <= 0) {
            const frontNode = makeFrontNode();
            if (sourceRect) {
                frontNode.style.width = `${sourceRect.width}px`;
                frontNode.style.height = `${sourceRect.height}px`;
            }
            this.copyVisualNodeState(node, frontNode);
            node.classList.remove('is-flipping');
            return Promise.resolve();
        }

        const half = duration / 2;
        const frontNode = makeFrontNode();
        if (sourceRect) {
            frontNode.style.width = `${sourceRect.width}px`;
            frontNode.style.height = `${sourceRect.height}px`;
        }

        const first = node.animate([
            { transform: 'rotateY(0deg)' },
            { transform: 'rotateY(90deg)' },
        ], {
            duration: half,
            easing: FLIP_IN_EASING,
            fill: 'forwards',
        }).finished.then(() => {
            this.copyVisualNodeState(node, frontNode);
            return node.animate([
                { transform: 'rotateY(-90deg)' },
                { transform: 'rotateY(0deg)' },
            ], {
                duration: half,
                easing: FLIP_OUT_EASING,
                fill: 'forwards',
            }).finished;
        }).finally(() => {
            node.classList.remove('is-flipping');
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

            const key = `mission-${card.id}`;
            if (this.game.movingMissionKeys.has(key)) {
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
            if (this.game.movingTomatoKeys.has(key)) {
                this.registry.mount(host, null, { empty: true });
                return;
            }
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
            node.style.visibility = index < this.game.hiddenReserveTokenCount ? 'hidden' : '';
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

    ensureRecentThrowHost(index, classes = [], targetIndex = null, success = null) {
        const cards = this.ensureRecentThrowWrap(
            Math.max(0, Number(targetIndex ?? this.game.recentThrow?.targetIndex ?? 0)),
            Boolean(success ?? this.game.recentThrow?.success)
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
            const host = this.ensureRecentThrowHost(
                index,
                [index > 0 ? 'is-overlap' : '', index === total - 1 && recent.revealed ? 'reveal' : ''].filter(Boolean),
                recent.targetIndex,
                recent.success
            );
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
            const botBadge = player.isBot ? ` <span class="tomatoss-bot-badge">${_('AI')}</span>` : '';
            root.insertAdjacentHTML('beforeend', `
                <div class="tomatoss-player-zone whiteblock ${isSelf ? 'is-self' : ''}" id="player-zone-${player.id}">
                    <div class="tomatoss-player-zone__top" id="player-zone-top-${player.id}"></div>
                    <div class="tomatoss-player-zone__namebar">
                        <div class="tomatoss-player-zone__name">${player.name ?? `P${player.id}`}${botBadge}</div>
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
                if (this.game.movingTomatoKeys.has(key)) {
                    host.dataset.empty = 'true';
                    host.replaceChildren();
                    return;
                }
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
            basketAnchor.innerHTML = `<div class="basket-token ${this.game.isBasketFull(player.basketFull) ? 'full' : 'empty'}"></div>`;
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
                    if (this.game.movingMissionKeys.has(`mission-${card.id}`)) {
                        wrapper.dataset.empty = 'true';
                        wrapper.replaceChildren();
                        return;
                    }
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
                    if (this.game.movingMissionKeys.has(`mission-${card.id}`)) {
                        wrapper.dataset.empty = 'true';
                        wrapper.replaceChildren();
                        return;
                    }
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
        const turnCleanupTokens = this.game.captureTurnCleanupForNextTurn(args);
        this.game.renderState(args, { updateButtons: !turnCleanupTokens });
        if (turnCleanupTokens) {
            this.game.startTurnCleanup(turnCleanupTokens);
            return;
        }
        this.game.setStatePrompt(isCurrentPlayerActive
            ? this.game.getPlayerTurnPrompt()
            : _('Waiting for the active player.'));
        this.game.updateActionButtons();
    }

    onLeavingState() {
        this.game.clearCustomActionButtons();
        this.game.currentUiMode = null;
        this.game.isCurrentPlayerActive = false;
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
        this.game.clearCustomActionButtons();
        this.game.renderState(args);
        this.game.setStatePrompt(_('Resolving bonus'));
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
        this.game.clearCustomActionButtons();
        this.game.currentUiMode = null;
        this.game.isCurrentPlayerActive = false;
    }
}

class TurnDispatchState {
    constructor(game) {
        this.game = game;
    }

    onEnteringState(args) {
        this.game.currentUiMode = null;
        this.game.isCurrentPlayerActive = false;
        this.game.clearPendingAction();
        this.game.clearSelection();
        this.game.clearCustomActionButtons();
        const turnCleanupTokens = this.game.captureTurnCleanupForNextTurn(args);
        this.game.renderState(args, { updateButtons: !turnCleanupTokens });
        if (turnCleanupTokens) {
            this.game.startTurnCleanup(turnCleanupTokens);
        }
        const seat = args?.currentSeatId !== undefined ? this.game.gamedatas.players?.[args.currentSeatId] : null;
        if (args?.isBotSeat && seat) {
            this.game.setStatePrompt(_('${player_name} is taking a turn.').replace('${player_name}', seat.name ?? `P${seat.id}`));
            return;
        }
        this.game.setStatePrompt(_('Preparing next turn...'));
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
        this.deferredCollectHandUpdateArgs = null;
        this.deferredResolveBonusArgs = null;
        this.deferredBonusHandUpdateArgs = null;
        this.turnCleanupPromise = null;
        this.hiddenReserveTokenCount = 0;
        this.actionAnimationDepth = 0;
        this.movingTomatoKeys = new Set();
        this.movingMissionKeys = new Set();
        this.isDiscardPopupOpen = false;
        this.openMissionPopupIndex = null;
        this.discardDialog = null;
        this.missionDialog = null;
        this.resizeRaf = null;
        this.layoutReadyPollRaf = null;
        this.documentClickBound = false;
        this.onWindowResize = () => {
            if (this.resizeRaf !== null) {
                cancelAnimationFrame(this.resizeRaf);
            }
            this.resizeRaf = requestAnimationFrame(() => {
                this.resizeRaf = null;
                this.renderWhenLayoutReady();
            });
        };

        this.sprites = new SpriteStyles();
        this.registry = new CardRegistry(this, this.sprites);
        this.motionLayer = new MotionLayer(this, this.sprites);
        this.stageView = new FestivalStageView(this, this.sprites, this.registry);
        this.playerZonesView = new PlayerZonesView(this, this.sprites, this.registry);

        this.turnDispatch = new TurnDispatchState(this);
        this.playerTurn = new PlayerTurnState(this);
        this.resolveBonus = new ResolveBonusState(this);
        this.discardDown = new DiscardDownState(this);

        this.bga.states.register('TurnDispatch', this.turnDispatch);
        this.bga.states.register('PlayerTurn', this.playerTurn);
        this.bga.states.register('ResolveBonus', this.resolveBonus);
        this.bga.states.register('DiscardDown', this.discardDown);
    }

    setup(gamedatas) {
        this.gamedatas = gamedatas;
        if (this.bga.gameui && 'interface_min_width' in this.bga.gameui) {
            this.bga.gameui.interface_min_width = 600;
        }

        this.destroyDialogs();
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
                                        <div id="stage-rules-summary" aria-label="${_('Tomato deck summary')}">
                                            <span class="stage-rules-summary__label">${_('Tomato Cards:')}</span>
                                            <span class="stage-rules-summary__item">1<span class="stage-rules-summary__count">(x3)</span></span>,
                                            <span class="stage-rules-summary__item">2<span class="stage-rules-summary__count">(x3)</span></span>,
                                            <span class="stage-rules-summary__item">3<span class="stage-rules-summary__count">(x13)</span></span>,
                                            <span class="stage-rules-summary__item">4<span class="stage-rules-summary__count">(x5)</span></span>,
                                            <span class="stage-rules-summary__item">5<span class="stage-rules-summary__count">(x8)</span></span>,
                                            <span class="stage-rules-summary__item">6<span class="stage-rules-summary__count">(x4)</span></span>,
                                            <span class="stage-rules-summary__item">7<span class="stage-rules-summary__count">(x4)</span></span>
                                        </div>
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
            </div>
        `);

        this.playerZonesView.setup();
        this.bindRootEvents();
        this.bindDocumentEvents();
        window.addEventListener('resize', this.onWindowResize);
        this.renderWhenLayoutReady();
        this.setupNotifications();
    }

    isLayoutReadyForRender() {
        return this.sprites.getPositiveWidth(
            this.sprites.getLayoutElement()?.parentElement,
            document.getElementById('left-side')
        ) > 0;
    }

    renderWhenLayoutReady() {
        if (this.layoutReadyPollRaf !== null) {
            cancelAnimationFrame(this.layoutReadyPollRaf);
            this.layoutReadyPollRaf = null;
        }

        const tryRender = () => {
            if (this.isLayoutReadyForRender()) {
                this.layoutReadyPollRaf = null;
                this.renderState(this.gamedatas);
                return;
            }

            this.layoutReadyPollRaf = requestAnimationFrame(tryRender);
        };

        tryRender();
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
        return this.gamedatas.currentTurnActions ?? [];
    }

    getDisplayedPlacementsRemaining() {
        return Number(this.gamedatas.placementsRemaining ?? 0);
    }

    captureTurnCleanupTokenSnapshots() {
        const tokens = [...document.querySelectorAll('#festival-token-layer .placed-token')];
        return tokens.map(token => {
            const rect = this.motionLayer.getRect(token);
            if (!rect) {
                return null;
            }

            return {
                rect,
                face: token.classList.contains('splat') ? 'splat' : 'whole',
            };
        }).filter(Boolean);
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

            const boardTokenSlot = target.closest('.board-token-slot');
            if (boardTokenSlot) {
                this.onBoardSpaceClick(Number(boardTokenSlot.dataset.space));
            }
        });

        root.dataset.bound = 'true';
    }

    bindDocumentEvents() {
        if (this.documentClickBound) {
            return;
        }

        document.addEventListener('click', event => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            if (this.openMissionPopupIndex !== null) {
                if (!target.closest('#tomatossMissionDialog') && !target.closest('.mission-zoom-button')) {
                    this.closeMissionPopup();
                    return;
                }
            }

            if (this.isDiscardPopupOpen) {
                if (!target.closest('#tomatossDiscardDialog') && !target.closest('#discard-slot')) {
                    this.closeDiscardPopup();
                }
            }
        });

        this.documentClickBound = true;
    }

    buildRenderData(source) {
        const base = {
            viewerPlayerId: source.viewerPlayerId ?? this.gamedatas.viewerPlayerId ?? null,
            turnNo: source.turnNo ?? this.gamedatas.turnNo ?? 1,
            currentSeatId: source.currentSeatId ?? this.gamedatas.currentSeatId ?? null,
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

    renderState(source, { updateButtons = true } = {}) {
        const nextData = { ...this.gamedatas, ...this.buildRenderData(source) };
        this.gamedatas = nextData;
        this.stageView.renderAll();
        this.playerZonesView.renderAll();
        this.renderOverallPlayerBoards();
        this.renderDiscardPopup();
        this.renderMissionPopup();
        this.cleanupMissionNodes();
        if (updateButtons) {
            this.updateActionButtons();
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
        const tooltipCardWidth = Math.max(180, Math.min(300, window.innerWidth - 96));
        const scale = tooltipCardWidth / 157.5;
        const tooltipCardHeight = 220 * scale;
        const meta = this.getMissionTooltipMeta(Number(targetId));
        return `
            <div class="tomatoss-card-tooltip">
                <div class="tomatoss-card-tooltip__title">${_('Target card')}</div>
                <div class="tomatoss-card-tooltip__card-window" style="width:${157.5 * scale}px;height:${tooltipCardHeight * 0.25}px;">
                    <div class="tomatoss-card-tooltip__card" style="${this.sprites.missionCardStyle(Number(targetId), scale)}"></div>
                </div>
                ${meta ? `
                    <div class="tomatoss-card-tooltip__body">${meta.requirement}</div>
                    <div class="tomatoss-card-tooltip__score">
                        ${_('Normal')} ${meta.base} · ${_('Quick')} ${meta.quick}
                    </div>
                ` : ''}
            </div>
        `;
    }

    buildMissionInspectionHtml(targetId, popupCardWidth) {
        const scale = popupCardWidth / 157.5;
        const popupCardHeight = 220 * scale;
        const meta = this.getMissionTooltipMeta(Number(targetId));
        return `
            <div class="mission-popup__content">
                <div class="mission-popup__card">
                    <div
                        class="mission-popup__card-window"
                        style="width:${157.5 * scale}px;height:${popupCardHeight * 0.25}px;"
                    >
                        <div
                            class="card-node board-mission-card mission-popup__card-preview"
                            style="${this.sprites.missionCardStyle(Number(targetId), scale)}"
                        ></div>
                    </div>
                </div>
                ${meta ? `
                    <div class="mission-popup__body">${meta.requirement}</div>
                    <div class="mission-popup__score">${_('Normal')} ${meta.base} · ${_('Quick')} ${meta.quick}</div>
                ` : ''}
            </div>
        `;
    }

    getMissionTooltipMeta(targetId) {
        const shared = {
            1: { requirement: _('A Tomato card (3)'), base: 2, quick: 3 },
            2: { requirement: _('A Tomato card (3)'), base: 2, quick: 3 },
            3: { requirement: _('2 Tomato cards of the same value'), base: 3, quick: 6 },
            4: { requirement: _('2 Tomato cards of the same value'), base: 3, quick: 6 },
            5: { requirement: _('3 Tomato cards with a pair and one higher card'), base: 5, quick: 7 },
            6: { requirement: _('3 Tomato cards of the same value'), base: 5, quick: 10 },
            7: { requirement: _('A Tomato card (5, 6, or 7)'), base: 2, quick: 3 },
            8: { requirement: _('A Tomato card (5, 6, or 7)'), base: 2, quick: 3 },
            9: { requirement: _('A Tomato card (1 or 2)'), base: 3, quick: 6 },
            10: { requirement: _('Tomato card(s) totaling 8–9'), base: 4, quick: 6 },
            11: { requirement: _('Tomato card(s) totaling 8–9'), base: 4, quick: 6 },
            12: { requirement: _('Tomato card(s) totaling 8–9, without any 3s'), base: 4, quick: 8 },
            13: { requirement: _('A Tomato card (6 or 7)'), base: 3, quick: 5 },
            14: { requirement: _('2 Tomato cards with a difference of 1'), base: 4, quick: 5 },
            15: { requirement: _('2 Tomato cards with a difference of 1'), base: 4, quick: 5 },
            16: { requirement: _('Tomato card(s) totaling 11–13'), base: 4, quick: 6 },
            17: { requirement: _('Tomato card(s) totaling 11–13'), base: 4, quick: 6 },
            18: { requirement: _('Tomato card(s) totaling 11–13, without any 3s'), base: 4, quick: 7 },
            19: { requirement: _('A Tomato card (2, 4, or 6)'), base: 2, quick: 4 },
            20: { requirement: _('A Tomato card (2, 4, or 6)'), base: 2, quick: 4 },
            21: { requirement: _('Tomato card(s) totaling 6–8'), base: 3, quick: 4 },
            22: { requirement: _('Tomato card(s) totaling 6–8'), base: 3, quick: 4 },
            23: { requirement: _('Tomato card(s) totaling 6–8, without any 3s'), base: 3, quick: 6 },
            24: { requirement: _('2 Tomato cards totaling exactly 10'), base: 4, quick: 8 },
            25: { requirement: _('A Tomato card (4 or 5)'), base: 2, quick: 3 },
            26: { requirement: _('A Tomato card (5)'), base: 2, quick: 5 },
            27: { requirement: _('Tomato card(s) totaling 7–11'), base: 3, quick: 3 },
            28: { requirement: _('Tomato card(s) totaling 7–11, without any 3s'), base: 3, quick: 5 },
            29: { requirement: _('2 Tomato cards with a difference of 4–6'), base: 4, quick: 5 },
            30: { requirement: _('2 Tomato cards with a difference of 4–6'), base: 4, quick: 5 },
        };
        return shared[targetId] ?? null;
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
                return 0.4;
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
    }

    shouldAnimateNotifications() {
        return !document.hidden
            && document.hasFocus()
            && this.getAnimationSpeedFactor() > 0;
    }

    isActionAnimationRunning() {
        return this.actionAnimationDepth > 0 || Boolean(this.pendingThrowResolution) || Boolean(this.recentThrow);
    }

    captureTurnCleanupForNextTurn(nextStateArgs) {
        if (this.turnCleanupPromise || !this.shouldAnimateNotifications()) {
            return null;
        }

        const previousTurnActions = this.gamedatas?.currentTurnActions ?? [];
        const nextTurnActions = nextStateArgs?.currentTurnActions ?? [];
        if (previousTurnActions.length === 0 || nextTurnActions.length > 0) {
            return null;
        }

        const tokenSnapshots = this.captureTurnCleanupTokenSnapshots();
        return tokenSnapshots.length > 0 ? tokenSnapshots : null;
    }

    startTurnCleanup(tokenSnapshots) {
        if (!tokenSnapshots?.length || this.turnCleanupPromise) {
            this.updateActionButtons();
            return;
        }

        this.setStatePrompt(_('Cleaning up turn...'));
        this.clearCustomActionButtons();
        this.turnCleanupPromise = this.animateTurnCleanup(tokenSnapshots).finally(() => {
            this.turnCleanupPromise = null;
            this.stageView.renderPlacedTokens();
            this.stageView.renderReserveTokens();
            this.updateActionButtons();
        });
    }

    getActionStackIndex(space) {
        return Math.max(
            0,
            (this.gamedatas.currentTurnActions ?? []).filter(action => Number(action.space) === Number(space)).length - 1
        );
    }

    animateReserveTokenToSpace(space) {
        const reserveNode = [...document.querySelectorAll('#token-reserve .reserve-token')].pop();
        if (!reserveNode) {
            return Promise.resolve();
        }

        const tokenNode = this.motionLayer.createReserveTokenNode();
        const floatingToken = this.motionLayer.prepareFloatingNode(tokenNode, reserveNode);
        if (!floatingToken) {
            return Promise.resolve();
        }

        this.stageView.renderPlacedTokens();
        this.stageView.renderReserveTokens();

        const placedKey = `placed-${Math.max(0, (this.gamedatas.currentTurnActions ?? []).length - 1)}`;
        const destinationNode = document.querySelector(`#festival-token-layer [data-key="${placedKey}"]`);
        if (!destinationNode) {
            floatingToken.remove();
            return Promise.resolve();
        }

        destinationNode.style.visibility = 'hidden';

        const movePromise = this.motionLayer.slideFloatingNodeToElement(floatingToken, destinationNode, {
            duration: this.getAnimationDuration(TOKEN_MOVE_MS),
            destroy: true,
        }).finally(() => {
            destinationNode.style.visibility = '';
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
        const destinationElement = Number(args.player_id) === this.getLocalPlayerId()
            ? document.querySelector(`#player-zone-top-${Number(args.player_id)} .self-hand-row`)
            : document.querySelector(`#player-zone-top-${Number(args.player_id)} .player-hand-fan`);
        const sourceRect = this.motionLayer.getRect(sourceElement);
        if (!sourceElement || !destinationElement || !sourceRect) {
            return Promise.resolve();
        }

        const card = this.gamedatas.boardTomatoes?.[Number(args.space)];
        if (!card) {
            return Promise.resolve();
        }

        const node = this.motionLayer.createTomatoFaceNode(card.value, sourceRect);
        this.hideElementDuringAnimation(sourceElement);
        return this.motionLayer.moveNewNodeToElementAndDestroy(node, sourceElement, destinationElement, {
            duration: this.getAnimationDuration(CARD_MOVE_MS),
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

        const sourceElement = document.querySelector('#tomato-deck-slot .card-node');
        const sourceRect = this.motionLayer.getRect(sourceElement);
        const destinationRect = this.motionLayer.getRect(document.querySelector(`#tomato-slot-${Number(args.space)} .slot-card-host`));
        const destinationHost = document.querySelector(`#tomato-slot-${Number(args.space)} .slot-card-host`);
        if (!sourceRect || !sourceElement || !destinationRect || !destinationHost) {
            return Promise.resolve();
        }

        const backNode = this.motionLayer.createTomatoBackNode(sourceRect);
        const movePromise = this.motionLayer.moveNewNodeToHost(backNode, sourceElement, destinationHost, {
            duration: this.getAnimationDuration(CARD_MOVE_MS),
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
                : null;
            const sourceElement = isLocalPlayer
                ? sourceNode
                : (document.querySelector(`#player-zone-top-${playerId} .player-hand-fan`) ?? document.querySelector(`#player-zone-top-${playerId}`));
            const destinationHost = this.stageView.ensureRecentThrowHost(
                index,
                [index > 0 ? 'is-overlap' : ''],
                Number(args.targetIndex),
                Boolean(args.success)
            );
            if ((!sourceNode && isLocalPlayer) || !sourceElement || !destinationHost) {
                return;
            }

            if (isLocalPlayer) {
                const movePromise = this.motionLayer.moveNodeToHost(sourceNode, destinationHost, {
                    duration: this.getAnimationDuration(CARD_MOVE_MS),
                });
                animations.push(movePromise);
                return;
            }

            const sourceRect = this.motionLayer.getOpponentHandRect(playerId);
            if (!sourceRect) {
                return;
            }

            const backNode = this.motionLayer.createTomatoBackNode(sourceRect);
            const movePromise = this.motionLayer.moveNewNodeToHost(backNode, sourceElement, destinationHost, {
                duration: this.getAnimationDuration(CARD_MOVE_MS),
                sourceRect,
            });
            const flipPromise = this.motionLayer.animateFlip(
                backNode,
                () => this.motionLayer.createTomatoFaceNode(value, {
                    width: sourceRect.width || (155 * this.sprites.getCardScale('tomato')),
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
        const sourceElement = document.querySelector('#tomato-deck-slot .card-node');
        const sourceRect = this.motionLayer.getRect(sourceElement);
        const destinationHost = this.stageView.ensureRecentThrowHost(
            (args.cards ?? []).length,
            [
                (args.cards?.length ?? 0) > 0 ? 'is-overlap' : '',
                'reveal',
            ].filter(Boolean),
            Number(args.targetIndex),
            Boolean(args.success)
        );
        if (!sourceRect || !sourceElement || !destinationHost) {
            return Promise.resolve();
        }

        const backNode = this.motionLayer.createTomatoBackNode(sourceRect);
        const movePromise = this.motionLayer.moveNewNodeToHost(backNode, sourceElement, destinationHost, {
            duration: this.getAnimationDuration(CARD_MOVE_MS),
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
                });
            }
            return;
        }

        const animations = values.map(() => {
            const sourceElement = document.querySelector(`#player-zone-top-${playerId} .player-hand-fan`) ?? document.querySelector(`#player-zone-top-${playerId}`);
            const sourceRect = this.motionLayer.getOpponentHandRect(playerId);
            if (!sourceRect || !sourceElement) {
                return Promise.resolve();
            }

            const node = this.motionLayer.createTomatoBackNode(sourceRect);
            const discardHost = document.querySelector('#discard-slot .slot-card-host');
            if (!discardHost) {
                return Promise.resolve();
            }
            return this.motionLayer.moveNewNodeToElementAndDestroy(node, sourceElement, discardHost, {
                duration: this.getAnimationDuration(CARD_MOVE_MS),
                sourceRect,
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

        const sourceElement = document.querySelector('#mission-deck-slot .card-node');
        const sourceRect = this.motionLayer.getRect(sourceElement);
        const destinationHost = document.querySelector(`#mission-slot-${Number(args.targetIndex ?? 0)} .slot-card-host`);
        if (!sourceRect || !sourceElement || !destinationHost) {
            return;
        }

        const backNode = this.motionLayer.createMissionBackNode(sourceRect);
        const missionNode = this.registry.getMissionNode(args.replacementTarget, this.sprites.getCardScale('mission'));
        this.rememberMovingMissionKey(args.replacementTarget.id);
        const movePromise = this.motionLayer.moveNewNodeToHost(backNode, sourceElement, destinationHost, {
            duration: this.getAnimationDuration(CARD_MOVE_MS),
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

        const sourceElement = document.querySelector('#tomato-deck-slot .card-node');
        const sourceRect = this.motionLayer.getRect(sourceElement);
        const destinationHost = this.playerZonesView.ensureSelfHandPlaceholder(args.bonusCard);
        if (!sourceRect || !sourceElement || !destinationHost) {
            return;
        }

        const backNode = this.motionLayer.createTomatoBackNode(sourceRect);
        const tomatoNode = this.registry.getTomatoNode(args.bonusCard, this.sprites.getCardScale('tomato'));
        this.rememberMovingTomatoKey(args.bonusCard.id);
        const movePromise = this.motionLayer.moveNewNodeToHost(backNode, sourceElement, destinationHost, {
            duration: this.getAnimationDuration(CARD_MOVE_MS),
        });
        const flipPromise = this.motionLayer.animateFlip(
            backNode,
            () => tomatoNode,
            this.getAnimationDuration(FLIP_MS)
        );

        await Promise.all([movePromise, flipPromise]);
    }

    async animateTurnCleanup(tokenSnapshots) {
        if (!tokenSnapshots?.length) {
            return;
        }

        const reserve = document.getElementById('token-reserve');
        if (!reserve) {
            return;
        }

        this.hiddenReserveTokenCount = Math.min(
            Number(this.gamedatas.placementsRemaining ?? 0),
            tokenSnapshots.length
        );
        this.stageView.renderReserveTokens();

        try {
            const reserveTargets = [...reserve.querySelectorAll('.reserve-token')];
            if (reserveTargets.length === 0) {
                return;
            }

            await Promise.all(tokenSnapshots.map((snapshot, index) => {
                const destinationTarget = reserveTargets[Math.min(index, reserveTargets.length - 1)];
                if (!destinationTarget) {
                    return Promise.resolve();
                }

                const clone = this.motionLayer.createReserveTokenNode(snapshot.face);
                clone.style.width = `${snapshot.rect.width}px`;
                clone.style.height = `${snapshot.rect.height}px`;
                clone.style.position = 'absolute';
                clone.style.left = `${snapshot.rect.left}px`;
                clone.style.top = `${snapshot.rect.top}px`;
                const layer = this.motionLayer.getLayer();
                if (!layer) {
                    return Promise.resolve();
                }

                layer.appendChild(clone);
                clone.classList.add('motion-floating');
                clone.style.pointerEvents = 'none';
                clone.style.zIndex = '200';
                return this.motionLayer.slideFloatingNodeToElement(clone, destinationTarget, {
                    duration: this.getAnimationDuration(TURN_CLEANUP_MS),
                    destroy: true,
                });
            }));
        } finally {
            this.hiddenReserveTokenCount = 0;
            this.stageView.renderReserveTokens();
        }
    }

    renderOverallPlayerBoards() {
        const root = document.getElementById('player_boards');
        if (!root) {
            return;
        }

        const players = this.playerZonesView.getOrderedPlayers();
        const keepBotPanelIds = new Set();

        players.forEach(player => {
            const playerId = Number(player.id);
            const panel = this.ensureOverallPlayerPanel(player);
            if (!panel) {
                return;
            }
            root.appendChild(panel);
            if (player.isBot) {
                keepBotPanelIds.add(`overall_player_board_${playerId}`);
            }

            const count = Number(this.gamedatas.handCountsByPlayer?.[playerId] ?? 0);
            const basketFull = this.isBasketFull(this.gamedatas.players?.[playerId]?.basketFull);
            const status = panel.querySelector('.tomatoss-player-panel__status');
            if (status) {
                status.innerHTML = `
                    <div class="tomatoss-overall-hand">
                        <div class="tomatoss-overall-hand__icon"></div>
                        <span class="tomatoss-overall-hand__count">${count}/8</span>
                        <div class="tomatoss-overall-basket">
                            <div class="tomatoss-overall-basket__icon ${basketFull ? 'is-full' : 'is-empty'}"></div>
                            <span class="tomatoss-overall-basket__label">${basketFull ? _('Full') : _('Empty')}</span>
                        </div>
                    </div>
                `;
            }

            if (player.isBot) {
                const scoreNode = panel.querySelector(`#player_score_${playerId}`);
                if (scoreNode) {
                    scoreNode.textContent = String(Number(player.score ?? 0));
                }
            }
        });

        [...root.querySelectorAll('.tomatoss-bot-player-board')].forEach(panel => {
            if (!keepBotPanelIds.has(panel.id)) {
                panel.remove();
            }
        });
    }

    ensureOverallPlayerPanel(player) {
        const playerId = Number(player.id);
        if (player.isBot) {
            return this.ensureBotOverallPlayerPanel(playerId, player.name ?? `P${player.id}`);
        }

        const content = document.getElementById(`player_board_${playerId}`);
        if (!content) {
            return null;
        }

        let status = content.querySelector('.tomatoss-player-panel__status');
        if (!status) {
            status = document.createElement('div');
            status.className = 'tomatoss-player-panel__status';
            content.appendChild(status);
        }

        return document.getElementById(`overall_player_board_${playerId}`);
    }

    ensureBotOverallPlayerPanel(playerId, playerName) {
        const root = document.getElementById('player_boards');
        if (!root) {
            return null;
        }

        const player = this.gamedatas.players?.[playerId] ?? {};
        const playerColor = player.color ?? '7b7b7b';
        const difficultyLabel = this.getBotDifficultyLabel(player.botDifficulty);
        const activeSeatId = Number(this.gamedatas.currentSeatId ?? 0);
        const isActive = activeSeatId === playerId;

        let panel = document.getElementById(`overall_player_board_${playerId}`);
        if (!panel) {
            root.insertAdjacentHTML('beforeend', `
                <div id="overall_player_board_${playerId}" class="player-board current-player-board tomatoss-bot-player-board" style="border-color: #${playerColor};">
                    <div class="player_board_inner" id="player_board_inner_${playerColor}">
                        <div class="emblemwrap tomatoss-bot-avatar-wrap" id="avatarwrap_${playerId}" style="display: ${isActive ? 'none' : 'block'};">
                            <div class="avatar emblem tomatoss-bot-avatar" id="avatar_${playerId}" style="--bot-color: #${playerColor};"></div>
                        </div>
                        <div id="rtc_placeholder_${playerId}" class="rtc_placeholder"></div>
                        <div class="emblemwrap" id="avatar_active_wrap_${playerId}" style="display: ${isActive ? 'block' : 'none'};">
                            <div class="avatar avatar_active tomatoss-bot-avatar-active" id="avatar_active_${playerId}" style="--bot-color: #${playerColor};"></div>
                        </div>
                        <div class="player-name tomatoss-player-panel__name" id="player_name_${playerId}">
                            <span style="color: #${playerColor}">${playerName}</span>
                            <span class="tomatoss-bot-badge">${_('AI')} ${difficultyLabel}</span>
                        </div>
                        <div id="player_board_${playerId}" class="player_board_content">
                            <div class="player_score">
                                <span id="player_score_${playerId}" class="player_score_value">0</span> <i class="fa fa-star" id="icon_point_${playerId}"></i>
                            </div>
                            <div class="tomatoss-player-panel__status"></div>
                        </div>
                    </div>
                </div>
            `);
            panel = document.getElementById(`overall_player_board_${playerId}`);
        }

        panel.style.borderColor = `#${playerColor}`;
        const avatarWrap = panel.querySelector(`#avatarwrap_${playerId}`);
        const activeWrap = panel.querySelector(`#avatar_active_wrap_${playerId}`);
        if (avatarWrap) {
            avatarWrap.style.display = isActive ? 'none' : 'block';
        }
        if (activeWrap) {
            activeWrap.style.display = isActive ? 'block' : 'none';
        }
        const nameNode = panel.querySelector(`#player_name_${playerId}`);
        if (nameNode) {
            nameNode.innerHTML = `
                <span style="color: #${playerColor}">${playerName}</span>
                <span class="tomatoss-bot-badge">${_('AI')} ${difficultyLabel}</span>
            `;
        }
        return panel;
    }

    getBotDifficultyLabel(level) {
        switch (Number(level ?? 1)) {
            case 3:
                return _('Advanced');
            case 2:
                return _('Intermediate');
            default:
                return _('Beginner');
        }
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
        this.missionDialog?.hide();
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

    destroyDialogs() {
        this.discardDialog?.destroy();
        this.missionDialog?.destroy();
        this.discardDialog = null;
        this.missionDialog = null;
    }

    ensureDiscardDialog() {
        if (this.discardDialog) {
            return this.discardDialog;
        }
        const dialog = new ebg.popindialog();
        dialog.create('tomatossDiscardDialog');
        dialog.setTitle(_('Discard pile'));
        dialog.setMaxWidth(980);
        dialog.replaceCloseCallback(() => {
            this.closeDiscardPopup();
            return false;
        });
        this.bindDialogCloseInterception('tomatossDiscardDialog', () => this.closeDiscardPopup());
        this.discardDialog = dialog;
        return dialog;
    }

    ensureMissionDialog() {
        if (this.missionDialog) {
            return this.missionDialog;
        }
        const dialog = new ebg.popindialog();
        dialog.create('tomatossMissionDialog');
        dialog.setTitle(_('Target card'));
        dialog.setMaxWidth(560);
        dialog.replaceCloseCallback(() => {
            this.closeMissionPopup();
            return false;
        });
        this.bindDialogCloseInterception('tomatossMissionDialog', () => this.closeMissionPopup());
        this.missionDialog = dialog;
        return dialog;
    }

    bindDialogCloseInterception(dialogId, onClose) {
        const popin = document.getElementById(`popin_${dialogId}`) ?? document.getElementById(dialogId);
        if (!popin || popin.dataset.closeInterceptBound === 'true') {
            return;
        }

        popin.addEventListener('click', event => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const closeTarget = target.closest('a[href="#"], .popin_close, .closeicon, .popin_closeicon');
            if (!closeTarget || !popin.contains(closeTarget)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
            onClose();
        }, true);
        popin.dataset.closeInterceptBound = 'true';
    }

    renderMissionPopup() {
        const index = this.openMissionPopupIndex;
        const card = Number.isInteger(index) ? this.gamedatas.boardTargets?.[index] : null;
        if (!card) {
            this.missionDialog?.hide();
            return;
        }

        const dialog = this.ensureMissionDialog();
        const popupCardWidth = Math.max(220, Math.min(window.innerWidth - 120, 315));
        dialog.setContent(this.buildMissionInspectionHtml(Number(card.targetId), popupCardWidth));
        dialog.show();
        this.bindDialogCloseInterception('tomatossMissionDialog', () => this.closeMissionPopup());
    }

    closeDiscardPopup() {
        this.isDiscardPopupOpen = false;
        this.discardDialog?.hide();
        this.renderDiscardPopup();
    }

    renderDiscardPopup() {
        const cards = this.gamedatas.discardTomatoes ?? [];
        if (!this.isDiscardPopupOpen) {
            return;
        }
        if (cards.length === 0) {
            this.discardDialog?.hide();
            return;
        }

        const dialog = this.ensureDiscardDialog();
        dialog.setTitle(`${_('Discard pile')} (${cards.length})`);
        const scale = this.sprites.getCardScale('tomato') * 0.82;
        dialog.setContent(`
            <div class="discard-popup__cards">
                ${cards.map(card => `
                    <div class="discard-popup__card" style="width:${155 * scale}px;height:${220 * scale}px;">
                        <div
                            class="card-node board-tomato-card"
                            style="${this.sprites.tomatoCardStyle(Number(card.value), scale)}"
                        ></div>
                    </div>
                `).join('')}
            </div>
        `);
        dialog.show();
        this.bindDialogCloseInterception('tomatossDiscardDialog', () => this.closeDiscardPopup());
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
        if (this.turnCleanupPromise) {
            this.bga.dialogs.showMessage(_('Please wait for turn cleanup to finish'), 'error');
            return false;
        }
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
            this.bga.dialogs.showMessage(_('Choose cards that satisfy this target, or cards that could work with a Quick toss reveal'), 'error');
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

    isBasketFull(value) {
        return value === true || Number(value) === 1;
    }

    clearCustomActionButtons() {
        CUSTOM_ACTION_BUTTON_IDS.forEach(id => document.getElementById(id)?.remove());
    }

    addCustomActionButton(label, callback, options) {
        this.bga.statusBar.addActionButton(label, callback, options);
    }

    updateActionButtons() {
        if (this.turnCleanupPromise) {
            this.setStatePrompt(_('Cleaning up turn...'));
            return;
        }
        if (this.currentUiMode === 'playerTurn') {
            this.setStatePrompt(this.isCurrentPlayerActive
                ? this.getPlayerTurnPrompt()
                : _('Waiting for the active player.'));
        }
        if (!this.isCurrentPlayerActive) {
            return;
        }

        if (this.currentUiMode === 'playerTurn') {
            this.clearCustomActionButtons();
            this.renderPlayerTurnButtons();
            return;
        }

        if (this.currentUiMode === 'discard') {
            this.clearCustomActionButtons();
            this.renderDiscardButtons();
            return;
        }
    }

    renderPlayerTurnButtons() {
        if (this.pendingSpace !== null && this.pendingSpace < 3) {
            this.addCustomActionButton(_('Pick up'), () => this.confirmCollect(), {
                id: 'pickup_button',
            });
        }

        if (this.pendingSpace !== null && this.pendingSpace >= 3) {
            const target = (this.gamedatas.boardTargets ?? [])[this.pendingSpace - 3];
            const { normal, quick } = target ? this.getThrowOptions(Number(target.targetId)) : { normal: false, quick: false };

            this.addCustomActionButton(_('Toss'), () => this.confirmToss(false), {
                id: 'toss_button',
                disabled: !normal,
            });
            this.addCustomActionButton(_('Quick toss'), () => this.confirmToss(true), {
                id: 'quick_toss_button',
                disabled: !quick,
            });
        }

    }

    renderDiscardButtons() {
        const discardNeeded = Number(this.gamedatas.discardCountNeeded ?? 0);
        const hasExactSelection = this.selectedCardIds.length === discardNeeded && discardNeeded > 0;
        this.addCustomActionButton(_('Discard selected'), () => this.confirmDiscard(), {
            id: 'discard_button',
            color: 'alert',
            disabled: !hasExactSelection,
        });
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
            this.bga.dialogs.showMessage(_('Choose cards that satisfy this target for a Toss'), 'error');
            return;
        }
        if (quickToss && !quick) {
            this.bga.dialogs.showMessage(_('Choose cards that could satisfy this target with a Quick toss reveal'), 'error');
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
        this.bga.notifications.setSynchronous?.('botPause', 1200);
    }

    async notif_botPause(args) {
        await this.synchronizeDisplayedTurnState(args?.turnNo, args?.currentSeatId ?? args?.player_id);
        const duration = Number(args?.durationMs ?? 0);
        if (duration > 0) {
            await this.wait(duration);
        }
    }

    async synchronizeDisplayedTurnState(nextTurnNo, nextSeatId = null) {
        const targetTurnNo = Number(nextTurnNo ?? 0);
        const currentTurnNo = Number(this.gamedatas.turnNo ?? 0);
        const targetSeatId = nextSeatId === null ? null : Number(nextSeatId);

        if (targetTurnNo > 0 && targetTurnNo > currentTurnNo) {
            const tokenSnapshots = this.shouldAnimateNotifications() ? this.captureTurnCleanupTokenSnapshots() : [];
            this.gamedatas.turnNo = targetTurnNo;
            if (targetSeatId !== null) {
                this.gamedatas.currentSeatId = targetSeatId;
            }
            this.gamedatas.currentTurnActions = [];
            this.gamedatas.placementsRemaining = 3;
            this.stageView.renderPlacedTokens();
            this.stageView.renderReserveTokens();
            this.renderOverallPlayerBoards();
            if (tokenSnapshots.length > 0) {
                this.startTurnCleanup(tokenSnapshots);
                if (this.turnCleanupPromise) {
                    await this.turnCleanupPromise;
                }
            } else {
                this.updateActionButtons();
            }
            return;
        }

        if (targetSeatId !== null && targetSeatId !== Number(this.gamedatas.currentSeatId ?? 0)) {
            this.gamedatas.currentSeatId = targetSeatId;
            this.renderOverallPlayerBoards();
        }
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
        if (args.success && this.gamedatas.players?.[args.player_id]) {
            this.gamedatas.players[args.player_id].score = Number(this.gamedatas.players[args.player_id].score ?? 0) + Number(args.scoreGained ?? 0);
            this.gamedatas.players[args.player_id].capturedCount = Number(this.gamedatas.players[args.player_id].capturedCount ?? 0) + 1;
            this.renderOverallPlayerBoards();
        }
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
                        if (this.getAnimationSpeedFactor() > 0) {
                            await this.animateThrownCardsToDiscard(pending);
                            await this.wait(THROW_RESULT_PAUSE_MS);
                            await this.animateCapturedTarget(pending);
                            await this.animateReplacementTarget(pending);
                        }
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

    showRecentThrowWithoutAnimation(args, playedCardIds) {
        if (this.recentThrowTimeout) {
            clearTimeout(this.recentThrowTimeout);
        }

        this.beginActionAnimation();
        this.pendingThrowResolution = { ...args, playedCardIds };
        this.prepareRecentThrow(args);

        const values = [
            ...(args.cards ?? []),
            ...(args.quickToss && args.revealed?.value ? [args.revealed.value] : []),
        ];
        const scale = this.sprites.getCardScale('tomato');
        this.registry.clearTemporary('recent-preview-');
        values.forEach((value, index) => {
            const host = this.stageView.ensureRecentThrowHost(
                index,
                [
                    index > 0 ? 'is-overlap' : '',
                    index === values.length - 1 && args.quickToss && args.revealed ? 'reveal' : '',
                ].filter(Boolean),
                Number(args.targetIndex),
                Boolean(args.success)
            );
            if (!host) {
                return;
            }

            const node = this.registry.getTemporaryTomatoNode(`recent-preview-${index}`, value, scale);
            this.registry.mount(host, node);
        });

        this.clearSelection();
        this.clearPendingAction();
        this.updateActionButtons();

        this.recentThrowTimeout = setTimeout(async () => {
            const pending = this.pendingThrowResolution;
            this.pendingThrowResolution = null;
            this.registry.clearTemporary('recent-preview-');
            this.recentThrow = null;
            this.stageView.renderRecentThrow();
            if (pending) {
                this.applyThrowAction(pending);
                this.afterPublicChange();
                await this.flushDeferredPostThrowNotifications();
            }
            this.endActionAnimation();
        }, 450);
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
        if (this.deferredCollectHandUpdateArgs) {
            const args = this.deferredCollectHandUpdateArgs;
            this.deferredCollectHandUpdateArgs = null;
            await this.applyPrivateHandUpdateNotification(args);
        }

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
        await this.synchronizeDisplayedTurnState(args?.turnNo, args?.currentSeatId ?? args?.player_id);
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
                const playedCardIds = [...this.selectedCardIds];
                this.applyImmediateThrowHandChange({ ...args, playedCardIds });
                this.showRecentThrowWithoutAnimation(args, playedCardIds);
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
                const isLocalCollect = Number(args.player_id) === this.getLocalPlayerId();
                if (isLocalCollect) {
                    finishInPrivateUpdate = true;
                    this.pendingCollectAnimation = args;
                    this.clearPendingAction();
                    this.updateActionButtons();
                    if (this.deferredCollectHandUpdateArgs) {
                        const deferredArgs = this.deferredCollectHandUpdateArgs;
                        this.deferredCollectHandUpdateArgs = null;
                        await this.applyPrivateHandUpdateNotification(deferredArgs);
                    }
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

        if (
            this.shouldAnimateNotifications() &&
            args.mode === 'collect' &&
            Number(args.player_id) === this.getLocalPlayerId() &&
            !this.pendingCollectAnimation
        ) {
            this.deferredCollectHandUpdateArgs = args;
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
