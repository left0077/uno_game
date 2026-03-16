#!/usr/bin/env node
/**
 * 客户端单元测试运行器
 * 使用 Node.js 直接运行 TypeScript 测试文件
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tests = [
  'src/core/modes/__tests__/GameModeRenderer.test.ts',
  'src/core/hooks/__tests__/useGameMode.test.ts'
];

let failed = 0;
let passed = 0;

console.log('🧪 客户端单元测试');
console.log('='.repeat(50));

for (const test of tests) {
  const testPath = join(__dirname, test);
  console.log(`\n📋 运行: ${test}`);
  
  try {
    // 使用 ts-node 或 tsx 运行 TypeScript 测试
    execSync(`npx tsx "${testPath}"`, {
      cwd: __dirname,
      stdio: 'inherit'
    });
    passed++;
  } catch (err) {
    failed++;
    console.error(`❌ 测试失败: ${test}`);
  }
}

console.log('\n' + '='.repeat(50));
console.log(`📊 结果: ${passed}/${tests.length} 通过`);

if (failed > 0) {
  console.log(`❌ ${failed} 个测试失败`);
  process.exit(1);
} else {
  console.log('✨ 所有测试通过！');
  process.exit(0);
}
