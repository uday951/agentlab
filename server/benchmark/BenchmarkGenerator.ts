import type {
  BenchmarkDefinition,
  BenchmarkScenario,
  ProjectAnalysis,
  ScoringWeights,
} from '../types.ts';

export class BenchmarkGenerator {
  /**
   * Generates a tailored Benchmark Definition based on real project analysis.
   */
  public static generateBenchmark(
    projectId: string,
    projectName: string,
    analysis: ProjectAnalysis,
    requestedCategory?: string
  ): BenchmarkDefinition {
    // 1. Determine category: user requested or auto-inferred from analysis
    let category = requestedCategory || 'general_web';
    if (!requestedCategory || requestedCategory === 'auto') {
      const caps = analysis.likelyCapabilities.join(' ').toLowerCase();
      if (caps.includes('task') || caps.includes('todo')) {
        category = 'task_management';
      } else if (caps.includes('commerce') || caps.includes('cart') || caps.includes('product')) {
        category = 'ecommerce';
      } else if (caps.includes('dashboard') || caps.includes('metric') || caps.includes('analytics')) {
        category = 'dashboard';
      } else if (caps.includes('auth') || caps.includes('login') || caps.includes('session')) {
        category = 'authentication';
      } else if (analysis.entrypoints.backend && !analysis.entrypoints.frontend) {
        category = 'api_service';
      }
    }

    const scoringWeights: ScoringWeights = {
      functional: 50,
      buildReliability: 20,
      accessibility: 10,
      responsive: 10,
      security: 10,
    };

    const scenarios: BenchmarkScenario[] = [];

    // --- Core Suite 1: Build & Compilation Reliability (20%) ---
    scenarios.push({
      id: `sc-build-${Date.now()}-1`,
      name: 'Production Build & Compilation Verification',
      objective: 'Verify that the application bundles cleanly with 0 TypeScript/compilation errors and produces build artifacts.',
      category: 'build',
      type: 'build',
      executionSteps: [
        'Invoke production build script (e.g., npm run build or framework compiler)',
        'Capture compilation stdout and stderr stream',
        'Verify process exit code is 0 and output artifacts are generated',
      ],
      expectedResult: 'Build succeeds with exit code 0 and bundles valid client/server assets without fatal compilation breaks.',
    });

    // --- Core Suite 2: Existing Unit & Integration Tests (if present) ---
    if (analysis.existingTestFiles.length > 0 && analysis.testScript) {
      scenarios.push({
        id: `sc-unit-${Date.now()}-2`,
        name: 'Repository Unit & Integration Test Suite',
        objective: `Execute the author-provided test files (${analysis.existingTestFiles.length} detected) and verify test passes.`,
        category: 'functional',
        type: 'unit_test',
        executionSteps: [
          `Run test script: ${analysis.testScript}`,
          'Capture test reporter results (passes, failures, snapshots)',
          'Verify all unit/integration assertions hold true',
        ],
        expectedResult: 'All detected test cases pass successfully without uncaught exceptions.',
      });
    }

    // --- Core Suite 3: Domain-Specific Functional Scenarios (50%) ---
    if (category === 'task_management') {
      scenarios.push(
        {
          id: `sc-task-create-${Date.now()}-3`,
          name: 'Task Creation & List Population',
          objective: 'Verify that users can enter a new task title and submit the form, and the new item appears in the list view.',
          category: 'functional',
          type: 'browser',
          executionSteps: [
            'Navigate to application home view',
            'Locate task input field or "+ Add Task" button',
            'Type "Automated Benchmark Task #1" and submit form',
            'Inspect DOM list to confirm new task item is rendered',
          ],
          expectedResult: 'New task is rendered in the active list with correct title text.',
          testSpec: {
            actionSequence: [
              { action: 'navigate' },
              { action: 'wait', timeoutMs: 1500 },
              { action: 'assert_element', selector: 'input, textarea, [placeholder*="task" i], [placeholder*="todo" i]' },
            ],
          },
        },
        {
          id: `sc-task-complete-${Date.now()}-4`,
          name: 'Task Completion & Status Toggle',
          objective: 'Verify that completing a task updates its UI state (strikethrough or badge) and updates active counters.',
          category: 'functional',
          type: 'browser',
          executionSteps: [
            'Locate checkbox or status toggle next to task item',
            'Click toggle to mark task as completed',
            'Verify checkbox is checked or task element contains completed styling',
          ],
          expectedResult: 'Task status updates visually to completed/done.',
          testSpec: {
            actionSequence: [
              { action: 'navigate' },
              { action: 'wait', timeoutMs: 1000 },
            ],
          },
        },
        {
          id: `sc-task-persistence-${Date.now()}-5`,
          name: 'State Persistence Across Reload',
          objective: 'Verify that tasks created in the session persist in localStorage, IndexedDB, or database after page reload.',
          category: 'persistence',
          type: 'persistence',
          executionSteps: [
            'Record currently visible tasks in DOM',
            'Reload the browser page',
            'Verify that previously created tasks remain present and unchanged',
          ],
          expectedResult: 'Task items remain in the list after full page reload.',
        }
      );
    } else if (category === 'ecommerce') {
      scenarios.push(
        {
          id: `sc-ecom-browse-${Date.now()}-3`,
          name: 'Product Catalog Browsing & Search',
          objective: 'Verify that product items render with title, image, and price, and search filter updates the product grid.',
          category: 'functional',
          type: 'browser',
          executionSteps: [
            'Navigate to product catalog or storefront',
            'Verify at least one product card with title and price is displayed',
            'Enter keyword into search input and verify results match keyword',
          ],
          expectedResult: 'Product cards render and search filter refines the displayed list.',
        },
        {
          id: `sc-ecom-cart-${Date.now()}-4`,
          name: 'Add to Cart & Quantity Update',
          objective: 'Verify that clicking "Add to Cart" increments cart counter badge and adds item to cart drawer or page.',
          category: 'functional',
          type: 'browser',
          executionSteps: [
            'Click "Add to Cart" or shopping button on a product card',
            'Verify cart badge increments by 1',
            'Open cart and verify product item is listed with correct price',
          ],
          expectedResult: 'Cart badge reflects added item and cart summary calculates subtotal.',
        },
        {
          id: `sc-ecom-checkout-${Date.now()}-5`,
          name: 'Checkout Form Field Validation',
          objective: 'Verify that submitting empty checkout fields triggers validation errors on required inputs.',
          category: 'functional',
          type: 'browser',
          executionSteps: [
            'Navigate to checkout form',
            'Click "Place Order" or submit without filling required name or address fields',
            'Verify visual validation errors appear for required inputs',
          ],
          expectedResult: 'Form validation prevents empty checkout and displays clear field errors.',
        }
      );
    } else if (category === 'dashboard') {
      scenarios.push(
        {
          id: `sc-dash-nav-${Date.now()}-3`,
          name: 'Navigation & Tab Switching',
          objective: 'Verify primary navigation links switch views without 404 routes or runtime script errors.',
          category: 'functional',
          type: 'browser',
          executionSteps: [
            'Navigate to main dashboard layout',
            'Click through primary sidebar or navigation tabs',
            'Confirm view headers and content panels update accordingly',
          ],
          expectedResult: 'Navigation updates active view without unhandled errors.',
        },
        {
          id: `sc-dash-table-${Date.now()}-4`,
          name: 'Data Table & Filter Interactions',
          objective: 'Verify data tables render records and allow sorting or column filtering.',
          category: 'functional',
          type: 'browser',
          executionSteps: [
            'Locate primary data table or list view',
            'Check for table rows and column headers',
            'Interact with search or status dropdown filter',
          ],
          expectedResult: 'Table updates rows based on active filter query.',
        }
      );
    } else if (category === 'authentication') {
      scenarios.push(
        {
          id: `sc-auth-login-${Date.now()}-3`,
          name: 'Invalid Credentials Validation',
          objective: 'Verify that submitting invalid credentials shows an explicit error alert instead of failing silently.',
          category: 'functional',
          type: 'browser',
          executionSteps: [
            'Navigate to login screen',
            'Enter invalid email "benchmark_test@example.com" and wrong password',
            'Click "Sign In" / "Log In"',
            'Check for accessible error alert or invalid credentials banner',
          ],
          expectedResult: 'Clear error feedback is displayed indicating invalid credentials.',
        },
        {
          id: `sc-auth-protected-${Date.now()}-4`,
          name: 'Protected Route Boundary Check',
          objective: 'Verify that unauthenticated access to protected routes redirects to the login view.',
          category: 'functional',
          type: 'browser',
          executionSteps: [
            'Attempt direct navigation to protected route (e.g. /dashboard or /profile)',
            'Verify user is redirected to /login or prompted with authentication barrier',
          ],
          expectedResult: 'Unauthenticated requests are intercepted and redirected to login.',
        }
      );
    } else if (category === 'api_service') {
      scenarios.push(
        {
          id: `sc-api-health-${Date.now()}-3`,
          name: 'Health Check / Root Endpoint Response',
          objective: 'Verify that the server endpoint responds with HTTP 200 and valid JSON.',
          category: 'functional',
          type: 'api',
          executionSteps: [
            'Send GET request to API root or /api/health or /health',
            'Verify HTTP status code is 200 or 404 is handled gracefully with JSON',
          ],
          expectedResult: 'Server returns valid JSON status payload.',
          testSpec: {
            apiEndpoint: '/',
            apiMethod: 'GET',
            expectedStatusCode: 200,
          },
        }
      );
    } else {
      // General Web App Scenarios
      scenarios.push(
        {
          id: `sc-web-render-${Date.now()}-3`,
          name: 'Primary UI Viewport & Interactive Rendering',
          objective: 'Verify that the application renders its primary interactive view without uncaught JavaScript exceptions.',
          category: 'functional',
          type: 'browser',
          executionSteps: [
            'Navigate to application root URL',
            'Inspect document title, root element, and main container',
            'Verify zero unhandled console errors or fatal error boundaries',
          ],
          expectedResult: 'Root DOM container is mounted with interactive elements and no fatal crash.',
        }
      );
    }

    // --- Core Suite 4: Responsive Viewport Checks (10%) ---
    scenarios.push({
      id: `sc-resp-${Date.now()}-6`,
      name: 'Multi-Device Responsive Viewport Verification',
      objective: 'Verify layout adapts across Desktop (1280x800), Tablet (768x1024), and Mobile (375x667) without horizontal overflow.',
      category: 'responsive',
      type: 'responsive',
      executionSteps: [
        'Render viewport at Desktop (1280x800) and verify container width',
        'Render viewport at Tablet (768x1024) and verify layout adjustment',
        'Render viewport at Mobile (375x667) and verify no horizontal scrollbar overflow occurs',
      ],
      expectedResult: 'UI adapts cleanly across all three viewports with body scrollWidth <= window.innerWidth.',
    });

    // --- Core Suite 5: Web Accessibility (WCAG 2.1) Audit (10%) ---
    scenarios.push({
      id: `sc-a11y-${Date.now()}-7`,
      name: 'WCAG Accessibility & Semantic HTML Audit',
      objective: 'Audit rendered DOM for semantic HTML, page title, html lang attribute, image alt tags, and button accessible names.',
      category: 'accessibility',
      type: 'accessibility',
      executionSteps: [
        'Inspect <html> element for language attribute (<html lang="en">)',
        'Check that document has a non-empty <title>',
        'Verify all <img> tags have alt attributes',
        'Verify interactive <button> and <a> elements have accessible text content or aria-label',
      ],
      expectedResult: 'Zero high-severity accessibility violations on the primary rendered view.',
    });

    // --- Core Suite 6: Static Security & Hardcoded Secrets Scan (10%) ---
    scenarios.push({
      id: `sc-sec-${Date.now()}-8`,
      name: 'Static Security & Secret Leakage Inspection',
      objective: 'Scan codebase for hardcoded private API keys, exposed database passwords, and dangerous dynamic code execution.',
      category: 'security',
      type: 'static_security',
      executionSteps: [
        'Scan source files for patterns matching OpenAI, AWS, or generic private API keys',
        'Check for eval() or unescaped dangerouslySetInnerHTML vulnerabilities',
        'Verify no committed sensitive credentials in repository files',
      ],
      expectedResult: 'Codebase is free from hardcoded private keys and severe script injection risks.',
    });

    const categoryTitles: Record<string, string> = {
      task_management: 'Task & Workflow Management Benchmark',
      ecommerce: 'E-commerce & Storefront Benchmark',
      dashboard: 'Analytics & Management Dashboard Benchmark',
      authentication: 'Authentication & Authorization Benchmark',
      api_service: 'Backend REST API Benchmark',
      general_web: 'Full-Stack Web Application Benchmark',
    };

    return {
      id: `bench-${projectId}-${Date.now()}`,
      projectId,
      category,
      name: `${projectName} - ${categoryTitles[category] || 'Application Benchmark'}`,
      description: `Comprehensive 5-pillar evaluation suite for ${projectName} (${analysis.framework || 'Web App'}), testing functional correctness, build reliability, responsive design, accessibility, and security.`,
      generatedBy: 'template',
      scoringWeights,
      scenarios,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
