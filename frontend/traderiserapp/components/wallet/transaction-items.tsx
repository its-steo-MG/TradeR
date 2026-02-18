// components/wallet/transaction-items.tsx
import Image from "next/image";

interface TransactionItemProps {
  transaction: {
    id: number;
    type: string;
    amount: string;
    convertedAmount?: string;
    date: string;
    transactionType: string;
    exchangeRateUsed?: number;
    status: string;
    currency?: { code: string };
    target_currency?: { code: string };
    reference_id?: string;
    checkout_request_id?: string;
  };
  onClick: () => void;
}

export function TransactionItem({ transaction, onClick }: TransactionItemProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "success":
        return "text-green-600 bg-green-50";
      case "pending":
        return "text-yellow-600 bg-yellow-50";
      case "failed":
      case "error":
        return "text-red-600 bg-red-50";
      default:
        return "text-slate-600 bg-slate-50";
    }
  };

  // Format amount cleanly in USD (or fallback currency)
  const formatCurrency = (value: string | number, currency: string = "USD") => {
    const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]+/g, "")) : Number(value);
    if (isNaN(num)) return String(value);

    return (
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num) +
      ` ${currency}`
    );
  };

  // Select unique icon based on transaction type
  const txType = transaction.transactionType.toLowerCase();
  let imageSrc = "/transaction-icon.png"; // fallback

  switch (txType) {
    case "deposit":
      imageSrc = "/real-account-icon.png";           // e.g. green money bag or M-Pesa receive
      break;
    case "withdrawal":
      imageSrc = "/transaction-icon.png";        // your original outgoing icon
      break;
    case "transfer_in":
      imageSrc = "/transfer-in-icon.png";       // incoming transfer (green arrow / receive from user)
      break;
    case "transfer_out":
      imageSrc = "/transfer-in-icon.png";      // outgoing transfer (purple arrow / send to user)
      break;
    default:
      imageSrc = "/transaction-icon.png";
  }

  // Use converted_amount if available (for transfers it's the same as amount, but in USD)
  const displayAmount = transaction.convertedAmount
    ? formatCurrency(transaction.convertedAmount, transaction.target_currency?.code || "USD")
    : formatCurrency(transaction.amount, transaction.currency?.code || "USD");

  // Clean display label: "Transfer In", "Transfer Out", etc.
  const displayType = transaction.type
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return (
    <div
      className="flex items-center justify-between p-4 sm:p-6 hover:bg-slate-50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Left: Icon + Details */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center overflow-hidden shadow-md">
            <Image
              src={imageSrc}
              alt={`${displayType} Transaction`}
              width={64}
              height={64}
              className="w-10 h-10 sm:w-11 sm:h-11 object-cover"
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm sm:text-base truncate">
            {displayType}
          </p>
          <p className="text-xs sm:text-sm text-slate-500">{transaction.date}</p>
        </div>
      </div>

      {/* Right: Amount + Status */}
      <div className="flex flex-col items-end gap-2 ml-3 sm:ml-4 flex-shrink-0">
        <p className="font-bold text-slate-900 text-sm sm:text-base">
          {displayAmount}
        </p>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
        </span>
      </div>
    </div>
  );
}