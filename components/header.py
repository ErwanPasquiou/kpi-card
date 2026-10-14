"""En-tête de la page d'accueil."""
import base64
import mimetypes
from pathlib import Path

import streamlit as st

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"


def file_to_data_uri(path: Path) -> str:
    mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def render_header():
    banner = file_to_data_uri(ASSETS_DIR / "banner.svg")
    logo = file_to_data_uri(ASSETS_DIR / "logo-kpi-card.svg")
    st.html(f"""
        <header class="kpi-card-header">
            <img class="header-banner" src="{banner}" alt="" />
            <div class="header-content">
                <a class="brand-zone" href="./" target="_self" aria-label="Accueil">
                    <img class="brand-image" src="{logo}" alt="KPI-Card" />
                </a>
                <nav class="nav-zone" aria-label="Navigation principale">
                    <a class="nav-item active" href="./" target="_self"
                       aria-current="page">Accueil</a>
                </nav>
                <div class="user-zone">
                    <span class="admin-icon" aria-hidden="true">&#9881;</span>
                    <span class="avatar" aria-label="Profil EP">EP</span>
                </div>
            </div>
        </header>
    """)
