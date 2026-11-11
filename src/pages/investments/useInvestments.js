import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrencySymbol } from '../../utils/format';
import { api } from '../../utils/api';
import { TYPES } from './constants';
import { calcDiversification } from './helpers';

/**
 * Owns every piece of state, data fetching and derived value for the
 * Investments page: the portfolio itself, live prices, ticker search,
 * sorting/filtering, and the add/edit modal.
 */
export function useInvestments() {
  const [investments, setInvestments] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [sortBy, setSortBy] = useState('pl');
  const [searchTerm, setSearchTerm] = useState('');
  const [goalTarget, setGoalTarget] = useState(() => {
    const saved = localStorage.getItem('pf_invest_goal');
    return saved ? parseFloat(saved) : 0;
  });
  const [form, setForm] = useState({ name: '', type: 'stock', amount: '', buyPrice: '', currency: 'EUR' });
  const [error, setError] = useState('');
  const [priceError, setPriceError] = useState('');
  const [prices, setPrices] = useState({});
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  const fetchPrices = useCallback(async (names) => {
    if (names.length === 0) return;
    try {
      setPriceError('');
      const { data } = await api.get(`/api/market/prices?symbols=${names.join(',')}`);
      setPrices(data);
    } catch {
      setPriceError('Não foi possível atualizar preços ao vivo.');
    }
  }, []);

  const fetchInvestments = useCallback(async () => {
    try {
      const [invRes, userRes] = await Promise.all([
        api.get('/api/investments'),
        api.get('/api/me'),
      ]);
      setInvestments(invRes.data);
      setUser(userRes.data);
      const symbols = invRes.data.map(i => i.name).filter(Boolean);
      fetchPrices(symbols);
    } catch {
      setError('Erro ao carregar investimentos.');
    } finally {
      setLoading(false);
    }
  }, [fetchPrices]);

  useEffect(() => { fetchInvestments(); }, [fetchInvestments]);

  useEffect(() => {
    const interval = setInterval(() => {
      const symbols = investments.map(i => i.name).filter(Boolean);
      if (symbols.length > 0) fetchPrices(symbols);
    }, 60000);
    return () => clearInterval(interval);
  }, [investments, fetchPrices]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
        resetForm();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal]);

  useEffect(() => {
    if (!showModal || !form.name || form.name.length < 1 || selectedSuggestion) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    setShowDropdown(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/api/market/search?q=${encodeURIComponent(form.name)}`);
        setSearchResults(data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => { clearTimeout(timer); setSearching(false); };
  }, [form.name, showModal, selectedSuggestion]);

  const symbol = getCurrencySymbol(user?.currency || 'EUR');

  const totalCost = useMemo(() => investments.reduce((s, i) => s + i.amount * i.buyPrice, 0), [investments]);
  const totalCurrent = useMemo(() => investments.reduce((s, i) => {
    const q = prices[i.name];
    return s + (q?.price ? i.amount * q.price : 0);
  }, 0), [investments, prices]);
  const totalPL = totalCurrent - totalCost;
  const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
  const hasLivePrices = investments.some(i => prices[i.name]);
  const goalProgress = goalTarget > 0 ? Math.min((totalCurrent / goalTarget) * 100, 100) : 0;

  const enriched = useMemo(() => {
    return investments.map(inv => {
      const quote = prices[inv.name];
      const currentPrice = quote?.price;
      const currentValue = currentPrice ? inv.amount * currentPrice : null;
      const costValue = inv.amount * inv.buyPrice;
      const pl = currentValue ? currentValue - costValue : null;
      const plPercent = pl && costValue > 0 ? (pl / costValue) * 100 : null;
      const allocation = totalCost > 0 ? (costValue / totalCost) * 100 : 0;
      const dailyChange = quote?.changePercent;
      return { ...inv, currentPrice, currentValue, costValue, pl, plPercent, allocation, dailyChange };
    });
  }, [investments, prices, totalCost]);

  const filtered = useMemo(() => {
    if (!searchTerm) return enriched;
    const term = searchTerm.toLowerCase();
    return enriched.filter(inv => inv.name.toLowerCase().includes(term));
  }, [enriched, searchTerm]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sortBy) {
      case 'name': return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'pl': return list.sort((a, b) => (b.pl ?? -Infinity) - (a.pl ?? -Infinity));
      case 'plAsc': return list.sort((a, b) => (a.pl ?? Infinity) - (b.pl ?? Infinity));
      case 'allocation': return list.sort((a, b) => b.allocation - a.allocation);
      case 'daily': return list.sort((a, b) => (b.dailyChange ?? -Infinity) - (a.dailyChange ?? -Infinity));
      default: return list;
    }
  }, [filtered, sortBy]);

  const pieData = useMemo(() => {
    const byType = {};
    enriched.forEach(inv => {
      byType[inv.type] = (byType[inv.type] || 0) + inv.costValue;
    });
    return Object.entries(byType)
      .map(([type, value]) => ({ name: TYPES.find(t => t.value === type)?.label || type, value: (value / totalCost) * 100, type }))
      .sort((a, b) => b.value - a.value);
  }, [enriched, totalCost]);

  const bestPerformer = useMemo(() => {
    if (enriched.length === 0) return null;
    return enriched.reduce((best, curr) => (curr.pl ?? -Infinity) > (best.pl ?? -Infinity) ? curr : best, enriched[0]);
  }, [enriched]);

  const diversification = useMemo(() => calcDiversification(enriched), [enriched]);

  function resetForm() {
    setForm({ name: '', type: 'stock', amount: '', buyPrice: '', currency: 'EUR' });
    setEditing(null);
    setSearchResults([]);
    setShowDropdown(false);
    setSelectedSuggestion(null);
  }

  const openAdd = () => { resetForm(); setShowModal(true); };
  const openEdit = (inv) => {
    setForm({ name: inv.name, type: inv.type, amount: String(inv.amount), buyPrice: String(inv.buyPrice), currency: inv.currency });
    setEditing(inv);
    setSelectedSuggestion({ symbol: inv.name, type: inv.type });
    setShowModal(true);
  };

  // useCallback por higiene: o Modal já não depende da identidade desta
  // função, mas uma identidade estável evita re-renders desnecessários.
  const closeModal = useCallback(() => { setShowModal(false); resetForm(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, amount: parseFloat(form.amount), buyPrice: parseFloat(form.buyPrice) };
      let next;
      if (editing) {
        const { data } = await api.put(`/api/investments/${editing.id}`, payload);
        next = investments.map((i) => (i.id === data.id ? data : i));
      } else {
        const { data } = await api.post('/api/investments', payload);
        next = [data, ...investments];
      }
      setInvestments(next);
      fetchPrices(next.map((i) => i.name).filter(Boolean));
      setShowModal(false);
      resetForm();
    } catch {
      setError(editing ? 'Erro ao atualizar.' : 'Erro ao criar.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apagar este investimento?')) return;
    try {
      await api.delete(`/api/investments/${id}`);
      setInvestments(investments.filter((i) => i.id !== id));
    } catch {
      setError('Erro ao apagar.');
    }
  };

  const handleSelectSuggestion = async (item) => {
    setSelectedSuggestion(item);
    setForm(prev => ({ ...prev, name: item.symbol, type: item.type }));
    setShowDropdown(false);
    setSearchResults([]);
    try {
      const { data } = await api.get(`/api/market/prices?symbols=${item.symbol}`);
      const quote = data?.[item.symbol];
      if (quote?.price) {
        setForm(prev => ({ ...prev, name: item.symbol, type: item.type, buyPrice: String(quote.price) }));
      }
    } catch { /* optional prefill fails silently */ }
  };

  const handleGoalChange = (val) => {
    const n = parseFloat(val) || 0;
    setGoalTarget(n);
    localStorage.setItem('pf_invest_goal', String(n));
  };

  const refreshPrices = () => {
    const symbols = investments.map(i => i.name).filter(Boolean);
    fetchPrices(symbols);
  };

  return {
    investments, user, loading, showModal, editing, sortBy, setSortBy,
    searchTerm, setSearchTerm, goalTarget, form, setForm, error, priceError,
    searchResults, searching, showDropdown, setShowDropdown, selectedSuggestion,
    setSelectedSuggestion, symbol, totalCost, totalCurrent, totalPL, totalPLPercent,
    hasLivePrices, goalProgress, enriched, filtered, sorted, pieData, bestPerformer,
    diversification, openAdd, openEdit, closeModal, handleSubmit, handleDelete,
    handleSelectSuggestion, handleGoalChange, fetchInvestments, refreshPrices,
  };
}
