# ============================================
# models/gat_model.py — GATBaseline Class
# ============================================
# Definisi model GAT yang PERSIS SAMA dengan kode Colab.
# Arsitektur:
#   Layer 1: GATConv(768 → 128, heads=4, concat=True) → 512
#   Layer 2: GATConv(512 → 128, heads=1, concat=False) → 128
#   Classifier: Linear(128 → 2)
# Activation: ELU, Dropout: 0.3
# ============================================

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GATConv


class GATBaseline(nn.Module):
    """
    Graph Attention Network untuk klasifikasi hoaks.

    Arsitektur:
    - GAT Layer 1: in_dim → hidden_dim × heads (concat)
    - GAT Layer 2: hidden_dim × heads → hidden_dim (no concat)
    - Classifier: hidden_dim → out_dim (2 kelas: valid/hoaks)

    Parameters:
        in_dim (int): Dimensi input embedding (768 dari IndoBERT)
        hidden_dim (int): Dimensi hidden per head (128)
        out_dim (int): Jumlah kelas output (2)
        heads (int): Jumlah attention heads (4)
        dropout (float): Dropout rate (0.3)
    """

    def __init__(self, in_dim=768, hidden_dim=128, out_dim=2,
                 heads=4, dropout=0.3):
        super().__init__()
        self.gat1 = GATConv(
            in_dim, hidden_dim,
            heads=heads, dropout=dropout, concat=True
        )
        self.gat2 = GATConv(
            hidden_dim * heads, hidden_dim,
            heads=1, dropout=dropout, concat=False
        )
        self.classifier = nn.Linear(hidden_dim, out_dim)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x, edge_index):
        """
        Forward pass.

        Args:
            x: Node features [num_nodes, in_dim]
            edge_index: Edge indices [2, num_edges]

        Returns:
            logits: [num_nodes, out_dim]
        """
        x = self.gat1(x, edge_index)
        x = F.elu(x)
        x = self.dropout(x)
        x = self.gat2(x, edge_index)
        x = F.elu(x)
        x = self.dropout(x)
        return self.classifier(x)
