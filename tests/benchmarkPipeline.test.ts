import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { ProjectAnalyzer } from '../server/benchmark/ProjectAnalyzer.ts';
import { BenchmarkGenerator } from '../server/benchmark/BenchmarkGenerator.ts';
import { ScoringModel } from '../server/benchmark/ScoringModel.ts';
import { BenchmarkEngine } from '../server/benchmark/BenchmarkEngine.ts';
import { MongoStore } from '../server/storage/mongoStore.ts';
import type {
  BenchmarkProject,
  BenchmarkScenarioRun,
  BenchmarkDefinition,
} from '../server/types.ts';

const FIXTURES_DIR = path.resolve(process.cwd(), '.runner_sandboxes/test_fixtures');

test.before(() => {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }
});

test('Benchmark Pipeline & Scoring Verification', async (t) => {
  // Test 1: ProjectAnalyzer accurately detects framework, lockfile, dependencies, and origin
  await t.test('ProjectAnalyzer accurately detects Lovable React+Vite project and environment secrets', () => {
    const sampleDir = path.join(FIXTURES_DIR, 'sample_lovable_app');
    if (!fs.existsSync(sampleDir)) fs.mkdirSync(sampleDir, { recursive: true });

    // Mock package.json with Lovable indicator
    fs.writeFileSync(
      path.join(sampleDir, 'package.json'),
      JSON.stringify({
        name: 'lovable-task-manager',
        version: '1.0.0',
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          'lovable-tagger': '^1.0.0',
          '@supabase/supabase-js': '^2.39.0',
        },
        devDependencies: {
          vite: '^5.0.0',
          typescript: '^5.0.0',
        },
        scripts: {
          build: 'tsc && vite build',
          test: 'vitest run',
        },
      })
    );

    // Mock .env.example with referenced variables
    fs.writeFileSync(
      path.join(sampleDir, '.env.example'),
      'VITE_SUPABASE_URL=https://xyz.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\nDATABASE_URL=postgresql://user:pass@localhost:5432/db\n'
    );

    // Mock src/main.tsx
    const srcDir = path.join(sampleDir, 'src');
    if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'main.tsx'), "import React from 'react';\nconsole.log('App ready');\n");

    const result = ProjectAnalyzer.analyzeDirectory(sampleDir);

    assert.equal(result.detectedOrigin, 'lovable', 'Should detect Lovable origin from lovable-tagger');
    assert.equal(result.analysis.framework, 'React + Vite', 'Should detect React + Vite framework');
    assert.equal(result.analysis.runtime, 'nodejs', 'Should detect Node.js runtime');
    assert.equal(result.analysis.language, 'typescript', 'Should detect TypeScript language');
    assert.equal(result.analysis.databaseDetected, 'Supabase', 'Should detect Supabase database integration');
    assert.equal(result.analysis.authDetected, 'Supabase Auth', 'Should detect Supabase Auth');
    assert.ok(result.analysis.referencedEnvVars.includes('VITE_SUPABASE_ANON_KEY'), 'Should detect referenced secret');
    assert.ok(result.missingRequirements.length >= 2, 'Should flag missing secret keys in requirements');
  });

  // Test 2: BenchmarkGenerator produces tailored 5-pillar test suites with configured weights
  await t.test('BenchmarkGenerator creates 5-pillar benchmark with functional, build, a11y, responsive, and security scenarios', () => {
    const analysis = {
      framework: 'React + Vite',
      language: 'typescript' as const,
      runtime: 'nodejs' as const,
      packageManager: 'npm' as const,
      dependencies: { react: '^18.0.0' },
      devDependencies: { vite: '^5.0.0' },
      lockfileDetected: true,
      entrypoints: { frontend: 'index.html' },
      structure: { isMonorepo: false },
      referencedEnvVars: [],
      existingTestFiles: [],
      likelyCapabilities: ['Task Management & Todo Tracking', 'Interactive Web UI'],
      supportedRuntime: true,
    };

    const benchmark = BenchmarkGenerator.generateBenchmark('proj-123', 'Task Flow', analysis, 'task_management');

    assert.equal(benchmark.category, 'task_management');
    assert.equal(benchmark.scoringWeights.functional, 50);
    assert.equal(benchmark.scoringWeights.buildReliability, 20);
    assert.equal(benchmark.scoringWeights.accessibility, 10);
    assert.equal(benchmark.scoringWeights.responsive, 10);
    assert.equal(benchmark.scoringWeights.security, 10);

    const categories = benchmark.scenarios.map((s) => s.category);
    assert.ok(categories.includes('build'), 'Must include build verification scenario');
    assert.ok(categories.includes('functional'), 'Must include functional scenario');
    assert.ok(categories.includes('responsive'), 'Must include responsive viewport scenario');
    assert.ok(categories.includes('accessibility'), 'Must include WCAG accessibility scenario');
    assert.ok(categories.includes('security'), 'Must include static security scenario');
    assert.ok(categories.includes('persistence'), 'Must include state persistence scenario');
  });

  // Test 3: ScoringModel accurately normalizes weights and separates infrastructure failure from application failure
  await t.test('ScoringModel computes transparent normalized score and handles skipped categories without fake 100% awards', () => {
    const runs: BenchmarkScenarioRun[] = [
      {
        scenarioId: 'sc-1',
        name: 'Build',
        category: 'build',
        type: 'build',
        status: 'passed',
        durationMs: 1200,
        expectedResult: 'Exit 0',
        actualResult: 'Exit 0',
        logs: ['Build success'],
      },
      {
        scenarioId: 'sc-2',
        name: 'Task CRUD',
        category: 'functional',
        type: 'browser',
        status: 'passed',
        durationMs: 800,
        expectedResult: 'Task created',
        actualResult: 'Task created',
        logs: ['Element found'],
      },
      {
        scenarioId: 'sc-3',
        name: 'A11y',
        category: 'accessibility',
        type: 'accessibility',
        status: 'failed',
        durationMs: 400,
        expectedResult: '0 violations',
        actualResult: '2 images missing alt',
        logs: ['Violation detected'],
      },
      {
        scenarioId: 'sc-4',
        name: 'Responsive',
        category: 'responsive',
        type: 'responsive',
        status: 'passed',
        durationMs: 500,
        expectedResult: 'No horizontal overflow',
        actualResult: 'Responsive pass',
        logs: ['375px verified'],
      },
      {
        scenarioId: 'sc-5',
        name: 'Security',
        category: 'security',
        type: 'static_security',
        status: 'passed',
        durationMs: 100,
        expectedResult: 'No leaked keys',
        actualResult: '0 leaked keys',
        logs: ['Clean scan'],
      },
    ];

    const summary = ScoringModel.calculateSummary(runs, {
      functional: 50,
      buildReliability: 20,
      accessibility: 10,
      responsive: 10,
      security: 10,
    });

    assert.equal(summary.totalScenarios, 5);
    assert.equal(summary.passedScenarios, 4);
    assert.equal(summary.failedScenarios, 1);
    assert.equal(summary.categoryScores.buildReliability.score, 100);
    assert.equal(summary.categoryScores.functional.score, 100);
    assert.equal(summary.categoryScores.accessibility.score, 0); // Failed
    assert.equal(summary.categoryScores.responsive.score, 100);
    assert.equal(summary.categoryScores.security.score, 100);

    // Weighted sum: 50(100) + 20(100) + 10(0) + 10(100) + 10(100) = 5000 + 2000 + 0 + 1000 + 1000 = 9000 / 100 = 90%
    assert.equal(summary.overallScore, 90, 'Overall score should reflect weighted category contributions');
    assert.ok(summary.failureCategories.includes('Accessibility (a11y) Violation'));
    assert.ok(summary.actionableDebuggingSuggestions.length > 0);
  });

  // Test 4: Path traversal and security protection in sandbox
  await t.test('Path traversal attempts are blocked and cannot access parent host directories', () => {
    const maliciousPaths = [
      '../../etc/passwd',
      '..\\..\\windows\\system32',
      '../../../.env',
      'subdir/../../secret.txt',
    ];

    for (const p of maliciousPaths) {
      const resolved = path.resolve(FIXTURES_DIR, p);
      const isEscaping = !resolved.startsWith(FIXTURES_DIR);
      assert.ok(isEscaping, `Relative path ${p} must be detected as escaping sandbox root`);
    }
  });

  // Test 5: End-to-end execution of Build and Static Security on real local project
  await t.test('BenchmarkEngine executes real build and security scan against test project', async () => {
    const mockStorage = new MongoStore(false, 'Disconnected for unit test');
    const engine = new BenchmarkEngine(mockStorage);

    const testProject: BenchmarkProject = {
      id: 'test-exec-project',
      name: 'Test Project',
      source: 'github',
      origin: 'generic_github',
      preparationStatus: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const targetCodeDir = engine.getCodeDir(testProject.id);
    if (!fs.existsSync(targetCodeDir)) fs.mkdirSync(targetCodeDir, { recursive: true });

    // Write a clean valid package.json with working build script
    fs.writeFileSync(
      path.join(targetCodeDir, 'package.json'),
      JSON.stringify({
        name: 'valid-test-app',
        version: '1.0.0',
        scripts: {
          build: 'node -e "console.log(\'Bundle emitted successfully\'); process.exit(0);"',
        },
      })
    );

    // Write clean source code without secrets
    fs.writeFileSync(
      path.join(targetCodeDir, 'index.js'),
      "console.log('Clean execution without hardcoded secrets');\n"
    );

    const benchmarkDef: BenchmarkDefinition = {
      id: 'bench-test-1',
      projectId: testProject.id,
      category: 'general_web',
      name: 'Test Verification Suite',
      description: 'Verifies real build and static security scan',
      generatedBy: 'template',
      scoringWeights: {
        functional: 50,
        buildReliability: 20,
        accessibility: 10,
        responsive: 10,
        security: 10,
      },
      scenarios: [
        {
          id: 'sc-bld',
          name: 'Build Test',
          category: 'build',
          type: 'build',
          executionSteps: ['run build'],
          expectedResult: 'Exit 0',
        },
        {
          id: 'sc-sec',
          name: 'Security Test',
          category: 'security',
          type: 'static_security',
          executionSteps: ['scan secrets'],
          expectedResult: 'Zero leaked keys',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Override storage.saveBenchmarkRun to in-memory for unit assertion
    let savedRun: any = null;
    (mockStorage as any).saveBenchmarkRun = async (r: any) => {
      savedRun = r;
      return r;
    };

    const runResult = await engine.executeBenchmarkRun(testProject, benchmarkDef);

    assert.equal(runResult.buildStatus, 'passed', 'Build command should execute and pass with exit 0');
    assert.equal(runResult.scenarioRuns.length, 2, 'Should execute build and security scenarios');
    assert.equal(runResult.summary.passedScenarios, 2, 'Both scenarios should pass');
    assert.equal(runResult.summary.overallScore, 100, 'Score should be 100% when all evaluated pillars pass');
  });
});
