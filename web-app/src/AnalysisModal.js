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
    zIndex: 1000,
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


function AnalysisModal({ show, onClose, results, checkedIngredients }) {
    if (!show) {
        return null;
    }

    // 'checkedIngredients'가 비어있을 경우 대비 (기본값)
    const userCheckedAllergens = checkedIngredients || [];

    return (
        <div style={modalStyle}>
            <div style={contentStyle}>
                <h2>📊 성분 분석 결과</h2>
                
                {/* [수정] 이 부분은 '사용자가 체크한 목록'만 표시하도록 단순화 */}
                <p style={{marginBottom: '20px', color: '#555'}}>
                    사용자가 체크한 성분: <strong>{userCheckedAllergens.join(', ') || '없음'}</strong>
                </p>
                
                <div style={containerStyle}>
                    {results.map((result, index) => {
                        
                        let message = ""; // ResultCard에 보낼 '최종' 메시지
                        let status = result.status; // ResultCard에 보낼 '상태'

                        // 1. '안전'할 때
                        if (result.status === 'safe') {
                            message = result.message;
                        } 
                        // 2. '경고' (알레르기)일 때
                        else if (result.status === 'danger' && result.type === '알레르기') {
                            const checkedList = userCheckedAllergens.join(', ');
                            const detectedList = result.ingredients.join(', ');
                            
                            // '완성된 문장' 조립!
                            message = `알레르기 성분으로 체크한 "${checkedList}" 중 ${detectedList}(이)가 포함되어 있습니다.`;
                        } 
                        // 3. '주의' (기타/비건)일 때
                        else if (result.status === 'warning' && result.type === '기타기피') {
                            const detectedList = result.ingredients.join(', ');
                            message = `기타 기피 성분으로 체크한 ${detectedList}(이)가 포함되어 있습니다.`;
                        }
                        // 4. '오류' (통신, 서버 등)일 때
                        else if (result.status === 'danger') {
                            message = `오류 발생: ${result.ingredients.join(', ')}`;
                        }
                        else {
                            message = result.message || "결과를 처리 중입니다.";
                        }

                        return (
                            <ResultCard 
                                key={index} 
                                status={status} 
                                message={message} // '깨진' 텍스트 대신 '완성된' 문장 전달!
                            />
                        );
                    })}
                </div>

                <button 
                    onClick={onClose} 
                    style={{ /* ... (button style은 그대로 둠) ... */ }}
                >
                    닫기
                </button>
            </div>
        </div>
    );
};

export default AnalysisModal;