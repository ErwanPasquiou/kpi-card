"""Fond et en-tête partagés par les pages de l'application."""
from pathlib import Path

import streamlit as st

from components.header import ASSETS_DIR, file_to_data_uri, render_header


def render_page_frame(active_page: str = "accueil"):
    base_dir = Path(__file__).resolve().parent.parent
    wave = file_to_data_uri(ASSETS_DIR / "wave.svg")
    css = (base_dir / "styles" / "accueil.css").read_text(encoding="utf-8")
    st.html(f'<style>:root {{ --kpi-card-wave-image: url("{wave}"); }}\n{css}</style>')
    render_header(active_page)
