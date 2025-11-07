// web-app/src/AnalysisModal.js

import React from 'react';
import ResultCard from './ResultCard';

const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // 최상위 레이어
};

const contentStyle = {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '15px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    maxWidth: '90%',
    maxHeight: '90%',
    overflowY: 'auto',
    textAlign: 'center',
};

const containerStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '20px',
    marginTop: '20px',
    paddingBottom: '10px',
};

const AnalysisModal = ({ show, onClose, results, checkedIngredients }) => {
    if (!show) {
        return null;
    }

    const filteredResults = results.map(item => {
        // 더미 로직: 체크된 성분이 있으면 "danger"로 간주
        const isDanger = checkedIngredients.some(checked => item.message.includes(checked));
        
        let status = item.status;
        if (isDanger) {
            status = 'danger';
        }
        
        return { ...item, status };
    });

    return (
        <div style={modalStyle}>
            <div style={contentStyle}>
                <h2>📊 성분 분석 결과</h2>
                <p style={{marginBottom: '20px', color: '#555'}}>
                    체크된 위험 성분: **{checkedIngredients.join(', ') || '없음'}**
                </p>
                
                <div style={containerStyle}>
                    {/* ResultCard 컴포넌트를 사용 */}
                    {filteredResults.map((result, index) => (
                        <ResultCard 
                            key={index} 
                            status={result.status} 
                            message={result.message} 
                        />
                    ))}
                </div>

                <button 
                    onClick={onClose} 
                    style={{
                        marginTop: '30px',
                        padding: '10px 20px',
                        backgroundColor: '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                    }}
                >
                    닫기
                </button>
            </div>
        </div>
    );
};

export default AnalysisModal;