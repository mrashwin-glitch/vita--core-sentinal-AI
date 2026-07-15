import os
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import cv2
from model import MyceliumCNN

# Ensure output directories exist
os.makedirs('ai/sample_images', exist_ok=True)

# 1. Synthetic Data Generator
def generate_synthetic_data(num_samples=500):
    print("Generating synthetic mycelium glow data...")
    images = []
    targets = []
    
    for i in range(num_samples):
        # Create a black nighttime image (128x128)
        img = np.zeros((128, 128, 3), dtype=np.uint8)
        
        # Randomize glow intensity (simulating Nitrogen) and color shift (simulating pH/Moisture)
        nitrogen_val = np.random.uniform(50, 250)
        moisture_val = np.random.uniform(20, 80)
        ph_val = np.random.uniform(5.5, 7.5)
        
        # Draw a synthetic glowing ribbon (using OpenCV)
        thickness = int(moisture_val / 10) 
        glow_intensity = int(nitrogen_val)
        
        # pH determines color shift: 
        # pH < 6.2 (acidic) -> Blue/Cyan shift
        # pH > 7.0 (alkaline) -> Pure Green
        # neutral -> Green/Cyan
        if ph_val < 6.2:
            color = (int(glow_intensity*0.8), int(glow_intensity*0.5), 10) # BGR: Blueish-cyan
        elif ph_val > 7.0:
            color = (10, int(glow_intensity), 10) # BGR: Pure Green
        else:
            color = (int(glow_intensity*0.5), int(glow_intensity), 10) # BGR: Green/Cyan
            
        # Draw random curved line simulating mycelium
        cv2.line(img, (15, 15), (110, 110), color, max(1, thickness))
        cv2.GaussianBlur(img, (15, 15), 0, dst=img) # Blur to make it "glow"
        
        # Convert to PyTorch Tensor format (Channels, Height, Width)
        img_tensor = torch.tensor(img, dtype=torch.float32).permute(2, 0, 1) / 255.0
        target_tensor = torch.tensor([nitrogen_val, moisture_val, ph_val], dtype=torch.float32)
        
        images.append(img_tensor)
        targets.append(target_tensor)
        
    return torch.stack(images), torch.stack(targets)

# 2. Training Loop
def train():
    model = MyceliumCNN()
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    X_train, y_train = generate_synthetic_data()
    
    print("Training PyTorch CNN Model...")
    epochs = 15
    for epoch in range(epochs):
        optimizer.zero_grad()
        outputs = model(X_train)
        loss = criterion(outputs, y_train)
        loss.backward()
        optimizer.step()
        
        if (epoch+1) % 5 == 0 or epoch == 0:
            print(f'Epoch [{epoch+1}/{epochs}], Loss: {loss.item():.4f}')
            
    # Save the model relative to the script directory
    weights_path = os.path.join(os.path.dirname(__file__), 'mycelium_cnn.pth')
    torch.save(model.state_dict(), weights_path)
    print(f"Model successfully saved to {weights_path}! Backend is ready.")
    
    # Generate and save the 4 scenario preset images for frontend visualization
    generate_demo_presets()

def generate_demo_presets():
    print("Generating demo preset scenario images...")
    scenarios = [
      { 'filename': 'healthy.png', 'n': 220.0, 'm': 75.0, 'ph': 6.8 },      # Bright Green-Cyan, Thick
      { 'filename': 'low_nitrogen.png', 'n': 55.0, 'm': 70.0, 'ph': 6.5 },  # Dim Green-Cyan, Thick
      { 'filename': 'low_moisture.png', 'n': 200.0, 'm': 22.0, 'ph': 7.0 },  # Bright Green-Cyan, Thin
      { 'filename': 'acidic_soil.png', 'n': 180.0, 'm': 65.0, 'ph': 5.2 }    # Bright Blue-Cyan, Thick
    ]
    
    for s in scenarios:
        # Create a black nighttime image (256x256 for browser rendering quality)
        img = np.zeros((256, 256, 3), dtype=np.uint8)
        
        thickness = int(s['m'] / 8) # Scaled for 256x256 image size
        glow_intensity = int(s['n'])
        
        if s['ph'] < 6.2:
            color = (int(glow_intensity*0.9), int(glow_intensity*0.6), 20) # Blueish-cyan
        elif s['ph'] > 7.0:
            color = (20, int(glow_intensity), 20) # Pure Green
        else:
            color = (int(glow_intensity*0.6), int(glow_intensity), 20) # Green/Cyan
            
        cv2.line(img, (30, 30), (220, 220), color, max(1, thickness))
        cv2.GaussianBlur(img, (29, 29), 0, dst=img)
        
        path = f"ai/sample_images/{s['filename']}"
        cv2.imwrite(path, img)
        print(f"Generated demo preset: {path}")

if __name__ == "__main__":
    train()
