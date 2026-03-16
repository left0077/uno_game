/**
 * Action API v2.0 类型定义
 *
 * 客户端和服务端共享的类型定义
 */
export declare const ACTION_API_VERSION = "2.0";
export declare const ActionErrorCodes: {
    readonly NOT_YOUR_TURN: "E1001";
    readonly PLAYER_ELIMINATED: "E1002";
    readonly PLAYER_DISCONNECTED: "E1003";
    readonly CARD_NOT_FOUND: "E2001";
    readonly CARD_NOT_PLAYABLE: "E2002";
    readonly CARD_NOT_IN_HAND: "E2003";
    readonly INVALID_COMBO: "E3001";
    readonly FIRST_CARD_MISMATCH: "E3002";
    readonly CANNOT_STACK: "E3003";
    readonly MISSING_TARGET: "E3004";
    readonly MISSING_COLOR: "E3005";
    readonly NO_PENDING_PENALTY: "E4001";
    readonly INVALID_PENALTY_RESPONSE: "E4002";
    readonly STATE_MISMATCH: "E5001";
    readonly TIMEOUT: "E5002";
    readonly SERVER_ERROR: "E5003";
};
export type GameStateType = 'normal' | 'pending_draw' | 'skipped' | 'rainbow_target' | 'challenge_window';
export type PlayReasonType = 'color_match' | 'value_match' | 'wild' | 'draw4' | 'stack' | 'combo_first';
export type EffectType = 'change_color' | 'skip' | 'reverse' | 'draw' | 'stack' | 'combo';
export type ComboType = 'pair' | 'three' | 'rainbow' | 'straight';
export type PenaltyResponseType = 'rainbow' | 'reverse' | 'stack' | 'combo' | 'accept';
export type DrawReason = 'optional' | 'forced' | 'penalty' | 'no_options';
export type HighlightColor = 'green' | 'yellow' | 'red';
export type AnimationType = 'pulse' | 'glow' | 'shake';
export type RiskLevel = 'low' | 'medium' | 'high';
export type TargetRisk = 'safe' | 'risky' | 'dangerous';
export type OutcomeType = 'transfer' | 'bounce' | 'accumulate' | 'accept';
export type RecoveryAction = 'retry' | 'refresh' | 'rollback' | 'ignore';
export interface Card {
    id: string;
    type: 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'draw4' | 'draw3' | 'draw5' | 'draw8';
    color: 'red' | 'yellow' | 'green' | 'blue' | 'wild';
    value: number | string;
}
export interface PlayReason {
    type: PlayReasonType;
    description: string;
    priority: number;
}
export interface PlayEffect {
    type: EffectType;
    description: string;
    target?: string;
    value?: number;
}
export interface UIHints {
    highlight?: HighlightColor;
    animation?: AnimationType;
    tooltip?: string;
}
export interface PlayableCard {
    cardId: string;
    card: Card;
    reasons: PlayReason[];
    effects: PlayEffect[];
    requiresInput?: {
        color?: boolean;
        target?: boolean;
    };
    uiHints: UIHints;
}
export interface RequiredCard {
    cardId: string;
    card: Card;
    inHand: boolean;
}
export interface ComboEffect {
    description: string;
    target?: string;
    value?: number;
}
export interface ComboRisk {
    level: RiskLevel;
    factors: string[];
}
export interface ComboInfo {
    type: ComboType;
    name: string;
    requiredCards: RequiredCard[];
    missingCards: string[];
    effect: ComboEffect;
    risk: ComboRisk;
    recommended: boolean;
    score: number;
}
export interface ComboStarter {
    cardId: string;
    card: Card;
    combos: ComboInfo[];
}
export interface TargetCandidate {
    playerId: string;
    nickname: string;
    cardCount: number;
    risk: TargetRisk;
}
export interface TargetSelection {
    type: 'player';
    candidates: TargetCandidate[];
    recommended?: string;
}
export interface PenaltyOutcome {
    type: OutcomeType;
    value: number;
    description: string;
}
export interface PenaltyOption {
    type: PenaltyResponseType;
    priority: number;
    name: string;
    description: string;
    detailedEffect: string;
    requiresCards?: string[];
    requiresTarget?: TargetSelection;
    outcome: PenaltyOutcome;
    ui: {
        icon: string;
        color: string;
        animation?: string;
    };
}
export interface ActionOption {
    enabled: boolean;
    reason?: string;
    cooldown?: number;
}
export interface PlayAction {
    enabled: boolean;
    cards: PlayableCard[];
}
export interface ComboAction {
    enabled: boolean;
    starters: ComboStarter[];
}
export interface PenaltyResponseAction {
    enabled: boolean;
    options: PenaltyOption[];
}
export interface DrawAction {
    enabled: boolean;
    count: number;
    reason: DrawReason;
    autoDraw?: boolean;
}
export interface SpecialActions {
    callUno: ActionOption;
    challenge: ActionOption;
    jumpIn: ActionOption;
}
export interface PlayerActions {
    play: PlayAction;
    combo: ComboAction;
    penaltyResponse: PenaltyResponseAction;
    draw: DrawAction;
    special: SpecialActions;
}
export interface PendingDrawInfo {
    count: number;
    type: 'draw2' | 'draw4';
    canStack: boolean;
    canCombo: boolean;
    canReverse: boolean;
    canRainbow: boolean;
}
export interface CountdownInfo {
    total: number;
    remaining: number;
    warning: boolean;
}
export interface GameStateInfo {
    type: GameStateType;
    message: string;
    subMessage?: string;
    countdown?: CountdownInfo;
    pendingDraw?: PendingDrawInfo;
}
export interface CacheInfo {
    ttl: number;
    etag: string;
}
export interface DebugInfo {
    calculationTime: number;
    rulesChecked: string[];
    source: string;
}
export interface ActionMetadata {
    cache: CacheInfo;
    debug?: DebugInfo;
}
export interface StateChange {
    type: 'card_move' | 'turn_change' | 'penalty_apply' | 'player_eliminate';
    description: string;
    before: unknown;
    after: unknown;
}
export interface ValidationPreview {
    stateChanges: StateChange[];
    notifications: string[];
}
export interface ValidationError {
    code: string;
    message: string;
    details?: string;
}
export interface ValidationResult {
    valid: boolean;
    error?: ValidationError;
    preview?: ValidationPreview;
}
export interface ErrorRecovery {
    code: string;
    recoverable: boolean;
    suggestedAction: RecoveryAction;
    message: string;
}
export interface AvailableActions {
    version: typeof ACTION_API_VERSION;
    timestamp: number;
    playerId: string;
    gameId: string;
    state: GameStateInfo;
    actions: PlayerActions;
    metadata: ActionMetadata;
}
export interface AvailableActionsV1 {
    playableCards: string[];
    canDraw: boolean;
}
export interface ActionUpdate {
    type: 'full' | 'delta';
    timestamp: number;
    etag: string;
    changes?: Partial<AvailableActions>;
    full?: AvailableActions;
}
export interface OptimisticUpdate {
    id: string;
    action: {
        type: string;
        cardId?: string;
        cardIds?: string[];
        [key: string]: unknown;
    };
    predictedState: Partial<{
        hand: Card[];
        discardPile: Card[];
        currentPlayerId: string;
    }>;
    rollback: () => void;
}
export interface GameAction {
    type: 'play' | 'draw' | 'skip' | 'uno' | 'challenge' | 'jumpIn' | 'combo';
    playerId: string;
    card?: Card;
    cards?: Card[];
    cardIds?: string[];
    color?: string;
    chosenColor?: string;
    comboType?: ComboType;
    targetId?: string;
    timestamp: number;
}
//# sourceMappingURL=actionApi.d.ts.map