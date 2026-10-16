import React, { useState } from 'react';
import { Search, Plus, Filter, UserCheck, ShieldAlert, Phone, Mail, Calendar, MapPin, Home, IndianRupee, MessageSquare } from 'lucide-react';
import { Lead, api } from '../services/api';

interface LeadsViewProps {
  leads: Lead[];
  onRefresh: () => void;
  onOpenVoiceWithLead: (lead: Lead) => void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({ leads, onRefresh, onOpenVoiceWithLead }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New lead form state
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'Website Inbound',
    preferredLanguage: 'en',
    status: 'NEW',
    notes: '',
    contactConsent: true,
    doNotCall: false,
    propertyType: 'Apartment',
    transactionType: 'BUY',
    location: '',
    bedrooms: 3,
    budgetMax: 15000000,
    timeline: '1-3 months',
  });

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createLead({
        name: newLead.name,
        phone: newLead.phone,
        email: newLead.email || undefined,
        source: newLead.source,
        preferredLanguage: newLead.preferredLanguage,
        status: newLead.status,
        notes: newLead.notes,
        contactConsent: newLead.contactConsent,
        doNotCall: newLead.doNotCall,
        requirements: {
          propertyType: newLead.propertyType,
          transactionType: newLead.transactionType,
          location: newLead.location,
          bedrooms: Number(newLead.bedrooms),
          budgetMax: Number(newLead.budgetMax),
          timeline: newLead.timeline,
        },
      });
      setIsCreateOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(`Error creating lead: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDnc = async (lead: Lead) => {
    try {
      const updated = await api.updateLead(lead.id, {
        doNotCall: !lead.doNotCall,
        contactConsent: lead.doNotCall ? true : false,
      });
      setSelectedLead(updated);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to update DNC status: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leads & Prospects</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-estate buyer and tenant pipeline with qualifications and contact rules.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 rounded-lg text-sm font-medium transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Lead</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="UNQUALIFIED">Unqualified</option>
            <option value="LOST">Lost</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Lead Name</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Requirement</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Consent / DNC</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map((lead) => {
                const req = lead.requirements;
                return (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-slate-50/70 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div>{lead.name}</div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        Lang: {lead.preferredLanguage.toUpperCase()} • {lead.source}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <div className="font-mono">{lead.phone}</div>
                      {lead.email && <div className="text-slate-400 text-[11px]">{lead.email}</div>}
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      {req ? (
                        <div>
                          <span className="font-medium text-slate-800">
                            {req.bedrooms ? `${req.bedrooms} BHK ` : ''}
                            {req.propertyType || 'Residential'} ({req.transactionType})
                          </span>
                          <div className="text-[11px] text-slate-500">
                            {req.location || 'Bangalore'} • Max ₹
                            {req.budgetMax ? (req.budgetMax >= 10000000 ? `${req.budgetMax / 10000000} Cr` : `${req.budgetMax / 100000} L`) : 'Open'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not collected yet</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          lead.status === 'QUALIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : lead.status === 'CONTACTED'
                            ? 'bg-blue-100 text-blue-800'
                            : lead.status === 'NEW'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {lead.doNotCall ? (
                        <span className="inline-flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">
                          <ShieldAlert className="w-3 h-3" />
                          <span>DO NOT CALL</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-emerald-700">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Consent Active</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenVoiceWithLead(lead);
                        }}
                        disabled={lead.doNotCall}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition ${
                          lead.doNotCall
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                        }`}
                      >
                        Call Lead
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No leads found matching current query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Detail Slide-over Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedLead.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">ID: {selectedLead.id.slice(0, 8)}...</p>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>

              {/* Status and DNC Action */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Contact Permission</span>
                  <div className="text-sm font-medium mt-0.5">
                    {selectedLead.doNotCall ? 'Do Not Call Enabled' : 'Permitted for Calls'}
                  </div>
                </div>
                <button
                  onClick={() => toggleDnc(selectedLead)}
                  className={`text-xs px-2.5 py-1 rounded font-medium transition ${
                    selectedLead.doNotCall
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                  }`}
                >
                  {selectedLead.doNotCall ? 'Revoke DNC' : 'Mark Do Not Call'}
                </button>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact Info</h3>
                <div className="flex items-center space-x-2 text-sm text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="font-mono">{selectedLead.phone}</span>
                </div>
                {selectedLead.email && (
                  <div className="flex items-center space-x-2 text-sm text-slate-700">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{selectedLead.email}</span>
                  </div>
                )}
                <div className="text-xs text-slate-500">
                  Preferred Language: <strong>{selectedLead.preferredLanguage.toUpperCase()}</strong>
                </div>
              </div>

              {/* Requirements */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Property Requirements
                </h3>
                {selectedLead.requirements ? (
                  <div className="space-y-2 text-sm bg-teal-50/50 p-3.5 rounded-lg border border-teal-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 text-xs">Intent:</span>
                      <span className="font-semibold text-teal-800">
                        {selectedLead.requirements.transactionType}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 text-xs">Location:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedLead.requirements.location || 'Any'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 text-xs">Bedrooms:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedLead.requirements.bedrooms ? `${selectedLead.requirements.bedrooms} BHK` : 'Flexible'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 text-xs">Max Budget:</span>
                      <span className="font-semibold text-slate-800">
                        ₹{Number(selectedLead.requirements.budgetMax || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 text-xs">Timeline:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedLead.requirements.timeline || 'Not specified'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No structured requirements yet.</p>
                )}
              </div>

              {/* Notes */}
              {selectedLead.notes && (
                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</h3>
                  <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2.5 rounded border border-slate-100">
                    {selectedLead.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Launch Call with this lead */}
            <div className="pt-6 border-t border-slate-100">
              <button
                onClick={() => {
                  const lead = selectedLead;
                  setSelectedLead(null);
                  onOpenVoiceWithLead(lead);
                }}
                disabled={selectedLead.doNotCall}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-semibold transition shadow"
              >
                Launch Voice Call with {selectedLead.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Lead Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Add New Lead</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newLead.name}
                    onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g. Vikram Verma"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="+91 98765 00000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="vikram@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Preferred Language</label>
                  <select
                    value={newLead.preferredLanguage}
                    onChange={(e) => setNewLead({ ...newLead, preferredLanguage: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="bn">Bengali</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Property Preferences
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500">Transaction</label>
                    <select
                      value={newLead.transactionType}
                      onChange={(e) => setNewLead({ ...newLead, transactionType: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded"
                    >
                      <option value="BUY">Buy</option>
                      <option value="RENT">Rent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500">Location</label>
                    <input
                      type="text"
                      value={newLead.location}
                      onChange={(e) => setNewLead({ ...newLead, location: e.target.value })}
                      placeholder="e.g. Whitefield"
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500">Bedrooms</label>
                    <input
                      type="number"
                      value={newLead.bedrooms}
                      onChange={(e) => setNewLead({ ...newLead, bedrooms: parseInt(e.target.value, 10) })}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium"
                >
                  {isSubmitting ? 'Creating...' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
