export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('vi-VN').format(num);
};

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const getVietQRUrl = ({
  bank = 'MB',
  accountNo = '0909999888',
  accountName = 'NGUYEN VAN QUAN',
  amount,
  description,
}: {
  bank?: string;
  accountNo?: string;
  accountName?: string;
  amount: number;
  description: string;
}): string => {
  const cleanDesc = encodeURIComponent(description.replace(/[^a-zA-Z0-9 ]/g, ''));
  const cleanName = encodeURIComponent(accountName);
  return `https://img.vietqr.io/image/${bank}-${accountNo}-compact2.png?amount=${amount}&addInfo=${cleanDesc}&accountName=${cleanName}`;
};
