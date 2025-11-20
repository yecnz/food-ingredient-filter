// web-app/src/BookmarkForm.js

import React, { useState } from 'react';

function BookmarkForm({ analysisResult }) {
    const [productName, setProductName] = useState('');
    const [productFeature, setProductFeature] = useState(''); // 특징 입력용 상태 추가
    const [isSaved, setIsSaved] = useState(false);

    const handleSave = () => {
        if (!productName.trim()) {
            alert('내용을 입력해주세요!');
            return;
        }

        const existingData = localStorage.getItem('myBookmarks');
        const list = existingData ? JSON.parse(existingData) : [];

        const newItem = {
            id: Date.now(),
            name: productName,
            feature: productFeature, // 특징 데이터 저장
            date: new Date().toLocaleDateString(),
            status: analysisResult.status,
            ingredients: analysisResult.ingredients || []
        };

        localStorage.setItem('myBookmarks', JSON.stringify([newItem, ...list]));

        setIsSaved(true);
        alert('북마크에 저장되었습니다! 🔖');
    };

    return (
        <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '16px' }}>
                🔖 결과 북마크하기
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                    type="text"
                    placeholder="제품명 (예: 새우깡)"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    disabled={isSaved}
                    style={{ 
                        padding: '10px', 
                        borderRadius: '5px', 
                        border: '1px solid #ced4da',
                        fontSize: '14px'
                    }}
                />

                <input
                    type="text"
                    placeholder="특징/메모 (예: '새우' 성분 함유)"
                    value={productFeature}
                    onChange={(e) => setProductFeature(e.target.value)}
                    disabled={isSaved}
                    style={{ 
                        padding: '10px', 
                        borderRadius: '5px', 
                        border: '1px solid #ced4da',
                        fontSize: '14px'
                    }}
                />

                <button 
                   onClick={handleSave} 
                   disabled={isSaved}
                   style={{ 
                       marginTop: '5px',
                       padding: '10px',
                       backgroundColor: isSaved ? 'transparent' : 'lightgrey', 
                        color: isSaved ? '#ADB5BD' : '#495057',
                        border: isSaved ? '1px solid #eee' : '1px solid #DEE2E6',
                        borderRadius: '8px',
                       cursor: isSaved ? 'default' : 'pointer',
                       fontWeight: 'bold',
                       fontSize: '15px',
                       boxShadow: isSaved ? 'none' : '0 2px 5px rgba(255, 167, 38, 0.3)', // 그림자도 주황빛으로
                       transition: '0.3s'
                    }}
                >
                    {isSaved ? '저장 완료 ✨' : '내 리스트에 저장하기'}
                </button>
            </div>
        </div>
    );
}

export default BookmarkForm;