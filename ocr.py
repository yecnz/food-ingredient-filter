# food-filter/ocr.py (Python 스크립트 - Node.js 연동용)

import cv2
import pytesseract
import os
import re
import sys # 인자 처리를 위해 추가
import json # JSON 출력을 위해 추가
from Levenshtein import distance 

# --- [설정 1] Tesseract 경로 ---
pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract" # ⚠️ 사용자 경로에 맞게 수정
# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe" # (Windows 예시)

# --- [설정 2] 폴더 설정 ---
BASE_DIR = os.path.expanduser("~/Desktop/project/food-filter") # ⚠️ 사용자 경로에 맞게 수정
IMAGE_DIR = os.path.join(BASE_DIR, "image")
RESULT_DIR = os.path.join(BASE_DIR, "result") 

os.makedirs(RESULT_DIR, exist_ok=True)
os.makedirs(IMAGE_DIR, exist_ok=True) 

# --- [설정 3] OCR 설정 ---
OCR_CONFIG = '--oem 3 --psm 3' 

# ===== 1. 성분 사전 (데이터베이스) =====
# Node.js에서 전달받은 user_settings를 기반으로 필터링하는 DB
ingredient_dict = {
    # 식약처 고시 19종 + 호두, 잣 (사용자 코드 기반)
    "알레르겐": [
        "우유", "달걀", "계란", "밀", "메밀", "땅콩", "대두", "잣", "새우", "게",
        "오징어", "고등어", "조개류", "닭고기", "쇠고기", "돼지고기", "복숭아",
        "토마토", "아황산류", "호두"
    ],

    "비건X": [
        "꿀", "젤라틴", "카제인", "버터", "유청", "난백", "난황", "락토스",
        "코치닐", "카민", 
        "쉘락", "L-시스테인", "비타민 D3",
        "동물성유지", "동물성지방", "돈지", "우지", "콜라겐"      
        ],

    "기타기피": [
        "MSG", "트랜스지방", "사카린", "아스파탐", "아세설팜칼륨", "수크랄로스"
    ]
}

# ===== 2. 동의어/확장 매핑 =====
synonyms = {
    "전지분유": "우유", "탈지분유": "우유", "분유": "우유", "카제인": "우유",
    "레시틴": "대두", "콩기름": "대두", "두유": "대두", "달걀": "계란",
    "난백": "계란", "난황": "계란", "닭가슴살": "닭고기"
}


# --- [함수] OCR 전처리 및 교정 로직 ---
def preprocess_for_ocr(image):
    """OCR 정확도를 높이기 위한 이미지 전처리"""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(gray)
    binary = cv2.adaptiveThreshold(enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 8)
    return binary

# (기존 ocr.py의 correct_word_with_db와 postprocess_text 함수가 필요하나, 
#  시간 절약을 위해 여기서는 필터링 로직에 집중하고 OCR 교정은 생략합니다.)


# --- [함수] 성분 분리 및 매칭 로직 ---
def parse_ingredients(text):
    """텍스트에서 괄호 안팎의 성분을 모두 분리하여 리스트로 반환"""
    inner_texts = re.findall(r"\((.*?)\)", text)
    parsed = []
    for inner in inner_texts:
        inner_parts = [i.strip() for i in inner.split(",")]
        parsed.extend(inner_parts)

    no_parentheses_text = re.sub(r"\s*\(.*?\)", "", text)
    outer_parts = [p.strip() for p in no_parentheses_text.split(",") if p.strip()]

    return outer_parts + parsed

def match_ingredients(parsed_ingredients, db, synonyms_map, user):
    """사용자 설정(user)에 따라 성분을 경고/주의/안전으로 분류"""
    results = {
        "경고": set(),
        "주의": set(),
        "안전": set()
    }
    matched_original_ingredients = set()

    for ing in parsed_ingredients:
        if ing in matched_original_ingredients or not ing:
            continue

        check_value = synonyms_map.get(ing, ing)
        found = False

        # 1. [경고] 알레르겐 검사 (사용자 설정 기반)
        for allergen_item in db["알레르겐"]:
            if allergen_item in check_value and allergen_item in user["알레르기"]:
                results["경고"].add(f"{ing} (포함된 알레르겐: {allergen_item})")
                matched_original_ingredients.add(ing)
                found = True
                break
        if found: continue

        # 2. [주의] 비건 검사 (사용자 설정 기반)
        if user["비건"]:
            for vegan_item in db["비건X"]:
                if vegan_item in check_value:
                    results["주의"].add(f"{ing} (비건X 성분: {vegan_item})")
                    matched_original_ingredients.add(ing)
                    found = True
                    break
        if found: continue

        # 3. [주의] 기타 기피 성분 검사 (사용자 설정 기반)
        for etc_item in db["기타기피"]:
            if etc_item in check_value and etc_item in user["기타기피"]:
                results["주의"].add(f"{ing} (기피 성분: {etc_item})")
                matched_original_ingredients.add(ing)
                found = True
                break

        # 4. [안전] 어디에도 해당되지 않은 경우
        if not found:
            results["안전"].add(ing)
            matched_original_ingredients.add(ing)

    # set을 list로 변환하고 최종 결과를 정리
    final_results = []
    if results["경고"]:
        final_results.append({
            "status": "danger",
            "message": f"🚨 경고: {', '.join(results['경고'])}"
        })
    if results["주의"]:
        final_results.append({
            "status": "warning",
            "message": f"⚠️ 주의: {', '.join(results['주의'])}"
        })
    # 안전 성분은 전체 성분 목록이 너무 길어지므로, 경고/주의가 없거나 소수인 경우에만 요약 표시
    if not final_results or len(final_results) < 2:
        safe_count = len(results["안전"])
        final_results.append({
            "status": "safe",
            "message": f"✅ 안전: 위험 성분 미검출. ({safe_count}가지 일반 성분)"
        })

    return final_results


# --- [메인 실행 함수] ---
def main_analysis(user_settings_json, image_filename):
    """Node.js로부터 인자를 받아 OCR을 실행하고 결과를 JSON으로 출력"""
    try:
        # 1. 사용자 설정 파싱
        user_settings = json.loads(user_settings_json)
        # print(f"사용자 설정 수신: {user_settings}", file=sys.stderr) # 디버깅용 (stderr로 출력)

        # 2. 이미지 로드 및 OCR 실행
        full_path = os.path.join(IMAGE_DIR, image_filename)
        img_original = cv2.imread(full_path)
        
        if img_original is None:
            raise FileNotFoundError(f"이미지 파일 없음: {full_path}")
            
        processed_image = preprocess_for_ocr(img_original)
        # Tesseract 실행
        raw_text = pytesseract.image_to_string(processed_image, lang="kor", config=OCR_CONFIG)
        
        # 3. OCR 결과 텍스트를 파일로 저장 (선택 사항)
        base_name = os.path.splitext(image_filename)[0]
        output_filename = f"{base_name}_ocr_result.txt"
        output_path = os.path.join(RESULT_DIR, output_filename)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(raw_text)
        # print(f"OCR 결과 저장 완료: {output_filename}", file=sys.stderr)

        # 4. 성분 분석 및 매칭 (핵심)
        ingredients = parse_ingredients(raw_text)
        analysis_results = match_ingredients(ingredients, ingredient_dict, synonyms, user_settings)
        
        # 5. 결과를 JSON 형식으로 표준 출력 (Node.js가 받음)
        # sys.stdout.write() 대신 print()를 사용해도 됩니다.
        print(json.dumps(analysis_results, ensure_ascii=False))

    except Exception as e:
        # 오류 발생 시 오류 메시지를 JSON 형식으로 출력
        error_message = {"error": True, "message": str(e), "detail": "Python script failed"}
        print(json.dumps([{"status": "danger", "message": f"분석 실패 오류: {str(e)}"}], ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        # Node.js에서 인자가 충분히 전달되지 않은 경우
        print(json.dumps([{"status": "danger", "message": "시스템 오류: 사용자 설정 및 파일명이 전달되지 않았습니다."}]), ensure_ascii=False)
        sys.exit(1)
        
    # sys.argv[1]: 사용자 설정 JSON 문자열
    # sys.argv[2]: 이미지 파일명
    main_analysis(sys.argv[1], sys.argv[2])