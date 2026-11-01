"""Run from backend/: python -m unittest tests.test_model_snapshot"""
import json
import os
import sys
import tempfile
import unittest
from unittest import mock

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import ml_engine
from ml_engine import MLEngine

SNAPSHOT = {'total_hours': 10000, 'accuracy': 69.5, 'evolution_level': 'Intelligence Core'}


class ModelSnapshotTest(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.snapshot = os.path.join(folder.name, 'model_profile.json')
        for patcher in (
            mock.patch.object(ml_engine, 'PROFILE_SNAPSHOT_PATH', self.snapshot),
            mock.patch.object(ml_engine, 'MASTER_HISTORY_PATH', os.path.join(folder.name, 'none.csv')),
            mock.patch.object(ml_engine, 'TRAINING_LOG_PATH', os.path.join(folder.name, 'none.json')),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)
        # Skips __init__, which would load the real model file.
        self.engine = MLEngine.__new__(MLEngine)
        self.engine._profile_cache = None
        self.engine._profile_cache_time = 0
        self.engine.last_training_report = None
        self.engine.retrain_threshold = 50
        self.upload = pd.DataFrame({'day': ['Monday'], 'hour': [8], 'attendance': [70]})

    def write_snapshot(self):
        with open(self.snapshot, 'w') as f:
            json.dump(SNAPSHOT, f)

    def test_server_without_history_reports_the_snapshot(self):
        self.write_snapshot()
        self.assertEqual(self.engine.get_intelligence_profile(), SNAPSHOT)

    def test_without_snapshot_or_history_reports_an_empty_profile(self):
        self.assertEqual(self.engine.get_intelligence_profile()['accuracy'], 0)

    def test_server_without_history_refuses_to_retrain(self):
        self.write_snapshot()
        with mock.patch.object(MLEngine, 'train_from_history') as train, mock.patch.object(MLEngine, '_save_history') as save:
            report, error = self.engine.digest_and_train(self.upload)
        self.assertIsNone(report)
        self.assertIn('not available', error)
        train.assert_not_called()
        save.assert_not_called()

    def test_recorded_attendance_cannot_start_a_new_history(self):
        self.write_snapshot()
        with mock.patch.object(MLEngine, '_save_history') as save:
            self.assertFalse(self.engine.add_to_history('Monday', 8, 'theory', 70))
        save.assert_not_called()

    def test_real_history_takes_priority_over_the_snapshot(self):
        self.write_snapshot()
        history = pd.DataFrame({'day': [0], 'hour': [8], 'type': [0], 'attendance': [70]})
        with mock.patch.object(MLEngine, '_load_history', return_value=history):
            self.assertEqual(self.engine.get_intelligence_profile()['total_hours'], 1)


if __name__ == '__main__':
    unittest.main()
