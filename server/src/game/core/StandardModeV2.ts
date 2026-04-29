/**
 * StandardModeV2 — 经典 UNO 规则
 */
import { ValidationResult } from './types.js';
import { BaseGameModeV2 } from './BaseGameModeV2.js';

export class StandardModeV2 extends BaseGameModeV2 {
  readonly name = 'standard';
  readonly description = '经典 UNO 规则：先出完手牌获胜';

  protected validateCombo(): ValidationResult {
    return { valid: false, error: '标准模式不支持连打' };
  }

  protected executeCombo(): void {
    // 标准模式不执行连打
  }
}
