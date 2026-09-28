import { Search, X, SlidersHorizontal } from "lucide-react";
import { resolveServiceName } from "../../api/incidents";

export function IncidentsFilterBar({
  incidents = [],
  searchQuery,
  onSearchChange,
  selectedSeverity,
  onSeverityChange,
  selectedStatus,
  onStatusChange,
  selectedService,
  onServiceChange,
  onClearFilters,
}) {
  // Dynamically extract available severities from returned incidents
  const availableSeverities = Array.from(
    new Set(incidents.map((item) => item.severity).filter(Boolean))
  ).sort();

  // Dynamically extract available statuses from returned incidents
  const availableStatuses = Array.from(
    new Set(incidents.map((item) => item.status).filter(Boolean))
  ).sort();

  // Dynamically extract available service_ids from returned incidents
  const availableServices = Array.from(
    new Set(incidents.map((item) => item.service_id).filter(Boolean))
  ).map((serviceId) => ({
    id: serviceId,
    name: resolveServiceName(serviceId),
  }));

  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(selectedSeverity) ||
    Boolean(selectedStatus) ||
    Boolean(selectedService);

  return (
    <div className="incidents-filter-bar">
      <div className="search-input-wrap">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search incident key, title, error, or service..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            className="search-clear-btn"
            onClick={() => onSearchChange("")}
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="filter-dropdowns">
        <div className="filter-select-wrap">
          <SlidersHorizontal size={14} className="filter-icon" />
          <select
            className="filter-select"
            value={selectedSeverity}
            onChange={(e) => onSeverityChange(e.target.value)}
          >
            <option value="">All Severities</option>
            {availableSeverities.map((sev) => (
              <option key={sev} value={sev}>
                {sev}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-select-wrap">
          <select
            className="filter-select"
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="">All Statuses</option>
            {availableStatuses.map((st) => (
              <option key={st} value={st}>
                {st.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-select-wrap">
          <select
            className="filter-select"
            value={selectedService}
            onChange={(e) => onServiceChange(e.target.value)}
          >
            <option value="">All Services</option>
            {availableServices.map((srv) => (
              <option key={srv.id} value={srv.id}>
                {srv.name}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button className="clear-filters-btn" onClick={onClearFilters}>
            <X size={14} />
            <span>Clear Filters</span>
          </button>
        )}
      </div>
    </div>
  );
}
