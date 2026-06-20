import React from 'react';

export const useNotification = () => {
    const [notification, setNotification] = React.useState(null);

    const showNotification = (message, type = 'success', duration = 3000) => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), duration);
    };

    return { notification, showNotification };
};
