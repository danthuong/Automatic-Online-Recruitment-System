import cv2
import os

def extract_frames(video_paths, output_dir, skip_frames=1, max_frames=None):
    saved_count = 0
    skip_count = 0
    os.makedirs(output_dir, exist_ok=True)
    for video_path in video_paths if isinstance(video_paths, list) else [video_paths]:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"Error: Cannot open video {video_path}")
            return 0
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        print(f"Video: {video_path}")
        print(f"  Total frames: {total_frames}, FPS: {fps:.1f}, Resolution: {width}x{height}")
        
        frame_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            if skip_count < skip_frames:
                skip_count += 1
                continue
            
            skip_count = 0
            
            filename = f"frame_{saved_count:06d}.jpg"
            filepath = os.path.join(output_dir, filename)
            cv2.imwrite(filepath, frame)
            saved_count += 1
            
            if max_frames and saved_count >= max_frames:
                print(f"  Reached max frames limit: {max_frames}")
                break
            
            if saved_count % 100 == 0:
                print(f"  Processed {saved_count} frames...")
        
        cap.release()
        print(f"  Saved {saved_count} frames to {output_dir}")
    return saved_count

def main():
    legit_path = ["D:/bku_docs/lotus hackathon/legit.mp4", "D:/bku_docs/lotus hackathon/legit2.mp4", "D:/bku_docs/lotus hackathon/legit3.mp4", "D:/bku_docs/lotus hackathon/legit4.mp4", "D:/bku_docs/lotus hackathon/legit5.mp4"]
    cheating_path = ["D:/bku_docs/lotus hackathon/cheating.mp4", "D:/bku_docs/lotus hackathon/cheating1.mp4", "D:/bku_docs/lotus hackathon/cheating2.mp4", "D:/bku_docs/lotus hackathon/cheating3.mp4", "D:/bku_docs/lotus hackathon/cheating4.mp4"]
    output_dir = "D:/bku_docs/lotus hackathon/extracted_frames"
    
    os.makedirs(output_dir, exist_ok=True)
    
    extract_frames(legit_path, os.path.join(output_dir, 'legit'), skip_frames=5)
    
    extract_frames(cheating_path, os.path.join(output_dir, 'cheating'), skip_frames=3)
    
    print(f"\nDone! Frames saved to {output_dir}/")


if __name__ == '__main__':
    main()
