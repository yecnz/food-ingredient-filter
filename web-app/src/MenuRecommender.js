// web-app/src/MenuRecommender.js

import React, { useState } from 'react';
import { recipeDB } from './recipeDB'; 

function MenuRecommender({ userSettings }) {

    const [preferences, setPreferences] = useState({
        category: null, // '한식', '중식'
        soup: null,     // '있음', '없음'
        spiciness: null // '매움', '안매움'
    });

    const [recommendedMenu, setRecommendedMenu] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    const handlePrefClick = (type, value) => {
        setPreferences(prev => ({
            ...prev,
            [type]: value 
        }));
        setRecommendedMenu(null);
        setErrorMsg(null);
    };

    const handleRecommendClick = () => {
        const allAvoidIngredients = [
            ...userSettings.알레르기,
            ...userSettings.기타기피
        ];
        
        let filteredList = recipeDB;

        // 1. '기피' 성분 '제외'
        filteredList = filteredList.filter(recipe => {
            return !recipe.allergens.some(allergen => allAvoidIngredients.includes(allergen));
        });

        // 2. '카테고리' '선택'
        if (preferences.category) {
            filteredList = filteredList.filter(recipe => recipe.category === preferences.category);
        }
        
        // 3. '국물''선택'
        if (preferences.soup) {
            filteredList = filteredList.filter(recipe => recipe.soup === preferences.soup);
        }

        // 4. '매운맛' '선택'
        if (preferences.spiciness) {
            filteredList = filteredList.filter(recipe => recipe.spiciness === preferences.spiciness);
        }
        

        if (filteredList.length > 0) {
            const randomIndex = Math.floor(Math.random() * filteredList.length);
            setRecommendedMenu(filteredList[randomIndex]);
            setErrorMsg(null);
        } else {
            setRecommendedMenu(null);
            setErrorMsg("아쉽지만 모든 조건을 만족하는 안전한 메뉴를 찾지 못했습니다'. ㅠㅠ");
        }
    };

    const getButtonClass = (type, value) => {
        return preferences[type] === value ? 'pref-button active' : 'pref-button';
    };

    return (
        <section> 
            <h2>🧑‍🍳 안전 메뉴 추천</h2>
            <p style={{ textAlign: 'center', marginBottom: '20px' }}>
                설정한 기피 성분 ('{userSettings.알레르기.join(', ')}'...)을 제외한 
                안전한 메뉴를 추천해 드립니다.
            </p>

            <div className="pref-group">
                <span className="pref-label">종류:</span>
                <button className={getButtonClass('category', '한식')} onClick={() => handlePrefClick('category', '한식')}>한식</button>
                <button className={getButtonClass('category', '중식')} onClick={() => handlePrefClick('category', '중식')}>중식</button>
                <button className={getButtonClass('category', '일식')} onClick={() => handlePrefClick('category', '일식')}>일식</button>
                <button className={getButtonClass('category', '양식')} onClick={() => handlePrefClick('category', '양식')}>양식</button>
            </div>

            {/* 2. 국물 */}
            <div className="pref-group">
                <span className="pref-label">국물:</span>
                <button className={getButtonClass('soup', '있음')} onClick={() => handlePrefClick('soup', '있음')}>국물 있음</button>
                <button className={getButtonClass('soup', '없음')} onClick={() => handlePrefClick('soup', '없음')}>국물 없음</button>
            </div>
            
            {/* 3. 매운맛 */}
            <div className="pref-group">
                <span className="pref-label">매운맛:</span>
                <button className={getButtonClass('spiciness', '매움')} onClick={() => handlePrefClick('spiciness', '매움')}>매운 음식</button>
                <button className={getButtonClass('spiciness', '안매움')} onClick={() => handlePrefClick('spiciness', '안매움')}>안 매운 음식</button>
            </div>

            {/* 4. '메뉴 추천' (파란색) 버튼 */}
            <button 
                className="analyze-button" 
                style={{ width: '100%', marginTop: '30px' }}
                onClick={handleRecommendClick}
            >
                메뉴 추천해줘!
            </button>
            
            {recommendedMenu && (
                <div className="recommend-result-box">
                    <h3>오늘의 '안전' 추천 메뉴!</h3>
                    <h2>{recommendedMenu.title}</h2>
                    <p>#{recommendedMenu.tags.join(' #')}</p>
                </div>
            )}
            
            {errorMsg && (
                 <div className="recommend-error-box">
                    <p>{errorMsg}</p>
                </div>
            )}

        </section>
    );
}

export default MenuRecommender;