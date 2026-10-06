import React, { useState } from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Edit2,
  Check,
  X,
  ShieldAlert,
  Wallet,
  Sliders,
  Sparkles
} from 'lucide-react';
import { Affiliate, AffiliateCommission, AffiliatePayout, AffiliateSettings } from '../types';
import { Lang, formatPrice } from '../services/i18n';

interface AdminAffiliatesPanelProps {
  lang: Lang;
  affiliates: Affiliate[];
  commissions: AffiliateCommission[];
  payouts: AffiliatePayout[];
  settings: AffiliateSettings;
  adminRole: 'owner' | 'manager';
  onReload: () => void;
}

export const AdminAffiliatesPanel: React.FC<AdminAffiliatesPanelProps> = ({
  lang,
  affiliates,
  commissions,
  payouts,
  settings,
  adminRole,
  onReload
}) => {
  const [subTab, setSubTab] = useState<'affiliates' | 'commissions' | 'payouts' | 'settings'>('affiliates');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editingRateValue, setEditingRateValue] = useState<number>(7);

  // Settings form states
  const [globalRate, setGlobalRate] = useState<number>(settings.globalDefaultRate || 7);
  const [validationDays, setValidationDays] = useState<number>(settings.validationDelayDays || 7);
  const [minWithdraw, setMinWithdraw] = useState<number>(settings.minWithdrawalAmount || 5000);
  const [allowSelfRef, setAllowSelfRef] = useState<boolean>(!!settings.allowSelfReferral);

  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Summary Metrics
  const totalAffiliatesCount = affiliates.length;
  const totalAffiliateSalesVolume = affiliates.reduce((sum, a) => sum + (a.totalSalesAmount || 0), 0);
  const totalCommissionsEarned = affiliates.reduce((sum, a) => sum + (a.totalCommissionEarned || 0), 0);
  const pendingPayoutsCount = payouts.filter((p) => p.status === 'pending').length;

  // Filtered lists
  const filteredAffiliates = affiliates.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.phone.includes(q)
    );
  });

  const filteredCommissions = commissions.filter((c) => {
    const q = searchQuery.toLowerCase();
    return c.orderId.toLowerCase().includes(q) || c.affiliateCode.toLowerCase().includes(q);
  });

  // Action: Update Affiliate Commission Rate
  const handleSaveAffiliateRate = async (affiliateId: string) => {
    setIsProcessing(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch(`/api/admin/affiliates/${affiliateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionRate: editingRateValue })
      });

      const data = await res.json();
      setIsProcessing(false);

      if (res.ok && data.status === 'success') {
        setEditingRateId(null);
        setActionSuccess(`Taux de commission mis à jour avec succès (${editingRateValue}%).`);
        onReload();
      } else {
        setActionError(data.message || 'Erreur lors de la modification du taux.');
      }
    } catch {
      setIsProcessing(false);
      setActionError('Erreur de connexion avec le serveur.');
    }
  };

  // Action: Toggle Affiliate Status (active / suspended)
  const handleToggleAffiliateStatus = async (affiliate: Affiliate) => {
    const nextStatus = affiliate.status === 'active' ? 'suspended' : 'active';
    setIsProcessing(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch(`/api/admin/affiliates/${affiliate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      const data = await res.json();
      setIsProcessing(false);

      if (res.ok && data.status === 'success') {
        setActionSuccess(`Statut de l'affilié ${affiliate.code} passé à : ${nextStatus}.`);
        onReload();
      } else {
        setActionError(data.message || 'Erreur lors de la modification du statut.');
      }
    } catch {
      setIsProcessing(false);
      setActionError('Erreur réseau.');
    }
  };

  // Action: Change Commission Status (pending / approved / paid / cancelled)
  const handleChangeCommissionStatus = async (
    commissionId: string,
    newStatus: 'pending' | 'approved' | 'paid' | 'cancelled'
  ) => {
    setIsProcessing(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch(`/api/admin/affiliates/commissions/${commissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      setIsProcessing(false);

      if (res.ok && data.status === 'success') {
        setActionSuccess(`Commission ${commissionId} passée au statut : ${newStatus}.`);
        onReload();
      } else {
        setActionError(data.message || 'Impossible de mettre à jour le statut.');
      }
    } catch {
      setIsProcessing(false);
      setActionError('Erreur réseau.');
    }
  };

  // Action: Process Payout (completed or rejected)
  const handleProcessPayout = async (payoutId: string, status: 'completed' | 'rejected') => {
    setIsProcessing(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch(`/api/admin/affiliates/payouts/${payoutId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes: status === 'completed' ? 'Virement Mobile Money effectué.' : 'Demande rejetée par l’administrateur.'
        })
      });

      const data = await res.json();
      setIsProcessing(false);

      if (res.ok && data.status === 'success') {
        setActionSuccess(
          status === 'completed'
            ? 'Retrait validé et marqué comme payé !'
            : 'Retrait rejeté et solde remboursé à l’affilié.'
        );
        onReload();
      } else {
        setActionError(data.message || 'Erreur lors du traitement du retrait.');
      }
    } catch {
      setIsProcessing(false);
      setActionError('Erreur réseau.');
    }
  };

  // Action: Save Global Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await fetch('/api/admin/affiliates/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          globalDefaultRate: Number(globalRate),
          validationDelayDays: Number(validationDays),
          minWithdrawalAmount: Number(minWithdraw),
          allowSelfReferral: allowSelfRef
        })
      });

      const data = await res.json();
      setIsProcessing(false);

      if (res.ok && data.status === 'success') {
        setActionSuccess('Paramètres d’affiliation enregistrés avec succès.');
        onReload();
      } else {
        setActionError(data.message || 'Erreur lors de l’enregistrement des paramètres.');
      }
    } catch {
      setIsProcessing(false);
      setActionError('Erreur de communication avec le serveur.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-left text-[#1D1D1F]">
      {/* SUMMARY OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl text-[#1D1D1F] border border-[#AAAAAA]/30 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#6E6E73]">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Affiliés Partenaires</span>
            <Users size={16} className="text-[#007AFF]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#1D1D1F] tabular-nums">{totalAffiliatesCount}</div>
          <span className="text-[10px] text-[#6E6E73] block">Inscrits actifs</span>
        </div>

        <div className="bg-white p-4 rounded-2xl text-[#1D1D1F] border border-[#AAAAAA]/30 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#6E6E73]">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Ventes Partenaires</span>
            <TrendingUp size={16} className="text-[#007AFF]" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-[#007AFF] tabular-nums">
            {formatPrice(totalAffiliateSalesVolume)}
          </div>
          <span className="text-[10px] text-[#6E6E73] block">Chiffre d'affaires apporté</span>
        </div>

        <div className="bg-white p-4 rounded-2xl text-[#1D1D1F] border border-[#AAAAAA]/30 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#6E6E73]">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Commissions Générées</span>
            <DollarSign size={16} className="text-[#34C759]" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-[#34C759] tabular-nums">
            {formatPrice(totalCommissionsEarned)}
          </div>
          <span className="text-[10px] text-[#6E6E73] block">Gains cumulés</span>
        </div>

        <div className="bg-white p-4 rounded-2xl text-[#1D1D1F] border border-[#AAAAAA]/30 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#6E6E73]">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Retraits en Attente</span>
            <Wallet size={16} className="text-[#FF9500]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#FF9500] tabular-nums">{pendingPayoutsCount}</div>
          <span className="text-[10px] text-[#6E6E73] block">Demandes à traiter</span>
        </div>
      </div>

      {/* SUCCESS / ERROR NOTICES */}
      {actionSuccess && (
        <div className="p-3.5 bg-[#34C759]/15 border border-[#34C759]/30 text-[#34C759] rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-[#FF3B30]/15 border border-[#FF3B30]/30 text-[#FF3B30] rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      {/* SUB-TABS & SEARCH */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'affiliates', label: `Affiliés (${affiliates.length})`, icon: Users },
            { id: 'commissions', label: `Commissions (${commissions.length})`, icon: DollarSign },
            { id: 'payouts', label: `Retraits (${payouts.length})`, icon: Wallet },
            { id: 'settings', label: 'Paramètres', icon: Sliders }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id as any)}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[#007AFF] text-white shadow-xs'
                    : 'bg-white border border-[#AAAAAA]/30 text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {subTab !== 'settings' && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E6E73]" size={14} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-[#1D1D1F] placeholder:text-[#6E6E73] text-xs px-3.5 py-2 pl-9 rounded-full border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
            />
          </div>
        )}
      </div>

      {/* 1. AFFILIATES TAB */}
      {subTab === 'affiliates' && (
        <div className="bg-white rounded-[28px] p-5 sm:p-6 space-y-4 text-[#1D1D1F] border border-[#AAAAAA]/30 shadow-xs">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-black uppercase tracking-tight text-[#1D1D1F]">
              Liste des Partenaires Inscrits
            </h4>
            <span className="text-xs text-[#6E6E73] font-semibold">{filteredAffiliates.length} affilié(s)</span>
          </div>

          {filteredAffiliates.length === 0 ? (
            <div className="text-center py-8 text-[#6E6E73] text-xs font-semibold">
              Aucun affilié trouvé.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#AAAAAA]/20 text-[10px] text-[#6E6E73] uppercase font-black">
                    <th className="pb-2">Affilié</th>
                    <th className="pb-2">Code & Contact</th>
                    <th className="pb-2">Taux %</th>
                    <th className="pb-2">Clics / Ventes</th>
                    <th className="pb-2">Solde Retirable</th>
                    <th className="pb-2">Statut</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#AAAAAA]/15 font-medium">
                  {filteredAffiliates.map((aff) => {
                    const isEditingRate = editingRateId === aff.id;
                    return (
                      <tr key={aff.id} className="hover:bg-[#F5F5F7] transition-colors">
                        <td className="py-3.5">
                          <span className="font-extrabold text-[#1D1D1F] block">{aff.name}</span>
                          <span className="text-[10px] text-[#6E6E73]">{aff.email}</span>
                        </td>

                        <td className="py-3.5">
                          <span className="font-mono font-black text-[#007AFF] bg-[#007AFF]/10 px-2.5 py-1 rounded-full text-[11px]">
                            {aff.code}
                          </span>
                          <span className="text-[10px] text-[#6E6E73] block mt-1 font-mono">{aff.phone}</span>
                        </td>

                        <td className="py-3.5">
                          {isEditingRate ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={1}
                                max={50}
                                value={editingRateValue}
                                onChange={(e) => setEditingRateValue(Number(e.target.value))}
                                className="w-16 bg-[#F5F5F7] text-[#1D1D1F] rounded-full px-2.5 py-1 text-xs font-bold border border-[#AAAAAA]/30 focus:border-[#007AFF]"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveAffiliateRate(aff.id)}
                                className="p-1.5 bg-[#007AFF] text-white rounded-full cursor-pointer hover:bg-[#0071EB]"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingRateId(null)}
                                className="p-1.5 bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F] rounded-full cursor-pointer"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-[#007AFF] text-xs">
                                {aff.commissionRate || settings.globalDefaultRate || 7}%
                              </span>
                              {adminRole === 'owner' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRateId(aff.id);
                                    setEditingRateValue(aff.commissionRate || 7);
                                  }}
                                  className="text-[#6E6E73] hover:text-[#1D1D1F] p-0.5 cursor-pointer"
                                  title="Modifier le taux personnalisé"
                                >
                                  <Edit2 size={12} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5">
                          <span className="font-mono text-[#1D1D1F] block">
                            {aff.clicksCount || 0} clics • <strong className="text-[#1D1D1F]">{aff.salesCount || 0}</strong> ventes
                          </span>
                          <span className="text-[10px] text-[#6E6E73] font-mono">
                            {formatPrice(aff.totalSalesAmount || 0)} CA
                          </span>
                        </td>

                        <td className="py-3.5">
                          <span className="font-mono font-extrabold text-[#34C759] block">
                            {formatPrice(aff.availableBalance || 0)}
                          </span>
                          <span className="text-[10px] text-[#6E6E73] font-mono">
                            Attente : {formatPrice(aff.pendingBalance || 0)}
                          </span>
                        </td>

                        <td className="py-3.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              aff.status === 'active'
                                ? 'bg-[#34C759]/15 text-[#34C759]'
                                : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                            }`}
                          >
                            {aff.status === 'active' ? 'Actif' : 'Suspendu'}
                          </span>
                        </td>

                        <td className="py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleToggleAffiliateStatus(aff)}
                            className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full cursor-pointer transition-colors ${
                              aff.status === 'active'
                                ? 'bg-[#FF3B30]/15 text-[#FF3B30] hover:bg-[#FF3B30]/25'
                                : 'bg-[#34C759]/15 text-[#34C759] hover:bg-[#34C759]/25'
                            }`}
                          >
                            {aff.status === 'active' ? 'Suspendre' : 'Réactiver'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. COMMISSIONS TAB */}
      {subTab === 'commissions' && (
        <div className="bg-white rounded-[28px] p-5 sm:p-6 space-y-4 text-[#1D1D1F] border border-[#AAAAAA]/30 shadow-xs">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-black uppercase tracking-tight text-[#1D1D1F]">
              Attributions de Commissions
            </h4>
            <span className="text-xs text-[#6E6E73] font-semibold">{filteredCommissions.length} commission(s)</span>
          </div>

          {filteredCommissions.length === 0 ? (
            <div className="text-center py-8 text-[#6E6E73] text-xs font-semibold">
              Aucune commission pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#AAAAAA]/20 text-[10px] text-[#6E6E73] uppercase font-black">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Commande</th>
                    <th className="pb-2">Affilié</th>
                    <th className="pb-2">Montant</th>
                    <th className="pb-2">Taux %</th>
                    <th className="pb-2">Commission</th>
                    <th className="pb-2">Statut</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#AAAAAA]/15 font-medium">
                  {filteredCommissions.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F5F5F7] transition-colors">
                      <td className="py-3 text-[#6E6E73] text-[11px]">
                        {new Date(c.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short'
                        })}
                      </td>

                      <td className="py-3 font-mono font-bold text-[#1D1D1F]">{c.orderId}</td>

                      <td className="py-3">
                        <span className="font-bold text-[#007AFF] block">{c.affiliateCode}</span>
                        <span className="text-[10px] text-[#6E6E73]">{c.customerPhone}</span>
                      </td>

                      <td className="py-3 font-mono text-[#1D1D1F]">{formatPrice(c.orderTotal)}</td>

                      <td className="py-3 font-bold text-[#007AFF]">
                        {c.rateApplied}% <span className="text-[9px] text-[#6E6E73] font-normal">({c.rateSource})</span>
                      </td>

                      <td className="py-3 font-mono font-black text-[#1D1D1F]">{formatPrice(c.commissionAmount)}</td>

                      <td className="py-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            c.status === 'approved'
                              ? 'bg-[#34C759]/15 text-[#34C759]'
                              : c.status === 'paid'
                              ? 'bg-[#007AFF]/15 text-[#007AFF]'
                              : c.status === 'pending'
                              ? 'bg-[#FF9500]/15 text-[#FF9500]'
                              : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                          }`}
                        >
                          {c.status === 'approved'
                            ? 'Validée'
                            : c.status === 'paid'
                            ? 'Payée'
                            : c.status === 'pending'
                            ? 'En attente'
                            : 'Annulée'}
                        </span>
                      </td>

                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {c.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleChangeCommissionStatus(c.id, 'approved')}
                              className="px-2.5 py-1 bg-[#34C759]/15 text-[#34C759] hover:bg-[#34C759]/25 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer"
                            >
                              Valider
                            </button>
                          )}
                          {c.status === 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleChangeCommissionStatus(c.id, 'paid')}
                              className="px-2.5 py-1 bg-[#007AFF]/15 text-[#007AFF] hover:bg-[#007AFF]/25 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer"
                            >
                              Payer
                            </button>
                          )}
                          {c.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => handleChangeCommissionStatus(c.id, 'cancelled')}
                              className="px-2.5 py-1 bg-[#FF3B30]/15 text-[#FF3B30] hover:bg-[#FF3B30]/25 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer"
                            >
                              Annuler
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. PAYOUTS TAB */}
      {subTab === 'payouts' && (
        <div className="bg-white rounded-[28px] p-5 sm:p-6 space-y-4 text-[#1D1D1F] border border-[#AAAAAA]/30 shadow-xs">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-black uppercase tracking-tight text-[#1D1D1F]">
              Demandes de Retrait Mobile Money
            </h4>
            <span className="text-xs text-[#6E6E73] font-semibold">{payouts.length} demande(s)</span>
          </div>

          {payouts.length === 0 ? (
            <div className="text-center py-8 text-[#6E6E73] text-xs font-semibold">
              Aucune demande de retrait effectuée.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#AAAAAA]/20 text-[10px] text-[#6E6E73] uppercase font-black">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Affilié</th>
                    <th className="pb-2">Montant</th>
                    <th className="pb-2">Réseau & Téléphone</th>
                    <th className="pb-2">Statut</th>
                    <th className="pb-2 text-right">Traitement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#AAAAAA]/15 font-medium">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F5F5F7] transition-colors">
                      <td className="py-3.5 text-[#6E6E73] text-[11px]">
                        {new Date(p.requestedAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      <td className="py-3.5">
                        <span className="font-extrabold text-[#1D1D1F] block">{p.affiliateName}</span>
                        <span className="font-mono text-[10px] text-[#007AFF]">{p.affiliateCode}</span>
                      </td>

                      <td className="py-3.5 font-mono font-black text-[#1D1D1F] text-sm">
                        {formatPrice(p.amount)}
                      </td>

                      <td className="py-3.5">
                        <span className="font-bold text-[#1D1D1F] block">{p.payoutNetwork}</span>
                        <span className="text-[#6E6E73] font-mono text-[11px]">{p.payoutPhone}</span>
                      </td>

                      <td className="py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            p.status === 'completed'
                              ? 'bg-[#34C759]/15 text-[#34C759]'
                              : p.status === 'pending'
                              ? 'bg-[#FF9500]/15 text-[#FF9500]'
                              : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                          }`}
                        >
                          {p.status === 'completed'
                            ? 'Effectué'
                            : p.status === 'pending'
                            ? 'En attente'
                            : 'Rejeté'}
                        </span>
                      </td>

                      <td className="py-3.5 text-right">
                        {p.status === 'pending' ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleProcessPayout(p.id, 'completed')}
                              className="px-3.5 py-1.5 bg-[#007AFF] hover:bg-[#0071EB] text-white font-semibold text-[10px] uppercase tracking-wider rounded-full cursor-pointer transition-colors"
                            >
                              Valider & Payer
                            </button>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleProcessPayout(p.id, 'rejected')}
                              className="px-3.5 py-1.5 bg-[#FF3B30]/15 hover:bg-[#FF3B30]/25 text-[#FF3B30] font-semibold text-[10px] uppercase tracking-wider rounded-full cursor-pointer transition-colors"
                            >
                              Rejeter
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#6E6E73] italic">Traité</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. SETTINGS TAB */}
      {subTab === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-white rounded-[28px] p-6 space-y-5 max-w-xl text-[#1D1D1F] border border-[#AAAAAA]/30 shadow-xs"
        >
          <div className="space-y-1">
            <h4 className="text-sm font-black uppercase tracking-tight text-[#1D1D1F]">
              Paramètres Globaux d'Affiliation
            </h4>
            <p className="text-xs text-[#6E6E73]">
              Configurez le taux par défaut, le délai de rétention anti-annulation et le seuil de retrait.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Taux de Commission Global par Défaut (%)</label>
              <input
                type="number"
                min={1}
                max={50}
                value={globalRate}
                onChange={(e) => setGlobalRate(Number(e.target.value))}
                className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-sm font-bold px-4 py-3 rounded-full border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
              />
              <span className="text-[10px] text-[#6E6E73] block">
                Appliqué si l'affilié ou le produit ne possède pas de taux spécifique.
              </span>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Délai de Validation Automatique (Jours)</label>
              <input
                type="number"
                min={0}
                max={60}
                value={validationDays}
                onChange={(e) => setValidationDays(Number(e.target.value))}
                className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-sm font-bold px-4 py-3 rounded-full border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
              />
              <span className="text-[10px] text-[#6E6E73] block">
                Nombre de jours après livraison avant qu'une commission devienne retirable.
              </span>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Montant Minimum de Retrait (FCFA)</label>
              <input
                type="number"
                min={1000}
                step={500}
                value={minWithdraw}
                onChange={(e) => setMinWithdraw(Number(e.target.value))}
                className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-sm font-bold px-4 py-3 rounded-full border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="allowSelfRef"
                checked={allowSelfRef}
                onChange={(e) => setAllowSelfRef(e.target.checked)}
                className="w-4 h-4 accent-[#007AFF] rounded-md border-none"
              />
              <label htmlFor="allowSelfRef" className="text-xs font-semibold text-[#1D1D1F] cursor-pointer">
                Autoriser l'auto-parrainage (Désactivé par défaut pour éviter les abus)
              </label>
            </div>

            <button
              type="submit"
              disabled={isProcessing || adminRole !== 'owner'}
              className="w-full py-3.5 bg-[#007AFF] hover:bg-[#0071EB] disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded-full transition-colors cursor-pointer"
            >
              {isProcessing ? 'Enregistrement...' : 'Enregistrer les Paramètres'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
