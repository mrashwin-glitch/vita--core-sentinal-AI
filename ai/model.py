import torch
import torch.nn as nn

class MyceliumCNN(nn.Module):
    def __init__(self):
        super(MyceliumCNN, self).__init__()
        self.conv_layers = nn.Sequential(
            nn.Conv2d(3, 16, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2, 2)
        )
        self.fc_layers = nn.Sequential(
            nn.Linear(32 * 32 * 32, 128), # Assuming 128x128 input image
            nn.ReLU(),
            nn.Linear(128, 3) # Output: [Nitrogen, Moisture, pH]
        )

    def forward(self, x):
        x = self.conv_layers(x)
        x = x.view(x.size(0), -1) # Flatten
        x = self.fc_layers(x)
        return x
