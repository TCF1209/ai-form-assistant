import { useState, useCallback } from 'react';
import { getErrorMessage } from '../utils/helpers';

/**
 * Custom hook for making API calls with loading and error states
 * @param {Function} apiFunction - API function to call
 * @returns {Object} Object containing data, loading, error, and execute function
 */
export const useApi = (apiFunction) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiFunction(...args);
        setData(response);

        return { success: true, data: response };
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);

        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
};

/**
 * Custom hook for making API calls immediately on mount
 * @param {Function} apiFunction - API function to call
 * @param {Array} dependencies - Dependencies array for useEffect
 * @returns {Object} Object containing data, loading, error, and refetch function
 */
export const useApiOnMount = (apiFunction, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiFunction();
      setData(response);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [apiFunction, ...dependencies]);

  // Fetch data on mount
  useState(() => {
    fetchData();
  });

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    reset,
  };
};

export default useApi;
