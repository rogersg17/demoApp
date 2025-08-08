import { useEffect, useMemo, useState } from 'react'
import { AnalyticsApi } from '../services/analyticsApi'
import type { FailurePatternSummary, PrioritizedTestSuggestion, PlatformBenchmark, PerformanceTrendPoint, ReliabilityPrediction, ReliabilityHistory, NotificationRouting, RemediationSuggestions, ReliabilityHistoryPoint } from '../types/analytics'
import Layout from '../components/Layout'
import './AdvancedAnalyticsPage.css'
import Sparkline from '../components/Sparkline'

export default function AdvancedAnalyticsPage() {
  const [patterns, setPatterns] = useState<FailurePatternSummary[]>([])
  const [queue, setQueue] = useState<PrioritizedTestSuggestion[]>([])
  const [benchmarks, setBenchmarks] = useState<PlatformBenchmark[]>([])
  const [trends, setTrends] = useState<PerformanceTrendPoint[]>([])
  const [selectedTest, setSelectedTest] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    Promise.all([
      AnalyticsApi.getFailurePatterns(100),
      AnalyticsApi.getPrioritizedQueue(),
      AnalyticsApi.getBenchmarks(),
      AnalyticsApi.getPerformanceTrends(30),
    ])
      .then(([p, q, b, t]) => {
        if (!mounted) return
        setPatterns(p.patterns || [])
        setQueue(q.queue || [])
        setBenchmarks(b.benchmarks || [])
        setTrends(t.trends || [])
      })
      .catch(e => setError(e.message || 'Failed to load analytics'))
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  const topFlaky = useMemo(() => patterns.filter(p => p.pattern === 'flaky').slice(0, 10), [patterns])
  const persistent = useMemo(() => patterns.filter(p => p.pattern === 'persistent').slice(0, 10), [patterns])

  return (
    <Layout>
      <div className="adv-analytics">
        <h1>Advanced Analytics Dashboard</h1>
        {loading && <div className="aa-card">Loading…</div>}
        {error && <div className="aa-error">{error}</div>}

        <div className="aa-grid">
          <section className="aa-card">
            <h2>Top Flaky Tests</h2>
            <table>
              <thead>
                <tr>
                  <th>Test</th><th>Failure %</th><th>Trend</th><th>Reliability</th>
                </tr>
              </thead>
              <tbody>
                {topFlaky.map(p => (
                  <tr key={p.testName} onClick={() => setSelectedTest(p.testName)} className={selectedTest===p.testName? 'selected':''}>
                    <td>{p.testName}</td>
                    <td>{(p.failureRate*100).toFixed(1)}%</td>
                    <td>{p.trend}</td>
                    <td>{p.reliabilityScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="aa-card">
            <h2>Persistent Failures</h2>
            <ul>
              {persistent.map(p => (
                <li key={p.testName} onClick={() => setSelectedTest(p.testName)} className={selectedTest===p.testName? 'selected':''}>
                  {p.testName} — {(p.failureRate*100).toFixed(1)}% fail, trend {p.trend}
                </li>
              ))}
            </ul>
          </section>

          <section className="aa-card">
            <h2>Prioritized Queue (Top 15)</h2>
            <ol>
              {queue.slice(0,15).map(item => (
                <li key={item.testName} onClick={() => setSelectedTest(item.testName)} className={selectedTest===item.testName? 'selected':''}>
                  <span className="priority">{item.suggestedPriority}</span> {item.testName}
                  <div className="rationale">{item.rationale.join(' • ')}</div>
                </li>
              ))}
            </ol>
          </section>

          <section className="aa-card">
            <h2>Platform Benchmarks</h2>
            <div className="benchmarks">
              {benchmarks.map(b => (
                <div key={b.platform} className="benchmark">
                  <div className="platform">{b.platform}</div>
                  <div>Success: {b.successRate?.toFixed(1) ?? '—'}%</div>
                  <div>Avg Duration: {b.avgDurationMs ? Math.round(b.avgDurationMs/1000) : '—'}s</div>
                  <div>Executions: {b.totalExecutions ?? '—'}</div>
                  <div>Cost (est.): {b.costEstimate ?? '—'}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="aa-card">
            <h2>Performance Trends (30d)</h2>
            <div className="trend-grid">
              <div className="trend-card">
                <div className="trend-title">Total Failures</div>
                <Sparkline data={trends.map(t => t.totalFailures)} ariaLabel="Total failures trend" />
              </div>
              <div className="trend-card">
                <div className="trend-title">Unique Tests</div>
                <Sparkline data={trends.map(t => t.uniqueTests)} ariaLabel="Unique tests trend" stroke="#10b981" fill="rgba(16,185,129,0.15)" />
              </div>
              <div className="trend-card">
                <div className="trend-title">New Failures</div>
                <Sparkline data={trends.map(t => t.newFailures)} ariaLabel="New failures trend" stroke="#f59e0b" fill="rgba(245,158,11,0.15)" />
              </div>
              <div className="trend-card">
                <div className="trend-title">Persistent Failures</div>
                <Sparkline data={trends.map(t => t.persistentFailures)} ariaLabel="Persistent failures trend" stroke="#ef4444" fill="rgba(239,68,68,0.15)" />
              </div>
            </div>
          </section>
        </div>

        {selectedTest && <TestDetail testName={selectedTest} onClose={() => setSelectedTest('')} />}
      </div>
    </Layout>
  )
}

function TestDetail({ testName, onClose }: { testName: string, onClose: () => void }) {
  const [prediction, setPrediction] = useState<ReliabilityPrediction | null>(null)
  const [history, setHistory] = useState<ReliabilityHistory | null>(null)
  const [routing, setRouting] = useState<NotificationRouting | null>(null)
  const [remediation, setRemediation] = useState<RemediationSuggestions | null>(null)

  useEffect(() => {
    let mounted = true
    Promise.all([
      AnalyticsApi.predictReliability(testName),
      AnalyticsApi.getReliabilityHistory(testName, 30),
      AnalyticsApi.getNotificationRouting(testName),
      AnalyticsApi.getRemediation(testName)
    ]).then(([pred, hist, route, rem]) => {
      if (!mounted) return
      setPrediction(pred?.prediction ?? null)
      setHistory(hist?.history ?? null)
      setRouting(route?.routing ?? null)
      setRemediation(rem?.remediation ?? null)
    })
    return () => { mounted = false }
  }, [testName])

  return (
    <div className="aa-detail">
      <div className="aa-detail-card">
        <div className="aa-detail-header">
          <h3>{testName}</h3>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="aa-detail-grid">
          <div>
            <h4>Prediction</h4>
            {prediction ? (
              <>
                <div>Reliability Score: {prediction.reliabilityScore}</div>
                <div>Failure Prob.: {(prediction.predictedFailureProbability*100).toFixed(2)}%</div>
                <div className="basis">{prediction.basis.join(' • ')}</div>
              </>
            ) : '—'}
          </div>
          <div>
            <h4>Routing</h4>
            {routing ? (
              <>
                <div>Channels: {routing.channels.join(', ')}</div>
                <div>Priority: {routing.priority}</div>
                <div className="basis">{routing.rationale.join(' • ')}</div>
              </>
            ) : '—'}
          </div>
          <div>
            <h4>Remediation</h4>
            <ul>
              {remediation?.suggestions?.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div>
            <h4>30d Reliability</h4>
            <div className="mini-table">
              <div className="mini-row mini-head"><span>Date</span><span>Fails</span><span>Execs</span><span>Rate</span></div>
              {history?.daily?.map((d: ReliabilityHistoryPoint) => (
                <div key={d.date} className="mini-row"><span>{d.date}</span><span>{d.failures}</span><span>{d.executions}</span><span>{(d.failureRate*100).toFixed(1)}%</span></div>
              ))}
            </div>
            <div className="mini-chart">
              <Sparkline
                data={history?.daily?.map(d => d.failureRate * 100) || []}
                ariaLabel="Failure rate sparkline"
                stroke="#ef4444"
                fill="rgba(239,68,68,0.12)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
