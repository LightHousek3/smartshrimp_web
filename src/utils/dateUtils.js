export const formatDate = (dateString, format = 'dd/MM/yyyy') => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date)) return '';

    const pad = (n) => String(n).padStart(2, '0');

    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hour = pad(date.getHours());
    const minute = pad(date.getMinutes());
    const second = pad(date.getSeconds());

    switch (format) {
        case 'dd/MM/yyyy':
            return `${day}/${month}/${year}`;

        case 'HH:mm':
            return `${hour}:${minute}`;

        case 'HH:mm dd/MM/yyyy':
            return `${hour}:${minute} ${day}/${month}/${year}`;

        case 'yyyy-MM-dd':
            return `${year}-${month}-${day}`;

        case 'yyyy-MM-dd[T]HH:mm:ss':
            return `${year}-${month}-${day}T${hour}:${minute}:${second}`;

        default:
            return date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
    }
};
