# food-filter/ingredient.py

import cv2
import pytesseract
import os
import re
import sys 
import json 
from Levenshtein import distance 
from database import ingredient_dict, MASTER_DB_LIST


# --- [설정 1] Tesseract 경로 ---
pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract" # ⚠️ Mac 경로

# --- [설정 2] 폴더 설정 ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGE_DIR = os.path.join(BASE_DIR, "image")
RESULT_DIR = os.path.join(BASE_DIR, "result") 

os.makedirs(RESULT_DIR, exist_ok=True)
os.makedirs(IMAGE_DIR, exist_ok=True) 

# --- [설정 3] OCR 설정 ---
OCR_CONFIG = '--oem 3 --psm 3' 

# ===== 2. 동의어/확장 매핑 =====
synonyms = {
    "전지분유": "우유", "탈지분유": "우유", "분유": "우유", "카제인": "우유", 
    "레시틴": "대두", "콩기름": "대두", "두유": "대두", "달걀": "계란",
    "난백": "계란", "난황": "계란", "닭가슴살": "닭고기"
}

def correct_word_with_db(word, db):
    word_len = len(word)
    threshold = max(1, word_len // 4 + 1)
    min_dist = float('inf')
    best_match = word
    for correct_word in db:
        if abs(len(correct_word) - word_len) > threshold:
             continue
        dist = distance(word, correct_word)
        if dist < min_dist:
            min_dist = dist
            best_match = correct_word
    if min_dist <= threshold:
        return best_match
    else:
        return word 

def postprocess_text(text):
    words = re.split(r'([,\s\(\)])', text)
    corrected_words = []
    for word in words:
        if re.match(r'^[가-힣]{2,}$', word):
            corrected_word = correct_word_with_db(word, MASTER_DB_LIST) 
            corrected_words.append(corrected_word)
        else:
            corrected_words.append(word)
    corrected_text = "".join(corrected_words)
    lines = corrected_text.split('\n')
    filtered_lines = [line.strip() for line in lines if len(line.strip()) > 1]
    return '\n'.join(filtered_lines)

def preprocess_for_ocr(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(gray)
    binary = cv2.adaptiveThreshold(enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 8)
    return binary

def parse_ingredients(text):
    inner_texts = re.findall(r"\((.*?)\)", text)
    parsed = []
    for inner in inner_texts:
        inner_parts = [i.strip() for i in inner.split(",")]
        parsed.extend(inner_parts)
    no_parentheses_text = re.sub(r"\s*\(.*?\)", "", text)
    outer_parts = [p.strip() for p in no_parentheses_text.split(",") if p.strip()]
    return outer_parts + parsed

def match_ingredients(parsed_ingredients, db, synonyms_map, user):
    results = {"경고": set(), "주의": set(), "안전": set()}
    
    detected_allergens = set()
    detected_etc = set()
    detected_vegan = set()
    
    matched_original_ingredients = set()

    for ing in parsed_ingredients:
        if not ing or ing in matched_original_ingredients: 
            continue
        
        check_value = ing 
        standardized_value = None 

        for syn_key, syn_value in synonyms_map.items():
            if syn_key in ing:
                standardized_value = syn_value 
                break 
        
        if standardized_value:
            check_value = standardized_value
        
        found = False

        for allergen_item in db["알레르겐"]:
            if (check_value == allergen_item or allergen_item in ing) and allergen_item in user["알레르기"]:
                results["경고"].add(ing) 
                detected_allergens.add(allergen_item)
                matched_original_ingredients.add(ing)
                found = True
                break
        
        if found: continue

        if user["비건"]:
            for vegan_item in db["비건X"]:
                if (check_value == vegan_item or vegan_item in ing):
                    results["주의"].add(ing)
                    detected_vegan.add(vegan_item)
                    matched_original_ingredients.add(ing)
                    found = True
                    break
        
        if found: continue

        for etc_item in db["기타기피"]:
            if (check_value == etc_item or etc_item in ing) and etc_item in user["기타기피"]:
                results["주의"].add(ing)
                detected_etc.add(etc_item)
                matched_original_ingredients.add(ing)
                found = True
                break

        if not found:
            results["안전"].add(ing)
            matched_original_ingredients.add(ing)

    # --- [결과 포맷 수정] ---
    final_results = []
    
    warning_list = list(detected_allergens)
    caution_list = list(detected_etc | detected_vegan)
    safe_list = list(results["안전"])
    
    if warning_list:
        final_results.append({
            "status": "danger",
            "type": "알레르기",
            "ingredients": warning_list 
        })
        
    if caution_list:
        final_results.append({
            "status": "warning",
            "type": "기타기피",
            "ingredients": caution_list
        })
        
    if not final_results:
        final_results.append({
            "status": "safe", 
            "message": f"안전: 기피 성분 미검출. ({len(safe_list)}가지 일반 성분)"
        })

    return final_results

# --- [메인 실행 함수] ---
def main_analysis(user_settings_json, image_filename):
    """Node.js로부터 인자를 받아 OCR을 실행하고 결과를 JSON으로 출력"""
    try:
        user_settings = json.loads(user_settings_json)
        image_path = os.path.join(IMAGE_DIR, image_filename)
        
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"이미지 파일을 찾을 수 없습니다: {image_path}")
            
        image = cv2.imread(image_path)
        if image is None:
            raise IOError(f"이미지를 로드할 수 없거나 손상되었습니다: {image_path}")
        
        processed_image = preprocess_for_ocr(image)
        raw_text = pytesseract.image_to_string(processed_image, lang="kor", config=OCR_CONFIG)
        corrected_text = postprocess_text(raw_text) 
        
        base_name = os.path.splitext(image_filename)[0]
        output_filename = f"{base_name}_ocr_result.txt"
        output_path = os.path.join(RESULT_DIR, output_filename)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(corrected_text) 
        
        ingredients = parse_ingredients(corrected_text) 
        analysis_results = match_ingredients(ingredients, ingredient_dict, synonyms, user_settings)
        
        print(json.dumps(analysis_results, ensure_ascii=False))

    except Exception as e:
        print(f"MAIN_ANALYSIS_ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("ARGUMENT_ERROR: 사용자 설정 및 파일명이 전달되지 않았습니다.", file=sys.stderr)
        sys.exit(1)
        
    main_analysis(sys.argv[1], sys.argv[2])