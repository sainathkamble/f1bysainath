import React, { useEffect } from 'react';
import { useState } from 'react';
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { fetchSessionData } from '../redux/sessionSlice.js';

export const Stints = ({ setStintsData }) => {
    const [drivers, setDrivers] = useState([]);
    const dispatch = useDispatch();

    const { session } = useSelector((state) => state.session);
    const sessionKey = session?.session_key;

    useEffect(() => {
        dispatch(fetchSessionData());
    }, [dispatch]);

    // Fetch list of drivers
    const fetchDrivers = async () => {
        if (!sessionKey) return [];
        try {
            const response = await axios.get(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`);
            return response.data;
        } catch (err) {
            console.error("Error fetching drivers:", err);
            return [];
        }
    };

    // Fetch stint data
    const fetchStintData = async (drivers) => {
        if (!sessionKey || drivers.length === 0) return [];
        const allDriversStints = [];

        for (const driver of drivers) {
            const driverNumber = driver.driver_number;
            try {
                const response = await axios.get(`https://api.openf1.org/v1/stints?session_key=${sessionKey}&driver_number=${driverNumber}`);
                if (response.data && response.data.length > 0) {
                    const lastStint = response.data[response.data.length - 1];
                    console.log(lastStint);
                    allDriversStints.push({
                        driver_number: driverNumber,
                        compound: lastStint.compound || 'N/A',
                        lap_end: lastStint.lap_end || 'N/A'
                    });
                }
            } catch (err) {
                console.error(err);
            }
        }
        console.log(allDriversStints);
        return allDriversStints;
    };

    useEffect(() => {
        const fetchData = async () => {
            const drivers = await fetchDrivers();
            setDrivers(drivers);
            const stintsData = await fetchStintData(drivers);
            setStintsData(stintsData);
        };

        fetchData();
    }, [sessionKey]);

    return null;
};