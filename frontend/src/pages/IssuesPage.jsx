import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { issuesAPI } from '../services/api';
import IssueCard from '../components/issues/IssueCard';
import { useIssueStore } from '../store/issueStore';
import { CATEGORY_CONFIG } from '../utils/helpers';

const STATUS_FILTERS = [
  { v: '',          l: 'All' },
  { v: 'reported',  l: 'New' },
  { v: 'inprogress',l: 'Active' },
  { v: 'completed,verified', l: 'Done' },
  { v: 'reopened',  l: 'Reopened' },
];

const SORT_OPTIONS = [
  { v: 'createdAt', l: '🕐 Latest' },
  { v: 'votes',     l: '🔥 Most Voted' },
  { v: 'trending',  l: '📈 Trending' },
];

export default function IssuesPage() {
  const { filters, setFilters, pagination, setPage } = useIssueStore();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['issues', filters, pagination.page, debouncedSearch],
    queryFn: () => issuesAPI.getAll({ ...filters, page: pagination.page, search: debouncedSearch }).then(r => r.data),
    keepPreviousData: true,
    staleTime: 20000,
  });

  return (
    <main className="page pt-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display font-bold text-slate-800 text-xl">📋 Issues Forum</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {data?.pagination?.total || 0} issues reported
            {isFetching && !isLoading && <span className="ml-2 text-orange-500">• Updating...</span>}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search issues by title, location, description..."
          className="input pl-10 bg-white" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg">✕</button>
        )}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-2 no-scrollbar">
        {STATUS_FILTERS.map(f => (
          <button key={f.v} onClick={() => setFilters({ status: f.v })}
            className={`chip ${filters.status === f.v ? 'active' : ''}`}>{f.l}</button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-2 no-scrollbar">
        <button onClick={() => setFilters({ category: '' })} className={`chip ${!filters.category ? 'active' : ''}`}>All</button>
        {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
          <button key={k} onClick={() => setFilters({ category: k })} className={`chip ${filters.category === k ? 'active' : ''}`}>
            {v.icon} {k}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
        {SORT_OPTIONS.map(s => (
          <button key={s.v} onClick={() => setFilters({ sortBy: s.v })} className={`chip ${filters.sortBy === s.v ? 'active' : ''}`}>{s.l}</button>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200 mb-4" />

      {/* Issues list */}
      {isLoading ? (
        <div className="space-y-2.5">
          {[1,2,3,4].map(i => (
            <div key={i} className="card h-28 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/2 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : data?.data?.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🔍</div>
          <h3 className="font-display font-bold text-slate-600 mb-1">No issues found</h3>
          <p className="text-slate-400 text-sm">Try adjusting your filters or search term</p>
        </div>
      ) : (
        <>
          {data?.data?.map((issue, i) => <IssueCard key={issue._id} issue={issue} idx={i} />)}

          {data?.pagination?.hasNext && (
            <button onClick={() => setPage(pagination.page + 1)}
              className="btn btn-ghost btn-full mt-2 mb-4 border border-slate-200">
              Load More Issues ↓
            </button>
          )}
        </>
      )}
    </main>
  );
}
