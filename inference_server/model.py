"""
FluentNet — must match checkpoints/best_model.pt layer names exactly.
Classes: ['clean', 'syllable_repetition', 'word_repetition', 'block']
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class SEBlock(nn.Module):
    def __init__(self, channels: int, reduction: int = 16):
        super().__init__()
        self.excitation = nn.Sequential(
            nn.Linear(channels, channels // reduction, bias=True),
            nn.ReLU(inplace=True),
            nn.Linear(channels // reduction, channels, bias=True),
            nn.Sigmoid(),
        )

    def forward(self, x):
        b, c, _, _ = x.shape
        gap = x.mean(dim=[2, 3])
        scale = self.excitation(gap)
        return x * scale.view(b, c, 1, 1)


class SEResBlock(nn.Module):
    def __init__(self, in_ch: int, out_ch: int, stride: int = 1):
        super().__init__()
        self.conv1 = nn.Conv2d(in_ch, out_ch, 3, stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_ch)
        self.conv2 = nn.Conv2d(out_ch, out_ch, 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_ch)
        self.se = SEBlock(out_ch)
        # Always include shortcut conv (matches checkpoint for all 3 blocks)
        self.shortcut = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 1, stride=stride, bias=False),
            nn.BatchNorm2d(out_ch),
        )

    def forward(self, x):
        residual = self.shortcut(x)
        out = F.relu(self.bn1(self.conv1(x)), inplace=True)
        out = self.bn2(self.conv2(out))
        out = self.se(out)
        return F.relu(out + residual, inplace=True)


class SEResNetEncoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.stem = nn.Sequential(
            nn.Conv2d(1, 32, 7, stride=2, padding=3, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(3, stride=2, padding=1),
        )
        self.block1 = SEResBlock(32, 64, stride=2)
        self.block2 = SEResBlock(64, 128, stride=2)
        self.block3 = SEResBlock(128, 128, stride=1)  # no spatial downsample, but shortcut conv exists

    def forward(self, x):
        return self.block3(self.block2(self.block1(self.stem(x))))


class BahdanauAttention(nn.Module):
    def __init__(self, hidden_dim=128, attn_dim=64):
        super().__init__()
        self.W = nn.Linear(hidden_dim, attn_dim)
        self.v = nn.Linear(attn_dim, 1, bias=False)

    def forward(self, h):
        energy = self.v(torch.tanh(self.W(h))).squeeze(-1)  # (B, T)
        weights = F.softmax(energy, dim=1)
        return (h * weights.unsqueeze(-1)).sum(dim=1)        # (B, hidden_dim)


class BiLSTMLayer(nn.Module):
    def __init__(self, input_size=128, hidden_size=64, dropout=0.3):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True, bidirectional=True)
        self.drop = nn.Dropout(dropout)

    def forward(self, x):
        out, _ = self.lstm(self.drop(x))
        return out


class FluentNet(nn.Module):
    def __init__(self, num_classes=4):
        super().__init__()
        self.encoder = SEResNetEncoder()
        self.pool = nn.AdaptiveAvgPool2d((1, None))
        self.bilstm = BiLSTMLayer()
        self.attention = BahdanauAttention()
        self.classifier = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(128, 64),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(64, num_classes),
        )

    def forward(self, x):
        feat = self.encoder(x)             # (B, 128, 17, 44)
        feat = self.pool(feat).squeeze(2)  # (B, 128, 44)
        feat = feat.permute(0, 2, 1)       # (B, 44, 128)
        h = self.bilstm(feat)
        ctx = self.attention(h)
        return self.classifier(ctx)


def load_fluentnet(checkpoint_path: str, device: str = "cpu"):
    ck = torch.load(checkpoint_path, map_location=device, weights_only=False)
    class_names = ck.get("class_names", ["clean", "syllable_repetition", "word_repetition", "block"])
    model = FluentNet(num_classes=len(class_names))
    model.load_state_dict(ck["model_state_dict"])
    model.eval().to(device)
    return model, class_names
