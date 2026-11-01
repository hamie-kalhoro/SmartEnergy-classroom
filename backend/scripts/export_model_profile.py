"""Save the current model's aggregate metrics to model_profile.json. Run from backend/ after training.

The repository is public and secure_data/ is not, so this file must only ever hold aggregates.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml_engine import MLEngine, PROFILE_SNAPSHOT_PATH

ROW_LIMIT = 500


def assert_aggregates_only(value, path='profile'):
    """Refuse anything shaped like raw data: a long list, or a list of attendance records."""
    if isinstance(value, dict):
        for key, item in value.items():
            assert key not in ('subject', 'attendance'), f'{path}.{key} looks like raw attendance data'
            assert_aggregates_only(item, f'{path}.{key}')
    elif isinstance(value, list):
        assert len(value) <= ROW_LIMIT, f'{path} has {len(value)} items, which looks like raw data'
        for index, item in enumerate(value):
            assert_aggregates_only(item, f'{path}[{index}]')


def main():
    profile = MLEngine().get_intelligence_profile()
    assert profile.get('total_hours'), 'No attendance history found, so there is nothing to export.'
    assert_aggregates_only(profile)
    with open(PROFILE_SNAPSHOT_PATH, 'w') as f:
        json.dump(profile, f, indent=2)
    print(f"Saved {PROFILE_SNAPSHOT_PATH}: accuracy {profile['accuracy']}%, level {profile['evolution_level']}")


if __name__ == '__main__':
    main()
