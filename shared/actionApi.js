/**
 * Action API v2.0 类型定义
 *
 * 客户端和服务端共享的类型定义
 */
export const ACTION_API_VERSION = '2.0';
// 错误码定义
export const ActionErrorCodes = {
    // 玩家状态错误
    NOT_YOUR_TURN: 'E1001',
    PLAYER_ELIMINATED: 'E1002',
    PLAYER_DISCONNECTED: 'E1003',
    // 卡牌错误
    CARD_NOT_FOUND: 'E2001',
    CARD_NOT_PLAYABLE: 'E2002',
    CARD_NOT_IN_HAND: 'E2003',
    // 规则错误
    INVALID_COMBO: 'E3001',
    FIRST_CARD_MISMATCH: 'E3002',
    CANNOT_STACK: 'E3003',
    MISSING_TARGET: 'E3004',
    MISSING_COLOR: 'E3005',
    // 惩罚响应错误
    NO_PENDING_PENALTY: 'E4001',
    INVALID_PENALTY_RESPONSE: 'E4002',
    // 系统错误
    STATE_MISMATCH: 'E5001',
    TIMEOUT: 'E5002',
    SERVER_ERROR: 'E5003',
};
//# sourceMappingURL=actionApi.js.map