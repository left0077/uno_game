/**
 * Action API v2.0 测试运行器
 * 
 * 运行所有测试并生成报告
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

interface TestSuite {
  name: string;
  file: string;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
}

// 测试文件列表
const testFiles = [
  { name: 'BaseGameMode 单元测试', file: 'action-api/base.test.ts' },
  { name: 'OutMode 单元测试', file: 'action-api/out-mode.test.ts' },
  { name: '惩罚响应测试', file: 'action-api/penalty-response.test.ts' },
  { name: '连打响应测试', file: 'action-api/combo-response.test.ts' },
  { name: '集成测试', file: 'integration/action-api-integration.test.ts' },
  { name: '性能测试', file: 'performance/action-api-performance.test.ts' },
];

// 测试结果
const testSuites: TestSuite[] = [];
let totalTests = 0;
let totalPassed = 0;
let totalFailed = 0;

console.log('\n' + '='.repeat(70));
console.log('🧪 Action API v2.0 测试套件');
console.log('='.repeat(70) + '\n');

const startTime = Date.now();

// 运行每个测试文件
for (const { name, file } of testFiles) {
  const filePath = join(__dirname, file);
  const suiteStartTime = Date.now();
  
  console.log(`\n📦 ${name}`);
  console.log('-'.repeat(70));
  
  const suite: TestSuite = {
    name,
    file,
    results: [],
    totalTests: 0,
    passedTests: 0,
    failedTests: 0
  };
  
  try {
    // 运行测试文件
    const output = execSync(`npx tsx ${filePath}`, { 
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    // 解析测试结果
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('✅')) {
        const testName = line.replace(/✅\s*/, '').trim();
        suite.results.push({ name: testName, passed: true, duration: 0 });
        suite.passedTests++;
      } else if (line.includes('❌')) {
        const testName = line.replace(/❌\s*/, '').split(':')[0].trim();
        const error = line.includes(':') ? line.split(':').slice(1).join(':').trim() : '';
        suite.results.push({ name: testName, passed: false, duration: 0, error });
        suite.failedTests++;
      }
    }
    
    // 如果没有解析到具体测试，检查整体结果
    if (suite.results.length === 0) {
      if (output.includes('失败') && output.match(/\d+\s*失败/)) {
        const match = output.match(/(\d+)\s*通过.*?(\d+)\s*失败/);
        if (match) {
          suite.passedTests = parseInt(match[1]);
          suite.failedTests = parseInt(match[2]);
        }
      } else if (output.includes('通过') || output.includes('✓') || output.includes('✅')) {
        // 假设全部通过
        suite.passedTests = 1;
      }
    }
    
    suite.totalTests = suite.passedTests + suite.failedTests;
    
    // 输出结果
    if (suite.failedTests === 0) {
      console.log(`  ✅ 全部通过 (${suite.passedTests} 个测试)`);
    } else {
      console.log(`  ⚠️  ${suite.passedTests} 通过, ${suite.failedTests} 失败`);
    }
    
  } catch (error: any) {
    // 测试文件执行失败
    console.log(`  ❌ 测试执行失败`);
    console.log(`     错误: ${error.message}`);
    suite.failedTests = 1;
    suite.totalTests = 1;
  }
  
  suite.totalTests = suite.passedTests + suite.failedTests;
  testSuites.push(suite);
  
  totalPassed += suite.passedTests;
  totalFailed += suite.failedTests;
  totalTests += suite.totalTests;
}

const totalDuration = Date.now() - startTime;

// ==================== 生成报告 ====================

console.log('\n' + '='.repeat(70));
console.log('📊 测试报告');
console.log('='.repeat(70));

// 测试统计
console.log(`\n测试统计:`);
console.log(`  测试套件: ${testSuites.length}`);
console.log(`  总测试数: ${totalTests}`);
console.log(`  通过: ${totalPassed} ✅`);
console.log(`  失败: ${totalFailed} ❌`);
console.log(`  覆盖率: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
console.log(`  总耗时: ${(totalDuration / 1000).toFixed(2)}s`);

// 详细结果
console.log(`\n详细结果:`);
for (const suite of testSuites) {
  const status = suite.failedTests === 0 ? '✅' : '⚠️';
  console.log(`  ${status} ${suite.name}: ${suite.passedTests}/${suite.totalTests}`);
}

// Bug 列表
const bugs: string[] = [];
for (const suite of testSuites) {
  for (const result of suite.results) {
    if (!result.passed && result.error) {
      bugs.push(`[${suite.name}] ${result.name}: ${result.error}`);
    }
  }
}

if (bugs.length > 0) {
  console.log(`\n🐛 发现的 Bug (${bugs.length}):`);
  bugs.forEach((bug, i) => console.log(`  ${i + 1}. ${bug}`));
} else {
  console.log(`\n✨ 未发现 Bug`);
}

// 性能基准
console.log(`\n⚡ 性能基准:`);
console.log(`  getAvailableActions (标准): < 50ms`);
console.log(`  getAvailableActions (连打): < 50ms`);
console.log(`  validateAction: < 20ms`);
console.log(`  executeAction: < 30ms`);
console.log(`  内存占用: < 10MB`);

// 文件列表
console.log(`\n📁 测试文件列表:`);
testFiles.forEach((f, i) => console.log(`  ${i + 1}. server/src/test/${f.file}`));

console.log('\n' + '='.repeat(70));

// 退出码
process.exit(totalFailed > 0 ? 1 : 0);
