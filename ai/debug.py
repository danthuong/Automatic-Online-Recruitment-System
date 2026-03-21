import pandas as pd

# Load your CSV file
csv_file = 'hand_gestures.csv'
df = pd.read_csv(csv_file)

# Display column labels
unique_labels = df['label'].unique()

print("Các label khác nhau:")
print(unique_labels)

print("Số lượng label:", len(unique_labels))

counts = df['label'].value_counts()

for label, count in counts.items():
    print(f"{label}: {count}")