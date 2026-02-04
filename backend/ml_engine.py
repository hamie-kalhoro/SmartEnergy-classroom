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

    def _preprocess_dataframe(self, df):
        """Prepare dataframe for ML operations with robust type conversion."""
        df = df.copy()
        
        # Day conversion: Monday -> 0, etc.
        if 'day' in df.columns:
            day_map = {'Monday':0, 'Tuesday':1, 'Wednesday':2, 'Thursday':3, 'Friday':4, 'Saturday':5, 'Sunday':6}
            # Handle both string names and already numeric values
            df['day'] = df['day'].apply(lambda x: day_map.get(str(x).strip().capitalize(), 0) if not str(x).isdigit() else int(x))
            df['day'] = df['day'].fillna(0).astype(int)
        
        # Hour conversion: "08:00" -> 8
        if 'hour' in df.columns:
            def parse_hour(x):
                try:
                    s = str(x).strip()
                    if ':' in s:
                        return int(s.split(':')[0])
                    return int(float(s))
                except:
                    return 8
            df['hour'] = df['hour'].apply(parse_hour).astype(int)
            
        # Type conversion: theory -> 0, lab -> 1
        if 'type' in df.columns:
            def parse_type(x):
                s = str(x).lower().strip()
                if s in ['lab', 'practical', '1']:
                    return 1
                return 0
            df['type'] = df['type'].apply(parse_type).astype(int)
            
        # Attendance: ensure float
        if 'attendance' in df.columns:
            df['attendance'] = pd.to_numeric(df['attendance'], errors='coerce').fillna(50).astype(float)
            
        # Label: ensure int if exists
        if 'label' in df.columns:
            df['label'] = pd.to_numeric(df['label'], errors='coerce').fillna(1).astype(int)
            
        return df

    def train_from_dataset(self, df):
        """
        Train the model from an uploaded dataset.
        Expected columns: day, hour, type, attendance, label (optional)
        """
        required_cols = ['day', 'hour', 'type', 'attendance']
        
        # Validate columns
        for col in required_cols:
            if col not in df.columns:
                return None, f"Missing required column: {col}"
        
        # Preprocess
        processed_df = self._preprocess_dataframe(df)
        
        # Generate labels if not present
        if 'label' not in processed_df.columns:
            processed_df['label'] = processed_df['attendance'].apply(lambda x: 0 if x < 30 else (1 if x <= 60 else 2))
        
        X = processed_df[['day', 'hour', 'type', 'attendance']]
        y = processed_df['label']
        
        # Split for evaluation
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Train
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Save model and original dataset (for reference)
        joblib.dump(self.model, MODEL_PATH)
        df.to_csv(DATASET_PATH, index=False)
        
        # Generate training report
        report = {
            'total_records': len(df),
            'training_records': len(X_train),
            'test_records': len(X_test),
            'accuracy': round(float(accuracy) * 100, 2),
            'feature_importance': dict(zip(['day', 'hour', 'type', 'attendance'], 
                                           [round(float(x), 4) for x in self.model.feature_importances_])),
            'class_distribution': {str(k): int(v) for k, v in processed_df['label'].value_counts().to_dict().items()}
        }
        self.last_training_report = report
        return report, None

    def predict_batch(self, df):
        """Process a whole dataset and return predictions with recommendations."""
        if not self.model:
            self.train_initial_model()
        
        processed_df = self._preprocess_dataframe(df)
        X = processed_df[['day', 'hour', 'type', 'attendance']]
        
        predictions = self.model.predict(X)
        
        results = []
        levels = {0: 'Low', 1: 'Medium', 2: 'High'}
        
        for i, row in df.iterrows():
            pred = int(predictions[i])
            rec, _ = self.get_recommendation(pred)
            
            results.append({
                'day': row.get('day'),
                'hour': row.get('hour'),
                'type': row.get('type'),
                'attendance': float(row.get('attendance', 0)),
                'predicted_occupancy': levels[pred],
                'recommendation': rec,
                'energy_action': 'Optimized' if pred < 2 else 'Full Power'
            })
        
        return results

    def predict(self, day_name, time_slot, subject_type, attendance_pct):
        if not self.model:
            self.train_initial_model()
            
        # Create a tiny dataframe to use our preprocessing pipeline
        temp_df = pd.DataFrame([{
            'day': day_name,
            'hour': time_slot,
            'type': subject_type,
            'attendance': attendance_pct
        }])
        
        processed = self._preprocess_dataframe(temp_df)
        prediction = self.model.predict(processed)[0]
        
        levels = {0: 'Low', 1: 'Medium', 2: 'High'}
        return levels[prediction], prediction

    def get_recommendation(self, level_idx):
        level_idx = int(level_idx)
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
