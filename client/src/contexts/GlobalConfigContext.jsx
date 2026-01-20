import React, { createContext, useState, useEffect, useContext } from 'react';

const GlobalConfigContext = createContext();

export const useGlobalConfig = () => useContext(GlobalConfigContext);

export const GlobalConfigProvider = ({ children }) => {
    // Initialize from localStorage or default
    const [timeFilter, setTimeFilter] = useState(() => {
        try {
            const saved = localStorage.getItem('globalTimeFilter');
            return saved ? JSON.parse(saved) : {
                startDate: '',
                endDate: '',
                startTime: '',
                endTime: ''
            };
        } catch (e) {
            console.error("Failed to load time filter from localStorage", e);
            return { startDate: '', endDate: '', startTime: '', endTime: '' };
        }
    });

    // Save to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('globalTimeFilter', JSON.stringify(timeFilter));
        } catch (e) {
            console.error("Failed to save time filter to localStorage", e);
        }
    }, [timeFilter]);

    const value = {
        timeFilter,
        setTimeFilter
    };

    return (
        <GlobalConfigContext.Provider value={value}>
            {children}
        </GlobalConfigContext.Provider>
    );
};
