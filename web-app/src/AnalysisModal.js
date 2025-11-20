// web-app/src/AnalysisModal.js 

import React, { useState } from 'react';
import { ingredientInfo } from './ingredientInfo';
import BookmarkForm from './BookmarkForm';

function AnalysisModal({ show, onClose, results, checkedIngredients }) {
    
    const [deepDiveInfo, setDeepDiveInfo] = useState(null);

    if (!show) {
        return null;
    }

    const userCheckedAllergens = checkedIngredients || [];

    const summaryForBookmark = {
        status: results.some(r => r.status === 'danger') ? 'danger' 
              : results.some(r => r.status === 'warning') ? 'warning' 
              : 'safe',
        ingredients: results.flatMap(r => r.ingredients || [])
    };

    const handleIngredientClick = (ingredientName) => {
        const info = ingredientInfo[ingredientName];
        if (info) {
            setDeepDiveInfo(info);
        } else {
            setDeepDiveInfo({
                title: ingredientName,
                description: "현재 이 성분에 대한 세부 정보가 준비되지 않았습니다."
            });
        }
    };

    const renderDeepDiveModal = () => {
        if (!deepDiveInfo) return null;

        return (
            <div className="deep-dive-backdrop" onClick={() => setDeepDiveInfo(null)}>
                <div className="deep-dive-content" onClick={(e) => e.stopPropagation()}>
                    <h3>🔍 성분 더 알아보기: {deepDiveInfo.title}</h3>
                    <p>{deepDiveInfo.description}</p>
                    <button 
                        onClick={() => setDeepDiveInfo(null)}
                        className="change-image-button"
                    >
                        닫기
                    </button>
                </div>
            </div>
        );
    };


    return (
        <>
            <div className="modal-backdrop" onClick={onClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>

                    <h2>📊 성분 분석 결과</h2>
                    
                    <p style={{marginBottom: '20px', color: '#555'}}>
                        사용자가 체크한 성분: <strong>{userCheckedAllergens.join(', ') || '없음'}</strong>
                    </p>
                    
                    <div className="result-card-container">
                        {results.map((result, index) => {
                            
                            let status = result.status;
                            let headerText = "";
                            let content = null;

                            if (result.status === 'safe') {
                                headerText = "✅ 안전";
                                content = <p>{result.message}</p>;
                            } 
                            else if (result.status === 'danger' && result.type === '알레르기') {
                                headerText = "🚨 경고";
                                const checkedList = userCheckedAllergens.join(', ');
                                
                                content = (
                                    <p>
                                        알레르기 성분으로 체크한 <strong>"{checkedList}"</strong> 중
                                        {result.ingredients.map((ing, i) => (
                                            <strong 
                                                key={i} 
                                                className="clickable-ingredient"
                                                onClick={() => handleIngredientClick(ing)}
                                            >
                                                {ing}
                                            </strong>
                                        ))}
                                        (이)가 포함되어 있습니다.
                                    </p>
                                );
                            } 
                            else if (result.status === 'warning' && result.type === '기타기피') {
                                headerText = "⚠️ 주의";
                                content = (
                                    <p>
                                        기타 기피 성분으로 체크한
                                        {result.ingredients.map((ing, i) => (
                                            <strong 
                                                key={i} 
                                                className="clickable-ingredient"
                                                onClick={() => handleIngredientClick(ing)}
                                            >
                                                {ing}
                                            </strong>
                                        ))}
                                        (이)가 포함되어 있습니다.
                                    </p>
                                );
                            }
                            else if (result.status === 'danger') {
                                headerText = `❌ ${result.type || '오류'}`;
                                content = <p>{result.ingredients.join(', ')}</p>;
                            }
                            else {
                                headerText = "ℹ️ 정보";
                                content = <p>{result.message || "결과를 처리 중입니다."}</p>;
                            }

                            return (
                                <div key={index} className={`result-card ${status}`}>
                                    <h2>{headerText}</h2>
                                    {content}
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ 
                        marginTop: '40px',      // 위쪽 여백을 40px로 늘림 (결과와 떨어뜨림)
                        marginBottom: '20px',   
                        maxWidth: '400px',      // 가로 너비를 350px로 제한 (좁게 만듦)
                        marginLeft: 'auto',     // 왼쪽 자동 여백 (가운데 정렬)
                        marginRight: 'auto'     // 오른쪽 자동 여백 (가운데 정렬)
                    }}>
                        <BookmarkForm analysisResult={summaryForBookmark} />
                    </div>
                    <button 
                        onClick={onClose}
                        className="analyze-button"
                        style={{marginTop: '10px'}}
                    >
                        닫기
                    </button>
                </div>
            </div>
            
            {renderDeepDiveModal()}
        </>
    );
};

export default AnalysisModal;