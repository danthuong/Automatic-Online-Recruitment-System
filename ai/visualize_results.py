import os
import pandas as pd
import numpy as np
import pickle
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    ConfusionMatrixDisplay
)
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
MODELS_DIR = ROOT_DIR
CSV_PATH = os.path.join(MODELS_DIR, 'hand_gestures.csv')
MODEL_PATH = os.path.join(MODELS_DIR, 'gesture_model.pkl')


def load_data():
    if not os.path.exists(CSV_PATH):
        print(f"CSV not found: {CSV_PATH}")
        return None, None
    
    df = pd.read_csv(CSV_PATH)
    X = df.drop('label', axis=1)
    y = df['label']
    
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    return X, y_encoded, label_encoder, df['label'].unique()


def plot_feature_importance(model, feature_names, top_n=20):
    importance = model.feature_importances_
    indices = np.argsort(importance)[::-1][:top_n]
    
    plt.figure(figsize=(12, 6))
    plt.bar(range(len(indices)), importance[indices])
    plt.xticks(range(len(indices)), [feature_names[i] for i in indices], rotation=45, ha='right')
    plt.xlabel('Features')
    plt.ylabel('Importance')
    plt.title(f'Top {top_n} Feature Importance')
    plt.tight_layout()
    plt.savefig(os.path.join(MODELS_DIR, 'feature_importance.png'), dpi=150)
    print(f"Saved: feature_importance.png")
    plt.close()


def plot_confusion_matrix(y_test, y_pred, label_encoder):
    cm = confusion_matrix(y_test, y_pred)
    labels = label_encoder.classes_
    
    fig, ax = plt.subplots(figsize=(10, 8))
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=labels)
    disp.plot(ax=ax, cmap='Blues')
    plt.title('Confusion Matrix')
    plt.tight_layout()
    plt.savefig(os.path.join(MODELS_DIR, 'confusion_matrix.png'), dpi=150)
    print(f"Saved: confusion_matrix.png")
    plt.close()


def plot_class_distribution(df):
    label_counts = df['label'].value_counts()
    
    plt.figure(figsize=(10, 6))
    bars = plt.bar(label_counts.index, label_counts.values, color=['#2ecc71', '#e74c3c'])
    plt.xlabel('Class')
    plt.ylabel('Number of Samples')
    plt.title('Class Distribution')
    
    for bar, count in zip(bars, label_counts.values):
        plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 5,
                str(count), ha='center', va='bottom')
    
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    plt.savefig(os.path.join(MODELS_DIR, 'class_distribution.png'), dpi=150)
    print(f"Saved: class_distribution.png")
    plt.close()


def plot_model_comparison():
    accuracies = []
    depths = range(2, 12, 2)
    
    df = pd.read_csv(CSV_PATH)
    X = df.drop('label', axis=1)
    y = LabelEncoder().fit_transform(df['label'])
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    for depth in depths:
        model = XGBClassifier(n_estimators=100, max_depth=depth, random_state=42)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        accuracies.append(acc)
        print(f"  max_depth={depth}: {acc*100:.2f}%")
    
    plt.figure(figsize=(10, 6))
    plt.plot(list(depths), accuracies, 'bo-', linewidth=2, markersize=8)
    plt.xlabel('Max Depth')
    plt.ylabel('Accuracy')
    plt.title('Model Accuracy vs Max Depth')
    plt.grid(True, alpha=0.3)
    plt.xticks(list(depths))
    plt.tight_layout()
    plt.savefig(os.path.join(MODELS_DIR, 'model_comparison.png'), dpi=150)
    print(f"Saved: model_comparison.png")
    plt.close()


def main():
    print("=" * 50)
    print("Model Visualization")
    print("=" * 50)
    
    X, y_encoded, label_encoder, labels = load_data()
    if X is None:
        return
    
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)
    
    model, saved_encoder = pickle.load(open(MODEL_PATH, 'rb'))
    
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\nTest Accuracy: {accuracy*100:.2f}%")
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))
    
    print("\nGenerating visualizations...")
    
    plot_class_distribution(pd.read_csv(CSV_PATH))
    plot_feature_importance(model, X.columns.tolist())
    plot_confusion_matrix(y_test, y_pred, label_encoder)
    
    print("\nGenerating model comparison (depth vs accuracy)...")
    plot_model_comparison()
    
    print("\n" + "=" * 50)
    print("Done! Check these files:")
    print("  - feature_importance.png")
    print("  - confusion_matrix.png")
    print("  - class_distribution.png")
    print("  - model_comparison.png")
    print("=" * 50)


if __name__ == '__main__':
    main()
