import React, { createContext, useContext, useReducer } from 'react';

const AnalysisContext = createContext(null);

const initialState = {
  status: 'idle', // idle | uploading | analyzing | complete | error
  report: null,
  error: null,
  progress: 0,
  progressMessage: '',
};

function analysisReducer(state, action) {
  switch (action.type) {
    case 'START_UPLOAD':
      return { ...state, status: 'uploading', error: null, progress: 0, progressMessage: 'Uploading documents...' };
    case 'START_ANALYSIS':
      return { ...state, status: 'analyzing', progress: 10, progressMessage: 'Initiating forensic analysis...' };
    case 'UPDATE_PROGRESS':
      return { ...state, progress: action.progress, progressMessage: action.message };
    case 'ANALYSIS_COMPLETE':
      return { ...state, status: 'complete', report: action.report, progress: 100, progressMessage: 'Analysis complete' };
    case 'ANALYSIS_ERROR':
      return { ...state, status: 'error', error: action.error, progress: 0, progressMessage: '' };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function AnalysisProvider({ children }) {
  const [state, dispatch] = useReducer(analysisReducer, initialState);

  return (
    <AnalysisContext.Provider value={{ state, dispatch }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
}
