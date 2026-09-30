import { FiArrowDown, FiArrowUp, FiMinus } from 'react-icons/fi';
import { formatMoney, formatPercent } from '../../utils/format';

/*
 * O número que responde à pergunta com que se abre a app: quanto gastei este
 * mês, e isso é muito ou pouco?
 *
 * Antes, essa resposta estava repartida por três cartões iguais ("Despesas
 * este Mês", "Orçamento Mensal", "Orçamento Restante") mais um quarto nos
 * Insights. Aqui é um valor, uma barra e uma comparação — e o resto do ecrã
 * passa a ser contexto para isto, em vez de concorrência.
 */
export default function SpendingHero({
  spent, budget, symbol, trend, balance, avgDaily, transactionCount, healthScore,
}) {
  const percent = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const over = budget > 0 && spent > budget;

  const fillClass = !budget ? 'ui-progress__fill'
    : over ? 'ui-progress__fill ui-progress__fill--over'
    : percent >= 85 ? 'ui-progress__fill ui-progress__fill--near'
    : 'ui-progress__fill ui-progress__fill--good';

  /*
   * Acima do orçamento a barra é dividida: a parte até ao limite fica a cheio
   * e o excesso fica listado. Antes, 101% e 140% desenhavam-se exatamente
   * igual — a barra cheia — e a única pista de que se tinha passado a linha
   * era o texto por baixo.
   */
  const overShare = over ? Math.min(((spent - budget) / spent) * 100, 60) : 0;

  const TrendIcon = trend.direction === 'up' ? FiArrowUp
    : trend.direction === 'down' ? FiArrowDown : FiMinus;

  return (
    <div className="ui-card">
      <span className="ui-eyebrow">Gasto este mês</span>

      <p className="ui-hero__value">{formatMoney(spent, symbol)}</p>

      <div className="ui-hero__meta">
        {budget > 0 && (
          <span>
            de <strong style={{ color: 'var(--text)' }}>{formatMoney(budget, symbol)}</strong> de orçamento
          </span>
        )}
        {/* O ícone e o sinal dizem a direção; a cor só reforça. */}
        <span className={`ui-delta ui-delta--${trend.direction === 'neutral' ? 'flat' : trend.direction}`}>
          <TrendIcon size={12} aria-hidden="true" />
          {formatPercent(Math.abs(trend.percent))} vs. mês anterior
        </span>
      </div>

      {budget > 0 && (
        <div style={{ marginTop: 'var(--sp-4)' }}>
          <div
            className={`ui-progress${over ? ' ui-progress--over' : ''}`}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={Math.max(percent, 100)}
            aria-label={`${percent}% do orçamento mensal utilizado`}
          >
            <div className={fillClass} style={{ width: over ? '100%' : `${percent}%` }} />
            {over && <div className="ui-progress__over" style={{ width: `${overShare}%` }} />}
            {over && <div className="ui-progress__limit" style={{ right: `${overShare}%` }} />}
          </div>
          <p style={{
            margin: 'var(--sp-2) 0 0',
            fontSize: 'var(--fs-xs)',
            color: over ? 'var(--danger)' : 'var(--text-muted)',
          }}>
            {over
              ? `${formatMoney(spent - budget, symbol)} acima do orçamento (${percent}%)`
              : `${formatMoney(budget - spent, symbol)} disponíveis · ${percent}% utilizado`}
          </p>
        </div>
      )}

      {/* Métricas de apoio: filetes em vez de quatro cartões, porque são
          contexto para o número acima e não quatro factos independentes. */}
      <div className="ui-metrics">
        <div>
          <span className="ui-metric__label">Saldo</span>
          <span className="ui-metric__value" style={{ color: balance >= 0 ? 'var(--text)' : 'var(--danger)' }}>
            {formatMoney(balance, symbol)}
          </span>
          <span className="ui-metric__hint">após despesas</span>
        </div>
        <div>
          <span className="ui-metric__label">Média diária</span>
          <span className="ui-metric__value">{formatMoney(avgDaily, symbol)}</span>
          <span className="ui-metric__hint">{transactionCount} transações</span>
        </div>
        <div>
          {/* Chamava-se "Saúde financeira", mas 8 dos 9 critérios verificam se
              os campos do perfil estão preenchidos — só um olha para o que foi
              gasto. O nome prometia uma avaliação das finanças que o cálculo
              não faz. */}
          <span className="ui-metric__label">Perfil preenchido</span>
          <span className="ui-metric__value">{formatPercent(healthScore)}</span>
          <span className="ui-metric__hint">{healthLabel(healthScore)}</span>
        </div>
      </div>
    </div>
  );
}

function healthLabel(score) {
  if (score >= 90) return 'Completo';
  if (score >= 60) return 'Quase completo';
  if (score >= 40) return 'Faltam dados';
  return 'Preenche o perfil';
}
