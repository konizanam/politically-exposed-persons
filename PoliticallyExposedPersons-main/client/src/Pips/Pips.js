import React, { useState, useContext, useEffect, useRef } from 'react';
import { similarity } from '../utils/stringSimilarity';
import { UserContext } from '../UserContext';
import axios from '../axiosInstance';
import { CSVLink } from 'react-csv';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FaSearch, FaTimes, FaInfoCircle, FaUpload, FaCircle } from 'react-icons/fa';
import ActionDropdown from './ActionDropdown';
import '../Pages.css';
import './Pips.css';
import PersonalInfoForm from '../DataCapturer/forms/PersonalInfoForm';
import ForeignDetailsForm from '../DataCapturer/forms/ForeignDetailsForm';
import InstitutionsForm from '../DataCapturer/forms/InstitutionsForm';
import AssociatesForm from '../DataCapturer/forms/AssociatesForm';
import { countries } from '../DataCapturer/constants';
import BulkSearchForm from '../DataCapturer/forms/BulkSearchForm';
import EditPipModal from './EditPipModal';

// Alert Banner Component
const AlertBanner = ({ type, message, onClose, actions }) => {
  const styles = {
    warning: { backgroundColor: '#fff3cd', color: '#856404', borderColor: '#ffeeba' },
    danger: { backgroundColor: '#f8d7da', color: '#721c24', borderColor: '#f5c6cb' },
    info: { backgroundColor: '#d1ecf1', color: '#0c5460', borderColor: '#bee5eb' },
    success: { backgroundColor: '#d4edda', color: '#155724', borderColor: '#c3e6cb' }
  };

  const iconMap = {
    warning: '⚠️',
    danger: '🚫',
    info: 'ℹ️',
    success: '✅'
  };

  return (
    <div style={{
      ...styles[type],
      padding: '12px 20px',
      border: '1px solid',
      borderRadius: '4px',
      marginTop: '1rem',    // Add this line
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '14px',
      fontWeight: '500'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '20px' }}>{iconMap[type]}</span>
        <span>{message}</span>
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {actions && actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            style={{
              padding: '4px 12px',
              border: 'none',
              borderRadius: '3px',
              backgroundColor: action.primary ? '#007bff' : 'transparent',
              color: action.primary ? 'white' : 'inherit',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            {action.label}
          </button>
        ))}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 5px',
              color: 'inherit'
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

function PIPs() {
  const { user, setUser } = useContext(UserContext);
  const [allPips, setAllPips] = useState([]);
  const [selectedPipIds, setSelectedPipIds] = useState([]);
  // Handle select all on current page
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedPipIds(currentPips.map(p => p.id));
    } else {
      setSelectedPipIds([]);
    }
  };

  // Handle select one
  const handleSelectOne = (id, checked) => {
    setSelectedPipIds(prev => checked ? [...prev, id] : prev.filter(pid => pid !== id));
  };
  const [loading, setLoading] = useState(false);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState('full_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLimitInfo, setSearchLimitInfo] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchHistory, setSearchHistory] = useState([]);
  const [isPrivilegedUser, setIsPrivilegedUser] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPip, setEditingPip] = useState(null);
  const [editCurrentStep, setEditCurrentStep] = useState(0);
  const [editCompletedSteps, setEditCompletedSteps] = useState([]);
  const [editValidationErrors, setEditValidationErrors] = useState({});
  const [savingStep, setSavingStep] = useState(false);
  const [message, setMessage] = useState('');
  const [showMessagePopup, setShowMessagePopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showBulkSearchModal, setShowBulkSearchModal] = useState(false); // State to control modal visibility
  const [bulkSearchInfo, setBulkSearchInfo] = useState(null); // Add state for bulk search info
  const [unmatchedBulkInputs, setUnmatchedBulkInputs] = useState([]); // State for unmatched bulk search keywords
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [fullQueryToShow, setFullQueryToShow] = useState('');
  // Table search state
  const [tableSearch, setTableSearch] = useState('');
  // Approximity (similarity) slider state
  const [minSimilarity, setMinSimilarity] = useState(0);
  const searchInputRef = useRef(null);
  const itemsPerPage = 5;

  // Edit form states
  const [editFirstName, setEditFirstName] = useState('');
  const [editMiddleName, setEditMiddleName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editNationalId, setEditNationalId] = useState('');
  const [editAssociates, setEditAssociates] = useState([]);
  const [editInstitutions, setEditInstitutions] = useState([]);
  const [editForeignDetails, setEditForeignDetails] = useState({ country: '', additional_notes: '' });
  const [editSuggestions, setEditSuggestions] = useState([]);
  const [viewMode, setViewMode] = useState(false); // Add this state

  // --- Dashboard Card Styles (copied from PipSearchHistory.js) ---
  const dashboardCardStyle = {
    flex: '1',
    backgroundColor: '#fff',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '18px 20px',
    margin: '0 10px 10px 0',
    minWidth: 0,
    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start'
  };
  const dashboardLabelStyle = {
    fontSize: '0.95rem',
    color: '#6c757d',
    marginBottom: '6px',
    fontWeight: 500
  };
  const dashboardValueStyle = {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#2c3e50'
  };

  // Helper function to format search history display
  const formatSearchHistoryDisplay = (search) => {
    // Check if the search is a JSON array (bulk search)
    if (search.startsWith('[{') && search.includes('first_name')) {
      try {
        const parsed = JSON.parse(search);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const firstPerson = parsed[0];
          const firstName = firstPerson.first_name || '';
          const lastName = firstPerson.last_name || '';
          const count = parsed.length;
          
          return {
            display: `Bulk: ${firstName} ${lastName}${count > 1 ? ` +${count - 1} more` : ''}`,
            fullQuery: search,
            isBulk: true,
            recordCount: count
          };
        }
      } catch (e) {
        // If parsing fails, treat as regular bulk search
        return {
          display: 'Bulk Search (Multiple Records)',
          fullQuery: search,
          isBulk: true,
          recordCount: 0
        };
      }
    }
    
    // Regular search query
    return {
      display: search.length > 50 ? search.substring(0, 50) + '...' : search,
      fullQuery: search,
      isBulk: false,
      recordCount: 0
    };
  };

  // Add this helper function after the state declarations (around line 50)
  const getPipsLength = () => Array.isArray(allPips) ? allPips.length : 0;
  const getPipsArray = () => Array.isArray(allPips) ? allPips : [];

  useEffect(() => {
    // Try to refresh the user data from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser && (!user || !user.first_name || !user.organisation_name)) {
      try {
        const parsedUser = JSON.parse(storedUser);
      } catch (err) {
        console.error("Error parsing stored user:", err);
      }
    }

    // Check if user has admin or data_capturer permissions
    if (user) {
      const hasPrivilegedAccess = user.is_system_admin || 
        user.is_admin ||  // Add this check
        (user.permissions && user.permissions.includes('data_capturer')) ||
        (user.role_name && user.role_name.toLowerCase().includes('data capturer')) ||
        (user.role_name && user.role_name.toLowerCase() === 'admin');  // Add this check
    
      setIsPrivilegedUser(hasPrivilegedAccess);
      
      // Load all PIPs automatically for privileged users
      if (hasPrivilegedAccess) {
        loadAllPips();
      }
    }

    if (user?.organisation_id) {
      fetchDashboardInfo();
      fetchRecentSearches();
    }
    
    // Focus the search input on component mount
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [user]);

  // Update the useEffect to load search limit info on mount (around line 170)

  // Add this useEffect to load search limit info when component mounts
  useEffect(() => {
    if (!isPrivilegedUser) {
      // Fetch initial search limit info even without searching
      const fetchSearchLimitInfo = async () => {
        try {
          const response = await axios.get('/pipsdata/pipsfetch');
          if (response.data.searchLimitInfo) {
            setSearchLimitInfo(response.data.searchLimitInfo);
          }
        } catch (error) {
          console.error('Error fetching search limit info:', error);
        }
      };
      
      fetchSearchLimitInfo();
    }
  }, [isPrivilegedUser]);

  // Function to load all PIPs for privileged users
  const loadAllPips = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/pipsdata/pipsfetch');
      
      // Handle the response structure properly
      if (res.data) {
        if (res.data.data) {
          setAllPips(res.data.data);
        } else if (Array.isArray(res.data)) {
          setAllPips(res.data);
        } else {
          setAllPips([]);
        }
        
        // Update search limit info if provided
        if (res.data.searchLimitInfo) {
          setSearchLimitInfo(res.data.searchLimitInfo);
        }
      } else {
        setAllPips([]);
      }
      
      setSearchSubmitted(true);
    } catch (err) {
      console.error('Error loading PIPs:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load PIPs');
      setAllPips([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch recent searches for suggestions
  const fetchRecentSearches = async () => {
    try {
      const res = await axios.get('/audittrails/pipsearchhistory');
      if (res.data && Array.isArray(res.data)) {
        // Extract unique search queries from history, filter out any containing 'bulk search' (case-insensitive)
        const searches = res.data
          .map(item => item.search_query)
          .filter((value, index, self) => {
            if (!value) return false;
            // Remove if contains 'bulk search' (case-insensitive)
            if (typeof value === 'string' && value.toLowerCase().includes('bulk search')) return false;
            return self.indexOf(value) === index;
          })
          .slice(0, 5); // Get top 5 recent searches
        setSearchHistory(searches);
      }
    } catch (err) {
      console.error("Error fetching search history:", err);
    }
  };

  const fetchDashboardInfo = async () => {
    if (!user?.organisation_id) return;
    
    try {
      setDashboardLoading(true);
      const res = await axios.get(`/audittrails/pipsearchdashboard?organisation_id=${user.organisation_id}`);
      if (res.data) {
        setSearchLimitInfo({
          package: res.data.package,
          screeningLimit: res.data.screening_limit,
          screeningsDone: res.data.screenings_done,
          screeningsLeft: res.data.screenings_left,
          batchScreeningLimit: res.data.batch_screening_limit,
          batchScreeningsDone: res.data.batch_screenings_done,
          batchScreeningsLeft: res.data.batch_screenings_left
        });
      }
    } catch (err) {
      console.error("Error fetching dashboard info:", err);
    } finally {
      setDashboardLoading(false);
    }
  };

  // Function to refresh user details from the server
  const refreshUserDetails = async () => {
    try {
      const res = await axios.get('/users/me');
      if (res.data && res.data.user) {
        // Update localStorage with fresh user data
        const freshUserData = res.data.user;
        localStorage.setItem('user', JSON.stringify(freshUserData));
        
        // Also store email separately
        if (freshUserData.email) {
          localStorage.setItem('userEmail', freshUserData.email);
        }
        
        console.log("Refreshed user details:", freshUserData);
        
        // Update context with fresh data
        if (setUser) {
          setUser(freshUserData);
        }
        
        // Return the refreshed user data
        return freshUserData;
      }
    } catch (err) {
      console.error("Error refreshing user details:", err);
    }
    return null;
  };

  const getAssociateName = (assoc) =>
    [assoc.first_name, assoc.middle_name, assoc.last_name].filter(Boolean).join(' ');

  const getPipResultOverview = (pip) => {
    if (!pip) return 'N/A';
    const candidates = [
      pip.pip_result_overview,
      pip.result_overview,
      pip.reason,
      pip.pip_reason,
      pip.overview
    ];

    for (const candidate of candidates) {
      if (candidate == null) continue;
      const text = String(candidate).trim();
      if (text) {
        return text;
      }
    }

    return 'N/A';
  };

  const handleSearch = async () => {
    if (!searchTerm.trim() && !isPrivilegedUser) return;
    
    // Check if search limit is reached first (only for non-privileged users)
    if (!isPrivilegedUser && searchLimitInfo) {
      const hasLimit = searchLimitInfo.screeningLimit !== null && searchLimitInfo.screeningLimit !== 'Unlimited';
      const remaining = searchLimitInfo.screeningsLeft;
      
      // If limit is reached, show error and return
      if (hasLimit && remaining === 0) {
  setError(`Your organisation has reached the maximum number of searches (${searchLimitInfo.screeningLimit}) allowed by your package. Please contact your administrator to upgrade your package.`);
        return;
      }
      
      // Show warning for low remaining searches
      if (hasLimit && remaining > 0 && remaining <= 5) {
        // Show a confirmation dialog for very low searches
        if (remaining <= 2) {
          const confirmSearch = window.confirm(
            `⚠️ You have only ${remaining} search${remaining === 1 ? '' : 'es'} remaining!\n\n` +
            `Do you want to continue with this search?`
          );
          if (!confirmSearch) return;
        }
      }
    }
    
    setSearchSubmitted(true);
    try {
      setLoading(true);
      setError(null);
      
      // Build query with active filter if not "all"
      let queryParams = searchTerm.trim() ? `query=${encodeURIComponent(searchTerm.trim())}` : '';
      if (activeFilter !== 'all') {
        queryParams += queryParams ? '&' : '';
        queryParams += `filter=${encodeURIComponent(activeFilter)}`;
      }
      
      const res = await axios.get(`/pipsdata/pipsfetch${queryParams ? '?' + queryParams : ''}`);
      
      // Update all PIPs and search limit info
      if (res.data.data) {
        setAllPips(res.data.data);
      } else {
        setAllPips(res.data || []);
      }
      
      // Update search limit info if provided
      if (res.data.searchLimitInfo) {
        setSearchLimitInfo(res.data.searchLimitInfo);
        
        // Show success message with remaining searches
        const remaining = res.data.searchLimitInfo.screeningsLeft;
        if (!isPrivilegedUser && remaining !== 'Unlimited' && remaining <= 10) {
          setSuccessMessage(`Search successful! You have ${remaining} search${remaining === 1 ? '' : 'es'} remaining.`);
          setTimeout(() => setSuccessMessage(''), 5000);
        }
      }
      
      setCurrentPage(1);
      
      // Refresh dashboard info after successful search
      fetchDashboardInfo();
      
      // Update search history
      fetchRecentSearches();
      
      // Scroll to results
      setTimeout(() => {
        const resultsElement = document.getElementById('search-results');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.error === 'Search limit reached') {
        setError(err.response.data.message || 'Search limit reached. Please contact your administrator.');
        // Update search limit info
        if (err.response.data.searchLimitInfo) {
          setSearchLimitInfo(err.response.data.searchLimitInfo);
        }
      } else {
        setError(err.response?.data?.error || err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Additional helper functions
  const clearSearch = () => {
    setSearchTerm('');
    setAllPips([]);
    setCurrentPage(1);
    setSearchSubmitted(false);
    setActiveFilter('all');
    setBulkSearchInfo(null); // Add this line
    setTableSearch(''); // Reset table search
    setMinSimilarity(0); // Reset search score slider
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };
  
  const applyFilter = (filter) => {
    setActiveFilter(filter);
  };
  
  const applySuggestion = (suggestion) => {
    setSearchTerm(suggestion);
    handleSearch();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSort = (col) => {
    const order = sortColumn === col && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortColumn(col);
    setSortOrder(order);
  };



  // Unified similarity filtering for both regular and bulk search results
  const proximityBase = searchTerm.trim();
  let filtered = Array.isArray(allPips)
    ? allPips
        .map(pip => {
          let score = 0;
          // For bulk search with table search keyword, use table search keyword for similarity
          if (bulkSearchInfo && tableSearch.trim()) {
            const t = tableSearch.trim();
            const full = (pip.full_name || '').trim();
            if (t.toLowerCase() === full.toLowerCase() || full.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(full.toLowerCase())) {
              score = 100;
            } else {
              score = similarity(t, full);
            }
          } else if (bulkSearchInfo && Array.isArray(bulkSearchInfo.inputNames) && bulkSearchInfo.inputNames.length > 0) {
            // For bulk search with no table search, use original input names
            const pipName = (pip.full_name || '').trim();
            let maxScore = 0;
            for (const inputName of bulkSearchInfo.inputNames) {
              const pipNorm = pipName.toLowerCase();
              const inputNorm = inputName.toLowerCase();
              if (pipNorm === inputNorm || pipNorm.includes(inputNorm) || inputNorm.includes(pipNorm)) {
                maxScore = 100;
                break;
              } else {
                const s = similarity(inputName, pipName);
                if (s > maxScore) maxScore = s;
              }
            }
            score = maxScore;
          } else if (!proximityBase) {
            score = 100;
          } else {
            const s = proximityBase.toLowerCase();
            const full = (pip.full_name || '').toLowerCase();
            if (s === full || full.includes(s) || s.includes(full)) {
              score = 100;
            } else {
              score = similarity(proximityBase, pip.full_name || '');
            }
          }
          return { ...pip, _similarityScore: score };
        })
        .filter(pip => pip._similarityScore >= minSimilarity)
    : [];

  const sorted = Array.isArray(filtered) ? [...filtered].sort((a, b) => {
    const valA = (a[sortColumn] || '').toString().toLowerCase();
    const valB = (b[sortColumn] || '').toString().toLowerCase();
    return valA < valB ? (sortOrder === 'asc' ? -1 : 1) : valA > valB ? (sortOrder === 'asc' ? 1 : -1) : 0;
  }) : [];

  const totalPages = Math.ceil((Array.isArray(sorted) ? sorted.length : 0) / itemsPerPage);
  const currentPips = Array.isArray(sorted) ? sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) : [];

  const renderPagination = () => {
    const pages = [];
    const current = currentPage;

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button key={i} className={current === i ? 'active' : ''} onClick={() => setCurrentPage(i)}>
            {i}
          </button>
        );
      }
    } else {
      pages.push(<button key={1} className={current === 1 ? 'active' : ''} onClick={() => setCurrentPage(1)}>1</button>);
      if (current > 3) pages.push(<span key="start-ellipsis">...</span>);
      const start = Math.max(2, current - 1);
      const end = Math.min(totalPages - 1, current + 1);
      for (let i = start; i <= end; i++) {
        pages.push(
          <button key={i} className={current === i ? 'active' : ''} onClick={() => setCurrentPage(i)}>
            {i}
          </button>
        );
      }
      if (current < totalPages - 2) pages.push(<span key="end-ellipsis">...</span>);
      pages.push(
        <button key={totalPages} className={current === totalPages ? 'active' : ''} onClick={() => setCurrentPage(totalPages)}>
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  // Function to get user display name
  const getUserDisplayName = () => {
    // Try from user context
    if (user) {
      // Try to build a full name from first_name and last_name
      if (user.first_name && user.last_name) {
        return `${user.first_name} ${user.last_name}`;
      }
      
      // Alternative properties
      if (user.name && user.surname) {
        return `${user.name} ${user.surname}`;
      }
      
      // If we only have first_name or name
      if (user.first_name) return user.first_name;
      if (user.name) return user.name;
      
      // Fall back to email if available
      if (user.email) return user.email;
    }
    
    // Try from localStorage as fallback
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (storedUser) {
        if (storedUser.first_name && storedUser.last_name) {
          return `${storedUser.first_name} ${storedUser.last_name}`;
        }
        if (storedUser.name && storedUser.surname) {
          return `${storedUser.name} ${storedUser.surname}`;
        }
        if (storedUser.first_name) return storedUser.first_name;
        if (storedUser.name) return storedUser.name;
        if (storedUser.email) return storedUser.email;
      }
    } catch (e) {
      console.error("Error getting user from localStorage:", e);
    }
    
    // Final fallback
    return 'Unknown User';
  };
  
  // Function to get organisation name
  const getOrganizationName = () => {
    // Try from user context
    if (user) {
      if (user.organisation_name) return user.organisation_name;
      if (user.organization_name) return user.organization_name;
    }
    
    // Try from localStorage as fallback
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (storedUser) {
        if (storedUser.organisation_name) return storedUser.organisation_name;
        if (storedUser.organization_name) return storedUser.organization_name;
      }
    } catch (e) {
  console.error("Error getting organisation from localStorage:", e);
    }
    
    return 'N/A';
  };


  // PDF export: landscape, add Institution Name column
  const exportPDF = async () => {
    await refreshUserDetails();
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.setTextColor(22, 160, 133);
    doc.text('PIP Search Results', 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const now = new Date();
    const dateStr = now.toLocaleString();
    doc.text(`Export Date: ${dateStr}`, 14, 25);
    doc.text(`Exported By: ${getUserDisplayName()} (ID: ${user?.id || 'Unknown'})`, 14, 30);
  doc.text(`Organisation: ${getOrganizationName()}`, 14, 35);
    doc.text(`Search Term: "${searchTerm}"`, 14, 40);
    // Only export selected, or all if none selected
    const selectedPips = selectedPipIds.length > 0 ? allPips.filter(p => selectedPipIds.includes(p.id)) : allPips;
    doc.text(`Total Results: ${selectedPips.length}`, 14, 45);
    const columns = [
      'Full Name',
      'PIP Classification',
      'Institution',
      'Position',
      'Country',
      'PIP Result Overview',
      'Associates'
    ];
    const body = selectedPips.map((p) => {
      const institutionName = Array.isArray(p.institutions) && p.institutions.length > 0
        ? p.institutions.map(inst => inst.institution_name || '').filter(Boolean).join(', ')
        : 'N/A';
      const associatesCell = Array.isArray(p.associates) && p.associates.length > 0
        ? p.associates.map(a => {
            const name = getAssociateName(a) || 'Unnamed';
            const relationship = a.relationship_type ? ` (${a.relationship_type})` : '';
            const nationalId = a.national_id ? ` [ID: ${a.national_id}]` : '';
            return `${name}${relationship}${nationalId}`;
          }).join('\n')
        : 'Not Yet Captured';
      return [
        p.full_name,
        p.pip_type,
        institutionName,
        p.position || 'N/A',
        p.country || 'Namibia',
        getPipResultOverview(p),
        associatesCell
      ];
    });

    autoTable(doc, {
      head: [columns],
      body,
      styles: { fontSize: 8, cellWidth: 'wrap' },
      headStyles: { fillColor: [22, 160, 133] },
      margin: { top: 50 },
      tableWidth: 'auto',
    });

    // Watermark and Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      // Watermark (move lower, smaller, lighter)
      doc.saveGraphicsState && doc.saveGraphicsState();
      doc.setTextColor(220, 220, 220);
      doc.setFontSize(36);
      // Place watermark near bottom center, lighter opacity
      if (doc.setTextColor && doc.setFontSize) {
        // jsPDF doesn't support opacity directly, so use lighter color
        doc.text('PIP Intel', doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 40, {
          angle: 0,
          align: 'center'
        });
      }
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Confidential - Generated by ${getUserDisplayName()} on ${dateStr}`, 14, doc.internal.pageSize.height - 10);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
      doc.restoreGraphicsState && doc.restoreGraphicsState();
    }
    const fileDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    doc.save(`pips_export_${fileDate}.pdf`);
  };



  // Modify handleEdit to accept a viewOnly flag
  const handleEdit = (pip, viewOnly = false) => {
    setEditingPip(pip);
  setEditFirstName(pip.first_name || '');
  setEditMiddleName(pip.middle_name || '');
  setEditLastName(pip.last_name || '');
  setEditNationalId(pip.national_id || '');
    setEditAssociates(pip.associates?.length > 0 ? pip.associates : 
      [{ first_name: '', middle_name: '', last_name: '', relationship_type: '', national_id: '' }]
    );
    setEditInstitutions(pip.institutions?.length > 0 ? pip.institutions : 
      [{ institution_name: '', institution_type: '', position: '', start_date: '', end_date: '' }]
    );
    if (pip.pip_type === 'Foreign' && pip.foreign) {
      setEditForeignDetails({
        country: pip.foreign.country || pip.country || '',
        additional_notes: pip.foreign.additional_notes || ''
      });
    } else {
      setEditForeignDetails({ country: '', additional_notes: '' });
    }
    setEditCurrentStep(0);
    setEditCompletedSteps([]);
    setEditValidationErrors({});
    setViewMode(viewOnly); // Set view mode
    setShowEditModal(true);
  };
  
  // Handle toggle PIP active status
  const handleToggleStatus = async (pipId, newStatus) => {
    try {
      const response = await axios.put(`/pipsdata/toggle-status/${pipId}`, {
        is_active: newStatus
      });
      
      if (response.data.success) {
        // Show success message
        setSuccessMessage(`PIP ${newStatus ? 'activated' : 'deactivated'} successfully`);
        
        // Refresh PIP list
        if (isPrivilegedUser) {
          loadAllPips();
        } else if (searchSubmitted) {
          handleSearch();
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
        
        return true;
      }
      
      return false;
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update PIP status');
      console.error('Toggle status error:', error);
      return false;
    }
  };

 

  const validateEditStep = (stepIndex) => {
    const errors = {};

    if (stepIndex === 0) {
      if (!editFirstName.trim()) errors.firstName = 'First name is required';
      if (!editLastName.trim()) errors.lastName = 'Last name is required';
      if (editingPip?.pip_type === 'Foreign' && !editNationalId.trim()) {
        errors.nationalId = 'National ID is required for foreign PIPs';
      }
    }

    if (editingPip?.pip_type === 'Foreign' && stepIndex === 1) {
      if (!editForeignDetails.country.trim()) {
        errors.country = 'Country is required';
      } else if (!countries.includes(editForeignDetails.country)) {
        errors.country = 'Please select a valid country from the list';
      }
    }

    const institutionStepIndex = editingPip?.pip_type === 'Foreign' ? 2 : 1;
    if (stepIndex === institutionStepIndex) {
      const hasValidInstitution = editInstitutions.some(inst => inst.institution_name?.trim());
      if (!hasValidInstitution) {
        errors.institutions = 'At least one institution is required';
      }
    }

    setEditValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditStepClick = (index) => {
    // Allow navigation to any step without validation
    setEditCurrentStep(index);
    setEditValidationErrors({});
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingPip(null);
    setEditCurrentStep(0);
    setEditCompletedSteps([]);
    setEditValidationErrors({});
  };

  // Add handler functions for edit forms
  const handleEditAssociateChange = (index, field, value) => {
    const updated = [...editAssociates];
    updated[index][field] = value;
    setEditAssociates(updated);
  };

  const addEditAssociate = () => {
    setEditAssociates([...editAssociates, 
      { first_name: '', middle_name: '', last_name: '', relationship_type: '', national_id: '' }
    ]);
  };

  const removeEditAssociate = (index) => {
    if (editAssociates.length > 1) {
      setEditAssociates(editAssociates.filter((_, idx) => idx !== index));
    }
  };

  const handleEditInstitutionChange = (index, field, value) => {
    const updated = [...editInstitutions];
    updated[index][field] = value;
    setEditInstitutions(updated);
    if (field === 'institution_name' && value.trim() && editValidationErrors.institutions) {
      setEditValidationErrors({ ...editValidationErrors, institutions: null });
    }
  };

  const addEditInstitution = () => {
    setEditInstitutions([...editInstitutions, 
      { institution_name: '', institution_type: '', position: '', start_date: '', end_date: '' }
    ]);
  };

  const removeEditInstitution = (index) => {
    if (editInstitutions.length > 1) {
      setEditInstitutions(editInstitutions.filter((_, idx) => idx !== index));
    }
  };

  const handleEditCountryChange = (e) => {
    const val = e.target.value;
    setEditForeignDetails({ ...editForeignDetails, country: val });
    setEditSuggestions(val ? countries.filter(c => c.toLowerCase().startsWith(val.toLowerCase())) : []);
    if (editValidationErrors.country) {
      setEditValidationErrors({ ...editValidationErrors, country: null });
    }
  };

  const selectEditCountry = (country) => {
    setEditForeignDetails({ ...editForeignDetails, country });
    setEditSuggestions([]);
    if (editValidationErrors.country) {
      setEditValidationErrors({ ...editValidationErrors, country: null });
    }
  };

  const handleEditNationalIdChange = (e) => {
    setEditNationalId(e.target.value);
    if (editValidationErrors.nationalId) {
      setEditValidationErrors({ ...editValidationErrors, nationalId: null });
    }
  };

  

  // Add this function after the handleEditStepClick function (around line 600)
  const handleSaveStep = async () => {
    if (!validateEditStep(editCurrentStep)) {
      return;
    }

    setSavingStep(true);
    setSuccessMessage(''); // Clear previous messages
    try {
      let updateData = {};
      
      // Determine what to save based on current step
      if (editCurrentStep === 0) {
        // Save personal information
        updateData = {
          first_name: editFirstName,
          middle_name: editMiddleName,
          last_name: editLastName,
          national_id: editNationalId
        };
      } else if (editingPip?.pip_type === 'Foreign' && editCurrentStep === 1) {
        // Save foreign details
        updateData = {
          foreign: editForeignDetails
        };
      } else if ((editingPip?.pip_type === 'Foreign' && editCurrentStep === 2) || 
                 (editingPip?.pip_type === 'Local' && editCurrentStep === 1)) {
        // Save institutions
        updateData = {
          institutions: editInstitutions.filter(i => i.institution_name?.trim())
        };
      } else {
        // Save associates
        updateData = {
          associates: editAssociates.filter(a => 
            a.first_name?.trim() || a.last_name?.trim() || a.national_id?.trim()
          )
        };
      }

      const response = await axios.put(`/pipsdata/update/${editingPip.id}`, updateData);
      
      if (response.data.success) {
        setSuccessMessage('✅ Step saved successfully!');
        
        // Mark step as completed
        if (!editCompletedSteps.includes(editCurrentStep)) {
          setEditCompletedSteps([...editCompletedSteps, editCurrentStep]);
        }
        
        // Refresh the PIPs list
        if (isPrivilegedUser) {
          loadAllPips();
        } else {
          handleSearch();
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      setError('Failed to save changes: ' + (error.response?.data?.error || error.message));
    } finally {
      setSavingStep(false);
    }
  };

  const handleBulkSearch = () => {
    if (searchLimitInfo?.batchScreeningsLeft === 0 && searchLimitInfo?.batchScreeningLimit !== null) {
  setError('Your organisation has reached the batch screening limit. Please contact your administrator to upgrade your package.');
      return;
    }
    setShowBulkSearchModal(true); // Open the modal
  };

  const closeBulkSearchModal = () => {
    setShowBulkSearchModal(false); // Close the modal
  };

  // Add this function after the closeBulkSearchModal function (around line 820)
  const handleBulkSearchComplete = (pipsData, searchLimitInfo, bulkInfo) => {
    // Ensure pipsData is an array
    const pipsArray = Array.isArray(pipsData) ? pipsData : [];
    setAllPips(pipsArray);
    setSearchSubmitted(true);
    setBulkSearchInfo(bulkInfo);
    // Update search limit info
    if (searchLimitInfo) {
      setSearchLimitInfo(searchLimitInfo);
    }
    setSearchTerm(`Bulk Search: ${bulkInfo?.totalSearched || 0} records`);
    // Compute unmatched input names (by full name and/or national_id)
    if (bulkInfo && Array.isArray(bulkInfo.inputRecords)) {
      // Build a set of matched names and IDs from results
      const matchedNames = new Set(pipsArray.map(p => (p.full_name || '').toLowerCase().trim()));
      const matchedIds = new Set(pipsArray.map(p => (p.national_id || '').toLowerCase().trim()));
      // Find unmatched input records
      const unmatched = bulkInfo.inputRecords.filter(rec => {
        const name = [rec.first_name, rec.middle_name, rec.last_name].filter(Boolean).join(' ').toLowerCase().trim();
        const id = (rec.national_id || '').toLowerCase().trim();
        return !matchedNames.has(name) && (!id || !matchedIds.has(id));
      });
      setUnmatchedBulkInputs(unmatched);
    } else {
      setUnmatchedBulkInputs([]);
    }
    // Scroll to results
    setTimeout(() => {
      const resultsElement = document.getElementById('search-results');
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Add these functions after the formatSearchHistoryDisplay function (around line 150)

  // Function to handle bulk history click
  const handleBulkHistoryClick = (jsonQuery) => {
    if (window.confirm('This is a bulk search query. Do you want to view the details?')) {
      setFullQueryToShow(jsonQuery);
      setShowQueryModal(true);
    }
  };
  

  // Function to format JSON for display
  const formatJsonForDisplay = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return jsonString;
    }
  };

  return (
    <div className="page-container">
      {/* Search Limit Alerts - Show at the top for better visibility */}
      {!isPrivilegedUser && searchLimitInfo && (
        <>
          {/* Critical Alert - No searches remaining */}
          {searchLimitInfo.screeningLimit !== null && searchLimitInfo.screeningsLeft === 0 && (
            <AlertBanner
              type="danger"
              message="You have no searches remaining. Contact your administrator to upgrade your package."
              actions={[
                { label: 'Contact Admin', onClick: () => window.location.href = 'mailto:info@pipintel.com', primary: true }
              ]}
            />
          )}
          
          {/* Warning Alert - Very Low searches (1-2) */}
          {searchLimitInfo.screeningLimit !== null && searchLimitInfo.screeningsLeft > 0 && searchLimitInfo.screeningsLeft <= 2 && (
            <AlertBanner
              type="danger"
              message={`Critical: Only ${searchLimitInfo.screeningsLeft} search${searchLimitInfo.screeningsLeft === 1 ? '' : 'es'} remaining!`}
              onClose={() => {}}
            />
          )}
          
          {/* Warning Alert - Low searches (3-5) */}
          {searchLimitInfo.screeningLimit !== null && searchLimitInfo.screeningsLeft > 2 && searchLimitInfo.screeningsLeft <= 5 && (
            <AlertBanner
              type="warning"
              message={`Warning: Only ${searchLimitInfo.screeningsLeft} searches remaining in your package.`}
              onClose={() => {}}
            />
          )}
          
          {/* Info Alert - Moderate searches (6-10) */}
          {searchLimitInfo.screeningLimit !== null && searchLimitInfo.screeningsLeft > 5 && searchLimitInfo.screeningsLeft <= 10 && (
            <AlertBanner
              type="info"
              message={`You have ${searchLimitInfo.screeningsLeft} searches remaining.`}
              onClose={() => {}}
            />
          )}
          
          {/* Batch Screening Alerts */}
          {searchLimitInfo.batchScreeningLimit !== null && searchLimitInfo.batchScreeningsLeft === 0 && (
            <AlertBanner
              type="danger"
              message="You have no bulk searches remaining. Contact your administrator to upgrade your package."
            />
          )}
          
          {searchLimitInfo.batchScreeningLimit !== null && searchLimitInfo.batchScreeningsLeft > 0 && searchLimitInfo.batchScreeningsLeft <= 5 && (
            <AlertBanner
              type="warning"
              message={`Warning: Only ${searchLimitInfo.batchScreeningsLeft} bulk search${searchLimitInfo.batchScreeningsLeft === 1 ? '' : 'es'} remaining.`}
            />
          )}
        </>
      )}

      {/* Success Messages */}
      {successMessage && (
        <AlertBanner
          type="success"
          message={successMessage}
          onClose={() => setSuccessMessage('')}
        />
      )}

      {/* Dashboard Stats Cards - Show for all users */}
      {searchLimitInfo && !isPrivilegedUser && (
        <div
          style={{
            borderRadius: '12px',
            padding: '20px',
            margin: '0 0 25px 0',
            background: 'linear-gradient(90deg, #f8f9fa 60%, #f3e6fa 100%)',
            boxShadow: '0 4px 16px rgba(156,39,176,0.07)',
            border: '1px solid #e1bee7',
          }}
        >
          {/* First row - Package and Single Search Info */}
          <div style={{ display: 'flex', gap: '18px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <div
              style={{
                ...dashboardCardStyle,
                minWidth: '210px',
                background: 'linear-gradient(90deg, #e0f7fa 0%, #f8f9fa 100%)',
                border: '1px solid #b2ebf2',
                boxShadow: '0 2px 8px rgba(22,160,133,0.06)',
                margin: '0 0 10px 0',
              }}
            >
              <div style={{ ...dashboardLabelStyle, color: '#009688' }}>Package Name</div>
              <div style={{ ...dashboardValueStyle, color: '#1abc9c', fontSize: '1.35rem' }}>{searchLimitInfo.package}</div>
            </div>
            <div
              style={{
                ...dashboardCardStyle,
                minWidth: '210px',
                background: 'linear-gradient(90deg, #e3f2fd 0%, #f8f9fa 100%)',
                border: '1px solid #90caf9',
                boxShadow: '0 2px 8px rgba(33,150,243,0.06)',
                margin: '0 0 10px 0',
              }}
            >
              <div style={{ ...dashboardLabelStyle, color: '#1976d2' }}>Single Screening Limit</div>
              <div style={{ ...dashboardValueStyle, color: '#3498db', fontSize: '1.35rem' }}>
                {searchLimitInfo.screeningLimit === null ? 'Unlimited' : searchLimitInfo.screeningLimit}
              </div>
            </div>
            <div
              style={{
                ...dashboardCardStyle,
                minWidth: '210px',
                background: 'linear-gradient(90deg, #fff8e1 0%, #f8f9fa 100%)',
                border: '1px solid #ffe082',
                boxShadow: '0 2px 8px rgba(255,193,7,0.06)',
                margin: '0 0 10px 0',
              }}
            >
              <div style={{ ...dashboardLabelStyle, color: '#f57c00' }}>Single Screenings Done</div>
              <div style={{ ...dashboardValueStyle, color: '#f39c12', fontSize: '1.35rem' }}>{searchLimitInfo.screeningsDone}</div>
            </div>
            <div
              style={{
                ...dashboardCardStyle,
                minWidth: '210px',
                background:
                  searchLimitInfo.screeningsLeft === 0 && searchLimitInfo.screeningLimit !== null
                    ? 'linear-gradient(90deg, #fdecea 0%, #f8f9fa 100%)'
                    : 'linear-gradient(90deg, #e8f5e9 0%, #f8f9fa 100%)',
                border:
                  searchLimitInfo.screeningsLeft === 0 && searchLimitInfo.screeningLimit !== null
                    ? '1px solid #e57373'
                    : '1px solid #c8e6c9',
                boxShadow: '0 2px 8px rgba(76,175,80,0.06)',
                margin: '0 0 10px 0',
              }}
            >
              <div style={{ ...dashboardLabelStyle, color: '#388e3c' }}>Single Screenings Left</div>
              <div
                style={{
                  ...dashboardValueStyle,
                  color:
                    searchLimitInfo.screeningsLeft === 0 && searchLimitInfo.screeningLimit !== null
                      ? '#e74c3c'
                      : '#27ae60',
                  fontSize: '1.35rem',
                }}
              >
                {searchLimitInfo.screeningsLeft === 'Unlimited' ? 'Unlimited' : searchLimitInfo.screeningsLeft}
              </div>
            </div>
          </div>
          {/* Second row - Bulk Search Info */}
          <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginTop: '8px' }}>
            <div
              style={{
                ...dashboardCardStyle,
                minWidth: '210px',
                background: 'linear-gradient(90deg, #f3e6fa 0%, #f8f9fa 100%)',
                border: '1px solid #e1bee7',
                boxShadow: '0 2px 8px rgba(156,39,176,0.06)',
                margin: '0 0 10px 0',
              }}
            >
              <div style={{ ...dashboardLabelStyle, color: '#7b1fa2' }}>Bulk Screening Limit</div>
              <div style={{ ...dashboardValueStyle, color: '#9c27b0', fontSize: '1.35rem' }}>
                {(searchLimitInfo.batchScreeningLimit === null || searchLimitInfo.batchScreeningLimit === undefined)
                  ? 'Unlimited'
                  : searchLimitInfo.batchScreeningLimit}
              </div>
            </div>
            <div
              style={{
                ...dashboardCardStyle,
                minWidth: '210px',
                background: 'linear-gradient(90deg, #ffe0b2 0%, #f8f9fa 100%)',
                border: '1px solid #ffcc80',
                boxShadow: '0 2px 8px rgba(255,152,0,0.06)',
                margin: '0 0 10px 0',
              }}
            >
              <div style={{ ...dashboardLabelStyle, color: '#e65100' }}>Bulk Screenings Done</div>
              <div style={{ ...dashboardValueStyle, color: '#ff5722', fontSize: '1.35rem' }}>
                {searchLimitInfo.batchScreeningsDone || 0}
              </div>
            </div>
            <div
              style={{
                ...dashboardCardStyle,
                minWidth: '210px',
                background:
                  searchLimitInfo.batchScreeningsLeft === 0 && searchLimitInfo.batchScreeningLimit !== null
                    ? 'linear-gradient(90deg, #fdecea 0%, #f8f9fa 100%)'
                    : searchLimitInfo.batchScreeningsLeft <= 5 && searchLimitInfo.batchScreeningLimit !== null
                    ? 'linear-gradient(90deg, #fffbe6 0%, #f8f9fa 100%)'
                    : 'linear-gradient(90deg, #e8f5e9 0%, #f8f9fa 100%)',
                border:
                  searchLimitInfo.batchScreeningsLeft === 0 && searchLimitInfo.batchScreeningLimit !== null
                    ? '1px solid #e57373'
                    : searchLimitInfo.batchScreeningsLeft <= 5 && searchLimitInfo.batchScreeningLimit !== null
                    ? '1px solid #ffe082'
                    : '1px solid #c8e6c9',
                boxShadow: '0 2px 8px rgba(76,175,80,0.06)',
                margin: '0 0 10px 0',
              }}
            >
              <div style={{ ...dashboardLabelStyle, color: '#388e3c' }}>Bulk Screenings Left</div>
              <div
                style={{
                  ...dashboardValueStyle,
                  color:
                    searchLimitInfo.batchScreeningsLeft === 0 && searchLimitInfo.batchScreeningLimit !== null
                      ? '#e74c3c'
                      : searchLimitInfo.batchScreeningsLeft <= 5 && searchLimitInfo.batchScreeningLimit !== null
                      ? '#f39c12'
                      : '#27ae60',
                  fontSize: '1.35rem',
                }}
              >
                {searchLimitInfo.batchScreeningLimit === 0
                  ? 0
                  : searchLimitInfo.batchScreeningsLeft === 'Unlimited'
                  ? 'Unlimited'
                  : searchLimitInfo.batchScreeningsLeft}
              </div>
            </div>
            <div
              style={{
                ...dashboardCardStyle,
                minWidth: '210px',
                background: 'linear-gradient(90deg, #e0f2f1 0%, #f8f9fa 100%)',
                border: '1px solid #b2dfdb',
                boxShadow: '0 2px 8px rgba(0,150,136,0.06)',
                margin: '0 0 10px 0',
              }}
            >
              <div style={{ ...dashboardLabelStyle, color: '#00695c' }}>Total Searches</div>
              <div style={{ ...dashboardValueStyle, color: '#795548', fontSize: '1.35rem' }}>
                {(searchLimitInfo.screeningsDone || 0) + (searchLimitInfo.batchScreeningsDone || 0)}
              </div>
            </div>
          </div>
          {/* Warning messages */}
          {searchLimitInfo.screeningsLeft === 0 && searchLimitInfo.screeningLimit !== null && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #e74c3c',
                borderRadius: '8px',
                padding: '10px 15px',
                marginTop: '10px',
                color: '#e74c3c',
                fontSize: '0.9rem',
              }}
            >
              <strong>Warning:</strong> This organisation has reached the maximum number of single searches allowed by their package.
              Users will not be able to perform additional single searches until the package is upgraded.
            </div>
          )}
          {searchLimitInfo.batchScreeningsLeft === 0 && searchLimitInfo.batchScreeningLimit !== null && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #e74c3c',
                borderRadius: '8px',
                padding: '10px 15px',
                marginTop: '10px',
                color: '#e74c3c',
                fontSize: '0.9rem',
              }}
            >
              <strong>Warning:</strong> This organisation has reached the maximum number of bulk searches allowed by their package.
              Users will not be able to perform additional bulk searches until the package is upgraded.
            </div>
          )}
          {searchLimitInfo.batchScreeningsLeft > 0 &&
            searchLimitInfo.batchScreeningsLeft <= 5 &&
            searchLimitInfo.batchScreeningLimit !== null && (
              <div
                style={{
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffeaa7',
                  borderRadius: '8px',
                  padding: '10px 15px',
                  marginTop: '10px',
                  color: '#856404',
                  fontSize: '0.9rem',
                }}
              >
                <strong>Notice:</strong> This organisation has only {searchLimitInfo.batchScreeningsLeft} bulk search
                {searchLimitInfo.batchScreeningsLeft === 1 ? '' : 'es'} remaining.
              </div>
            )}
        </div>
      )}

      {/* For privileged users, show a simpler search interface */}
      {isPrivilegedUser && (
        <div style={{ marginBottom: '2rem' }}>
          
          <div className="table-controls">
            <input
              type="text"
              placeholder="Search PIPs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="search-filter"
              ref={searchInputRef}
            />
            <button className="search-button" onClick={handleSearch} style={{ marginLeft: '10px', padding: '8px 20px' }}>
              Search
            </button>
            {searchTerm && (
              <button className="clear-search-button" onClick={clearSearch} style={{ marginLeft: '10px' }}>
                <FaTimes /> Clear
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Search Hero Section - Hide for privileged users or when search results are found */}
      {!isPrivilegedUser && (!searchSubmitted || allPips.length === 0) && (
        <div className="search-hero">
          <h1>Prominent Influential Persons (PIP) Search</h1>
          <p>Search for prominent influential persons or their associates by name or national ID</p>

          <div className="search-container">
            <div className="search-input-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Enter name or National ID number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="search-input"
                ref={searchInputRef}
                disabled={searchLimitInfo?.screeningsLeft === 0 && searchLimitInfo?.screeningLimit !== null}
              />
              {searchTerm && (
                <FaTimes className="clear-icon" onClick={clearSearch} />
              )}
              <button 
                className="search-button" 
                onClick={handleSearch}
                disabled={searchLimitInfo?.screeningsLeft === 0 && searchLimitInfo?.screeningLimit !== null}
              >
                Search
              </button>
            </div>
            
            {/* Search Filters */}
            <div className="search-filters">
              <div 
                className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => applyFilter('all')}
              >
                All
              </div>
              <div 
                className={`filter-chip ${activeFilter === 'pip' ? 'active' : ''}`}
                onClick={() => applyFilter('pip')}
              >
                PIPs Only
              </div>
              <div 
                className={`filter-chip ${activeFilter === 'associate' ? 'active' : ''}`}
                onClick={() => applyFilter('associate')}
              >
                Associates Only
              </div>
              <div 
                className={`filter-chip ${activeFilter === 'local' ? 'active' : ''}`}
                onClick={() => applyFilter('local')}
              >
                Local Only
              </div>
              <div 
                className={`filter-chip ${activeFilter === 'foreign' ? 'active' : ''}`}
                onClick={() => applyFilter('foreign')}
              >
                Foreign Only
              </div>
              <div 
                className="filter-chip bulk-search-button"
                onClick={
                  searchLimitInfo?.batchScreeningsLeft === 0 && searchLimitInfo?.batchScreeningLimit !== null
                    ? undefined
                    : handleBulkSearch
                }
                style={{ 
                  backgroundColor: searchLimitInfo?.batchScreeningsLeft === 0 && searchLimitInfo?.batchScreeningLimit !== null ? '#e0e0e0' : '#FFDAB9', 
                  color: searchLimitInfo?.batchScreeningsLeft === 0 && searchLimitInfo?.batchScreeningLimit !== null ? '#666' : '#000', 
                  border: '1px solid #FFA07A',
                  cursor: searchLimitInfo?.batchScreeningsLeft === 0 && searchLimitInfo?.batchScreeningLimit !== null ? 'not-allowed' : 'pointer',
                  pointerEvents: searchLimitInfo?.batchScreeningsLeft === 0 && searchLimitInfo?.batchScreeningLimit !== null ? 'none' : 'auto'
                }}
                title={searchLimitInfo?.batchScreeningsLeft === 0 && searchLimitInfo?.batchScreeningLimit !== null ? 'Batch screening limit reached' : 'Bulk Search'}
              >
                <FaUpload style={{ marginRight: '5px' }} /> Bulk Search
              </div>
            </div>
            
            {/* Search Tips */}
            <div className="search-tips">
              <FaInfoCircle className="info-icon" /> 
              <span>Tip: Search by full name or partial name. Use ID number for exact matches.</span>
            </div>
            
            {/* Recent searches suggestions */}
            {searchHistory.length > 0 && !searchTerm && (
  <div className="search-filters" style={{ marginTop: '1rem' }}>
    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>Recent searches:</span>
    {searchHistory.map((search, index) => {
  const formatted = formatSearchHistoryDisplay(search);
  return (
    <div 
      key={index} 
      className="filter-chip"
      data-bulk={formatted.isBulk ? "true" : "false"} // Add this line
      onClick={formatted.isBulk ? undefined : () => applySuggestion(formatted.fullQuery)}
          style={{ 
            backgroundColor: formatted.isBulk ? 'rgba(156, 39, 176, 0.3)' : 'rgba(255,255,255,0.4)',
            position: 'relative',
            paddingRight: formatted.isBulk ? '80px' : '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: formatted.isBulk ? '1px solid rgba(156, 39, 176, 0.5)' : 'none',
            cursor: formatted.isBulk ? 'default' : 'pointer',
            opacity: formatted.isBulk ? 0.9 : 1
          }}
          title={formatted.isBulk ? `Bulk search with ${formatted.recordCount} records - Click "View all" to see details` : formatted.fullQuery}
        >
          {formatted.isBulk && (
            <FaUpload style={{ fontSize: '0.8rem', opacity: 0.8 }} />
          )}
          <span style={{ fontSize: '0.85rem' }}>{formatted.display}</span>
          {formatted.isBulk && (
            <span 
              style={{
                position: 'absolute',
                right: '8px',
                fontSize: '0.75rem',
                color: '#1976d2',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontWeight: '500'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setFullQueryToShow(formatted.fullQuery);
                setShowQueryModal(true);
              }}
            >
              View all
            </span>
          )}
        </div>
      );
    })}
  </div>
)}
          </div>
        </div>
      )}
      

      {/* Export Button, Table Search, Approximity Slider, and Result Count */}
      {getPipsLength() > 0 && (
        <div className="search-results-info" id="search-results" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="search-count" style={{ flex: 1 }}>
            {bulkSearchInfo ? (
              <>
                Bulk Search Results: Found {getPipsLength()} PIPs from {bulkSearchInfo.totalSearched} searched records
                {!isPrivilegedUser && (
                  <button className="clear-search-button" onClick={clearSearch}>
                    <FaTimes /> Clear Search
                  </button>
                )}
              </>
            ) : (

              <>
                Showing {currentPips.length} of {getPipsLength()} {searchTerm ? `results for "${searchTerm}"` : 'total PIPs'}
                {!isPrivilegedUser && searchTerm && (
                  <button className="clear-search-button" onClick={clearSearch}>
                    <FaTimes /> Clear Search
                  </button>
                )}
              </>
            )}
          </div>
          {/* Table search field */}
          <input
            type="text"
            className="table-search-input"
            placeholder="Search table..."
            value={tableSearch}
            onChange={e => {
              setTableSearch(e.target.value);
              setCurrentPage(1);
            }}
            style={{ marginRight: 12, minWidth: 140, maxWidth: 200, border: '1px solid #bbb', borderRadius: 4, padding: '6px 10px', fontSize: '0.98rem' }}
          />
          {/* Approximity slider: show if not bulk search, or if bulk search and tableSearch is not empty */}
          {(!bulkSearchInfo || (bulkSearchInfo && tableSearch.trim())) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 170 }}>
              <span style={{ fontSize: '0.92rem', color: '#555' }}>Search Score:</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={minSimilarity}
                onChange={e => {
                  setMinSimilarity(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{ width: 80 }}
              />
              <span style={{ fontSize: '0.92rem', color: '#1976d2', minWidth: 28, textAlign: 'right' }}>{minSimilarity}</span>
            </div>
          )}
          <div className="button-group">
            <button className="export-button" onClick={exportPDF}>Export PDF</button>
          </div>
        </div>
      )}
      
      {/* Loading and Error Messages */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="loading-spinner"></div>
          <div style={{ marginTop: '1rem', color: '#6c757d' }}>Searching for results...</div>
        </div>
      )}
      
      {/* Error Messages - Enhanced styling */}
      {error && (
        <AlertBanner
          type="danger"
          message={error}
          onClose={() => setError(null)}
          actions={
            error.includes('administrator') ? 
            [{ label: 'Contact Support', onClick: () => window.location.href = 'mailto:support@company.com', primary: true }] : 
            undefined
          }
        />
      )}
      
      {/* No Results State */}
      {!loading && searchSubmitted && allPips.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#b00020', fontWeight: '500' }}>
          No results found for "<strong>{searchTerm}</strong>"
        </div>
      )}
      
      {/* Results Table */}
      {!loading && allPips.length > 0 && (
        <div className="table-container">
          <table className="pips-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={currentPips.length > 0 && currentPips.every(p => selectedPipIds.includes(p.id))}
                    onChange={e => handleSelectAll(e.target.checked)}
                    title="Select all on page"
                  />
                </th>
                <th onClick={() => handleSort('full_name')}>
                  Full Name {sortColumn === 'full_name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                {/* National ID column removed */}
                <th onClick={() => handleSort('pip_type')}>
                  PIP Classification {sortColumn === 'pip_type' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th>Institution</th>
                <th>Position</th>
                <th>Country</th>
                <th>PIP Result Overview</th>
                <th>Associates</th>
                {/* Approximity Score column removed */}
                {isPrivilegedUser && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {currentPips.map((pip, index) => {
                const hasAssociates = pip.associates && pip.associates.length > 0;
                const checked = selectedPipIds.includes(pip.id);
                return (
                  <React.Fragment key={pip.id}>
                    {/* Main PIP Row */}
                    <tr className="pip-main-row">
                      <td>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => handleSelectOne(pip.id, e.target.checked)}
                          title="Select row"
                        />
                      </td>
                      <td className="pip-name">{pip.full_name}</td>
                      {/* National ID cell removed */}
                      <td>
                        <span className={`pip-type-badge ${pip.pip_type.toLowerCase()}`}>
                          {pip.pip_type}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{Array.isArray(pip.institutions) && pip.institutions.length > 0 ? pip.institutions.map(inst => inst.institution_name || '').filter(Boolean).join(', ') : 'N/A'}</td>
                      <td style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{pip.position || 'N/A'}</td>
                      <td>{pip.country || 'Namibia'}</td>
                      <td style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{getPipResultOverview(pip)}</td>
                      <td>
                        {hasAssociates
                          ? `${pip.associates.length} associate${pip.associates.length > 1 ? 's' : ''}`
                          : <span style={{ fontStyle: 'italic', color: '#aaa' }}>Not Yet Captured</span>
                        }
                      </td>
                      {/* Approximity Score cell removed */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {/* Status indicator */}
                          {isPrivilegedUser && (
                            <span 
                              className={`status-indicator ${pip.is_active !== false ? 'active' : 'inactive'}`} 
                              title={pip.is_active !== false ? 'Active' : 'Inactive'}
                            />
                          )}
                          <ActionDropdown 
                            pip={pip}
                            onEdit={() => handleEdit(pip, false)}
                            onViewDetails={() => handleEdit(pip, true)}
                            isPrivilegedUser={isPrivilegedUser}
                            onToggleStatus={(newStatus) => handleToggleStatus(pip.id, newStatus)}
                          />
                        </div>
                      </td>
                    </tr>
                    {/* Associate Rows - align with Full Name column */}
                    {hasAssociates && pip.associates.map((assoc, assocIndex) => (
                      <tr key={`${pip.id}-assoc-${assocIndex}`} className="associate-row">
                        <td></td>
                        <td className="associate-name" style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
                          <span className="associate-indicator">↳</span> {getAssociateName(assoc)}
                          {assoc.national_id && (
                            <span className="associate-id"> (ID: {assoc.national_id})</span>
                          )}
                        </td>
                        {/* National ID cell removed */}
                        <td></td>
                        <td className="associate-relationship">{assoc.relationship_type}</td>
                        {/* Institution Name */}
                        <td style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}></td>
                        {/* Position */}
                        <td style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        {isPrivilegedUser && <td></td>}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && allPips.length > 0 && (
        <div className="pagination">
          <button onClick={() => setCurrentPage((c) => c - 1)} disabled={currentPage === 1}>← Prev</button>
          {renderPagination()}
          <button onClick={() => setCurrentPage((c) => c + 1)} disabled={currentPage === totalPages}>Next →</button>
        </div>
      )}

      {/* Unmatched Bulk Search Records Table: show below pagination and results table */}
      {bulkSearchInfo && bulkSearchInfo.unmatchedKeywords && bulkSearchInfo.unmatchedKeywords.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ fontWeight: 700, color: '#ad6800', fontSize: '1.25rem', marginBottom: 8, textAlign: 'center' }}>
            UNMATCHED BULK SEARCH RECORDS
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <table style={{ width: '90%', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, marginTop: 0 }}>
              <thead>
                <tr style={{ color: '#ad6800', fontWeight: 700, fontSize: '1rem' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Unmatched Bulk Keywords</th>
                </tr>
              </thead>
              <tbody>
                {bulkSearchInfo.unmatchedKeywords.map((keyword, idx) => (
                  <tr key={idx} style={{ color: '#ad6800', fontSize: '0.98rem' }}>
                    <td style={{ padding: '6px 10px' }}>{keyword}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
            {/* Edit Modal */}
      <EditPipModal
        showEditModal={showEditModal}
        closeEditModal={closeEditModal}
        editingPip={editingPip}
        editCurrentStep={editCurrentStep}
        editCompletedSteps={editCompletedSteps}
        handleEditStepClick={handleEditStepClick}
        successMessage={successMessage}
        savingStep={savingStep}
        handleSaveStep={handleSaveStep}
        // Form states
        editFirstName={editFirstName}
        setEditFirstName={setEditFirstName}
        editMiddleName={editMiddleName}
        setEditMiddleName={setEditMiddleName}
        editLastName={editLastName}
        setEditLastName={setEditLastName}
        editNationalId={editNationalId}
        editAssociates={editAssociates}
        editInstitutions={editInstitutions}
        editForeignDetails={editForeignDetails}
        editValidationErrors={editValidationErrors}
        setEditValidationErrors={setEditValidationErrors}
        // Handler functions
        handleEditNationalIdChange={handleEditNationalIdChange}
        handleEditAssociateChange={handleEditAssociateChange}
        addEditAssociate={addEditAssociate}
        removeEditAssociate={removeEditAssociate}
        handleEditInstitutionChange={handleEditInstitutionChange}
        addEditInstitution={addEditInstitution}
        removeEditInstitution={removeEditInstitution}
        handleEditCountryChange={handleEditCountryChange}
        selectEditCountry={selectEditCountry}
        editSuggestions={editSuggestions}
        viewMode={viewMode}
        user={user}
      />

      {/* Bulk Search Modal */}
      {showBulkSearchModal && (
        <div className="modal-overlay" onClick={closeBulkSearchModal}>
          <BulkSearchForm 
            closeModal={closeBulkSearchModal} 
            onSearchComplete={handleBulkSearchComplete}
          />
        </div>
      )}

      {/* Full Query Modal */}
      {showQueryModal && (
        <div className="modal-overlay" onClick={() => setShowQueryModal(false)}>
          <div className="modal-content" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Bulk Search Details</h3>
              <button className="modal-close" onClick={() => setShowQueryModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              {(() => {
                try {
                  const records = JSON.parse(fullQueryToShow);
                  if (Array.isArray(records)) {
                    return (
                      <div>
                        <p style={{ marginBottom: '15px', fontWeight: '500' }}>
                          Total Records: {records.length}
                        </p>
                        <div style={{ 
                          maxHeight: '400px', 
                          overflow: 'auto',
                          backgroundColor: '#f5f5f5',
                          padding: '15px',
                          borderRadius: '4px'
                        }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #ddd' }}>
                                <th style={{ padding: '8px', textAlign: 'left' }}>#</th>
                                <th style={{ padding: '8px', textAlign: 'left' }}>First Name</th>
                                <th style={{ padding: '8px', textAlign: 'left' }}>Middle Name</th>
                                <th style={{ padding: '8px', textAlign: 'left' }}>Last Name</th>
                                <th style={{ padding: '8px', textAlign: 'left' }}>National ID</th>
                              </tr>
                            </thead>
                            <tbody>
                              {records.map((record, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                  <td style={{ padding: '8px' }}>{idx + 1}</td>
                                  <td style={{ padding: '8px' }}>{record.first_name || '-'}</td>
                                  <td style={{ padding: '8px' }}>{record.middle_name || '-'}</td>
                                  <td style={{ padding: '8px' }}>{record.last_name || '-'}</td>
                                  <td style={{ padding: '8px' }}>{record.national_id || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  }
                } catch (e) {
                  // Fallback to raw display
                  return (
                    <pre style={{ 
                      whiteSpace: 'pre-wrap', 
                      wordBreak: 'break-word',
                      backgroundColor: '#f5f5f5',
                      padding: '15px',
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                      maxHeight: '400px',
                      overflow: 'auto'
                    }}>
                      {formatJsonForDisplay(fullQueryToShow)}
                    </pre>
                  );
                }
              })()}
              
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  className="button-secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(fullQueryToShow);
                    alert('Query copied to clipboard!');
                  }}
                >
                  Copy JSON
                </button>
                <button 
                  className="button-secondary"
                  onClick={() => setShowQueryModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PIPs;
