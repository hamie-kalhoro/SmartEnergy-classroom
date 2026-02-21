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
    ml = MLEngine() # In a production app, this would be a singleton or app-bound
    
    timetable = Timetable.query.all()
    results = []
    for entry in timetable:
        classroom = entry.classroom
        level_name, level_idx = ml.predict(
            entry.day_of_week, entry.time_slot, 
            entry.subject_type, entry.expected_attendance
        )
        rec, _ = ml.get_recommendation(level_idx)
        
        # Calculate and log energy decision
        lights_action = 'OFF' if level_idx == 0 else 'ON'
        ac_action = 'ON' if level_idx == 2 else 'OFF'
        energy_saved = round(2.5 if level_idx < 2 else 0, 2) # kWh estimate
        
        EnergyService.log_decision(classroom.id, level_name, lights_action, ac_action, energy_saved)
        
        results.append({
            'classroom': classroom.name,
            'subject': entry.subject,
            'time': entry.time_slot,
            'occupancy': level_name,
            'recommendation': rec,
            'attendance': entry.expected_attendance
        })
    return jsonify(results)

@ml_bp.route('/api/ml/upload-train', methods=['POST'])
@jwt_required()
def upload_and_train():
    """Upload a CSV dataset and train the ML model."""
    from ml_engine import MLEngine
    ml = MLEngine()
    
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '' or not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() == 'csv'):
        return jsonify({'success': False, 'message': 'Invalid file. Only CSV allowed.'}), 400
    
    filename = secure_filename(file.filename)
    upload_folder = current_app.config['UPLOAD_FOLDER']
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
        
    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)
    
    try:
        df = pd.read_csv(filepath)
        report, error = ml.train_from_dataset(df)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Model trained successfully!',
            'report': report
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@ml_bp.route('/api/ml/predict-batch', methods=['POST'])
@jwt_required()
def predict_batch():
    """Upload a CSV dataset and get predictions for all rows."""
    from ml_engine import MLEngine
    ml = MLEngine()
    
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '' or not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() == 'csv'):
        return jsonify({'success': False, 'message': 'Invalid file. Only CSV allowed.'}), 400
    
    try:
        df = pd.read_csv(file)
        results = ml.predict_batch(df)
        
        summary = {
            'total_records': len(results),
            'low_occupancy': sum(1 for r in results if r['predicted_occupancy'] == 'Low'),
            'medium_occupancy': sum(1 for r in results if r['predicted_occupancy'] == 'Medium'),
            'high_occupancy': sum(1 for r in results if r['predicted_occupancy'] == 'High'),
            'optimized_count': sum(1 for r in results if r['energy_action'] == 'Optimized')
        }
        
        return jsonify({
            'success': True,
            'summary': summary,
            'predictions': results
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@ml_bp.route('/api/ml/status', methods=['GET'])
def get_ml_status():
    """Get current ML model status and last training report."""
    from ml_engine import MLEngine
    ml = MLEngine()
    stats = ml.get_model_stats()
    return jsonify(stats or {'is_trained': False})
