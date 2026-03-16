// 服务端测试入口
// 运行: npm test

import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function findTestFiles(dir: string): string[] {
  const files: string[] = [];
  
  for (const file of readdirSync(dir)) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findTestFiles(fullPath));
    } else if (file.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function runTests() {
  console.log('🚀 开始运行服务端测试\n');
  
  // 搜索所有测试目录
  const testDirs = ['unit', 'action-api', 'integration', 'performance'];
  let testFiles: string[] = [];
  
  for (const dir of testDirs) {
    const dirPath = join(__dirname, dir);
    try {
      testFiles.push(...findTestFiles(dirPath));
    } catch (e) {
      // 目录可能不存在，忽略
    }
  }
  
  if (testFiles.length === 0) {
    console.log('⚠️ 未找到测试文件');
    process.exit(0);
  }
  
  console.log(`📁 发现 ${testFiles.length} 个测试文件\n`);
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const file of testFiles) {
    const relativePath = relative(__dirname, file);
    console.log(`\n🔍 运行: ${relativePath}`);
    console.log('=' .repeat(50));
    
    try {
      // 使用 tsx 运行 TypeScript 测试文件
      execSync(`npx tsx ${file}`, { stdio: 'inherit' });
      totalPassed++;
    } catch (error) {
      totalFailed++;
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 测试汇总');
  console.log('=' .repeat(50));
  console.log(`测试文件: ${testFiles.length}`);
  console.log(`通过: ${totalPassed}`);
  console.log(`失败: ${totalFailed}`);
  
  process.exit(totalFailed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('❌ 测试运行失败:', err);
  process.exit(1);
});
