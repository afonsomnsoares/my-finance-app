import React, { useEffect, useState, useCallback, useMemo } from 'react';
import DashboardNavbar from '../components/DashboardNavbar';
import { getCurrencySymbol, formatMoney, formatPercent, formatDate } from '../utils/format';
import { api } from '../utils/api';
import { FiArrowDown, FiArrowUp, FiDownload, FiFileText } from 'react-icons/fi';
import { Button, Field } from '../components/ui';
import SkeletonCard from '../components/SkeletonCard';
import './App.css';

/*
 * Uma cor só. As barras aqui comparam magnitude entre categorias já
 * nomeadas no eixo — dez tons não codificavam nada e não coincidiam com a
 * paleta usada no resto da app.
 */
const BAR_COLOR = 'var(--cat-1)';

function ReportsSkeleton() {
  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <SkeletonCard height={48} style={{ borderRadius: 10, marginBottom: '1.5rem' }} />
      <SkeletonCard height={80} style={{ borderRadius: 12, marginBottom: '1.5rem' }} />
      <div className="row g-3 mb-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="col-6 col-md-3">
            <SkeletonCard height={110} style={{ borderRadius: 12 }} />
          </div>
        ))}
      </div>
      <SkeletonCard height={300} style={{ borderRadius: 12, marginBottom: '1.5rem' }} />
      <SkeletonCard height={300} style={{ borderRadius: 12 }} />
    </div>
  );
}

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

export default function Reports() {
  const [user, setUser] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('month');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [exporting, setExporting] = useState('');
  const [exportError, setExportError] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: reportType, year: String(year) });
      if (reportType === 'month') params.set('month', String(month));

      const [userRes, reportRes] = await Promise.all([
        api.get('/api/me'),
        api.get(`/api/reports?${params}`),
      ]);
      setUser(userRes.data);
      setReport(reportRes.data);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [reportType, year, month]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const symbol = getCurrencySymbol(user?.currency || 'EUR');
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleDateString('pt-PT', { month: 'long' }),
  }));

  const avgPerTx = report && report.transactionCount > 0
    ? report.total / report.transactionCount
    : 0;

  const categoryChartData = useMemo(() => {
    if (!report?.byCategory) return [];
    return report.byCategory.map((row, i) => ({
      name: row.category,
      value: Math.round(row.total * 100) / 100,
      fill: BAR_COLOR,
    }));
  }, [report]);

  /*
   * Fetched through axios rather than pointed at with an <a href>.
   *
   * The export is an authenticated endpoint and the session lives in a
   * cookie: a bare link is a cross-origin top-level navigation whose cookie
   * handling depends on SameSite rules and which cannot surface a 401 to the
   * user — it just renders the JSON error as a downloaded file. Going through
   * the client means the same credentials, the same 401 interceptor, and a
   * real error path.
   */
  const handleExport = async (format) => {
    setExporting(format);
    setExportError('');
    try {
      const params = new URLSearchParams({ format, type: reportType, year: String(year) });
      if (reportType === 'month') params.set('month', String(month));

      const { data } = await api.get(`/api/reports/export?${params}`, { responseType: 'blob' });

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${reportType === 'month' ? `${year}-${String(month).padStart(2, '0')}` : year}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Releasing the object URL is what stops the blob leaking for the
      // lifetime of the tab.
      URL.revokeObjectURL(url);
    } catch {
      setExportError('Não foi possível exportar o relatório.');
    } finally {
      setExporting('');
    }
  };

  const labelStyle = { color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', fontWeight: 600 };

  return (
    <div className="ui-page">
      <DashboardNavbar />

      <main className="ui-page__body">
        <div>
          <header className="ui-page__head">
            <div>
              <span className="ui-eyebrow">Relatório</span>
              <h1 className="ui-page__title">{report ? formatMoney(report.total, symbol) : '—'}</h1>
              <p style={{ margin: 'var(--sp-1) 0 0', fontSize: 'var(--fs-sm)' }}>
                <span style={{ color: 'var(--text)' }}>{capitalize(report?.label) || '—'}</span>
                {report && report.previousTotal > 0 && (() => {
                  /* Um relatório de setembro sem referência a agosto é uma
                     lista, não um relatório. */
                  const diff = report.total - report.previousTotal;
                  const pct = (diff / report.previousTotal) * 100;
                  const up = diff > 0;
                  return (
                    <>
                      {' · '}
                      <span className={`ui-delta ui-delta--${up ? 'up' : 'down'}`}>
                        {up ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />}
                        {formatPercent(Math.abs(pct))}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}> vs. período anterior</span>
                    </>
                  );
                })()}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', margin: 'var(--sp-1) 0 0' }}>
                {report ? `${report.transactionCount} transações` : 'A carregar…'}
              </p>
            </div>
            {report && !loading && (
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <Button variant="secondary" onClick={() => handleExport('csv')} disabled={exporting !== ''} icon={<FiDownload size={15} />}>
                  {exporting === 'csv' ? 'A exportar…' : 'CSV'}
                </Button>
                <Button variant="secondary" onClick={() => handleExport('pdf')} disabled={exporting !== ''} icon={<FiDownload size={15} />}>
                  {exporting === 'pdf' ? 'A exportar…' : 'PDF'}
                </Button>
              </div>
            )}
          </header>

          <div className="filterbar">
            <Field label="Tipo" as="select" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="month">Mensal</option>
              <option value="year">Anual</option>
            </Field>
            <Field label="Ano" as="select" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </Field>
            {reportType === 'month' && (
              <Field label="Mês" as="select" value={month} onChange={(e) => setMonth(parseInt(e.target.value, 10))}>
                {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Field>
            )}
          </div>

          {exportError && (
            <div className="ui-alert ui-alert--danger" role="alert" style={{ marginBottom: 'var(--sp-4)' }}>
              {exportError}
            </div>
          )}

          {loading ? (
            <ReportsSkeleton />
          ) : report ? (
            <>
              <div className="ui-card" style={{ marginBottom: 'var(--sp-4)' }}>
                <div className="ui-metrics" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                  <div>
                    <span className="ui-metric__label">Total gasto</span>
                    <span className="ui-metric__value">{formatMoney(report.total, symbol)}</span>
                    <span className="ui-metric__hint">{report.byCategory.length} categorias</span>
                  </div>
                  <div>
                    <span className="ui-metric__label">Transações</span>
                    <span className="ui-metric__value">{report.transactionCount}</span>
                    <span className="ui-metric__hint">no período</span>
                  </div>
                  <div>
                    <span className="ui-metric__label">Média por transação</span>
                    <span className="ui-metric__value">{formatMoney(avgPerTx, symbol)}</span>
                  </div>
                  <div>
                    <span className="ui-metric__label">Maior categoria</span>
                    <span className="ui-metric__value">{report.byCategory[0]?.category || '—'}</span>
                    <span className="ui-metric__hint">
                      {report.byCategory[0] ? formatMoney(report.byCategory[0].total, symbol) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="ui-card" style={{ marginBottom: 'var(--sp-4)' }}>
                <div className="ui-card__header">
                  <div>
                    <h2 className="ui-card__title">Por categoria</h2>
                    <p className="ui-card__subtitle">
                      Ordenado por valor · {report.byCategory.length} categorias
                    </p>
                  </div>
                </div>

                {report.byCategory.length === 0 ? (
                  <p className="ui-empty__text">Sem despesas neste período.</p>
                ) : (
                  <table className="ui-table">
                    <thead>
                      <tr>
                        <th>Categoria</th>
                        <th className="report-bar-col"><span className="sr-only">Proporção</span></th>
                        <th className="num">Transações</th>
                        <th className="num">Total</th>
                        <th className="num">%</th>
                        <th className="num">Variação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byCategory.map((row) => {
                        const share = report.total > 0 ? (row.total / report.total) * 100 : 0;
                        const rel = report.byCategory[0].total > 0 ? (row.total / report.byCategory[0].total) * 100 : 0;
                        return (
                          <tr key={row.category}>
                            <td style={{ fontWeight: 'var(--fw-medium)' }}>{row.category}</td>
                            <td>
                              {/* A barra substitui o gráfico que estava ao lado a
                                  desenhar exatamente este mesmo ranking. */}
                              <div className="report-bar">
                                <div className="report-bar__fill" style={{ width: `${rel}%` }} />
                              </div>
                            </td>
                            <td className="num muted">{row.count}</td>
                            <td className="num" style={{ fontWeight: 'var(--fw-semibold)' }}>{formatMoney(row.total, symbol)}</td>
                            <td className="num muted">{formatPercent(share)}</td>
                            <td className="num">
                              {row.previous > 0 ? (
                                <span className={`ui-delta ui-delta--${row.total > row.previous ? 'up' : row.total < row.previous ? 'down' : 'flat'}`}>
                                  {formatPercent(Math.abs(((row.total - row.previous) / row.previous) * 100))}
                                </span>
                              ) : (
                                <span className="muted">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {report.transactions.length > 0 && (
                <div className="card border-0 shadow-sm animate-fade-in-up" style={{ borderRadius: 12 }}>
                  <div>
                    <h6 className="fw-bold mb-3">Detalhe de Transações</h6>
                    <div className="table-responsive">
                      <table className="table table-borderless mb-0" style={{ fontSize: 'var(--fs-sm)' }}>
                        <thead>
                          <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                            <th className="fw-semibold" style={{ fontSize: 'var(--fs-2xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Data</th>
                            <th className="fw-semibold" style={{ fontSize: 'var(--fs-2xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Categoria</th>
                            <th className="fw-semibold" style={{ fontSize: 'var(--fs-2xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Descrição</th>
                            <th className="fw-semibold text-end" style={{ fontSize: 'var(--fs-2xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.transactions.map((tx) => (
                            <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                {formatDate(tx.date, 'full')}
                              </td>
                              <td>
                                <span className="badge expense-table__badge">{tx.category}</span>
                              </td>
                              <td className="text-muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {tx.description || '—'}
                              </td>
                              <td className="text-end fw-semibold expense-table__amount">
                                {formatMoney(tx.amount, symbol)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="ui-card">
              <FiFileText size={32} className="text-muted mb-2" />
              <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>Nenhum relatório disponível para este período.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}