import React, { useEffect, useState, useCallback } from 'react';
import {
  FiArrowDown, FiArrowUp, FiCreditCard, FiDownload, FiFileText, FiList,
  FiTrendingUp,
} from 'react-icons/fi';

import AppShell from '../components/AppShell';
import MetricCard from '../components/MetricCard';
import { Button, Field } from '../components/ui';
import SkeletonCard from '../components/SkeletonCard';
import { getCurrencySymbol, formatMoney, formatPercent, formatDate } from '../utils/format';
import { api } from '../utils/api';
import './App.css';

function ReportsSkeleton() {
  return (
    <>
      <SkeletonCard height={44} style={{ borderRadius: 'var(--r-md)', marginBottom: 'var(--sp-5)', maxWidth: 300 }} />
      <div className="stat-grid">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} height={140} style={{ borderRadius: 'var(--r-lg)' }} />)}
      </div>
      <SkeletonCard height={300} style={{ borderRadius: 'var(--r-lg)', marginBottom: 'var(--sp-4)' }} />
      <SkeletonCard height={300} style={{ borderRadius: 'var(--r-lg)' }} />
    </>
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

  const variation = (() => {
    if (!report || !(report.previousTotal > 0)) return null;
    const diff = report.total - report.previousTotal;
    const pct = (diff / report.previousTotal) * 100;
    return { up: diff > 0, pct };
  })();

  return (
    <AppShell>
      <header className="page-head">
        <div>
          <span className="ui-eyebrow">Relatório</span>
          <h1 className="page-title">{report ? formatMoney(report.total, symbol) : '—'}</h1>
          <p className="page-subtitle">
            <span style={{ color: 'var(--text)' }}>{capitalize(report?.label) || '—'}</span>
            {variation && (
              <>
                {' · '}
                <span className={`ui-delta ui-delta--${variation.up ? 'up' : 'down'}`}>
                  {variation.up ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />}
                  {formatPercent(Math.abs(variation.pct))}
                </span>
                {' '}vs. período anterior
              </>
            )}
            {report && ` · ${report.transactionCount} transações`}
          </p>
        </div>
        {report && !loading && (
          <div className="page-head__actions">
            <Button variant="secondary" onClick={() => handleExport('csv')} disabled={exporting !== ''} icon={<FiDownload size={15} />}>
              {exporting === 'csv' ? 'A exportar…' : 'CSV'}
            </Button>
            <Button variant="secondary" onClick={() => handleExport('pdf')} disabled={exporting !== ''} icon={<FiDownload size={15} />}>
              {exporting === 'pdf' ? 'A exportar…' : 'PDF'}
            </Button>
          </div>
        )}
      </header>

      <div className="filter-panel">
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
          <div className="stat-grid">
            <MetricCard
              label="Total gasto"
              value={formatMoney(report.total, symbol)}
              icon={<FiCreditCard size={16} />}
              accent="orange"
              hint={`${report.byCategory.length} categorias`}
            />
            <MetricCard
              label="Transações"
              value={report.transactionCount}
              icon={<FiList size={16} />}
              accent="blue"
              hint="no período selecionado"
            />
            <MetricCard
              label="Média por transação"
              value={formatMoney(avgPerTx, symbol)}
              icon={<FiTrendingUp size={16} />}
              accent="green"
              hint={report.byCategory[0] ? `Maior: ${report.byCategory[0].category}` : 'sem categorias'}
            />
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
              <div>
                <table className="ui-table ui-table--stack">
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
                          <td data-label="Categoria" style={{ fontWeight: 'var(--fw-medium)' }}>{row.category}</td>
                          <td data-label="">
                            {/* A barra substitui o gráfico que estava ao lado a
                                desenhar exatamente este mesmo ranking. */}
                            <div className="report-bar">
                              <div className="report-bar__fill" style={{ width: `${rel}%` }} />
                            </div>
                          </td>
                          <td className="num muted" data-label="Transações">{row.count}</td>
                          <td className="num" data-label="Total" style={{ fontWeight: 'var(--fw-semibold)' }}>{formatMoney(row.total, symbol)}</td>
                          <td className="num muted" data-label="%">{formatPercent(share)}</td>
                          <td className="num" data-label="Variação">
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
              </div>
            )}
          </div>

          {report.transactions.length > 0 && (
            <div className="ui-card ui-card--tight">
              <div className="ui-card__header" style={{ padding: 'var(--sp-2) var(--sp-2) var(--sp-3)' }}>
                <h2 className="ui-card__title">Detalhe de transações</h2>
                <span className="pill">{report.transactions.length} registos</span>
              </div>
              <div>
                <table className="ui-table ui-table--stack">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Categoria</th>
                      <th>Descrição</th>
                      <th className="num">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="muted" data-label="Data" style={{ whiteSpace: 'nowrap' }}>{formatDate(tx.date, 'full')}</td>
                        <td data-label="Categoria">
                          <span className="ui-chip">
                            <span className="ui-chip__dot" style={{ background: 'var(--cat-1)' }} />
                            {tx.category}
                          </span>
                        </td>
                        <td className="muted" data-label="Descrição" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tx.description || '—'}
                        </td>
                        <td className="num" data-label="Valor" style={{ fontWeight: 'var(--fw-semibold)' }}>{formatMoney(tx.amount, symbol)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="ui-card">
          <div className="ui-empty">
            <FiFileText size={32} style={{ color: 'var(--text-subtle)', marginBottom: 'var(--sp-3)' }} />
            <p className="ui-empty__text" style={{ marginBottom: 0 }}>
              Nenhum relatório disponível para este período.
            </p>
          </div>
        </div>
      )}
    </AppShell>
  );
}
