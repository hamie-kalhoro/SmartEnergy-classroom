from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
import os
import pandas as pd
from models import db, Timetable, Classroom
from services import EnergyService
from ml_engine import get_ml_engine
from climate_service import get_climate_context

ml_bp = Blueprint('ml', __name__)

@ml_bp.route('/api/predict', methods=['GET'])
def get_recommendations():
    ml = get_ml_engine()
    
    # Fetch climate context ONCE for this batch (cached for 10 min)
    climate_context = get_climate_context()
    
    timetable = Timetable.query.all()
    results = []
    for entry in timetable:
        classroom = entry.classroom
        # expected_attendance = the class's historical average attendance %
        level_name, level_idx, reasoning, confidence = ml.predict(
            entry.day_of_week, entry.time_slot,
            entry.subject_type, entry.expected_attendance, subject=entry.subject
        )
        
        # Climate-Aware Recommendation (NEW)
        climate_rec = ml.get_climate_aware_recommendation(level_idx, climate_context)
        
        # Legacy-compatible device actions for energy logging
        lights_action = climate_rec['lights']
        ac_action = climate_rec['ac']
        fan_action = climate_rec['fan']
        
        # Energy saved calculation — climate-aware
        energy_mode = climate_rec.get('energy_mode', 'balanced')
        if energy_mode == 'eco':
            energy_saved = 3.5  # Maximum savings (everything off/min)
        elif energy_mode == 'balanced':
            energy_saved = 2.0  # Significant savings (Fans only/Eco AC)
        elif energy_mode == 'comfort':
            energy_saved = 0.8  # Slight savings (Optimized AC)
        elif energy_mode == 'full':
            energy_saved = 0.1  # Minimal savings (Full power but managed)
        else:
            energy_saved = 0
        
        EnergyService.log_decision(
            classroom.id, level_name, 
            'ON' if lights_action != 'OFF' else 'OFF', 
            'ON' if ac_action not in ('OFF',) else 'OFF', 
            round(energy_saved, 2),
            commit=False  # one commit for the whole batch below; per-row commits to Supabase are slow
        )
        
        results.append({
            'id': entry.id,
            'classroom': classroom.name,
            'subject': entry.subject,
            'type': entry.subject_type,
            'day': entry.day_of_week,
            'time': entry.time_slot,
            'occupancy': level_name,
            'confidence': confidence,
            'reasoning': reasoning,
            'recommendation': climate_rec['recommendation'],
            'attendance': entry.expected_attendance,
            # Climate Intelligence Fields (NEW)
            'lights_action': climate_rec['lights'],
            'ac_action': climate_rec['ac'],
            'fan_action': climate_rec['fan'],
            'climate_reasoning': climate_rec['climate_reasoning'],
            'energy_mode': climate_rec['energy_mode'],
            'climate_mode': climate_rec['climate_mode'],
            'temperature': climate_rec['temperature'],
            'season': climate_rec['season']
        })
    
    db.session.commit()

    return jsonify({
        'predictions': results,
        'climate': {
            'season': climate_context.get('season_label'),
            'season_icon': climate_context.get('season_icon'),
            'temperature': climate_context.get('temperature'),
            'feels_like': climate_context.get('feels_like'),
            'humidity': climate_context.get('humidity'),
            'climate_mode': climate_context.get('climate_mode'),
            'climate_mode_label': climate_context.get('climate_mode_label'),
            'climate_mode_color': climate_context.get('climate_mode_color'),
            'climate_mode_icon': climate_context.get('climate_mode_icon'),
            'city': climate_context.get('city'),
            'source': climate_context.get('source'),
            'description': climate_context.get('description')
        }
    })

@ml_bp.route('/api/climate', methods=['GET'])
def get_climate():
    """Dedicated endpoint for climate context — used by Dashboard and other pages."""
    from climate_service import get_climate_context
    return jsonify(get_climate_context())

@ml_bp.route('/api/ml/upload-train', methods=['POST'])
@jwt_required()
def upload_and_train():
    """Upload a CSV dataset, digest it into history, and delete original."""
    ml = get_ml_engine()
    
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
    ml = get_ml_engine()
    climate_context = get_climate_context()
    
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400
    
    file = request.files['file']
    try:
        df = pd.read_csv(file)
        
        # Robustness: Normalize column names (lowercase & stripped)
        df.columns = [c.lower().strip() for c in df.columns]
        
        results = []
        for index, row in df.iterrows():
            try:
                # Get values with flexible type handling
                day_val = row.get('day', 'Monday')
                hour_val = row.get('hour', 9)
                type_val = row.get('type', 'theory')
                attendance_val = row.get('attendance', 0)
                
                level_name, idx, reasoning, conf = ml.predict(
                    day_val, hour_val, type_val, attendance_val,
                    subject=row.get('subject'), batch=row.get('batch'), section=row.get('section'),
                    week=row.get('week'), prev_attendance=row.get('prev_attendance')
                )
                
                climate_rec = ml.get_climate_aware_recommendation(idx, climate_context)
                results.append({
                    'day': day_val,
                    'hour': hour_val,
                    'type': type_val,
                    'attendance': attendance_val,
                    'predicted_occupancy': level_name,
                    'confidence': conf,
                    'reasoning': reasoning,
                    'recommendation': climate_rec['recommendation'],
                    'lights_action': climate_rec['lights'],
                    'ac_action': climate_rec['ac'],
                    'fan_action': climate_rec['fan'],
                    'climate_reasoning': climate_rec['climate_reasoning'],
                    'energy_mode': climate_rec['energy_mode']
                })
            except Exception as row_error:
                print(f"[WARN] ML Batch: Skipping malformed row {index} - {str(row_error)}")
                continue
        
        # Calculate summary for frontend (5-Level System)
        empty = sum(1 for p in results if p['predicted_occupancy'] == 'Empty')
        trace = sum(1 for p in results if p['predicted_occupancy'] == 'Trace')
        light = sum(1 for p in results if p['predicted_occupancy'] == 'Light')
        balanced = sum(1 for p in results if p['predicted_occupancy'] == 'Balanced')
        maximum = sum(1 for p in results if p['predicted_occupancy'] == 'Maximum')
        
        return jsonify({
            'success': True,
            'predictions': results,
            'climate': {
                'season': climate_context.get('season_label'),
                'temperature': climate_context.get('temperature'),
                'climate_mode': climate_context.get('climate_mode'),
                'climate_mode_label': climate_context.get('climate_mode_label')
            },
            'summary': {
                'total_records': len(results),
                'empty_count': empty,
                'trace_count': trace,
                'light_count': light,
                'balanced_count': balanced,
                'maximum_count': maximum,
                'optimized_count': empty + trace + light + balanced # Everything except Maximum
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@ml_bp.route('/api/ml/status', methods=['GET'])
def get_ml_status():
    ml = get_ml_engine()
    return jsonify(ml.get_intelligence_profile())

@ml_bp.route('/api/ml/intelligence-profile', methods=['GET'])
def get_intelligence_profile():
    ml = get_ml_engine()
    return jsonify(ml.get_intelligence_profile())

@ml_bp.route('/api/ml/intelligence-pulse', methods=['GET'])
def get_intelligence_pulse():
    """Alias for pulse-based profile fetch used by ModelStatus.jsx"""
    ml = get_ml_engine()
    return jsonify(ml.get_intelligence_profile())
