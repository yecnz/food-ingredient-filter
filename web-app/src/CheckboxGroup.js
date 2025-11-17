// web-app/src/CheckboxGroup.js

import React from 'react';

const CheckboxGroup = ({ category, items, checkedItems, onChange }) => {
    
    const isVeganCategory = category === "비건";

    return (
        <div className="checkbox-group-container">
            {!isVeganCategory && (
                <h3 className="checkbox-group-title">{category}</h3>
            )}
            
            <div className="checkbox-items-wrapper">
                {items.map((item) => (
                    <label key={item} className="checkbox-item">
                        <input
                            type="checkbox"
                            value={item}
                            checked={checkedItems.includes(item)} 
                            onChange={() => onChange(category, item)} 
                        />
                        {item}
                    </label>
                ))}
            </div>
        </div>
    );
};

export default CheckboxGroup;