import os
import sys
import pandas as pd

# Setup path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from ml_engine import MLEngine

def migrate_to_5_levels():
    print(">>> STARTING INTELLIGENCE MIGRATION (5-LEVEL SYSTEM)...")
    ml = MLEngine()
    
    # This will trigger _preprocess_dataframe which now has the 5-level get_label() logic
    # And it will save the new history to MASTER_HISTORY_PATH
    report, error = ml.train_from_history()
    
    if error:
        print(f"Migration Error: {error}")
    else:
        print(f"Migration Successful! New Accuracy: {report['accuracy']}%")
        print(f"Total Records Re-labeled: {report['total_records']}")

if __name__ == "__main__":
    migrate_to_5_levels()
