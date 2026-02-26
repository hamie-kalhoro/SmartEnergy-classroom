import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib
import os
import json
from datetime import datetime

MODEL_PATH = 'occupancy_model.pkl'
MASTER_HISTORY_PATH = 'data/processed_history.csv'

class MLEngine:
    def __init__(self):
        self.model = None
        self.last_training_report = None
        # Create data directory if it doesn't exist
        os.makedirs(os.path.dirname(MASTER_HISTORY_PATH), exist_ok=True)
        
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
            except:
                self.train_initial_model()

    def train_initial_model(self):
        """Seed the model with synthetic intelligence if no history exists."""
        data = []
        for day in range(7):
            for hour in range(8, 22):
                for sub_type in [0, 1]:
                    # Weekend logic
                    if day >= 5:
                        attendance = np.random.randint(0, 15)
                    else:
                        # Typical school hours logic
                        if 9 <= hour <= 16:
                            attendance = np.random.randint(40, 95)
                        else:
                            attendance = np.random.randint(5, 30)
                            
                    label = 0 if attendance < 30 else (1 if attendance <= 60 else 2)
                    data.append([day, hour, sub_type, attendance, label])
        
        df = pd.DataFrame(data, columns=['day', 'hour', 'type', 'attendance', 'label'])
        # Save as initial history
        df.to_csv(MASTER_HISTORY_PATH, index=False)
        self.train_from_history()
        return "Model initialized with synthetic knowledge"

    def _preprocess_dataframe(self, df):
        """Advanced preprocessing with temporal feature engineering."""
        df = df.copy()
        
        # Day: Monday=0, Sunday=6
        if 'day' in df.columns:
            day_map = {'Monday':0, 'Tuesday':1, 'Wednesday':2, 'Thursday':3, 'Friday':4, 'Saturday':5, 'Sunday':6}
            df['day'] = df['day'].apply(lambda x: day_map.get(str(x).strip().capitalize(), 0) if not str(x).isdigit() else int(x))
            # New feature: Is Weekend
            df['is_weekend'] = df['day'].apply(lambda x: 1 if x >= 5 else 0)
        
        # Hour: 08:00 -> 8
        if 'hour' in df.columns:
            def parse_hour(x):
                try:
                    s = str(x).strip()
                    h = int(s.split(':')[0]) if ':' in s else int(float(s))
                    return h
                except: return 8
            df['hour'] = df['hour'].apply(parse_hour).astype(int)
            
            # New feature: Time of day bin
            def get_time_bin(h):
                if h < 12: return 0 # Morning
                if h < 17: return 1 # Afternoon
                return 2 # Evening
            df['time_bin'] = df['hour'].apply(get_time_bin)
            
        if 'type' in df.columns:
            df['type'] = df['type'].apply(lambda x: 1 if str(x).lower().strip() in ['lab', 'practical', '1'] else 0)
            
        if 'attendance' in df.columns:
            df['attendance'] = pd.to_numeric(df['attendance'], errors='coerce').fillna(50).astype(float)
            
        if 'label' not in df.columns and 'attendance' in df.columns:
            df['label'] = df['attendance'].apply(lambda x: 0 if x < 30 else (1 if x <= 60 else 2))
            
        return df

    def digest_and_train(self, new_df):
        """Absorb new data into cumulative history and retrain."""
        processed_new = self._preprocess_dataframe(new_df)
        
        if os.path.exists(MASTER_HISTORY_PATH):
            history_df = pd.read_csv(MASTER_HISTORY_PATH)
            # Combine logic: if we have thousands of records, we might want to prune, 
            # but for now, we follow 'learn from everything'
            cumulative_df = pd.concat([history_df, processed_new], ignore_index=True)
        else:
            cumulative_df = processed_new
            
        # Limit history to latest 10,000 records to maintain performance
        if len(cumulative_df) > 10000:
            cumulative_df = cumulative_df.tail(10000)
            
        cumulative_df.to_csv(MASTER_HISTORY_PATH, index=False)
        return self.train_from_history()

    def train_from_history(self):
        """Core training logic based on cumulative digested history."""
        if not os.path.exists(MASTER_HISTORY_PATH):
            return None, "No history available to train"
            
        df = pd.read_csv(MASTER_HISTORY_PATH)
        required_features = ['day', 'hour', 'type', 'attendance', 'is_weekend', 'time_bin']
        
        # Ensure all features exist (handle legacy data)
        if 'is_weekend' not in df.columns:
            df = self._preprocess_dataframe(df)
            
        X = df[required_features]
        y = df['label']
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)
        
        # RandomForest with 150 estimators for high-quality interpretability
        self.model = RandomForestClassifier(n_estimators=150, random_state=42, oob_score=True)
        self.model.fit(X_train, y_train)
        
        # Evaluation
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        joblib.dump(self.model, MODEL_PATH)
        
        report = {
            'timestamp': datetime.utcnow().isoformat(),
            'total_records': len(df),
            'training_records': len(X_train),
            'test_records': len(X_test),
            'accuracy': round(float(accuracy) * 100, 2),
            'feature_importance': dict(zip(required_features, [round(float(x), 4) for x in self.model.feature_importances_]))
        }
        self.last_training_report = report
        return report, None

    def predict(self, day, hour, sub_type, attendance):
        """Predict with logical reasoning."""
        if not self.model:
            self.train_initial_model()
            
        temp_df = pd.DataFrame([{'day': day, 'hour': hour, 'type': sub_type, 'attendance': attendance}])
        processed = self._preprocess_dataframe(temp_df)
        
        features = ['day', 'hour', 'type', 'attendance', 'is_weekend', 'time_bin']
        prediction = self.model.predict(processed[features])[0]
        probabilities = self.model.predict_proba(processed[features])[0]
        
        confidence = round(float(np.max(probabilities)) * 100, 1)
        levels = {0: 'Low', 1: 'Medium', 2: 'High'}
        result_label = levels[prediction]
        
        # Reasoning Engine
        reasoning = self._generate_reasoning(processed, result_label, confidence)
        
        return result_label, int(prediction), reasoning, confidence

    def _generate_reasoning(self, row, label, confidence):
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        day = day_names[row['day'].iloc[0]]
        hour = row['hour'].iloc[0]
        is_weekend = row['is_weekend'].iloc[0]
        
        reasons = []
        if is_weekend:
            reasons.append(f"It's {day}, and behavioral history shows minimal student presence on weekends.")
        if hour < 9 or hour > 17:
            reasons.append("Current time is outside standard heavy-traffic academic hours.")
        if label == 'High' and confidence > 80:
            reasons.append(f"High-confidence match with past {day} peak performance datasets.")
        if label == 'Low' and row['attendance'].iloc[0] < 20:
            reasons.append("Projected attendance is very low, aligning with historical efficiency profiles.")
            
        if not reasons:
            reasons.append(f"Standard {label} occupancy pattern detected based on {day} academic schedules.")
            
        return " ".join(reasons)

    def get_recommendation(self, level_idx):
        level_idx = int(level_idx)
        if level_idx == 0:
            return "Lights OFF, AC OFF (Eco Mode)", "Low"
        elif level_idx == 1:
            return "Lights ON (50%), AC OFF (Fan only)", "Medium"
        else:
            return "Full Power: Lights ON, AC ON", "High"
    
    def get_model_stats(self):
        if not self.model: return {'is_trained': False}
        return {
            'model_type': 'Self-Learning RandomForest',
            'is_trained': True,
            'knowledge_points': len(pd.read_csv(MASTER_HISTORY_PATH)) if os.path.exists(MASTER_HISTORY_PATH) else 0,
            'last_report': self.last_training_report
        }
