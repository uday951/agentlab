import type {
  BenchmarkScenarioRun,
  BenchmarkRunSummary,
  ScoringWeights,
} from '../types.ts';

export class ScoringModel {
  /**
   * Calculates a transparent, normalized 5-pillar score based on scenario execution results.
   */
  public static calculateSummary(
    scenarioRuns: BenchmarkScenarioRun[],
    weights: ScoringWeights = {
      functional: 50,
      buildReliability: 20,
      accessibility: 10,
      responsive: 10,
      security: 10,
    }
  ): BenchmarkRunSummary {
    const totalScenarios = scenarioRuns.length;
    let passedScenarios = 0;
    let failedScenarios = 0;
    let skippedScenarios = 0;
    let errorScenarios = 0;

    // Track passes per category
    const categoryStats: Record<string, { total: number; passed: number; failed: number; skipped: number }> = {
      functional: { total: 0, passed: 0, failed: 0, skipped: 0 },
      build: { total: 0, passed: 0, failed: 0, skipped: 0 },
      accessibility: { total: 0, passed: 0, failed: 0, skipped: 0 },
      responsive: { total: 0, passed: 0, failed: 0, skipped: 0 },
      security: { total: 0, passed: 0, failed: 0, skipped: 0 },
    };

    const failureCategoriesSet = new Set<string>();
    const actionableSuggestions: string[] = [];

    for (const run of scenarioRuns) {
      if (run.status === 'passed') {
        passedScenarios++;
      } else if (run.status === 'failed') {
        failedScenarios++;
      } else if (run.status === 'skipped') {
        skippedScenarios++;
      } else if (run.status === 'error') {
        errorScenarios++;
      }

      // Map run category
      let catKey = run.category as string;
      if (catKey === 'persistence') catKey = 'functional'; // persistence maps to functional pillar
      if (!categoryStats[catKey]) {
        categoryStats[catKey] = { total: 0, passed: 0, failed: 0, skipped: 0 };
      }

      categoryStats[catKey].total++;
      if (run.status === 'passed') categoryStats[catKey].passed++;
      if (run.status === 'failed' || run.status === 'error') {
        categoryStats[catKey].failed++;
        if (catKey === 'build') {
          failureCategoriesSet.add('Build/Compilation Error');
          actionableSuggestions.push('Check TypeScript errors, missing dependencies in package.json, or broken imports.');
        } else if (catKey === 'accessibility') {
          failureCategoriesSet.add('Accessibility (a11y) Violation');
          actionableSuggestions.push('Add alt attributes to images, labels to form inputs, and ensure language tag is set.');
        } else if (catKey === 'responsive') {
          failureCategoriesSet.add('Mobile Viewport Overflow');
          actionableSuggestions.push('Review CSS width, use flex-wrap or overflow-hidden to prevent horizontal scrolling on mobile.');
        } else if (catKey === 'security') {
          failureCategoriesSet.add('Security Vulnerability / Secret Leak');
          actionableSuggestions.push('Move hardcoded API keys or database credentials to environment variables.');
        } else {
          failureCategoriesSet.add('Functional Assertion Failure');
          actionableSuggestions.push(`Inspect ${run.name}: ensure expected UI elements render and required state mutations occur.`);
        }
      }
      if (run.status === 'skipped') categoryStats[catKey].skipped++;
    }

    // Calculate individual pillar scores (0 to 100)
    const calcCategoryScore = (stat: { total: number; passed: number; skipped: number }, weight: number) => {
      const activeTotal = stat.total - stat.skipped;
      if (activeTotal <= 0) {
        return { score: 0, available: false, weight };
      }
      const score = Math.round((stat.passed / activeTotal) * 100);
      return { score, available: true, weight };
    };

    const funcScore = calcCategoryScore(categoryStats.functional, weights.functional);
    const buildScore = calcCategoryScore(categoryStats.build, weights.buildReliability);
    const a11yScore = calcCategoryScore(categoryStats.accessibility, weights.accessibility);
    const respScore = calcCategoryScore(categoryStats.responsive, weights.responsive);
    const secScore = calcCategoryScore(categoryStats.security, weights.security);

    // Calculate weighted overall score normalized by active available weights
    let weightedSum = 0;
    let totalAvailableWeight = 0;

    const pillars = [
      { res: funcScore, weight: weights.functional },
      { res: buildScore, weight: weights.buildReliability },
      { res: a11yScore, weight: weights.accessibility },
      { res: respScore, weight: weights.responsive },
      { res: secScore, weight: weights.security },
    ];

    for (const p of pillars) {
      if (p.res.available) {
        weightedSum += p.res.score * p.weight;
        totalAvailableWeight += p.weight;
      }
    }

    const overallScore = totalAvailableWeight > 0
      ? Math.round(weightedSum / totalAvailableWeight)
      : 0;

    return {
      totalScenarios,
      passedScenarios,
      failedScenarios,
      skippedScenarios,
      errorScenarios,
      overallScore,
      categoryScores: {
        functional: funcScore,
        buildReliability: buildScore,
        accessibility: a11yScore,
        responsive: respScore,
        security: secScore,
      },
      failureCategories: Array.from(failureCategoriesSet),
      actionableDebuggingSuggestions: Array.from(new Set(actionableSuggestions)).slice(0, 5),
    };
  }
}
