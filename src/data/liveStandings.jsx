import React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { fetchSessionData } from '../redux/sessionSlice.js';
import { LoadingSpinner } from '../components/LoadingSpinner.jsx';
import { Stints } from './stints.jsx';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const UPDATE_INTERVAL = 30000; // Increase to 30 seconds

// Create axios instance with default config
const api = axios.create({
  timeout: 5000,
  headers: {
    'Accept': 'application/json'
  }
});

// Add response interceptor for rate limiting
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 429) {
      // Wait for the rate limit to reset
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);

export const LiveStandings = () => {
    const [liveStandings, setLiveStandings] = useState({});
    const [drivers, setDrivers] = useState([]);
    const [stintsData, setStintsData] = useState([]); // State to hold stints data
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const handleStintsData = () => {
      setStintsData(Stints);
    }
    
    const dispatch = useDispatch();
    const { session, loading: sessionLoading, error: sessionError } = useSelector((state) => state.session);

    useEffect(() => {
      dispatch(fetchSessionData());
    }, [dispatch]);

    const sessionKey = session?.session_key;
    const sessionType = session?.session_type;

    // Fetch list of drivers with retry logic
    useEffect(() => {
      if(!sessionKey) return;
      
      let retryCount = 0;
      const fetchDrivers = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const response = await api.get(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`);
          setDrivers(response.data);
          setIsLoading(false);
        } catch (err) {
          console.error("Error fetching drivers:", err);
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(fetchDrivers, RETRY_DELAY * retryCount);
          } else {
            setError('Failed to fetch drivers data. Please try again later.');
            setIsLoading(false);
          }
        }
      };
      fetchDrivers();
    }, [sessionKey]);

    // Fetch standings data with optimized batching based on session type
    useEffect(() => {
      if (!sessionKey || drivers.length === 0) return;

      let isMounted = true;
      let retryCount = 0;

      const fetchData = async () => {
        try {
          const allDriversStandings = {};
          const batchSize = 5;

          for (let i = 0; i < drivers.length; i += batchSize) {
            const batch = drivers.slice(i, i + batchSize);
            const batchPromises = batch.map(async (driver) => {
              try {
                let response;
                if (sessionType === "Race") {
                  response = await api.get(`https://api.openf1.org/v1/intervals?session_key=${sessionKey}&driver_number=${driver.driver_number}`);
                } else {
                  response = await api.get(`https://api.openf1.org/v1/position?session_key=${sessionKey}&driver_number=${driver.driver_number}`);
                }
                if (response.data && response.data.length > 0) {
                  allDriversStandings[driver.driver_number] = response.data[response.data.length - 1];
                }
              } catch (err) {
                if (err.response?.status === 429) {
                  console.error(`Rate limit exceeded for driver ${driver.driver_number}. Retrying...`);
                  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * 2)); // Wait longer before retrying
                  return fetchData(); // Retry fetching data for this driver
                } else {
                  console.error(`Error fetching data for driver ${driver.driver_number}:`, err);
                }
              }
            });

            await Promise.all(batchPromises);

            if (i + batchSize < drivers.length) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Increase delay between batches
            }
          }

          if (isMounted) {
            setLiveStandings(allDriversStandings);
            setError(null);
          }
        } catch (err) {
          console.error("Error fetching standings:", err);
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(fetchData, RETRY_DELAY * retryCount);
          } else if (isMounted) {
            setError('Failed to fetch standings data. Please try again later.');
          }
        }
      };

      fetchData();
      const intervalId = setInterval(fetchData, UPDATE_INTERVAL);

      return () => {
        isMounted = false;
        clearInterval(intervalId);
      };
    }, [sessionKey, drivers, sessionType]);

    if(sessionLoading || isLoading) return <LoadingSpinner />;
    if(sessionError || error) return <LoadingSpinner />;

    // Process and sort the standings data
    const processStandingsData = () => {
      if (!liveStandings || Object.keys(liveStandings).length === 0) return [];
      
      const driverMap = {};
      drivers.forEach(driver => {
        driverMap[driver.driver_number] = driver;
      });
      
      const processedData = Object.entries(liveStandings).map(([driverNumber, data]) => {
        const driver = driverMap[driverNumber] || { full_name: `Driver ${driverNumber}` };
        return {
          ...data,
          driver_name: driver.full_name,
          gap_to_leader: data.gap_to_leader || 0
        };
      });

      // Sort based on session type
      if (sessionType === "Race") {
        return processedData.sort((a, b) => a.gap_to_leader - b.gap_to_leader);
      } else {
        return processedData.sort((a, b) => a.position - b.position);
      }
    };

    const sortedStandings = processStandingsData();

    return (
      <div className="bg-[#1a1a1a]/80 backdrop-blur-sm rounded-2xl shadow-xl border border-[#2a2a2a] p-8">
        <h2 className="text-3xl font-bold text-[#f5f5f5] mb-6 flex items-center">
          <svg className="w-8 h-8 mr-3 text-[#b50000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Live Standings
        </h2>
        {sortedStandings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-[#2a2a2a] rounded-xl">
              <thead>
                <tr className="border-b border-[#3a3a3a]">
                  <th className="py-3 px-4 text-left text-[#f5f5f5] font-semibold">Position</th>
                  <th className="py-3 px-4 text-left text-[#f5f5f5] font-semibold">Driver</th>
                  {sessionType === "Race" && (
                    <th className="py-3 px-4 text-left text-[#f5f5f5] font-semibold">Gap to Leader</th>
                  )}
                  <th className="py-3 px-4 text-left text-[#f5f5f5] font-semibold">Compound</th>
                  <th className="py-3 px-4 text-left text-[#f5f5f5] font-semibold">Tyres Age</th>
                  <th className="py-3 px-4 text-left text-[#f5f5f5] font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedStandings.map((item, index) => {
                  const stintData = stintsData.find(stint => stint.driver_number === item.driver_number);
                  return (
                    <tr key={item.driver_number} className={`border-b border-[#3a3a3a] hover:bg-[#333] transition-colors duration-200 ${index % 2 === 0 ? 'bg-[#2a2a2a]' : 'bg-[#252525]'}`}>
                      <td className="py-3 px-4 text-[#f5f5f5]">{index + 1}</td>
                      <td className="py-3 px-4 text-[#f5f5f5]">{item.driver_name}</td>
                      {sessionType === "Race" && (
                        <td className="py-3 px-4 text-[#f5f5f5]">
                          {index === 0 ? 'Leader' : `${item.gap_to_leader?.toFixed(3)}s`}
                        </td>
                      )}
                      <td className="py-3 px-4 text-[#f5f5f5]">{stintData ? stintData.compound : 'N/A'}</td>
                      <td className="py-3 px-4 text-[#f5f5f5]">{stintData ? stintData.lap_end : 'N/A'}</td>
                      <td className="py-3 px-4 text-[#f5f5f5]">{item.status || 'Running'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <LoadingSpinner />
        )}
      </div>
    );
}