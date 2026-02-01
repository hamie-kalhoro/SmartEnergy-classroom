import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os
import json

MODEL_PATH = 'occupancy_model.pkl'
DATASET_PATH = 'uploaded_dataset.csv'

class MLEngine:
    def __init__(self):
        self.model = None
        self.last_training_report = None
        if os.path.exists(MODEL_PATH):
            self.model = joblib.load(MODEL_PATH)

    def train_initial_model(self):
        data = []
        for day in range(5):
            for hour in range(8, 18):
                for sub_type in [0, 1]:
                    attendance = np.random.randint(20, 95)
                    if attendance < 30: label = 0
                    elif attendance <= 60: label = 1
                    else: label = 2
                    data.append([day, hour, sub_type, attendance, label])
        
        df = pd.DataFrame(data, columns=['day', 'hour', 'type', 'attendance', 'label'])
        X = df[['day', 'hour', 'type', 'attendance']]
        y = df['label']
        
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.model.fit(X, y)
        joblib.dump(self.model, MODEL_PATH)
        return "Model trained with synthetic data"

    def train_from_dataset(self, df):
        """
        Train the model from an uploaded dataset.
        Expected columns: day, hour, type, attendance, label (optional)
        If no label, we'll generate them based on attendance thresholds.
        """
        required_cols = ['day', 'hour', 'type', 'attendance']
        
        # Validate columns
        for col in required_cols:
            if col not in df.columns:
                return None, f"Missing required column: {col}"
        
        # Convert day names to numbers if needed
        if df['day'].dtype == object:
            day_map = {'Monday':0, 'Tuesday':1, 'Wednesday':2, 'Thursday':3, 'Friday':4, 'Saturday':5, 'Sunday':6}
            df['day'] = df['day'].map(day_map).fillna(0).astype(int)
        
        # Convert type to numeric if needed
        if df['type'].dtype == object:
            df['type'] = df['type'].apply(lambda x: 1 if str(x).lower() in ['lab', 'practical'] else 0)
        
        # Generate labels if not present
        if 'label' not in df.columns:
            df['label'] = df['attendance'].apply(lambda x: 0 if x < 30 else (1 if x <= 60 else 2))
        
        X = df[['day', 'hour', 'type', 'attendance']]
        y = df['label']
        
        # Split for evaluation
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Train with Random Forest for better accuracy
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Save model
        joblib.dump(self.model, MODEL_PATH)
        df.to_csv(DATASET_PATH, index=False)
        
        # Generate training report
        report = {
            'total_records': len(df),
            'training_records': len(X_train),
            'test_records': len(X_test),
            'accuracy': round(accuracy * 100, 2),
            'feature_importance': dict(zip(['day', 'hour', 'type', 'attendance'], 
                                           [round(x, 4) for x in self.model.feature_importances_])),
            'class_distribution': df['label'].value_counts().to_dict()
        }
        self.last_training_report = report
        return report, None

    def predict_batch(self, df):
        """Process a whole dataset and return predictions with recommendations."""
        if not self.model:
            self.train_initial_model()
        
        results = []
        for _, row in df.iterrows():
            day_val = row.get('day', 0)
            if isinstance(day_val, str):
                day_map = {'Monday':0, 'Tuesday':1, 'Wednesday':2, 'Thursday':3, 'Friday':4, 'Saturday':5, 'Sunday':6}
                day_val = day_map.get(day_val, 0)
            
            hour_val = int(str(row.get('hour', '08')).split(':')[0])
            type_val = 1 if str(row.get('type', '')).lower() in ['lab', 'practical'] else 0
            attendance = float(row.get('attendance', 50))
            
            features = np.array([[day_val, hour_val, type_val, attendance]])
            prediction = self.model.predict(features)[0]
            
            levels = {0: 'Low', 1: 'Medium', 2: 'High'}
            rec, _ = self.get_recommendation(prediction)
            
            results.append({
                'day': row.get('day'),
                'hour': row.get('hour'),
                'type': row.get('type'),
                'attendance': attendance,
                'predicted_occupancy': levels[prediction],
                'recommendation': rec,
                'energy_action': 'Optimized' if prediction < 2 else 'Full Power'
            })
        
        return results

    def predict(self, day_name, time_slot, subject_type, attendance_pct):
        if not self.model:
            self.train_initial_model()
            
        days = {'Monday':0, 'Tuesday':1, 'Wednesday':2, 'Thursday':3, 'Friday':4, 'Saturday':5, 'Sunday':6}
        day_val = days.get(day_name, 0)
        hour_val = int(time_slot.split(':')[0])
        type_val = 1 if subject_type.lower() in ['lab', 'practical'] else 0
        
        features = np.array([[day_val, hour_val, type_val, attendance_pct]])
        prediction = self.model.predict(features)[0]
        
        levels = {0: 'Low', 1: 'Medium', 2: 'High'}
        return levels[prediction], prediction

    def get_recommendation(self, level_idx):
        if level_idx == 0:
            return "Lights OFF, AC OFF", "Low"
        elif level_idx == 1:
            return "Lights ON, AC OFF", "Medium"
        else:
            return "Lights ON, AC ON", "High"
    
    def get_model_stats(self):
        if not self.model:
            return None
        return {
            'model_type': type(self.model).__name__,
            'is_trained': True,
            'last_report': self.last_training_report
        }
