import { useState, useEffect, useMemo } from "react";
import { ErrorBanner } from "../components/common/ErrorBanner";
import { EmptyState } from "../components/common/EmptyState";
import { IncidentsHeader } from "../components/incidents/IncidentsHeader";
import { IncidentsMetrics } from "../components/incidents/IncidentsMetrics";
import { IncidentsFilterBar } from "../components/incidents/IncidentsFilterBar";
import { IncidentsTable } from "../components/incidents/IncidentsTable";
import { IncidentsCardGrid } from "../components/incidents/IncidentsCardGrid";
import { IncidentDetailDrawer } from "../components/incidents/IncidentDetailDrawer";

import { listIncidents, getIncident, resolveServiceName } from "../api/incidents";
import { ORGANIZATION_ID } from "../api/client";

export function IncidentsPage({ onOpenWorkspace }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedService, setSelectedService] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchIncidentsData = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await listIncidents(ORGANIZATION_ID);
      setIncidents(data);
    } catch {
      setError(
        "Unable to load incidents. The RETRAX API could not return incident history."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setError("");
      try {
        const data = await listIncidents(ORGANIZATION_ID);
        if (!ignore) {
          setIncidents(data);
          setLoading(false);
        }
      } catch {
        if (!ignore) {
          setError(
            "Unable to load incidents. The RETRAX API could not return incident history."
          );
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const handleSelectIncident = async (inc) => {
    setSelectedIncident(inc);
    setDrawerOpen(true);
    setLoadingDetail(true);

    try {
      const fullDetail = await getIncident(inc.id, ORGANIZATION_ID);
      setSelectedIncident(fullDetail);
    } catch {
      // Keep existing object if detailed fetch fails
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedSeverity("");
    setSelectedStatus("");
    setSelectedService("");
  };

  // Perform search and filtering safely over available fields
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // 1. Severity filter
      if (selectedSeverity && inc.severity !== selectedSeverity) {
        return false;
      }

      // 2. Status filter
      if (selectedStatus && String(inc.status || "").toLowerCase() !== selectedStatus.toLowerCase()) {
        return false;
      }

      // 3. Service filter
      if (selectedService && inc.service_id !== selectedService) {
        return false;
      }

      // 4. Search query matching available fields
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const serviceName = resolveServiceName(inc.service_id).toLowerCase();

        const matchKey = String(inc.incident_key || "").toLowerCase().includes(q);
        const matchTitle = String(inc.title || "").toLowerCase().includes(q);
        const matchError = String(inc.current_error || "").toLowerCase().includes(q);
        const matchDesc = String(inc.description || "").toLowerCase().includes(q);
        const matchImpact = String(inc.impact || "").toLowerCase().includes(q);
        const matchSev = String(inc.severity || "").toLowerCase().includes(q);
        const matchStatus = String(inc.status || "").toLowerCase().includes(q);
        const matchSrv = serviceName.includes(q) || String(inc.service_id || "").toLowerCase().includes(q);

        return (
          matchKey ||
          matchTitle ||
          matchError ||
          matchDesc ||
          matchImpact ||
          matchSev ||
          matchStatus ||
          matchSrv
        );
      }

      return true;
    });
  }, [incidents, searchQuery, selectedSeverity, selectedStatus, selectedService]);

  return (
    <>
      <ErrorBanner message={error} onRetry={fetchIncidentsData} />

      <IncidentsHeader totalCount={incidents.length} />

      <IncidentsMetrics incidents={incidents} />

      <IncidentsFilterBar
        incidents={incidents}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSeverity={selectedSeverity}
        onSeverityChange={setSelectedSeverity}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedService={selectedService}
        onServiceChange={setSelectedService}
        onClearFilters={handleClearFilters}
      />

      <section className="incidents-list-section panel">
        {loading ? (
          <div className="table-skeleton-wrap">
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
          </div>
        ) : incidents.length === 0 ? (
          <EmptyState text="NO INCIDENTS — No production incidents are currently available." />
        ) : filteredIncidents.length === 0 ? (
          <div className="filtered-empty-state">
            <EmptyState text="NO MATCHES — No incidents match the current search and filters." />
            <button className="secondary-button margin-top-sm" onClick={handleClearFilters}>
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <IncidentsTable
              incidents={filteredIncidents}
              selectedIncidentId={selectedIncident?.id}
              onSelectIncident={handleSelectIncident}
              onOpenWorkspace={onOpenWorkspace}
            />

            <IncidentsCardGrid
              incidents={filteredIncidents}
              selectedIncidentId={selectedIncident?.id}
              onSelectIncident={handleSelectIncident}
              onOpenWorkspace={onOpenWorkspace}
            />
          </>
        )}
      </section>

      <IncidentDetailDrawer
        isOpen={drawerOpen}
        incident={selectedIncident}
        loadingDetail={loadingDetail}
        onClose={() => setDrawerOpen(false)}
        onOpenWorkspace={(inc) => {
          setDrawerOpen(false);
          if (onOpenWorkspace) onOpenWorkspace(inc?.id || inc);
        }}
      />
    </>
  );
}
