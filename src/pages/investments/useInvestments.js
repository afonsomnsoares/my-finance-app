import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrencySymbol } from '../../utils/format';
import { api } from '../../utils/api';
import { sumMoneyProducts } from '../../utils/money';
import { TYPES } from './constants';
import { calcDiversification, portfolioView } from './helpers';

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

  const homeCurrency = user?.currency || 'EUR';

  const { enriched, groups, excluded } = useMemo(
    () => portfolioView(investments, prices),
    [investments, prices]
  );
  const primary = groups.find((group) => group.currency === homeCurrency) || (groups.length === 1 ? groups[0] : null);
  const otherGroups = groups.filter((group) => group !== primary);
  const totalCost = primary?.cost || 0;
  const totalCurrent = primary?.current || 0;
  const totalPL = primary?.pl || 0;
  const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
  const hasLivePrices = Boolean(primary);
  const symbol = getCurrencySymbol(primary?.currency || homeCurrency);
  const goalProgress = goalTarget > 0 && primary?.currency === homeCurrency
    ? Math.min((totalCurrent / goalTarget) * 100, 100)
    : 0;

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
    const priced = enriched.filter((inv) => inv.comparable && inv.currency === (primary?.currency));
    const base = sumMoneyProducts(priced, 'amount', 'buyPrice');
    const byType = {};
    priced.forEach((inv) => {
      byType[inv.type] = (byType[inv.type] || 0) + inv.costValue;
    });
    if (base <= 0) return [];
    return Object.entries(byType)
      .map(([type, value]) => ({ name: TYPES.find(t => t.value === type)?.label || type, value: (value / base) * 100, type }))
      .sort((a, b) => b.value - a.value);
  }, [enriched, primary]);

  const bestPerformer = useMemo(() => {
    const pool = enriched.filter((row) => row.comparable && row.currency === (primary?.currency));
    if (pool.length === 0) return null;
    return pool.reduce((best, curr) => ((curr.pl ?? -Infinity) > (best.pl ?? -Infinity) ? curr : best), pool[0]);
  }, [enriched, primary]);

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

  const closeModal = useCallback(() => { setShowModal(false); resetForm(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        name: String(form.name || '').trim().toUpperCase(),
        amount: parseFloat(form.amount),
        buyPrice: parseFloat(form.buyPrice),
      };
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
    const symbol = String(item.symbol || '').toUpperCase();
    setSelectedSuggestion({ ...item, symbol });
    setForm((prev) => ({ ...prev, name: symbol, type: item.type }));
    setShowDropdown(false);
    setSearchResults([]);
    try {
      const { data } = await api.get(`/api/market/prices?symbols=${encodeURIComponent(symbol)}`);
      const quote = data?.[symbol] || data?.[item.symbol] || Object.values(data || {})[0];
      if (!quote?.price) return;
      const currency = ['EUR', 'USD', 'GBP'].includes(quote.currency) ? quote.currency : undefined;
      setForm((prev) => ({
        ...prev,
        name: symbol,
        type: item.type,
        buyPrice: String(quote.price),
        ...(currency ? { currency } : {}),
      }));
    } catch {}
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
    otherGroups, excluded, primaryCurrency: primary?.currency || homeCurrency,
    hasLivePrices, goalProgress, enriched, filtered, sorted, pieData, bestPerformer,
    diversification, openAdd, openEdit, closeModal, handleSubmit, handleDelete,
    handleSelectSuggestion, handleGoalChange, fetchInvestments, refreshPrices,
  };
}
