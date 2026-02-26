import { useEffect, useMemo, useState } from 'react';
import './C2MockPanel.css';

type EntityType = 'bases' | 'squadrons' | 'aircraft';
type ScenarioPath = 'happy' | 'sad';
type RunStatus = 'pass' | 'fail' | 'warn';
type StubMode = 'offline' | 'contract' | 'degraded';

interface Scenario {
  id: string;
  title: string;
  entity: EntityType;
  path: ScenarioPath;
  description: string;
  payloadShape: string;
  expectedBehavior: string;
  checks: string[];
  simulatedStatus: RunStatus;
}

interface RunHistoryItem {
  id: string;
  scenarioTitle: string;
  entity: EntityType;
  path: ScenarioPath;
  status: RunStatus;
  timestamp: string;
}

const scenarioCatalog: Scenario[] = [
  {
    id: 'base-happy-standard',
    title: 'Base Ingest - Nominal Batch',
    entity: 'bases',
    path: 'happy',
    description: 'Three known bases arrive with complete metadata and geolocation.',
    payloadShape: '{ "bases": [{ "baseCode": "NIPR", "lat": 35.4, "lon": -117.8 }, ...] }',
    expectedBehavior: 'Records are created or updated and marked active in local cache.',
    checks: ['HTTP 200 from ingest endpoint', 'base_count incremented by 3', 'no schema errors'],
    simulatedStatus: 'pass',
  },
  {
    id: 'base-happy-upsert',
    title: 'Base Ingest - Existing Base Upsert',
    entity: 'bases',
    path: 'happy',
    description: 'An existing base is resent with revised runway status and owner org.',
    payloadShape: '{ "bases": [{ "baseCode": "ALDH", "runwayStatus": "OPEN", "owner": "7OG" }] }',
    expectedBehavior: 'Record updates in place and downstream consumers receive one update event.',
    checks: ['upsert_event emitted', 'exactly 1 row updated', 'no duplicate baseCode'],
    simulatedStatus: 'pass',
  },
  {
    id: 'base-sad-missing-geo',
    title: 'Base Ingest - Missing Coordinates',
    entity: 'bases',
    path: 'sad',
    description: 'Payload omits lat/lon for a new base in lower environment feed.',
    payloadShape: '{ "bases": [{ "baseCode": "FWDX", "lat": null, "lon": null }] }',
    expectedBehavior: 'Validation rejects the base and logs a schema fault with reason code.',
    checks: ['HTTP 422 validation failure', 'fault_code BASE_GEO_REQUIRED', 'record not persisted'],
    simulatedStatus: 'warn',
  },
  {
    id: 'sqn-happy-parent-link',
    title: 'Squadron Ingest - Parent Base Resolved',
    entity: 'squadrons',
    path: 'happy',
    description: 'Squadron payload references a known base and valid mission type.',
    payloadShape: '{ "squadrons": [{ "sqnCode": "VMA-221", "baseCode": "NIPR", "mission": "CAS" }] }',
    expectedBehavior: 'Squadron is accepted and foreign-key link to base is maintained.',
    checks: ['HTTP 200 accepted', 'parent_link_resolved true', 'no orphan warning'],
    simulatedStatus: 'pass',
  },
  {
    id: 'sqn-sad-orphan',
    title: 'Squadron Ingest - Unknown Base Reference',
    entity: 'squadrons',
    path: 'sad',
    description: 'Squadron points to a base that does not exist in stubbed C2 cache.',
    payloadShape: '{ "squadrons": [{ "sqnCode": "RED-13", "baseCode": "GHOST" }] }',
    expectedBehavior: 'Record is quarantined until base ingest catches up or operator resolves.',
    checks: ['HTTP 409 conflict', 'quarantine_queue +1', 'operator_alert raised'],
    simulatedStatus: 'fail',
  },
  {
    id: 'sqn-sad-duplicate',
    title: 'Squadron Ingest - Duplicate Squadron Code',
    entity: 'squadrons',
    path: 'sad',
    description: 'Two updates arrive with same squadron code and conflicting parent base.',
    payloadShape: '{ "squadrons": [{ "sqnCode": "HOG-2", "baseCode": "ALDH" }, { "sqnCode": "HOG-2", "baseCode": "NIPR" }] }',
    expectedBehavior: 'Second record is rejected; first remains authoritative.',
    checks: ['duplicate key detected', 'conflict event emitted', 'no silent overwrite'],
    simulatedStatus: 'warn',
  },
  {
    id: 'air-happy-nominal',
    title: 'Aircraft Ingest - Nominal Readiness Feed',
    entity: 'aircraft',
    path: 'happy',
    description: 'Aircraft entries include tail, squadron, fuel, and readiness state.',
    payloadShape: '{ "aircraft": [{ "tail": "AF88-0171", "sqnCode": "VMA-221", "status": "MC" }] }',
    expectedBehavior: 'Aircraft rows are created and exposed through mission planning query.',
    checks: ['HTTP 200 accepted', 'tail indexed', 'ready_aircraft metric updated'],
    simulatedStatus: 'pass',
  },
  {
    id: 'air-happy-state-transition',
    title: 'Aircraft Ingest - Maintenance Recovery',
    entity: 'aircraft',
    path: 'happy',
    description: 'Aircraft status transitions from NMC to FMC in follow-on update.',
    payloadShape: '{ "aircraft": [{ "tail": "AF91-1182", "status": "FMC", "note": "hydraulics cleared" }] }',
    expectedBehavior: 'State transition is recorded in audit trail and reflected in summary cards.',
    checks: ['status_transition NMC->FMC', 'audit trail entry inserted', 'availability dashboard refresh'],
    simulatedStatus: 'pass',
  },
  {
    id: 'air-sad-tail-collision',
    title: 'Aircraft Ingest - Duplicate Tail Number',
    entity: 'aircraft',
    path: 'sad',
    description: 'Tail number collides with an existing record owned by another squadron.',
    payloadShape: '{ "aircraft": [{ "tail": "AF88-0171", "sqnCode": "RED-13" }] }',
    expectedBehavior: 'Update is blocked and conflict sent to operator queue.',
    checks: ['HTTP 409 conflict', 'tail_collision metric +1', 'existing owner preserved'],
    simulatedStatus: 'fail',
  },
  {
    id: 'air-sad-invalid-enum',
    title: 'Aircraft Ingest - Invalid Status Enum',
    entity: 'aircraft',
    path: 'sad',
    description: 'Status value is outside allowed enum due to legacy stub payload.',
    payloadShape: '{ "aircraft": [{ "tail": "AF87-3012", "status": "FLYABLE_MAYBE" }] }',
    expectedBehavior: 'Schema validator rejects payload and writes diagnostic for contract drift.',
    checks: ['HTTP 422 validation failure', 'enum_error field=status', 'ingest transaction rolled back'],
    simulatedStatus: 'warn',
  },
];

const stubModes: Array<{ id: StubMode; label: string; description: string }> = [
  {
    id: 'offline',
    label: 'Offline Stub (default)',
    description: 'No live C2. All responses come from deterministic local fixtures.',
  },
  {
    id: 'contract',
    label: 'Contract Replay',
    description: 'Responses mirror Swagger examples to validate DTO/contract handling.',
  },
  {
    id: 'degraded',
    label: 'Degraded Link',
    description: 'Adds latency spikes and intermittent 5xx to stress error handling.',
  },
];

const entityFilters: Array<{ id: 'all' | EntityType; label: string }> = [
  { id: 'all', label: 'All Entities' },
  { id: 'bases', label: 'Bases' },
  { id: 'squadrons', label: 'Squadrons' },
  { id: 'aircraft', label: 'Aircraft' },
];

const pathFilters: Array<{ id: 'all' | ScenarioPath; label: string }> = [
  { id: 'all', label: 'All Paths' },
  { id: 'happy', label: 'Happy Path' },
  { id: 'sad', label: 'Sad Path' },
];

function formatEntityLabel(entity: EntityType): string {
  if (entity === 'bases') return 'Bases';
  if (entity === 'squadrons') return 'Squadrons';
  return 'Aircraft';
}

export default function C2MockPanel() {
  const [stubMode, setStubMode] = useState<StubMode>('offline');
  const [entityFilter, setEntityFilter] = useState<'all' | EntityType>('all');
  const [pathFilter, setPathFilter] = useState<'all' | ScenarioPath>('all');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(scenarioCatalog[0].id);
  const [runHistory, setRunHistory] = useState<RunHistoryItem[]>([
    {
      id: 'boot-1',
      scenarioTitle: 'Base Ingest - Nominal Batch',
      entity: 'bases',
      path: 'happy',
      status: 'pass',
      timestamp: '08:55:13Z',
    },
    {
      id: 'boot-2',
      scenarioTitle: 'Squadron Ingest - Unknown Base Reference',
      entity: 'squadrons',
      path: 'sad',
      status: 'fail',
      timestamp: '08:56:47Z',
    },
  ]);

  const filteredScenarios = useMemo(() => {
    return scenarioCatalog.filter((scenario) => {
      const entityMatch = entityFilter === 'all' || scenario.entity === entityFilter;
      const pathMatch = pathFilter === 'all' || scenario.path === pathFilter;
      return entityMatch && pathMatch;
    });
  }, [entityFilter, pathFilter]);

  useEffect(() => {
    if (filteredScenarios.length === 0) return;
    if (!filteredScenarios.find((scenario) => scenario.id === selectedScenarioId)) {
      setSelectedScenarioId(filteredScenarios[0].id);
    }
  }, [filteredScenarios, selectedScenarioId]);

  const selectedScenario = useMemo(() => {
    return scenarioCatalog.find((scenario) => scenario.id === selectedScenarioId) ?? null;
  }, [selectedScenarioId]);

  const happyCount = scenarioCatalog.filter((scenario) => scenario.path === 'happy').length;
  const sadCount = scenarioCatalog.filter((scenario) => scenario.path === 'sad').length;
  const failedCount = runHistory.filter((entry) => entry.status === 'fail').length;

  const activeMode = stubModes.find((mode) => mode.id === stubMode);

  const handleRunScenario = () => {
    if (!selectedScenario) return;

    const now = `${new Date().toISOString().slice(11, 19)}Z`;
    const entry: RunHistoryItem = {
      id: `${selectedScenario.id}-${Date.now()}`,
      scenarioTitle: selectedScenario.title,
      entity: selectedScenario.entity,
      path: selectedScenario.path,
      status: selectedScenario.simulatedStatus,
      timestamp: now,
    };

    setRunHistory((previous) => [entry, ...previous].slice(0, 12));
  };

  const handleRunSuite = () => {
    if (filteredScenarios.length === 0) return;

    const suiteRun = filteredScenarios.map((scenario, index) => {
      const now = new Date(Date.now() + index * 1000).toISOString().slice(11, 19);
      return {
        id: `${scenario.id}-${Date.now()}-${index}`,
        scenarioTitle: scenario.title,
        entity: scenario.entity,
        path: scenario.path,
        status: scenario.simulatedStatus,
        timestamp: `${now}Z`,
      };
    });

    setRunHistory((previous) => [...suiteRun.reverse(), ...previous].slice(0, 12));
  };

  return (
    <div className="c2-lab">
      <section className="c2-lab-hero">
        <div className="c2-lab-hero-text">
          <p className="c2-lab-overline">Lower Environment C2 Test Console</p>
          <h1>Mock + Stub Validation Panel</h1>
          <p>
            Designed for environments where live C2 is unavailable. Exercise ingest workflows for bases,
            squadrons, and aircraft through repeatable happy-path and sad-path scenarios.
          </p>
        </div>
        <div className="c2-lab-metrics">
          <article>
            <span>Happy Paths</span>
            <strong>{happyCount}</strong>
          </article>
          <article>
            <span>Sad Paths</span>
            <strong>{sadCount}</strong>
          </article>
          <article>
            <span>Run Failures</span>
            <strong>{failedCount}</strong>
          </article>
        </div>
      </section>

      <section className="c2-lab-layout">
        <aside className="c2-lab-card c2-lab-sidebar">
          <h2>Connection Mode</h2>
          <p className="c2-lab-muted">Switch stub strategy without changing backend wiring.</p>
          <div className="c2-lab-mode-list">
            {stubModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`c2-lab-mode-option ${stubMode === mode.id ? 'is-active' : ''}`}
                onClick={() => setStubMode(mode.id)}
              >
                <span>{mode.label}</span>
                <small>{mode.description}</small>
              </button>
            ))}
          </div>

          <div className="c2-lab-endpoint">
            <p>Mock Endpoint</p>
            <code>/stub/c2/v1/ingest</code>
            <p className="c2-lab-endpoint-note">
              Active profile: <strong>{activeMode?.label}</strong>
            </p>
          </div>

          <h3>Scenario Filters</h3>
          <div className="c2-lab-filter-group">
            {entityFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={entityFilter === filter.id ? 'is-active' : ''}
                onClick={() => setEntityFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="c2-lab-filter-group">
            {pathFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={pathFilter === filter.id ? 'is-active' : ''}
                onClick={() => setPathFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </aside>

        <section className="c2-lab-card c2-lab-scenarios">
          <header className="c2-lab-section-header">
            <div>
              <h2>Scenario Matrix</h2>
              <p>{filteredScenarios.length} scenario(s) in current filter set.</p>
            </div>
            <button type="button" className="c2-lab-outline" onClick={handleRunSuite}>
              Run Filtered Suite
            </button>
          </header>

          <div className="c2-lab-scenario-grid">
            {filteredScenarios.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                className={`c2-lab-scenario-card ${scenario.path} ${selectedScenarioId === scenario.id ? 'is-selected' : ''}`}
                onClick={() => setSelectedScenarioId(scenario.id)}
              >
                <div className="c2-lab-card-top">
                  <span className={`c2-lab-pill ${scenario.path}`}>{scenario.path === 'happy' ? 'Happy Path' : 'Sad Path'}</span>
                  <span className="c2-lab-entity">{formatEntityLabel(scenario.entity)}</span>
                </div>
                <h3>{scenario.title}</h3>
                <p>{scenario.description}</p>
              </button>
            ))}
            {filteredScenarios.length === 0 && (
              <div className="c2-lab-empty">No scenarios match the selected filters.</div>
            )}
          </div>
        </section>

        <aside className="c2-lab-card c2-lab-runner">
          <h2>Execution Pane</h2>
          {selectedScenario ? (
            <>
              <h3>{selectedScenario.title}</h3>
              <p className="c2-lab-muted">{selectedScenario.expectedBehavior}</p>

              <div className="c2-lab-code-block">
                <span>Payload Shape</span>
                <code>{selectedScenario.payloadShape}</code>
              </div>

              <p className="c2-lab-check-label">Expected checks</p>
              <ul className="c2-lab-check-list">
                {selectedScenario.checks.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>

              <div className="c2-lab-actions">
                <button type="button" className="c2-lab-primary" onClick={handleRunScenario}>
                  Run Selected Scenario
                </button>
                <button type="button" className="c2-lab-outline" onClick={handleRunSuite}>
                  Run Full Filter Set
                </button>
              </div>
            </>
          ) : (
            <p className="c2-lab-muted">Choose a scenario to inspect payload and expected behavior.</p>
          )}

          <div className="c2-lab-run-history">
            <p>Recent Runs</p>
            {runHistory.map((entry) => (
              <article key={entry.id}>
                <div>
                  <strong>{entry.scenarioTitle}</strong>
                  <small>
                    {formatEntityLabel(entry.entity)} / {entry.path === 'happy' ? 'Happy' : 'Sad'} / {entry.timestamp}
                  </small>
                </div>
                <span className={`c2-lab-status ${entry.status}`}>{entry.status.toUpperCase()}</span>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
