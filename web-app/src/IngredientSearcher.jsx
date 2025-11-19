import React, { useState } from 'react';

// Google Search를 이용한 Gemini API 호출 함수
async function fetchGeminiResponse(query, systemPrompt) {
    // API 키는 Canvas 환경에서 자동으로 제공되므로 빈 문자열로 둡니다.
    const apiKey = "AIzaSyCxqUoUqpS7pbe3o251HmgXlrZ9Q_D4VNM"; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload = {
        contents: [{ parts: [{ text: query }] }],
        // Google Search grounding 활성화
        tools: [{ "google_search": {} }],
        // 시스템 지침을 통해 모델의 역할과 응답 형식을 정의합니다.
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
    };

    // 지수 백오프 로직 (retry)
    for (let i = 0; i < 3; i++) { // 최대 3회 시도
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.status === 429) { // Too Many Requests
                const delay = Math.pow(2, i) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue; // 재시도
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            const candidate = result.candidates?.[0];

            if (candidate && candidate.content?.parts?.[0]?.text) {
                const text = candidate.content.parts[0].text;
                let sources = [];
                const groundingMetadata = candidate.groundingMetadata;
                
                if (groundingMetadata && groundingMetadata.groundingAttributions) {
                    sources = groundingMetadata.groundingAttributions
                        .map(attribution => ({
                            uri: attribution.web?.uri,
                            title: attribution.web?.title,
                        }))
                        .filter(source => source.uri && source.title);
                }

                return { text, sources };

            } else {
                // If text is missing but API call was successful, return empty result
                return { text: "검색 결과가 명확하지 않습니다. 다른 성분으로 다시 시도해 주세요.", sources: [] };
            }

        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i === 2) throw new Error("API 호출이 여러 번 실패했습니다.");
        }
    }
}

// 성분 검색 결과를 표시하는 컴포넌트
const SearchResultDisplay = ({ result, error, isSearching, query }) => {
    if (isSearching) {
        return (
            <div className="search-loading">
                <div className="spinner"></div>
                <p>성분 정보 검색 중...</p>
            </div>
        );
    }

    if (error) {
        return <p className="search-error">{error}</p>;
    }

    if (!result) {
        return <p className="search-placeholder">검색창에 궁금한 성분명을 입력하고 검색 버튼을 눌러보세요.</p>;
    }

    return (
        <div className="search-result-box">
            <h4 className="result-title">🔎 '{query}' 에 대한 정보</h4>
            <div className="result-content">
                <p className="result-text">{result.text}</p>
                {result.sources.length > 0 && (
                    <div className="result-sources">
                        <p className="source-label">출처 (신뢰도 높은 최신 정보):</p>
                        <ul>
                            {result.sources.slice(0, 3).map((source, index) => (
                                <li key={index}>
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer">
                                        {source.title || '출처 링크'}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};


function IngredientSearcher() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null); // {text: string, sources: array}
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);

    const searchIngredientInfo = async () => {
        const normalizedQuery = searchQuery.trim();
        if (!normalizedQuery) {
            setSearchError("검색어를 입력해 주세요.");
            return;
        }

        setIsSearching(true);
        setSearchError(null);
        setSearchResults(null);

        const systemPrompt = `
            당신은 식품 성분 및 안전성 전문 분석가입니다.
            사용자가 제공한 성분에 대해 Google Search를 사용하여 최신 정보를 바탕으로 아래 항목들을 포함하여 한국어로 간결하게 설명해주세요.
            1. 성분의 주요 용도 및 식품에서의 역할.
            2. 건강상 유의할 점 또는 논란이 되는 안전성 이슈 (최신 정보 반영).
            3. 비건(Vegan) 또는 알레르기 관련 정보.
            답변은 4문장 이내로 요약해 주세요. 친절하고 신뢰감 있는 톤을 유지하세요.
        `;
        const userQuery = `식품 성분명: ${normalizedQuery}. 이 성분에 대해 자세히 알려주세요.`;

        try {
            const result = await fetchGeminiResponse(userQuery, systemPrompt);
            setSearchResults(result);
        } catch (error) {
            setSearchError("검색 중 오류가 발생했거나, 해당 성분에 대한 신뢰할 만한 정보를 찾을 수 없습니다.");
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };


    return (
        <section className="ingredient-searcher-section">
            <h2>🔍 궁금한 성분 실시간 검색</h2>
            <p className="description-text">성분표를 읽다가 궁금해진 성분명(예: 타우린, 캐러멜색소)을 입력하시면, Gemini 모델이 Google Search를 통해 최신 정보를 분석하여 간결하게 알려드립니다.</p>
            <div className="search-input-area">
                <input
                    type="text"
                    placeholder="성분명을 입력하세요 (예: 아세설팜칼륨)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter') searchIngredientInfo(); }}
                />
                <button onClick={searchIngredientInfo} disabled={isSearching}>
                    {isSearching ? '분석 중...' : '검색'}
                </button>
            </div>

            <SearchResultDisplay 
                result={searchResults} 
                error={searchError} 
                isSearching={isSearching} 
                query={searchQuery.trim()}
            />
        </section>
    );
}

export default IngredientSearcher;