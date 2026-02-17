import cv2
import os
import glob

def create_video_from_images():
    # Define paths
    # Script is in backend/, images are in frontend/imgs/
    base_dir = os.path.dirname(os.path.abspath(__file__))
    img_dir = os.path.join(base_dir, '..', 'frontend', 'imgs')
    output_video_path = os.path.join(img_dir, 'background.mp4')
    
    # Frame rate (FPS)
    fps = 2  # Adjust this to change speed (e.g., 1 frame per second)
    
    print(f"Looking for images in: {img_dir}")
    
    # Get all images 1.png to 20.png
    # We want them sorted numerically, so we can't just use glob default sort
    images = []
    for i in range(1, 21):
        img_path = os.path.join(img_dir, f"{i}.png")
        if os.path.exists(img_path):
            images.append(img_path)
        else:
            print(f"Warning: Image {i}.png not found.")
    
    if not images:
        print("No images found to create video.")
        return

    print(f"Found {len(images)} images.")

    # Read the first image to get dimensions
    frame = cv2.imread(images[0])
    height, width, layers = frame.shape
    size = (width, height)
    
    print(f"Video resolution: {width}x{height}")

    # Initialize video writer
    # cv2.VideoWriter_fourcc(*'mp4v') for mp4
    out = cv2.VideoWriter(output_video_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, size)

    for img_path in images:
        img = cv2.imread(img_path)
        # Resize if necessary to match the first frame, or ensure all are same size
        # processing...
        if img.shape[:2] != (height, width):
             print(f"Resizing {os.path.basename(img_path)} to match video size.")
             img = cv2.resize(img, size)
        
        out.write(img)

    out.release()
    print(f"Video saved successfully at: {output_video_path}")

if __name__ == "__main__":
    create_video_from_images()
