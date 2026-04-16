import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
import joblib
import os
import json
from datetime import datetime

MODEL_PATH = 'occupancy_model.pkl'
MASTER_HISTORY_PATH = 'data/processed_history.csv'
TRAINING_LOG_PATH = 'data/training_history.json'

class MLEngine:
    def __init__(self):
        self.model = None
        self.last_training_report = None
        self.retrain_threshold = 50 # Retrain every 50 new real-world data points
        self.new_data_count = 0
        
        # Create data directory if it doesn't exist
        os.makedirs('data', exist_ok=True)
        
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                # Load last known report if log exists
                if os.path.exists(TRAINING_LOG_PATH):
                    with open(TRAINING_LOG_PATH, 'r') as f:
                        log = json.load(f)
                        if log:
                            self.last_training_report = log[-1]
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
                            
                    label = 0 if attendance <= 33 else (1 if attendance <= 66 else 2)
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
            df['label'] = df['attendance'].apply(lambda x: 0 if x <= 33 else (1 if x <= 66 else 2))
            
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

    def get_intelligence_profile(self):
        """Retrieve the AI's current knowledge status and experience metrics."""
        history = []
        if os.path.exists(TRAINING_LOG_PATH):
            with open(TRAINING_LOG_PATH, 'r') as f:
                history = json.load(f)

        if not os.path.exists(MASTER_HISTORY_PATH):
            return {
                "total_hours": 0,
                "coverage_pct": 10, # Base synthetic
                "accuracy": 0,
                "evolution_level": "Seedling",
                "scenarios_mastered": 0,
                "history": [],
                "delta": 0
            }
        
        df = pd.read_csv(MASTER_HISTORY_PATH)
        total_hours = len(df)
        
        # Scenario Coverage: (Day x Hour x Type)
        # 7 days * 15 active hours (8-22) * 2 types (Theory/Lab) = 210 essential scenarios
        essential_scenarios = 7 * 15 * 2
        df_active = df[(df['hour'] >= 8) & (df['hour'] <= 22)]
        mastered_df = df_active.groupby(['day', 'hour', 'type']).size().reset_index()
        mastered_count = len(mastered_df)
        coverage_pct = min(100, round((mastered_count / essential_scenarios) * 100, 1))
        
        # Evolution Level based on knowledge coverage and data depth
        if coverage_pct < 30: level = "Observant Seedling"
        elif coverage_pct < 50: level = "Knowledge Gatherer"
        elif coverage_pct < 70: level = "Pattern Engine"
        elif coverage_pct < 90: level = "Strategic Analyst"
        else: level = "Intelligence Core"
        
        # Calculate Delta from last training
        delta = 0
        if len(history) >= 2:
            delta = history[-1]['accuracy'] - history[-2]['accuracy']
        
        # --- PROACTIVE INSIGHT ENGINE ---
        recommendations = []
        if coverage_pct < 50:
            recommendations.append({
                "type": "strategy",
                "text": "Model coverage is below 50%. Suggest uploading diverse datasets covering different days and time slots to broaden intelligence.",
                "priority": "high"
            })
        elif coverage_pct < 85:
            recommendations.append({
                "type": "optimization",
                "text": "Core patterns established. Focus on uploading 'Exception Data' (holidays or special events) to improve edge-case accuracy.",
                "priority": "medium"
            })
        
        if delta < -0.5:
            recommendations.append({
                "type": "warning",
                "text": "Recent accuracy dip detected. The model may be encountering 'Concept Drift' or noisy data labels in the latest batch.",
                "priority": "high"
            })
        
        if total_hours > 5000:
            recommendations.append({
                "type": "status",
                "text": "Deep historical branch reached. System stability is now excellent for standard academic scheduling.",
                "priority": "low"
            })
        else:
            recommendations.append({
                "type": "action",
                "text": "Memory expansion active. Every 50 new real-world decisions automatically refine the internal reasoning logic.",
                "priority": "low"
            })
            
        if not recommendations:
            recommendations.append({"type": "info", "text": "AI Intelligence is stable. Monitoring for new environmental patterns...", "priority": "low"})

        return {
            "total_hours": total_hours,
            "coverage_pct": coverage_pct,
            "accuracy": round(self.last_training_report.get('accuracy', 0), 1) if self.last_training_report else 0,
            "evolution_level": level,
            "scenarios_mastered": mastered_count,
            "history": history[-10:], # Last 10 sessions for chart
            "delta": round(delta, 2),
            "recommendations": recommendations[:3] # Latest 3 insights
        }

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
        
        # Calculate Precision, Recall, and F1-Score (weighted for multi-class)
        precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted', zero_division=0)
        
        joblib.dump(self.model, MODEL_PATH)
        
        report = {
            'timestamp': datetime.utcnow().isoformat(),
            'total_records': len(df),
            'training_records': len(X_train),
            'test_records': len(X_test),
            'accuracy': round(float(accuracy) * 100, 2),
            'precision': round(float(precision) * 100, 2),
            'recall': round(float(recall) * 100, 2),
            'f1_score': round(float(f1) * 100, 2),
            'feature_importance': dict(zip(required_features, [round(float(x), 4) for x in self.model.feature_importances_])),
            'status': 'success',
            'analysis': 'Model knowledge successfully expanded.'
        }
        
        # Check for Accuracy Drop
        if self.last_training_report and report['accuracy'] < (self.last_training_report['accuracy'] - 0.5):
            report['status'] = 'warning'
            report['analysis'] = self._analyze_accuracy_drop(self.last_training_report, report)

        # Update persistent log
        history = []
        if os.path.exists(TRAINING_LOG_PATH):
            try:
                with open(TRAINING_LOG_PATH, 'r') as f:
                    history = json.load(f)
            except: pass
        
        history.append(report)
        # Keep only last 50 reports
        if len(history) > 50: history = history[-50:]
        
        with open(TRAINING_LOG_PATH, 'w') as f:
            json.dump(history, f, indent=4)

        self.last_training_report = report
        return report, None

    def _analyze_accuracy_drop(self, old, new):
        """Intelligently diagnose why model performance decreased."""
        diff = old['accuracy'] - new['accuracy']
        if diff < 1: return "Minor variance detected. Likely due to dataset randomization."
        
        reasons = []
        if new['total_records'] < old['total_records']:
            reasons.append("Dataset size decreased, reducing historical reference points.")
        
        # Feature Importance Shift
        old_fi = old.get('feature_importance', {})
        new_fi = new.get('feature_importance', {})
        
        # Check if 'attendance' became less important (indicates conflicting labels)
        if new_fi.get('attendance', 0) < (old_fi.get('attendance', 0) * 0.8):
            reasons.append("New data patterns are inconsistent with historical occupancy logic.")
            
        if not reasons:
            reasons.append("Model is encountering novel scenarios that contradict established patterns.")
            
        return "Warning: " + " ".join(reasons) + " Consider reviewing the last uploaded dataset."

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
        
        # --- Intelligence Guard ---
        # If attendance is < 33.3%, it MUST be Low, regardless of model variance.
        actual_attendance = processed['attendance'].iloc[0]
        if actual_attendance <= 33.3:
            prediction = 0
            result_label = 'Low'
        elif actual_attendance >= 66.6 and (prediction == 0):
            prediction = 2
            result_label = 'High'
        # ----------------------------
        
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
    
    def add_to_history(self, day, hour, sub_type, attendance, label):
        """Add a single real-world decision to the history and retrain if threshold met."""
        new_row = pd.DataFrame([{
            'day': day, 'hour': hour, 'type': sub_type, 
            'attendance': attendance, 'label': label,
            'timestamp': datetime.utcnow().isoformat()
        }])
        
        # Preprocess to ensure is_weekend and time_bin are added
        processed = self._preprocess_dataframe(new_row)
        
        if os.path.exists(MASTER_HISTORY_PATH):
            history_df = pd.read_csv(MASTER_HISTORY_PATH)
            cumulative_df = pd.concat([history_df, processed], ignore_index=True)
        else:
            cumulative_df = processed
            
        cumulative_df.to_csv(MASTER_HISTORY_PATH, index=False)
        self.new_data_count += 1
        
        if self.new_data_count >= self.retrain_threshold:
            print(f">>> AUTO-RETAIN: Reached {self.retrain_threshold} new points. Updating model...")
            self.train_from_history()
            self.new_data_count = 0
            return True
        return False
