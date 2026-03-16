// 简单的测试运行器
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

// 断言工具
export function expect(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`期望 ${expected}, 实际 ${actual}`);
      }
    },
    toEqual: (expected: any) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`期望 ${JSON.stringify(expected)}, 实际 ${JSON.stringify(actual)}`);
      }
    },
    toHaveLength: (expected: number) => {
      if (actual.length !== expected) {
        throw new Error(`期望长度 ${expected}, 实际 ${actual.length}`);
      }
    },
    toBeTruthy: () => {
      if (!actual) {
        throw new Error(`期望为真值，实际 ${actual}`);
      }
    },
    toBeFalsy: () => {
      if (actual) {
        throw new Error(`期望为假值，实际 ${actual}`);
      }
    },
    toThrow: (fn: () => void) => {
      let threw = false;
      try {
        fn();
      } catch (e) {
        threw = true;
      }
      if (!threw) {
        throw new Error(`期望抛出异常`);
      }
    }
  };
}

// 测试函数
export function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
    return { passed: true };
  } catch (err: any) {
    console.log(`❌ ${name}: ${err.message}`);
    return { passed: false, error: err.message };
  }
}

// 测试套件
export function describe(name: string, fn: () => void) {
  console.log(`\n📦 ${name}`);
  fn();
}

// 主运行器
class TestRunner {
  private results: TestResult[] = [];
  private currentSuite = '';

  describe(suiteName: string, fn: () => void) {
    this.currentSuite = suiteName;
    console.log(`\n📦 ${suiteName}`);
    fn();
    this.currentSuite = '';
  }

  test(testName: string, fn: () => void | Promise<void>) {
    const fullName = this.currentSuite ? `${this.currentSuite} > ${testName}` : testName;
    try {
      const result = fn();
      if (result instanceof Promise) {
        result
          .then(() => {
            this.results.push({ name: fullName, passed: true });
            console.log(`  ✅ ${testName}`);
          })
          .catch((err) => {
            this.results.push({ name: fullName, passed: false, error: err.message });
            console.log(`  ❌ ${testName}: ${err.message}`);
          });
      } else {
        this.results.push({ name: fullName, passed: true });
        console.log(`  ✅ ${testName}`);
      }
    } catch (err: any) {
      this.results.push({ name: fullName, passed: false, error: err.message });
      console.log(`  ❌ ${testName}: ${err.message}`);
    }
  }

  summary() {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    console.log(`\n📊 总计: ${this.results.length} 个测试, ${passed} 通过, ${failed} 失败`);
    return failed === 0;
  }
}

export const runner = new TestRunner();
export default runner;
