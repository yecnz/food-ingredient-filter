// web-app/src/ResultCard.js

import React from "react"; 

// 상태별 Tailwind CSS 클래스 정의
const statusColors = {
  safe: "bg-green-200 text-green-900", 
  warning: "bg-yellow-200 text-yellow-900", 
  danger: "bg-red-200 text-red-900" 
}; 

const ResultCard = ({ status, message }) => { 
    return ( 
      <div className={`result-card ${status}`}> 
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