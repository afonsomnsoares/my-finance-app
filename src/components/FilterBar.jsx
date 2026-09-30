import { FiSearch } from 'react-icons/fi';
import { PERIOD_PRESETS } from '../utils/api';
import { Field } from './ui';

/*
 * Filtros numa linha, sempre visíveis.
 *
 * Antes era um cartão com título "Filtros", ícone próprio e um botão para
 * colapsar no telemóvel — um cartão inteiro de cromo à volta de três selects.
 * Os controlos são a interface; não precisam de moldura.
 */
export default function FilterBar({
  preset, onPresetChange,
  customFrom, customTo, onCustomFromChange, onCustomToChange,
  category, onCategoryChange, categories, showCategory = true,
  searchTerm, onSearchChange,
}) {
  return (
    <div className="filterbar">
      <Field label="Período" as="select" value={preset} onChange={(e) => onPresetChange(e.target.value)}>
        {PERIOD_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </Field>

      {preset === 'custom' && (
        <>
          <Field label="De" type="date" value={customFrom} onChange={(e) => onCustomFromChange(e.target.value)} />
          <Field label="Até" type="date" value={customTo} onChange={(e) => onCustomToChange(e.target.value)} />
        </>
      )}

      {showCategory && (
        <Field label="Categoria" as="select" value={category} onChange={(e) => onCategoryChange(e.target.value)}>
          <option value="">Todas</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Field>
      )}

      {onSearchChange && (
        <Field
          label="Pesquisar"
          type="search"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Descrição…"
        />
      )}
    </div>
  );
}
