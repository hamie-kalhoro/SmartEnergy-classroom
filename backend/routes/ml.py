from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
import os
import pandas as pd
from models import Timetable, Classroom
from services import EnergyService

ml_bp = Blueprint('ml', __name__)

@ml_bp.route('/api/predict', methods=['GET'])
def get_recommendations():
    from ml_engine import MLEngine
    ml = MLEngine()
    
    timetable = Timetable.query.all()
    results = []
    for entry in timetable:
        classroom = entry.classroom
        level_name, level_idx, reasoning, confidence = ml.predict(
            entry.day_of_week, entry.time_slot, 
            entry.subject_type, entry.expected_attendance
        )
        rec, _ = ml.get_recommendation(level_idx)
        
        # Calculate and log energy decision
        lights_action = 'OFF' if level_idx == 0 else 'ON'
        ac_action = 'ON' if level_idx == 2 else 'OFF'
        energy_saved = round(2.5 if level_idx < 2 else 0, 2)
        
        EnergyService.log_decision(classroom.id, level_name, lights_action, ac_action, energy_saved)
        
        results.append({
            'classroom': classroom.name,
            'subject': entry.subject,
            'time': entry.time_slot,
            'occupancy': level_name,
            'confidence': confidence,
            'reasoning': reasoning,
            'recommendation': rec,
            'attendance': entry.expected_attendance
        })
    return jsonify(results)

@ml_bp.route('/api/ml/upload-train', methods=['POST'])
@jwt_required()
def upload_and_train():
    """Upload a CSV dataset, digest it into history, and delete original."""
    from ml_engine import MLEngine
    ml = MLEngine()
    
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '' or not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() == 'csv'):
        return jsonify({'success': False, 'message': 'Invalid file. Only CSV allowed.'}), 400
    
    filename = secure_filename(file.filename)
    upload_folder = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)
        
    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)
    
    try:
        df = pd.read_csv(filepath)
        # Digest and Train (The self-learning feedback loop)
        report, error = ml.digest_and_train(df)
        
        # System Cleanup (Digest & Delete requirement)
        if os.path.exists(filepath):
            os.remove(filepath)
            print(f">>> ML CLEANUP: Digested and deleted {filename}")
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Intelligence Digested. Model has been updated with new behavioral patterns.',
            'report': report
        })
    except Exception as e:
        if os.path.exists(filepath): os.remove(filepath)
        return jsonify({'success': False, 'message': str(e)}), 500

@ml_bp.route('/api/ml/predict-batch', methods=['POST'])
@jwt_required()
def predict_batch():
    """Upload a CSV dataset and get smart predictions."""
    from ml_engine import MLEngine
    ml = MLEngine()
    
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    try:
        df = pd.read_csv(file)
        results = []
        for _, row in df.iterrows():
            level_name, idx, reasoning, conf = ml.predict(
                row.get('day'), row.get('hour'), row.get('type'), row.get('attendance')
            )
            rec, _ = ml.get_recommendation(idx)
            results.append({
                'day': row.get('day'),
                'hour': row.get('hour'),
                'predicted_occupancy': level_name,
                'confidence': conf,
                'reasoning': reasoning,
                'recommendation': rec
            })
        
        # Calculate summary for frontend
        low = sum(1 for p in results if p['predicted_occupancy'] == 'Low')
        med = sum(1 for p in results if p['predicted_occupancy'] == 'Medium')
        high = sum(1 for p in results if p['predicted_occupancy'] == 'High')
        
        return jsonify({
            'success': True,
            'predictions': results,
            'summary': {
                'total_records': len(results),
                'low_occupancy': low,
                'medium_occupancy': med,
                'high_occupancy': high,
                'optimized_count': low + med # Assume low/med are optimized
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@ml_bp.route('/api/ml/status', methods=['GET'])
def get_ml_status():
    from ml_engine import MLEngine
    ml = MLEngine()
    return jsonify(ml.get_model_stats())
