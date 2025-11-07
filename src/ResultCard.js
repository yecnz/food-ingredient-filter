import React from "react"; // 결과 카드 더미 제작

const statusColors = {
  safe: "bg-green-200 text-green-900",   // 초록 = 안전
  warning: "bg-yellow-200 text-yellow-900", // 노랑 = 주의
  danger: "bg-red-200 text-red-900"    // 빨강 = 경고
};

const ResultCard = ({ status, message }) => {
  return (
    <div className={`p-6 rounded-2xl shadow-md ${statusColors[status]} w-72`}>
      <h2 className="text-xl font-bold mb-2">
        {status === "safe" && "✅ 안전"}
        {status === "warning" && "⚠️ 주의"}
        {status === "danger" && "🚨 경고"}
      </h2>
      <p>{message}</p>
    </div>
  );
};

export default ResultCard;
